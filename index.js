/**
 * AD/01 (Ahold Delhaize Technologies) Job Scraper
 *
 * Scrapes job listings from sitemap.vacancy.xml + individual job pages.
 * Parses HTML with cheerio.
 */

import fetch from "node-fetch";
import fs from "fs";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { validateAndGetCompany } from "./company.js";
import { querySOLR, deleteJobByUrl, upsertJobs, upsertCompany } from "./solr.js";
import { generateJobsMarkdown } from "./src/markdown-generator.js";
import companyConfig from "./config/company.js";

const COMPANY_CIF = companyConfig.cif;
const JOB_BASE = companyConfig.apiBase;
const SITEMAP_URL = `${JOB_BASE}/sitemap.vacancy.xml`;
const TIMEOUT = 10000;

let COMPANY_NAME = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetches and parses sitemap.vacancy.xml to extract job URLs.
 * @returns {Promise<string[]>} Array of job page URLs
 */
async function fetchSitemapUrls() {
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  const res = await fetch(SITEMAP_URL, {
    headers: { "User-Agent": "job_seeker_ro_spider" }
  });
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`);

  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls = [];

  $('url loc').each((_, el) => {
    const url = $(el).text().trim();
    if (url) urls.push(url);
  });

  console.log(`Found ${urls.length} URLs in sitemap`);
  return urls;
}

/**
 * Fetches a single job page and parses HTML details.
 * @param {string} url - Job page URL
 * @returns {Promise<Object|null>} Job object or null if parsing fails
 */
async function fetchAndParseJob(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "job_seeker_ro_spider" }
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract title from h1 or meta
    const title = $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') || '';

    if (!title) return null;

    // Extract location from job meta/content
    const locationText = $('.job-location, [data-location], .vacancy-location').first().text().trim();
    const locations = locationText ? [locationText] : [companyConfig.defaultLocation];

    // Default workmode (AD/01 doesn't always specify, but IT roles are often hybrid/remote)
    const workmode = 'hybrid';

    return {
      url,
      title,
      workmode,
      location: locations,
      tags: []
    };
  } catch (err) {
    console.error(`  Error parsing ${url}: ${err.message}`);
    return null;
  }
}

/**
 * Scrapes all jobs from sitemap.
 * @returns {Promise<Array>} Array of job objects
 */
async function scrapeAllListings() {
  const urls = await fetchSitemapUrls();
  const jobs = [];
  const seen = new Set();

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);

    const job = await fetchAndParseJob(url);
    if (job) {
      jobs.push(job);
      console.log(`✓ ${job.title}`);
    }

    await sleep(500); // Respectful delay
  }

  console.log(`Total unique jobs collected: ${jobs.length}`);
  return jobs;
}

// ============================================================================
// DATA TRANSFORMATION - Preparing jobs for Solr storage
// ============================================================================

function mapToJobModel(rawJob, cif, companyName = COMPANY_NAME) {
  const now = new Date().toISOString();

  const job = {
    url: rawJob.url,
    title: rawJob.title,
    company: companyName,
    cif: cif,
    location: rawJob.location?.length ? rawJob.location : undefined,
    tags: rawJob.tags?.length ? rawJob.tags : undefined,
    workmode: rawJob.workmode || undefined,
    date: now,
    status: "scraped"
  };

  Object.keys(job).forEach((k) => job[k] === undefined && delete job[k]);
  return job;
}

function transformJobsForSOLR(payload) {
  const romanianCities = [
    'Bucharest', 'București', 'Cluj-Napoca', 'Cluj Napoca',
    'Timișoara', 'Timisoara', 'Iași', 'Iasi', 'Brașov', 'Brasov',
    'Constanța', 'Constanta', 'Craiova', 'Bacău', 'Sibiu',
    'Târgu Mureș', 'Targu Mures', 'Oradea', 'Baia Mare', 'Satu Mare',
    'Ploiești', 'Ploiesti', 'Pitești', 'Pitesti', 'Arad', 'Galați', 'Galati',
    'Brăila', 'Braila', 'Drobeta-Turnu Severin', 'Râmnicu Vâlcea', 'Ramnicu Valcea',
    'Buzău', 'Buzau', 'Botoșani', 'Botosani', 'Zalău', 'Zalau', 'Hunedoara', 'Deva',
    'Suceava', 'Bistrița', 'Bistrita', 'Tulcea', 'Călărași', 'Calarasi',
    'Giurgiu', 'Alba Iulia', 'Slatina', 'Piatra Neamț', 'Piatra Neamt', 'Roman',
    'Dumbrăvița', 'Dumbravita', 'Voluntari', 'Popești-Leordeni', 'Popesti-Leordeni',
    'Chitila', 'Mogoșoaia', 'Mogosoaia', 'Otopeni'
  ];

  payload.company = payload.company.toUpperCase();

  payload.jobs.forEach((job) => {
    if (job.location?.length) {
      job.location = job.location.filter(loc =>
        romanianCities.some(city =>
          loc.toLowerCase().includes(city.toLowerCase())
        )
      );
    }
    if (!job.location?.length) {
      job.location = [companyConfig.defaultLocation];
    }
    job.workmode = ['remote', 'hybrid', 'on-site'].includes(job.workmode)
      ? job.workmode
      : 'hybrid';
  });

  return payload;
}

// ============================================================================
// MAIN ORCHESTRATION
// ============================================================================

async function main() {
  try {
    // Step 1: Validate company
    console.log("\n=== VALIDATE COMPANY ===");
    const companyData = await validateAndGetCompany();
    COMPANY_NAME = companyData.company;
    console.log(`✓ Company validated: ${COMPANY_NAME}`);

    // Step 2: Scrape jobs
    console.log("\n=== SCRAPE JOBS ===");
    const jobs = await scrapeAllListings();

    if (!jobs.length) {
      console.log("⚠ No jobs found");
      return;
    }

    // Step 3: Transform and prepare payload
    console.log("\n=== TRANSFORM FOR SOLR ===");
    const mappedJobs = jobs.map(job => mapToJobModel(job, COMPANY_CIF));
    const solrPayload = transformJobsForSOLR({
      source: 'ad01.com',
      company: COMPANY_NAME,
      cif: COMPANY_CIF,
      jobs: mappedJobs
    });
    console.log(`✓ Transformed ${solrPayload.jobs.length} jobs`);

    // Step 4: Upsert to SOLR
    console.log("\n=== UPSERT TO SOLR ===");
    if (process.env.SOLR_AUTH) {
      await upsertJobs(solrPayload);
      await upsertCompany(companyData);
      console.log("✓ Upserted to SOLR");
    } else {
      console.log("⚠ SOLR_AUTH not set — skipping SOLR upsert (dry run)");
    }

    // Step 5: Generate markdown
    console.log("\n=== GENERATE DOCS ===");
    await generateJobsMarkdown(companyData, solrPayload.jobs);
    console.log("✓ Generated docs/jobs.md");

    // Step 6: Save jobs JSON for artifacts
    const tmpDir = "tmp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(`${tmpDir}/jobs.json`, JSON.stringify(solrPayload, null, 2));
    console.log(`✓ Saved tmp/jobs.json (${solrPayload.jobs.length} jobs)`);

    console.log("\n✅ Scraping complete!");
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Export functions for testing
export { mapToJobModel, transformJobsForSOLR, fetchAndParseJob };

main();
