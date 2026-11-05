/** 校验调度、生命周期与节点释放。AudioContext 替身不渲染音频，不代表听感验收。 */
const test=require('node:test'),assert=require('node:assert/strict');
let SynthRadio,contexts=0;const timers=new Map();let timerId=0;
class Param{
 constructor(value=0){this.value=value;}
 setValueAtTime(value,time){assert.ok(Number.isFinite(value)&&time>=0);this.value=value;}
 setTargetAtTime(value,time,constant){assert.ok(constant>0);this.setValueAtTime(value,time);}
 linearRampToValueAtTime(value,time){this.setValueAtTime(value,time);}
 exponentialRampToValueAtTime(value,time){assert.ok(value>0);this.setValueAtTime(value,time);}
 cancelAndHoldAtTime(){}
}
class AudioNode{
 constructor(ctx,type){this.ctx=ctx;this.type=type;this.connections=new Set();this.gain=new Param(1);this.frequency=new Param(440);this.Q=new Param(1);this.pan=new Param();this.delayTime=new Param();for(const key of ['threshold','knee','ratio','attack','release'])this[key]=new Param();}
 connect(node){this.connections.add(node);return node;}
 disconnect(){this.connections.clear();this.disconnected=true;}
 start(time=0){assert.ok(time>=0);assert.equal(this.started,undefined);this.started=true;this.ctx.sources.add(this);}
 stop(time=this.ctx.currentTime){assert.ok(time>=0);this.stopAt=time;}
}
class Context{
 constructor(){contexts++;this.currentTime=0;this.sampleRate=44100;this.state='suspended';this.sources=new Set();this.destination={};}
 async resume(){this.state='running';}async close(){this.state='closed';this.advance(100);}
 createGain(){return new AudioNode(this,'gain');}createBiquadFilter(){return new AudioNode(this,'filter');}
 createDynamicsCompressor(){return new AudioNode(this,'limiter');}createDelay(){return new AudioNode(this,'delay');}
 createOscillator(){return new AudioNode(this,'oscillator');}createBufferSource(){return new AudioNode(this,'buffer');}
 createStereoPanner(){return new AudioNode(this,'pan');}createAnalyser(){const a=new AudioNode(this,'analyser');a.frequencyBinCount=128;return a;}
 createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
 advance(dt){this.currentTime+=dt;for(const source of [...this.sources])if(source.stopAt<=this.currentTime){source.onended?.();this.sources.delete(source);}}
}
test.before(async()=>{
 global.window={AudioContext:Context};global.document={hidden:false};
 global.setInterval=fn=>{const id=++timerId;timers.set(id,fn);return id;};global.clearInterval=id=>timers.delete(id);
 ({SynthRadio}=await import('../src/music.js'));
});
test('no context before interaction; repeated play/pause keeps one context and one scheduler',async()=>{
 const before=contexts,radio=new SynthRadio();radio.update({state:'running',speed:50});assert.equal(contexts,before);
 for(let i=0;i<30;i++){
  await radio.toggle();assert.equal(timers.size,1);assert.equal(radio.playing,true);
  await radio.toggle();assert.equal(timers.size,0);radio.ctx.advance(.05);assert.equal(radio.voices.size,0);
 }
 assert.equal(contexts,before+1);radio.dispose();assert.equal(timers.size,0);
});
test('110 BPM song evolves beyond 32 bars with bounded active voices and background catch-up',async()=>{
 const radio=new SynthRadio();await radio.toggle();let peak=0;
 for(let i=0;i<150*60;i++){radio.ctx.advance(1/60);radio.schedule();peak=Math.max(peak,radio.voices.size);}
 assert.equal(radio.bpm,110);assert.ok(radio.step>32*16*2);assert.ok(peak<70);
 const before=radio.step;radio.ctx.advance(600);radio.schedule();assert.ok(radio.step-before<=2);
 await radio.toggle();radio.ctx.advance(.05);assert.equal(radio.voices.size,0);radio.dispose();
});
test('boost changes tone without restarting; pause ducks music and mute does not mute separate engine/SFX',async()=>{
 const radio=new SynthRadio();await radio.toggle();await radio.setSFX(true);await radio.setEngine(true);
 const step=radio.step,next=radio.next,engine=radio.engine;
 radio.update({state:'running',speed:110,boost:1});assert.equal(radio.step,step);assert.equal(radio.next,next);
 assert.equal(radio.filter.frequency.value,4300);assert.ok(engine.gain.gain.value>0);
 radio.update({state:'paused',speed:110,boost:1});assert.equal(radio.music.gain.value,radio.volume*.25);assert.equal(engine.gain.gain.value,0);
 radio.update({state:'running',speed:50,boost:0});assert.equal(radio.music.gain.value,radio.volume);
 radio.mute();assert.equal(radio.music.gain.value,0);assert.ok(radio.effects.gain.value>0);assert.ok(engine.gain.gain.value>0);
 await radio.setEngine(true);assert.equal(radio.engine,engine);await radio.setEngine(false);assert.equal(radio.engine,null);
 assert.ok(Object.values(engine).every(node=>node.disconnected));radio.dispose();assert.equal(radio.voices.size,0);
});
test('source end disconnects every per-note node; engine toggles do not leave duplicate sources',async()=>{
 const radio=new SynthRadio();await radio.toggle();const voices=[...radio.voices];
 await radio.toggle();radio.ctx.advance(.05);
 assert.ok(voices.every(({source,nodes})=>[source,...nodes].every(node=>node.disconnected)));
 for(let n=0;n<50;n++){await radio.setEngine(true);await radio.setEngine(false);radio.ctx.advance(.01);}
 assert.equal(radio.ctx.sources.size,0);assert.equal(radio.voices.size,0);radio.dispose();
});
