/**
 * 可重复的原版适配：保留驾驶/碰撞/镜头，仅增加可读的车库、试驾和表现层接口。
 * 每个补丁都断言唯一匹配，避免原包变化时静默改错。源文件作为只读基线保留。
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
let s=read('vendor/roku-scene.original.js');
function replace(from,to){if(s.split(from).length!==2)throw Error('补丁定位不唯一: '+from.slice(0,65));s=s.replace(from,to);}
function between(from,to,code){const a=s.indexOf(from),b=s.indexOf(to,a);if(a<0||b<a)throw Error('区段不存在');s=s.slice(0,a)+code+s.slice(b);}
s='import { integration, LayerRenderPass, RENDER_LAYER } from "../src/runtime.js";\n'+s;
// 独立的新存档命名空间；按用户要求不读取、不迁移两份源项目的存档。
s=s.replaceAll('synthwave-racer-','roku-neon-integrated-v1-');
replace('let Et=0;','let Et=0,trialPrevious=null;');
replace('name:"STARTER"','name:"ION / 离子"');replace('name:"AERO-X"','name:"VECTOR / 矢量"');
replace('name:"PHANTOM"','name:"IGNITION / 炽焰"');replace('name:"NOVA"','name:"PATROL / 巡夜"');
replace('Xe&&(R.remove(Xe),hr(Xe)),Xe=Zn(o),R.add(Xe)','Xe&&R.remove(Xe),Xe=integration.createVehicle(o),R.add(Xe)');
// 隐藏原版附加在玩家身上的蓝白加速光片/旧拖影，保留 BOOST 的数值与 FOV。
replace('R.add(fs);','R.add(fs);Ao.visible=false;ps.visible=false;fs.visible=false;');
// 原频谱柱只读取新电台的分析器；删除旧歌单播放器，避免页面加载时抢建第二个 AudioContext。
replace('init(){this.createBars(),this.setupAudio()}','init(){this.createBars()}');
between('setupAudio(){this.audioElement=new Audio','update(t){if(this.hasAudioData', '');
replace('update(t){if(this.hasAudioData','update(t){const radio=integration.radio;this.analyser=radio.analyser||null;this.dataArray=radio.spectrum||null;this.hasAudioData=!!this.analyser;this.isPlaying=radio.playing&&!radio.muted;if(this.hasAudioData');
between('window.loadMusicFile=function','window.updateDisplayBoxText=Gr;', '');
replace('window.__rokuUI&&(Dt.onEnded=()=>window.__rokuUI.playRandomNextSong());','');
replace('const i=window.__rokuUI;if(i)try{i.playGameMusic()}catch(t){console.warn("进入游戏时切换游戏歌单失败:",t)}','');
replace('const i=window.__rokuUI;if(i)try{i.restoreDefaultPlaylist()}catch(t){console.warn("退出游戏时恢复主歌单失败:",t)}','');
replace('const _i=()=>{try{ce.pause()','const _i=()=>{if(!integration.sfxEnabled)return;try{ce.pause()');
// 试驾只改变临时车型，结算不写最佳分或累计分；返回后恢复正常选车。
replace('const Li=()=>{try{','const Li=()=>{if(trialPrevious!==null)return;try{');
between('Ki=()=>{','Ot(),Ke(),Fe()',`Ki=()=>{if(z!=="running")return;const o=Math.floor(Nt);if(trialPrevious===null){if(o>Y){Y=o;try{window.localStorage.setItem(Un,String(Y))}catch{}}Z+=o;try{window.localStorage.setItem(J,String(Z))}catch{}}ws=-1;`);
replace('const na=o=>{if(z==="off")return;','const na=o=>{if(o.target?.closest("#integrated-music,#integrated-garage"))return;if(o.key==="p"||o.key==="P"){o.preventDefault();z==="running"?Ji():z==="paused"&&Pn();return;}if(z==="off")return;');
// 原车库的 RAF/额外场景不再启动；新的预览器只在开库/切车时重绘。
between('Xi=()=>{',',Ss=()=>',`Xi=()=>{if(z==="running"||z==="intro"||z==="exit")return;restoreTrial();Le=true;integration.openGarage();},oo=()=>{Le=false;integration.closeGarage();}`);
replace('qi=()=>{oo(),','qi=()=>{restoreTrial();oo(),');
const api=`
// 公开的适配接口；不会额外启动玩法循环。关闭车库、试驾和选车都走这里。
const restoreTrial=()=>{if(trialPrevious!==null){Et=trialPrevious;trialPrevious=null;nn(Et);an(Et);Ks();}};
const snapshot=()=>({state:z,speed:wt,distance:oe,x:K,roadCenter:$(st),score:Nt,total:Z,best:Y,selected:Et,unlocked:[...Rt],trial:trialPrevious!==null,boost:ct,boostLeft:it,cooldown:At,garage:Le,car:re()});
integration.bind({snapshot,scene:i,camera:t,player:R,getCar:()=>Xe,cars:Mt,stats:uo,
 openGarage:Xi,closeGarage:oo,pause:()=>{Q.left=false;Q.right=false;Q.touch=0;Ji()},resume:Pn,
 select(id){if(!Mt[id]||z==="running")return false;restoreTrial();if(!Rt.has(id)){if(Z<Mt[id].cost)return false;Rt.add(id);}Et=id;Li();nn(id);an(id);Ks();return true;},
 trial(id){if(!Mt[id]||z==="running"||z==="intro"||z==="exit")return false;if(trialPrevious===null)trialPrevious=Et;Et=id;nn(id);an(id);z==="off"?Ln():zn();return true;},
 setEffects(on){ce.muted=!on;if(!on)ys();},exit:Bo,boost:Sn,
 // 仅供本地自动测试调用的同一套结算/碰撞规则，无作弊 UI。
 debug:{finish:Ki,retry:zn,setInput(value){Q.left=value<0;Q.right=value>0;},traffic:ae}
});
window.addEventListener("blur",()=>{Q.left=false;Q.right=false;Q.touch=0;Ji();});
`;
// 原函数结尾是 return ...,{enter,...}。把可读接口插到 return 之前，函数声明均已初始化。
const returnPos=s.indexOf('return window.addEventListener("pointerdown"');
if(returnPos<0)throw Error('驾驶返回接口定位失败');
s=s.slice(0,returnPos)+api+s.slice(returnPos);
// 原 RAF 每帧调用一次表现与音频更新；分层后统一走原有 Bloom / CRT。
replace('xr=new Ca(pt.instance,vt.instance)','xr=new LayerRenderPass(pt.instance,vt.instance,RENDER_LAYER.WORLD,true)');
replace('We.addPass(xr);','We.addPass(xr);We.addPass(new LayerRenderPass(pt.instance,vt.instance,RENDER_LAYER.CAR,false));We.addPass(new LayerRenderPass(pt.instance,vt.instance,RENDER_LAYER.TRAIL,false));');
replace('es.uniforms.time.value=e,We.render()','integration.frame(t/1e3,e);es.uniforms.time.value=e,We.render()');
fs.writeFileSync(path.join(root,'assets/sceneApp-7cpBE01P.js'),s);
// 与浏览器完全相同的原版驾驶逻辑，导出用于无 GPU 的动态行为测试。
const imports=s.slice(0,s.indexOf('const Ga='));
const core=s.slice(s.indexOf('const Un='),s.indexOf('class pr{'));
fs.writeFileSync(path.join(root,'assets/racer-testable.js'),imports+core+'\nexport {ur as createRacer};');
console.log('ROKU 场景适配完成；原版驾驶与镜头保留。');
