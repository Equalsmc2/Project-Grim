// Dependency-free LOCAL test server. Serves only the public website files.
// Never use this localhost-only server as a public hosting/authentication layer.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.mp3':'audio/mpeg', '.wav':'audio/wav', '.woff2':'font/woff2'
};
function reject(res,code,reason){res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(reason);}
function publicPath(requestUrl){
  // Bad percent encodings are client errors, never server-crashing exceptions.
  const decoded = decodeURIComponent(String(requestUrl || '/').split('?')[0]);
  if(decoded.includes('\\') || decoded.includes('\0'))return null;
  const segments=decoded.split('/');
  if(segments.some(s => s === '..' || s === '.' || s.startsWith('.')))return null;
  const relative=segments.filter(Boolean).join('/') || 'index.html';
  // Do not accidentally serve .env, .git, project sources, secrets or test files.
  if(relative==='index.html'||relative==='dm.html'||relative==='favicon.ico')return relative;
  if(relative.startsWith('assets/') && segments.filter(Boolean).length>=2)return relative;
  return null;
}
const server=http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return reject(res,405,'Method not allowed');
  let relative;
  try{relative=publicPath(req.url);}catch{return reject(res,400,'Invalid URL encoding');}
  if(!relative)return reject(res,404,'Not found');
  const filename=path.resolve(root,relative);
  if(!filename.startsWith(root+path.sep))return reject(res,404,'Not found');
  fs.realpath(filename,(realError,real)=>{
    if(realError||!real.startsWith(root+path.sep))return reject(res,404,'Not found');
    fs.stat(real,(statError,stat)=>{
      if(statError||!stat.isFile())return reject(res,404,'Not found');
      const type=mime[path.extname(real).toLowerCase()];
      if(!type)return reject(res,404,'Not found');
      res.writeHead(200,{
        'Content-Type':type, 'Content-Length':stat.size,
        'Cache-Control':'no-store, max-age=0', 'X-Content-Type-Options':'nosniff'
      });
      if(req.method==='HEAD')return res.end();
      const stream=fs.createReadStream(real);
      stream.on('error',()=>res.destroy());
      stream.pipe(res);
    });
  });
});
server.listen(port,'127.0.0.1',()=>console.log(`Project Grim stage: http://localhost:${port}/\nDM console: http://localhost:${port}/dm.html`));
