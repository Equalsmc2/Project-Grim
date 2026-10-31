// Dependency-free local web server. Never exposes directories outside this project.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  const uri = decodeURIComponent((req.url||'/').split('?')[0]);
  const relative = path.posix.normalize(uri).replace(/^\/+/, '');
  const filename = path.resolve(root, relative || 'index.html');
  if (!filename.startsWith(root + path.sep) && filename !== root) {res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(filename,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(filename).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Project Grim stage: http://localhost:${port}/\nDM console: http://localhost:${port}/dm.html`));
