# AD/01 (Ahold Delhaize Technologies SRL) - Job Scraper

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-24.x-green.svg)
![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-orange.svg)

Automated job scraper for ad01.com that extracts job postings and pushes them to peviitor.ro SOLR index.

## Features

- 🚀 Automated daily scraping at 7 AM
- 🎯 Job extraction from XML sitemap
- ✅ Company validation via ANAF API
- 📊 Location normalization (Romanian cities)
- 🔄 GitHub Actions automation

## Tech Stack

- **Node.js** 24.x
- **Cheerio** - HTML/XML parsing
- **GitHub Actions** - CI/CD

## Prerequisites

- Node.js 24.x
- npm
- SOLR credentials (contact peviitor.ro)

## Installation

```bash
git clone https://github.com/sebiboga/ahold-delhaize-technologies-srl-nodejs-scraper.git
cd ahold-delhaize-technologies-srl-nodejs-scraper
npm install
```

## Configuration

Set `SOLR_AUTH` secret in GitHub repo settings.

## Usage

```bash
# Run scraper locally
npm run scrape

# Run with test mode
npm run scrape -- --test
```

## Job Model Schema

| Field | Type | Description |
|-------|------|-------------|
| url | string | Job posting URL |
| title | string | Job title |
| company | string | Company name |
| cif | string | Fiscal identification number |
| location | array | City/cities |
| workmode | string | remote/on-site/hybrid |
| date | date | UTC ISO8601 scrape date |
| status | string | scraped |

## Project Structure

```
.
├── index.js          # Main scraper
├── company.js        # Company validation
├── solr.js          # SOLR operations
├── demoanaf.js       # ANAF API client
├── package.json
├── .github/
│   └── workflows/
│       └── scrape.yml  # Main scraper workflow
└── tests/
```

## License

MIT License - Copyright (c) 2026 BOGA SEBASTIAN-NICOLAE

## Author

**Boga Sebastian-Nicolae**

- GitHub: [@sebiboga](https://github.com/sebiboga)
- LinkedIn: [sebastianboga](https://linkedin.com/in/sebastianboga)
- Website: https://peviitor.ro