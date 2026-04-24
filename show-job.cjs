const https = require('https');

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

const options = {
  hostname: 'solr.peviitor.ro',
  path: '/solr/job/select?q=cif:49544242&rows=1',
  method: 'GET',
  headers: { 'Authorization': 'Basic ' + AUTH }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    const job = parsed.response.docs[0];
    console.log(JSON.stringify(job, null, 2));
  });
});

req.end();