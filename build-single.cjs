/** 离线打包：本地唯一 Three.js、场景、新模块、GLB、字体、图片和音效全部内嵌。 */
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,read=file=>fs.readFileSync(path.join(root,file),'utf8');
const mime={'.woff2':'font/woff2','.ttf':'font/ttf','.webp':'image/webp','.mp3':'audio/mpeg','.glb':'model/gltf-binary'};
const data=file=>'data:'+mime[path.extname(file)]+';base64,'+fs.readFileSync(path.join(root,file)).toString('base64');
function css(file){return read(file).replace(/url\((["']?)([^"'()]+)\1\)/g,(match,quote,url)=>{
 if(url.startsWith('data:')||url.startsWith('#')||url.startsWith('%23'))return match;
 const target=path.relative(root,path.resolve(root,path.dirname(file),url));if(target.startsWith('..'))throw Error('样式路径越界');
 return 'url("'+data(target)+'")';
});}
const files=['boot.js','assets/sceneApp-7cpBE01P.js','assets/three-BJx-OGLx.js','assets/translation-adapter.js',...fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js')).map(f=>'src/'+f)];
const key=file=>'integrated/'+file;
const imports={};
for(const file of files){
 let code=read(file).replace(/(\bfrom\s*|\bimport\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g,(all,prefix,quote,target)=>{
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),target));
  if(!files.includes(resolved))throw Error('缺失模块：'+resolved);
  return prefix+quote+key(resolved)+quote;
 });
 code=code.replace('new URL("../audio/boost.mp3",import.meta.url).href',JSON.stringify(data('audio/boost.mp3')));
 imports[key(file)]='data:text/javascript;base64,'+Buffer.from(code).toString('base64');
}
let html=read('index.html');
html=html.replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/,`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'">`);
html=html.replace(/<link rel="stylesheet" href="\.\/([^"]+)">/g,(_,file)=>'<style>'+css(file)+'</style>');
const assets=Object.fromEntries(['ignition-car.glb','police-car.glb'].map(name=>[name,data('assets/models/'+name)]));
html=html.replace('<script type="module" src="./boot.js"></script>',()=>'<script>window.NEON_ASSET_URLS='+JSON.stringify(assets)+'</script><script type="importmap">'+JSON.stringify({imports})+'</script><script type="module">import "integrated/boot.js";</script>');
fs.writeFileSync(path.join(root,'PLAY.html'),html);
console.log('PLAY.html 已完全内嵌：'+Buffer.byteLength(html)+' bytes');
