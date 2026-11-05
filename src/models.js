import * as THREE from './three.js';
import { GLTFLoader } from './three.js';

/** 车库映射：保留前两辆原创车型，后两辆使用用户明确提供的文件。 */
export const MODEL_MANIFEST = [
  null,
  null,
  { file: 'ignition-car.glb', author: 'Ignition Labs', title: 'CAR Model', yaw: 0, color: '#ff762b' },
  { file: 'police-car.glb', author: 'Quaternius', title: 'Police Car', yaw: 0, color: '#58dcff' },
];

/**
 * 全部实体材质仅由 emissive 分量着色。关闭金属度/环境贴图，场景无需灯光。
 * 玻璃也用深青色自发光面，避免真实反射掩盖 low-poly 轮廓。
 */
export function neonMaterial(color, intensity = 0.7, options = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 1,
    metalness: 0,
    envMap: null,
    flatShading: true,
    ...options,
  });
}

function box(parent, dimensions, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

/** 两辆保留的原创车也是完整 3D 几何，不再是 Canvas 画出的投影多边形。 */
function primitiveCar(id, color) {
  const car = new THREE.Group();
  const body = neonMaterial(color, 0.5);
  const trim = neonMaterial('#132234', .7);
  const glass = neonMaterial('#1c6378', .32);
  box(car, [1.9, .42, 4.2], [0, .51, 0], body);
  const hood = box(car, [1.75, .17, 1.4], [0, .78, 1.28], body);
  hood.rotation.x = .08;
  box(car, [1.48, .53, 1.8], [0, .99, -.18], glass);
  box(car, [1.45, .08, 1.40], [0, 1.27, -.25], body);
  const wheels = [];
  for (const side of [-1, 1]) for (const z of [-1.3, 1.35]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .23, 10), trim);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * .97, .38, z);
    wheels.push(wheel); car.add(wheel);
  }
  box(car, [2.0, .09, .38], [0, 1.0 + id * .16, -1.8], body);
  for (const side of [-1, 1]) box(car, [.08, .3, .1], [side * .68, .84, -1.8], trim);
  car.userData.wheels = wheels;
  return car;
}

/**
 * 统一后处理：GLB 原有颜色和模型布局保留，但金属、粗糙度贴图均不参与反射。
 * 已命名的警灯/尾灯使用高于 Bloom 阈值的强度，车身保持较低亮度以免糊成光团。
 */
function restyleImported(root, id) {
  const manifest = MODEL_MANIFEST[id];
  root.traverse(node => {
    if (!node.isMesh) return;
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const updated = sourceMaterials.map(source => {
      const name = ((source.name || '') + ' ' + node.name).toLowerCase();
      let color = manifest.color, intensity = .52, emissiveMap = null;
      if (/tail|redlight/.test(name)) { color = '#ff163c'; intensity = 3.2; }
      else if (/bluelight/.test(name)) { color = '#00cfff'; intensity = 3; }
      else if (/headlight|whitelight/.test(name)) { color = '#ffc15a'; intensity = 2; }
      else if (/window|glass/.test(name)) { color = '#154c65'; intensity = .48; }
      else if (/wheel|black/.test(name)) { color = '#10172e'; intensity = .65; }
      else if (/grey/.test(name)) { color = '#546478'; intensity = .55; }
      else if (/white/.test(name)) { color = '#84cbd7'; intensity = .65; }
      else if (source.map) { emissiveMap = source.map; }
      const material = neonMaterial(color, intensity, { emissiveMap, side: source.side });
      material.name = 'NEON_' + (source.name || 'body');
      return material;
    });
    node.material = Array.isArray(node.material) ? updated : updated[0];
    node.castShadow = false; node.receiveShadow = false;
  });
}

/** 按包围盒归一化长度、居中并落地；碰撞尺寸独立于模型原始单位。 */
export function normalizeModel(root, yaw = 0) {
  root.rotation.y = yaw;
  root.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(4.45 / size.z, 2.15 / size.x, 1.65 / size.y);
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x; root.position.z -= center.z;
  root.position.y -= bounds.min.y;
  const container = new THREE.Group();
  container.add(root);
  container.userData.size = new THREE.Box3().setFromObject(container).getSize(new THREE.Vector3());
  return container;
}

/** 装饰单独挂在容器上，不修改用户原始 GLB：红尾灯、底盘光、护盾。 */
function addDrivingEffects(car, id) {
  const size = car.userData.size || new THREE.Vector3(2, 1.4, 4.4);
  const tailZ = -size.z / 2 - .035;
  const red = neonMaterial('#ff2630', 4);
  // 每辆车独立的灯材质与两个锚点，尾迹从真实尾灯世界坐标发出。
  const tailLights = [];
  for (const side of [-1, 1]) tailLights.push(box(car, [.62, .09, .04], [side * .59, .55, tailZ], red));
  car.userData.tailLights = tailLights; car.userData.tailMaterial = red;
  box(car, [1.8, .025, .07], [0, .17, 0], neonMaterial('#00e7f5', 2));
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), neonMaterial('#ff43dc', 2, { wireframe: true, transparent: true, opacity: .3, depthWrite: false }));
  shield.scale.set(1.6, 1.2, 2.8); shield.position.y = .6; shield.visible = false; car.add(shield);
  car.userData.shield = shield; car.userData.vehicleId = id;
  return car;
}

export class VehicleLibrary {
  constructor() {
    this.loader = new GLTFLoader();
    this.templates = new Map();
    this.status = ['ready', 'ready', 'loading', 'loading'];
    this.errors = [];
  }
  async load() {
    // 两个独立模型并行加载。某一个失败时保留错误状态，车库明确显示“模型未载入”。
    await Promise.all(MODEL_MANIFEST.map(async (manifest, id) => {
      if (!manifest) return;
      try {
        const url = window.NEON_ASSET_URLS?.[manifest.file] || 'assets/models/' + manifest.file;
        const gltf = await this.loader.loadAsync(url);
        restyleImported(gltf.scene, id);
        this.templates.set(id, normalizeModel(gltf.scene, manifest.yaw));
        this.status[id] = 'ready';
      } catch (error) {
        this.status[id] = 'error'; this.errors.push(manifest.title + ': ' + error.message);
      }
    }));
  }
  create(id, color) {
    const template = this.templates.get(id);
    const car = template ? template.clone(true) : primitiveCar(id, color);
    return addDrivingEffects(car, id);
  }
}
