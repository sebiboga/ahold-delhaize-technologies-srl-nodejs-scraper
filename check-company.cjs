const https = require('https');

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

// Check company core
const options = {
  hostname: 'solr.peviitor.ro',
  path: '/solr/company/select?q=id:49544242&rows=1',
  method: 'GET',
  headers: { 'Authorization': 'Basic ' + AUTH }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log('Company count:', parsed.response.numFound);
    if (parsed.response.numFound > 0) {
      console.log('Company data:', JSON.stringify(parsed.response.docs[0], null, 2));
    } else {
      console.log('Company 49544242 not in company core - need to add it');
    }
  });
});

req.end();