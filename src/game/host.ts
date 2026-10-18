import { createAudio, type AudioBus } from "./audio";
import { render, type View } from "./render";
import { WORLD_H, WORLD_W } from "./level";
import {
  coinTotal,
  createSim,
  step,
  stepFx,
  type Input,
  type Mode,
  type Sim,
} from "./sim";

export type Hud = {
  mode: Mode;
  lives: number;
  coins: number;
  coinTotal: number;
  score: number;
  best: number;
  muted: boolean;
};

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "Space",
  "KeyP",
  "Escape",
]);

const STEP = 1 / 120;

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getX: () => number;
  getY: () => number;
  getMode: () => Mode;
  getGrounded: () => boolean;
  getLives: () => number;
  getCoins: () => number;
  setKeys: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export function createHost(canvas: HTMLCanvasElement, onHud: (hud: Hud) => void) {
  let sim: Sim = createSim();
  const audio: AudioBus = createAudio();
  const keys = new Set<string>();
  const injected = new Set<string>();
  const touch = { left: false, right: false, jump: false, down: false };
  let prevJump = false;
  let raf = 0;
  let dead = false;
  let acc = 0;
  let last = performance.now();
  const cam = { x: 0, y: 0, ready: false };
  let hudKey = "";

  const total = coinTotal();

  function emit() {
    const next: Hud = {
      mode: sim.mode,
      lives: sim.lives,
      coins: sim.coins,
      coinTotal: total,
      score: sim.score,
      best: sim.best,
      muted: audio.muted,
    };
    const key = JSON.stringify(next);
    if (key === hudKey) return;
    hudKey = key;
    onHud(next);
  }

  function down(code: string) {
    return keys.has(code) || injected.has(code);
  }

  function readPad() {
    const pads = navigator.getGamepads?.() ?? [];
    let x = 0;
    let jump = false;
    let drop = false;
    for (const pad of pads) {
      if (!pad) continue;
      const dz = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      if (Math.abs(dz.x) > Math.abs(x)) x = dz.x;
      if (pad.buttons[0]?.pressed || pad.buttons[12]?.pressed) jump = true;
      if (pad.buttons[1]?.pressed || pad.buttons[13]?.pressed || dz.y > 0.55) drop = true;
    }
    return { x, jump, drop };
  }

  function sample(edge: boolean): Input {
    const pad = readPad();
    const left = down("ArrowLeft") || down("KeyA") || touch.left;
    const right = down("ArrowRight") || down("KeyD") || touch.right;
    let moveX = 0;
    if (left && !right) moveX = -1;
    else if (right && !left) moveX = 1;
    else moveX = pad.x;

    const jumpHeld = down("Space") || down("KeyW") || down("ArrowUp") || touch.jump || pad.jump;
    const jumpPressed = edge && jumpHeld && !prevJump;
    const jumpReleased = edge && !jumpHeld && prevJump;
    if (edge) prevJump = jumpHeld;
    return {
      moveX,
      jumpHeld,
      jumpPressed,
      jumpReleased,
      down: down("ArrowDown") || down("KeyS") || touch.down || pad.drop,
    };
  }

  function playEvents(events: string[]) {
    for (const e of events) {
      if (e === "jump") audio.jump();
      else if (e === "coin") audio.coin();
      else if (e === "stomp") audio.stomp();
      else if (e === "hurt") audio.hurt();
      else if (e === "die") audio.die();
      else if (e === "checkpoint") audio.checkpoint();
      else if (e === "win") audio.win();
    }
  }

  function viewOf(): View {
    const cssW = canvas.clientWidth || 1;
    const cssH = canvas.clientHeight || 1;
    const aspect = cssW / cssH;
    let viewH = 320;
    let viewW = viewH * aspect;
    if (viewW > 640) {
      viewW = 640;
      viewH = viewW / aspect;
    }
    if (viewW < 230) {
      viewW = 230;
      viewH = viewW / aspect;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return { w: viewW, h: viewH, cssW, cssH, dpr };
  }

  function follow(dt: number, view: View) {
    const p = sim.player;
    const anchor = p.facing >= 0 ? 0.36 : 0.64;
    const look = p.vx * 0.12;
    let targetX = p.x + p.w / 2 - view.w * anchor + look;
    let targetY = p.y + p.h / 2 - view.h * 0.62;
    if (sim.mode === "title") targetY -= view.h * 0.12;
    targetX = Math.max(0, Math.min(WORLD_W - view.w, targetX));
    targetY = Math.max(0, Math.min(WORLD_H - view.h, targetY));
    if (!cam.ready) {
      cam.x = targetX;
      cam.y = targetY;
      cam.ready = true;
      return;
    }
    const kx = 1 - Math.exp(-3.4 * dt);
    const ky = 1 - Math.exp(-2.2 * dt);
    cam.x += (targetX - cam.x) * kx;
    cam.y += (targetY - cam.y) * ky;
  }

  function frame(now: number) {
    if (dead) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (sim.hitStop > 0) {
      sim.hitStop = Math.max(0, sim.hitStop - dt);
    } else {
      sim.time += dt;
      if (sim.mode === "play") {
        acc += dt;
        let n = 0;
        const events: string[] = [];
        while (acc >= STEP && n < 8 && sim.mode === "play") {
          const input = sample(n === 0);
          sim.events = [];
          step(sim, STEP, input);
          events.push(...sim.events);
          acc -= STEP;
          n++;
        }
        if (n >= 8) acc = 0;
        playEvents(events);
      } else {
        acc = 0;
      }
      stepFx(sim, dt);
    }

    const view = viewOf();
    const dpr = view.dpr;
    const bw = Math.max(1, Math.floor(view.cssW * dpr));
    const bh = Math.max(1, Math.floor(view.cssH * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    follow(dt, view);
    const ctx = canvas.getContext("2d");
    if (ctx) render(ctx, sim, cam, view);
    syncAudio();
    emit();
    raf = requestAnimationFrame(frame);
  }

  function onKeyDown(e: KeyboardEvent) {
    const target = e.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
    ) {
      return;
    }
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    const fresh = !keys.has(e.code);
    keys.add(e.code);
    if (fresh && !e.repeat && (e.code === "KeyP" || e.code === "Escape")) {
      if (sim.mode === "play") sim.mode = "pause";
      else if (sim.mode === "pause") sim.mode = "play";
      syncAudio();
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function clearKeys() {
    keys.clear();
    prevJump = false;
  }

  function onHide() {
    if (document.hidden) clearKeys();
    else audio.unlock();
  }

  function syncAudio() {
    audio.sync(sim.mode === "title" ? "menu" : sim.mode === "play" ? "play" : "off");
  }

  function armAudio() {
    audio.unlock();
    syncAudio();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearKeys);
  window.addEventListener("pointerdown", armAudio, true);
  window.addEventListener("keydown", armAudio);
  document.addEventListener("visibilitychange", onHide);

  const ro = new ResizeObserver(() => {
    cam.ready = false;
  });
  ro.observe(canvas);

  const probe: ControlsProbe = {
    getYaw: () => (sim.player.facing >= 0 ? 0 : Math.PI),
    getSpeed: () => Math.hypot(sim.player.vx, sim.player.vy),
    getX: () => sim.player.x,
    getY: () => sim.player.y,
    getMode: () => sim.mode,
    getGrounded: () => sim.player.grounded,
    getLives: () => sim.lives,
    getCoins: () => sim.coins,
    setKeys: (codes) => {
      injected.clear();
      for (const c of codes) injected.add(c);
    },
    setSteer: (v) => {
      injected.delete("KeyA");
      injected.delete("KeyD");
      if (v > 0.2) injected.add("KeyA");
      else if (v < -0.2) injected.add("KeyD");
    },
  };
  window.__controlsTest = probe;

  emit();
  raf = requestAnimationFrame(frame);

  return {
    begin() {
      const best = sim.best;
      sim = createSim();
      sim.best = best;
      sim.mode = "play";
      cam.ready = false;
      acc = 0;
      prevJump = true;
      audio.unlock();
      syncAudio();
      emit();
    },
    resume() {
      if (sim.mode === "pause") sim.mode = "play";
      syncAudio();
      emit();
    },
    pause() {
      if (sim.mode === "play") sim.mode = "pause";
      syncAudio();
      emit();
    },
    retry() {
      const best = sim.best;
      sim = createSim();
      sim.best = Math.max(best, sim.best);
      sim.mode = "play";
      cam.ready = false;
      acc = 0;
      prevJump = true;
      audio.unlock();
      syncAudio();
      emit();
    },
    toggleMute() {
      audio.toggle();
      emit();
    },
    setTouch(partial: Partial<typeof touch>) {
      Object.assign(touch, partial);
    },
    toTitle() {
      const best = sim.best;
      sim = createSim();
      sim.best = best;
      sim.mode = "title";
      cam.ready = false;
      acc = 0;
      touch.left = false;
      touch.right = false;
      touch.jump = false;
      touch.down = false;
      prevJump = false;
      syncAudio();
      emit();
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      window.removeEventListener("pointerdown", armAudio, true);
      window.removeEventListener("keydown", armAudio);
      document.removeEventListener("visibilitychange", onHide);
      if (window.__controlsTest === probe) delete window.__controlsTest;
    },
  };
}

export type GameHost = ReturnType<typeof createHost>;
