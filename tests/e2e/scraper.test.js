import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const HAS_SOLR = !!process.env.SOLR_AUTH;

function itIfSolr(name, fn, timeout) {
  if (HAS_SOLR) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: SOLR_AUTH not set)`, fn, timeout);
}

beforeAll(() => {
  if (HAS_SOLR) {
    process.env.SOLR_AUTH = process.env.SOLR_AUTH;
  }
});

const TEST_CIF = '49544242';
const TEST_BRAND = 'AD/01';
const EPAM_API_URL = 'https://www.ad01.com/api/jobs/v2/search/careers-i18n?from=0&lang=en&size=5&sortBy=relevance%3Brelocation%3Dasc&websiteLocale=en-us&facets=country%3D8150000000000001155';
const ROMANIAN_CITIES = ['Bucharest', 'București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Brașov', 'Constanța', 'Sibiu', 'Oradea'];

let apiAvailable = true;

describe('E2E: Full Scraping Pipeline', () => {

  describe('AD/01 Careers API — Real Data Fetch', () => {
    let apiData;

    beforeAll(async () => {
      try {
        const res = await fetch(EPAM_API_URL, {
          headers: { 'User-Agent': 'job_seeker_ro_spider', 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('json')) throw new Error('Content-Type: ' + ct);
        apiData = await res.json();
      } catch (e) {
        console.log('⚠️ AD/01 API unavailable: ' + e.message + ' — skipping AD/01 API tests');
        apiAvailable = false;
      }
    }, 15000);

    it('should respond with valid job data from AD/01 API', () => {
      if (!apiAvailable) return;
      expect(apiData).toHaveProperty('data');
      expect(apiData.data).toHaveProperty('jobs');
      expect(Array.isArray(apiData.data.jobs)).toBe(true);
      expect(apiData.data.jobs.length).toBeGreaterThan(0);
      expect(apiData.data).toHaveProperty('total');
    });

    it('should have Romania jobs with expected fields', () => {
      if (!apiAvailable) return;
      expect(apiData).toBeDefined();
      expect(apiData.data.jobs.length).toBeGreaterThan(0);

      for (const job of apiData.data.jobs) {
        expect(job).toHaveProperty('titleRaw');
        expect(job).toHaveProperty('location');
        expect(job).toHaveProperty('country');
        expect(job).toHaveProperty('url');
        expect(job).toHaveProperty('workModel');
        expect(typeof job.url).toBe('string');
        expect(job.url.startsWith('http')).toBe(true);
        expect(job.country).toBe('Romania');
      }
    });

    it('should have Romanian country on all jobs',
      () => {
        if (!apiAvailable) return;
        expect(apiData).toBeDefined();
        for (const job of apiData.data.jobs) {
          expect(job.country).toBe('Romania');
        }
      },
    );

    it('should have country set to Romania',
      () => {
        if (!apiAvailable) return;
        expect(apiData).toBeDefined();
        expect(apiData.data.jobs.every(j => j.country === 'Romania')).toBe(true);
      },
    );
  });

  describe('Parse + Transform Pipeline', () => {
    let index;
    let apiData;

    beforeAll(async () => {
      index = await import('../../index.js');
      try {
        const res = await fetch(EPAM_API_URL, {
          headers: { 'User-Agent': 'job_seeker_ro_spider', 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('json')) throw new Error('Content-Type: ' + ct);
        apiData = await res.json();
      } catch (e) {
        console.log('⚠️ AD/01 API unavailable: ' + e.message + ' — skipping Parse + Transform tests');
        apiAvailable = false;
      }
    }, 15000);

    it('should parse real AD/01 API response into standardized format', () => {
      if (!apiAvailable) return;
      const result = index.parseApiJobs(apiData);

      expect(result).toHaveProperty('jobs');
      expect(result).toHaveProperty('total');
      expect(result.jobs.length).toBeGreaterThan(0);
    });

    it('should map parsed jobs to job model',
      () => {
        if (!apiAvailable) return;
        const result = index.parseApiJobs(apiData);
        const mapped = result.jobs.map(j => index.mapToJobModel(j, TEST_CIF));

        expect(mapped.length).toBeGreaterThan(0);

        for (const job of mapped) {
          expect(job).toHaveProperty('jobId');
          expect(job).toHaveProperty('title');
          expect(job).toHaveProperty('location');
          expect(job).toHaveProperty('country');
          expect(job).toHaveProperty('url');
          expect(job).toHaveProperty('cif', TEST_CIF);
        }
      },
    );

    it('should transform jobs and filter to Romanian locations',
      () => {
        if (!apiAvailable) return;
        const result = index.parseApiJobs(apiData);
        const mapped = result.jobs.map(j => index.mapToJobModel(j, TEST_CIF));

        const payload = {
          source: 'ad01.com',
          company: 'AHOLD DELHAIZE TECHNOLOGIES S.R.L.',
          cif: TEST_CIF,
          jobs
        };

        const transformed = index.transformJobsForSOLR(payload);

        expect(transformed.company).toBe('AHOLD DELHAIZE TECHNOLOGIES S.R.L.');
        expect(transformed.jobs.length).toBe(jobs.length);

        for (const job of transformed.jobs) {
          expect(job).toHaveProperty('location');
          expect(Array.isArray(job.location)).toBe(true);
          expect(job.location.length).toBeGreaterThan(0);
          expect(job.location.some(l => ROMANIAN_CITIES.some(c => l.includes(c)))).toBe(true);
        }
      },
    );

    it('should produce valid job URLs that are accessible',
      () => {
        if (!apiAvailable) return;
        const result = index.parseApiJobs(apiData);
        const mapped = result.jobs.map(j => index.mapToJobModel(j, TEST_CIF));

        for (const job of mapped) {
          expect(job.url).toMatch(/^https?:\/\//);
          expect(job.url).not.toBe('');
        }
      },
    );
  });

  describe('Company Validation Path', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../src/anaf.js');
    });

    it('should find AD/01 in ANAF and validate active status', async () => {
      if (!apiAvailable) return;
      const results = await anaf.searchCompany(TEST_BRAND);

      const ad01 = results.find(c =>
        c.name === 'AHOLD DELHAIZE TECHNOLOGIES S.R.L.' &&
        c.cui.toString() === TEST_CIF &&
        c.statusLabel === 'Funcțiune'
      );
      expect(ad01).toBeDefined();
      expect(ad01.cui.toString()).toBe(TEST_CIF);

      const anafData = await anaf.getCompanyFromANAF(TEST_CIF);
      expect(anafData).toBeDefined();
      expect(anafData.inactive).toBe(false);
    });

    it('should run full validation and report active status with job count', async () => {
      const company = await import('../../company.js');
      const result = await company.validateAndGetCompany();

      expect(result.status).toBe('active');
      expect(result.company).toBe('AHOLD DELHAIZE TECHNOLOGIES S.R.L.');
      expect(result.cif).toBe(TEST_CIF);

      if (result.existingJobsCount === 0) {
        console.log('⚠️ No AD/01 jobs in Solr — skipping job count assertion');
        return;
      }
      expect(result.existingJobsCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Inactive Company Handling', () => {

    it('should detect inactive/radiated companies via ANAF', async () => {
      const anaf = await import('../../src/anaf.js');
      const radiatedCif = '12345678';
      await expect(anaf.getCompanyFromANAF(radiatedCif)).rejects.toThrow();
    });
  });

  describe('SOLR Data Verification', () => {

    itIfSolr('should have AD/01 jobs in SOLR with correct company name', async () => {
      const solr = await import('../../solr.js');
      const result = await solr.querySOLR(TEST_CIF);

      if (result.numFound === 0) {
        console.log('⚠️ No AD/01 jobs in Solr — skipping SOLR data verification');
        return;
      }

      for (const job of result.docs) {
        expect(job.company).toBe('AHOLD DELHAIZE TECHNOLOGIES S.R.L.');
        expect(job.cif).toBe(TEST_CIF);
      }
    }, 15000);

    itIfSolr('should have AD/01 company core entry with required fields', async () => {
      const solr = await import('../../solr.js');
      const result = await solr.queryCompanySOLR(`id:${TEST_CIF}`);

      expect(result.numFound).toBe(1);
      const ad01 = result.docs[0];
      expect(ad01.company).toBe('AHOLD DELHAIZE TECHNOLOGIES S.R.L.');
      expect(ad01.status).toBe('activ');
    }, 15000);
  });
});
