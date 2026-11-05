/** 仅验证 HTTP 资源服务。将浏览器实测单独记录，避免把 HTTP 200 当作画面验收。 */
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const child=spawn(process.execPath,['serve.cjs','0'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
const deadline=setTimeout(()=>{console.error('服务启动超时');child.kill();process.exitCode=1;},15000);
child.stderr.on('data',data=>process.stderr.write(data));
child.stdout.once('data',async data=>{
 try{
  const base=data.toString().match(/http:\/\/127\.0\.0\.1:\d+\//)[0];
  const paths=['','PLAY.html','boot.js','recovery.css','assets/sceneApp-7cpBE01P.js','assets/three-BJx-OGLx.js','assets/translation-adapter.js','assets/index-BWe1F7s7.css','fonts/pixel-zh.woff2','fonts/pixel-zh.ttf','assets/models/ignition-car.glb','assets/models/police-car.glb','audio/boost.mp3','vendor/nes-core.min.css',...fs.readdirSync(path.join(root,'src')).map(name=>'src/'+name),...fs.readdirSync(path.join(root,'assets/crt')).map(name=>'assets/crt/'+name)];
  const responses=await Promise.all(paths.map(async file=>{const r=await fetch(base+file,{method:file?'HEAD':'GET',signal:AbortSignal.timeout(4000)});if(r.status!==200)throw Error(file+' HTTP '+r.status);if(!file&&!(await r.text()).includes('integrated-garage'))throw Error('入口内容不匹配');return r.status;}));
  console.log(JSON.stringify({status:'verified',response:200,resources:responses.length,method:'同一执行环境启动实际 serve.cjs，GET 入口、HEAD 全部运行资源',scope:'HTTP 资源服务；不是浏览器渲染验收'}));
 }catch(error){console.error(error);process.exitCode=1;}
 finally{clearTimeout(deadline);child.kill();}
});
child.on('error',error=>{clearTimeout(deadline);console.error(error);process.exitCode=1;});
