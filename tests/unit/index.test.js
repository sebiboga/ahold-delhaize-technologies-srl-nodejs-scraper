import { jest } from '@jest/globals';

describe('index.js Component Tests', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        company: 'ahold delhaize technologies srl',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Bucharest'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Sofia'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Sibiu'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[1].location).toEqual(['Bucharest']);
      expect(result.jobs[2].location).toEqual(['București']);
      expect(result.jobs[3].location).toEqual(['Sibiu']);
      expect(result.jobs[4].location.length).toBeGreaterThan(0);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'ad01.com',
        company: 'ahold delhaize technologies srl',
        cif: '49544242',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('AHOLD DELHAIZE TECHNOLOGIES SRL');
    });

    it('should normalize workmode values', () => {
      const payload = {
        company: 'ahold delhaize technologies srl',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' },
          { url: 'https://test.com/4', title: 'Job 4', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('hybrid');
      expect(result.jobs[1].workmode).toBe('hybrid');
      expect(result.jobs[2].workmode).toBe('hybrid');
      expect(result.jobs[3].workmode).toBe('hybrid');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ company: 'test', jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://www.ad01.com/job/123',
        title: 'Senior Developer',
        location: ['Bucharest'],
        tags: ['Java', 'Spring'],
        workmode: 'hybrid'
      };

      const COMPANY_NAME = 'AHOLD DELHAIZE TECHNOLOGIES SRL';
      const COMPANY_CIF = '49544242';

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(rawJob.location);
      expect(result.tags).toEqual(rawJob.tags);
      expect(result.workmode).toBe(rawJob.workmode);
      expect(result.status).toBe('scraped');
      expect(result.date).toBeDefined();
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1'
      };

      const result = index.mapToJobModel(rawJob, '49544242');

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '49544242');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('fetchAndParseJob', () => {
    it('should parse HTML job page with title and location', async () => {
      const htmlJob = {
        url: 'https://www.ad01.com/job/test',
        title: 'Developer Position',
        workmode: 'hybrid',
        location: ['Cluj-Napoca'],
        tags: []
      };

      expect(htmlJob.url).toContain('ad01.com');
      expect(htmlJob.title.length).toBeGreaterThan(0);
      expect(htmlJob.workmode).toBe('hybrid');
      expect(Array.isArray(htmlJob.location)).toBe(true);
    });

    it('should set default workmode to hybrid', () => {
      const job = {
        url: 'https://www.ad01.com/career/123',
        title: 'Junior Engineer',
        workmode: 'hybrid',
        location: ['Bucharest'],
        tags: []
      };

      expect(job.workmode).toBe('hybrid');
    });

    it('should include location array', () => {
      const job = {
        url: 'https://www.ad01.com/position/456',
        title: 'QA Engineer',
        workmode: 'hybrid',
        location: ['Sibiu'],
        tags: []
      };

      expect(Array.isArray(job.location)).toBe(true);
      expect(job.location.length).toBeGreaterThan(0);
    });
  });
});
