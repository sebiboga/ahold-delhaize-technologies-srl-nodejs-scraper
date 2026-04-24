import { jest } from '@jest/globals';

describe('Integration: API Workflow', () => {
  
  describe('Full company validation workflow', () => {
    it.skip('should go from brand to validated company (ANAF API can return 500)', async () => {
      const demoanaf = await import('../../demoanaf.js');
      const company = await import('../../company.js');
      const solr = await import('../../solr.js');
      
      const anafData = await demoanaf.getCompanyFromANAF('49544242');
      expect(anafData.name).toBeDefined();
      
      const companyResult = await company.validateAndGetCompany();
      expect(companyResult.status).toBe('active');
      expect(companyResult.cif).toBe('49544242');
      
      const solrResult = await solr.querySOLR(companyResult.cif);
      expect(solrResult.numFound).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Company data consistency', () => {
    it.skip('should have matching data across ANAF, Peviitor and SOLR (timeout issues)', async () => {
      const company = await import('../../company.js');
      const solr = await import('../../solr.js');
      
      const companyResult = await company.validateAndGetCompany();
      
      const solrResult = await solr.queryCompanySOLR(`company:${companyResult.company}*`);
      expect(solrResult.docs[0].brand).toBe('AD/01');
    });
  });

  describe('Company Core Model Validation', () => {
    it('should have all required fields per company model', async () => {
      const solr = await import('../../solr.js');
      
      const result = await solr.queryCompanySOLR('id:49544242');
      expect(result.numFound).toBe(1);
      
      const ad01 = result.docs[0];
      
      // Required: id, company
      expect(ad01.id).toBe('49544242');
      expect(ad01.company).toBeDefined();
      
      // All other model fields should exist
      expect(ad01.brand).toBe('AD/01');
      expect(ad01.status).toBeDefined();
      expect(['activ','suspendat','inactiv','radiat']).toContain(ad01.status);
      expect(ad01.location).toBeDefined();
      expect(Array.isArray(ad01.location)).toBe(true);
      expect(ad01.lastScraped).toBeDefined();
      expect(ad01.scraperFile).toBeDefined();
    });
  });
});