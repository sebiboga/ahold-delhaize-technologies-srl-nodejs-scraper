/**
 * AD/01 Job Scraper - Main Entry Point
 * 
 * PURPOSE: Scrapes job listings from AD/01 Careers (Ahold Delhaize Technologies SRL)
 * and stores them in Solr.
 */

import fetch from "node-fetch";
import fs from "fs";
import { fileURLToPath } from "url";
import { load } from "cheerio";
import { validateAndGetCompany } from "./company.js";
import { querySOLR, deleteJobByUrl, upsertJobs } from "./solr.js";

const COMPANY_CIF = "49544242";
const TIMEOUT = 10000;

const CAREERS_BASE = "https://www.ad01.com";
const CAREERS_PAGE = "https://www.ad01.com/vacancies";

let COMPANY_NAME = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchCareersPage() {
  const res = await fetch(CAREERS_PAGE, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      "Accept": "application/json"
    }
  });
  
  if (!res.ok) {
    throw new Error(`Fetch error: ${res.status}`);
  }
  
  const html = await res.text();
  return html;
}

function parseJobsFromHtml(html) {
  const $ = load(html);
  const jobs = [];
  
  $('a[href*="/vacature/"]').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const title = $el.find('h2, h3, .title, .vacancy-title').text().trim() || 
                $el.text().trim() ||
                $el.attr('title') ||
                $el.find('.job-title, [class*="title"]').text().trim();
    
    if (href && href.includes('/vacature/')) {
      const fullUrl = href.startsWith('http') ? href : `${CAREERS_BASE}${href}`;
      const jobId = href.match(/\/vacature\/(\d+)/)?.[1] || '';
      
      if (!jobs.find(j => j.url === fullUrl)) {
        const locationText = $el.find('[class*="location"], .location, [class*="city"]').text().trim() ||
                          $el.find('.subtitle, [class*="subtitle"]').text().trim() ||
                          'Bucharest';
        
        let location = ['Bucharest'];
        if (/Cluj|Timișoara|Iași|Brașov|Constanța|Craiova/i.test(locationText)) {
          location = [locationText.trim()];
        }
        
        const workmodeText = $el.find('[class*="remote"], [class*="hybrid"], [class*="on-site"]').text().trim();
        let workmode = 'hybrid';
        if (/remote|from home|telecom/i.test(workmodeText)) {
          workmode = 'remote';
        } else if (/on-site|office|from office/i.test(workmodeText)) {
          workmode = 'on-site';
        }
        
        jobs.push({
          url: fullUrl,
          title: title || `Job ${jobId}`,
          location,
          workmode,
          uid: jobId
        });
      }
    }
  });
  
  const directVacancies = $('a[href*="/vacature/"]');
  if (directVacancies.length === 0) {
    const allText = $.html();
    const vacatureMatches = allText.match(/"(\/vacature\/[^"]+)"/g) || [];
    const seenPaths = new Set();
    
    vacatureMatches.forEach((match) => {
      const path = match.replace(/"/g, '');
      if (!seenPaths.has(path)) {
        seenPaths.add(path);
        const fullUrl = CAREERS_BASE + path;
        const jobId = path.match(/\/vacature\/(\d+)/)?.[1] || '';
        const title = path.split('/').pop()?.replace(/-/g, ' ').replace(/^\d+-/, '') || `Job ${jobId}`;
        
        jobs.push({
          url: fullUrl,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          location: ['Bucharest'],
          workmode: 'hybrid',
          uid: jobId
        });
      }
    });
  }
  
  console.log(`Found ${jobs.length} job links from HTML`);
  return jobs;
}

async function fetchJobDetails(jobUrl) {
  try {
    const res = await fetch(jobUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html"
      }
    });
    
    if (!res.ok) {
      return null;
    }
    
    const html = await res.text();
    const $ = load(html);
    
    const title = $('h1, .vacancy-title, [class*="title"]').first().text().trim() || 
               $('meta[property="og:title"]').attr('content') || '';
    
    const description = $('[class*="description"], .job-description, .content').text().trim() ||
                      $('meta[name="description"]').attr('content') || '';
    
    let location = ['Bucharest'];
    const locationText = $('[class*="location"], .location, .subtitle').text();
    if (/Cluj|Timișoara|Iași|Brașov|Constanța/i.test(locationText)) {
      location = [locationText.trim()];
    }
    
    let workmode = 'hybrid';
    if (/remote|home|from home/i.test(description + locationText)) {
      workmode = 'remote';
    } else if (/on-site|office/i.test(description + locationText)) {
      workmode = 'on-site';
    }
    
    return {
      title,
      description,
      location,
      workmode
    };
  } catch (err) {
    return null;
  }
}

async function scrapeAllListings(testOnlyOnePage = false) {
  console.log("Fetching careers page...");
  const html = await fetchCareersPage();
  const jobs = parseJobsFromHtml(html);
  
  if (jobs.length === 0) {
    console.log("No jobs found on careers page");
    return [];
  }
  
  console.log(`Found ${jobs.length} jobs, fetching details...`);
  
  const allJobs = [];
  const seenUrls = new Set();
  
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log(`[${i + 1}/${jobs.length}] ${job.title}`);
    
    try {
      let details = null;
      if (!job.title || job.title.startsWith('Job ')) {
        details = await fetchJobDetails(job.url);
      }
      
      const finalJob = {
        url: job.url,
        title: details?.title || job.title,
        location: details?.location || job.location,
        workmode: details?.workmode || job.workmode,
        description: details?.description || ''
      };
      
      if (!seenUrls.has(finalJob.url)) {
        seenUrls.add(finalJob.url);
        allJobs.push(finalJob);
      }
      
      await sleep(500);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
      if (!seenUrls.has(job.url)) {
        seenUrls.add(job.url);
        allJobs.push({
          url: job.url,
          title: job.title,
          location: job.location,
          workmode: job.workmode,
          description: ''
        });
      }
    }
    
    if (testOnlyOnePage && i >= 4) {
      console.log("Test mode: stopping after 5 jobs.");
      break;
    }
  }
  
  console.log(`Total unique jobs: ${allJobs.length}`);
  return allJobs;
}

function mapToJobModel(rawJob, cif, companyName = COMPANY_NAME) {
  const now = new Date().toISOString();
  
  const job = {
    url: rawJob.url,
    title: rawJob.title,
    company: companyName,
    cif: cif,
    location: rawJob.location?.length ? rawJob.location : undefined,
    workmode: rawJob.workmode || undefined,
    description: rawJob.description?.length ? rawJob.description : undefined,
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
    'Ploiești', 'Ploiesti', 'Pitești', 'Pitesti', 'Arad', 'Galați', 'Galati'
  ];
  
  const citySet = new Set(romanianCities.map(c => c.toLowerCase()));
  
  const normalizeWorkmode = (wm) => {
    if (!wm) return undefined;
    const lower = wm.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('on-site') || lower.includes('office')) return 'on-site';
    return 'hybrid';
  };
  
  const transformed = {
    ...payload,
    company: payload.company?.toUpperCase(),
    jobs: payload.jobs.map(job => {
      const validLocations = (job.location || []).filter(loc => {
        const lower = loc.toLowerCase().trim();
        if (lower === 'romania' || lower === 'românia') return true;
        return citySet.has(lower);
      }).map(loc => loc.toLowerCase() === 'romania' ? 'România' : loc);
      
      return {
        ...job,
        location: validLocations.length > 0 ? validLocations : ['Bucharest'],
        workmode: normalizeWorkmode(job.workmode)
      };
    })
  };
  
  return transformed;
}

async function main() {
  const testOnlyOnePage = process.argv.includes("--test");
  
  try {
    console.log("=== Step 1: Get existing jobs count ===");
    const existingResult = await querySOLR(COMPANY_CIF);
    const existingCount = existingResult.numFound;
    console.log(`Found ${existingCount} existing jobs in SOLR`);
    
    console.log("=== Step 2: Validate company via ANAF ===");
    const { company, cif, status, existingJobsCount } = await validateAndGetCompany();
    COMPANY_NAME = company;
    const localCif = cif;
    
    if (status === "inactive") {
      console.log("Company is INACTIVE. Stopping.");
      return;
    }
    
    console.log("\n=== Step 3: Scrape jobs from AD/01 ===");
    const rawJobs = await scrapeAllListings(testOnlyOnePage);
    const scrapedCount = rawJobs.length;
    console.log(`📊 Jobs scraped from AD/01 website: ${scrapedCount}`);
    
    if (scrapedCount === 0) {
      console.log("No jobs found on careers page.");
      fs.writeFileSync("jobs.json", JSON.stringify({ jobs: [], message: "No jobs found" }, null, 2), "utf-8");
      console.log("Saved jobs.json");
      return;
    }
    
    const jobs = rawJobs.map(job => mapToJobModel(job, localCif));
    
    const payload = {
      source: "ad01.com",
      scrapedAt: new Date().toISOString(),
      company: COMPANY_NAME,
      cif: localCif,
      jobs
    };
    
    console.log("Transforming jobs for SOLR...");
    const transformedPayload = transformJobsForSOLR(payload);
    const validCount = transformedPayload.jobs.filter(j => j.location).length;
    console.log(`📊 Jobs with valid location: ${validCount}`);
    
    fs.writeFileSync("jobs.json", JSON.stringify(transformedPayload, null, 2), "utf-8");
    console.log("Saved jobs.json");
    
    console.log("\n=== Step 4: Upsert jobs to SOLR ===");
    await upsertJobs(transformedPayload.jobs);
    
    const finalResult = await querySOLR(localCif);
    console.log(`\n📊 === SUMMARY ===`);
    console.log(`📊 Jobs existing in SOLR before scrape: ${existingCount}`);
    console.log(`📊 Jobs scraped from website: ${scrapedCount}`);
    console.log(`📊 Jobs in SOLR after scrape: ${finalResult.numFound}`);
    console.log(`====================`);
    
    console.log("\n=== DONE ===");
    console.log("Scraper completed successfully!");
    
  } catch (err) {
    console.error("Scraper failed:", err);
    process.exit(1);
  }
}

export { parseJobsFromHtml, mapToJobModel, transformJobsForSOLR, fetchJobDetails };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}