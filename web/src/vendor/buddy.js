// From github.com/Pranavmodem/AI-Buddy (web/buddy.js): Buddy's renderer, used here for Flare.
// Buddy, as Flare (a little flame), one of its friends (a puppy, a sprout, a cat, a mushroom,
// a penguin, a bunny, a flower, an alien in a flying saucer), or "ball", a dark metal ball with
// big white-and-black eyes. Drawn on a <canvas> every frame, so it can squash, hop, roll and
// change its face.
//
//   const pal = Pal.create(host, { look: "flare", dark: true })
//   pal.setState("working")      // the resting state (STATES below)
//   pal.hold("finished", 5000)   // a state for a while, then back to the resting one
//   pal.emote("love")            // a short expression (EMOTES below)
//   pal.move("hop")              // a one-off movement (MOVES below)
//   pal.lookAt(x, y, origin)     // look toward a point, in origin's coordinates (default: the page)
//   pal.tick(dt)                 // advance dt seconds and draw; call it every frame
//   pal.setLook("kuro")          // switch looks
//   pal.setColors({ body, eyes, ring })  // custom colors ("" = the look's own)
//   Pal.mini("#3B9EFF", { look })  // a small still Buddy, as HTML
(function () {
  "use strict";

  // ---- The box: 200 × 200, with Buddy standing on y = 176 ----
  const BOX = 200, CX = 100, GROUND = 176;
  const BADGE = { x: 50, y: -104, size: 1.45 };
  // The ball look: a metal sphere standing on the floor, with big rounded eyes
  const BALL_R = 52;
  const BALL_EYE = { lx: -17.5, rx: 17.5, y: -58, w: 9.4, h: 12.2 };           // plush
  const BALL_GLOW_EYE = { lx: -15.5, rx: 15.5, y: -56, w: 6.4, h: 10.2 };      // glowing
  const BALL_EYES = "#F6F1DE";   // the whites of plush eyes, a soft cream
  const BALL_HALO = "#8FB8FF";   // the glow around it when nothing's going on
  // Two kinds of eyes for any look: glowing (soft light) or plush (cream whites, big black pupils, a shine)
  const EYE_STYLES = { glow: "Glowing", plush: "Plush" };
  const LOOKS = { flare: "Flare", pip: "Pip", sprout: "Sprout", kuro: "Kuro", shroom: "Shroom", puff: "Puff", bun: "Bun",
    bloom: "Bloom", zee: "Zee", ball: "Ball" };
  const DEFAULT_LOOK = "flare";
  const DEFAULT_BODY = { flare: "#FF6A1A", pip: "#FFF1E0", sprout: "#4FD58A", kuro: "#2C2245", shroom: "#FFE6C7", puff: "#1E2B5C",
    bun: "#FFB8CB", bloom: "#FFCC2E", zee: "#5B3FD9", ball: "#24272D" };
  const CREAM = "#FCF8EC", INK = "#0D0B0A";

  const BALL_D = `M${-BALL_R} ${-BALL_R} a${BALL_R} ${BALL_R} 0 1 0 ${BALL_R * 2} 0 a${BALL_R} ${BALL_R} 0 1 0 ${-BALL_R * 2} 0 Z`;
  let BALL = null, BALL_OUT = null;  // Path2D, made on first use
  function paths() {
    if (!BALL) { BALL = new Path2D(BALL_D); BALL_OUT = new Path2D(`M-600 -600 H600 V600 H-600 Z ${BALL_D}`); }
  }

  // ---- What Buddy can show ----
  // tab: the status light's color in this state (null: Buddy's own); eyes: the eye shape; loop: how it moves
  // while it stays; enter: a move when it starts; badge: a little bubble by its head.
  const STATES = {
    idle:      { label: "Idle", tab: null, eyes: "open", loop: "breathe" },
    working:   { label: "Working", tab: "#3B9EFF", eyes: "focus", loop: "busy", badge: "dots", gaze: "work" },
    thinking:  { label: "Thinking", tab: "#A78BFA", eyes: "open", loop: "ponder", badge: "cloud", gaze: "ponder" },
    searching: { label: "Searching", tab: "#6366F1", eyes: "open", loop: "scan", badge: "glass", gaze: "scan" },
    approval:  { label: "Needs approval", tab: "#F5A524", eyes: "wide", loop: "hops", badge: "bang", enter: "hop" },
    question:  { label: "Has a question", tab: "#22D3EE", eyes: "open", loop: "tilt", badge: "ask", gaze: "up" },
    error:     { label: "Error", tab: "#F4505E", eyes: "sad", loop: "droop", badge: "cross", enter: "shake", enterEyes: "squeeze", gaze: "down" },
    finished:  { label: "Finished", tab: "#34D399", eyes: "happy", loop: "bounce", badge: "check", enter: "hop" },
    ratelimit: { label: "Rate limited", tab: "#F59E0B", eyes: "tired", loop: "pant", badge: "hourglass", gaze: "down" },
    sleeping:  { label: "Sleeping", tab: "dim", eyes: "closed", loop: "sleep", gaze: "rest", tabLean: -0.5 },
    dizzy:     { label: "Dizzy", tab: "#F472B6", eyes: "spiral", loop: "woozy", enter: "roll2", gaze: "rest" },
    listening: { label: "Listening", tab: "#A78BFA", eyes: "wide", loop: "lean", badge: "bars", tabLean: 0.18 },
  };
  // Short expressions on top of the state
  const EMOTES = {
    // plush: what plush eyes add, like a blush, a little mouth, or a yawn's tear
    love:      { label: "Love", eyes: "heart", blush: true, move: "hop", loop: "sway", burst: "hearts", ms: 2000, plush: { mouth: "smile" } },
    proud:     { label: "Proud", eyes: "star", move: "puff", burst: "sparkles", tabLean: 0.35, ms: 1900, plush: { blush: true, mouth: "smile" } },
    surprised: { label: "Surprised", eyes: "round", mouth: "o", move: "jumpback", burst: "bang", ms: 1400 },
    wink:      { label: "Wink", eyes: "wink", move: "tilt", burst: "twinkle", ms: 1100, plush: { blush: true, mouth: "tongue" } },
    yawn:      { label: "Yawn", eyes: "squint", mouth: "yawn", move: "stretch", ms: 2200, plush: { tear: true } },
    // little reactions
    happy:     { label: "Happy", eyes: "happy", move: "hop", ms: 900 },
    boop:      { label: "Boop", eyes: "squeeze", move: "squish", ms: 700 },
  };
  const COLORS = Object.fromEntries(Object.entries(STATES).map(([k, s]) => [k, s.tab && s.tab !== "dim" ? s.tab : null]));
  const BLINKS = new Set(["open", "wide", "round", "focus", "tired", "sad"]);

  // ---- Little helpers ----
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wave = (t, period) => Math.sin((2 * Math.PI * t) / period);
  const EASE = {
    lin: (t) => t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
    io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  };
  function color(c, fallback) {
    let s = String(c || "");
    if (/^#[0-9a-f]{3}$/i.test(s)) s = "#" + [...s.slice(1)].map((x) => x + x).join("");
    return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : fallback;
  }
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const toHex = (a) => "#" + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const alpha = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };

  // ---- Movement ----
  const I = Object.freeze({ x: 0, y: 0, rot: 0, spin: 0, sx: 1, sy: 1 });
  const K = (at, o = {}, e = "io") => ({ ...I, ...o, at, e });
  function sample(frames, p) {
    let i = 0;
    while (i < frames.length - 2 && p >= frames[i + 1].at) i++;
    const a = frames[i], b = frames[i + 1];
    const t = EASE[b.e](clamp((p - a.at) / (b.at - a.at), 0, 1));
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rot: lerp(a.rot, b.rot, t),
      spin: lerp(a.spin, b.spin, t), sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t) };
  }
  const hopFrames = (h, sq) => [K(0), K(0.18, { sx: 1 + sq, sy: 1 - sq * 1.3 }, "out"),
    K(0.48, { y: -h, sx: 1 - sq * 0.5, sy: 1 + sq * 0.7 }, "out"), K(0.8, { y: 0 }, "in"),
    K(0.9, { sx: 1 + sq, sy: 1 - sq * 1.3 }, "out"), K(1)];
  const TURN = Math.PI * 2;
  const MOVES = {
    hop: { ms: 760, frames: hopFrames(22, 0.09) },
    squish: { ms: 560, frames: [K(0), K(0.22, { sx: 1.16, sy: 0.8 }, "out"), K(0.5, { sx: 0.95, sy: 1.07 }), K(0.76, { sx: 1.02, sy: 0.98 }), K(1)] },
    roll: { ms: 1150, frames: [K(0), K(0.14, { sx: 1.1, sy: 0.86 }, "out"), K(0.42, { y: -30, spin: -TURN / 2, sx: 0.96, sy: 1.04 }, "out"),
      K(0.7, { spin: -TURN }, "in"), K(0.8, { spin: -TURN, sx: 1.1, sy: 0.88 }, "out"), K(1, { spin: -TURN })] },
    roll2: { ms: 1500, frames: [K(0), K(0.12, { sx: 1.1, sy: 0.86 }, "out"), K(0.5, { y: -34, spin: -TURN }, "out"),
      K(0.8, { spin: -2 * TURN }, "in"), K(0.9, { spin: -2 * TURN, sx: 1.1, sy: 0.88 }, "out"), K(1, { spin: -2 * TURN })] },
    jumpback: { ms: 650, frames: [K(0), K(0.14, { y: -10, x: 4, sx: 0.92, sy: 1.12, rot: 0.05 }, "out"), K(0.42, { y: -12, x: 5, rot: 0.06 }),
      K(0.7, { x: 2, sx: 1.06, sy: 0.92 }, "in"), K(1)] },
    puff: { ms: 1100, frames: [K(0), K(0.25, { y: -3, sx: 1.07, sy: 1.08, rot: -0.04 }, "back"), K(0.8, { y: -3, sx: 1.06, sy: 1.07, rot: -0.04 }), K(1)] },
    tilt: { ms: 850, frames: [K(0), K(0.3, { rot: 0.13 }, "back"), K(0.75, { rot: 0.11 }), K(1)] },
    stretch: { ms: 2100, frames: [K(0), K(0.35, { sx: 0.93, sy: 1.12, rot: -0.05 }), K(0.62, { sx: 0.94, sy: 1.1, rot: -0.04 }),
      K(0.78, { sx: 1.05, sy: 0.94 }), K(1)] },
    shake: { ms: 700, fn: (p) => ({ ...I, x: Math.sin(p * Math.PI * 10) * 5 * (1 - p), rot: Math.sin(p * Math.PI * 10) * 0.04 * (1 - p) }) },
    wiggle: { ms: 900, fn: (p) => ({ ...I, rot: Math.sin(p * Math.PI * 6) * 0.1 * (1 - p) }) },
  };
  const SMALL_HOP = hopFrames(8, 0.06), TINY_HOP = hopFrames(5, 0.05);
  const LOOPS = {
    breathe: (t) => { const s = wave(t, 3.8); return { ...I, sx: 1 - 0.009 * s, sy: 1 + 0.018 * s }; },
    sleep: (t) => { const s = wave(t, 4.6); return { ...I, sx: 1.02 - 0.012 * s, sy: 0.97 + 0.03 * s }; },
    busy: (t) => { const b = Math.abs(Math.sin((Math.PI * t) / 0.62)); return { ...I, y: -2.4 * b, x: 0.8 * wave(t, 2.6), sx: 1 - 0.01 * b, sy: 1 + 0.02 * b }; },
    ponder: (t) => { const s = wave(t, 1.9); return { ...I, rot: 0.05 * wave(t, 3.6), y: -0.6 * (1 + s), sy: 1 + 0.012 * s }; },
    scan: (t, pal) => ({ ...I, rot: 0.05 * pal.look.x, x: 2 * pal.look.x, sy: 1 + 0.01 * wave(t, 1.1) }),
    hops: (t) => { const p = (t % 1.3) / 0.5; return p < 1 ? sample(SMALL_HOP, p) : { ...I, sy: 1 + 0.01 * wave(t, 1.3) }; },
    tilt: (t) => ({ ...I, rot: -0.13 + 0.025 * wave(t, 2.2), sy: 1 + 0.012 * wave(t, 2.2) }),
    droop: (t) => { const s = wave(t, 3.2); return { ...I, sx: 1.035 + 0.006 * s, sy: 0.95 + 0.012 * s, rot: 0.02 }; },
    bounce: (t) => { const p = (t % 0.95) / 0.55; return p < 1 ? sample(TINY_HOP, p) : I; },
    pant: (t) => { const s = wave(t, 0.85); return { ...I, sx: 1 - 0.014 * s, sy: 1 + 0.028 * s }; },
    woozy: (t) => ({ ...I, rot: 0.12 * wave(t, 1.15), x: 3 * wave(t + 0.3, 1.15), sy: 1 + 0.015 * wave(t, 0.6) }),
    lean: (t) => ({ ...I, rot: 0.07 + 0.015 * wave(t, 2.4), x: 1.5, sy: 1 + 0.012 * wave(t, 2.4) }),
    sway: (t) => ({ ...I, rot: 0.06 * wave(t, 1.25) }),
  };
  const blend = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rot: lerp(a.rot, b.rot, t),
    spin: lerp(a.spin, b.spin, t), sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t) });
  const combine = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, rot: a.rot + b.rot, spin: a.spin + b.spin, sx: a.sx * b.sx, sy: a.sy * b.sy });

  // ---- Drawing: the ball's metal, shaded once per size and color and reused ----
  const sprites = new Map();
  function ballSprite(ps, dark, body) {
    const key = `${ps.toFixed(3)}|${dark}|ball|${body}`;
    if (sprites.has(key)) return sprites.get(key);
    paths();
    const pad = 6, c = document.createElement("canvas"), size = BALL_R * 2 + pad * 2;
    c.width = Math.ceil(size * ps); c.height = Math.ceil(size * ps);
    const g = c.getContext("2d");
    const ox = (BALL_R + pad) * ps, oy = (BALL_R * 2 + pad) * ps;
    g.setTransform(ps, 0, 0, ps, ox, oy);
    metalBall(g, ps, dark, body);
    const out = { canvas: c, ox, oy };
    sprites.set(key, out);
    return out;
  }

  // The ball look: dark polished metal. A lit sphere, the room reflected across its top,
  // a sharp highlight where the light hits, and cool light along its lower edge.
  function metalBall(g, ps, dark, c) {
    const R = BALL_R, cy = -R;
    const base = g.createRadialGradient(-R * 0.34, cy - R * 0.46, R * 0.04, 0, cy, R * 1.04);
    base.addColorStop(0, mix(c, "#ffffff", 0.45)); base.addColorStop(0.25, mix(c, "#ffffff", 0.14));
    base.addColorStop(0.62, c); base.addColorStop(1, mix(c, "#000000", 0.6));
    g.fillStyle = base; g.fill(BALL);
    g.save(); g.clip(BALL);
    // The room, reflected: a bright band across the top, a dark horizon under it
    const band = g.createLinearGradient(0, cy - R, 0, cy + R * 0.3);
    band.addColorStop(0, alpha(mix(c, "#ffffff", 0.8), 0)); band.addColorStop(0.16, alpha(mix(c, "#ffffff", 0.85), 0.3));
    band.addColorStop(0.33, alpha(mix(c, "#ffffff", 0.6), 0.06)); band.addColorStop(0.4, "rgba(0,0,0,.28)"); band.addColorStop(0.62, "rgba(0,0,0,0)");
    g.fillStyle = band; g.fillRect(-R, cy - R, R * 2, R * 1.3);
    // Where the light hits: a soft glint, and a sharp one inside it
    g.save(); g.translate(-R * 0.36, cy - R * 0.5); g.rotate(-0.62); g.scale(1, 0.5);
    const soft = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.32);
    soft.addColorStop(0, "rgba(255,255,255,.75)"); soft.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = soft; g.beginPath(); g.arc(0, 0, R * 0.32, 0, TURN); g.fill();
    g.restore();
    const sharp = g.createRadialGradient(-R * 0.42, cy - R * 0.56, 0, -R * 0.42, cy - R * 0.56, R * 0.07);
    sharp.addColorStop(0, "rgba(255,255,255,.95)"); sharp.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sharp; g.beginPath(); g.arc(-R * 0.42, cy - R * 0.56, R * 0.07, 0, TURN); g.fill();
    g.restore();
    // Cool light along the lower right, and a little bounce from the floor
    innerLight(g, ps, -6, -5, 9, alpha(mix(c, "#9FB4D8", 0.6), 0.6), BALL, BALL_OUT);
    innerLight(g, ps, 0, -5, 7, dark ? "rgba(140,150,170,.25)" : "rgba(180,160,130,.3)", BALL, BALL_OUT);
    if (dark) {
      g.save(); g.clip(BALL);
      g.strokeStyle = "rgba(255,255,255,.16)"; g.lineWidth = 1.6; g.stroke(BALL);
      g.restore();
    }
  }

  // Light inside the body along one side: the outside of the body, shifted by (dx, dy) and
  // blurred, clipped to the body. Drawn as a shadow so it works in every browser.
  function innerLight(g, ps, dx, dy, blur, rgba, body, outside) {
    const far = 3000;
    g.save();
    g.clip(body);
    g.shadowColor = rgba; g.shadowBlur = blur * ps;
    g.shadowOffsetX = (far + dx) * ps; g.shadowOffsetY = dy * ps;
    g.translate(-far, 0);
    g.fillStyle = "#000"; g.fill(outside, "evenodd");
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function heartPath(g, s) {
    g.beginPath();
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(-s * 0.15, s * 0.22, -s, -s * 0.1, -s * 0.5, -s * 0.55);
    g.bezierCurveTo(-s * 0.22, -s * 0.8, 0, -s * 0.55, 0, -s * 0.35);
    g.bezierCurveTo(0, -s * 0.55, s * 0.22, -s * 0.8, s * 0.5, -s * 0.55);
    g.bezierCurveTo(s, -s * 0.1, s * 0.15, s * 0.22, 0, s * 0.35);
    g.closePath();
  }
  function starPath(g, outer, inner, points = 5) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer, a = (i * Math.PI) / points - Math.PI / 2;
      g[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  }
  function sparklePath(g, s) {
    g.beginPath();
    g.moveTo(0, -s);
    g.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0); g.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
    g.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0); g.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
    g.closePath();
  }

  /** One eye, centered on the origin. side: -1 for the left eye, 1 for the right.
   *  rounded: rounded-rectangle eyes instead of ovals (the ball's glowing ones). */
  function drawEye(g, kind, side, open, t, w, h, rounded = false, ink = CREAM, pupil = null, o = {}) {
    if (pupil && plushEye(g, kind, open, t, w, h, ink, pupil)) return;
    // Closed and squeezed plush and bead eyes are drawn with a finer line, like stitching
    const stroke = (lw) => { g.lineWidth = pupil ? lw * 0.5 : o.bead ? lw * 0.62 : lw; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };
    const blob = (cx, cy, rx, ry) => {
      const shape = () => {
        if (rounded) roundRect(g, cx - rx, cy - ry, rx * 2, Math.max(ry * 2, 0.1), Math.min(rx, ry) * 0.85);
        else { g.beginPath(); g.ellipse(cx, cy, rx, Math.max(ry, 0.05), 0, 0, TURN); }
      };
      shape(); g.fill();
      // Bead eyes: dark and glossy, with a shine
      if (o.bead && ry > 1.4) {
        g.save(); g.shadowColor = "transparent"; g.fillStyle = "rgba(255,255,255,.92)";
        g.beginPath(); g.ellipse(cx - rx * 0.3, cy - ry * 0.36, rx * 0.4, ry * 0.28, -0.3, 0, TURN); g.fill();
        g.beginPath(); g.arc(cx + rx * 0.32, cy + ry * 0.36, rx * 0.15, 0, TURN); g.fill();
        g.restore(); g.fillStyle = ink;
      }
      // The ball's eyes: a black pupil that looks where Buddy looks, with a little shine
      if (pupil && ry > 1.2) {
        g.save();
        g.shadowColor = "transparent";
        g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 0.7; shape(); g.stroke();   // a soft edge to the white
        shape(); g.clip();
        const prx = rx * 0.66, pry = ry * 0.74;   // a big oval pupil, like a plushie's
        const px = cx + pupil.x * rx * 0.3, py = cy + pupil.y * ry * 0.22 + ry * 0.08;
        g.fillStyle = "#121214"; g.beginPath(); g.ellipse(px, py, prx, pry, 0, 0, TURN); g.fill();
        g.fillStyle = "rgba(255,255,255,.95)";
        g.beginPath(); g.ellipse(px - prx * 0.22, py - pry * 0.45, prx * 0.34, pry * 0.26, -0.3, 0, TURN); g.fill();
        g.beginPath(); g.arc(px + prx * 0.35, py + pry * 0.3, prx * 0.12, 0, TURN); g.fill();
        g.restore();
        g.fillStyle = ink;
      }
    };
    g.fillStyle = ink; g.strokeStyle = o.line || ink;
    switch (kind) {
      case "wide": blob(0, 0, w * 1.2, h * 1.15 * open); return;
      case "round": blob(0, 0, h * 0.95, h * 0.95 * open); return;
      case "focus": blob(0, 1.5, w * 1.08, h * 0.6 * open); return;
      case "tired":
        g.save(); g.beginPath(); g.rect(-w * 2, -h * 0.12, w * 4, h * 2); g.clip();
        blob(0, 0, w * 1.05, h * open); g.restore(); return;
      case "sad": {
        const outer = side * w * 1.7, inner = -side * w * 1.7;
        g.save(); g.beginPath();
        g.moveTo(outer, -h * 0.05); g.lineTo(inner, -h * 0.75); g.lineTo(inner, h * 2); g.lineTo(outer, h * 2); g.closePath(); g.clip();
        blob(0, 0, w * 1.05, h * 0.92 * open); g.restore(); return;
      }
      case "happy": g.beginPath(); g.moveTo(-w * 1.3, h * 0.3); g.quadraticCurveTo(0, -h, w * 1.3, h * 0.3); stroke(w * 0.95); return;
      case "closed": g.beginPath(); g.moveTo(-w * 1.25, -h * 0.1); g.quadraticCurveTo(0, h * 0.8, w * 1.25, -h * 0.1); stroke(w * 0.75); return;
      case "squint": g.beginPath(); g.moveTo(-w * 1.35, 0); g.quadraticCurveTo(0, h * 0.4, w * 1.35, 0); stroke(w * 0.72); return;
      case "squeeze":
        g.beginPath(); g.moveTo(-side * w, -h * 0.55); g.lineTo(side * w * 0.95, 0); g.lineTo(-side * w, h * 0.55); stroke(w * 0.8); return;
      case "flat": g.beginPath(); g.moveTo(-w * 1.2, 0); g.lineTo(w * 1.2, 0); stroke(w * 0.8); return;
      case "spiral": {
        g.save(); g.rotate(t * 7);
        g.beginPath();
        const turns = 4.4 * Math.PI, R = w * 1.5;
        for (let a = 0; a <= turns; a += 0.2) {
          const r = 0.3 + (a / turns) * R;
          g[a ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
        }
        stroke(w * 0.42); g.restore(); return;
      }
      case "heart": {
        const s = h * 1.2 * (1 + 0.08 * Math.max(0, Math.sin(t * 11)));
        g.fillStyle = "#FF5E7E"; heartPath(g, s); g.fill(); return;
      }
      case "star":
        g.save(); g.rotate(0.15 * Math.sin(t * 5)); g.fillStyle = "#FFD15C";
        starPath(g, h * 1.05, h * 0.5); g.fill(); g.restore(); return;
      case "wink":
        if (side < 0) { g.beginPath(); g.moveTo(-w * 1.3, h * 0.3); g.quadraticCurveTo(0, -h, w * 1.3, h * 0.3); stroke(w * 0.95); return; }
        blob(0, 0, w, h); return;
      default: blob(0, 0, w, h * open);
    }
  }

  /** Plush eyes for love, pride, surprise and dizziness: cream whites with heart pupils, sparkly
   *  pupils, tiny startled ones or spirals. False for the shapes drawEye draws the usual way. */
  function plushEye(g, kind, open, t, w, h, ink, look) {
    const white = (rx, ry, inside) => {
      g.fillStyle = ink; g.beginPath(); g.ellipse(0, 0, rx, Math.max(ry, 0.05), 0, 0, TURN); g.fill();
      g.save();
      g.shadowColor = "transparent";
      g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 0.7; g.stroke();
      g.clip(); inside(rx, ry);
      g.restore();
    };
    const shine = (x, y, r) => { g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); g.ellipse(x, y, r, r * 0.75, -0.4, 0, TURN); g.fill(); };
    const ball = (x, y, rx, ry) => { g.fillStyle = "#121214"; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TURN); g.fill(); };
    switch (kind) {
      case "heart":   // a big pink heart for a pupil, beating
        white(w * 1.08, h * 1.02 * Math.max(open, 0.6), (rx, ry) => {
          const s = Math.min(rx, ry) * 1.05 * (1 + 0.1 * Math.max(0, Math.sin(t * 11)));
          g.translate(look.x * rx * 0.18, look.y * ry * 0.12 + s * 0.16);
          g.fillStyle = "#FF4F7B"; heartPath(g, s); g.fill();
          g.strokeStyle = "#D9305C"; g.lineWidth = 0.8; g.stroke();
          shine(-s * 0.42, -s * 0.36, s * 0.2);
          g.beginPath(); g.arc(s * 0.4, -s * 0.12, s * 0.08, 0, TURN); g.fill();
        });
        return true;
      case "star":    // big pupils looking up, full of sparkles
        white(w * 1.05, h * 1.02 * open, (rx, ry) => {
          const prx = rx * 0.76, pry = ry * 0.8, px = look.x * rx * 0.22, py = -ry * 0.06 + look.y * ry * 0.12;
          ball(px, py, prx, pry);
          g.save(); g.translate(px - prx * 0.3, py - pry * 0.3); g.rotate(0.3 * Math.sin(t * 4));
          g.fillStyle = "#fff"; sparklePath(g, prx * 0.62 * (0.9 + 0.12 * Math.sin(t * 9))); g.fill(); g.restore();
          g.save(); g.translate(px + prx * 0.42, py + pry * 0.4); g.rotate(-0.3 * Math.sin(t * 4));
          g.fillStyle = "#FFD15C"; starPath(g, prx * 0.28, prx * 0.12); g.fill(); g.restore();
        });
        return true;
      case "round":   // wide open, with tiny startled pupils
        white(h * 0.98, h * 1.06 * open, (rx, ry) => {
          const r = Math.min(rx, ry) * 0.36, px = look.x * rx * 0.3, py = look.y * ry * 0.22;
          ball(px, py, r, r);
          shine(px - r * 0.35, py - r * 0.4, r * 0.34);
        });
        return true;
      case "spiral":  // dizzy: dark spirals spinning in the whites
        white(w * 1.08, h * 1.02 * open, (rx, ry) => {
          const R = Math.min(rx, ry) * 0.92, turns = 4 * Math.PI;
          g.rotate(t * 7);
          g.beginPath();
          for (let a = 0; a <= turns; a += 0.2) {
            const r = 0.3 + (a / turns) * R;
            g[a ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
          }
          g.strokeStyle = "#121214"; g.lineWidth = R * 0.24; g.lineCap = "round"; g.stroke();
        });
        return true;
      default: return false;
    }
  }

  /** A tear drop, pointy end up. */
  function tearPath(g, s) {
    g.beginPath();
    g.moveTo(0, -s * 1.7);
    g.bezierCurveTo(s * 1.1, -s * 0.3, s, s, 0, s);
    g.bezierCurveTo(-s, s, -s * 1.1, -s * 0.3, 0, -s * 1.7);
    g.closePath();
  }

  // ======================= Friends =======================
  // Buddy's characters. Each has a body, shaded once and reused, and parts drawn live every
  // frame so they can move: ears and tails that swing on a spring as Buddy moves, a sprout and
  // petals that sway, a flame that flickers, a saucer that hovers. Rich, glossy colors with a darker outline. Their status light is a glow around them.

  const FRIEND_INK = "#1F1A2B";
  // Buddy's six colors, made rich for the friends; Black means each friend's own colors
  const WHITE = "#F7F4EF";
  const RICH = { "#f2f3f5": WHITE, "#4a90d9": "#3B82F6", "#4e9a5e": "#22C55E", "#8b6fe8": "#8B5CF6", "#e07aa0": "#F43F8E", "#1e1e20": "" };
  const lum = (h) => { const [r, gr, b] = rgb(h); return (0.299 * r + 0.587 * gr + 0.114 * b) / 255; };

  /** A smooth closed curve through points. */
  function smoothD(p) {
    const n = p.length, f = (v) => v.toFixed(2);
    let d = `M${f(p[0][0])} ${f(p[0][1])}`;
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
      d += ` C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
    }
    return d + " Z";
  }
  /** A soft mochi shape standing on the floor: rounder on top, flatter underneath. */
  function mochiD(w, h, top = 2.3, bottom = 3.8, n = 44) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TURN, c = Math.cos(a), s = Math.sin(a), e = s < 0 ? top : bottom;
      pts.push([Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * w / 2, -h / 2 + Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * h / 2]);
    }
    return smoothD(pts);
  }
  const ellipseD = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
  const pathCache = new Map();
  const fpath = (d) => { let p = pathCache.get(d); if (!p) { p = new Path2D(d); pathCache.set(d, p); } return p; };

  /** Glossy, candy-like color: lit from the upper left, deeper toward the lower right, a soft
   *  shine, and an outline in a darker shade of itself. box: [x, y, w, h] around the shape. */
  function candy(g, path, c, box, o = {}) {
    const [x, y, w, h] = box;
    const fill = g.createLinearGradient(x + w * 0.2, y, x + w * 0.7, y + h);
    fill.addColorStop(0, o.top || mix(c, "#ffffff", 0.38)); fill.addColorStop(0.5, c); fill.addColorStop(1, o.bottom || mix(c, "#1B0F33", 0.3));
    g.fillStyle = fill; g.fill(path);
    if (o.shine !== false) {
      g.save(); g.clip(path);
      const sx = x + w * (o.sx ?? 0.3), sy = y + h * (o.sy ?? 0.22), r = Math.min(w, h) * (o.sr ?? 0.3);
      const s = g.createRadialGradient(sx, sy, 0, sx, sy, r);
      s.addColorStop(0, `rgba(255,255,255,${o.shineA ?? 0.7})`); s.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = s; g.beginPath(); g.ellipse(sx, sy, r, r * 0.62, -0.5, 0, TURN); g.fill();
      g.restore();
    }
    if (o.line !== false) { g.strokeStyle = alpha(mix(c, "#1B0F33", 0.5), 0.5); g.lineWidth = o.lw || 1.2; g.stroke(path); }
  }

  /** A friend's body, shaded once per size and color and reused. */
  function friendSprite(ps, dark, f, c) {
    const key = `${ps.toFixed(3)}|${dark}|${f.id}|${c}`;
    if (sprites.has(key)) return sprites.get(key);
    const pad = 8, cv = document.createElement("canvas");
    const [bx, by, bw, bh] = f.box;
    cv.width = Math.ceil((bw + pad * 2) * ps); cv.height = Math.ceil((bh + pad * 2) * ps);
    const g = cv.getContext("2d");
    const ox = (-bx + pad) * ps, oy = (-by + pad) * ps;
    g.setTransform(ps, 0, 0, ps, ox, oy);
    const body = fpath(f.body), out = fpath(`M-600 -600 H600 V600 H-600 Z ${f.body}`);
    if (f.under) f.under(g, c);
    candy(g, body, c, f.box, { line: false, ...(f.fill ? f.fill(c) : {}) });
    // Soft shade on the lower right, light on the upper left, a little bounce from the floor
    innerLight(g, ps, -9, -8, 16, alpha(mix(c, "#1B0F33", 0.55), 0.32), body, out);
    innerLight(g, ps, 5, 4, 9, alpha(mix(c, "#ffffff", 0.75), 0.45), body, out);
    innerLight(g, ps, 0, -4, 7, alpha(mix(c, "#ffffff", 0.5), 0.25), body, out);
    if (f.decor) { g.save(); g.clip(body); f.decor(g, c, ps); g.restore(); }
    g.strokeStyle = alpha(mix(c, "#1B0F33", 0.55), 0.55); g.lineWidth = 1.3; g.stroke(body);
    if (dark && lum(c) < 0.35) { g.save(); g.clip(body); g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 2.2; g.stroke(body); g.restore(); }
    const res = { canvas: cv, ox, oy };
    sprites.set(key, res);
    return res;
  }

  const isHappy = (p) => p.state === "finished" || !!(p.emoteNow && ["love", "proud", "happy", "wink"].includes(p.emoteNow.name));
  const isSleepy = (p) => p.state === "sleeping";
  const LEAF = "M0 0 C6 -11 22 -17 36 -12 C29 -1 14 5 0 0 Z";
  function leaf(g, c, flip, rot, scale = 1) {
    g.save(); g.scale(flip * scale, scale); g.rotate(rot);
    candy(g, fpath(LEAF), c, [0, -17, 36, 22], { sx: 0.4, sy: 0.3, sr: 0.4 });
    g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = 1; g.lineCap = "round";
    g.beginPath(); g.moveTo(3, -1); g.quadraticCurveTo(17, -7, 31, -11); g.stroke();
    g.restore();
  }
  const PIP_EAR = "M0 0 C14 -1 24 16 22 34 C20 50 6 58 -6 52 C-16 46 -16 26 -12 12 C-9 3 -6 0 0 0 Z";
  const BUN_EAR = "M-11 0 C-15 -25 -12 -48 0 -54 C12 -48 15 -25 11 0 Z";
  const BUN_INNER = "M-5.5 -6 C-8 -24 -6 -40 0 -45 C6 -40 8 -24 5.5 -6 Z";
  const KURO_EAR = "M-62 -62 Q-60 -98 -52 -114 Q-47 -122 -40 -116 Q-26 -103 -8 -88 Z";
  const KURO_INNER = "M-53 -76 Q-52 -96 -47 -106 Q-38 -99 -25 -89 Z";
  const CAP = "M-80 4 C-84 -40 -44 -66 0 -66 C44 -66 84 -40 80 4 C52 14 -52 14 -80 4 Z";
  const BEAK = "M-8 -2 Q0 -6 8 -2 Q4 8 0 9 Q-4 8 -8 -2 Z";
  const FLAME = [[0, 0], [30, -2], [52, -14], [60, -36], [56, -60], [46, -80], [44, -100], [32, -88], [22, -102], [6, -124], [-10, -100], [-22, -90], [-40, -108], [-50, -82], [-58, -58], [-58, -32], [-48, -12], [-28, -1]];

  // box: the body's bounds; top: how tall it stands with its ears or cap; eyes: where they sit
  // and how big; accent: what Buddy's color changes ("body", or "part": ears, cap, petals);
  // tint: the color a theme gives that part.
  const FRIENDS = {
    pip: {
      label: "Pip", color: "#FFF1E0", part: "#9A5530", accent: "part", top: 98,
      body: mochiD(122, 98, 2.1, 3.2), box: [-61, -98, 122, 98],
      eyes: { lx: -23, rx: 23, y: -55, s: 1.12 }, mouthY: -33,
      tint: (c, white) => (white ? "#E6D6C2" : mix(c, "#2A1408", 0.12)),
      back(g, p, c, part) {   // a little tail that wags when Pip is happy
        const wag = isHappy(p) ? Math.sin(p.t * 16) * 0.45 : Math.sin(p.t * 2.2) * 0.12;
        g.save(); g.translate(-50, -16); g.rotate(-0.7 + wag);
        candy(g, fpath(ellipseD(-8, 0, 10, 7.5)), part, [-18, -7.5, 20, 15], { sr: 0.5 });
        g.restore();
      },
      front(g, p, c, part) {   // floppy ears that swing as Pip moves
        const swing = p.swing * 0.9, flap = isHappy(p) ? 0.12 * Math.sin(p.t * 9) : 0.03 * Math.sin(p.t * 1.7);
        for (const side of [-1, 1]) {
          g.save(); g.translate(side * 39, -84); g.scale(side, 1);
          g.rotate(-0.4 - flap + side * swing);
          candy(g, fpath(PIP_EAR), part, [-16, 0, 40, 58], { sx: 0.55, sy: 0.2, sr: 0.32 });
          g.restore();
        }
      },
      face(g, p) {   // a shiny nose
        const x = p.look.x * 4, y = -42 + p.look.y * 2;
        g.fillStyle = "#2B1A17"; g.beginPath(); g.ellipse(x, y, 5.6, 4, 0, 0, TURN); g.fill();
        g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.ellipse(x - 1.7, y - 1.4, 1.9, 1.1, -0.3, 0, TURN); g.fill();
      },
    },
    sprout: {
      label: "Sprout", color: "#4FD58A", accent: "body", top: 124,
      body: mochiD(124, 90, 2.1, 3.8), box: [-62, -90, 124, 90],
      eyes: { lx: -22, rx: 22, y: -44, s: 1.1 }, mouthY: -27,
      tint: (c, white) => (white ? "#E3F3DF" : mix(c, "#ffffff", 0.12)),
      fill: (c) => ({ top: mix(c, "#E4F55A", 0.6), bottom: mix(c, "#0F8F86", 0.42) }),
      under(g, c) { for (const x of [-30, 30]) candy(g, fpath(ellipseD(x, -5, 16, 8)), mix(c, "#0F7F66", 0.35), [x - 16, -13, 32, 16], { shine: false }); },
      back(g, p) {   // the sprout: a stem and two leaves that sway, droop when it sleeps, dance when it's happy
        const sway = p.swing * 0.9 + 0.07 * Math.sin(p.t * 1.4) + (isSleepy(p) ? 0.5 : 0) + (isHappy(p) ? 0.1 * Math.sin(p.t * 8) : 0);
        g.save(); g.translate(2, -84); g.rotate(sway);
        g.strokeStyle = "#249A3A"; g.lineWidth = 4.4; g.lineCap = "round";
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-2, -12, 1, -24); g.stroke();
        g.translate(1, -24);
        const flutter = 0.07 * Math.sin(p.t * 2.6);
        leaf(g, "#36C33A", 1, -0.3 + flutter, 1);
        leaf(g, "#36C33A", -1, -0.3 - flutter, 0.78);
        g.restore();
      },
    },
    kuro: {
      label: "Kuro", color: "#2C2245", accent: "body", eyeStyle: "plush", top: 120,
      body: mochiD(134, 92, 2.5, 4), box: [-67, -92, 134, 92],
      eyes: { lx: -26, rx: 26, y: -52, s: 1.05 }, mouthY: -35,
      tint: (c, white) => (white ? "#ECE8F3" : mix(c, "#140F22", 0.58)),
      back(g, p, c) {
        // A tail that curls up on the right and sways
        const sway = Math.sin(p.t * 1.6) * 5 + p.swing * 14 + (isHappy(p) ? Math.sin(p.t * 7) * 6 : 0);
        const tail = () => { g.beginPath(); g.moveTo(46, -16); g.bezierCurveTo(78, -14, 84 + sway * 0.4, -44, 68 + sway, -64); };
        g.save(); g.lineCap = "round";
        g.strokeStyle = mix(c, "#000000", 0.45); g.lineWidth = 14.5; tail(); g.stroke();
        g.strokeStyle = c; g.lineWidth = 12; tail(); g.stroke();
        g.strokeStyle = alpha(mix(c, "#ffffff", 0.55), 0.5); g.lineWidth = 2;
        g.beginPath(); g.moveTo(56, -20); g.bezierCurveTo(75, -19, 79 + sway * 0.4, -42, 66 + sway, -59); g.stroke();
        g.restore();
        // Pointed ears; the left one twitches now and then
        const twitch = (p.t % 4.7) < 0.3 ? Math.sin(((p.t % 4.7) / 0.3) * TURN) * 0.14 : 0;
        for (const side of [-1, 1]) {
          g.save(); g.scale(-side, 1);
          g.translate(-36, -88); g.rotate(p.swing * 0.25 * side + (side < 0 ? twitch : 0) + (isSleepy(p) ? 0.12 : 0)); g.translate(36, 88);
          candy(g, fpath(KURO_EAR), c, [-62, -122, 54, 60], { sx: 0.35, sy: 0.25 });
          g.fillStyle = mix(c, "#A970FF", 0.75); g.fill(fpath(KURO_INNER));
          g.restore();
        }
      },
      face(g, p, line) {   // whiskers and a little nose
        const dx = p.look.x * 5, dy = p.look.y * 3;
        g.save(); g.strokeStyle = alpha(line, 0.55); g.lineWidth = 1; g.lineCap = "round";
        for (const side of [-1, 1]) for (const [y1, y2] of [[-41, -45], [-37, -36]]) {
          g.beginPath(); g.moveTo(side * 44 + dx, y1 + dy); g.lineTo(side * 61 + dx, y2 + dy); g.stroke();
        }
        g.fillStyle = "#D08BFF"; g.lineJoin = "round"; g.lineWidth = 1.6; g.strokeStyle = "#D08BFF";
        g.beginPath(); g.moveTo(dx - 3, -42.5 + dy); g.lineTo(dx + 3, -42.5 + dy); g.lineTo(dx, -39.2 + dy); g.closePath(); g.fill(); g.stroke();
        g.restore();
      },
    },
    shroom: {
      label: "Shroom", color: "#FFE6C7", part: "#E5302B", accent: "part", top: 124,
      body: mochiD(90, 72, 2.6, 4), box: [-45, -72, 90, 72],
      eyes: { lx: -15, rx: 15, y: -32, s: 0.92 }, mouthY: -18,
      tint: (c, white) => (white ? "#F4EFE7" : c),
      decor(g) {   // the cap's shadow on the stem
        const sh = g.createLinearGradient(0, -54, 0, -38);
        sh.addColorStop(0, "rgba(130,60,25,.35)"); sh.addColorStop(1, "rgba(130,60,25,0)");
        g.fillStyle = sh; g.fillRect(-50, -72, 100, 34);
      },
      front(g, p, c, part) {
        // The cap, tipping as Shroom moves
        g.save(); g.translate(0, -58); g.rotate(p.swing * 0.45 + 0.03 * Math.sin(p.t * 1.2));
        const cap = fpath(CAP);
        candy(g, cap, part, [-82, -66, 164, 80], { sx: 0.3, sy: 0.18, sr: 0.22 });
        g.save(); g.clip(cap);
        g.fillStyle = lum(part) > 0.8 ? "#E2D9CC" : "#FFFFFF";
        for (const [x, y, r] of [[-44, -30, 10], [-8, -52, 8], [30, -40, 12], [60, -16, 6.5], [-66, -6, 5.5], [8, -20, 7], [-26, -6, 4.5]]) {
          g.beginPath(); g.ellipse(x, y, r, r * 0.88, 0, 0, TURN); g.fill();
        }
        g.restore(); g.restore();
        // Grass at its feet
        g.save(); g.strokeStyle = "#2FAE3A"; g.lineWidth = 3; g.lineCap = "round";
        for (const [x, dir] of [[-42, -1], [42, 1]]) for (let i = 0; i < 3; i++) {
          const bx = x + dir * i * 3.5, a = dir * (0.2 + i * 0.3) + 0.08 * Math.sin(p.t * 2 + i + x);
          g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo(bx + Math.sin(a) * 5, -7, bx + Math.sin(a) * 9, -14 + i * 2.5); g.stroke();
        }
        g.restore();
      },
    },
    puff: {
      label: "Puff", color: "#1E2B5C", accent: "body", top: 108,
      body: mochiD(124, 108, 2.2, 3.3), box: [-62, -108, 124, 108],
      eyes: { lx: -21, rx: 21, y: -65, s: 1.05 }, mouthY: -41, idleMouth: false,
      faceColor: () => "#FFFFFF",
      tint: (c, white) => (white ? "#8D96AE" : mix(c, "#0B1030", 0.5)),
      decor(g) {   // the white face and belly
        const w = g.createLinearGradient(-40, -92, 30, 0);
        w.addColorStop(0, "#FFFFFF"); w.addColorStop(1, "#D9E0EE");
        g.fillStyle = w; g.fill(fpath(`${ellipseD(-21, -65, 26, 24)} ${ellipseD(21, -65, 26, 24)} ${ellipseD(0, -34, 47, 36)}`));
      },
      back(g, p, c) {   // flippers that flap when it's happy
        const flap = isHappy(p) ? 0.45 * Math.abs(Math.sin(p.t * 11)) : 0.05 * Math.sin(p.t * 2);
        for (const side of [-1, 1]) {
          g.save(); g.translate(side * 52, -62); g.scale(side, 1); g.rotate(-0.42 - flap + side * p.swing * 0.6);
          candy(g, fpath(ellipseD(6, 24, 10, 26)), mix(c, "#000000", 0.1), [-4, -2, 20, 52], { sr: 0.4 });
          g.restore();
        }
      },
      front(g) { for (const x of [-22, 22]) candy(g, fpath(ellipseD(x, -2, 14, 6.5)), "#FF9B1C", [x - 14, -8.5, 28, 13], { sr: 0.5 }); },
      face(g, p) {   // the beak
        g.save(); g.translate(p.look.x * 4, -52 + p.look.y * 2);
        candy(g, fpath(BEAK), "#FF9B1C", [-8, -6, 16, 15], { sr: 0.5, sy: 0.25 });
        g.restore();
      },
    },
    bun: {
      label: "Bun", color: "#FFB8CB", accent: "body", top: 132,
      body: mochiD(126, 86, 2.2, 3.6), box: [-63, -86, 126, 86],
      eyes: { lx: -22, rx: 22, y: -42, s: 1.08 }, mouthY: -25,
      tint: (c, white) => (white ? "#FFF4F0" : mix(c, "#ffffff", 0.5)),
      back(g, p, c) {   // tall ears that bounce, and flop when it sleeps
        for (const side of [-1, 1]) {
          const bounce = p.swing * 1.1 + 0.05 * Math.sin(p.t * 2.3 + side) + (isSleepy(p) ? side * 0.55 : 0);
          g.save(); g.translate(side * 20, -78); g.rotate(side * 0.16 + bounce);
          candy(g, fpath(BUN_EAR), c, [-15, -54, 30, 54], { sx: 0.35, sy: 0.2 });
          g.fillStyle = mix(c, "#FF5C8D", 0.55); g.fill(fpath(BUN_INNER));
          g.restore();
        }
      },
    },
    flare: {
      label: "Flare", color: "#FF6A1A", accent: "body", live: true, top: 126,
      box: [-60, -126, 120, 126],
      eyes: { lx: -18, rx: 18, y: -40, s: 1.05 }, mouthY: -24,
      tint: (c, white) => (white ? "#7FB0FF" : c),
      drawBody(g, p, c) {   // a flame that flickers, smaller and calmer while it sleeps
        const t = p.t, calm = isSleepy(p) ? 0.4 : 1;
        const pts = FLAME.map(([x, y], i) => {
          const k = clamp((-y - 50) / 70, 0, 1) * calm;
          return [x + Math.sin(t * 6.3 + i * 1.9) * 2.6 * k, (isSleepy(p) && y < -60 ? -60 + (y + 60) * 0.6 : y) + Math.sin(t * 8.1 + i * 2.7) * 3.4 * k];
        });
        const path = new Path2D(smoothD(pts));
        if (p.dark) { g.save(); g.shadowColor = alpha(c, 0.7); g.shadowBlur = 14 * p.ps; g.fillStyle = c; g.fill(path); g.restore(); }
        const fill = g.createRadialGradient(0, -28, 4, 0, -44, 96);
        fill.addColorStop(0, mix(c, "#FFF8C8", 0.85)); fill.addColorStop(0.35, mix(c, "#FFD23F", 0.55));
        fill.addColorStop(0.72, c); fill.addColorStop(1, mix(c, "#A3100C", 0.4));
        g.fillStyle = fill; g.fill(path);
        g.save(); g.clip(path);
        const s = g.createRadialGradient(-28, -70, 0, -28, -70, 26);
        s.addColorStop(0, "rgba(255,255,255,.55)"); s.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = s; g.beginPath(); g.ellipse(-28, -70, 26, 16, -0.9, 0, TURN); g.fill();
        g.restore();
        g.strokeStyle = alpha(mix(c, "#7A0A06", 0.45), 0.5); g.lineWidth = 1.3; g.stroke(path);
      },
    },
    bloom: {
      label: "Bloom", color: "#FFCC2E", part: "#FF4D8D", accent: "part", top: 128,
      body: ellipseD(0, -68, 33, 33), box: [-33, -101, 66, 66],
      eyes: { lx: -12.5, rx: 12.5, y: -70, s: 0.95 }, mouthY: -57,
      tint: (c, white) => (white ? "#FFFFFF" : c),
      back(g, p, c, part) {
        // The stem and two leaves at its foot
        g.save(); g.lineCap = "round";
        const stem = () => { g.beginPath(); g.moveTo(0, -38); g.quadraticCurveTo(5, -18, 0, 0); };
        g.strokeStyle = "#17803A"; g.lineWidth = 8; stem(); g.stroke();
        g.strokeStyle = "#2DB24E"; g.lineWidth = 5.4; stem(); g.stroke();
        const sway = 0.05 * Math.sin(p.t * 1.3);
        g.translate(1, -6); leaf(g, "#32C24A", 1, -0.45 + sway, 0.95); leaf(g, "#32C24A", -1, -0.45 - sway, 0.85);
        g.restore();
        // Petals that open with joy and close when it sleeps
        const open = isSleepy(p) ? 0.8 : 1 + (isHappy(p) ? 0.05 * Math.sin(p.t * 7) : 0.02 * Math.sin(p.t * 1.6));
        const spin = 0.05 * Math.sin(p.t * 0.8) + p.swing * 0.3 + (isHappy(p) ? p.t * 0.6 : 0);
        g.save(); g.translate(0, -68);
        for (let i = 0; i < 6; i++) {
          g.save(); g.rotate(spin + (i * TURN) / 6); g.translate(0, -36 * open); g.scale(open, open);
          candy(g, fpath(ellipseD(0, 0, 19, 24)), part, [-19, -24, 38, 48], { sx: 0.42, sy: 0.24, sr: 0.34 });
          g.restore();
        }
        g.restore();
      },
    },
    zee: {
      label: "Zee", color: "#5B3FD9", part: "#7EDB45", accent: "body", top: 88, lift: (t) => 12 + 2.5 * Math.sin(t * 2.1),
      body: ellipseD(0, -31, 76, 21), box: [-76, -52, 152, 42],
      eyes: { lx: -10, rx: 10, y: -64, s: 0.92 }, mouthY: -53,
      faceColor: () => "#7EDB45",
      tint: (c, white) => (white ? "#CDD4E2" : c),
      under(g, c) { candy(g, fpath(ellipseD(0, -16, 44, 12)), mix(c, "#000000", 0.3), [-44, -28, 88, 24], { shine: false }); },
      decor(g, c) {   // a lighter band around the top of the saucer
        g.strokeStyle = alpha(mix(c, "#ffffff", 0.6), 0.45); g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, -34, 68, 13, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      },
      front(g, p, c, part) {   // the pilot, in its glass dome
        g.save();
        g.beginPath(); g.ellipse(0, -46, 40, 40, 0, Math.PI, TURN); g.closePath(); g.clip();
        candy(g, fpath(ellipseD(0, -62, 24, 24)), part, [-24, -86, 48, 48], { sr: 0.3 });
        g.restore();
      },
      over(g, p, c, part, tab) {
        // The glass
        const dome = new Path2D(); dome.ellipse(0, -46, 40, 40, 0, Math.PI, TURN); dome.closePath();
        const glass = g.createLinearGradient(-32, -86, 32, -46);
        glass.addColorStop(0, "rgba(220,240,255,.42)"); glass.addColorStop(1, "rgba(150,200,255,.14)");
        g.fillStyle = glass; g.fill(dome);
        g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1.2; g.stroke(dome);
        g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2.4; g.lineCap = "round";
        g.beginPath(); g.arc(0, -46, 32, Math.PI * 1.16, Math.PI * 1.38); g.stroke();
        // Lights around the rim twinkle in their own colors, and show the state's color when there is one
        for (let i = 0; i < 5; i++) {
          const x = -52 + i * 26, y = -31 + 14.5 * Math.sqrt(1 - (x / 76) ** 2);
          const own = ["#FFD43B", "#5CE1E6", "#FF6FB5"][(i + Math.floor(p.t * 2.5)) % 3];
          const col = mix(own, tab, p.haloA);
          g.save(); g.shadowColor = alpha(col, 0.9); g.shadowBlur = 6 * p.ps;
          g.fillStyle = col; g.beginPath(); g.arc(x, y, 3.4, 0, TURN); g.fill(); g.restore();
        }
        // A beam while it searches
        if (p.state === "searching") {
          const beam = g.createLinearGradient(0, -14, 0, 14 + 18);
          beam.addColorStop(0, alpha(tab, 0.4)); beam.addColorStop(1, alpha(tab, 0));
          g.fillStyle = beam; g.beginPath(); g.moveTo(-22, -14); g.lineTo(22, -14); g.lineTo(44, 30); g.lineTo(-44, 30); g.closePath(); g.fill();
        }
      },
    },
  };
  for (const [id, f] of Object.entries(FRIENDS)) f.id = id;


  // ---- A live Buddy ----
  let uid = 0;
  class Pal {
    constructor(host, opts = {}) {
      this.host = host;
      this.dark = !!opts.dark;
      // The part of the 200 × 200 box to show: all of it, a close crop (no room above for badges), or your own [x, y, w, h]
      this.view = Array.isArray(opts.view) ? opts.view : opts.view === "tight" ? [20, 46, 160, 136] : [0, 0, BOX, BOX];
      this.small = false;
      this.skin = LOOKS[opts.look] ? opts.look : DEFAULT_LOOK;
      this.colors = { body: "", eyes: "", ring: "" };
      this.eyeStyle = EYE_STYLES[opts.eyeStyle] ? opts.eyeStyle : "";   // "" = the look's own
      this.setColors(opts);
      this.tabNow = rgb(this.idleLight);   // the status light's color, fading between states
      this.calm = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
      this.t = 0;
      this.base = "idle";              // the resting state
      this.held = null;                // { state, until }: a state for a while
      this.state = "idle";
      this.stateAt = 0;
      this.prevLoop = null;            // to blend into a new loop
      this.moveNow = null;             // { name, at }
      this.emoteNow = null;            // { name, at, until }
      this.badge = null;               // { kind, at }
      this.parts = [];
      this.look = { x: 0, y: 0 }; this.lookTarget = { x: 0, y: 0 }; this.lastPointer = -1e9; this.glanceAt = 0;
      this.eyes = { kind: "open", next: null, open: 1, phase: 0 };   // phase: 0 steady, 1 closing, 2 opening
      this.blinkAt = 1.5 + Math.random() * 2; this.blinkT = -1; this.doubleBlink = false;
      this.tab = { a: 0, v: 0 }; this.prevTop = null; this.prevVel = null;
      this.haloA = 0;                  // how much a friend's status glow shows
      this.miniGlow = opts.glow ? color(opts.glow, "") : "";   // a still Buddy's glow, for the small ones
      this.emitAt = {};
      this.canvas = document.createElement("canvas");
      this.canvas.className = "pal-canvas";
      this.canvas.setAttribute("aria-hidden", "true");
      Object.assign(this.canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.appendChild(this.canvas);
      this.g = this.canvas.getContext("2d");
      this.resize();
      if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(host);
      this.id = ++uid;
    }

    resize() {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = this.host.clientWidth, h = this.host.clientHeight;
      this.canvas.width = Math.max(1, Math.round(w * dpr)); this.canvas.height = Math.max(1, Math.round(h * dpr));
      const [, , vw, vh] = this.view;
      this.ps = Math.min(this.canvas.width / vw, this.canvas.height / vh);   // device pixels per unit
      this.small = Math.min(w, h) < 46;
    }

    // -- Public --
    setState(name, replay = false) {
      if (!STATES[name]) name = "idle";
      if (name === this.base && !replay) return;
      this.base = name;
      if (!this.held) this.enter(name, replay);
    }
    hold(name, ms = 4000) {
      if (!STATES[name]) return;
      this.held = { state: name, until: this.t + ms / 1000 };
      this.enter(name, true);
    }
    emote(name, ms) {
      const e = EMOTES[name];
      if (!e) return;
      this.emoteNow = { name, at: this.t, until: this.t + (ms || e.ms) / 1000 };
      this.changeEyes();
      if (e.move) this.move(e.move);
      if (e.burst) this.burst(e.burst);
    }
    move(name) {
      if (!MOVES[name] || (this.calm && name !== "squish")) return;
      this.moveNow = { name, at: this.t };
    }
    setLook(look) { if (LOOKS[look]) this.skin = look; }
    /** body: the ball's metal; eyes: the ball's eyes; ring: the ball's glow, or the color a friend takes ("" = their own). */
    setColors(c = {}) {
      for (const k of ["body", "eyes", "ring"]) if (c[k] !== undefined) this.colors[k] = color(c[k], "");
    }
    get bodyColor() { return this.colors.body || DEFAULT_BODY[this.skin]; }
    setEyeStyle(style) { this.eyeStyle = EYE_STYLES[style] ? style : ""; }
    /** "glow", "plush" or "bead": as set, or the look's own (plush on the ball and Kuro, dark and glossy on the other friends). */
    get eyeMode() {
      if (this.eyeStyle) return this.eyeStyle;
      const f = FRIENDS[this.skin];
      return f ? f.eyeStyle || "bead" : "plush";
    }
    /** How tall Buddy stands, ears and all. */
    get height() { const f = FRIENDS[this.skin]; return f ? f.top : BALL_R * 2; }
    /** The status light's color when nothing's going on: the ball's glow, or a friend's own color. */
    get idleLight() { return FRIENDS[this.skin] ? this.friendPart : this.colors.ring || BALL_HALO; }
    get plush() { return this.eyeMode === "plush"; }
    /** How far the spring is swinging from where it rests: what moves a friend's ears, tail and leaves. */
    get swing() { return this.tab.a - (this.tabRest || 0); }
    // A friend's colors: its own, or Buddy's color made rich, on its body or on a part
    get friendAccent() { const r = this.colors.ring; return r ? (RICH[r] ?? r) : ""; }
    get friendBody() { const f = FRIENDS[this.skin], a = this.friendAccent; return f.accent === "body" && a ? f.tint(a, a === WHITE) : f.color; }
    get friendPart() { const f = FRIENDS[this.skin], a = this.friendAccent; return f.accent === "part" && a ? f.tint(a, a === WHITE) : f.part || f.color; }
    get faceColor() { const f = FRIENDS[this.skin]; return f.faceColor ? f.faceColor(this) : this.friendBody; }
    lookAt(px, py, origin) {
      const r = this.host.getBoundingClientRect();
      if (!r.width) return;
      const o = origin ? origin.getBoundingClientRect() : { left: 0, top: 0 };
      const [vx, vy] = this.view, s = this.ps / (window.devicePixelRatio || 1);
      const ex = r.left - o.left + (CX - vx) * s + (r.width - this.view[2] * s) / 2;
      const ey = r.top - o.top + (GROUND - 47 - vy) * s + (r.height - this.view[3] * s);
      this.lookTarget = { x: Math.tanh((px - ex) / 240), y: Math.tanh((py - ey) / 180) };
      this.lastPointer = this.t;
    }
    /** The state color, for a glow behind Buddy. */
    get color() { return COLORS[this.state] || null; }

    // -- Inside --
    enter(name, replay) {
      const was = this.state;
      if (name === was && !replay) return;
      this.prevLoop = { fn: LOOPS[STATES[was].loop], at: this.t };
      this.state = name; this.stateAt = this.t;
      const s = STATES[name];
      this.badge = s.badge ? { kind: s.badge, at: this.t } : null;
      if (s.enter) this.move(s.enter);
      if (name === "finished") this.burst("sparkles");
      this.emitAt = {};
      this.changeEyes();
    }
    eyeKind() {
      const e = this.emoteNow && EMOTES[this.emoteNow.name];
      if (e && e.eyes) return e.eyes;
      const s = STATES[this.state];
      if (s.enterEyes && this.t - this.stateAt < 1.4) return s.enterEyes;
      return s.eyes;
    }
    // A new eye shape blinks in: close, swap, open
    changeEyes() {
      const want = this.eyeKind();
      if (want === this.eyes.kind && !this.eyes.next) return;
      this.eyes.next = want;
      if (this.eyes.phase !== 1) this.eyes.phase = 1;
    }

    burst(kind) {
      if (this.small) return;
      const rnd = (a, b) => a + Math.random() * (b - a);
      const add = (p) => this.parts.push({ age: 0, rot: 0, vr: 0, ...p });
      if (kind === "hearts") for (let i = 0; i < 4; i++) add({ kind: "heart", x: rnd(70, 130), y: rnd(70, 84), vx: rnd(-10, 10), vy: rnd(-34, -24), life: rnd(1.3, 1.8), size: rnd(5.5, 8), delay: i * 0.18, color: "#FF5E7E" });
      if (kind === "sparkles") for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TURN + rnd(-0.3, 0.3), r = rnd(66, 82);
        add({ kind: "sparkle", x: CX + Math.cos(a) * r, y: 124 + Math.sin(a) * r * 0.75, vx: Math.cos(a) * 10, vy: Math.sin(a) * 8 - 6, life: rnd(0.8, 1.2), size: rnd(4, 6.5), delay: rnd(0, 0.25), color: i % 3 ? "#FFD15C" : "#FFFFFF" });
      }
      if (kind === "twinkle") add({ kind: "sparkle", x: 62, y: 112, vx: -6, vy: -8, life: 0.9, size: 5.5, delay: 0.15, color: "#FFD15C" });
      if (kind === "bang") for (let i = 0; i < 3; i++) add({ kind: "line", x: CX - 2, y: 58, a: -Math.PI / 2 + (i - 1) * 0.55, life: 0.55, size: 9, delay: 0.05, color: CREAM });
    }
    emit(kind, every, make) {
      if (this.small || this.calm) return;
      if (this.t < (this.emitAt[kind] || 0)) return;
      this.emitAt[kind] = this.t + every;
      this.parts.push({ age: 0, rot: 0, vr: 0, delay: 0, ...make() });
    }

    tick(dt) {
      dt = clamp(dt, 0, 0.05);
      this.t += dt;
      const t = this.t;
      if (this.held && t >= this.held.until) { this.held = null; this.enter(this.base, false); }
      if (this.emoteNow && t >= this.emoteNow.until) { this.emoteNow = null; this.changeEyes(); }
      if (STATES[this.state].enterEyes && t - this.stateAt >= 1.4 && this.eyes.kind !== this.eyeKind()) this.changeEyes();
      this.updateEyes(dt);
      this.updateGaze(dt);
      const T = this.pose(t);
      this.updateTab(dt, T);
      this.updateParticles(dt);
      this.draw(T);
    }

    updateEyes(dt) {
      const e = this.eyes;
      if (e.phase === 1) { e.open -= dt / 0.07; if (e.open <= 0.08) { e.open = 0.08; if (e.next) { e.kind = e.next; e.next = null; } e.phase = 2; } }
      else if (e.phase === 2) { e.open += dt / 0.12; if (e.open >= 1) { e.open = 1; e.phase = 0; } }
      // Blinking, now and then (sometimes twice)
      if (e.phase === 0 && BLINKS.has(e.kind) && this.t >= this.blinkAt) {
        e.phase = 1;
        this.doubleBlink = !this.doubleBlink && Math.random() < 0.2;
        this.blinkAt = this.t + (this.doubleBlink ? 0.32 : 2.4 + Math.random() * 3.6);
      }
    }

    updateGaze(dt) {
      const s = STATES[this.state], t = this.t;
      let target = this.lookTarget;
      switch (s.gaze) {
        case "work": target = { x: 0.35 + 0.2 * Math.sin(t * 0.9), y: 0.45 }; break;
        case "ponder": target = { x: Math.floor(t / 2.4) % 2 ? 0.6 : -0.55, y: -0.7 }; break;
        case "scan": target = { x: 0.95 * wave(t, 2.2), y: 0.1 }; break;
        case "up": target = { x: this.lookTarget.x * 0.5, y: -0.35 }; break;
        case "down": target = { x: 0, y: 0.45 }; break;
        case "rest": target = { x: 0, y: 0.15 }; break;
        default:
          // No pointer for a while: look around on its own
          if (t - this.lastPointer > 3) {
            if (t >= this.glanceAt) {
              this.glanceAt = t + 2.5 + Math.random() * 3;
              this.glance = Math.random() < 0.35 ? { x: 0, y: 0 } : { x: Math.random() * 1.2 - 0.6, y: Math.random() * 0.7 - 0.3 };
            }
            target = this.glance || { x: 0, y: 0 };
          }
      }
      const k = 1 - Math.exp(-dt * 9);
      this.look.x += (target.x - this.look.x) * k;
      this.look.y += (target.y - this.look.y) * k;
    }

    pose(t) {
      const s = STATES[this.state];
      const e = this.emoteNow && EMOTES[this.emoteNow.name];
      let loop = LOOPS[(e && e.loop) || s.loop](t, this);
      if (this.prevLoop) {
        const w = (t - this.prevLoop.at) / 0.45;
        if (w >= 1) this.prevLoop = null; else loop = blend(this.prevLoop.fn(t, this), loop, EASE.io(w));
      }
      if (this.calm) loop = blend(I, loop, 0.3);
      let T = loop;
      if (this.moveNow) {
        const m = MOVES[this.moveNow.name], p = (t - this.moveNow.at) / (m.ms / 1000);
        if (p >= 1) this.moveNow = null;
        else T = combine(T, m.fn ? m.fn(p) : sample(m.frames, p));
      }
      return T;
    }

    // The tab lags behind the body and settles like a spring
    updateTab(dt, T) {
      if (dt <= 0) return;
      const top = { x: T.x, y: T.y - this.height * T.sy };
      if (this.prevTop) {
        const vel = { x: (top.x - this.prevTop.x) / dt, y: (top.y - this.prevTop.y) / dt };
        if (this.prevVel) {
          const ax = clamp((vel.x - this.prevVel.x) / dt, -3000, 3000), ay = clamp((vel.y - this.prevVel.y) / dt, -3000, 3000);
          const s = STATES[this.state], e = this.emoteNow && EMOTES[this.emoteNow.name];
          const rest = (e && e.tabLean) || s.tabLean || 0;
          this.tabRest = rest;
          const force = -170 * (this.tab.a - rest) - 9 * this.tab.v + 0.00045 * ay - 0.0007 * ax;
          this.tab.v += force * dt;
          this.tab.a = clamp(this.tab.a + this.tab.v * dt, -0.75, 0.75);
        }
        this.prevVel = vel;
      }
      this.prevTop = top;
      // Fade the status light toward this state's color
      const s = STATES[this.state], idle = this.idleLight;
      const want = rgb(s.tab === "dim" ? mix(idle, "#000000", 0.35) : s.tab ? s.tab : idle);
      const k = 1 - Math.exp(-dt * 7);
      this.tabNow = this.tabNow.map((v, i) => v + (want[i] - v) * k);
      this.haloA += ((s.tab && s.tab !== "dim" ? 1 : 0) - this.haloA) * k;
    }

    updateParticles(dt) {
      const s = this.state, t = this.t;
      if (s === "sleeping") this.emit("z", 1.4, () => ({ kind: "z", x: 128, y: 74, vx: 9, vy: -13, life: 2.6, size: 7, color: "#9AA0AA" }));
      if (s === "ratelimit") this.emit("sweat", 1.9, () => ({ kind: "drop", x: 158, y: 92, vx: 2, vy: 16, life: 1.3, size: 4.2, color: "#8FD3FF" }));
      if (s === "error") this.emit("puff", t - this.stateAt < 3 ? 0.8 : 2.4, () => ({ kind: "puff", x: 96 + Math.random() * 14, y: 64, vx: Math.random() * 8 - 4, vy: -16, life: 1.4, size: 3.5, color: "#8D9096" }));
      for (const p of this.parts) {
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.age += dt;
        if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.kind === "heart") p.x += Math.sin(p.age * 6) * 0.25;
        if (p.kind === "sparkle") { p.vx *= 0.96; p.vy *= 0.96; }
      }
      this.parts = this.parts.filter((p) => p.age < p.life);
    }

    // -- Drawing --
    draw(T) {
      const g = this.g, ps = this.ps, cw = this.canvas.width, ch = this.canvas.height;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cw, ch);
      if (cw < 2) return;
      const [vx, vy, vw, vh] = this.view;
      // Unit space: the view box fills the canvas, centered across and standing on the bottom
      const ox = (cw - vw * ps) / 2 - vx * ps, oy = ch - vh * ps - vy * ps;
      g.setTransform(ps, 0, 0, ps, ox, oy);
      const tabHex = toHex(this.tabNow);
      const f = FRIENDS[this.skin], lift = f && f.lift ? f.lift(this.t) : 0;   // Zee hovers
      if (!this.dark) this.drawShadow(g, lift ? { ...T, y: T.y - lift } : T);
      // Body transform: rot pivots on the floor, spin on the middle
      const ball = !f, pivot = this.height / 2;
      const turn = () => { g.translate(0, -pivot); g.rotate(T.spin); g.translate(0, pivot); };
      g.save();
      g.translate(CX + T.x, GROUND + T.y - lift);
      g.rotate(T.rot);
      if (!ball) turn();
      g.scale(T.sx, T.sy);
      if (f) this.drawFriend(g, f, tabHex);
      else {
        this.drawHalo(g, tabHex, false);
        const sp = ballSprite(ps, this.dark, this.bodyColor);
        g.drawImage(sp.canvas, -sp.ox / ps, -sp.oy / ps, sp.canvas.width / ps, sp.canvas.height / ps);
        this.drawHalo(g, tabHex, true);
        turn();   // a rolling ball: the light on the metal stays put, its face goes round
        this.drawFace(g);
      }
      if (this.state === "dizzy") this.drawOrbit(g);
      g.restore();
      // Badge rides along with the body but doesn't squash
      if (this.badge && !this.small) {
        const bx = f ? f.box[2] * 0.4 : BADGE.x, by = f ? -Math.min(f.top, 118) + 8 : BADGE.y;
        g.save();
        g.translate(CX + T.x + bx, GROUND + T.y - lift + by * T.sy + Math.sin(this.t * 2.4) * 1.4);
        this.drawBadge(g, this.badge, STATES[this.state].tab || tabHex);
        g.restore();
      }
      for (const p of this.parts) if (p.delay <= 0) this.drawPart(g, p);
    }

    // The shadow falls to the lower right, darkest where Buddy touches the floor
    drawShadow(g, T) {
      const k = 1 - clamp(-T.y / 34, 0, 1) * 0.65;
      const f = FRIENDS[this.skin];
      const w = f ? Math.max(0.45, f.box[2] / 150) : 0.7;   // the shadow's width, for each look's size
      const blob = (x, y, rx, ry, stops) => {
        g.save();
        g.translate(CX + T.x * 0.6 + x * w, GROUND + y);
        g.scale(rx * w * k * T.sx, ry * k);
        const sh = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        for (const [at, a] of stops) sh.addColorStop(at, `rgba(66,50,36,${a * k})`);
        g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 1, 0, TURN); g.fill();
        g.restore();
      };
      blob(8, -1, 86, 7, [[0, 0.22], [0.6, 0.1], [1, 0]]);
      blob(40, -7, 62, 11, [[0, 0.66], [0.55, 0.44], [0.75, 0.2], [0.88, 0.08], [1, 0]]);
      blob(6, 0, 42, 2.4, [[0, 0.28], [1, 0]]);
    }

    // The ball's status light: a glow all around it, and light along its edge, in the state's color
    drawHalo(g, c, edge) {
      const R = BALL_R, sleeping = this.state === "sleeping";
      const busy = STATES[this.state].tab && !sleeping;
      const a = (sleeping ? 0.35 : 1) * (busy ? 0.82 + 0.18 * Math.sin(this.t * 3.2) : 0.75);
      g.save();
      if (!edge) {
        const glow = g.createRadialGradient(0, -R, R * 0.9, 0, -R, R * 1.38);
        glow.addColorStop(0, alpha(c, 0.62 * a)); glow.addColorStop(0.45, alpha(c, 0.22 * a)); glow.addColorStop(1, alpha(c, 0));
        g.fillStyle = glow; g.beginPath(); g.arc(0, -R, R * 1.38, 0, TURN); g.fill();
      } else {
        g.globalAlpha = a;
        g.shadowColor = alpha(c, 0.9); g.shadowBlur = 8 * this.ps;
        const rim = g.createLinearGradient(-R, -2 * R, R, 0);
        rim.addColorStop(0, alpha(mix(c, "#ffffff", 0.35), 0.55)); rim.addColorStop(0.5, alpha(c, 0.75)); rim.addColorStop(1, alpha(mix(c, "#ffffff", 0.2), 0.95));
        g.strokeStyle = rim; g.lineWidth = 2.2;
        g.beginPath(); g.arc(0, -R, R - 0.9, 0, TURN); g.stroke();
      }
      g.restore();
    }

    // -- A friend: its glow, the parts behind it, its body, the parts in front, its face --
    drawFriend(g, f, tab) {
      const body = this.friendBody, part = this.friendPart, ps = this.ps;
      this.drawFriendHalo(g, f, this.miniGlow || tab, this.miniGlow ? 0.8 : this.haloA);
      g.shadowColor = "transparent";
      if (f.back) f.back(g, this, body, part);
      if (f.live) f.drawBody(g, this, body);
      else {
        const sp = friendSprite(ps, this.dark, f, body);
        g.drawImage(sp.canvas, -sp.ox / ps, -sp.oy / ps, sp.canvas.width / ps, sp.canvas.height / ps);
      }
      if (f.front) f.front(g, this, body, part);
      this.drawFriendFace(g, f);
      if (f.over) f.over(g, this, body, part, tab);
    }

    // A friend's status light: a soft glow all around it in the state's color, breathing while busy
    drawFriendHalo(g, f, c, strength) {
      if (strength < 0.02) return;
      const a = strength * (0.78 + 0.22 * Math.sin(this.t * 3.2)) * (this.state === "sleeping" ? 0.4 : 1);
      const cy = -f.top * 0.45, r = Math.max(f.box[2], f.top) * 0.7;
      const glow = g.createRadialGradient(0, cy, r * 0.3, 0, cy, r);
      glow.addColorStop(0, alpha(c, 0.5 * a)); glow.addColorStop(0.6, alpha(c, 0.18 * a)); glow.addColorStop(1, alpha(c, 0));
      g.fillStyle = glow; g.beginPath(); g.arc(0, cy, r, 0, TURN); g.fill();
    }

    drawFriendFace(g, f) {
      const e = this.emoteNow && EMOTES[this.emoteNow.name];
      const lx = this.look.x, ly = this.look.y, t = this.t, mode = this.eyeMode, plush = mode === "plush";
      const s = f.eyes.s, W = (plush ? 7.8 : mode === "glow" ? 5 : 6) * s, H = (plush ? 9.8 : 8.4) * s;
      const mx = plush ? 3.5 : 5, my = plush ? 2.5 : 3.5;
      const x1 = f.eyes.lx + lx * mx, x2 = f.eyes.rx + lx * mx, y = f.eyes.y + ly * my;
      const darkFace = lum(this.faceColor) < 0.42;
      const line = darkFace ? "#F4EFFF" : FRIEND_INK;   // closed eyes and mouths
      const ink = plush ? BALL_EYES : darkFace ? "#FFFFFF" : FRIEND_INK;
      // Rosy cheeks, always
      for (const [bx, by] of [[x1 - W * 1.15, y + H + 1.5], [x2 + W * 1.15, y + H + 1.5]]) {
        const b = g.createRadialGradient(bx, by, 0, bx, by, 6.5);
        b.addColorStop(0, `rgba(255,95,135,${darkFace ? 0.4 : 0.55})`); b.addColorStop(1, "rgba(255,95,135,0)");
        g.fillStyle = b; g.beginPath(); g.ellipse(bx, by, 6.5, 3.8, 0, 0, TURN); g.fill();
      }
      g.save();
      g.shadowColor = mode === "glow" && darkFace ? "rgba(255,255,255,.8)" : "transparent"; g.shadowBlur = 6 * this.ps;
      for (const [x, side] of [[x1, -1], [x2, 1]]) {
        g.save(); g.translate(x, y);
        drawEye(g, this.eyes.kind, side, this.eyes.open, t, W, H, false, ink, plush ? { x: lx, y: ly } : null, { bead: mode === "bead", line });
        g.restore();
      }
      g.restore();
      if (f.face) { g.save(); f.face(g, this, line); g.restore(); }
      // The mouth: an expression's, or a small one that follows the state
      const extra = (e && e.plush) || {};
      const mouth = e && (e.mouth || extra.mouth), cx = (x1 + x2) / 2, mY = f.mouthY + ly * 2;
      g.save();
      if (mouth && this.eyes.phase !== 1) {
        const p = (t - this.emoteNow.at) / ((this.emoteNow.until - this.emoteNow.at) || 1);
        const m = mouth === "yawn" ? Math.sin(Math.PI * clamp((p - 0.12) / 0.62, 0, 1)) : clamp(p * 6, 0, 1);
        if (m > 0.05) this.drawPlushMouth(g, mouth, cx, mY, m, line);
        if (extra.tear && m > 0.35) {
          g.save(); g.translate(x2 + W * 1.4, y + 1 + (m - 0.35) * 3); g.globalAlpha = clamp((m - 0.35) * 3, 0, 1);
          g.fillStyle = "#7CC8FF"; tearPath(g, 2.8); g.fill();
          g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(-0.7, 0, 0.6, 0, TURN); g.fill();
          g.restore();
        }
      } else if (f.idleMouth !== false) this.drawIdleMouth(g, cx, mY, line);
      g.restore();
    }

    drawIdleMouth(g, cx, my, line) {
      const st = this.state;
      if (st === "sleeping") return;
      g.lineCap = "round"; g.strokeStyle = line; g.fillStyle = line; g.lineWidth = 1.6;
      if (st === "approval" || st === "listening" || st === "question") {
        g.beginPath(); g.ellipse(cx, my + 1.4, 1.9, 2.3, 0, 0, TURN); g.fill(); return;
      }
      const bend = st === "error" ? -2.6 : st === "ratelimit" ? 0 : 3, y0 = my + (bend < 0 ? 1.6 : 0);
      g.beginPath(); g.moveTo(cx - 3.8, y0); g.quadraticCurveTo(cx, y0 + bend, cx + 3.8, y0); g.stroke();
    }

    drawFace(g) {
      const e = this.emoteNow && EMOTES[this.emoteNow.name];
      const lx = this.look.x, ly = this.look.y, t = this.t;
      const plush = this.plush, E = plush ? BALL_EYE : BALL_GLOW_EYE;
      const mx = plush ? 5 : 10, my = plush ? 3.5 : 7;   // plush eyes move less; their pupils move
      const x1 = E.lx + lx * mx, x2 = E.rx + lx * mx, y = E.y + ly * my;
      // On a round face, the eye nearer the edge narrows
      const s1 = 1 - 0.22 * Math.max(0, -lx), s2 = 1 - 0.22 * Math.max(0, lx);
      const kind = this.eyes.kind, open = this.eyes.open;
      const extra = (e && plush && e.plush) || {};
      const mouth = e && (e.mouth || extra.mouth);
      if (e && (e.blush || extra.blush)) {
        // Plush cheeks sit below the bigger eyes
        const cheeks = plush ? [[x1 - E.w * 0.75, y + E.h + 1.5], [x2 + E.w * 0.75, y + E.h + 1.5]] : [[x1 - 7.5, y + 9.5], [x2 + 7.5, y + 9.5]];
        for (const [bx, by] of cheeks) {
          const b = g.createRadialGradient(bx, by, 0, bx, by, 6.5);
          b.addColorStop(0, "rgba(255,105,140,.55)"); b.addColorStop(1, "rgba(255,105,140,0)");
          g.fillStyle = b; g.beginPath(); g.ellipse(bx, by, 6.5, 3.6, 0, 0, TURN); g.fill();
        }
      }
      const ink = plush ? BALL_EYES : this.colors.eyes || "#FFFFFF";
      g.save();
      g.shadowColor = plush ? "rgba(255,255,255,.35)" : kind === "heart" ? "rgba(255,94,126,.6)" : kind === "star" ? "rgba(255,209,92,.6)"
        : this.colors.eyes ? alpha(this.colors.eyes, 0.7) : "rgba(255,255,255,.8)";
      g.shadowBlur = (plush ? 2.5 : 6) * this.ps;
      for (const [x, side, sx] of [[x1, -1, s1], [x2, 1, s2]]) {
        g.save(); g.translate(x, y); g.scale(sx, 1);
        drawEye(g, kind, side, open, t, E.w, E.h, !plush, ink, plush ? { x: lx, y: ly } : null);
        g.restore();
      }
      // A mouth, for surprise and yawns (and, with plush eyes, a smile or a cheeky tongue)
      if (mouth && this.eyes.phase !== 1) {
        const p = (t - this.emoteNow.at) / ((this.emoteNow.until - this.emoteNow.at) || 1);
        const m = mouth === "yawn" ? Math.sin(Math.PI * clamp((p - 0.12) / 0.62, 0, 1)) : clamp(p * 6, 0, 1);
        const cx = (x1 + x2) / 2, my = plush ? y + E.h + 4.5 : y + 16;
        g.shadowColor = "transparent";
        if (m > 0.05 && plush) this.drawPlushMouth(g, mouth, cx, my, m, ink);
        else if (m > 0.05) {
          const rx = mouth === "yawn" ? 4 : 2.6, ry = mouth === "yawn" ? 6.5 * m : 3 * m;
          g.beginPath(); g.ellipse(cx, my + ry * 0.4, rx, Math.max(ry, 0.6), 0, 0, TURN);
          g.fillStyle = INK; g.fill(); g.strokeStyle = CREAM; g.lineWidth = 1.6; g.stroke();
        }
        // A sleepy tear at the corner of an eye, at the top of the yawn
        if (extra.tear && m > 0.35) {
          g.save(); g.translate(x2 + E.w * 1.3, y + 1 + (m - 0.35) * 3); g.globalAlpha = clamp((m - 0.35) * 3, 0, 1);
          g.fillStyle = "#A8DBFF"; tearPath(g, 2.8); g.fill();
          g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(-0.7, 0, 0.6, 0, TURN); g.fill();
          g.restore();
        }
      }
      g.restore();
    }

    drawPlushMouth(g, kind, cx, my, m, ink) {
      g.lineCap = "round"; g.lineJoin = "round";
      const smile = (half) => {
        g.beginPath(); g.moveTo(cx - half, my); g.quadraticCurveTo(cx, my + half * 0.85, cx + half, my);
        g.strokeStyle = ink; g.lineWidth = 1.5; g.stroke();
      };
      if (kind === "smile") return smile(5.4 * m);
      if (kind === "tongue") {   // a small smile with the tip of a tongue out
        g.fillStyle = "#FF7A9A";
        g.beginPath(); g.ellipse(cx + 1.6, my + 2.4, 2.3, 2.9 * m, 0, 0, TURN); g.fill();
        g.strokeStyle = "rgba(200,60,95,.8)"; g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(cx + 1.6, my + 1); g.lineTo(cx + 1.6, my + 1 + 2.4 * m); g.stroke();
        return smile(5);
      }
      // "o" and "yawn": an open mouth, dark inside, with a pink tongue when it's a yawn
      const yawn = kind === "yawn", rx = yawn ? 4.6 : 3.4, ry = (yawn ? 7.4 : 4.4) * m, oy = my + ry * 0.45;
      g.save();
      g.beginPath(); g.ellipse(cx, oy, rx, Math.max(ry, 0.6), 0, 0, TURN);
      g.fillStyle = "#1B1013"; g.fill();
      if (yawn) { g.clip(); g.fillStyle = "#FF7A9A"; g.beginPath(); g.ellipse(cx, oy + ry * 0.75, rx * 0.8, ry * 0.5, 0, 0, TURN); g.fill(); }
      g.restore();
      g.beginPath(); g.ellipse(cx, oy, rx, Math.max(ry, 0.6), 0, 0, TURN);
      g.strokeStyle = ink; g.lineWidth = 1.2; g.stroke();
    }

    drawOrbit(g) {
      const t = this.t;
      for (let i = 0; i < 3; i++) {
        const a = t * 3.2 + (i * TURN) / 3, depth = (Math.sin(a) + 1) / 2;
        g.save();
        g.translate(Math.cos(a) * 30, -this.height - 4 + Math.sin(a) * 7);
        g.globalAlpha = 0.55 + 0.45 * depth;
        g.scale(0.75 + 0.35 * depth, 0.75 + 0.35 * depth);
        g.fillStyle = "#FFD15C"; starPath(g, 4.2, 1.9); g.fill();
        g.restore();
      }
    }

    drawBadge(g, b, c) {
      const age = this.t - b.at, t = this.t;
      const pop = age < 0.4 ? Math.max(0, EASE.back(age / 0.4)) : 1;
      g.scale(pop * BADGE.size, pop * BADGE.size);
      g.save();
      g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 3 * this.ps; g.shadowOffsetY = 0.8 * this.ps;
      g.fillStyle = c;
      const pill = b.kind === "dots" || b.kind === "cloud" || b.kind === "bars";
      if (b.kind === "cloud") {
        g.beginPath(); g.arc(-14, 12, 2.2, 0, TURN); g.fill();
        g.beginPath(); g.arc(-9.5, 7.5, 3.2, 0, TURN); g.fill();
      }
      if (pill) { roundRect(g, -13, -7.5, 26, 15, 7.5); g.fill(); }
      else { g.beginPath(); g.arc(0, 0, 8.5, 0, TURN); g.fill(); }
      g.restore();
      g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round";
      switch (b.kind) {
        case "dots": case "cloud": {
          const speed = b.kind === "cloud" ? 4 : 7;
          for (let i = 0; i < 3; i++) {
            const up = Math.max(0, Math.sin(t * speed - i * 0.9)) * 1.6;
            g.beginPath(); g.arc((i - 1) * 6, -up, 1.9, 0, TURN); g.fill();
          }
          break;
        }
        case "bars":
          for (let i = 0; i < 4; i++) {
            const h = 3 + 4.5 * Math.abs(Math.sin(t * 6 + i * 1.3));
            roundRect(g, -7.2 + i * 4.2, -h / 2, 2.2, h, 1.1); g.fill();
          }
          break;
        case "glass": {
          const dx = Math.cos(t * 3) * 1.2, dy = Math.sin(t * 3) * 1.2;
          g.lineWidth = 1.8; g.beginPath(); g.arc(-1 + dx, -1 + dy, 3.2, 0, TURN); g.stroke();
          g.lineWidth = 2.2; g.beginPath(); g.moveTo(1.4 + dx, 1.4 + dy); g.lineTo(4 + dx, 4 + dy); g.stroke();
          break;
        }
        case "bang": roundRect(g, -1.25, -5.6, 2.5, 7, 1.25); g.fill(); g.beginPath(); g.arc(0, 3.9, 1.4, 0, TURN); g.fill(); break;
        case "ask":
          g.lineWidth = 2.1; g.beginPath(); g.moveTo(-2.6, -2.6); g.quadraticCurveTo(-2.6, -5.6, 0, -5.6); g.quadraticCurveTo(2.8, -5.6, 2.8, -3);
          g.quadraticCurveTo(2.8, -1.2, 0.6, -0.3); g.quadraticCurveTo(0, 0, 0, 1.2); g.stroke();
          g.beginPath(); g.arc(0, 4.3, 1.3, 0, TURN); g.fill(); break;
        case "cross": g.lineWidth = 2.2; g.beginPath(); g.moveTo(-3, -3); g.lineTo(3, 3); g.moveTo(3, -3); g.lineTo(-3, 3); g.stroke(); break;
        case "check": g.lineWidth = 2.3; g.beginPath(); g.moveTo(-3.6, 0.2); g.lineTo(-1, 2.8); g.lineTo(3.8, -2.6); g.stroke(); break;
        case "hourglass": {
          const flip = (t % 2.4) > 2 ? EASE.io(((t % 2.4) - 2) / 0.4) * Math.PI : 0;
          g.save(); g.rotate(flip);
          g.lineWidth = 1.4; g.beginPath(); g.moveTo(-3.4, -4.6); g.lineTo(3.4, -4.6); g.moveTo(-3.4, 4.6); g.lineTo(3.4, 4.6); g.stroke();
          g.beginPath(); g.moveTo(-2.6, -4); g.lineTo(2.6, -4); g.lineTo(0.4, -0.2); g.lineTo(2.6, 4); g.lineTo(-2.6, 4); g.lineTo(-0.4, -0.2); g.closePath();
          g.lineWidth = 1.1; g.stroke();
          g.beginPath(); g.moveTo(-1.6, 3.6); g.lineTo(1.6, 3.6); g.lineTo(0, 1.4); g.closePath(); g.fill();
          g.restore(); break;
        }
      }
    }

    drawPart(g, p) {
      const k = p.age / p.life, fade = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      g.save(); g.translate(p.x, p.y); g.globalAlpha = clamp(fade, 0, 1);
      g.fillStyle = p.color; g.strokeStyle = p.color;
      switch (p.kind) {
        case "heart": { const s = p.size * (0.7 + 0.3 * Math.min(1, k * 4)); heartPath(g, s); g.fill(); break; }
        case "sparkle": { const s = p.size * Math.sin(Math.PI * k); g.rotate(k * 1.5); sparklePath(g, s); g.fill(); break; }
        case "z": {
          const s = p.size * (0.8 + 0.6 * k);
          g.font = `800 ${s * 1.6}px -apple-system, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
          g.fillText("z", 0, 0); break;
        }
        case "drop":
          g.beginPath(); g.moveTo(0, -p.size * 1.3);
          g.quadraticCurveTo(p.size, 0, 0, p.size * 0.9); g.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.3); g.fill(); break;
        case "puff": g.beginPath(); g.arc(0, 0, p.size * (0.7 + k), 0, TURN); g.fill(); break;
        case "line": {
          const d = 6 + 8 * EASE.out(k);
          g.rotate(p.a); g.lineWidth = 2.2; g.lineCap = "round";
          g.beginPath(); g.moveTo(d, 0); g.lineTo(d + p.size * (1 - k * 0.5), 0); g.stroke(); break;
        }
      }
      g.restore();
    }
  }

  // ---- A small still Buddy, for chips and lists ----
  let miniId = 0;
  const miniImages = new Map();
  /** A friend, small and still: drawn once by the engine, then reused as an image. */
  function friendMini(look, glow, opts) {
    const key = JSON.stringify([look, glow, opts.ring || "", opts.eyeStyle || ""]);
    if (!miniImages.has(key)) {
      const host = document.createElement("div");
      Object.assign(host.style, { position: "fixed", left: "-300px", top: "0", width: "64px", height: "64px" });
      document.body.appendChild(host);
      const p = new Pal(host, { look, glow, ring: opts.ring, eyeStyle: opts.eyeStyle, dark: true, view: [10, 34, 180, 150] });
      p.calm = true; p.tick(0);
      miniImages.set(key, p.canvas.toDataURL());
      host.remove();
    }
    return `<img src="${miniImages.get(key)}" alt="" style="width:100%;height:100%;display:block;object-fit:contain">`;
  }
  function mini(tab, opts = {}) {
    if (opts.look !== "ball") return friendMini(FRIENDS[opts.look] ? opts.look : DEFAULT_LOOK, tab, opts);
    const id = `pm${++miniId}`, eyes = color(opts.eyes, "");
    const metal = color(opts.body, DEFAULT_BODY.ball), e = BALL_EYE, glow = color(tab, BALL_HALO), white = eyes || BALL_EYES;
    return `<svg viewBox="20 36 160 160" aria-hidden="true" style="width:100%;height:100%;display:block;overflow:visible">
      <defs>
        <radialGradient id="${id}m" cx="34%" cy="26%" r="78%"><stop offset="0" stop-color="${mix(metal, "#ffffff", 0.45)}"/><stop offset=".3" stop-color="${mix(metal, "#ffffff", 0.12)}"/><stop offset=".65" stop-color="${metal}"/><stop offset="1" stop-color="${mix(metal, "#000000", 0.6)}"/></radialGradient>
      </defs>
      <g transform="translate(${CX} ${GROUND})">
        <circle cy="${-BALL_R}" r="${BALL_R + 5}" fill="${glow}" opacity=".28"/>
        <circle cy="${-BALL_R}" r="${BALL_R}" fill="url(#${id}m)" stroke="${glow}" stroke-width="4"/>
        ${[e.lx, e.rx].map((x) => `<ellipse cx="${x}" cy="${e.y}" rx="${e.w * 1.1}" ry="${e.h * 1.1}" fill="${white}"/>
        <ellipse cx="${x}" cy="${e.y + 1}" rx="${e.w * 0.72}" ry="${e.h * 0.8}" fill="#121214"/>
        <ellipse cx="${x - e.w * 0.18}" cy="${e.y - e.h * 0.32}" rx="${e.w * 0.26}" ry="${e.h * 0.2}" fill="#fff"/>`).join("")}
      </g></svg>`;
  }

  window.Pal = {
    create: (host, opts) => new Pal(host, opts),
    mini,
    LOOKS,
    EYE_STYLES,
    DEFAULT_BODY,
    DEFAULT_LOOK,
    FRIENDS: Object.keys(FRIENDS),
    STATES: Object.fromEntries(Object.entries(STATES).map(([k, s]) => [k, s.label])),
    EMOTES: Object.fromEntries(["love", "proud", "surprised", "wink", "yawn"].map((k) => [k, EMOTES[k].label])),
    COLORS,
  };
})();
