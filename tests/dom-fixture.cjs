/** 无 GPU 行为测试用的最小 DOM；不把此替身当作浏览器或视觉验收。 */
const fs=require('node:fs'),path=require('node:path');
module.exports=function setup(){
 const ids=new Map(),listeners=new Map(),store=new Map();
 class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={setProperty(){}};this.dataset={};this.hidden=false;this.textContent='';this.value=0;this.clientWidth=800;this.clientHeight=600;
   const set=new Set();this.classList={add:(...s)=>s.forEach(x=>set.add(x)),remove:(...s)=>s.forEach(x=>set.delete(x)),contains:x=>set.has(x),toggle:(x,on)=>{const next=on??!set.has(x);next?set.add(x):set.delete(x);return next;}};
  }
  setAttribute(k,v){this[k]=v;}getAttribute(k){return this[k];}
  addEventListener(type,fn){(this.listeners??={})[type]=fn;}removeEventListener(){}
  append(...children){this.children.push(...children);children.forEach(x=>x.parentNode=this);}appendChild(child){this.append(child);return child;}
  replaceChildren(...children){this.children=[];this.append(...children);}remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);}
  focus(){document.activeElement=this;}closest(){return null;}
  querySelector(selector){return (this.queries??={})[selector]??=(new Node(selector==='b'?'b':'div'));}
  querySelectorAll(){return [];}
  getContext(){const gradient={addColorStop(){}};return new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:100}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
 }
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');for(const m of html.matchAll(/id="([^"]+)"/g))ids.set(m[1],new Node());
 const canvas=new Node('canvas'),body=new Node('body');
 global.document={body,documentElement:new Node('html'),hidden:false,activeElement:body,getElementById:id=>ids.get(id)||null,createElement:tag=>new Node(tag),querySelector:s=>s==='canvas.webgl'?canvas:null,querySelectorAll:()=>[],addEventListener:(k,f)=>{if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);},removeEventListener(){}};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 global.window={innerWidth:1280,innerHeight:720,devicePixelRatio:1,localStorage:storage,addEventListener(){},removeEventListener(){},setTimeout:()=>0,requestAnimationFrame:()=>0,matchMedia:()=>({matches:false})};
 global.addEventListener=()=>{};global.requestAnimationFrame=()=>0;global.cancelAnimationFrame=()=>{};
 global.Audio=class{pause(){}play(){return Promise.resolve();}};
 global.ProgressEvent=class{constructor(type,data){this.type=type;Object.assign(this,data);}};
 // GLB 中的几何真实解析；这里只跳过纹理像素解码，无法验证最终材质画面。
 global.createImageBitmap=async()=>({width:64,height:64,close(){}});
 global.self=global;
 for(const file of ['ignition-car.glb','police-car.glb']){window.NEON_ASSET_URLS??={};window.NEON_ASSET_URLS[file]='data:model/gltf-binary;base64,'+fs.readFileSync(path.join(__dirname,'../assets/models',file)).toString('base64');}
 return {store,ids,canvas,Node,dispatch:(type,event)=>listeners.get(type)?.forEach(fn=>fn(event))};
};
