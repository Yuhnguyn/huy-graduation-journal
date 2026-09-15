import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

function createLeatherTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  const image = context.createImageData(256, 256);

  for (let i = 0; i < image.data.length; i += 4) {
    const grain = 105 + Math.random() * 28;
    image.data[i] = grain;
    image.data[i + 1] = grain * 0.58;
    image.data[i + 2] = grain * 0.31;
    image.data[i + 3] = 255;
  }

  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.18;
  for (let i = 0; i < 260; i += 1) {
    context.strokeStyle = Math.random() > 0.5 ? "#f0c28c" : "#2d1308";
    context.lineWidth = Math.random() * 0.8 + 0.25;
    context.beginPath();
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    context.moveTo(x, y);
    context.quadraticCurveTo(x + Math.random() * 18 - 9, y + Math.random() * 12, x + Math.random() * 22 - 11, y + Math.random() * 28);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.2, 1.5);
  texture.anisotropy = 4;
  return texture;
}

function rectangleLine(width, height, material) {
  const points = [
    new THREE.Vector3(-width / 2, -height / 2, 0),
    new THREE.Vector3(width / 2, -height / 2, 0),
    new THREE.Vector3(width / 2, height / 2, 0),
    new THREE.Vector3(-width / 2, height / 2, 0),
    new THREE.Vector3(-width / 2, -height / 2, 0),
  ];
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export class BookScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.progress = 0;
    this.pointer = new THREE.Vector2();
    this.pointerTarget = new THREE.Vector2();
    this.reducedMotion = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 0.35, 14.2);

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.timer = new THREE.Timer();
    this.buildLighting();
    this.buildBook();
    this.resize();
    this.animate();
  }

  buildLighting() {
    this.scene.add(new THREE.HemisphereLight(0xffe3ba, 0x29150e, 1.35));

    const key = new THREE.DirectionalLight(0xffd59b, 4.1);
    key.position.set(-5, 7, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    const fill = new THREE.PointLight(0x89a6c7, 1.6, 30);
    fill.position.set(7, 1, 7);
    this.scene.add(fill);

    const rim = new THREE.SpotLight(0xe4a953, 2.4, 30, Math.PI / 5, 0.65, 1.4);
    rim.position.set(0, 8, -2);
    rim.target.position.set(0, 0, 0);
    this.scene.add(rim, rim.target);
  }

  buildBook() {
    const leatherMap = createLeatherTexture();
    const leather = new THREE.MeshStandardMaterial({ color: 0x7b4324, map: leatherMap, bumpMap: leatherMap, bumpScale: 0.055, roughness: 0.76, metalness: 0.02 });
    const leatherEdge = new THREE.MeshStandardMaterial({ color: 0x3a1b0d, roughness: 0.88 });
    const suede = new THREE.MeshStandardMaterial({ color: 0x4b2a1a, roughness: 1, side: THREE.DoubleSide });
    const paper = new THREE.MeshStandardMaterial({ color: 0xfff6dd, roughness: 0.94 });
    const paperEdge = new THREE.MeshStandardMaterial({ color: 0xd7c7a8, roughness: 0.96 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd7a642, metalness: 0.82, roughness: 0.3 });
    const brassDark = new THREE.MeshStandardMaterial({ color: 0x49301a, metalness: 0.62, roughness: 0.38 });
    const bandMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2413, roughness: 0.84, transparent: true });

    this.book = new THREE.Group();
    this.book.rotation.x = -0.08;
    this.scene.add(this.book);

    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(28, 20), new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.4 }));
    shadowPlane.position.z = -0.72;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    const pageBlock = new THREE.Mesh(new RoundedBoxGeometry(10.15, 6.28, 0.23, 5, 0.11), paperEdge);
    pageBlock.position.z = -0.02;
    pageBlock.castShadow = true;
    pageBlock.receiveShadow = true;
    this.book.add(pageBlock);

    this.paperSurfaceGeometry = new THREE.PlaneGeometry(9.88, 6.02, 36, 8);
    this.paperSurface = new THREE.Mesh(this.paperSurfaceGeometry, paper);
    this.paperSurface.position.z = 0.115;
    this.paperSurface.receiveShadow = true;
    this.book.add(this.paperSurface);
    this.paperBase = Float32Array.from(this.paperSurfaceGeometry.attributes.position.array);

    const gutter = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 5.9), new THREE.MeshBasicMaterial({ color: 0x5b4633, transparent: true, opacity: 0.26 }));
    gutter.position.z = 0.145;
    this.book.add(gutter);

    const stitchingMaterial = new THREE.LineDashedMaterial({ color: 0xd3a15d, dashSize: 0.11, gapSize: 0.09, transparent: true, opacity: 0.65 });

    const makeCover = (side) => {
      const pivot = new THREE.Group();
      pivot.position.x = side * 5.05;
      pivot.position.z = 0.3;

      const panel = new THREE.Mesh(new RoundedBoxGeometry(5.02, 6.35, 0.3, 5, 0.12), leatherEdge);
      panel.position.x = -side * 2.51;
      panel.castShadow = true;
      panel.receiveShadow = true;
      pivot.add(panel);

      const outer = new THREE.Mesh(new THREE.PlaneGeometry(4.86, 6.18), leather);
      outer.position.set(-side * 2.51, 0, 0.156);
      outer.receiveShadow = true;
      pivot.add(outer);

      const inner = new THREE.Mesh(new THREE.PlaneGeometry(4.86, 6.18), suede);
      inner.position.set(-side * 2.51, 0, -0.156);
      inner.rotation.y = Math.PI;
      inner.receiveShadow = true;
      pivot.add(inner);

      const stitch = rectangleLine(4.58, 5.88, stitchingMaterial);
      stitch.position.set(-side * 2.51, 0, 0.166);
      stitch.computeLineDistances();
      pivot.add(stitch);

      this.book.add(pivot);
      return pivot;
    };

    this.leftPivot = makeCover(-1);
    this.rightPivot = makeCover(1);

    this.bandMaterial = bandMaterial;
    this.band = new THREE.Mesh(new RoundedBoxGeometry(10.28, 0.2, 0.12, 4, 0.06), bandMaterial);
    this.band.position.z = 0.56;
    this.band.castShadow = true;
    this.book.add(this.band);

    this.medallion = new THREE.Group();
    this.medallion.position.z = 0.69;
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.15, 64), brass);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    const inset = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.17, 64), brassDark);
    inset.rotation.x = Math.PI / 2;
    this.medallion.add(coin, inset);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.025, 12, 64), brass);
    ring.position.z = 0.1;
    this.medallion.add(ring);
    this.book.add(this.medallion);
  }

  setProgress(value) {
    this.progress = clamp01(value);
    const release = smooth((this.progress - 0.08) / 0.17);
    const opening = smooth((this.progress - 0.22) / 0.52);
    const settle = Math.sin(clamp01((this.progress - 0.22) / 0.64) * Math.PI);

    this.leftPivot.rotation.y = opening * 1.93;
    this.rightPivot.rotation.y = -opening * 1.93;

    this.band.scale.x = 1 + release * 0.18;
    this.band.position.y = -release * 4.1;
    this.band.rotation.z = release * 0.08;
    this.bandMaterial.opacity = 1 - release;
    this.band.visible = release < 0.995;

    this.medallion.position.y = -release * 4.25;
    this.medallion.rotation.z = release * 0.25;
    this.medallion.scale.setScalar(1 + release * 0.08);
    this.medallion.visible = release < 0.995;

    this.camera.position.z = 14.2 - opening * 2.35;
    this.camera.position.y = 0.35 - opening * 0.28;
    this.book.rotation.x = -0.08 + opening * 0.08;

    const positions = this.paperSurfaceGeometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const offset = index * 3;
      const x = this.paperBase[offset];
      const y = this.paperBase[offset + 1];
      const centerLift = Math.sin(((x + 4.94) / 9.88) * Math.PI);
      const verticalFalloff = 0.75 + Math.cos((y / 6.02) * Math.PI) * 0.25;
      positions.setZ(index, centerLift * verticalFalloff * settle * 0.13);
    }
    positions.needsUpdate = true;
  }

  setPointer(x, y) {
    this.pointerTarget.set(x, y);
  }

  setReducedMotion(value) {
    this.reducedMotion = value;
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width <= 720;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.35 : 1.75));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = mobile ? 46 : 34;
    this.camera.updateProjectionMatrix();
    this.book.scale.setScalar(mobile ? Math.min(0.72, width / 520) : Math.min(1, width / 1180));
  }

  animate() {
    const tick = () => {
      this.timer.update();
      const delta = Math.min(this.timer.getDelta(), 0.05);
      const pointerStrength = this.reducedMotion ? 0 : 1 - smooth(this.progress / 0.36);
      this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-delta * 5.5));
      this.book.rotation.y = this.pointer.x * 0.055 * pointerStrength;
      this.book.rotation.x += ((-0.08 + smooth((this.progress - 0.22) / 0.52) * 0.08 + this.pointer.y * 0.035 * pointerStrength) - this.book.rotation.x) * (1 - Math.exp(-delta * 6));
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(tick);
    };
    tick();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.renderer.dispose();
  }
}
