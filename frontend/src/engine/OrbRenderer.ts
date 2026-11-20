/**
 * OrbRenderer — the Apprentice's presence in the console.
 * A small, single-object three.js renderer using the shared signal-core shader.
 * No post-processing (the glow is a CSS halo behind the canvas) so it stays
 * cheap enough to run next to screen capture and the voice SDK.
 */
import * as THREE from "three";
import { CORE_FRAG, CORE_VERT } from "./coreShader";

export type OrbState = "offline" | "connecting" | "listening" | "speaking" | "alert" | "error";

/** Target look per state. energy drives displacement + rim brightness; speed drives noise flow. */
const LOOK: Record<OrbState, { color: string; energy: number; speed: number; scale: number }> = {
  offline: { color: "#6b6f60", energy: 0.0, speed: 0.25, scale: 0.86 },
  connecting: { color: "#c8f65a", energy: 0.25, speed: 0.9, scale: 0.9 },
  listening: { color: "#c8f65a", energy: 0.35, speed: 0.6, scale: 0.95 },
  speaking: { color: "#c8f65a", energy: 0.75, speed: 1.6, scale: 1.0 },
  alert: { color: "#ff5d52", energy: 0.65, speed: 1.2, scale: 1.0 },
  error: { color: "#7a7a80", energy: 0.05, speed: 0.15, scale: 0.84 },
};

export class OrbRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  private mesh: THREE.Mesh;
  private uniforms = { uTime: { value: 0 }, uEnergy: { value: 0 }, uColor: { value: new THREE.Color(LOOK.offline.color) } };
  private target = LOOK.offline;
  private targetColor = new THREE.Color(LOOK.offline.color);
  private raf = 0;
  private last = 0;
  private running = false;
  private visible = true;
  private disposed = false;
  private io: IntersectionObserver;
  private ro: ResizeObserver;

  constructor(private host: HTMLElement, private reducedMotion = false) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    const gl = this.renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software/i.test(gpu)) {
      this.renderer.dispose();
      throw new Error("Software WebGL; using CSS orb");
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const c = this.renderer.domElement;
    c.style.width = "100%";
    c.style.height = "100%";
    c.style.display = "block";
    host.appendChild(c);
    c.addEventListener("webglcontextlost", this.onLost);

    this.camera.position.set(0, 0, 4.4);
    this.mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 40),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: CORE_VERT, fragmentShader: CORE_FRAG }),
    );
    this.scene.add(this.mesh);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    // Pause while the pane is hidden (mobile tabs) or scrolled away.
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.start();
      else this.stop();
    });
    this.io.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize();
    this.start();
  }

  setState(state: OrbState) {
    this.target = LOOK[state];
    this.targetColor.set(this.target.color);
    if (this.reducedMotion) this.frame(1);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.stop();
  };

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else if (this.visible) this.start();
  };

  private resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.frame(1);
  }

  private start() {
    if (this.running || this.disposed || !this.visible) return;
    if (this.reducedMotion) {
      this.frame(1);
      return;
    }
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** dt = 1 snaps damped values to their targets (static render). */
  private frame(dt: number) {
    if (this.disposed) return;
    const t = this.target;
    const u = this.uniforms;
    if (!this.reducedMotion) u.uTime.value += dt * t.speed;
    // Speaking gets a syllable-like flutter on top of its base energy.
    const flutter = t === LOOK.speaking && !this.reducedMotion ? 0.25 * Math.abs(Math.sin(u.uTime.value * 5.3) * Math.sin(u.uTime.value * 2.1)) : 0;
    u.uEnergy.value = THREE.MathUtils.damp(u.uEnergy.value, t.energy + flutter, 6, dt);
    u.uColor.value.lerp(this.targetColor, 1 - Math.exp(-5 * dt));
    const breathe = this.reducedMotion ? 0 : Math.sin(performance.now() / 1000 * 1.6) * 0.015;
    this.mesh.scale.setScalar(THREE.MathUtils.damp(this.mesh.scale.x, t.scale + breathe, 5, dt));
    this.mesh.rotation.y += dt * 0.25;
    this.renderer.render(this.scene, this.camera);
  }
}
