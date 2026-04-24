import { jest } from '@jest/globals';

describe('AD/01 Integration Tests', () => {
  let index, company, solr;
  
  beforeAll(async () => {
    index = await import('../../index.js');
    company = await import('../../company.js');
    solr = await import('../../solr.js');
  });

  describe('Scrape to SOLR Pipeline', () => {
    it.skip('should scrape, transform, and upsert jobs', async () => {
      const rawJobs = await index.parseJobsFromHtml(`
        <html>
          <a href="/vacature/125/network-engineer">Network Engineer</a>
        </html>
      `);
      
      const jobs = rawJobs.map(job => index.mapToJobModel(job, '49544242'));
      const payload = {
        source: 'ad01.com',
        company: 'AHOLD DELHAIZE TECHNOLOGIES SRL',
        cif: '49544242',
        jobs
      };
      
      const transformed = index.transformJobsForSOLR(payload);
      
      expect(transformed.jobs.length).toBe(1);
      expect(transformed.jobs[0].location).toBeDefined();
    });
  });

  describe('Full Pipeline', () => {
    it('should complete company validation workflow', async () => {
  }, 30000);
      const result = await company.validateAndGetCompany();
      
      expect(result.status).toBeDefined();
      expect(result.cif).toBe('49544242');
      expect(result.company).toBeDefined();
    });
  });
});