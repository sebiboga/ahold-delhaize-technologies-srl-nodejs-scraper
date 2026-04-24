import { jest } from '@jest/globals';

describe('company.js', () => {
  let company;
  
  beforeAll(async () => {
    company = await import('../../company.js');
  });

  describe('getCompanyBrand', () => {
    it('should return the company brand', () => {
      const brand = company.getCompanyBrand();
      
      expect(typeof brand).toBe('string');
      expect(brand).toBe('AD/01');
    });
  });

  describe('validateAndGetCompany', () => {
    it('should return company data', async () => {
      const result = await company.validateAndGetCompany();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('company');
      expect(result).toHaveProperty('cif');
    });

    it('should include existingJobsCount', async () => {
      const result = await company.validateAndGetCompany();
      
      expect(result).toHaveProperty('existingJobsCount');
      expect(typeof result.existingJobsCount).toBe('number');
    });
  });
});