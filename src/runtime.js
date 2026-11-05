import {VehicleLibrary} from './models.js';
import {Garage} from './garage.js';
import {SynthRadio} from './music.js';
import {TailLightTrails,RENDER_LAYER} from './trails.js';
export {LayerRenderPass,RENDER_LAYER} from './trails.js';

/** 新功能的唯一桥接对象。模型、车库与音乐不另建驾驶状态机。 */
export const integration={
  library:new VehicleLibrary(),cache:new Map(),radio:new SynthRadio(),sfxEnabled:false,
  async load(){await this.library.load();if(this.library.errors.length)throw Error(this.library.errors.join('；'));},
  createVehicle(id){
    if(!this.cache.has(id)){
      const car=this.library.create(id,['#7de5ec','#d49cff','#ff762b','#58dcff'][id]);car.rotation.y=Math.PI;
      car.traverse(object=>object.layers.set(RENDER_LAYER.CAR));this.cache.set(id,car);
    }
    return this.cache.get(id);
  },
  bind(api){this.api=api;this.trails=new TailLightTrails(api.scene);this.garage=new Garage(this.library,api);},
  openGarage(){this.garage.open();},closeGarage(){this.garage?.close();},
  frame(dt,time){
    if(!this.api)return;const state=this.api.snapshot();
    const running=state.state==='running';
    this.trails.update({state:state.state==='off'?'menu':state.state,speed:running||state.state==='paused'?state.speed:0,distance:state.distance,car:{top:state.car.topSpeed*1.7/1.65}},this.api.getCar(),this.api.camera);
    this.radio.update(state);
    // 面向验收的只读 DOM 指标，不把内部实现信息放进玩家操作流程。
    const canvas=document.querySelector('canvas.webgl');
    Object.assign(canvas.dataset,{engine:'Three.js r184',vehicle:String(state.selected),trial:String(state.trial),state:state.state,models:this.library.status.join(','),trailLength:this.trails.length.toFixed(2),audioVoices:String(this.radio.voices.size),previewRenders:String(this.garage.renders)});
    document.getElementById('trial-indicator').hidden=!state.trial||state.state==='off';
    const pause=document.getElementById('integrated-pause');pause.hidden=!['running','paused'].includes(state.state);pause.textContent=state.state==='paused'?'▷':'Ⅱ';
  },
  wireUI(){
    const $=id=>document.getElementById(id),error=e=>{$('music-status').textContent='音频不可用：'+e.message;};
    $('menu-garage').onclick=()=>this.api.openGarage();$('integrated-garage-close').onclick=()=>this.api.closeGarage();
    $('integrated-pause').onclick=()=>this.api.snapshot().state==='paused'?this.api.resume():this.api.pause();
    $('music-toggle').onclick=async()=>{try{const on=await this.radio.toggle();$('music-toggle').textContent=on?'音乐 Ⅱ':'音乐 ▷';$('music-toggle').setAttribute('aria-pressed',String(on));$('music-status').textContent='FM / NIGHT CIRCUIT · 110 BPM';}catch(e){error(e);}};
    $('music-volume').oninput=e=>this.radio.setVolume(Number(e.target.value));
    $('music-mute').onclick=()=>{const off=this.radio.mute();$('music-mute').textContent=off?'取消静音':'静音';$('music-mute').setAttribute('aria-pressed',String(off));};
    $('effects-toggle').onclick=async()=>{try{const on=!this.sfxEnabled;await this.radio.setSFX(on);this.sfxEnabled=on;this.api.setEffects(on);$('effects-toggle').textContent='音效 '+(on?'ON':'OFF');$('effects-toggle').setAttribute('aria-pressed',String(on));}catch(e){error(e);}};
    $('engine-toggle').onclick=async()=>{try{const on=!this.radio.engineEnabled;await this.radio.setEngine(on);$('engine-toggle').textContent='引擎 '+(on?'ON':'OFF');$('engine-toggle').setAttribute('aria-pressed',String(on));}catch(e){error(e);}};
    document.addEventListener('visibilitychange',()=>this.radio.applyLevels());
    document.addEventListener('keydown',e=>{
      if(this.garage.panel.hidden)return;
      if(e.key==='Escape'){this.api.closeGarage();e.preventDefault();return;}
      if(e.key==='Tab'){
        const buttons=[...this.garage.panel.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
        if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}
        else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}
      }
    });
    addEventListener('pagehide',event=>{if(!event.persisted)this.radio.dispose();});
  }
};
