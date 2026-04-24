const https = require('https');

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

// Check jobs in SOLR for AD/01
const options = {
  hostname: 'solr.peviitor.ro',
  path: '/solr/job/select?q=cif:49544242&rows=10',
  method: 'GET',
  headers: { 'Authorization': 'Basic ' + AUTH }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log('Jobs for AD/01 (49544242):', parsed.response.numFound);
    if (parsed.response.docs && parsed.response.docs.length > 0) {
      console.log('\nSample jobs:');
      parsed.response.docs.slice(0, 3).forEach((doc, i) => {
        console.log(`${i+1}. ${doc.title} - ${doc.location?.join(', ')}`);
      });
    }
  });
});

req.end();