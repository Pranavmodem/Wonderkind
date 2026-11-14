/**
 * Glossy, soft-3D drawings used instead of emoji: things kids count, and props along the map trail.
 * Every drawing is an SVG on a 100 × 100 box with a radial "light from the top left" gradient, a
 * specular highlight and a soft ground shadow, so they all read as one family with the flame buddy.
 */
import { useId, type ReactNode } from "react";

type Pal = readonly [light: string, base: string, dark: string];

const P = {
  red: ["#FF9A90", "#F2453D", "#B01E2B"],
  orange: ["#FFCB85", "#FF9330", "#D45A0E"],
  yellow: ["#FFF4AE", "#FFD43B", "#DB9A00"],
  green: ["#BDF2A4", "#4CC96B", "#1C8446"],
  leaf: ["#A6EB91", "#3DB65A", "#1D7337"],
  blue: ["#B0DEFF", "#3D9BF2", "#1C5AB0"],
  teal: ["#A3F2E6", "#2CC2B0", "#117D73"],
  purple: ["#DCC2FF", "#9B6BF2", "#5733AE"],
  pink: ["#FFC9E1", "#FF7AB5", "#D23B7A"],
  brown: ["#EBC093", "#B57A45", "#71431E"],
  tan: ["#FBE0B0", "#E0AE66", "#A26B2A"],
  white: ["#FFFFFF", "#F2F5FB", "#C3CCDF"],
  dark: ["#727A97", "#2E3550", "#141829"],
  grey: ["#EEF1F7", "#B9C2D3", "#7A849B"],
  sky: ["#FFFFFF", "#E8F2FF", "#B9CFEA"],
  lilac: ["#F1E9FF", "#C9B4FF", "#8A6BE0"],
  magenta: ["#FFD0F4", "#E36BD8", "#9C2E9E"],
  indigo: ["#B9C2FF", "#6D72F0", "#3A3BB0"],
  moon: ["#FFFFFF", "#DCD8F0", "#9C95C2"],
} as const satisfies Record<string, Pal>;

type PalName = keyof typeof P;
type Fill = (p: PalName) => string;

const INK = "#23305A";

/* ------------------------------------------------------------- helpers */

function Shadow({ w = 30, y = 93 }: { w?: number; y?: number }) {
  return <ellipse cx="50" cy={y} rx={w} ry={w * 0.16} className="art-shadow" />;
}

/** A soft white sheen on the lit (top-left) side of a rounded part. */
function Shine({ x, y, rx, ry, rot = -30, o = 0.6 }: { x: number; y: number; rx: number; ry: number; rot?: number; o?: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill="#fff" opacity={o} />;
}

/** Shiny black eyes with a sparkle, and pink cheeks. */
export function Face({ x = 50, y = 55, gap = 16, s = 1, mouth = "smile", blush = true }: { x?: number; y?: number; gap?: number; s?: number; mouth?: "smile" | "none" | "o" | "grin"; blush?: boolean }) {
  return (
    <g>
      {[-1, 1].map((k) => (
        <g key={k}>
          <ellipse cx={x + (k * gap) / 2} cy={y} rx={3.4 * s} ry={4.3 * s} fill={INK} />
          <circle cx={x + (k * gap) / 2 + 1.2 * s} cy={y - 1.6 * s} r={1.3 * s} fill="#fff" />
        </g>
      ))}
      {blush && [-1, 1].map((k) => <ellipse key={`b${k}`} cx={x + k * (gap / 2 + 6 * s)} cy={y + 5 * s} rx={3.6 * s} ry={2.2 * s} fill="#FF7FA6" opacity="0.45" />)}
      {mouth === "smile" && <path d={`M${x - 3 * s} ${y + 5 * s} Q${x} ${y + 8 * s} ${x + 3 * s} ${y + 5 * s}`} stroke={INK} strokeWidth={1.6 * s} fill="none" strokeLinecap="round" />}
      {mouth === "grin" && <path d={`M${x - 4.5 * s} ${y + 4.5 * s} Q${x} ${y + 11 * s} ${x + 4.5 * s} ${y + 4.5 * s} Z`} fill={INK} />}
      {mouth === "o" && <ellipse cx={x} cy={y + 7 * s} rx={2.2 * s} ry={2.8 * s} fill={INK} />}
    </g>
  );
}

/* ------------------------------------------------------------- drawings */

type Draw = (f: Fill) => ReactNode;

const ART: Record<string, Draw> = {
  apple: (f) => (
    <>
      <Shadow w={28} />
      <path d="M50 30 C36 20 16 26 16 50 C16 72 32 90 44 88 C48 87 52 87 56 88 C68 90 84 72 84 50 C84 26 64 20 50 30 Z" fill={f("red")} />
      <path d="M50 30 C50 22 52 16 56 12" stroke="#7A4A22" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M55 20 C62 10 76 12 78 16 C70 24 60 24 55 20 Z" fill={f("leaf")} />
      <Shine x={32} y={44} rx={7} ry={12} />
    </>
  ),
  strawberry: (f) => (
    <>
      <Shadow w={24} />
      <path d="M50 90 C30 80 18 58 20 42 C22 30 36 26 50 28 C64 26 78 30 80 42 C82 58 70 80 50 90 Z" fill={f("red")} />
      {[
        [36, 44], [50, 42], [64, 44], [42, 56], [58, 56], [36, 66], [50, 68], [64, 66], [44, 78], [56, 78],
      ].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.6" ry="2.4" fill="#FFE27A" />
      ))}
      <path d="M50 30 L36 20 L44 30 L30 30 L44 34 L50 40 L56 34 L70 30 L56 30 L64 20 Z" fill={f("leaf")} />
      <Shine x={32} y={48} rx={5} ry={10} o={0.5} />
    </>
  ),
  ladybug: (f) => (
    <>
      <Shadow w={30} />
      <circle cx="50" cy="32" r="14" fill={f("dark")} />
      <path d="M14 62 C14 40 30 28 50 28 C70 28 86 40 86 62 C86 80 70 90 50 90 C30 90 14 80 14 62 Z" fill={f("red")} />
      <path d="M50 30 L50 90" stroke="#2E3550" strokeWidth="3" />
      {[[33, 50], [67, 50], [28, 70], [72, 70], [40, 80], [60, 80]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill="#2E3550" />
      ))}
      <circle cx="44" cy="28" r="3" fill="#fff" />
      <circle cx="56" cy="28" r="3" fill="#fff" />
      <circle cx="44.6" cy="28.4" r="1.6" fill={INK} />
      <circle cx="56.6" cy="28.4" r="1.6" fill={INK} />
      <Shine x={30} y={44} rx={6} ry={10} />
    </>
  ),
  fish: (f) => (
    <>
      <Shadow w={30} />
      <path d="M78 52 L96 34 L94 70 Z" fill={f("orange")} />
      <ellipse cx="46" cy="52" rx="36" ry="26" fill={f("orange")} />
      <path d="M42 30 C50 18 62 20 66 30 Z" fill={f("orange")} />
      <path d="M58 40 C64 48 64 58 58 66" stroke="#fff" strokeOpacity=".5" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Face x={30} y={50} gap={0.01} s={1.1} mouth="none" blush={false} />
      <ellipse cx="26" cy="58" rx="3.4" ry="2" fill="#FF7FA6" opacity=".5" />
      <Shine x={36} y={38} rx={9} ry={5} rot={-10} />
    </>
  ),
  balloon: (f) => (
    <>
      <path d="M50 74 C46 82 54 86 50 96" stroke="#9AA4BC" strokeWidth="2" fill="none" />
      <ellipse cx="50" cy="40" rx="27" ry="33" fill={f("pink")} />
      <path d="M45 74 L55 74 L50 68 Z" fill={f("pink")} />
      <Shine x={38} y={26} rx={7} ry={13} rot={-25} />
    </>
  ),
  cupcake: (f) => (
    <>
      <Shadow w={24} />
      <path d="M24 56 L76 56 L68 90 L32 90 Z" fill={f("blue")} />
      {[34, 44, 56, 66].map((x) => (
        <path key={x} d={`M${x} 58 L${x + (x < 50 ? 2 : -2)} 88`} stroke="#fff" strokeOpacity=".45" strokeWidth="3" />
      ))}
      <path d="M20 58 C14 44 28 38 32 40 C32 26 46 22 52 28 C58 20 74 26 70 40 C80 38 86 50 80 58 Z" fill={f("pink")} />
      <circle cx="54" cy="22" r="7" fill={f("red")} />
      <Shine x={34} y={44} rx={8} ry={4} rot={-15} />
    </>
  ),
  chick: (f) => (
    <>
      <Shadow w={28} />
      <path d="M18 64 C18 40 32 28 50 28 C68 28 82 40 82 64 C82 82 68 90 50 90 C32 90 18 82 18 64 Z" fill={f("yellow")} />
      <path d="M46 24 C48 16 54 14 56 22" stroke="#E0A100" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M20 66 C10 60 12 50 22 54 Z" fill={f("yellow")} />
      <path d="M80 66 C90 60 88 50 78 54 Z" fill={f("yellow")} />
      <path d="M44 60 L56 60 L50 68 Z" fill={f("orange")} />
      <Face x={50} y={50} gap={20} mouth="none" />
      <Shine x={32} y={44} rx={6} ry={11} />
    </>
  ),
  ball: (f) => (
    <>
      <Shadow w={28} />
      <circle cx="50" cy="56" r="34" fill={f("white")} />
      <path d="M50 22 A34 34 0 0 1 84 56 L50 56 Z" fill={f("red")} />
      <path d="M50 90 A34 34 0 0 1 16 56 L50 56 Z" fill={f("blue")} />
      <path d="M16 56 A34 34 0 0 1 50 22 L50 56 Z" fill={f("yellow")} />
      <circle cx="50" cy="56" r="5" fill={f("white")} />
      <Shine x={36} y={38} rx={9} ry={6} rot={-35} />
    </>
  ),
  flower: (f) => (
    <>
      <path d="M50 64 C50 76 48 84 50 94" stroke="#3DB65A" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M50 82 C40 76 32 80 30 86 C38 88 46 86 50 82 Z" fill={f("leaf")} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="50" cy="22" rx="12" ry="16" transform={`rotate(${a} 50 40)`} fill={f("pink")} />
      ))}
      <circle cx="50" cy="40" r="13" fill={f("yellow")} />
      <Face x={50} y={39} gap={10} s={0.7} />
    </>
  ),
  cookie: (f) => (
    <>
      <Shadow w={30} />
      <circle cx="50" cy="56" r="34" fill={f("tan")} />
      {[[36, 42], [60, 38], [68, 60], [44, 66], [54, 52], [32, 60], [56, 76]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="4.5" ry="3.6" fill="#5A3317" />
      ))}
      <Shine x={34} y={40} rx={8} ry={5} rot={-35} o={0.45} />
    </>
  ),
  orange: (f) => (
    <>
      <Shadow w={28} />
      <circle cx="50" cy="56" r="33" fill={f("orange")} />
      <path d="M50 24 C54 14 66 12 70 16 C64 24 56 26 50 24 Z" fill={f("leaf")} />
      <Shine x={36} y={42} rx={7} ry={11} />
    </>
  ),
  butterfly: (f) => (
    <>
      <Shadow w={22} />
      <path d="M48 50 C30 24 8 30 12 46 C14 58 30 60 48 54 Z" fill={f("purple")} />
      <path d="M52 50 C70 24 92 30 88 46 C86 58 70 60 52 54 Z" fill={f("purple")} />
      <path d="M48 56 C34 60 24 76 34 82 C42 86 48 72 48 60 Z" fill={f("pink")} />
      <path d="M52 56 C66 60 76 76 66 82 C58 86 52 72 52 60 Z" fill={f("pink")} />
      <ellipse cx="50" cy="58" rx="5" ry="22" fill={f("dark")} />
      <path d="M48 38 C44 28 40 26 38 24 M52 38 C56 28 60 26 62 24" stroke="#2E3550" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Shine x={26} y={40} rx={6} ry={4} rot={-20} o={0.5} />
      <Shine x={74} y={40} rx={6} ry={4} rot={20} o={0.5} />
    </>
  ),
  turtle: (f) => (
    <>
      <Shadow w={34} />
      <ellipse cx="84" cy="64" rx="11" ry="10" fill={f("green")} />
      {[[26, 82], [70, 82], [20, 70], [76, 70]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="7" ry="6" fill={f("green")} />
      ))}
      <path d="M14 72 C14 46 30 34 50 34 C70 34 84 46 84 72 Z" fill={f("leaf")} />
      <path d="M34 52 L42 44 L58 44 L66 52 L58 62 L42 62 Z M14 70 L84 70" stroke="#1D7337" strokeOpacity=".55" strokeWidth="2.5" fill="none" />
      <circle cx="87" cy="61" r="2" fill={INK} />
      <Shine x={34} y={46} rx={8} ry={5} rot={-25} />
    </>
  ),
  car: (f) => (
    <>
      <Shadow w={36} />
      <path d="M12 74 L12 58 C12 52 16 50 22 48 L32 32 C34 28 38 26 44 26 L62 26 C68 26 72 30 74 34 L82 48 C88 50 90 54 90 60 L90 74 Z" fill={f("red")} />
      <path d="M36 34 C37 31 40 30 44 30 L52 30 L52 48 L28 48 Z" fill={f("sky")} />
      <path d="M58 30 L62 30 C66 30 68 32 70 36 L76 48 L58 48 Z" fill={f("sky")} />
      <circle cx="30" cy="76" r="11" fill={f("dark")} />
      <circle cx="72" cy="76" r="11" fill={f("dark")} />
      <circle cx="30" cy="76" r="4" fill="#C3CCDF" />
      <circle cx="72" cy="76" r="4" fill="#C3CCDF" />
      <Shine x={30} y={54} rx={10} ry={3.5} rot={-5} />
    </>
  ),
  donut: (f) => (
    <>
      <Shadow w={32} />
      <ellipse cx="50" cy="60" rx="36" ry="28" fill={f("tan")} />
      <path d="M18 56 C18 38 34 30 50 30 C66 30 82 38 82 56 C82 62 76 66 70 62 C64 70 56 64 50 68 C44 64 36 70 30 62 C24 66 18 62 18 56 Z" fill={f("pink")} />
      <ellipse cx="50" cy="52" rx="10" ry="7" fill="#C97A3A" />
      {[[32, 44, 30], [64, 42, -30], [40, 58, 60], [70, 54, 10], [54, 38, 80], [28, 54, -50]].map(([x, y, r], i) => (
        <rect key={i} x={x - 4} y={y - 1.4} width="8" height="2.8" rx="1.4" transform={`rotate(${r} ${x} ${y})`} fill={["#FFD43B", "#3D9BF2", "#fff", "#4CC96B"][i % 4]} />
      ))}
      <Shine x={32} y={40} rx={8} ry={4} rot={-25} />
    </>
  ),
  bee: (f) => (
    <>
      <Shadow w={26} />
      <ellipse cx="38" cy="34" rx="13" ry="16" transform="rotate(-25 38 34)" fill="#fff" opacity=".75" stroke="#C3CCDF" strokeWidth="1.5" />
      <ellipse cx="62" cy="34" rx="13" ry="16" transform="rotate(25 62 34)" fill="#fff" opacity=".75" stroke="#C3CCDF" strokeWidth="1.5" />
      <ellipse cx="50" cy="62" rx="32" ry="26" fill={f("yellow")} />
      <path d="M40 38 C36 50 36 74 40 86 L50 87 C46 74 46 50 50 37 Z M62 38 C58 50 58 74 62 86 L70 83 C66 72 66 52 70 41 Z" fill="#2E3550" opacity=".85" />
      <Face x={28} y={58} gap={12} s={0.85} />
      <Shine x={30} y={46} rx={6} ry={4} rot={-20} />
    </>
  ),
  duck: (f) => (
    <>
      <Shadow w={32} />
      <path d="M14 64 C14 52 26 48 40 50 C44 30 54 20 64 22 C76 24 80 36 76 46 C88 50 90 60 86 70 C82 84 66 90 48 90 C28 90 14 80 14 64 Z" fill={f("white")} />
      <path d="M76 36 C86 34 94 38 94 42 C88 46 80 44 76 42 Z" fill={f("orange")} />
      <circle cx="66" cy="34" r="3.4" fill={INK} />
      <circle cx="67.2" cy="32.6" r="1.2" fill="#fff" />
      <ellipse cx="60" cy="42" rx="3.6" ry="2.2" fill="#FF7FA6" opacity=".45" />
      <path d="M30 62 C40 58 54 60 60 68 C50 74 38 72 30 62 Z" fill="#DCE3EF" />
      <Shine x={28} y={56} rx={7} ry={4} rot={-20} />
    </>
  ),
  teddy: (f) => (
    <>
      <Shadow w={28} />
      <circle cx="26" cy="26" r="11" fill={f("brown")} />
      <circle cx="74" cy="26" r="11" fill={f("brown")} />
      <circle cx="26" cy="26" r="5" fill="#E8B98A" />
      <circle cx="74" cy="26" r="5" fill="#E8B98A" />
      <ellipse cx="50" cy="80" rx="26" ry="14" fill={f("brown")} />
      <circle cx="50" cy="48" r="30" fill={f("brown")} />
      <ellipse cx="50" cy="60" rx="12" ry="9" fill="#F3D2AE" />
      <ellipse cx="50" cy="56" rx="4" ry="3" fill={INK} />
      <Face x={50} y={44} gap={20} mouth="none" />
      <path d="M46 63 Q50 66 54 63" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Shine x={34} y={34} rx={6} ry={10} />
    </>
  ),
  banana: (f) => (
    <>
      <Shadow w={30} />
      <path d="M18 40 C22 70 48 86 80 74 C86 72 86 66 80 66 C56 72 36 60 30 38 C28 32 18 32 18 40 Z" fill={f("yellow")} />
      <path d="M22 34 L18 26" stroke="#71431E" strokeWidth="4" strokeLinecap="round" />
      <Shine x={34} y={58} rx={10} ry={3} rot={40} o={0.5} />
    </>
  ),
  lemon: (f) => (
    <>
      <Shadow w={28} />
      <ellipse cx="50" cy="56" rx="34" ry="26" fill={f("yellow")} />
      <path d="M14 56 L8 54 M86 56 L92 54" stroke="#DB9A00" strokeWidth="5" strokeLinecap="round" />
      <Shine x={36} y={46} rx={10} ry={5} rot={-15} />
    </>
  ),
  pear: (f) => (
    <>
      <Shadow w={24} />
      <path d="M50 22 C40 22 38 34 38 42 C38 50 20 56 22 74 C24 88 40 92 50 92 C60 92 76 88 78 74 C80 56 62 50 62 42 C62 34 60 22 50 22 Z" fill={f("green")} />
      <path d="M50 22 C50 16 52 12 55 9" stroke="#71431E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Shine x={36} y={66} rx={6} ry={11} rot={-15} />
    </>
  ),
  star: (f) => (
    <>
      <Shadow w={26} />
      <path d="M50 10 L61 36 L89 38 L67 56 L75 84 L50 68 L25 84 L33 56 L11 38 L39 36 Z" fill={f("yellow")} strokeLinejoin="round" stroke="#E0A100" strokeWidth="2" />
      <Face x={50} y={48} gap={14} s={0.8} />
      <Shine x={40} y={30} rx={4} ry={8} rot={-20} />
    </>
  ),
  crayon: (f) => (
    <>
      <Shadow w={30} />
      <g transform="rotate(-35 50 55)">
        <rect x="16" y="44" width="56" height="20" rx="4" fill={f("blue")} />
        <path d="M72 44 L90 54 L72 64 Z" fill={f("blue")} />
        <path d="M84 50.5 L90 54 L84 57.5 Z" fill="#1C5AB0" />
        <rect x="26" y="44" width="6" height="20" fill="#fff" opacity=".5" />
        <rect x="58" y="44" width="6" height="20" fill="#fff" opacity=".5" />
        <rect x="18" y="47" width="50" height="4" rx="2" fill="#fff" opacity=".5" />
      </g>
    </>
  ),
  pencil: (f) => (
    <>
      <Shadow w={30} />
      <g transform="rotate(-35 50 55)">
        <rect x="14" y="46" width="58" height="16" rx="2" fill={f("yellow")} />
        <rect x="8" y="46" width="10" height="16" rx="3" fill={f("pink")} />
        <path d="M72 46 L88 54 L72 62 Z" fill="#F3D2AE" />
        <path d="M83 51.5 L88 54 L83 56.5 Z" fill={INK} />
        <rect x="16" y="48" width="54" height="3" rx="1.5" fill="#fff" opacity=".55" />
      </g>
    </>
  ),
  brick: (f) => (
    <>
      <Shadow w={34} />
      <rect x="14" y="42" width="72" height="40" rx="8" fill={f("red")} />
      {[30, 50, 70].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="42" rx="8" ry="4" fill="#B01E2B" />
          <rect x={x - 8} y="34" width="16" height="8" fill={f("red")} />
          <ellipse cx={x} cy="34" rx="8" ry="4" fill="#FF8A80" />
        </g>
      ))}
      <Shine x={28} y={56} rx={10} ry={4} rot={-10} o={0.45} />
    </>
  ),
  kite: (f) => (
    <>
      <path d="M50 76 C44 82 56 86 50 96" stroke="#9AA4BC" strokeWidth="2" fill="none" />
      <path d="M50 8 L80 40 L50 76 L20 40 Z" fill={f("teal")} />
      <path d="M50 8 L50 76 M20 40 L80 40" stroke="#fff" strokeOpacity=".6" strokeWidth="2.5" />
      <path d="M50 8 L80 40 L50 40 Z" fill="#fff" opacity=".18" />
    </>
  ),
  puppy: (f) => (
    <>
      <Shadow w={30} />
      <path d="M50 26 C74 26 86 42 86 60 C86 80 70 90 50 90 C30 90 14 80 14 60 C14 42 26 26 50 26 Z" fill={f("white")} />
      <ellipse cx="20" cy="46" rx="11" ry="17" transform="rotate(20 20 46)" fill={f("brown")} />
      <ellipse cx="80" cy="46" rx="11" ry="17" transform="rotate(-20 80 46)" fill={f("brown")} />
      <ellipse cx="50" cy="66" rx="4" ry="3" fill={INK} />
      <Face x={50} y={56} gap={22} mouth="none" />
      <path d="M46 72 Q50 75 54 72" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Shine x={36} y={38} rx={8} ry={5} rot={-20} />
    </>
  ),
  kitty: (f) => (
    <>
      <Shadow w={30} />
      <path d="M18 40 L22 14 L40 30 Z M82 40 L78 14 L60 30 Z" fill={f("dark")} />
      <path d="M24 34 L25 22 L34 30 Z M76 34 L75 22 L66 30 Z" fill="#9B6BF2" />
      <path d="M50 26 C74 26 86 42 86 60 C86 80 70 90 50 90 C30 90 14 80 14 60 C14 42 26 26 50 26 Z" fill={f("dark")} />
      <circle cx="40" cy="56" r="5.5" fill="#fff" />
      <circle cx="60" cy="56" r="5.5" fill="#fff" />
      <circle cx="40.6" cy="57" r="3.2" fill={INK} />
      <circle cx="60.6" cy="57" r="3.2" fill={INK} />
      <path d="M47 66 L53 66 L50 69 Z" fill="#FF9AC2" />
      <Shine x={34} y={38} rx={8} ry={5} rot={-20} o={0.35} />
    </>
  ),
  bunny: (f) => (
    <>
      <Shadow w={28} />
      <ellipse cx="38" cy="26" rx="8" ry="20" fill={f("pink")} />
      <ellipse cx="62" cy="26" rx="8" ry="20" fill={f("pink")} />
      <ellipse cx="38" cy="28" rx="3.5" ry="13" fill="#FFE3EE" />
      <ellipse cx="62" cy="28" rx="3.5" ry="13" fill="#FFE3EE" />
      <path d="M50 40 C72 40 84 52 84 66 C84 82 70 90 50 90 C30 90 16 82 16 66 C16 52 28 40 50 40 Z" fill={f("pink")} />
      <Face x={50} y={64} gap={22} />
      <Shine x={34} y={52} rx={8} ry={5} rot={-20} />
    </>
  ),

  /* --------- map props: bigger, simpler shapes that sit along the trail */
  tree: (f) => (
    <>
      <Shadow w={26} />
      <path d="M44 92 L46 62 L54 62 L56 92 Z" fill={f("brown")} />
      <circle cx="50" cy="40" r="28" fill={f("green")} />
      <circle cx="30" cy="54" r="16" fill={f("green")} />
      <circle cx="70" cy="54" r="16" fill={f("green")} />
      <Shine x={38} y={28} rx={8} ry={5} rot={-30} o={0.5} />
    </>
  ),
  pine: (f) => (
    <>
      <Shadow w={22} />
      <rect x="45" y="78" width="10" height="14" rx="2" fill={f("brown")} />
      <path d="M50 6 L76 44 L62 44 L82 70 L18 70 L38 44 L24 44 Z" fill={f("leaf")} strokeLinejoin="round" />
      <path d="M50 6 L76 44 L62 44 L82 70 L18 70 L38 44 L24 44 Z" fill="none" stroke="#1D7337" strokeOpacity=".2" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 70 L82 70 L76 80 L24 80 Z" fill={f("leaf")} />
      <Shine x={40} y={36} rx={4} ry={9} rot={30} o={0.4} />
    </>
  ),
  bush: (f) => (
    <>
      <Shadow w={34} />
      <path d="M12 86 C6 70 18 58 30 62 C30 46 50 40 58 52 C66 42 86 48 84 64 C94 68 92 86 84 88 Z" fill={f("green")} />
      {[[34, 70], [60, 66], [72, 78]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="4.5" fill={f("pink")} />
      ))}
      <Shine x={34} y={58} rx={7} ry={4} rot={-20} o={0.45} />
    </>
  ),
  mushroom: (f) => (
    <>
      <Shadow w={26} />
      <path d="M36 60 C34 74 36 86 40 90 L60 90 C64 86 66 74 64 60 Z" fill={f("white")} />
      <path d="M10 60 C10 34 28 18 50 18 C72 18 90 34 90 60 C78 66 22 66 10 60 Z" fill={f("red")} />
      {[[30, 38, 6], [52, 30, 7], [72, 44, 5], [44, 50, 4]].map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#fff" />
      ))}
      <Face x={50} y={74} gap={14} s={0.8} />
      <Shine x={26} y={32} rx={6} ry={4} rot={-35} o={0.5} />
    </>
  ),
  rock: (f) => (
    <>
      <Shadow w={34} />
      <path d="M14 86 C10 70 20 56 34 54 C40 42 60 40 68 50 C82 50 92 66 86 86 Z" fill={f("grey")} />
      <Shine x={34} y={62} rx={8} ry={4} rot={-20} o={0.6} />
    </>
  ),
  cloud: (f) => (
    <>
      <path d="M18 70 C6 70 6 52 20 52 C20 36 40 30 48 42 C54 30 76 32 76 48 C92 46 94 70 80 70 Z" fill={f("sky")} />
      <Shine x={36} y={46} rx={8} ry={4} rot={-15} o={0.9} />
    </>
  ),
  crystal: (f) => (
    <>
      <Shadow w={24} />
      <path d="M50 10 L68 36 L60 90 L40 90 L32 36 Z" fill={f("purple")} />
      <path d="M50 10 L50 90 M32 36 L68 36" stroke="#fff" strokeOpacity=".45" strokeWidth="2" />
      <path d="M26 54 L36 66 L34 90 L22 90 L18 66 Z" fill={f("teal")} />
      <path d="M50 10 L32 36 L40 90 L50 90 Z" fill="#fff" opacity=".18" />
    </>
  ),
  grass: (f) => (
    <>
      <path d="M30 90 C28 72 22 62 16 56 C26 60 34 70 38 86 C40 66 44 54 52 46 C48 60 48 74 50 90 Z" fill={f("leaf")} />
      <path d="M50 90 C54 70 64 60 76 54 C68 66 62 78 62 90 Z" fill={f("green")} />
    </>
  ),

  /* --------- space props for the night map: they float, so no ground shadow */
  planet: (f) => (
    <>
      <path d="M8 60 C8 50 92 38 92 48" stroke="#E9DFFF" strokeOpacity=".55" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="52" r="27" fill={f("purple")} />
      <path d="M26 44 C40 40 62 40 76 46 M24 58 C40 54 64 56 77 60" stroke="#fff" strokeOpacity=".22" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M8 60 C8 70 92 58 92 48" stroke="#F4EDFF" strokeWidth="7" fill="none" strokeLinecap="round" />
      <Shine x={40} y={38} rx={8} ry={5} rot={-30} o={0.55} />
    </>
  ),
  moon: (f) => (
    <>
      <circle cx="50" cy="50" r="32" fill={f("moon")} />
      {[[38, 36, 7], [64, 44, 5], [44, 66, 6], [66, 64, 3.5]].map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#A9A2D0" opacity=".55" />
      ))}
      <Face x={52} y={52} gap={14} s={0.75} />
      <Shine x={36} y={30} rx={8} ry={5} rot={-30} o={0.7} />
    </>
  ),
  comet: (f) => (
    <>
      <path d="M58 42 C40 50 22 66 6 92 C26 78 46 68 66 60 Z" fill={f("lilac")} opacity=".55" />
      <path d="M60 46 C46 56 30 70 18 90 C34 78 50 68 66 58 Z" fill="#fff" opacity=".35" />
      <circle cx="66" cy="44" r="15" fill={f("lilac")} />
      <circle cx="66" cy="44" r="22" fill="#fff" opacity=".12" />
      <Shine x={61} y={38} rx={4} ry={3} rot={-30} o={0.8} />
    </>
  ),
  rocket: (f) => (
    <>
      <g transform="rotate(30 50 50)">
        <path d="M40 74 L32 88 L44 82 Z M60 74 L68 88 L56 82 Z" fill={f("magenta")} />
        <path d="M50 8 C64 20 66 44 62 78 L38 78 C34 44 36 20 50 8 Z" fill={f("white")} />
        <path d="M50 8 C58 15 62 24 63 32 L37 32 C38 24 42 15 50 8 Z" fill={f("magenta")} />
        <circle cx="50" cy="48" r="8" fill={f("indigo")} stroke="#fff" strokeWidth="3" />
        <path d="M42 80 C44 90 50 96 50 96 C50 96 56 90 58 80 Z" fill={f("pink")} />
        <Shine x={44} y={52} rx={3} ry={12} rot={0} o={0.6} />
      </g>
    </>
  ),
  satellite: (f) => (
    <>
      <g transform="rotate(-20 50 50)">
        <rect x="6" y="40" width="26" height="20" rx="3" fill={f("indigo")} />
        <rect x="68" y="40" width="26" height="20" rx="3" fill={f("indigo")} />
        <path d="M14 40 V60 M22 40 V60 M76 40 V60 M84 40 V60" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        <path d="M32 50 H68" stroke="#C3CCDF" strokeWidth="3" />
        <rect x="38" y="34" width="24" height="32" rx="6" fill={f("white")} />
        <circle cx="50" cy="50" r="5" fill={f("teal")} />
        <path d="M50 34 L50 22 M44 20 Q50 14 56 20" stroke="#C3CCDF" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </>
  ),
  asteroid: (f) => (
    <>
      <path d="M22 54 C18 36 34 24 48 26 C60 20 80 30 80 46 C88 58 78 76 62 76 C50 84 30 80 26 68 C18 66 18 60 22 54 Z" fill={f("grey")} />
      {[[40, 44, 6], [62, 40, 4], [58, 62, 7], [36, 64, 3.5]].map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#7A849B" opacity=".45" />
      ))}
      <Shine x={38} y={34} rx={7} ry={4} rot={-20} o={0.55} />
    </>
  ),
  sparkles: () => (
    <>
      {[
        [50, 46, 22],
        [24, 74, 10],
        [78, 22, 9],
      ].map(([x, y, r]) => (
        <path
          key={`${x}${y}`}
          d={`M${x} ${y - r} C${x + r * 0.15} ${y - r * 0.15} ${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} C${x + r * 0.15} ${y + r * 0.15} ${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} C${x - r * 0.15} ${y + r * 0.15} ${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} C${x - r * 0.15} ${y - r * 0.15} ${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r} Z`}
          fill="#F4EEFF"
        />
      ))}
    </>
  ),
  galaxy: (f) => (
    <>
      <ellipse cx="50" cy="50" rx="40" ry="18" transform="rotate(-25 50 50)" fill={f("magenta")} opacity=".35" />
      <path d="M50 50 C60 40 74 44 72 56 C70 70 46 72 36 60 C26 46 40 26 60 28" stroke="#F1E9FF" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".85" transform="rotate(-25 50 50)" />
      <circle cx="50" cy="50" r="7" fill="#fff" />
    </>
  ),
};

/** Which drawing stands in for an emoji, where one exists. */
const EMOJI_ART: Record<string, string> = {
  "🍎": "apple",
  "🍓": "strawberry",
  "🐞": "ladybug",
  "🐟": "fish",
  "🐠": "fish",
  "🎈": "balloon",
  "🧁": "cupcake",
  "🐤": "chick",
  "🐥": "chick",
  "⚽": "ball",
  "🌼": "flower",
  "🌸": "flower",
  "🌻": "flower",
  "🍪": "cookie",
  "🍊": "orange",
  "🦋": "butterfly",
  "🐢": "turtle",
  "🚗": "car",
  "🍩": "donut",
  "🐝": "bee",
  "🦆": "duck",
  "🧸": "teddy",
  "🍌": "banana",
  "🍋": "lemon",
  "🍐": "pear",
  "⭐": "star",
  "🌟": "star",
  "🖍️": "crayon",
  "🖍": "crayon",
  "✏️": "pencil",
  "✏": "pencil",
  "🧱": "brick",
  "🪁": "kite",
  "🐶": "puppy",
  "🐱": "kitty",
  "🐰": "bunny",
  "🐇": "bunny",
  "🌳": "tree",
  "🌲": "pine",
  "🍄": "mushroom",
  "🪨": "rock",
  "☁️": "cloud",
  "💎": "crystal",
  "🌱": "grass",
};

export const hasArt = (emoji: string) => emoji in EMOJI_ART || emoji in ART;

/** The drawing for an emoji (or a drawing name); falls back to the emoji itself when there's no drawing. */
export function Art({ emoji, className, title }: { emoji: string; className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const name = EMOJI_ART[emoji] ?? (emoji in ART ? emoji : undefined);
  if (!name) {
    return (
      <span className={`art-emoji${className ? ` ${className}` : ""}`} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        {emoji}
      </span>
    );
  }
  const used = Object.keys(P) as PalName[];
  return (
    <svg className={`art${className ? ` ${className}` : ""}`} viewBox="0 0 100 100" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        {used.map((k) => (
          <radialGradient key={k} id={`${id}-${k}`} cx="34%" cy="28%" r="80%">
            <stop offset="0" stopColor={P[k][0]} />
            <stop offset="0.55" stopColor={P[k][1]} />
            <stop offset="1" stopColor={P[k][2]} />
          </radialGradient>
        ))}
      </defs>
      {ART[name]((k) => `url(#${id}-${k})`)}
    </svg>
  );
}

/** Props that line the map trail, picked steadily per world so each world keeps its look. */
export const MAP_PROPS = ["tree", "flower", "mushroom", "pine", "bush", "rock", "crystal", "grass"] as const;

/** At night the map is a galaxy: these float beside the trail instead. */
export const SPACE_PROPS = ["planet", "moon", "comet", "rocket", "satellite", "asteroid", "sparkles", "galaxy"] as const;
