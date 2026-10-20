// Minimal static file server for the tests (faster and more concurrent than python -m http.server).
// Usage: node tests/server.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = +process.argv[2] || 8765;
const TYPES = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.md':'text/plain; charset=utf-8'};

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if(p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if(!file.startsWith(ROOT)){ res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if(err){ res.writeHead(404, {'Content-Type':'text/plain'}).end('not found'); return; }
    res.writeHead(200, {'Content-Type':TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}).end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log('serving ' + ROOT + ' on http://127.0.0.1:' + PORT));
