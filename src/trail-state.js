/** 尾迹数值层：不依赖 WebGL，长度按实际车速映射，不按 BOOST 按键硬切换。 */
export const TRAIL_CONFIG = Object.freeze({ idleSpeed: 5, maxLength: 5.4, maxOpacity: .46 });

export function trailEnvelope(speed, maxSpeed) {
  const ratio = Math.max(0, Math.min(1, (speed - TRAIL_CONFIG.idleSpeed) / Math.max(1, maxSpeed - TRAIL_CONFIG.idleSpeed)));
  // smoothstep 让怠速附近缓慢出现，高速端平滑达到上限。
  const amount = ratio * ratio * (3 - 2 * ratio);
  return { amount, length: TRAIL_CONFIG.maxLength * amount, opacity: TRAIL_CONFIG.maxOpacity * amount };
}

/**
 * 固定容量的双尾灯轨迹环。记录世界横移/高度和车辆附近的 Z，不保存整幅画面。
 * 回读时把已经驶过的距离补到 Z 上：赛车在场景原点附近，老尾迹仍然向车后退。
 * 按距离插值，所以 30/60/144 Hz 不会改变尾迹的物理长度，也不会出现离散光点。
 */
export class TrailHistory {
  constructor(capacity = 128) {
    this.capacity = capacity; this.data = new Float64Array(capacity * 7); this.reset();
  }
  reset() { this.head = -1; this.count = 0; }
  get distance() { return this.count ? this.data[this.head * 7] : 0; }
  get span() {
    if (!this.count) return 0;
    const oldest = (this.head - this.count + 1 + this.capacity) % this.capacity;
    return this.distance - this.data[oldest * 7];
  }
  push(distance, left, right) {
    // 重开比赛/大幅跳跃不能把两局之间连成一条光带。
    if (this.count && (distance < this.distance || distance - this.distance > 20)) this.reset();
    if (!this.count || distance !== this.distance) {
      this.head = (this.head + 1) % this.capacity; this.count = Math.min(this.count + 1, this.capacity);
    }
    const i = this.head * 7;
    this.data[i] = distance;
    this.data[i+1] = left.x; this.data[i+2] = left.y; this.data[i+3] = left.z;
    this.data[i+4] = right.x; this.data[i+5] = right.y; this.data[i+6] = right.z;
  }
  sample(age, side, out) {
    if (!this.count) return false;
    const wanted = this.distance - Math.max(0, Math.min(age, this.span));
    let newer = this.head * 7, older = newer;
    for (let n = 1; n < this.count && this.data[older] > wanted; n++) {
      newer = older; older = ((this.head - n + this.capacity) % this.capacity) * 7;
    }
    const interval = this.data[newer] - this.data[older];
    const t = interval > 0 ? (wanted - this.data[older]) / interval : 0;
    const offset = 1 + side * 3;
    const mix = k => this.data[older+k] + (this.data[newer+k] - this.data[older+k]) * t;
    out.x = mix(offset); out.y = mix(offset+1);
    out.z = mix(offset+2) + this.distance - wanted;
    return true;
  }
}
