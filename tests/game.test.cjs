const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./dom-fixture.cjs')();
let integration,THREE,createRacer;
test.before(async()=>{
 ({integration}=await import('../src/runtime.js'));THREE=await import('../src/three.js');({createRacer}=await import('../assets/racer-testable.js'));
 await integration.load();integration.openGarage=function(){this.opened=true;};integration.closeGarage=function(){this.opened=false;};
});
function setup(){
 fixture.store.clear();
 const sim=createRacer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,1,.1,1000),gridFloor:{speed:.05}});
 const api=integration.api;let time=0;
 const run=seconds=>{for(let i=0;i<seconds*120;i++){time+=1/120;sim.update(1/120,time);}};
 return {sim,api,run};
}
test('both user GLBs parse into drawable geometry; four player vehicles use distinct cached models',()=>{
 assert.deepEqual(integration.library.status,['ready','ready','ready','ready']);
 for(const id of [0,1,2,3]){
  const car=integration.createVehicle(id);let meshes=0;car.traverse(n=>{if(n.isMesh&&n.geometry.attributes.position.count>0)meshes++;});
  assert.ok(meshes>=4);assert.equal(car.userData.vehicleId,id);assert.equal(integration.createVehicle(id),car);
 }
 assert.equal(integration.cache.size,4);
});
test('original entry transitions into driving; steering, boost and pause work through the same simulation',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);assert.equal(api.snapshot().state,'running');
 const before=api.snapshot();api.debug.setInput(-1);run(.5);api.debug.setInput(0);assert.ok(api.snapshot().x<before.x);
 api.boost();run(.8);assert.ok(api.snapshot().speed>before.speed);assert.ok(api.snapshot().boost>0);
 api.pause();const paused=api.snapshot();run(1);assert.equal(api.snapshot().distance,paused.distance);assert.equal(api.snapshot().score,paused.score);
 api.resume();run(.2);assert.ok(api.snapshot().score>paused.score);
});
test('all four free trials switch actual model without any persisted score or selection',()=>{
 const {api,run}=setup();const before=[...fixture.store];
 for(const id of [0,1,2,3]){
  api.trial(id);run(id===0?4.8:.3);assert.equal(api.snapshot().selected,id);assert.equal(api.getCar(),integration.cache.get(id));
  api.debug.finish();assert.equal(api.snapshot().state,'over');assert.deepEqual([...fixture.store],before);
 }
 api.exit();run(1);assert.equal(api.snapshot().selected,0);assert.equal(api.snapshot().trial,false);assert.deepEqual([...fixture.store],before);
});
test('a real traffic collision ends the run and banks normal score only once',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);
 const state=api.snapshot(),traffic=api.debug.traffic[0];traffic.active=true;traffic.z=-.5;traffic.lane=state.x-state.roadCenter;
 run(.03);assert.equal(api.snapshot().state,'over');assert.ok(api.snapshot().total>0);
 const total=api.snapshot().total;api.debug.finish();assert.equal(api.snapshot().total,total);
 const saved=[...fixture.store];assert.ok(saved.every(([key])=>key.startsWith('roku-neon-integrated-v1-')));
});
test('unlock threshold and saved selection survive a new game instance',()=>{
 const {api}=setup();assert.equal(api.select(3),false);
 fixture.store.set('roku-neon-integrated-v1-total','40000');
 createRacer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,1,.1,1000),gridFloor:{speed:.05}});
 const next=integration.api;assert.equal(next.select(3),true);assert.equal(next.snapshot().total,40000);assert.equal(next.getCar().userData.vehicleId,3);
 assert.equal(integration.cache.size,4);
 createRacer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,1,.1,1000),gridFloor:{speed:.05}});
 assert.equal(integration.api.snapshot().selected,3);assert.equal(integration.api.snapshot().total,40000);
});

test('retry clears score, collision and boost state without banking the previous run twice',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);api.boost();run(.2);api.debug.finish();
 const bank=api.snapshot().total;api.debug.retry();
 assert.equal(api.snapshot().state,'running');assert.equal(api.snapshot().score,0);
 assert.equal(api.snapshot().boostLeft,0);assert.equal(api.snapshot().total,bank);
 assert.ok(api.debug.traffic.every(car=>!car.active));run(.15);assert.ok(api.snapshot().score>0);
});

test('actual tail mesh vertices are finite and stay on the trail layer while the road stays on world layer',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);
 for(let i=0;i<30;i++){run(1/60);integration.frame(1/60,i/60);}
 assert.ok(integration.trails.length>0);
 for(const ribbon of integration.trails.meshes){assert.equal(ribbon.layers.mask,4);assert.ok([...ribbon.geometry.attributes.position.array].every(Number.isFinite));}
 api.getCar().traverse(n=>assert.equal(n.layers.mask,2));
 api.pause();const length=integration.trails.length;integration.frame(.5,1);assert.equal(integration.trails.length,length);
 api.debug.finish();api.exit();integration.frame(.1,2);assert.equal(integration.trails.length,0);
});

test('garage builds four cards and reuses one preview renderer and four objects for 25 visits (GPU mocked)',async()=>{
 const {api}=setup(),{Garage}=await import('../src/garage.js');let created=0,rendered=0;
 const garage=new Garage(integration.library,api,()=>{created++;return {domElement:new fixture.Node('canvas'),setSize(){},setClearColor(){},render(scene){assert.equal(scene.children.length,1);rendered++;}};});
 let originals;
 for(let visit=0;visit<25;visit++){
  garage.open();assert.equal(fixture.ids.get('integrated-vehicles').children.length,4);assert.equal(garage.cache.size,4);
  if(!originals)originals=[...garage.cache.values()];else assert.deepEqual([...garage.cache.values()],originals);
  garage.close();assert.equal(garage.panel.hidden,true);
 }
 assert.equal(created,1);assert.equal(rendered,100);assert.equal(garage.renders,100);
});
