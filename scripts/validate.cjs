/** 可重复验收。行为测试使用最小 DOM / 音频替身，报告中明确标注测试层级。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification');fs.mkdirSync(out,{recursive:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stdout+'\n'+r.stderr);return r.stdout;}
for(const script of ['scripts/integrate.cjs','scripts/page.cjs','build-single.cjs'])run([script]);
const js=['boot.js','serve.cjs','build-single.cjs','assets/sceneApp-7cpBE01P.js','assets/racer-testable.js','assets/three-BJx-OGLx.js','assets/translation-adapter.js'];
for(const dir of ['src','scripts','tests'])for(const name of fs.readdirSync(path.join(root,dir)))if(/\.c?js$/.test(name))js.push(dir+'/'+name);
js.forEach(file=>run(['--check',file]));
const tests=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f);
const tap=run(['--test','--test-reporter=tap',...tests]);fs.writeFileSync(path.join(out,'node-tests.tap'),tap);
const http=JSON.parse(run(['scripts/http-smoke.cjs']));
const recovered=path.join(root,'../rokuno-recovered-game'),neon=path.join(root,'../neon-drift');
const source={};
if(fs.existsSync(path.join(recovered,'manifest.json'))){
 const manifest=JSON.parse(fs.readFileSync(path.join(recovered,'manifest.json'),'utf8'));
 source.recoveredFiles=manifest.files.length;source.recoveredManifestUnchanged=manifest.files.every(f=>hash(path.join(recovered,f.file))===f.sha256);
 source.baselineIsExactCopy=hash(path.join(root,'vendor/roku-scene.original.js'))===hash(path.join(recovered,'assets/sceneApp-7cpBE01P.js'));
}
if(fs.existsSync(neon))source.modelCopiesUnchanged=['ignition-car.glb','police-car.glb'].every(file=>hash(path.join(root,'assets/models',file))===hash(path.join(neon,'assets/models',file)));
const report={date:new Date().toISOString(),engine:'Three.js r184, original bundled dependency',syntaxFiles:js.length,
 tests:{total:Number(tap.match(/# tests (\d+)/)[1]),passed:Number(tap.match(/# pass (\d+)/)[1]),failed:0,log:'verification/node-tests.tap',environment:'Node.js; real original simulation and GLB geometry, DOM/GPU/audio interfaces mocked'},
 sources:source,
 http,
 browser:{status:'blocked',observedOn:'2026-11-05',error:'net::ERR_CONNECTION_TIMED_OUT',url:'http://127.0.0.1:4176/',screenshots:[],testedVisually:false},
 notVerified:['浏览器中完整场景启动与真实输入','四车贴图、预览及道路/车身的实际渲染','CRT/Bloom/红色尾迹视觉','实际音乐听感、响度和设备播放','浏览器控制台错误与 GPU 内存走势','实际页面刷新后的 localStorage 保留','移动端触控、不同显卡和浏览器','单文件浏览器运行与断网试玩'],
 singleFile:{file:'PLAY.html',bytes:fs.statSync(path.join(root,'PLAY.html')).size,sha256:hash(path.join(root,'PLAY.html')),status:'资源内嵌和依赖闭合测试通过；尚未浏览器运行'}};
if(source.recoveredManifestUnchanged===false||source.modelCopiesUnchanged===false||source.baselineIsExactCopy===false)throw Error('源项目完整性检查失败');
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({tests:report.tests,syntaxFiles:report.syntaxFiles,sources:source,singleBytes:report.singleFile.bytes},null,2));
