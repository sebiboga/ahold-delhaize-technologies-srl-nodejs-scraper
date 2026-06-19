# robots.txt — Ahold Delhaize Technologies SRL

Sursa: https://www.ad01.com/robots.txt

```
User-agent: *
Disallow: /admin/
Disallow: /private/
```

## Analiză

- `/admin/` și `/private/` sunt interzise
- Restul site-ului, inclusiv `/vacancies/`, e permis
- Niciun Crawl-Delay declarat

## Politica scraper-ului

Risc minim. Scraper-ul:
- Parseaza sitemap: `https://www.ad01.com/sitemap.vacancy.xml`
- Face GET pe fiecare job page în sitemap
- Nu accesează `/admin/` sau `/private/` (deja permis)
- User-Agent identificabil: `job_seeker_ro_spider`
- 500ms delay între job pages (respectuos)

## Diferență față de EPAM template

EPAM (template) folosește JSON API. AD/01 folosește sitemap XML + HTML scraping.
