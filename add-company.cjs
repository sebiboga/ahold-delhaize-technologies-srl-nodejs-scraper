const https = require('https');

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

// Add company to company core
const companyData = [{
  id: "49544242",
  company: "AHOLD DELHAIZE TECHNOLOGIES S.R.L.",
  brand: "AD/01",
  status: "activ",
  location: ["Bucuresti"],
  website: ["https://www.ad01.com"],
  career: ["https://www.ad01.com/vacancies"],
  lastScraped: "2026-04-24",
  scraperFile: "https://raw.githubusercontent.com/sebiboga/ahold-delhaize-technologies-srl-nodejs-scraper/master/.github/workflows/scrape.yml"
}];

const options = {
  hostname: 'solr.peviitor.ro',
  path: '/solr/company/update/json?commit=true',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + AUTH,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(companyData)
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Add company response:', data);
  });
});

req.write(JSON.stringify(companyData));
req.end();