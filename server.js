// Local server: node server.js  (Node 18+, no dependencies)
const http = require("http");
const fs = require("fs");
const path = require("path");
const routes = { "/api/generate": require("./api/generate.js"), "/api/verify": require("./api/verify.js") };

try { // minimal .env loader
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };
const PUB = path.join(__dirname, "public");

http.createServer((req, res) => {
  const route = Object.keys(routes).find(p => req.url.startsWith(p));
  if (route) {
    let data = "";
    req.on("data", c => (data += c));
    req.on("end", () => {
      req.body = data;
      res.status = code => { res.statusCode = code; return res; };
      res.json = obj => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(obj)); };
      routes[route](req, res);
    });
    return;
  }
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const file = path.normalize(path.join(PUB, rel === "/" ? "index.html" : rel));
  if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("content-type", types[path.extname(file)] || "application/octet-stream");
    res.end(buf);
  });
}).listen(process.env.PORT || 3000, () => console.log("Open http://localhost:" + (process.env.PORT || 3000)));
