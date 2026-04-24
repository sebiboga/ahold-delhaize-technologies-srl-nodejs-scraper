import { jest } from '@jest/globals';

describe('solr.js', () => {
  let solr;
  
  beforeAll(async () => {
    solr = await import('../../solr.js');
  });

  describe('querySOLR', () => {
    it('should return response object with docs', async () => {
      const result = await solr.querySOLR('49544242');
      
      expect(result).toHaveProperty('numFound');
      expect(result).toHaveProperty('docs');
      expect(Array.isArray(result.docs)).toBe(true);
    });
  });

  describe('queryCompanySOLR', () => {
    it('should return company data', async () => {
      const result = await solr.queryCompanySOLR('company:AHOLD*');
      
      expect(result).toHaveProperty('numFound');
    });
  });

  describe('upsertJobs', () => {
    it.skip('should accept array of jobs', async () => {
      const testJob = {
        url: 'https://test.com/job1',
        title: 'Test Job',
        company: 'AHOLD DELHAIZE TECHNOLOGIES SRL',
        cif: '49544242',
        status: 'scraped'
      };

      await expect(solr.upsertJobs([testJob])).resolves.not.toThrow();
    });
  });

  describe('getSolrAuth', () => {
    it('should return SOLR_AUTH from environment', () => {
      const auth = solr.getSolrAuth();
      
      expect(auth).toBeDefined();
      expect(typeof auth).toBe('string');
    });
  });

  describe('Data Integrity', () => {
    it('should not have duplicate URLs for same CIF', async () => {
      const result = await solr.querySOLR('49544242');
      
      if (result.numFound > 0) {
        const urls = result.docs.map(j => j.url);
        const uniqueUrls = new Set(urls);
        
        expect(uniqueUrls.size).toBe(result.numFound);
      }
    });

    it('should have valid CIF format for all jobs', async () => {
      const result = await solr.querySOLR('49544242');
      
      for (const job of result.docs) {
        expect(job.cif).toMatch(/^\d{8}$/);
      }
    });
  });
});