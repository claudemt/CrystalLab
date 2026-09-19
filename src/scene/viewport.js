import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from '../app/state.js';

// 雾密度必须随场景尺度反向缩放：固定密度在实空间（包围球半径 ~1.8）几乎不可见，
// 但倒空间半径 ~33、相机距离 ~128，1-exp(-(0.026·109)²) ≈ 100%，整个场景被雾抹平。
// 以实空间观感为基准，任何尺度下雾的浓度一致（同 docs/design-system.md「3D scale」）。
const FOG_BASE_DENSITY = 0.026;
const FOG_BASE_RADIUS = 1.8;

export class Viewport3D {
  constructor(element) {
    this.el = element;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x090b0d, FOG_BASE_DENSITY);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    element.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.minDistance = 0.65;
    this.controls.maxDistance = 14;

    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.scene.add(new THREE.HemisphereLight(0xe7e7e2, 0x151719, 0.92));
    const key = new THREE.DirectionalLight(0xf2f0e9, 1.45);
    key.position.set(4, 5, 6);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xaeb4b6, 0.34);
    fill.position.set(-4, 3, 2);
    this.scene.add(fill);

    this.lastFrameKey = '';
    this.fitRadius = 1;
    this.resetCamera();
    new ResizeObserver(() => this.resize()).observe(element);
    this.resize();
  }

  resetCamera() {
    this.camera.position.set(2.6, 2.1, 2.85);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  resize() {
    const width = this.el.clientWidth;
    const height = this.el.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  clear() {
    while (this.dynamic.children.length) disposeObject(this.dynamic.children.pop());
  }

  bounds() {
    this.dynamic.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    this.dynamic.traverse(object => {
      if (object.isSprite || object.userData?.frameExclude) return;
      if (object.isInstancedMesh) {
        object.computeBoundingBox?.();
        if (object.boundingBox) {
          tmp.copy(object.boundingBox).applyMatrix4(object.matrixWorld);
          box.union(tmp);
        }
        return;
      }
      if ((object.isMesh || object.isLine || object.isLineSegments) && object.geometry) {
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        if (object.geometry.boundingBox) {
          tmp.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
          box.union(tmp);
        }
      }
    });
    return box;
  }

  center() {
    const box = this.bounds();
    return box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  }

  // 按包围盒 8 个角点在相机平面上的投影定距离。比外接球紧：球半径是半对角线，
  // 对稀疏点云会白白把四周让出来，视图显得偏小。
  fitDistance(box, center, direction, spaceView) {
    const tanY = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const tanX = tanY * Math.max(0.2, this.camera.aspect);
    const zAxis = direction.clone().negate();
    const upRef = Math.abs(this.camera.up.dot(zAxis)) > 0.98 ? new THREE.Vector3(0, 0, 1) : this.camera.up.clone();
    const xAxis = new THREE.Vector3().crossVectors(upRef, zAxis).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    const corner = new THREE.Vector3();
    let distance = 0;
    for (let i = 0; i < 8; i++) {
      corner.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z
      ).sub(center);
      const depth = corner.dot(zAxis);
      distance = Math.max(distance,
        Math.abs(corner.dot(yAxis)) / tanY - depth,
        Math.abs(corner.dot(xAxis)) / tanX - depth);
    }
    return Math.max(distance * (spaceView === 'overlay' ? 1.16 : 1.12), 0.25);
  }

  frame(frameKey, spaceView, { force = false, box = null } = {}) {
    const bounds = box && !box.isEmpty() ? box : this.bounds();
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const oldOffset = this.camera.position.clone().sub(this.controls.target);
    const direction = oldOffset.lengthSq() > 1e-8 ? oldOffset.normalize() : new THREE.Vector3(1, 1, 1).normalize();
    const fit = force || frameKey !== this.lastFrameKey;

    if (fit) {
      const radius = Math.max(0.32, bounds.getBoundingSphere(new THREE.Sphere()).radius);
      this.fitRadius = radius;
      if (this.scene.fog) this.scene.fog.density = FOG_BASE_DENSITY * FOG_BASE_RADIUS / radius;
      const distance = this.fitDistance(bounds, center, direction, spaceView);
      this.camera.position.copy(center).addScaledVector(direction, distance);
      this.controls.target.copy(center);
      this.controls.minDistance = Math.max(0.08, radius * 0.16);
      this.controls.maxDistance = Math.max(distance * 7, radius * 18);
    } else {
      const offset = this.camera.position.clone().sub(this.controls.target);
      this.controls.target.copy(center);
      this.camera.position.copy(center).add(offset);
    }

    this.lastFrameKey = frameKey;
    this.controls.update();
  }

  // 近/远裁剪面必须每帧跟着相机走。只在取景时算一次的话，near = d - 2.4R 会远大于
  // 用户放大后的相机距离，晶胞和中心原子直接被裁掉（放大后「丢元素」的根因）。
  updateClipPlanes() {
    const radius = this.fitRadius;
    const distance = this.camera.position.distanceTo(this.controls.target);
    const near = Math.max(radius * 0.002, (distance - radius) * 0.5);
    const far = (distance + radius) * 2.5;
    if (near === this.camera.near && far === this.camera.far) return;
    this.camera.near = near;
    this.camera.far = Math.max(far, near * 1000);
    this.camera.updateProjectionMatrix();
  }

  setViewDirection(direction, distance = null) {
    const dir = direction.clone().normalize();
    if (dir.lengthSq() < 1e-12) return;
    const center = this.center();
    if (distance === null) distance = Math.max(0.5, this.camera.position.distanceTo(this.controls.target));
    const z = new THREE.Vector3(0, 0, 1);
    const y = new THREE.Vector3(0, 1, 0);
    this.camera.up.copy(Math.abs(dir.dot(z)) < 0.92 ? z : y);
    this.camera.position.copy(center).addScaledVector(dir, distance);
    this.controls.target.copy(center);
    this.controls.update();
  }

  updateLabelVisibility() {
    const labels = [];
    this.dynamic.traverse(object => {
      if (object.userData?.kind === 'klabel') labels.push(object);
    });
    if (!labels.length) return;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const placed = [];
    labels.sort((a, b) => (a.userData.priority ?? 1) - (b.userData.priority ?? 1));
    for (const label of labels) {
      label.visible = true;
      label.updateWorldMatrix(true, false);
      const center = new THREE.Vector3().setFromMatrixPosition(label.matrixWorld);
      const ndc = center.clone().project(this.camera);
      if (ndc.z < -1 || ndc.z > 1) {
        label.visible = false;
        continue;
      }
      const scale = new THREE.Vector3();
      label.getWorldScale(scale);
      const rightEdge = center.clone().addScaledVector(right, Math.max(scale.x, 0.02) * 0.52).project(this.camera);
      const upperEdge = center.clone().addScaledVector(up, Math.max(scale.y, 0.02) * 0.58).project(this.camera);
      const halfW = Math.max(0.018, Math.abs(rightEdge.x - ndc.x));
      const halfH = Math.max(0.018, Math.abs(upperEdge.y - ndc.y));
      const rect = { l: ndc.x - halfW, r: ndc.x + halfW, b: ndc.y - halfH, t: ndc.y + halfH };
      const overlaps = placed.some(p => !(rect.r < p.l - 0.008 || rect.l > p.r + 0.008 || rect.t < p.b - 0.008 || rect.b > p.t + 0.008));
      label.visible = !overlaps;
      if (!overlaps) placed.push(rect);
    }
  }

  updateSymmetryAnimation(time = 0) {
    this.dynamic.traverse(group => {
      const animation = group.userData?.symmetryAnimation;
      if (!animation?.marker || animation.done) return;
      if (animation.startedAt === null) animation.startedAt = time;
      const raw = THREE.MathUtils.clamp((time - animation.startedAt) / animation.duration, 0, 1);
      const t = raw < 0.5 ? 4 * raw ** 3 : 1 - ((-2 * raw + 2) ** 3) / 2;
      if (animation.kind === 'rotation') {
        const q = new THREE.Quaternion().setFromAxisAngle(animation.axis, animation.angle * t);
        animation.marker.position.copy(animation.start).applyQuaternion(q);
      } else if (animation.kind === 'identity') {
        animation.marker.position.copy(animation.start);
        animation.marker.scale.setScalar(1 + 0.16 * Math.sin(Math.PI * raw));
      } else {
        animation.marker.position.copy(animation.start).lerp(animation.end, t);
      }
      if (raw >= 1) {
        animation.done = true;
        animation.marker.position.copy(animation.end);
        animation.marker.scale.setScalar(1);
      }
    });
  }

  render(time = 0) {
    this.controls.autoRotate = state.autoRotate;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.update();
    this.updateClipPlanes();
    this.updateSymmetryAnimation(time);
    this.updateLabelVisibility();
    this.renderer.render(this.scene, this.camera);
  }
}

function disposeObject(object) {
  object?.traverse?.(item => {
    item.geometry?.dispose?.();
    const materials = Array.isArray(item.material) ? item.material : item.material ? [item.material] : [];
    for (const material of materials) {
      material.map?.dispose?.();
      material.dispose?.();
    }
    item.userData?.texture?.dispose?.();
  });
}
