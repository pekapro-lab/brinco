import {
  CHECKPOINTS,
  COINS,
  ENEMIES,
  FLAG,
  KILL_Y,
  SOLIDS,
  SPAWN,
  SPIKES,
  WORLD_W,
  type Checkpoint,
  type Solid,
} from "./level";

export const PHYS = {
  accel: 2800,
  airAccel: 1900,
  friction: 2400,
  airFriction: 280,
  maxSpeed: 280,
  jumpV: -720,
  gRise: 1680,
  gApex: 880,
  gFall: 2800,
  apexBand: 130,
  terminal: 900,
  coyote: 0.11,
  buffer: 0.13,
  cut: 0.5,
  stompV: -430,
};

export type Mode = "title" | "play" | "pause" | "over" | "win";

export type Input = {
  moveX: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  jumpReleased: boolean;
  down: boolean;
};

export const INPUT_NONE: Input = {
  moveX: 0,
  jumpHeld: false,
  jumpPressed: false,
  jumpReleased: false,
  down: false,
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  grav: number;
};

export type Floater = { x: number; y: number; text: string; life: number; max: number };

export type Enemy = {
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  speed: number;
  dir: 1 | -1;
  alive: boolean;
  deadT: number;
};

export type Coin = { x: number; y: number; got: boolean };

type Player = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  onOneWay: boolean;
  coyote: number;
  jumpBuffer: number;
  jumping: boolean;
  invuln: number;
  landSquash: number;
  run: number;
  prevBottom: number;
};

export type Sim = {
  mode: Mode;
  time: number;
  hitStop: number;
  shake: number;
  lives: number;
  coins: number;
  score: number;
  best: number;
  spawn: { x: number; y: number };
  player: Player;
  enemies: Enemy[];
  coinsList: Coin[];
  checks: (Checkpoint & { reached: boolean })[];
  particles: Particle[];
  floaters: Floater[];
  events: string[];
  wonBonus: boolean;
};

export const PLAYER_W = 28;
export const PLAYER_H = 40;
const COIN_R = 34;

function loadBest(): number {
  try {
    if (typeof localStorage === "undefined") return 0;
    const n = Number(localStorage.getItem("brinco-best-v1"));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function saveBest(n: number) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem("brinco-best-v1", String(n));
  } catch {
    /* ignore quota */
  }
}

export function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function makePlayer(x: number, y: number): Player {
  return {
    x,
    y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    onOneWay: false,
    coyote: PHYS.coyote,
    jumpBuffer: 0,
    jumping: false,
    invuln: 0,
    landSquash: 0,
    run: 0,
    prevBottom: y + PLAYER_H,
  };
}

export function createSim(): Sim {
  return {
    mode: "title",
    time: 0,
    hitStop: 0,
    shake: 0,
    lives: 3,
    coins: 0,
    score: 0,
    best: loadBest(),
    spawn: { ...SPAWN },
    player: makePlayer(SPAWN.x, SPAWN.y),
    enemies: ENEMIES.map((e) => ({ ...e, alive: true, deadT: 0 })),
    coinsList: COINS.map((c) => ({ ...c, got: false })),
    checks: CHECKPOINTS.map((c) => ({ ...c, reached: false })),
    particles: [],
    floaters: [],
    events: [],
    wonBonus: false,
  };
}

function burst(sim: Sim, x: number, y: number, color: string, n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.75);
    sim.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 30,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      color,
      size: 2 + Math.random() * 2.5,
      grav: 520,
    });
  }
  if (sim.particles.length > 120) sim.particles.splice(0, sim.particles.length - 120);
}

function floatText(sim: Sim, x: number, y: number, text: string) {
  sim.floaters.push({ x, y, text, life: 0.8, max: 0.8 });
  if (sim.floaters.length > 12) sim.floaters.shift();
}

function commitBest(sim: Sim) {
  if (sim.score > sim.best) {
    sim.best = sim.score;
    saveBest(sim.best);
  }
}

function doJump(sim: Sim) {
  const p = sim.player;
  p.vy = PHYS.jumpV;
  p.grounded = false;
  p.onOneWay = false;
  p.coyote = 0;
  p.jumpBuffer = 0;
  p.jumping = true;
  sim.events.push("jump");
  burst(sim, p.x + p.w / 2, p.y + p.h, "#f0a030", 5, 90);
}

function hurt(sim: Sim) {
  const p = sim.player;
  if (p.invuln > 0 || sim.mode !== "play") return;
  sim.lives -= 1;
  sim.shake = 1;
  sim.hitStop = 0.07;
  sim.events.push("hurt");
  burst(sim, p.x + p.w / 2, p.y + p.h / 2, "#e23d2b", 12, 180);
  if (sim.lives <= 0) {
    sim.mode = "over";
    sim.events.push("die");
    commitBest(sim);
    return;
  }
  p.invuln = 1.25;
  p.x = sim.spawn.x;
  p.y = sim.spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.jumping = false;
  p.grounded = true;
  p.onOneWay = false;
}

function supportOf(p: Player): Solid | null {
  const foot = p.y + p.h;
  const probe = { x: p.x + 4, y: foot, w: p.w - 8, h: 5 };
  const cx = p.x + p.w / 2;
  let best: Solid | null = null;
  for (const s of SOLIDS) {
    if (cx < s.x + 2 || cx > s.x + s.w - 2) continue;
    if (s.oneWay && p.vy < 0) continue;
    if (foot > s.y + 8) continue;
    if (foot < s.y - 1) continue;
    if (!overlap(probe, s)) continue;
    if (!best || s.y < best.y) best = s;
  }
  return best;
}

function resolveX(p: Player) {
  for (const s of SOLIDS) {
    if (s.oneWay) continue;
    if (!overlap(p, s)) continue;
    if (p.vx > 0) p.x = s.x - p.w;
    else if (p.vx < 0) p.x = s.x + s.w;
    else {
      const pushL = p.x + p.w - s.x;
      const pushR = s.x + s.w - p.x;
      p.x = pushL < pushR ? s.x - p.w : s.x + s.w;
    }
    p.vx = 0;
  }
  if (p.x < 0) {
    p.x = 0;
    p.vx = 0;
  }
  if (p.x + p.w > WORLD_W) {
    p.x = WORLD_W - p.w;
    p.vx = 0;
  }
}

function resolveY(p: Player, dtDown: boolean): boolean {
  let landed: Solid | null = null;
  let ceil: Solid | null = null;
  for (const s of SOLIDS) {
    if (!overlap(p, s)) continue;
    if (s.oneWay) {
      if (dtDown) continue;
      if (p.vy < 0) continue;
      if (p.prevBottom > s.y + 3) continue;
      if (!landed || s.y < landed.y) landed = s;
      continue;
    }
    if (p.vy >= 0 && p.prevBottom <= s.y + 6) {
      if (!landed || s.y < landed.y) landed = s;
    } else if (p.vy < 0 && p.prevBottom - p.h >= s.y + s.h - 6) {
      if (!ceil || s.y + s.h > ceil.y + ceil.h) ceil = s;
    }
  }
  if (p.vy < 0 && ceil && !landed) {
    p.y = ceil.y + ceil.h;
    p.vy = 0;
    p.jumping = false;
    return false;
  }
  if (landed && p.vy >= 0) {
    const impact = p.vy;
    p.y = landed.y - p.h;
    p.vy = 0;
    p.onOneWay = Boolean(landed.oneWay);
    if (impact > 220) p.landSquash = Math.min(1, impact / 800);
    return true;
  }
  return false;
}

export function step(sim: Sim, dt: number, input: Input) {
  if (sim.mode !== "play") return;
  const p = sim.player;

  const support = supportOf(p);
  p.grounded = Boolean(support);
  p.onOneWay = Boolean(support?.oneWay);
  if (support && p.grounded && !(input.down && p.onOneWay)) {
    if (p.vy >= 0) {
      p.y = support.y - p.h;
      p.vy = 0;
    }
    p.coyote = PHYS.coyote;
  } else if (!p.grounded) {
    p.coyote = Math.max(0, p.coyote - dt);
  }

  if (input.jumpPressed) p.jumpBuffer = PHYS.buffer;
  else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

  if (input.down && p.onOneWay) {
    p.grounded = false;
    p.onOneWay = false;
    p.coyote = 0;
    p.y += 3;
  } else if (p.jumpBuffer > 0 && (p.grounded || p.coyote > 0)) {
    doJump(sim);
  }

  if (input.jumpReleased && p.vy < 0 && p.jumping) {
    p.vy *= PHYS.cut;
    p.jumping = false;
  }

  const accel = p.grounded ? PHYS.accel : PHYS.airAccel;
  if (input.moveX !== 0) {
    p.vx += input.moveX * accel * dt;
    p.facing = input.moveX > 0 ? 1 : -1;
  } else {
    const fr = (p.grounded ? PHYS.friction : PHYS.airFriction) * dt;
    if (Math.abs(p.vx) <= fr) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * fr;
  }
  if (p.vx > PHYS.maxSpeed) p.vx = PHYS.maxSpeed;
  if (p.vx < -PHYS.maxSpeed) p.vx = -PHYS.maxSpeed;

  if (!p.grounded || p.vy < 0) {
    let g = PHYS.gRise;
    if (p.vy > 0) g = PHYS.gFall;
    else if (Math.abs(p.vy) < PHYS.apexBand) g = PHYS.gApex;
    p.vy = Math.min(PHYS.terminal, p.vy + g * dt);
  }

  if (p.grounded && Math.abs(p.vx) > 30) p.run += Math.abs(p.vx) * dt * 0.03;
  p.invuln = Math.max(0, p.invuln - dt);
  p.landSquash = Math.max(0, p.landSquash - dt * 3.2);

  p.x += p.vx * dt;
  resolveX(p);

  p.prevBottom = p.y + p.h;
  p.y += p.vy * dt;
  const landed = resolveY(p, input.down);
  if (landed) {
    p.grounded = true;
    p.coyote = PHYS.coyote;
    if (p.jumpBuffer > 0 && !input.down) doJump(sim);
  }

  if (p.y > KILL_Y) hurt(sim);
  if (sim.mode !== "play") return;

  for (const spike of SPIKES) {
    if (overlap(p, spike)) {
      hurt(sim);
      break;
    }
  }
  if (sim.mode !== "play") return;

  for (const e of sim.enemies) {
    if (!e.alive) {
      e.deadT += dt;
      continue;
    }
    e.x += e.dir * e.speed * dt;
    if (e.x < e.minX) {
      e.x = e.minX;
      e.dir = 1;
    }
    if (e.x + e.w > e.maxX) {
      e.x = e.maxX - e.w;
      e.dir = -1;
    }
    if (!overlap(p, e)) continue;
    const feet = p.y + p.h;
    const stomped = p.vy > 0 && feet - e.y < e.h * 0.75 && p.prevBottom <= e.y + 16;
    if (stomped) {
      e.alive = false;
      e.deadT = 0;
      p.vy = PHYS.stompV;
      p.y = e.y - p.h - 1;
      p.jumping = true;
      p.grounded = false;
      sim.score += 250;
      sim.hitStop = 0.05;
      sim.shake = Math.max(sim.shake, 0.45);
      sim.events.push("stomp");
      burst(sim, e.x + e.w / 2, e.y + e.h / 2, "#e23d2b", 10, 160);
      floatText(sim, e.x, e.y - 8, "+250");
    } else {
      hurt(sim);
      if (sim.mode !== "play") return;
    }
  }

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  for (const c of sim.coinsList) {
    if (c.got) continue;
    const dx = cx - c.x;
    const dy = cy - c.y;
    if (dx * dx + dy * dy > COIN_R * COIN_R) continue;
    c.got = true;
    sim.coins += 1;
    sim.score += 100;
    sim.events.push("coin");
    burst(sim, c.x, c.y, "#ffd56a", 8, 120);
    floatText(sim, c.x - 10, c.y - 16, "+100");
  }

  for (const cp of sim.checks) {
    if (cp.reached || !overlap(p, cp)) continue;
    cp.reached = true;
    sim.spawn = { x: cp.sx, y: cp.sy };
    sim.events.push("checkpoint");
    floatText(sim, cp.sx, cp.sy - 28, "¡Control!");
  }

  if (overlap(p, FLAG)) {
    sim.mode = "win";
    if (!sim.wonBonus) {
      sim.wonBonus = true;
      sim.score += 500 + sim.lives * 200;
    }
    p.vx = 0;
    sim.events.push("win");
    commitBest(sim);
    burst(sim, FLAG.x, FLAG.y + 20, "#f0a030", 18, 200);
  }
}

export function stepFx(sim: Sim, dt: number) {
  for (let i = sim.particles.length - 1; i >= 0; i--) {
    const q = sim.particles[i]!;
    q.life -= dt;
    q.vy += q.grav * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.life <= 0) sim.particles.splice(i, 1);
  }
  for (let i = sim.floaters.length - 1; i >= 0; i--) {
    const f = sim.floaters[i]!;
    f.life -= dt;
    f.y -= 28 * dt;
    if (f.life <= 0) sim.floaters.splice(i, 1);
  }
  sim.shake = Math.max(0, sim.shake - dt * 1.8);
}

export function coinTotal() {
  return COINS.length;
}
