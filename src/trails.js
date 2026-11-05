import * as THREE from './three.js';
import { K as RenderPass } from '../assets/three-BJx-OGLx.js';
import { TrailHistory, trailEnvelope } from './trail-state.js';

export const RENDER_LAYER = Object.freeze({ WORLD: 0, CAR: 1, TRAIL: 2 });

/**
 * 分层绘制到同一个 HDR 缓冲：场景 → 玩家车 → 尾灯历史条带 → 统一 Bloom。
 * 第二/三层保留颜色和深度，尾迹会被车辆遮挡，不会浮到车身前面。
 * 不使用全屏 AfterimagePass，不采样上一帧背景；道路/山/落日永远没有时间残影。
 */
export class LayerRenderPass extends RenderPass {
  constructor(scene, camera, layer, clear) {
    super(scene, camera); this.layer = layer; this.clear = clear; this.clearDepth = false;
  }
  render(renderer, writeBuffer, readBuffer, dt, maskActive) {
    const previous = this.camera.layers.mask;
    this.camera.layers.set(this.layer);
    try { super.render(renderer, writeBuffer, readBuffer, dt, maskActive); }
    finally { this.camera.layers.mask = previous; }
  }
}

export class TailLightTrails {
  constructor(scene) {
    this.history = new TrailHistory();
    this.anchors = [new THREE.Vector3(), new THREE.Vector3()];
    this.point = new THREE.Vector3(); this.next = new THREE.Vector3();
    this.tangent = new THREE.Vector3(); this.toCamera = new THREE.Vector3(); this.widthAxis = new THREE.Vector3();
    this.length = 0; this.opacity = 0; this.segments = 48;
    this.material = new THREE.ShaderMaterial({
      uniforms: { opacity: { value: 0 } },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
      `,
      fragmentShader: /* glsl */`
        uniform float opacity; varying vec2 vUv;
        void main(){
          // 横向高斯软边 + 纵向衰减。末端完全透明，不是硬边红色矩形。
          float edge=abs(vUv.x);
          float soft=exp(-edge*edge*5.0)*(1.0-smoothstep(.78,1.0,edge));
          float fade=pow(max(0.0,1.0-vUv.y),1.4);
          float alpha=opacity*soft*fade;
          // HDR 红色在进入原版 UnrealBloomPass 前保留 >1 的亮度，随后统一经过原版 CRT。
          gl_FragColor=vec4(vec3(12.0,.65,.5),alpha);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      depthTest: true, side: THREE.DoubleSide, toneMapped: false,
    });
    this.meshes = [0,1].map(() => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((this.segments+1)*6),3).setUsage(THREE.DynamicDrawUsage));
      const uv = [], indices = [];
      for(let i=0;i<=this.segments;i++) {
        uv.push(-1,i/this.segments,1,i/this.segments);
        if(i<this.segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); geometry.setIndex(indices);
      const mesh = new THREE.Mesh(geometry,this.material);
      mesh.layers.set(RENDER_LAYER.TRAIL); mesh.frustumCulled=false; mesh.visible=false;
      scene.add(mesh); return mesh;
    });
  }
  clear() {
    this.history.reset(); this.length=0; this.opacity=0; this.material.uniforms.opacity.value=0;
    for(const mesh of this.meshes)mesh.visible=false;
  }
  update(game, car, camera) {
    if (this.car !== car) { this.clear(); this.car = car; }
    if (game.state === 'paused') return; // 暂停保留当前形状，不产生新采样。
    const speed = game.state === 'running' ? game.speed : 0;
    const envelope = trailEnvelope(speed, game.car.top * 1.65);
    car.userData.tailMaterial.emissiveIntensity = 4 + envelope.amount * 1.8;
    if (envelope.length < .001) { this.clear(); return; }
    car.updateWorldMatrix(true,true);
    for(let side=0;side<2;side++)car.userData.tailLights[side].getWorldPosition(this.anchors[side]);
    this.history.push(game.distance,this.anchors[0],this.anchors[1]);
    this.length = Math.min(envelope.length,this.history.span); this.opacity=envelope.opacity;
    this.material.uniforms.opacity.value = this.opacity;
    for(let side=0;side<2;side++) {
      const mesh=this.meshes[side]; mesh.visible=this.length>.015;
      const positions=mesh.geometry.attributes.position;
      for(let i=0;i<=this.segments;i++) {
        const t=i/this.segments, age=t*this.length;
        this.history.sample(age,side,this.point);
        // 条带绕路径轴朝向镜头，低机位也能看见；转向历史保留为弯曲尾迹。
        const neighbor=i===this.segments?age-.02:age+.02;
        this.history.sample(neighbor,side,this.next);
        this.tangent.subVectors(this.next,this.point);
        if(i===this.segments)this.tangent.negate();
        this.toCamera.subVectors(camera.position,this.point);
        this.widthAxis.crossVectors(this.tangent,this.toCamera).normalize();
        if(this.widthAxis.lengthSq()<.001)this.widthAxis.set(1,0,0);
        const halfWidth=.34*(1-.32*t);
        positions.setXYZ(i*2,this.point.x-this.widthAxis.x*halfWidth,this.point.y-this.widthAxis.y*halfWidth,this.point.z-this.widthAxis.z*halfWidth);
        positions.setXYZ(i*2+1,this.point.x+this.widthAxis.x*halfWidth,this.point.y+this.widthAxis.y*halfWidth,this.point.z+this.widthAxis.z*halfWidth);
      }
      positions.needsUpdate=true;
    }
  }
}
