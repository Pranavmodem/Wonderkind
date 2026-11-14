import { useEffect, useMemo, useState } from "react";
import { BANDS, NOT_COVERED, SUBJECTS, WORLDS, subjectOf } from "../game/curriculum";
import { DEFAULT_SETTINGS, type Rewards, type Save, type Settings } from "../game/progress";
import type { Difficulty } from "../game/questions";
import { listVoices, say, setVoicePreference } from "../game/sound";
import { normalize, STANDARDS } from "../game/standards";

/* -------------------------------------------------------------- parent gate */

const twoDigit = () => 12 + Math.floor(Math.random() * 8);

/** A soft lock so young kids don't wander into settings. */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [pair, setPair] = useState(() => [twoDigit(), twoDigit()]);
  const [value, setValue] = useState("");
  const [miss, setMiss] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Number(value) === pair[0] * pair[1]) return onPass();
    setMiss(true);
    setValue("");
    setPair([twoDigit(), twoDigit()]);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form className="modal gate" onSubmit={submit}>
        <h2 id="gate-title">Grown-ups only</h2>
        <p>
          To open settings, answer: <strong>{pair[0]} × {pair[1]}</strong>
        </p>
        <input
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
          aria-label={`${pair[0]} times ${pair[1]}`}
        />
        {miss && <p className="gate-miss">That's not it. Here's a new one.</p>}
        <button type="submit" className="btn" disabled={!value}>
          Open settings
        </button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------- controls */

function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: { value: T; label: string; detail: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o.value} key={o.value} className={`seg${value === o.value ? " on" : ""}`} onClick={() => onChange(o.value)}>
          <strong>{o.label}</strong>
          <span>{o.detail}</span>
        </button>
      ))}
    </div>
  );
}

function VoicePicker({ value, onChange }: { value: string | null; onChange: (name: string | null) => void }) {
  const [voices, setVoices] = useState(() => listVoices());
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const update = () => setVoices(listVoices());
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, []);
  const best = voices[0];

  function preview(name: string | null) {
    setVoicePreference(name);
    say("Hi! I'm Can. Three fourths plus one fourth equals one whole.", { force: true });
  }

  if (!voices.length) return <p className="gu-note">This device has no reading voices.</p>;
  return (
    <div className="voice-pick">
      <label className="gu-label" htmlFor="voice-select">
        Reading voice
      </label>
      <div className="voice-row">
        <select
          id="voice-select"
          value={value ?? ""}
          onChange={(e) => {
            const name = e.target.value || null;
            onChange(name);
            preview(name);
          }}
        >
          <option value="">Most natural ({best.name})</option>
          {voices.slice(0, 20).map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-small btn-quiet" onClick={() => preview(value)}>
          Hear it
        </button>
      </div>
      <p className="gu-note">
        Voices come from this device. For the most natural sound, add a "Premium", "Enhanced" or "Siri" voice in your device's speech
        settings, or use Microsoft Edge, which includes natural online voices.
      </p>
    </div>
  );
}

function Toggle({ label, detail, on, onChange }: { label: string; detail?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

const DIFFICULTY: { value: Difficulty; label: string; detail: string }[] = [
  { value: "easier", label: "Easier", detail: "6 questions, 3 answers to pick from, no typing" },
  { value: "normal", label: "Just right", detail: "8 questions with pictures and choices" },
  { value: "harder", label: "Harder", detail: "10 questions, typed answers, pictures only as hints" },
];

const REWARDS: { value: Rewards; label: string; detail: string }[] = [
  { value: "full", label: "Stars and celebrations", detail: "Stars, confetti and cheering sounds" },
  { value: "quiet", label: "Stars only", detail: "Stars, but no confetti or fanfare" },
  { value: "off", label: "No rewards", detail: "No stars or scores; finished lessons get a check" },
];

/* ------------------------------------------------------------------ screen */

const GROUP_NAMES: Record<string, string> = {
  "phys-K5": "Physics: Kindergarten to Grade 5",
  "phys-MS": "Physics: middle school",
  "phys-HS": "Physics: high school",
  PHYS: "AP Physics 1 and 2",
  "chem-K5": "Chemistry: Kindergarten to Grade 5",
  "chem-MS": "Chemistry: middle school",
  "chem-HS": "Chemistry: high school",
  CHEM: "AP Chemistry",
  K: "Kindergarten",
  HSN: "High school: number and quantity",
  HSA: "High school: algebra",
  HSF: "High school: functions",
  HSG: "High school: geometry",
  HSS: "High school: statistics and probability",
  CALC: "Calculus (AP AB and BC)",
};

interface Props {
  save: Save;
  onChange: (save: Save) => void;
  onEditChild: () => void;
  onClose: () => void;
}

export function GrownUpsScreen({ save, onChange, onEditChild, onClose }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [openGrade, setOpenGrade] = useState<string | null>(null);
  const settings = save.settings;
  const set = (patch: Partial<Settings>) => onChange({ ...save, settings: { ...settings, ...patch } });
  const totalLessons = WORLDS.reduce((n, w) => n + w.levels.length, 0);
  const finished = WORLDS.reduce((n, w) => n + w.levels.filter((l) => save.stars[l.id]).length, 0);

  const coverage = useMemo(() => {
    const lessonsFor = new Map<string, string[]>();
    for (const w of WORLDS) {
      for (const l of w.levels) {
        for (const code of l.standards.map(normalize)) {
          lessonsFor.set(code, [...(lessonsFor.get(code) ?? []), `${w.name}: ${l.title}`]);
        }
      }
    }
    const skipped = new Map(NOT_COVERED.map((n) => [normalize(n.code), n.why]));
    const groupOf = (code: string) => {
      const science = code.match(/^(K|\d|MS|HS)-PS(\d)-\d+$/);
      if (science) {
        const chem = science[2] === "1" || code === "HS-PS2-6";
        const level = science[1] === "MS" || science[1] === "HS" ? science[1] : "K5";
        return `${chem ? "chem" : "phys"}-${level}`;
      }
      if (code.startsWith("PHYS.")) return "PHYS";
      if (code.startsWith("CHEM.")) return "CHEM";
      return code.startsWith("HS") ? code.slice(0, 3) : code.split(".")[0];
    };
    const order = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "HSN", "HSA", "HSF", "HSG", "HSS", "CALC", "phys-K5", "phys-MS", "phys-HS", "PHYS", "chem-K5", "chem-MS", "chem-HS", "CHEM"];
    const grades = order.map((g) => ({
      grade: g,
      items: STANDARDS.filter((s) => groupOf(s.code) === g).map((s) => ({ ...s, lessons: lessonsFor.get(s.code) ?? [], why: skipped.get(s.code) })),
    }));
    const taught = STANDARDS.filter((s) => lessonsFor.has(s.code)).length;
    return { grades, taught };
  }, []);

  function toggleWorld(id: string, on: boolean) {
    const hidden = on ? settings.hidden.filter((h) => h !== id) : [...settings.hidden, id];
    if (hidden.length >= WORLDS.length) return;
    set({ hidden });
  }

  /** Show one age band in its subject; other subjects keep what they had. */
  function showBandOnly(bandId: string) {
    const band = BANDS.find((b) => b.id === bandId)!;
    const sameSubject = WORLDS.filter((w) => subjectOf(w) === band.subject);
    const others = settings.hidden.filter((id) => !sameSubject.some((w) => w.id === id));
    set({ hidden: [...others, ...sameSubject.filter((w) => !band.worlds.some((x) => x.id === w.id)).map((w) => w.id)] });
  }

  return (
    <div className="grownups screen-in">
      <header className="gu-top">
        <h1>Grown-ups</h1>
        <button type="button" className="btn btn-small" onClick={onClose}>
          Done
        </button>
      </header>

      <main className="gu-main">
        <section className="gu-card">
          <h2>Child</h2>
          <div className="gu-child">
            <span className="me-buddy">{save.buddy}</span>
            <div>
              <strong>{save.name || "No name yet"}</strong>
              <button type="button" className="link" onClick={onEditChild}>
                Change name or buddy
              </button>
            </div>
          </div>
          <p className="gu-label">Age</p>
          <div className="age-chips">
            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((a) => (
              <button type="button" key={a} className={`chip${save.age === a ? " chip-on" : ""}`} onClick={() => onChange({ ...save, age: a })}>
                {a}
              </button>
            ))}
          </div>
          <p className="gu-note">The map suggests lessons for this age first. Every lesson stays open to play.</p>
        </section>

        <section className="gu-card">
          <h2>Difficulty</h2>
          <Segmented name="Difficulty" value={settings.difficulty} options={DIFFICULTY} onChange={(difficulty) => set({ difficulty })} />
        </section>

        <section className="gu-card">
          <h2>Look</h2>
          <Segmented
            name="Look"
            value={settings.theme ?? "auto"}
            options={[
              { value: "auto", label: "Auto", detail: "Follows this device" },
              { value: "dark", label: "Night", detail: "Dark, with Flare's glow" },
              { value: "light", label: "Day", detail: "Bright sky" },
            ]}
            onChange={(theme) => set({ theme })}
          />
        </section>

        <section className="gu-card">
          <h2>Rewards</h2>
          <Segmented name="Rewards" value={settings.rewards} options={REWARDS} onChange={(rewards) => set({ rewards })} />
        </section>

        <section className="gu-card">
          <h2>Lessons</h2>
          <Toggle
            label="Open every lesson"
            detail="Off: each lesson in a world opens after the one before it"
            on={settings.openAll}
            onChange={(openAll) => set({ openAll })}
          />
          <p className="gu-label">Show on the map</p>
          <div className="age-chips">
            <button type="button" className={`chip${settings.hidden.length === 0 ? " chip-on" : ""}`} onClick={() => set({ hidden: [] })}>
              All ages
            </button>
            {BANDS.map((b) => (
              <button type="button" key={b.id} className="chip" onClick={() => showBandOnly(b.id)}>
                {b.subject === "math" ? `${b.label} only` : `${SUBJECTS.find((x) => x.id === b.subject)!.name}, ${b.label.toLowerCase()}`}
              </button>
            ))}
          </div>
          {BANDS.map((band) => (
            <div key={band.id} className="gu-band">
              <p className="gu-band-title">
                {band.subject !== "math" && `${SUBJECTS.find((x) => x.id === band.subject)!.name}: `}
                {band.label} <small>{band.grades}</small>
              </p>
              {WORLDS.filter((w) => band.worlds.some((x) => x.id === w.id)).map((w) => {
                const done = w.levels.filter((l) => save.stars[l.id]).length;
                return (
                  <Toggle
                    key={w.id}
                    label={w.name}
                    detail={`${done} of ${w.levels.length} lessons done`}
                    on={!settings.hidden.includes(w.id)}
                    onChange={(on) => toggleWorld(w.id, on)}
                  />
                );
              })}
            </div>
          ))}
        </section>

        <section className="gu-card">
          <h2>Sound</h2>
          <Toggle label="Sounds" detail="Taps, cheers and Flare's voice" on={save.sound} onChange={(sound) => onChange({ ...save, sound })} />
          <Toggle label="Read questions aloud" on={settings.voice} onChange={(voice) => set({ voice })} />
          {settings.voice && <VoicePicker value={settings.voiceName} onChange={(voiceName) => set({ voiceName })} />}
        </section>

        <section className="gu-card">
          <h2>What Wonderkind covers</h2>
          <p className="gu-note">
            Math lessons follow the Common Core standards from Kindergarten through high school, plus the AP Calculus topics. Physics
            and chemistry follow the NGSS physical science standards from Kindergarten through high school, plus the AP Physics 1 and 2
            and AP Chemistry topics.{" "}
            {coverage.taught} of {STANDARDS.length} have lessons; any others are listed with the reason they can't be practiced on a screen.
          </p>
          {coverage.grades.map((g) => (
            <div key={g.grade} className="gu-grade">
              <button type="button" className="gu-grade-btn" aria-expanded={openGrade === g.grade} onClick={() => setOpenGrade(openGrade === g.grade ? null : g.grade)}>
                {GROUP_NAMES[g.grade] ?? `Grade ${g.grade}`}
                <span>
                  {g.items.filter((i) => i.lessons.length).length}/{g.items.length}
                </span>
              </button>
              {openGrade === g.grade && (
                <ul className="gu-standards">
                  {g.items.map((s) => (
                    <li key={s.code}>
                      <code>{s.code}</code>
                      <span>
                        {s.text}
                        <small>{s.lessons.length ? s.lessons.slice(0, 3).join(" · ") : (s.why ?? "Not yet covered")}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <section className="gu-card">
          <h2>Progress</h2>
          <p>
            {finished} of {totalLessons} lessons finished.
          </p>
          {confirmReset ? (
            <div className="gu-reset">
              <p>This clears every star and finished lesson. Settings stay.</p>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onChange({ ...save, stars: {}, lastLevel: null, recent: {} });
                  setConfirmReset(false);
                }}
              >
                Reset progress
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
                Keep progress
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={() => setConfirmReset(true)}>
              Reset progress…
            </button>
          )}
          <button type="button" className="link" onClick={() => set(DEFAULT_SETTINGS)}>
            Restore default settings
          </button>
        </section>
      </main>
    </div>
  );
}
