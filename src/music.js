/** 原创 110 BPM 合成曲。一个 AudioContext / 一个调度器；BOOST 只改音色，不重启节拍。 */
export class SynthRadio {
  constructor() {
    this.bpm=110;this.step=0;this.playing=false;this.muted=false;this.volume=.42;
    this.sfx=false;this.engineEnabled=false;this.voices=new Set();this.timer=null;
    this.state={state:'off',speed:0,boost:0};
  }
  async init() {
    if(!this.ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw Error('浏览器不支持 Web Audio');
      const c=this.ctx=new Audio();
      this.master=c.createGain();this.master.gain.value=.65;
      const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=16;limiter.ratio.value=6;limiter.attack.value=.006;limiter.release.value=.18;
      this.master.connect(limiter);limiter.connect(c.destination);
      this.music=c.createGain();this.music.gain.value=0;
      this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=2300;this.filter.Q.value=.6;
      this.analyser=c.createAnalyser();this.analyser.fftSize=256;this.analyser.smoothingTimeConstant=.75;
      this.spectrum=new Uint8Array(this.analyser.frequencyBinCount);
      // 原场景的频谱柱共用这一分析器，不再创建旧站播放器或第二个音频上下文。
      this.music.connect(this.filter);this.filter.connect(this.analyser);this.analyser.connect(this.master);
      this.effects=c.createGain();this.effects.gain.value=0;this.effects.connect(this.master);
      this.delay=c.createDelay(1);this.delay.delayTime.value=60/this.bpm*.75;
      this.feedback=c.createGain();this.feedback.gain.value=.22;
      const delayTone=c.createBiquadFilter();delayTone.type='lowpass';delayTone.frequency.value=1800;
      const wet=c.createGain();wet.gain.value=.16;
      this.delay.connect(delayTone);delayTone.connect(this.feedback);this.feedback.connect(this.delay);delayTone.connect(wet);wet.connect(this.music);
      this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);
      const samples=this.noise.getChannelData(0);let seed=1977;
      for(let i=0;i<samples.length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=(seed/4294967296)*2-1;}
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  applyLevels() {
    if(!this.ctx)return;const t=this.ctx.currentTime;
    const duck=this.state.state==='paused'||document.hidden? .25:1;
    this.music.gain.setTargetAtTime(this.playing&&!this.muted?this.volume*duck:0,t,.10);
    this.effects.gain.setTargetAtTime(this.sfx?.28:0,t,.05);
    this.filter.frequency.setTargetAtTime(2100+this.state.boost*2200,t,.3);
  }
  async toggle() {
    await this.init();this.playing=!this.playing;
    if(this.playing){this.next=this.ctx.currentTime+.035;this.schedule();this.timer=setInterval(()=>this.schedule(),25);}
    else {clearInterval(this.timer);this.timer=null;this.stopMusicVoices();}
    this.applyLevels();return this.playing;
  }
  setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.applyLevels();}
  mute(){this.muted=!this.muted;this.applyLevels();return this.muted;}
  async setSFX(on){await this.init();this.sfx=on;this.applyLevels();}
  async setEngine(on){
    await this.init();this.engineEnabled=on;
    if(on&&!this.engine){
      const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
      osc.type='sawtooth';filter.type='lowpass';filter.frequency.value=180;gain.gain.value=0;
      osc.connect(filter);filter.connect(gain);gain.connect(this.master);osc.start();this.engine={osc,gain,filter};
    }
    if(!on&&this.engine){this.engine.osc.stop();for(const node of Object.values(this.engine))node.disconnect();this.engine=null;}
    this.update(this.state);
  }
  update(state){
    const old=this.state;this.state={state:state.state,speed:state.speed||0,boost:state.boost||0};this.applyLevels();
    if(this.engine){const t=this.ctx.currentTime,run=state.state==='running';
      this.engine.osc.frequency.setTargetAtTime(30+Math.min(160,this.state.speed)*1.15,t,.12);
      this.engine.filter.frequency.setTargetAtTime(140+this.state.speed*2,t,.15);
      this.engine.gain.gain.setTargetAtTime(run?.025:0,t,.15);
    }
    if(this.sfx&&old.state==='running'&&state.state==='over')this.drum('snare',this.ctx.currentTime,.18,this.effects);
  }
  // 短音包络归零后逐一断开音频节点，长期运行和反复播放都不会累积节点。
  track(source,nodes,end,music=true){
    const item={source,nodes,music};this.voices.add(item);
    source.onended=()=>{for(const node of [source,...nodes])node.disconnect();this.voices.delete(item);};
    source.stop(end);
  }
  tone(midi,time,duration,level,type='triangle',pan=0,echo=false){
    const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),stereo=c.createStereoPanner();
    osc.type=type;osc.frequency.value=440*2**((midi-69)/12);stereo.pan.value=pan;
    const attack=Math.min(duration*.25,type==='sawtooth'?.18:.012);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+attack);
    gain.gain.setTargetAtTime(.0001,time+duration*.55,Math.max(.015,duration*.15));
    gain.gain.linearRampToValueAtTime(0,time+duration);
    osc.connect(gain);gain.connect(stereo);stereo.connect(this.music);if(echo)stereo.connect(this.delay);
    osc.start(time);this.track(osc,[gain,stereo],time+duration+.02);
  }
  drum(kind,time,level=.1,bus=this.music){
    const c=this.ctx,gain=c.createGain();gain.connect(bus);const music=bus===this.music;
    if(kind==='kick'){
      const osc=c.createOscillator();osc.frequency.setValueAtTime(125,time);osc.frequency.exponentialRampToValueAtTime(42,time+.13);
      gain.gain.setValueAtTime(level,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.28);
      osc.connect(gain);osc.start(time);this.track(osc,[gain],time+.30,music);
    } else {
      const noise=c.createBufferSource(),filter=c.createBiquadFilter();noise.buffer=this.noise;
      const hat=kind==='hat',duration=hat?.055:.18;filter.type=hat?'highpass':'bandpass';filter.frequency.value=hat?5600:1500;filter.Q.value=.6;
      gain.gain.setValueAtTime(level,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
      noise.connect(filter);filter.connect(gain);noise.start(time);this.track(noise,[filter,gain],time+duration+.02,music);
    }
  }
  schedule(){
    if(!this.playing)return;
    const c=this.ctx,beat=60/this.bpm,stepTime=beat/4;
    // 标签页休眠后从当前位置继续，不补播积压的数千个音符。
    if(this.next<c.currentTime-.2)this.next=c.currentTime+.02;
    while(this.next<c.currentTime+.14){
      const step=this.step++,bar=Math.floor(step/16),tick=step%16,section=Math.floor(bar/8)%4;
      const root=[33,29,36,31,33,29,38,31][bar%8],time=this.next;
      if(tick%4===0)this.drum('kick',time,.19);
      if(tick===4||tick===12)this.drum('snare',time,.105);
      if(tick%2===0||section===3&&tick>11)this.drum('hat',time,tick%4===0?.026:.017);
      if(tick%2===0)this.tone(root+(tick===14?12:0),time,stepTime*1.45,.105,'triangle');
      if(tick===0)for(const [i,interval] of [0,3,7].entries())this.tone(root+24+interval,time,beat*3.8,.022,'sawtooth',(i-1)*.65);
      const pattern=section%2?[0,7,12,3,7,15,12,7]:[0,3,7,12,7,3,15,12];
      if(section!==0||tick%2===0)this.tone(root+24+pattern[tick%8],time,stepTime*1.8,.035,'triangle',tick%2?.45:-.45,true);
      if(section===2&&(tick===2||tick===10))this.tone(root+36+[7,3][tick===2?0:1],time,beat*.75,.028,'sine',.25,true);
      this.next+=stepTime;
    }
  }
  stopMusicVoices(){
    for(const voice of [...this.voices])if(voice.music){
      // 在波形中段点击暂停时用短包络收尾，避免立即截断造成爆音。
      const t=this.ctx.currentTime,gain=voice.nodes.find(node=>node.gain)?.gain;
      if(gain){gain.cancelAndHoldAtTime(t);gain.linearRampToValueAtTime(0,t+.025);}
      try{voice.source.stop(t+.03);}catch{}
    }
  }
  dispose(){clearInterval(this.timer);this.timer=null;this.playing=false;for(const voice of [...this.voices])try{voice.source.stop();}catch{}if(this.engine){this.engine.osc.stop();for(const node of Object.values(this.engine))node.disconnect();this.engine=null;}this.ctx?.close();}
}
