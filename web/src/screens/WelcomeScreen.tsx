import { useState } from "react";
import { Can } from "../components/Can";
import { BUDDY_HUES, BUDDY_LOOKS, buddyKey, parseBuddy, setBuddy, type BuddyHue, type BuddyLook } from "../game/buddy";
import { say, sfx } from "../game/sound";

interface Props {
  name: string;
  buddy: string | null;
  age: number | null;
  returning: boolean;
  onDone: (name: string, buddy: string, age: number | null) => void;
}

type Step = "buddy" | "age" | "name";
const STEPS: Step[] = ["buddy", "age", "name"];

/** What a kid of this age is likely studying, to show next to the number. */
function gradeFor(age: number) {
  if (age <= 4) return "Pre-K";
  if (age === 5) return "Kindergarten";
  if (age >= 18) return "Grade 12 and AP";
  return `Grade ${age - 5}`;
}

const HUE_NAMES: Record<BuddyHue, string> = { own: "Own colour", blue: "Blue", teal: "Teal", green: "Green", purple: "Purple", pink: "Pink" };

/** First run (and "change buddy"): pick a buddy and its colour, then age, then name, one step at a time. */
export function WelcomeScreen({ name: savedName, buddy: savedBuddy, age: savedAge, returning, onDone }: Props) {
  const [step, setStep] = useState<Step>("buddy");
  const [name, setName] = useState(savedName);
  const [pick, setPick] = useState(() => parseBuddy(savedBuddy));
  const [age, setAge] = useState<number | null>(savedAge);
  const at = STEPS.indexOf(step);
  const key = buddyKey(pick);
  const look = BUDDY_LOOKS.find((l) => l.id === pick.look)!;

  function choose(next: { look?: BuddyLook; hue?: BuddyHue }) {
    sfx.tap();
    const b = { ...pick, ...next };
    setPick(b);
    setBuddy(buddyKey(b));
  }

  function finish() {
    const trimmed = name.trim();
    if (!returning) say(trimmed ? `Hi ${trimmed}! Let's go.` : "Let's go!");
    onDone(trimmed, key, age);
  }

  const next = () => {
    sfx.tap();
    if (at < STEPS.length - 1) setStep(STEPS[at + 1]);
    else finish();
  };

  return (
    <main className="onboard screen-in">
      <header className="onboard-top">
        <span className="wordmark">Wonderkind</span>
        <ol className="onboard-dots" aria-label={`Step ${at + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" className={`onboard-dot${i === at ? " on" : i < at ? " done" : ""}`} aria-label={`Step ${i + 1}`} onClick={() => setStep(s)} />
            </li>
          ))}
        </ol>
      </header>

      {step === "buddy" && (
        <section className="onboard-step" aria-labelledby="buddy-title">
          <div className="orb">
            <Can buddy={key} mood="wave" size={150} />
          </div>
          <h1 id="buddy-title" className="onboard-title">
            Choose your buddy
          </h1>
          <p className="onboard-sub">
            {look.name} is {look.about}. Your buddy reads to you and cheers you on.
          </p>

          <div className="buddy-cards" role="radiogroup" aria-labelledby="buddy-title">
            {BUDDY_LOOKS.map((l) => (
              <button
                type="button"
                role="radio"
                aria-checked={pick.look === l.id}
                key={l.id}
                className={`buddy-card${pick.look === l.id ? " picked" : ""}`}
                onClick={() => choose({ look: l.id })}
              >
                <Can buddy={`${l.id}:${pick.look === l.id ? pick.hue : "own"}`} mood={pick.look === l.id ? "happy" : "idle"} size={76} />
                <span className="buddy-card-name">{l.name}</span>
              </button>
            ))}
          </div>

          <div className="swatches" role="radiogroup" aria-label="Colour">
            {(Object.keys(BUDDY_HUES) as BuddyHue[]).map((h) => (
              <button
                type="button"
                role="radio"
                aria-checked={pick.hue === h}
                aria-label={HUE_NAMES[h]}
                key={h}
                className={`swatch swatch-${h}${pick.hue === h ? " on" : ""}`}
                style={h === "own" ? undefined : { background: BUDDY_HUES[h] }}
                onClick={() => choose({ hue: h })}
              />
            ))}
          </div>
        </section>
      )}

      {step === "age" && (
        <section className="onboard-step" aria-labelledby="age-title">
          <div className="orb orb-small">
            <Can buddy={key} mood="ask" size={96} />
          </div>
          <h1 id="age-title" className="onboard-title">
            How old are you?
          </h1>
          <p className="onboard-sub">So {look.name} can start you in the right place.</p>
          <div className="stepper">
            <button type="button" className="stepper-btn" aria-label="Younger" disabled={(age ?? 7) <= 4} onClick={() => (sfx.tap(), setAge(Math.max(4, (age ?? 7) - 1)))}>
              −
            </button>
            <output className="stepper-value" aria-live="polite">
              {age ?? "?"}
            </output>
            <button type="button" className="stepper-btn plus" aria-label="Older" disabled={(age ?? 6) >= 18} onClick={() => (sfx.tap(), setAge(Math.min(18, (age ?? 6) + 1)))}>
              +
            </button>
          </div>
          <p className="stepper-note">{age ? gradeFor(age) : "Tap + or −"}</p>
        </section>
      )}

      {step === "name" && (
        <section className="onboard-step" aria-labelledby="name-title">
          <div className="orb orb-small">
            <Can buddy={key} mood="happy" size={96} />
          </div>
          <h1 id="name-title" className="onboard-title">
            What should {look.name} call you?
          </h1>
          <p className="onboard-sub">Just a first name, or skip it.</p>
          <input
            className="onboard-input"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            onKeyDown={(e) => e.key === "Enter" && finish()}
            placeholder="Your name"
            aria-label="Your name"
            autoComplete="off"
            enterKeyHint="go"
          />
        </section>
      )}

      <footer className="onboard-actions">
        <button type="button" className="pill-btn" onClick={next}>
          {at < STEPS.length - 1 ? "Next" : returning ? "Save" : "Let's go!"}
        </button>
        {at > 0 ? (
          <button type="button" className="text-btn" onClick={() => setStep(STEPS[at - 1])}>
            Back
          </button>
        ) : (
          <span className="text-btn-space" />
        )}
      </footer>
    </main>
  );
}
