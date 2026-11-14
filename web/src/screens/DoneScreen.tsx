import { useEffect, type CSSProperties } from "react";
import { Can } from "../components/Can";
import { Confetti, StarIcon, worldStyle } from "../components/bits";
import { findLevel, nextLevel, subjectOf, WORLDS } from "../game/curriculum";
import { visibleWorlds, type Save } from "../game/progress";
import { say, sfx } from "../game/sound";
import type { Result } from "./PlayScreen";

interface Props {
  result: Result;
  previousBest: number;
  save: Save;
  onNext: (levelId: string) => void;
  onReplay: () => void;
  onMap: () => void;
}

const HEADLINE = { 3: "Super star!", 2: "Great job!", 1: "You did it!" } as const;

export function DoneScreen({ result, previousBest, save, onNext, onReplay, onMap }: Props) {
  const { world, level } = findLevel(result.levelId)!;
  const next = nextLevel(result.levelId, visibleWorlds(save, WORLDS.filter((w) => subjectOf(w) === subjectOf(world))));
  const rewards = save.settings.rewards;
  const newBest = result.stars > previousBest;
  const headline = rewards === "off" ? "Lesson finished" : HEADLINE[result.stars];
  const name = save.name;

  useEffect(() => {
    const fanfare = rewards === "full" ? window.setTimeout(sfx.fanfare, 50) : undefined;
    const speech = window.setTimeout(() => {
      say(`${headline}${name ? `, ${name}` : ""}! You got ${result.firstTry} out of ${result.total} on the first try.`);
    }, 900);
    return () => {
      window.clearTimeout(fanfare);
      window.clearTimeout(speech);
    };
  }, [headline, name, result, rewards]);

  return (
    <main className={`done-screen screen-in done-${rewards}`} style={worldStyle(world.color)}>
      {rewards === "full" && result.stars >= 2 && <Confetti />}
      <div className="done-hero">
        {rewards !== "off" && <span className="burst" aria-hidden="true" />}
        <Can mood={result.stars === 3 ? "cheer" : result.stars === 2 ? "proud" : "happy"} color={world.color} count={rewards === "off" ? undefined : result.caught} size={150} hat={world.hat} />
      </div>
      <p className="done-level">
        {world.name}: {level.title}
      </p>
      <h1 className="done-title">{headline}</h1>

      {rewards !== "off" && (
        <div className="done-stars" role="img" aria-label={`${result.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`big-star${n <= result.stars ? " earned" : ""}`} style={{ "--n": n } as CSSProperties}>
              <StarIcon filled={n <= result.stars} size={64} />
            </span>
          ))}
        </div>
      )}

      <p className="done-stat">
        <strong>{result.firstTry}</strong> of {result.total} right on the first try
      </p>
      {rewards !== "off" && newBest && previousBest > 0 && <p className="done-best">New best for this lesson!</p>}
      {rewards !== "off" && result.stars < 3 && (
        <p className="done-tip">
          Get {Math.ceil((result.stars === 1 ? 0.6 : 0.9) * result.total)} of {result.total} right the first time to earn another star.
        </p>
      )}

      <div className="done-actions">
        {next && (
          <button type="button" className="btn btn-big" onClick={() => onNext(next.level.id)} style={worldStyle(next.world.color)}>
            Next: {next.level.title}
          </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={onReplay}>
          Play again
        </button>
        <button type="button" className="btn btn-quiet" onClick={onMap}>
          Back to map
        </button>
      </div>
    </main>
  );
}
