import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { LockIcon, SoundToggle, StarIcon, StarRow, worldStyle } from "../components/bits";
import { BANDS, SUBJECTS, WORLDS, subjectOf } from "../game/curriculum";
import { isUnlocked, suggestedLevel, totalStars, visibleWorlds, type Save } from "../game/progress";
import { sfx } from "../game/sound";
import type { Level, Subject, World } from "../game/types";
import { ParentGate } from "./GrownUpsScreen";
import { Can } from "../components/Can";
import { Art, MAP_PROPS, SPACE_PROPS } from "../components/art/Art";

interface Props {
  save: Save;
  onPlay: (levelId: string) => void;
  onLearn: (levelId: string) => void;
  onEditBuddy: () => void;
  onToggleSound: () => void;
  onGrownUps: () => void;
  onDrill: () => void;
  onSubject: (subject: Subject) => void;
}

/** A steady number per world, so each world keeps the same props along its trail. */
const propSeed = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7);

/** Sideways nudge for each stop so the trail winds like a path. */
const WIND = [0, 1, 0, -1];
const STOP = 148;

/** The winding trail between stops; the part up to `lit` stops (the ones finished) glows. */
function TrailPath({ count, lit }: { count: number; lit: number }) {
  const pts = Array.from({ length: count }, (_, i) => ({ x: WIND[i % 4], y: i * STOP + 44 }));
  const curve = (to: number) =>
    pts
      .slice(0, to)
      .map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `C${pts[i - 1].x} ${pts[i - 1].y + STOP / 2} ${p.x} ${p.y - STOP / 2} ${p.x} ${p.y}`))
      .join(" ");
  return (
    <svg className="trail-path" viewBox={`-1 0 2 ${count * STOP}`} preserveAspectRatio="none" style={{ height: count * STOP }} aria-hidden="true">
      <path d={curve(count)} />
      {lit > 0 && <path className="trail-lit" d={curve(Math.min(count, lit + 1))} />}
    </svg>
  );
}

function WorldTrail({
  world,
  save,
  suggested,
  suggestedRef,
  onPick,
}: {
  world: World;
  save: Save;
  suggested: string;
  suggestedRef: RefObject<HTMLLIElement | null>;
  onPick: (world: World, level: Level, index: number) => void;
}) {
  const rewardsOn = save.settings.rewards !== "off";
  const done = world.levels.filter((l) => save.stars[l.id]).length;
  // Lanterns are lit in order: the trail glows up to the first lesson not yet finished.
  const lit = world.levels.findIndex((l) => !save.stars[l.id]);
  const litCount = lit < 0 ? world.levels.length : lit;
  const earned = world.levels.reduce((sum, l) => sum + (save.stars[l.id] ?? 0), 0);
  return (
    <section className="world" style={worldStyle(world.color)} aria-labelledby={`world-${world.id}`}>
      <div className="world-head">
        <span className={`world-symbol${world.symbol.length > 1 ? " long" : ""}`} aria-hidden="true">
          {world.symbol}
        </span>
        <div className="world-name">
          <h3 id={`world-${world.id}`}>{world.name}</h3>
          <p>
            Ages {world.ages[0]}–{world.ages[1]}, {world.levels.length} lessons
          </p>
        </div>
        {rewardsOn ? (
          <span className="world-stars" aria-label={`${earned} of ${world.levels.length * 3} stars`}>
            <StarIcon size={20} /> {earned}/{world.levels.length * 3}
          </span>
        ) : (
          <span className="world-stars" aria-label={`${done} of ${world.levels.length} lessons done`}>
            {done}/{world.levels.length} done
          </span>
        )}
      </div>

      <div className="world-land" style={{ height: world.levels.length * STOP + 8 }}>
        <TrailPath count={world.levels.length} lit={litCount} />
        {world.levels.map((_, i) => {
          // A prop stands in the empty curve beside every other lantern: the trail swings right after
          // stop 0, 4, 8…, so the prop goes left there, and right beside stops 2, 6, 10…
          if (i % 2 === 1) return null;
          const side = i % 4 === 0 ? "left" : "right";
          return (
            <span key={`d${i}`} className={`scenery scenery-${side}`} style={{ top: i * STOP + 6, "--n": i } as CSSProperties} aria-hidden="true">
              <Art className="prop-day" emoji={MAP_PROPS[(propSeed(world.id) + i) % MAP_PROPS.length]} />
              <Art className="prop-night" emoji={SPACE_PROPS[(propSeed(world.id) + i / 2) % SPACE_PROPS.length]} />
            </span>
          );
        })}
        <ol className="trail">
          {world.levels.map((level, i) => {
            const open = isUnlocked(save, world, i);
            const stars = save.stars[level.id] ?? 0;
            const isNext = level.id === suggested;
            const wind = WIND[i % 4];
            return (
              <li
                key={level.id}
                ref={isNext ? suggestedRef : undefined}
                className={`stop${isNext ? " next" : ""}`}
                style={{ "--wind": wind, height: STOP } as CSSProperties}
              >
                {isNext && (
                  <span className={`here ${wind > 0 || (wind === 0 && i % 4 === 2) ? "here-left" : "here-right"}`} aria-hidden="true">
                    <span className="here-buddy">
                      <Can size={40} mood="happy" />
                    </span>
                    <span className="here-say">{stars ? "Again!" : "Start"}</span>
                  </span>
                )}
                <button
                  type="button"
                  className={`node${open ? (stars ? " cleared" : " open") : " locked"}`}
                  disabled={!open}
                  onClick={() => {
                    sfx.tap();
                    onPick(world, level, i);
                  }}
                  aria-label={`${level.title}${open ? (stars ? (rewardsOn ? `, ${stars} of 3 stars` : ", done") : "") : ", locked"}`}
                >
                  {open ? (
                    <span className="node-num">{level.challenge ? <span aria-hidden="true">🏆</span> : i + 1}</span>
                  ) : (
                    <LockIcon />
                  )}
                  {!rewardsOn && stars > 0 && (
                    <span className="node-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
                <span className="stop-title">{level.title}</span>
                {open && rewardsOn && <StarRow stars={stars} size={16} label={false} />}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function LevelSheet({
  world,
  level,
  index,
  save,
  onLearn,
  onPlay,
  onClose,
}: {
  world: World;
  level: Level;
  index: number;
  save: Save;
  onLearn: () => void;
  onPlay: () => void;
  onClose: () => void;
}) {
  const stars = save.stars[level.id] ?? 0;
  const rewardsOn = save.settings.rewards !== "off";
  const learnFirst = !stars;
  const firstRef = useRef<HTMLButtonElement>(null);
  // The sheet slides in, so focus without letting the browser scroll the map behind it.
  useEffect(() => firstRef.current?.focus({ preventScroll: true }), []);
  return (
    <div className="modal-backdrop sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="level-sheet-title" onClick={onClose}>
      <div className="level-sheet" style={worldStyle(world.color)} onClick={(e) => e.stopPropagation()}>
        <div className="level-sheet-head">
          <span className="world-symbol" aria-hidden="true">
            {index + 1}
          </span>
          <div>
            <p className="level-sheet-world">{world.name}</p>
            <h2 id="level-sheet-title">{level.title}</h2>
          </div>
          {rewardsOn && stars > 0 && <StarRow stars={stars} size={20} />}
        </div>
        {level.idea && <p className="level-sheet-idea">{level.idea}</p>}
        <div className="level-sheet-actions">
          <button type="button" ref={learnFirst ? firstRef : undefined} className={`btn btn-big${learnFirst ? "" : " btn-quiet"}`} onClick={onLearn}>
            <span aria-hidden="true">📖</span> Learn it
          </button>
          <button type="button" ref={learnFirst ? undefined : firstRef} className={`btn btn-big${learnFirst ? " btn-quiet" : ""}`} onClick={onPlay}>
            <span aria-hidden="true">✏️</span> Practice
          </button>
        </div>
        <button type="button" className="link" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}

export function MapScreen({ save, onPlay, onLearn, onEditBuddy, onToggleSound, onGrownUps, onDrill, onSubject }: Props) {
  const [picked, setPicked] = useState<{ world: World; level: Level; index: number } | null>(null);
  const subjects = SUBJECTS.filter((s) => WORLDS.some((w) => subjectOf(w) === s.id));
  const subject = subjects.some((s) => s.id === save.subject) ? save.subject : "math";
  const subjectWorlds = WORLDS.filter((w) => subjectOf(w) === subject);
  const shown = visibleWorlds(save, subjectWorlds);
  const suggested = suggestedLevel(save, subjectWorlds);
  const suggestedRef = useRef<HTMLLIElement>(null);
  const [gate, setGate] = useState(false);
  const rewardsOn = save.settings.rewards !== "off";
  const bands = BANDS.filter((b) => b.subject === subject)
    .map((b) => ({
      ...b,
      worlds: subjectWorlds.filter((w) => b.worlds.some((x) => x.id === w.id) && shown.includes(w)),
    }))
    .filter((b) => b.worlds.length);
  const suggestedBand = bands.find((b) => b.worlds.some((w) => w.levels.some((l) => l.id === suggested)))?.id;

  useEffect(() => {
    suggestedRef.current?.scrollIntoView({ block: "center" });
  }, [subject]);

  return (
    <div className="map screen-in">
      <header className="map-top">
        <button type="button" className="me" onClick={onEditBuddy} aria-label="Change buddy or name">
          <span className="me-buddy" aria-hidden="true">
            <Can size={30} />
          </span>
          <span className="me-name">{save.name || "Me"}</span>
        </button>
        {rewardsOn && (
          <span className="total-stars" aria-label={`${totalStars(save, subjectWorlds)} stars`}>
            <StarIcon size={26} /> {totalStars(save, subjectWorlds)}
          </span>
        )}
        <span className="top-spacer" />
        <button type="button" className="speed-btn" onClick={onDrill}>
          <span aria-hidden="true">⚡</span> Speed
        </button>
        <button type="button" className="grownups-btn" onClick={() => setGate(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" />
            <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" stroke="currentColor" strokeWidth="2.4" fill="none" />
          </svg>
          Grown-ups
        </button>
        <SoundToggle on={save.sound} onToggle={onToggleSound} />
      </header>

      {subjects.length > 1 && (
        <nav className="subject-tabs" aria-label="Subject">
          {subjects.map((s) => (
            <button
              type="button"
              key={s.id}
              className={`subject-tab${s.id === subject ? " on" : ""}`}
              aria-pressed={s.id === subject}
              onClick={() => {
                sfx.tap();
                onSubject(s.id);
              }}
            >
              <span aria-hidden="true">{s.symbol}</span> {s.name}
            </button>
          ))}
        </nav>
      )}

      {bands.length > 1 && (
        <nav className="band-chips" aria-label="Jump to an age group">
          {bands.map((b) => (
            <button
              type="button"
              key={b.id}
              className={`chip${b.id === suggestedBand ? " chip-on" : ""}`}
              onClick={() => document.getElementById(`band-${b.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {b.label}
            </button>
          ))}
        </nav>
      )}

      <div className="fireflies" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ "--i": i, left: `${7 + i * 6.5}%`, top: `${18 + ((i * 37) % 70)}%` } as CSSProperties} />
        ))}
      </div>

      <main className="worlds">
        {bands.map((band) => (
          <section className="band" id={`band-${band.id}`} key={band.id} aria-labelledby={`band-title-${band.id}`}>
            <h2 className="band-title" id={`band-title-${band.id}`}>
              {band.label}
              <small>{band.grades}</small>
            </h2>
            <div className="band-worlds">
              {band.worlds.map((world) => (
                <WorldTrail
                  key={world.id}
                  world={world}
                  save={save}
                  suggested={suggested}
                  suggestedRef={suggestedRef}
                  onPick={(w, level, index) => setPicked({ world: w, level, index })}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {picked && (
        <LevelSheet
          {...picked}
          save={save}
          onLearn={() => onLearn(picked.level.id)}
          onPlay={() => onPlay(picked.level.id)}
          onClose={() => setPicked(null)}
        />
      )}

      {gate && (
        <ParentGate
          onPass={() => {
            setGate(false);
            onGrownUps();
          }}
          onCancel={() => setGate(false)}
        />
      )}
    </div>
  );
}
