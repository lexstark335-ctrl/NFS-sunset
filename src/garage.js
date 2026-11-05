import * as THREE from './three.js';

/** 单个离屏预览器、四辆缓存模型；无预览 RAF，关闭车库后不渲染。 */
export class Garage {
  constructor(library,api,rendererFactory=options=>new THREE.WebGLRenderer(options)){this.library=library;this.api=api;this.rendererFactory=rendererFactory;this.panel=document.getElementById('integrated-garage');this.cache=new Map();this.renders=0;}
  open(){
    // 车库打开期间隐藏原结算遮罩；关闭后沿用原来的 GAME OVER / PAUSED 状态。
    this.focusReturn=document.activeElement;document.body.classList.add('racer-garage-open');this.panel.hidden=false;this.draw();
    document.getElementById('integrated-garage-close').focus({preventScroll:true});
  }
  close(){if(this.panel.hidden)return;this.panel.hidden=true;document.body.classList.remove('racer-garage-open');this.focusReturn?.focus?.({preventScroll:true});}
  draw(){
    const state=this.api.snapshot();document.getElementById('integrated-total').textContent=String(state.total).padStart(6,'0');
    const list=document.getElementById('integrated-vehicles');list.replaceChildren();
    this.api.cars.forEach((car,id)=>{
      const row=document.createElement('article');row.className='integrated-car'+(id===state.selected?' selected':'');row.dataset.car=String(id);
      const preview=document.createElement('canvas');preview.width=420;preview.height=230;preview.setAttribute('aria-label',car.name+' 3D 预览');
      const title=document.createElement('h3');title.textContent=car.name;
      const author=document.createElement('small');author.textContent=id===2?'MODEL / IGNITION LABS':id===3?'MODEL / QUATERNIUS':'ORIGINAL / PROCEDURAL';
      const stats=document.createElement('p'),p=this.api.stats[id];stats.textContent=`SPD ${p.topSpeed} · TRN ${p.turn.toFixed(2)} · BOOST ${p.boostDuration.toFixed(1)}s`;
      const actions=document.createElement('div'),choose=document.createElement('button'),trial=document.createElement('button');
      const unlocked=state.unlocked.includes(id);
      choose.textContent=id===state.selected?'已选择':unlocked?'选择车辆':`解锁 · ${car.cost.toLocaleString()}`;
      choose.disabled=id===state.selected||(!unlocked&&state.total<car.cost)||this.library.status[id]!=='ready';
      choose.addEventListener('click',()=>{if(this.api.select(id))this.draw();});
      trial.textContent='免费试驾';trial.className='trial';trial.disabled=this.library.status[id]!=='ready';trial.addEventListener('click',()=>this.api.trial(id));
      if(this.library.status[id]!=='ready')stats.textContent='模型加载失败，请重新载入';
      actions.append(choose,trial);row.append(preview,title,author,stats,actions);list.append(row);this.preview(preview,id);
    });
  }
  preview(canvas,id){
    if(!this.renderer){
      this.renderer=this.rendererFactory({antialias:true,alpha:true,preserveDrawingBuffer:true});this.renderer.setSize(420,230);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.renderer.setClearColor(0x05040f,0);this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(36,420/230,.1,40);this.camera.position.set(5,3,7);this.camera.lookAt(0,.6,0);
    }
    this.scene.clear();if(!this.cache.has(id)){const model=this.library.create(id,['#7de5ec','#d49cff','#ff762b','#58dcff'][id]);model.rotation.y=Math.PI;this.cache.set(id,model);}
    this.scene.add(this.cache.get(id));this.renderer.render(this.scene,this.camera);canvas.getContext('2d').drawImage(this.renderer.domElement,0,0);this.renders++;
  }
}
