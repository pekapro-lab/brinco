export type Solid = {
  x: number;
  y: number;
  w: number;
  h: number;
  oneWay?: boolean;
};

export type CoinSpot = { x: number; y: number };
export type Spike = { x: number; y: number; w: number; h: number };
export type EnemySpec = {
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  speed: number;
  dir: 1 | -1;
};
export type Checkpoint = { x: number; y: number; w: number; h: number; sx: number; sy: number };
export type Flag = { x: number; y: number; w: number; h: number };

export const WORLD_W = 5080;
export const WORLD_H = 720;
export const FLOOR_Y = 560;
export const KILL_Y = 700;

const ground = (x: number, w: number): Solid => ({ x, y: FLOOR_Y, w, h: 220 });
const plat = (x: number, y: number, w: number): Solid => ({
  x,
  y,
  w,
  h: 16,
  oneWay: true,
});

export const SOLIDS: Solid[] = [
  ground(0, 520),
  ground(680, 560),
  ground(1580, 980),
  ground(2740, 420),
  ground(3340, 860),
  ground(4380, 700),

  { x: 780, y: 500, w: 50, h: 60 },
  { x: 3880, y: 480, w: 42, h: 80 },

  plat(560, 500, 80),
  plat(1180, 460, 150),
  plat(1360, 370, 150),
  plat(1520, 470, 160),
  plat(1860, 455, 210),
  plat(2580, 490, 90),
  plat(2680, 420, 90),
  plat(3180, 480, 90),
  plat(3280, 400, 90),
  plat(3520, 465, 170),
  plat(3740, 365, 150),
  plat(3960, 450, 160),
  plat(4220, 490, 90),
  plat(4320, 420, 90),
  plat(4580, 460, 170),
];

export const SPIKES: Spike[] = [
  { x: 1920, y: 540, w: 36, h: 20 },
  { x: 1984, y: 540, w: 36, h: 20 },
  { x: 3000, y: 540, w: 36, h: 20 },
  { x: 3064, y: 540, w: 36, h: 20 },
  { x: 4100, y: 540, w: 36, h: 20 },
  { x: 4560, y: 540, w: 36, h: 20 },
];

export const ENEMIES: EnemySpec[] = [
  { x: 980, y: 530, w: 34, h: 30, minX: 920, maxX: 1160, speed: 78, dir: 1 },
  { x: 2140, y: 530, w: 34, h: 30, minX: 2060, maxX: 2420, speed: 92, dir: -1 },
  { x: 3780, y: 335, w: 34, h: 30, minX: 3760, maxX: 3860, speed: 54, dir: 1 },
  { x: 4620, y: 530, w: 34, h: 30, minX: 4600, maxX: 4840, speed: 84, dir: 1 },
];

export const CHECKPOINTS: Checkpoint[] = [
  { x: 1640, y: 470, w: 28, h: 90, sx: 1660, sy: 520 },
  { x: 2800, y: 470, w: 28, h: 90, sx: 2820, sy: 520 },
  { x: 4420, y: 470, w: 28, h: 90, sx: 4440, sy: 520 },
];

export const FLAG: Flag = { x: 4960, y: 448, w: 36, h: 112 };

export const COINS: CoinSpot[] = [
  { x: 160, y: 512 },
  { x: 230, y: 500 },
  { x: 300, y: 470 },
  { x: 370, y: 500 },
  { x: 450, y: 512 },
  { x: 600, y: 460 },
  { x: 760, y: 512 },
  { x: 860, y: 460 },
  { x: 1040, y: 512 },
  { x: 1120, y: 512 },
  { x: 1250, y: 420 },
  { x: 1430, y: 330 },
  { x: 1600, y: 430 },
  { x: 1760, y: 512 },
  { x: 1960, y: 415 },
  { x: 2060, y: 415 },
  { x: 2280, y: 512 },
  { x: 2460, y: 512 },
  { x: 2620, y: 450 },
  { x: 2720, y: 380 },
  { x: 2920, y: 512 },
  { x: 3100, y: 470 },
  { x: 3220, y: 440 },
  { x: 3320, y: 360 },
  { x: 3480, y: 512 },
  { x: 3600, y: 425 },
  { x: 3810, y: 325 },
  { x: 4040, y: 410 },
  { x: 4260, y: 450 },
  { x: 4360, y: 380 },
  { x: 4660, y: 420 },
  { x: 4780, y: 512 },
  { x: 4880, y: 480 },
];

export const SPAWN = { x: 72, y: 520 };
