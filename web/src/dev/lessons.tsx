// Dev-only page (lessons.html?band=16-18) that renders one question from every lesson, for checking layout.
import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { worldStyle } from "../components/bits";
import { QuestionStage } from "../components/QuestionStage";
import { bandOf, WORLDS } from "../game/curriculum";
import { buildLesson } from "../game/questions";
import "../styles.css";
import "../visuals.css";
import "../screens.css";
import "../activities.css";
import "../physics.css";
import "../chemistry.css";
import "../theme.css";

class Catch extends Component<{ children: ReactNode }, { error?: string }> {
  state: { error?: string } = {};
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? <p data-crash="1">💥 {this.state.error}</p> : this.props.children;
  }
}

const params = new URLSearchParams(location.search);
// ?theme=dark shows the lessons in night mode.
document.documentElement.dataset.theme = params.get("theme") ?? "light";
const band = params.get("band");
/** Card width; 720 matches the play area on a desktop. */
const col = Number(params.get("col") ?? 380);
const worlds = WORLDS.filter((w) => !band || bandOf(w).id === band);

function Lessons() {
  return (
    <div style={{ padding: 16, display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${col}px), 1fr))`, gap: 16 }}>
      {worlds.flatMap((w) =>
        w.levels.map((level) => {
          let q;
          try {
            q = buildLesson(level.make, 1)[0];
          } catch (e) {
            return <p key={level.id} data-crash="1">💥 {level.id}: {(e as Error).message}</p>;
          }
          return (
            <section key={level.id} data-level={level.id} style={worldStyle(w.color)}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
                {w.name} · {level.title}
              </h3>
              <div className="play" style={{ minHeight: 0, padding: 12, ...worldStyle(w.color) }}>
                <Catch>
                  <p className="prompt">{q.prompt}</p>
                  <QuestionStage q={q} status="asking" tries={0} wrong={[]} entry="" onEntry={() => {}} shake={0} onAnswer={() => {}} />
                </Catch>
              </div>
            </section>
          );
        }),
      )}
    </div>
  );
}

/** For automated checks: lessons that crash, draw NaN, or spill out of their card. */
function scan() {
  const out = { crashes: [] as string[], nan: [] as string[], overflow: [] as string[] };
  document.querySelectorAll<HTMLElement>("[data-crash]").forEach((e) => out.crashes.push(`${e.closest("section")?.dataset.level ?? ""} ${e.textContent}`));
  document.querySelectorAll<HTMLElement>("section[data-level]").forEach((s) => {
    const id = s.dataset.level!;
    if ([...s.querySelectorAll("svg *")].some((el) => [...el.attributes].some((a) => /NaN|Infinity|undefined/.test(a.value)))) out.nan.push(id);
    const box = s.querySelector(".play")!.getBoundingClientRect();
    const wide = [...s.querySelectorAll(".play *")].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > box.right + 2 || r.left < box.left - 2);
    });
    if (wide) {
      const cls = String((wide.className as unknown as SVGAnimatedString)?.baseVal ?? wide.className).slice(0, 30);
      out.overflow.push(`${id} <${cls}> ${Math.round(wide.getBoundingClientRect().width)}/${Math.round(box.width)} | ${s.querySelector(".prompt")?.textContent?.slice(0, 60)}`);
    }
  });
  return out;
}
(window as unknown as { scan: typeof scan }).scan = scan;

createRoot(document.getElementById("root")!).render(<Lessons />);
