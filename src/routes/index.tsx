import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Coins,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createHost, type GameHost, type Hud } from "@/game/host";
import { coinTotal } from "@/game/sim";

const NAME_KEY = "brinco-name-v1";
const NAME_MAX = 16;

function readStoredName() {
  try {
    return (localStorage.getItem(NAME_KEY) ?? "").slice(0, NAME_MAX);
  } catch {
    return "";
  }
}

function writeStoredName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* quota */
  }
}

function shownName(raw: string) {
  const clean = raw.trim().slice(0, NAME_MAX);
  return clean || "Jugador";
}

export const Route = createFileRoute("/")({ component: Home });

const INITIAL: Hud = {
  mode: "title",
  lives: 3,
  coins: 0,
  coinTotal: coinTotal(),
  score: 0,
  best: 0,
  muted: false,
};

function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<GameHost | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL);
  const [draft, setDraft] = useState("");
  const [playerName, setPlayerName] = useState("Jugador");

  useEffect(() => {
    const stored = readStoredName();
    if (stored) {
      setDraft(stored);
      setPlayerName(stored);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = createHost(canvas, setHud);
    hostRef.current = host;
    return () => {
      host.destroy();
      hostRef.current = null;
    };
  }, []);

  const host = () => hostRef.current;
  const playing = hud.mode === "play";

  function start() {
    const clean = draft.trim().slice(0, NAME_MAX);
    writeStoredName(clean);
    setDraft(clean);
    setPlayerName(shownName(clean));
    host()?.begin();
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label="Brinco, juego de plataformas"
      />
      <p className="sr-only" aria-live="polite">
        {hud.mode === "win"
          ? "Victoria. Has llegado a la bandera."
          : hud.mode === "over"
            ? "Fin de la partida."
            : hud.mode === "pause"
              ? "Pausa."
              : ""}
      </p>

      {playing || hud.mode === "pause" ? (
        <header className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-2">
            <p className="max-w-40 truncate rounded-full bg-surface px-3 py-2 font-display text-fg">
              {playerName}
            </p>
            <div className="flex items-center gap-1 rounded-full bg-surface px-3 py-2">
              {[0, 1, 2].map((i) => (
                <Heart
                  key={i}
                  aria-hidden
                  className={i < hud.lives ? "size-5 fill-ember text-ember" : "size-5 text-muted"}
                />
              ))}
              <span className="sr-only">{hud.lives} vidas</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-2 font-display text-amber">
            <Coins className="size-5" aria-hidden />
            <span>
              {hud.coins}
              <span className="text-muted">/{hud.coinTotal}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="rounded-full bg-surface px-3 py-2 font-display text-fg">{hud.score}</p>
            <button
              type="button"
              aria-label={hud.muted ? "Activar sonido" : "Silenciar"}
              className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-line bg-surface text-fg"
              onClick={() => host()?.toggleMute()}
            >
              {hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
            {playing ? (
              <button
                type="button"
                aria-label="Pausa"
                className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-line bg-surface text-fg"
                onClick={() => host()?.pause()}
              >
                <Pause className="size-5" />
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      {hud.mode === "title" ? (
        <Overlay>
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm tracking-widest text-amber">MENÚ</p>
            <button
              type="button"
              aria-label={hud.muted ? "Activar música" : "Silenciar música"}
              className="flex size-11 items-center justify-center rounded-full border border-line bg-bg text-fg"
              onClick={() => host()?.toggleMute()}
            >
              {hud.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
          </div>
          <h1 className="font-display text-5xl text-fg">Brinco</h1>
          <p className="text-base leading-relaxed text-muted">
            Escribe tu nombre y salta al nivel. Pisa a los enemigos; de lado pierdes una vida.
          </p>
          <label className="flex flex-col gap-2 text-sm text-muted" htmlFor="player-name">
            Nombre
            <input
              id="player-name"
              name="player-name"
              autoComplete="nickname"
              enterKeyHint="go"
              maxLength={NAME_MAX}
              placeholder="Jugador"
              spellCheck={false}
              value={draft}
              className="h-12 rounded-lg border border-line bg-bg px-3 font-display text-lg text-fg outline-none placeholder:text-muted focus-visible:border-amber"
              onChange={(e) => setDraft(e.target.value.slice(0, NAME_MAX))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  start();
                }
              }}
            />
          </label>
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber px-6 font-display text-lg text-bg"
            onClick={start}
          >
            <Play className="size-5" />
            Jugar
          </button>
          <ControlsHint />
          {hud.best > 0 ? (
            <p className="text-sm text-muted">
              Récord <span className="font-display text-amber">{hud.best}</span>
            </p>
          ) : null}
        </Overlay>
      ) : null}

      {hud.mode === "pause" ? (
        <Overlay>
          <h2 className="font-display text-4xl">Pausa</h2>
          <p className="text-muted">El foso sigue ahí abajo.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber px-5 font-display text-lg text-bg"
              onClick={() => host()?.resume()}
            >
              <Play className="size-5" />
              Continuar
            </button>
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-bg px-5 font-display text-lg text-fg"
              onClick={() => host()?.retry()}
            >
              <RotateCcw className="size-5" />
              Reiniciar
            </button>
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-bg px-5 font-display text-lg text-fg"
              onClick={() => host()?.toTitle()}
            >
              Menú
            </button>
          </div>
        </Overlay>
      ) : null}

      {hud.mode === "over" ? (
        <Overlay>
          <p className="font-display text-sm tracking-widest text-ember">SIN VIDAS</p>
          <h2 className="font-display text-4xl">Fin de la partida</h2>
          <p className="text-muted">{playerName} se ha quedado sin vidas.</p>
          <ScoreLine hud={hud} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber px-6 font-display text-lg text-bg"
              onClick={() => host()?.retry()}
            >
              <RotateCcw className="size-5" />
              Reintentar
            </button>
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-bg px-5 font-display text-lg text-fg"
              onClick={() => host()?.toTitle()}
            >
              Menú
            </button>
          </div>
        </Overlay>
      ) : null}

      {hud.mode === "win" ? (
        <Overlay>
          <p className="font-display text-sm tracking-widest text-amber">META</p>
          <h2 className="font-display text-4xl">¡Victoria!</h2>
          <p className="text-muted">{playerName} ha llegado a la bandera.</p>
          <ScoreLine hud={hud} />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber px-6 font-display text-lg text-bg"
              onClick={() => host()?.retry()}
            >
              <RotateCcw className="size-5" />
              Jugar otra vez
            </button>
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-bg px-5 font-display text-lg text-fg"
              onClick={() => host()?.toTitle()}
            >
              Menú
            </button>
          </div>
        </Overlay>
      ) : null}

      {playing ? <TouchDock host={host} /> : null}
    </main>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-y-auto p-4 sm:items-center">
      <section className="my-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-surface p-6">
        {children}
      </section>
    </div>
  );
}

function ControlsHint() {
  return (
    <ul className="flex flex-col gap-2 text-sm text-muted">
      <li className="flex items-center justify-between gap-3">
        <span>Correr</span>
        <span className="flex gap-1 text-fg">
          <Kbd>A</Kbd>
          <Kbd>D</Kbd>
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
        </span>
      </li>
      <li className="flex items-center justify-between gap-3">
        <span>Saltar</span>
        <span className="flex gap-1 text-fg">
          <Kbd>Espacio</Kbd>
          <Kbd>W</Kbd>
        </span>
      </li>
      <li className="flex items-center justify-between gap-3">
        <span>Caer de una plataforma</span>
        <span className="flex gap-1 text-fg">
          <Kbd>S</Kbd>
          <Kbd>↓</Kbd>
        </span>
      </li>
    </ul>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-line bg-bg px-2 py-1 font-sans text-xs text-fg">{children}</kbd>
  );
}

function ScoreLine({ hud }: { hud: Hud }) {
  return (
    <p className="text-muted">
      {hud.coins} monedas · <span className="font-display text-fg">{hud.score}</span> puntos
      {hud.best > 0 ? (
        <>
          {" "}
          · récord <span className="font-display text-amber">{hud.best}</span>
        </>
      ) : null}
    </p>
  );
}

function TouchDock({ host }: { host: () => GameHost | null }) {
  return (
    <div className="touch-dock absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
      <div className="flex gap-3">
        <Hold
          label="Izquierda"
          onHold={(v) => host()?.setTouch({ left: v })}
        >
          <ChevronLeft className="size-7" />
        </Hold>
        <Hold label="Derecha" onHold={(v) => host()?.setTouch({ right: v })}>
          <ChevronRight className="size-7" />
        </Hold>
      </div>
      <div className="flex items-end gap-3">
        <Hold label="Bajar" onHold={(v) => host()?.setTouch({ down: v })}>
          <ArrowDown className="size-6" />
        </Hold>
        <Hold label="Saltar" big onHold={(v) => host()?.setTouch({ jump: v })}>
          <ArrowUp className="size-7" />
        </Hold>
      </div>
    </div>
  );
}

function Hold({
  label,
  big,
  onHold,
  children,
}: {
  label: string;
  big?: boolean;
  onHold: (down: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={
        big
          ? "flex size-16 items-center justify-center rounded-full border border-line bg-amber text-bg"
          : "flex size-14 items-center justify-center rounded-xl border border-line bg-surface text-fg"
      }
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
    >
      {children}
    </button>
  );
}
