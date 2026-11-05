/** 本机预览；发布时将此目录作为静态站点目录即可，不需要 npm install。 */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname,port=Number(process.argv[2]||4176);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.webp':'image/webp','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.stat(file,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 });
});
server.on('error',error=>{
 console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。关闭此前的预览终端，或运行 node serve.cjs 4177 并访问 http://127.0.0.1:4177/`:'预览服务启动失败：'+error.message);
 process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>console.log('NFS sunset: http://127.0.0.1:'+server.address().port+'/'));
