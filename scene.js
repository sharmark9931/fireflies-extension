const canvas = document.getElementById("fireflyCanvas");
const grassLayer = document.getElementById("grassLayer");
const starsContainer = document.getElementById("stars");
const ctx = canvas.getContext("2d");

const GRASS_TOP_RATIO = 0.26;
const HOVER_RADIUS = 160;
const HOVER_RADIUS_SQ = HOVER_RADIUS * HOVER_RADIUS;
const IDLE_COUNT = 1280;
const MAX_FLIGHT_SPEED = 0.82;
const JITTER = 0.42;

const grassSmooth = new WeakMap();

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function isDarkTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

let width = 0;
let height = 0;
let dpr = 1;

const pointer = { x: 0, y: 0, inGrass: false };

let themeDark = true;

class Creature {
  constructor() {
    this.reset();
  }

  get kind() {
    return themeDark ? "firefly" : "butterfly";
  }

  reset() {
    this.x = Math.random() * width;
    const grassTop = height * GRASS_TOP_RATIO;
    const grassBottom = height * 0.985;
    const t = Math.pow(Math.random(), 0.4);
    this.y = grassTop + t * (grassBottom - grassTop);
    this.phase = Math.random() * Math.PI * 2;
    this.state = "idle";
    this.flightTime = 0;
    this.seed = Math.random() * 1000;
    this.smoothVx = undefined;
    this.smoothVy = undefined;
    this.aimAngle = -Math.PI / 2;

    if (this.kind === "firefly") {
      this.size = 0.6 + Math.random() * 1.4;
      this.hue = 88 + Math.random() * 35;
    } else {
      this.scale = 0.42 + Math.random() * 1.75;
      this.hue = 12 + Math.random() * 48;
      this.wingPhase = Math.random() * Math.PI * 2;
    }
  }

  tryLaunch(px, py) {
    if (this.state !== "idle") return;
    const dx = this.x - px;
    const dy = this.y - py;
    if (dx * dx + dy * dy <= HOVER_RADIUS_SQ) {
      this.state = "flying";
      this.flightTime = 0;
      this.vy = -(MAX_FLIGHT_SPEED + Math.random() * 0.35);
      this.vx = (Math.random() - 0.5) * 0.32;
      this.smoothVx = this.vx * 18;
      this.smoothVy = this.vy * 72;
    }
  }

  update(dt) {
    if (this.kind === "butterfly") {
      this.wingPhase += dt * (this.state === "idle" ? 2.8 : 11.5);
    }

    if (this.state === "idle") {
      this.phase += dt * (0.95 + Math.sin(this.seed) * 0.22);
      const drift =
        Math.sin(this.phase * 0.55) * 0.06 + Math.sin(this.phase * 0.31 + this.seed) * 0.04;
      this.x += drift;

      const targetAim = -Math.PI / 2 + Math.sin(this.phase * 0.38) * 0.07;
      this.aimAngle = lerp(this.aimAngle, targetAim, Math.min(1, dt * 5));
      return;
    }

    this.flightTime += dt;
    const t = this.flightTime;
    const smooth = Math.min(1, dt * 55);
    const targetVx =
      this.vx * 18 +
      Math.sin(t * 1.35 + this.seed) * JITTER * 14 +
      Math.sin(t * 2.2 + this.seed * 1.7) * 6;
    this.smoothVx = lerp(this.smoothVx ?? targetVx, targetVx, smooth);
    this.x += this.smoothVx * dt;

    const targetVy = this.vy * 72;
    this.smoothVy = lerp(this.smoothVy ?? targetVy, targetVy, smooth);
    this.y += this.smoothVy * dt;
    this.vy *= 0.9992;

    const dir = Math.atan2(this.smoothVy, this.smoothVx);
    this.aimAngle = lerp(this.aimAngle, dir, Math.min(1, dt * 9));

    const grassLine = height * GRASS_TOP_RATIO;
    const traveled = Math.max(0, grassLine - this.y);
    const pathLen = height * 0.68;
    const skyT = Math.min(1, traveled / pathLen);

    if (this.y < height * 0.03 || skyT > 0.985) {
      this.reset();
    }
  }

  getAlpha() {
    if (this.kind === "firefly") {
      const pulse = this.state === "idle" ? 0.45 + Math.sin(this.phase) * 0.25 : 1;
      let alpha = pulse;

      if (this.state === "flying") {
        const grassLine = height * GRASS_TOP_RATIO;
        const traveled = Math.max(0, grassLine - this.y);
        const pathLen = height * 0.68;
        const skyT = Math.min(1, traveled / pathLen);
        const fadeByHeight = 1 - smoothstep(0.48, 0.98, skyT);
        const fadeByTime = 1 - smoothstep(7.2, 22, this.flightTime);
        const softPulse = 0.92 + Math.sin(this.flightTime * 2.6 + this.seed) * 0.05;
        alpha = Math.min(1, fadeByHeight * fadeByTime) * softPulse;
      }
      return alpha;
    }

    const pulse = this.state === "idle" ? 0.52 + Math.sin(this.phase) * 0.18 : 1;
    let alpha = pulse;

    if (this.state === "flying") {
      const grassLine = height * GRASS_TOP_RATIO;
      const traveled = Math.max(0, grassLine - this.y);
      const pathLen = height * 0.68;
      const skyT = Math.min(1, traveled / pathLen);
      const fadeByHeight = 1 - smoothstep(0.48, 0.98, skyT);
      const fadeByTime = 1 - smoothstep(7.2, 22, this.flightTime);
      const softPulse = 0.94 + Math.sin(this.flightTime * 2.4 + this.seed) * 0.04;
      alpha = Math.min(1, fadeByHeight * fadeByTime) * softPulse;
    }
    return alpha;
  }

  drawFirefly() {
    const alpha = this.getAlpha();
    if (alpha <= 0.02) return;

    const r = this.size;
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 4);
    g.addColorStop(0, `hsla(${this.hue}, 95%, 72%, ${alpha})`);
    g.addColorStop(0.35, `hsla(${this.hue}, 80%, 50%, ${alpha * 0.45})`);
    g.addColorStop(1, `hsla(${this.hue}, 60%, 40%, 0)`);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawButterfly() {
    const alpha = this.getAlpha();
    if (alpha <= 0.02) return;

    const s = this.scale * 3.4;
    const flap =
      this.state === "idle"
        ? Math.sin(this.wingPhase) * 0.42
        : Math.sin(this.wingPhase) * 0.78;

    const x = this.x;
    const y = this.y;
    const ang = this.aimAngle;

    const wTop = `hsla(${this.hue}, 82%, 54%, ${alpha})`;
    const wBot = `hsla(${this.hue + 12}, 70%, 44%, ${alpha})`;
    const body = `rgba(42, 32, 24, ${alpha})`;
    const spot = `rgba(30, 22, 18, ${alpha * 0.55})`;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.globalAlpha = 1;

    ctx.fillStyle = wTop;
    ctx.strokeStyle = spot;
    ctx.lineWidth = 0.6;

    ctx.save();
    ctx.rotate(-flap);
    ctx.beginPath();
    ctx.ellipse(-s * 0.68, -s * 0.12, s * 0.78, s * 0.52, 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = wBot;
    ctx.beginPath();
    ctx.ellipse(-s * 0.58, s * 0.36, s * 0.52, s * 0.36, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.scale(-1, 1);
    ctx.rotate(-flap);
    ctx.fillStyle = wTop;
    ctx.beginPath();
    ctx.ellipse(-s * 0.68, -s * 0.12, s * 0.78, s * 0.52, 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = spot;
    ctx.stroke();
    ctx.fillStyle = wBot;
    ctx.beginPath();
    ctx.ellipse(-s * 0.58, s * 0.36, s * 0.52, s * 0.36, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.1, s * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(30, 22, 18, ${alpha * 0.65})`;
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, -s * 0.95);
    ctx.lineTo(-s * 0.18, -s * 1.12);
    ctx.moveTo(s * 0.06, -s * 0.95);
    ctx.lineTo(s * 0.18, -s * 1.12);
    ctx.stroke();

    ctx.restore();
  }

  draw() {
    if (this.kind === "firefly") {
      this.drawFirefly();
    } else {
      this.drawButterfly();
    }
  }
}

const creatures = [];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function buildStars() {
  starsContainer.innerHTML = "";
  if (!themeDark) return;

  const count = Math.floor((width * height) / 14000);
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "star";
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 38}%`;
    s.style.animationDelay = `${Math.random() * 4}s`;
    starsContainer.appendChild(s);
  }
}

function buildGrass() {
  grassLayer.innerHTML = "";
  const n = Math.min(520, Math.floor(width / 2.2) + 180);
  const opMin = themeDark ? 0.38 : 0.48;
  const opMax = themeDark ? 0.7 : 0.88;

  for (let i = 0; i < n; i++) {
    const b = document.createElement("div");
    b.className = "grass-blade";
    const left = (i / n) * 100 + (Math.random() - 0.5) * 1.15;
    const h = 16 + Math.random() * 46;
    const w = 1.2 + Math.random() * 4.2;
    b.style.left = `${left}%`;
    b.dataset.lp = String(left);
    b.style.height = `${h}%`;
    b.style.width = `${w}px`;
    b.style.opacity = String(opMin + Math.random() * (opMax - opMin));
    b.style.transform = `rotate(${-5 + Math.random() * 10}deg)`;
    b.dataset.base = b.style.transform;
    b.dataset.wf1 = String(0.48 + Math.random() * 0.62);
    b.dataset.wf2 = String(0.32 + Math.random() * 0.55);
    b.dataset.wf3 = String(0.09 + Math.random() * 0.07);
    b.dataset.wp1 = String(Math.random() * Math.PI * 2);
    b.dataset.wp2 = String(Math.random() * Math.PI * 2);
    b.dataset.wp3 = String(Math.random() * Math.PI * 2);
    b.dataset.wa1 = String(0.75 + Math.random() * 1.15);
    b.dataset.wa2 = String(0.28 + Math.random() * 0.42);
    b.dataset.wa3 = String(0.12 + Math.random() * 0.18);
    b.dataset.wtx = String(0.35 + Math.random() * 0.55);
    b.dataset.wty = String(0.18 + Math.random() * 0.28);
    grassLayer.appendChild(b);
  }
}

function grassWindAt(b, t) {
  const wf1 = parseFloat(b.dataset.wf1);
  const wf2 = parseFloat(b.dataset.wf2);
  const wf3 = parseFloat(b.dataset.wf3);
  const wp1 = parseFloat(b.dataset.wp1);
  const wp2 = parseFloat(b.dataset.wp2);
  const wp3 = parseFloat(b.dataset.wp3);
  const wa1 = parseFloat(b.dataset.wa1);
  const wa2 = parseFloat(b.dataset.wa2);
  const wa3 = parseFloat(b.dataset.wa3);
  const wtx = parseFloat(b.dataset.wtx);
  const wty = parseFloat(b.dataset.wty);

  const swayRot =
    Math.sin(t * wf1 + wp1) * wa1 +
    Math.sin(t * wf2 * 1.09 + wp2) * wa2 +
    Math.sin(t * (wf1 + wf2) * 0.33 + wp3) * wa3 * 0.85 +
    Math.sin(t * wf3 * 1.65 + wp2) * wty * 0.22;

  const swayTx =
    Math.sin(t * wf2 * 1.31 + wp1) * wtx +
    Math.cos(t * wf1 * 0.82 + wp3) * wtx * 0.48 +
    Math.sin(t * wf3 * 2.1 + wp1) * wtx * 0.22;

  return { swayRot, swayTx };
}

function getGrassState(el) {
  if (!grassSmooth.has(el)) {
    grassSmooth.set(el, { rot: null, tx: null });
  }
  return grassSmooth.get(el);
}

function updateGrassRustle(dt) {
  const t = performance.now() * 0.001;
  const k = 1 - Math.exp(-dt * 13);
  const rect = grassLayer.getBoundingClientRect();
  const blades = grassLayer.querySelectorAll(".grass-blade");
  const lx = pointer.inGrass ? pointer.x - rect.left : 0;
  const ly = pointer.inGrass ? pointer.y - rect.top : 0;

  blades.forEach((b) => {
    const base = b.dataset.base || "rotate(0deg)";
    const baseMatch = base.match(/rotate\(([-0-9.]+)deg\)/);
    const baseDeg = baseMatch ? parseFloat(baseMatch[1]) : 0;

    const { swayRot, swayTx } = grassWindAt(b, t);

    let targetRot = baseDeg + swayRot;
    let targetTx = swayTx;

    if (pointer.inGrass) {
      const lp = parseFloat(b.dataset.lp) || 0;
      const bx = (lp / 100) * rect.width;
      const dx = bx - lx;
      const dy = rect.height - ly;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const falloff = Math.max(0, 1 - dist / 182);
      const nx = dx / dist;
      const ny = dy / dist;

      const gust = Math.sin(t * 1.9 + bx * 0.014) * 0.35 * falloff;

      targetRot += nx * 9.5 * falloff - ny * 2.8 * falloff + gust;
      targetTx += nx * 2.4 * falloff;
    }

    const s = getGrassState(b);
    if (s.rot === null) {
      s.rot = targetRot;
      s.tx = targetTx;
    } else {
      s.rot = lerp(s.rot, targetRot, k);
      s.tx = lerp(s.tx, targetTx, k);
    }

    b.style.transform = `rotate(${s.rot}deg) translateX(${s.tx}px)`;
  });
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (pointer.inGrass) {
    for (const c of creatures) {
      c.tryLaunch(pointer.x, pointer.y);
    }
  }

  for (const c of creatures) {
    c.update(dt);
  }

  updateGrassRustle(dt);

  ctx.clearRect(0, 0, width, height);
  for (const c of creatures) {
    c.draw();
  }

  requestAnimationFrame(loop);
}

function onPointer(e) {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.inGrass = pointer.y >= height * GRASS_TOP_RATIO;
}

function initCreatures() {
  creatures.length = 0;
  for (let i = 0; i < IDLE_COUNT; i++) {
    creatures.push(new Creature());
  }
}

function applyTheme() {
  themeDark = isDarkTheme();
  document.documentElement.dataset.theme = themeDark ? "dark" : "light";
  buildStars();
  buildGrass();
  initCreatures();
}

function boot() {
  resize();
  applyTheme();

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  window.addEventListener("resize", () => {
    resize();
    applyTheme();
  });
  window.addEventListener("pointermove", onPointer);
  window.addEventListener("pointerleave", () => {
    pointer.inGrass = false;
  });
  requestAnimationFrame(loop);
}

boot();
