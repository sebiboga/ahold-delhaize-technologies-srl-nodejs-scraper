const https = require('https');

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

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
    console.log('Company:', parsed.response.docs[0]?.company);
    
    console.log('\n--- Now checking job ---');
    const options2 = {
      hostname: 'solr.peviitor.ro',
      path: '/solr/job/select?q=cif:49544242&rows=1',
      method: 'GET',
      headers: { 'Authorization': 'Basic ' + AUTH }
    };
    
    const req2 = https.request(options2, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const parsed2 = JSON.parse(data2);
        console.log('Job company:', parsed2.response.docs[0]?.company);
      });
    });
    req2.end();
  });
});

req.end();