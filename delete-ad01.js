import fetch from "node-fetch";

const AUTH = Buffer.from("solr:SolrRocks").toString("base64");

const deleteQuery = JSON.stringify({
  delete: { query: "company:AD*01" }
});

const res = await fetch("https://solr.peviitor.ro/solr/job/update/json?commit=true", {
  method: "POST",
  headers: {
    "Authorization": "Basic " + AUTH,
    "Content-Type": "application/json"
  },
  body: deleteQuery
});

const text = await res.text();
console.log("Response:", text);

// Verify
const verify = await fetch("https://solr.peviitor.ro/solr/job/select?q=company:AD*01&rows=0", {
  headers: { "Authorization": "Basic " + AUTH }
});
const data = await verify.json();
console.log("Remaining AD01 jobs:", data.response.numFound);