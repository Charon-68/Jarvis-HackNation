/**
 * ApprenticeCore — framework-agnostic Three.js scene for the landing page.
 *
 * A glowing "signal" core (the Apprentice) surrounded by smoked-glass shards.
 * Scroll progress (0..1) morphs the shards through four formations that tell
 * the product story:
 *   0.00  orbit    — shards circle the core (hero)
 *   0.33  capture  — shards spread out like screen fragments being observed
 *   0.66  map      — shards lock into a connected graph (the Work Map);
 *                    guardrail nodes glow red
 *   1.00  teach    — shards condense into one crystal around the core
 *
 * Techniques (smoked iridescent glass + pointer glow, bloom on rims, instanced
 * motes, damped motion) were studied from the Facet / Shipcraft references and
 * re-implemented here; no template code or assets are copied.
 *
 * Tuned constants live in TUNING. Change them deliberately.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CORE_FRAG, CORE_VERT } from "./coreShader";

export type Quality = "high" | "low";

export interface CoreOptions {
  quality?: Quality;
  reducedMotion?: boolean;
  /** Called every rendered frame with screen positions of the tagged shards. */
  onFrame?: (anchors: Array<{ x: number; y: number; visible: boolean }>) => void;
}

const TUNING = {
  signal: new THREE.Color("#C8F65A"),
  stop: new THREE.Color("#FF5D52"),
  shardCount: 14,
  /** Shards whose screen position is reported for HUD tags (capture beat). */
  taggedShards: [2, 6, 10],
  /** Shards rendered as guardrail nodes in the map formation. */
  guardrailShards: [10, 11],
  bloom: { strength: 0.42, radius: 0.55, threshold: 0.7 },
  envIntensity: 0.45,
  cameraZ: 11,
  fov: 34,
  damp: 4.2,
  pointerParallax: 0.45,
} as const;

/** Edges of the Work Map graph formation (indices into shards). */
const MAP_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [2, 8], [8, 9], [3, 10], [6, 11], [4, 12], [7, 13], [9, 12],
];

// ---------------------------------------------------------------------------

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shardGeometry(rand: () => number): THREE.BufferGeometry {
  const sides = 5 + Math.floor(rand() * 3);
  const radius = 0.55 + rand() * 0.35;
  const shape = new THREE.Shape();
  const angles = Array.from({ length: sides }, (_, i) => (i / sides) * Math.PI * 2 + (rand() - 0.5) * 0.7).sort(
    (a, b) => a - b,
  );
  angles.forEach((a, i) => {
    const r = radius * (0.7 + rand() * 0.3);
    const x = Math.cos(a) * r * 1.25;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

interface Pose {
  p: THREE.Vector3;
  r: THREE.Euler;
  s: number;
}

function buildFormations(n: number, rand: () => number): Pose[][] {
  const orbit: Pose[] = [];
  const capture: Pose[] = [];
  const map: Pose[] = [];
  const teach: Pose[] = [];

  // Work Map layout: 5 columns, nodes spread vertically.
  const cols = [[0], [1, 5], [2, 6, 8], [3, 7, 9, 11], [4, 10, 12, 13]];
  const mapPos: THREE.Vector3[] = [];
  cols.forEach((col, ci) => {
    col.forEach((idx, ri) => {
      const y = (ri - (col.length - 1) / 2) * 1.55;
      mapPos[idx] = new THREE.Vector3(1.0 + (ci - 2) * 1.3, y * 0.8, (rand() - 0.5) * 0.4);
    });
  });

  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    orbit.push({
      p: new THREE.Vector3(Math.cos(a) * 3.0, Math.sin(a * 2) * 0.8 + (rand() - 0.5) * 0.6, Math.sin(a) * 2.2),
      r: new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI),
      s: 0.75 + rand() * 0.45,
    });

    const row = i % 2;
    const col = Math.floor(i / 2);
    capture.push({
      p: new THREE.Vector3(1.8 + (col - 3) * 1.0 + (rand() - 0.5) * 0.25, (row ? -1.15 : 1.15) + (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.9),
      r: new THREE.Euler((rand() - 0.5) * 0.35, (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.25),
      s: 0.6,
    });

    map.push({ p: mapPos[i], r: new THREE.Euler(0, 0, (rand() - 0.5) * 0.2), s: 0.55 });

    // Fibonacci sphere for the condensed crystal
    const k = i + 0.5;
    const phi = Math.acos(1 - (2 * k) / n);
    const theta = Math.PI * (1 + Math.sqrt(5)) * k;
    const dir = new THREE.Vector3(Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    teach.push({ p: dir.multiplyScalar(1.15).add(new THREE.Vector3(1.6, 0, 0)), r: new THREE.Euler().setFromQuaternion(q), s: 0.7 });
  }
  return [orbit, capture, map, teach];
}

// ---------------------------------------------------------------------------

export class ApprenticeCore {
  readonly quality: Quality;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private root = new THREE.Group();
  private shards: THREE.Mesh[] = [];
  private formations: Pose[][];
  private core: THREE.Mesh;
  private coreUniforms = { uTime: { value: 0 }, uEnergy: { value: 0 }, uColor: { value: TUNING.signal.clone() } };
  private rings: THREE.Mesh[] = [];
  private motes: THREE.InstancedMesh;
  private lines: THREE.LineSegments;
  private guardMat: THREE.MeshPhysicalMaterial;
  private glowUniforms = { uPointer: { value: new THREE.Vector3() }, uPointerStrength: { value: 0 } };
  private lastTime = 0;
  private raf = 0;
  private running = false;
  private disposed = false;
  private contextLost = false;
  private progress = 0;
  private shatter = 0; // 0..1 launch transition
  private pointer = new THREE.Vector2();
  private pointerTarget = new THREE.Vector2();
  private shardState: Array<{ p: THREE.Vector3; q: THREE.Quaternion; s: number; v: THREE.Vector3; spin: THREE.Vector3 }>;
  private resizeObs: ResizeObserver;
  private opts: CoreOptions;

  /** Throws if WebGL is unavailable or software-rendered (caller shows the CSS fallback). */
  constructor(private container: HTMLElement, opts: CoreOptions = {}) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    const gl = this.renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software/i.test(gpu)) {
      this.renderer.forceContextLoss();
      this.renderer.dispose();
      throw new Error(`Software WebGL (${gpu}); using fallback`);
    }
    this.quality = opts.quality ?? (window.devicePixelRatio > 1 && navigator.hardwareConcurrency >= 6 ? "high" : "low");

    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === "high" ? 2 : 1.25));
    r.setClearColor(0x000000, 0);
    r.domElement.style.display = "block";
    r.domElement.style.width = "100%";
    r.domElement.style.height = "100%";
    container.appendChild(r.domElement);
    r.domElement.addEventListener("webglcontextlost", this.onContextLost);
    r.domElement.addEventListener("webglcontextrestored", this.onContextRestored);

    this.camera = new THREE.PerspectiveCamera(TUNING.fov, 1, 0.1, 100);
    this.camera.position.set(0, 0, TUNING.cameraZ);

    const pmrem = new THREE.PMREMGenerator(r);
    const env = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(env, 0.04).texture;
    this.scene.environmentIntensity = TUNING.envIntensity;
    env.dispose();
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xe8f0ff, 2.2);
    key.position.set(4, 6, 8);
    const rim = new THREE.DirectionalLight(0xc8f65a, 0.6);
    rim.position.set(-6, -2, -4);
    const hemi = new THREE.HemisphereLight(0xb8c8ff, 0x0b0b10, 0.45);
    const coreLight = new THREE.PointLight(0xc8f65a, 6, 9, 1.6);
    this.scene.add(key, rim, hemi, this.root);
    this.root.add(coreLight);

    // Core
    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, this.quality === "high" ? 48 : 24),
      new THREE.ShaderMaterial({ uniforms: this.coreUniforms, vertexShader: CORE_VERT, fragmentShader: CORE_FRAG }),
    );
    this.root.add(this.core);

    // Rings
    for (const [radius, tube, tilt] of [
      [1.75, 0.008, 1.1],
      [2.25, 0.005, -0.7],
    ] as const) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 160),
        new THREE.MeshBasicMaterial({ color: TUNING.signal, transparent: true, opacity: 0.55 }),
      );
      ring.rotation.x = tilt;
      this.rings.push(ring);
      this.root.add(ring);
    }

    // Shards
    const rand = seeded(7);
    const glass = this.glassMaterial();
    this.guardMat = this.glassMaterial();
    // Darker red body so guardrail nodes read as "stop", not salmon, under bloom.
    this.guardMat.color = new THREE.Color(0x2a0d0b);
    this.guardMat.iridescence = 0.25;
    this.guardMat.emissive = TUNING.stop.clone();
    this.guardMat.emissiveIntensity = 0;
    for (let i = 0; i < TUNING.shardCount; i++) {
      const isGuard = (TUNING.guardrailShards as readonly number[]).includes(i);
      const m = new THREE.Mesh(shardGeometry(rand), isGuard ? this.guardMat : glass);
      this.shards.push(m);
      this.root.add(m);
    }
    this.formations = buildFormations(TUNING.shardCount, rand);
    this.shardState = this.formations[0].map((pose) => ({
      p: pose.p.clone(),
      q: new THREE.Quaternion().setFromEuler(pose.r),
      s: pose.s,
      v: new THREE.Vector3(),
      spin: new THREE.Vector3((rand() - 0.5) * 6, (rand() - 0.5) * 6, (rand() - 0.5) * 6),
    }));

    // Work Map edges
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAP_EDGES.length * 6), 3));
    this.lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: TUNING.signal, transparent: true, opacity: 0 }),
    );
    this.root.add(this.lines);

    // Motes
    const moteCount = this.quality === "high" ? 260 : 110;
    this.motes = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.028, 0),
      new THREE.MeshStandardMaterial({ color: 0xdfe6d0, emissive: TUNING.signal, emissiveIntensity: 0.35, roughness: 0.4 }),
      moteCount,
    );
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < moteCount; i++) {
      const d = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(4 + rand() * 7);
      m4.makeRotationFromEuler(new THREE.Euler(rand() * 6, rand() * 6, 0));
      // Keep motes behind z = 2.5 so none sit near the camera (bloom turns them into glare).
      m4.setPosition(d.x * 1.4, d.y * 0.8, Math.min(d.z - 2, 2.5));
      this.motes.setMatrixAt(i, m4);
    }
    this.scene.add(this.motes);

    if (this.quality === "high") {
      this.composer = new EffectComposer(r);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const { strength, radius, threshold } = TUNING.bloom;
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), strength, radius, threshold));
      this.composer.addPass(new OutputPass());
    }

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.start();
  }

  // ----- public API --------------------------------------------------------

  /** Scroll-story progress, 0 (hero) .. 1 (teach). */
  setProgress(p: number) {
    this.progress = THREE.MathUtils.clamp(p, 0, 1);
    if (this.opts.reducedMotion) this.renderOnce();
  }

  /** Launch transition: shards burst outward. Resolves after `ms` (timer-based, not rAF). */
  launch(ms = 700): Promise<void> {
    if (this.opts.reducedMotion) return Promise.resolve();
    this.shardState.forEach((st) => {
      st.v.copy(st.p).sub(new THREE.Vector3(1.6, 0, 0)).normalize().multiplyScalar(9 + Math.random() * 6);
      st.v.z += 6;
    });
    this.shatter = 0.0001;
    return new Promise((res) => setTimeout(res, ms));
  }

  setPaused(paused: boolean) {
    if (paused) this.stop();
    else this.start();
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.resizeObs.disconnect();
    window.removeEventListener("pointermove", this.onPointer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.scene.environment?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    // Release the GL context now; browsers cap live contexts (~16).
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ----- internals ---------------------------------------------------------

  private glassMaterial() {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x16171b,
      // Slightly rough clearcoat: mirror-sharp reflections of the RoomEnvironment's
      // light panels became HDR hot spots that bloom turned into glare.
      roughness: 0.34,
      metalness: 0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.22,
      specularIntensity: 0.6,
      iridescence: 0.6,
      iridescenceIOR: 1.3,
      iridescenceThicknessMinimum: 240,
      iridescenceThicknessMaximum: 660,
      envMapIntensity: 1.1,
    });
    mat.customProgramCacheKey = () => "apprentice-glass-v1";
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPointer = this.glowUniforms.uPointer;
      shader.uniforms.uPointerStrength = this.glowUniforms.uPointerStrength;
      shader.vertexShader =
        "varying vec3 vWorldPos;\n" +
        shader.vertexShader.replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\n vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
      shader.fragmentShader =
        "uniform vec3 uPointer;\nuniform float uPointerStrength;\nvarying vec3 vWorldPos;\n" +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           float d = distance(vWorldPos.xy, uPointer.xy) / 2.2;
           totalEmissiveRadiance += vec3(0.78, 0.96, 0.35) * 0.22 * exp(-1.8 * d * d) * uPointerStrength;`,
        );
    };
    return mat;
  }

  private onPointer = (e: PointerEvent) => {
    this.pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    this.glowUniforms.uPointerStrength.value = 1;
    if (this.opts.reducedMotion) this.renderOnce();
  };

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else if (!this.disposed) this.start();
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.stop();
  };

  private onContextRestored = () => {
    this.contextLost = false;
    this.start();
  };

  private resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    // Pull back on narrow (portrait) screens so formations still fit.
    this.camera.position.z = TUNING.cameraZ * (this.camera.aspect < 1 ? 1.55 : 1);
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderOnce();
  }

  private start() {
    if (this.running || this.disposed || this.contextLost) return;
    if (this.opts.reducedMotion) {
      this.renderOnce();
      return;
    }
    this.running = true;
    this.lastTime = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private renderOnce() {
    if (this.disposed || this.contextLost) return;
    this.tick(1); // dt=1 snaps damped values to their targets
  }

  private tick(dt: number) {
    const t = (this.coreUniforms.uTime.value += this.opts.reducedMotion ? 0 : dt);
    const k = TUNING.damp;
    const motion = this.opts.reducedMotion ? 0 : 1;

    this.pointer.x = THREE.MathUtils.damp(this.pointer.x, this.pointerTarget.x, 3, dt);
    this.pointer.y = THREE.MathUtils.damp(this.pointer.y, this.pointerTarget.y, 3, dt);
    this.glowUniforms.uPointerStrength.value = THREE.MathUtils.damp(this.glowUniforms.uPointerStrength.value, 0.35, 0.8, dt);
    this.glowUniforms.uPointer.value.set(this.pointer.x * 6, this.pointer.y * 3.5, 0);

    // Stage blend
    const s = this.progress * 3;
    const i0 = Math.min(Math.floor(s), 2);
    const f = smooth(THREE.MathUtils.clamp(s - i0, 0, 1));
    const A = this.formations[i0];
    const B = this.formations[i0 + 1];
    const mapW = Math.max(0, 1 - Math.abs(s - 2)); // peaks at the map beat
    const orbitW = Math.max(0, 1 - s);
    const teachW = Math.max(0, s - 2);

    // Core drifts to the right of the copy column after the hero.
    this.core.position.x = 1.6;
    const coreScale = 1 - 0.45 * Math.min(1, s) * (1 - teachW) + 0.15 * teachW;
    this.core.scale.setScalar(THREE.MathUtils.damp(this.core.scale.x, coreScale, k, dt));
    this.coreUniforms.uEnergy.value = THREE.MathUtils.damp(this.coreUniforms.uEnergy.value, 0.25 + 0.6 * teachW + 0.15 * orbitW, 2, dt);
    this.rings.forEach((ring, i) => {
      ring.position.copy(this.core.position);
      ring.rotation.z += dt * (i ? -0.12 : 0.18) * motion;
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.5 * (orbitW + teachW) + 0.05, k, dt);
    });

    const tmpP = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    this.shards.forEach((mesh, i) => {
      const st = this.shardState[i];
      if (this.shatter > 0) {
        st.p.addScaledVector(st.v, dt);
        mesh.rotation.x += st.spin.x * dt;
        mesh.rotation.y += st.spin.y * dt;
        mesh.position.copy(st.p);
        return;
      }
      tmpP.lerpVectors(A[i].p, B[i].p, f);
      // Orbit beat: shards circle the core.
      if (orbitW > 0) {
        const ang = t * 0.12 * motion;
        const x = tmpP.x, z = tmpP.z;
        tmpP.x = THREE.MathUtils.lerp(x, x * Math.cos(ang) - z * Math.sin(ang), orbitW);
        tmpP.z = THREE.MathUtils.lerp(z, x * Math.sin(ang) + z * Math.cos(ang), orbitW);
        tmpP.x += 1.6 * orbitW;
      }
      tmpP.y += Math.sin(t * 0.8 + i * 1.7) * 0.08 * motion;

      qa.setFromEuler(A[i].r);
      qb.setFromEuler(B[i].r);
      tmpQ.slerpQuaternions(qa, qb, f);
      if (orbitW > 0) tmpQ.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(t * 0.2 * motion, t * 0.15 * motion, 0)));

      const scale = THREE.MathUtils.lerp(A[i].s, B[i].s, f);
      const a = 1 - Math.exp(-k * dt);
      st.p.lerp(tmpP, a);
      st.q.slerp(tmpQ, a);
      st.s += (scale - st.s) * a;
      mesh.position.copy(st.p);
      mesh.quaternion.copy(st.q);
      mesh.scale.setScalar(st.s);
    });
    this.guardMat.emissiveIntensity = THREE.MathUtils.damp(this.guardMat.emissiveIntensity, mapW * 0.45, k, dt);

    // Edges follow shard positions.
    const pos = this.lines.geometry.getAttribute("position") as THREE.BufferAttribute;
    MAP_EDGES.forEach(([a, b], e) => {
      const pa = this.shards[a].position, pb = this.shards[b].position;
      pos.setXYZ(e * 2, pa.x, pa.y, pa.z);
      pos.setXYZ(e * 2 + 1, pb.x, pb.y, pb.z);
    });
    pos.needsUpdate = true;
    const lm = this.lines.material as THREE.LineBasicMaterial;
    lm.opacity = THREE.MathUtils.damp(lm.opacity, mapW * 0.75 * (this.shatter > 0 ? 0 : 1), k, dt);

    this.motes.rotation.y += dt * 0.02 * motion;

    // Camera: pointer parallax, push in during launch.
    if (this.shatter > 0) this.shatter = Math.min(1, this.shatter + dt * 1.6);
    const camZ = (this.camera.aspect < 1 ? 1.55 : 1) * TUNING.cameraZ - this.shatter * 5;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.pointer.x * TUNING.pointerParallax * motion, 3, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.pointer.y * TUNING.pointerParallax * 0.6 * motion, 3, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 3, dt);
    // Wide screens: core sits at ~65% of the width, clear of the copy column.
    this.camera.lookAt(this.camera.aspect < 1 ? 1.6 : -0.5, this.camera.aspect < 1 ? -1.7 : 0, 0);

    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);

    if (this.opts.onFrame) {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      const v = new THREE.Vector3();
      this.opts.onFrame(
        TUNING.taggedShards.map((idx) => {
          v.copy(this.shards[idx].position).project(this.camera);
          return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 && this.shatter === 0 };
        }),
      );
    }
  }
}
