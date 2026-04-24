const https = require('https');

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

const deleteQuery = JSON.stringify({
  delete: { query: "company:AD*01" }
});

const options = {
  hostname: 'solr.peviitor.ro',
  path: '/solr/job/update/json?commit=true',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + AUTH,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    console.log('Delete response:', data);
    
    // Verify
    const verifyOpt = {
      hostname: 'solr.peviitor.ro',
      path: '/solr/job/select?q=company:AD*01&rows=0',
      method: 'GET',
      headers: { 'Authorization': 'Basic ' + AUTH }
    };
    
    const verifyReq = https.request(verifyOpt, (verifyRes) => {
      let verifyData = '';
      verifyRes.on('data', chunk => verifyData += chunk);
      verifyRes.on('end', () => {
        const parsed = JSON.parse(verifyData);
        console.log('Remaining AD01 jobs:', parsed.response.numFound);
      });
    });
    verifyReq.end();
  });
});

req.write(deleteQuery);
req.end();