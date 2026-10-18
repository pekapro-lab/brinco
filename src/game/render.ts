import { FLAG, FLOOR_Y, SOLIDS, SPIKES, WORLD_H, WORLD_W } from "./level";
import type { Sim } from "./sim";

export type View = { w: number; h: number; cssW: number; cssH: number; dpr: number };

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 3.7) * 43758.5453;
  return x - Math.floor(x);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function render(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  cam: { x: number; y: number },
  view: View,
) {
  const { cssW, cssH, dpr, w: viewW, h: viewH } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const sky = ctx.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, "#140e0c");
  sky.addColorStop(0.42, "#3a2218");
  sky.addColorStop(0.78, "#c4622e");
  sky.addColorStop(1, "#f0a030");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);

  const scale = cssW / viewW;
  const shake = sim.shake;
  const sx = (hash(sim.time * 40) - 0.5) * 10 * shake;
  const sy = (hash(sim.time * 40 + 4) - 0.5) * 7 * shake;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  drawFar(ctx, cam, viewW, viewH, sim.time);
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  drawLava(ctx, sim.time);
  drawSolids(ctx);
  drawSpikes(ctx, sim.time);
  drawFlag(ctx, sim.time);
  drawCoins(ctx, sim);
  drawEnemies(ctx, sim);
  drawPlayer(ctx, sim);
  drawFx(ctx, sim);
  ctx.restore();

  const vignette = ctx.createRadialGradient(
    cssW * 0.5,
    cssH * 0.45,
    cssW * 0.2,
    cssW * 0.5,
    cssH * 0.5,
    cssW * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(12,8,6,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawFar(
  ctx: CanvasRenderingContext2D,
  cam: { x: number; y: number },
  viewW: number,
  viewH: number,
  time: number,
) {
  const sunX = viewW * 0.72;
  const sunY = viewH * 0.22;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  glow.addColorStop(0, "rgba(255,214,150,0.95)");
  glow.addColorStop(0.4, "rgba(240,160,48,0.35)");
  glow.addColorStop(1, "rgba(240,160,48,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe1b0";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(-((cam.x * 0.15) % 420), 0);
  ctx.fillStyle = "#241610";
  const baseY = viewH * 0.46;
  for (let i = -1; i < 8; i++) {
    const base = i * 220;
    const peak = baseY - 70 - hash(i) * 28;
    ctx.beginPath();
    ctx.moveTo(base, baseY);
    ctx.lineTo(base + 50, peak);
    ctx.lineTo(base + 110, peak + 24);
    ctx.lineTo(base + 180, baseY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-((cam.x * 0.35 + time * 8) % 180), 0);
  ctx.fillStyle = "rgba(246,239,228,0.1)";
  for (let i = 0; i < 5; i++) {
    const x = i * 180;
    const y = viewH * 0.12 + hash(i + 2) * viewH * 0.12;
    ctx.beginPath();
    ctx.ellipse(x, y, 54, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28, y + 4, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLava(ctx: CanvasRenderingContext2D, time: number) {
  const g = ctx.createLinearGradient(0, 620, 0, WORLD_H);
  g.addColorStop(0, "#ffb03a");
  g.addColorStop(0.45, "#e23d2b");
  g.addColorStop(1, "#6a140c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 630, WORLD_W, WORLD_H - 630);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#ffd59a";
  for (let i = 0; i < 28; i++) {
    const x = (i * 190 + time * 36) % WORLD_W;
    const y = 648 + Math.sin(time * 2.2 + i) * 8;
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSolids(ctx: CanvasRenderingContext2D) {
  for (const s of SOLIDS) {
    if (s.oneWay) {
      ctx.fillStyle = "#6a4632";
      roundRect(ctx, s.x, s.y, s.w, s.h, 6);
      ctx.fill();
      ctx.fillStyle = "#f0a030";
      ctx.fillRect(s.x + 4, s.y, s.w - 8, 4);
      ctx.strokeStyle = "rgba(246,239,228,0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(s.x + 6, s.y + s.h - 3);
      ctx.lineTo(s.x + s.w - 6, s.y + s.h - 3);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const grd = ctx.createLinearGradient(s.x, s.y, s.x, s.y + Math.min(s.h, 80));
    grd.addColorStop(0, "#8a5a3c");
    grd.addColorStop(0.18, "#5c3a2a");
    grd.addColorStop(1, "#3a241c");
    ctx.fillStyle = grd;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = "#e08a3c";
    ctx.fillRect(s.x, s.y, s.w, 8);
    ctx.fillStyle = "#f6efe4";
    ctx.globalAlpha = 0.18;
    ctx.fillRect(s.x, s.y, s.w, 2);
    ctx.globalAlpha = 1;
    if (s.y >= FLOOR_Y - 1) {
      const tufts = Math.floor(s.w / 36);
      for (let i = 0; i < tufts; i++) {
        const tx = s.x + 10 + i * 36 + hash(s.x + i) * 8;
        const th = 8 + hash(i + s.x) * 8;
        ctx.fillStyle = i % 3 === 0 ? "#c45c28" : "#e08a3c";
        ctx.beginPath();
        ctx.moveTo(tx, s.y);
        ctx.lineTo(tx + 4, s.y - th);
        ctx.lineTo(tx + 8, s.y);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "rgba(18,14,11,0.25)";
      ctx.fillRect(s.x + 6, s.y + 16, s.w - 12, 8);
    }
  }
}

function drawSpikes(ctx: CanvasRenderingContext2D, time: number) {
  for (const s of SPIKES) {
    const n = 3;
    const tw = s.w / n;
    for (let i = 0; i < n; i++) {
      const x = s.x + i * tw;
      ctx.fillStyle = "#d7d0c8";
      ctx.beginPath();
      ctx.moveTo(x + 1, s.y + s.h);
      ctx.lineTo(x + tw / 2, s.y - 2 + Math.sin(time * 6 + i) * 0.4);
      ctx.lineTo(x + tw - 1, s.y + s.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e23d2b";
      ctx.fillRect(x + tw / 2 - 1.2, s.y + 4, 2.4, 6);
    }
  }
}

function drawCoins(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (const c of sim.coinsList) {
    if (c.got) continue;
    const spin = Math.cos(sim.time * 5 + c.x);
    const rx = Math.max(2, Math.abs(spin) * 9);
    ctx.save();
    ctx.translate(c.x, c.y + Math.sin(sim.time * 3 + c.y) * 3);
    ctx.fillStyle = "rgba(18,14,11,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0a030";
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe1a8";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.15, -2, Math.max(1, rx * 0.35), 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (const e of sim.enemies) {
    if (!e.alive && e.deadT > 0.35) continue;
    const squash = e.alive ? 1 : 1 + e.deadT * 3;
    const bob = e.alive ? Math.sin(sim.time * 8 + e.x) * 1.5 : 0;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);
    ctx.scale(e.dir * squash, e.alive ? 1 : Math.max(0.15, 1 - e.deadT * 3));
    ctx.translate(-e.w / 2, -e.h + bob);
    ctx.fillStyle = "rgba(18,14,11,0.3)";
    ctx.beginPath();
    ctx.ellipse(e.w / 2, e.h + 2, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a2430";
    roundRect(ctx, 2, 8, e.w - 4, e.h - 10, 10);
    ctx.fill();
    ctx.fillStyle = "#e23d2b";
    ctx.fillRect(4, 10, e.w - 8, 5);
    const step = e.alive ? Math.sin(sim.time * 10) * 3 : 0;
    ctx.fillStyle = "#2a1614";
    ctx.fillRect(6, e.h - 8, 6, 6 + step);
    ctx.fillRect(e.w - 12, e.h - 8, 6, 6 - step);
    ctx.fillStyle = "#f6efe4";
    ctx.beginPath();
    ctx.arc(11, 18, 4, 0, Math.PI * 2);
    ctx.arc(e.w - 11, 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#120e0b";
    ctx.beginPath();
    ctx.arc(12, 18, 1.6, 0, Math.PI * 2);
    ctx.arc(e.w - 10, 18, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, sim: Sim) {
  const p = sim.player;
  if (p.invuln > 0 && Math.sin(sim.time * 40) > 0) return;
  const bob = p.grounded && Math.abs(p.vx) < 20 ? Math.sin(sim.time * 3) * 1.4 : 0;
  const airborne = !p.grounded;
  const stretch = airborne ? (p.vy < 0 ? -0.1 : 0.08) : p.landSquash * 0.2;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h + bob);
  ctx.scale(p.facing * (1 + stretch), 1 - stretch * 0.8);
  ctx.translate(-p.w / 2, -p.h);

  ctx.fillStyle = "rgba(18,14,11,0.28)";
  ctx.beginPath();
  ctx.ellipse(p.w / 2, p.h + 2, 12, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const scarf = 8 + Math.sin(sim.time * 10 + Math.abs(p.vx) * 0.02) * 4;
  ctx.strokeStyle = "#e23d2b";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8, 16);
  ctx.quadraticCurveTo(0, 20, -scarf, 18 + Math.sin(sim.time * 8) * 3);
  ctx.stroke();

  const leg = p.grounded ? Math.sin(p.run) * 5 : p.vy < 0 ? -4 : 3;
  ctx.fillStyle = "#2a1c16";
  roundRect(ctx, 4, 26, 7, 12 + leg, 3);
  ctx.fill();
  roundRect(ctx, p.w - 11, 26, 7, 12 - leg, 3);
  ctx.fill();
  ctx.fillStyle = "#f0a030";
  ctx.fillRect(4, 34 + leg, 7, 4);
  ctx.fillRect(p.w - 11, 34 - leg, 7, 4);

  ctx.fillStyle = "#f0a030";
  roundRect(ctx, 4, 14, p.w - 8, 18, 7);
  ctx.fill();
  ctx.fillStyle = "#ffd59a";
  ctx.fillRect(8, 16, p.w - 16, 4);

  ctx.fillStyle = "#f6efe4";
  roundRect(ctx, 5, 2, p.w - 10, 16, 7);
  ctx.fill();
  ctx.fillStyle = "#120e0b";
  roundRect(ctx, 7, 8, p.w - 14, 7, 3);
  ctx.fill();
  ctx.fillStyle = "#9ad7ff";
  ctx.fillRect(10, 10, 4, 3);
  ctx.fillRect(p.w - 14, 10, 4, 3);

  ctx.fillStyle = "#e23d2b";
  ctx.beginPath();
  ctx.moveTo(p.w / 2 - 4, 4);
  ctx.lineTo(p.w / 2, -4 + Math.sin(sim.time * 12) * 1.5);
  ctx.lineTo(p.w / 2 + 4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd56a";
  ctx.beginPath();
  ctx.moveTo(p.w / 2 - 2, 3);
  ctx.lineTo(p.w / 2, -1);
  ctx.lineTo(p.w / 2 + 2, 3);
  ctx.fill();

  ctx.restore();
}

function drawFlag(ctx: CanvasRenderingContext2D, time: number) {
  const f = FLAG;
  ctx.fillStyle = "#f6efe4";
  ctx.fillRect(f.x + 4, f.y, 4, f.h);
  ctx.fillStyle = "#c9b8a4";
  ctx.beginPath();
  ctx.arc(f.x + 6, f.y + f.h, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e23d2b";
  ctx.beginPath();
  ctx.moveTo(f.x + 8, f.y + 6);
  const wave = Math.sin(time * 4) * 6;
  ctx.quadraticCurveTo(f.x + 28, f.y + 10 + wave, f.x + 30, f.y + 22);
  ctx.lineTo(f.x + 8, f.y + 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f0a030";
  ctx.fillRect(f.x + 10, f.y + 12, 10, 3);
}

function drawFx(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (const q of sim.particles) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = "700 14px Outfit, sans-serif";
  ctx.textAlign = "center";
  for (const f of sim.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = "#f6efe4";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (sim.player.grounded && Math.abs(sim.player.vx) > 80 && sim.mode === "play") {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#f6efe4";
    ctx.beginPath();
    ctx.ellipse(sim.player.x + 6, sim.player.y + sim.player.h, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
