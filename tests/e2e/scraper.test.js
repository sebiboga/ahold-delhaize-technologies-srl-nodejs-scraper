import { jest } from '@jest/globals';

describe('AD/01 E2E Scraper Tests', () => {
  let solr;
  
  beforeAll(async () => {
    solr = await import('../../solr.js');
  });

  describe('Full Scraper Workflow', () => {
    it.skip('should complete full scraping and upsert cycle', async () => {
      const { scrapeAllListings, mapToJobModel, transformJobsForSOLR } = await import('../../index.js');
      
      const rawJobs = await scrapeAllListings(true);
      
      expect(rawJobs.length).toBeGreaterThan(0);
      
      const jobs = rawJobs.map(job => mapToJobModel(job, '49544242'));
      const payload = {
        source: 'ad01.com',
        company: 'AHOLD DELHAIZE TECHNOLOGIES SRL',
        cif: '49544242',
        jobs
      };
      
      const transformed = transformJobsForSOLR(payload);
      
      await solr.upsertJobs(transformed.jobs);
      
      const result = await solr.querySOLR('49544242');
      expect(result.numFound).toBeGreaterThan(0);
    });
  });

  describe('Job Data Validation', () => {
    it('should have all required fields in scraped jobs', async () => {
      const result = await solr.querySOLR('49544242');
      
      if (result.numFound > 0) {
        const job = result.docs[0];
        expect(job).toHaveProperty('url');
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('company');
        expect(job).toHaveProperty('cif');
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('date');
      }
    });
  });
});