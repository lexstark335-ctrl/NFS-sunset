const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../src/trail-state.js'));
const moduleReady = import('data:text/javascript;base64,'+source.toString('base64'));
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);

test('tail trails vanish at idle, grow monotonically and stop growing at maximum speed', async () => {
  const {trailEnvelope,TRAIL_CONFIG} = await moduleReady;
  for(const speed of [-1,0,2,5])assert.deepEqual(trailEnvelope(speed,100),{amount:0,length:0,opacity:0});
  let previous=trailEnvelope(5,100);
  for(let speed=6;speed<=100;speed++){
    const next=trailEnvelope(speed,100);
    assert.ok(next.length>previous.length);assert.ok(next.opacity>previous.opacity);previous=next;
  }
  assert.equal(previous.length,TRAIL_CONFIG.maxLength);
  assert.equal(previous.opacity,TRAIL_CONFIG.maxOpacity);
  assert.deepEqual(trailEnvelope(200,100),previous);
});

test('distance sampling preserves turn history for both lamps independent of frame rate',async()=>{
  const {TrailHistory}=await moduleReady;
  for(const fps of [30,60,144]){
    const history=new TrailHistory();
    for(let frame=0;frame<=fps;frame++){
      const d=frame/fps*12;
      history.push(d,{x:d*.2-1,y:.55,z:2},{x:d*.2+1,y:.55,z:2});
    }
    for(const side of [0,1]){
      const point={};history.sample(5,side,point);
      near(point.x,7*.2+(side?1:-1));near(point.y,.55);near(point.z,7);
    }
  }
});

test('long sessions have bounded history and paused samples do not consume storage',async()=>{
  const {TrailHistory}=await moduleReady;const history=new TrailHistory(32);
  const point={x:1,y:1,z:2};
  for(let i=0;i<10000;i++)history.push(i*.1,point,point);
  assert.equal(history.count,32);assert.equal(history.data.length,32*7);
  near(history.span,3.1);
  const head=history.head;
  for(let i=0;i<100;i++)history.push(history.distance,point,point);
  assert.equal(history.head,head);assert.equal(history.count,32);
});

test('restart and teleport clear old trails instead of connecting unrelated positions',async()=>{
  const {TrailHistory}=await moduleReady;const history=new TrailHistory();const p={x:1,y:.5,z:2};
  history.push(10,p,p);history.push(12,p,p);history.push(0,p,p);
  assert.equal(history.count,1);assert.equal(history.span,0);
  history.push(1,p,p);history.push(100,p,p);
  assert.equal(history.count,1);assert.equal(history.span,0);
  history.reset();assert.equal(history.sample(1,0,{}),false);
});

test('slowing down shortens the trail and lowers opacity without any BOOST switch',async()=>{
  const {trailEnvelope}=await moduleReady;
  const fast=trailEnvelope(90,100),slow=trailEnvelope(25,100);
  assert.ok(fast.length>slow.length);assert.ok(fast.opacity>slow.opacity);
  assert.ok(slow.length>0);assert.ok(slow.opacity>0);
});
