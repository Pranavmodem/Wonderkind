/** Types for vendor/buddy.js (window.Pal), the Buddy renderer from the AI-Buddy project. */
interface PalInstance {
  canvas: HTMLCanvasElement;
  calm: boolean;
  setState(name: string, replay?: boolean): void;
  hold(name: string, ms?: number): void;
  emote(name: string, ms?: number): void;
  move(name: string): void;
  setLook(look: string): void;
  setColors(c: { body?: string; eyes?: string; ring?: string }): void;
  lookAt(x: number, y: number, origin?: Element): void;
  tick(dt: number): void;
}

interface PalOptions {
  look?: string;
  dark?: boolean;
  body?: string;
  eyes?: string;
  ring?: string;
  eyeStyle?: string;
  view?: [number, number, number, number] | "tight";
}

interface Window {
  Pal: {
    create(host: HTMLElement, opts?: PalOptions): PalInstance;
    LOOKS: Record<string, string>;
  };
}
