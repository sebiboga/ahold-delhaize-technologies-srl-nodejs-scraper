import { jest } from '@jest/globals';

describe('E2E: Full Scraping Workflow', () => {
  const TEST_CIF = '49544242';
  const TEST_BRAND = 'AD/01';

  it('should complete full scrape workflow', async () => {
    const company = await import('../../company.js');
    const solr = await import('../../solr.js');
    
    const companyResult = await company.validateAndGetCompany();
    expect(companyResult.status).toBe('active');
    expect(companyResult.cif).toBe(TEST_CIF);
    
    const solrResult = await solr.querySOLR(TEST_CIF);
    expect(solrResult.numFound).toBeGreaterThan(0);
  });

  it('should handle inactive company gracefully', async () => {
    const demoanaf = await import('../../demoanaf.js');
    
    const searchResults = await demoanaf.searchCompany('INACTIVE_COMPANY_NOT_EXISTS');
    expect(searchResults).toBeDefined();
  });
});