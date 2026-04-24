import { jest } from '@jest/globals';

const CACHED_ANAF_DATA = {
  cui: 49544242,
  name: "AHOLD DELHAIZE TECHNOLOGIES SRL",
  address: "SPL. UNIRII 165 BL. H ET. 3",
  registrationNumber: "J2024002503406",
  phone: "",
  fax: "",
  postalCode: "030119",
  caenCode: "6210",
  iban: "",
  registrationDate: "2024-02-06",
  fiscalAuthority: "Direcţia Generală a Finanţelor Publice Municipiul Bucureşti",
  ownershipForm: "PROPR.PRIVATA-CAPITAL PRIVAT STRAIN",
  organizationForm: "PERSOANA JURIDICA",
  legalForm: "SOCIETATE COMERCIALĂ CU RĂSPUNDERE LIMITATĂ",
  vatRegistered: true,
  cashBasisVat: false,
  inactive: false,
  splitVat: false,
  eFacturaRegistered: true,
  headquartersAddress: {
    street: "Spl. Unirii",
    number: "165",
    locality: "Sectorul 3 Mun. Bucureşti",
    county: "MUNICIPIUL BUCUREŞTI",
    country: "",
    postalCode: "030119"
  },
  administrators: [],
  authorizedCaenCodes: ["6210", "6220"],
  onrcStatus: 1048,
  onrcStatusLabel: "Funcțiune"
};

describe('demoanaf.js', () => {
  let demoanaf;
  
  beforeAll(async () => {
    demoanaf = await import('../../demoanaf.js');
  });

  describe('searchCompany', () => {
    it('should return array of companies for valid brand', async () => {
      const results = await demoanaf.searchCompany('AD/01');
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array for non-existent brand', async () => {
      const results = await demoanaf.searchCompany('NonExistentBrandXYZ123');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('getCompanyFromANAF', () => {
    it('should return company data for valid CIF with fallback', async () => {
      const data = await demoanaf.getCompanyFromANAFWithFallback('49544242', CACHED_ANAF_DATA);
      
      expect(data).toBeDefined();
      expect(data.cui).toBe(49544242);
    }, 120000);
  });
});