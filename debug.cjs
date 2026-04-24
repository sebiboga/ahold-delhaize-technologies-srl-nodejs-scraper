import fetch from "node-fetch";

const url = "https://www.ad01.com/vacancies";

const res = await fetch(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  }
});

const html = await res.text();
console.log("HTML length:", html.length);

// Search for vacature links
const matches = html.match(/"\/vacature\/[^"]+"/g);
console.log("Vacature matches found:", matches ? matches.length : 0);
if (matches) {
  console.log("Sample:", matches.slice(0, 10));
}