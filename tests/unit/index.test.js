import { jest } from '@jest/globals';

describe('index.js Component Tests', () => {
  let index;
  
  beforeAll(async () => {
    index = await import('../../index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['Romania'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Bucharest'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Bulgaria'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };
      
      const result = index.transformJobsForSOLR(payload);
      
      expect(result.jobs[0].location).toEqual(['România']);
      expect(result.jobs[1].location).toEqual(['Bucharest']);
      expect(result.jobs[2].location).toEqual(['România']);
      expect(result.jobs[3].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[4].location).toEqual(['Bucharest']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'ad01.com',
        company: 'ahold delhaize technologies srl',
        cif: '49544242',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', company: 'ahold', cif: '49544242' }
        ]
      };
      
      const result = index.transformJobsForSOLR(payload);
      
      expect(result.company).toBe('AHOLD DELHAIZE TECHNOLOGIES SRL');
    });

    it('should normalize workmode values', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' }
        ]
      };
      
      const result = index.transformJobsForSOLR(payload);
      
      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
      expect(result.jobs[2].workmode).toBe('hybrid');
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://www.ad01.com/job/123',
        title: 'Network Engineer',
        location: ['Bucharest'],
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
      expect(result.workmode).toBeUndefined();
      expect(result.description).toBeUndefined();
    });
  });

  describe('parseJobsFromHtml', () => {
    it('should parse job links from HTML', () => {
      const html = `
        <html>
          <a href="/vacature/125/network-engineer">Network Engineer</a>
          <a href="/vacature/154/senior-data-engineer">Senior Data Engineer</a>
        </html>
      `;
      
      const result = index.parseJobsFromHtml(html);
      
      expect(result.length).toBe(2);
      expect(result[0].url).toBe('https://www.ad01.com/vacature/125/network-engineer');
      expect(result[1].url).toBe('https://www.ad01.com/vacature/154/senior-data-engineer');
    });

    it('should not duplicate job URLs', () => {
      const html = `
        <html>
          <a href="/vacature/125/network-engineer">Network Engineer</a>
          <a href="/vacature/125/network-engineer">Network Engineer</a>
        </html>
      `;
      
      const result = index.parseJobsFromHtml(html);
      
      expect(result.length).toBe(1);
    });
  });
});