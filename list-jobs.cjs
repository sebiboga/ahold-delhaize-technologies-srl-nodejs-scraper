const https = require('https');

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

const options = {
  hostname: 'solr.peviitor.ro',
  path: '/solr/job/select?q=cif:49544242&rows=30',
  method: 'GET',
  headers: { 'Authorization': 'Basic ' + AUTH }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log('Total jobs:', parsed.response.numFound);
    console.log('\nAll jobs:');
    parsed.response.docs.forEach((doc, i) => {
      console.log(`${i+1}. ${doc.title}`);
    });
  });
});

req.end();