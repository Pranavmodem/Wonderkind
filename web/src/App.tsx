import { useCallback, useEffect, useState } from "react";
import { setBuddy } from "./game/buddy";
import { loadSave, rememberSeen, storeSave, type Save } from "./game/progress";
import { setSoundOn, setVoicePreference } from "./game/sound";
import { DoneScreen } from "./screens/DoneScreen";
import { DrillScreen } from "./screens/DrillScreen";
import { GrownUpsScreen } from "./screens/GrownUpsScreen";
import { LearnScreen } from "./screens/LearnScreen";
import { MapScreen } from "./screens/MapScreen";
import { PlayScreen, type Result } from "./screens/PlayScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";

type Screen =
  | { name: "welcome"; from: "start" | "map" | "grownups" }
  | { name: "map" }
  | { name: "grownups" }
  | { name: "drill" }
  | { name: "play"; levelId: string; run: number }
  | { name: "learn"; levelId: string; run: number }
  | { name: "done"; result: Result; previousBest: number };

/**
 * Dev only: open the app in a given state for previews and screenshots, e.g.
 * ?buddy=pip:own&subject=physics&theme=dark&age=12&open=1&play=phys-hs-fbd (or learn=… or welcome=1).
 */
const preview = import.meta.env.DEV ? new URLSearchParams(location.search) : new URLSearchParams();

// Dev only: ?still=1 settles every animation at once, for screenshots.
if (preview.has("still")) {
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{animation-duration:1ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important}";
  document.head.append(style);
}

function startSave(): Save {
  const save = loadSave();
  if (![...preview.keys()].length) return save;
  return {
    ...save,
    name: preview.get("name") ?? (save.name || "Maya"),
    buddy: preview.has("welcome") ? null : (preview.get("buddy") ?? save.buddy ?? "flare:own"),
    age: preview.has("age") ? Number(preview.get("age")) : save.age,
    subject: (preview.get("subject") as Save["subject"]) ?? save.subject,
    sound: false,
    settings: {
      ...save.settings,
      voice: false,
      openAll: preview.has("open") || save.settings.openAll,
      theme: (preview.get("theme") as Save["settings"]["theme"]) ?? save.settings.theme,
    },
  };
}

function startScreen(save: Save): Screen {
  const play = preview.get("play");
  const learn = preview.get("learn");
  if (play) return { name: "play", levelId: play, run: 1 };
  if (learn) return { name: "learn", levelId: learn, run: 1 };
  return save.buddy ? { name: "map" } : { name: "welcome", from: "start" };
}

export function App() {
  const [save, setSave] = useState<Save>(startSave);
  setBuddy(save.buddy);
  const [screen, setScreen] = useState<Screen>(() => startScreen(save));

  // Night or day: the grown-ups' pick, or the device's.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const pick = save.settings.theme ?? "auto";
      document.documentElement.dataset.theme = pick === "auto" ? (media.matches ? "dark" : "light") : pick;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [save.settings.theme]);

  useEffect(() => {
    storeSave(save);
    setSoundOn(save.sound, save.settings.voice);
    setVoicePreference(save.settings.voiceName);
  }, [save]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  const play = (levelId: string) => setScreen({ name: "play", levelId, run: Date.now() });
  const toggleSound = () => setSave((s) => ({ ...s, sound: !s.sound }));
  const seen = useCallback((levelId: string, keys: string[]) => setSave((s) => rememberSeen(s, levelId, keys)), []);

  function finish(result: Result) {
    const previousBest = save.stars[result.levelId] ?? 0;
    setSave((s) => ({
      ...s,
      stars: { ...s.stars, [result.levelId]: Math.max(previousBest, result.stars) },
      lastLevel: result.levelId,
    }));
    setScreen({ name: "done", result, previousBest });
  }

  switch (screen.name) {
    case "welcome":
      return (
        <WelcomeScreen
          name={save.name}
          buddy={save.buddy}
          age={save.age}
          returning={Boolean(save.buddy)}
          onDone={(name, buddy, age) => {
            setSave((s) => ({ ...s, name, buddy, age }));
            setScreen(screen.from === "grownups" ? { name: "grownups" } : { name: "map" });
          }}
        />
      );
    case "map":
      return (
        <MapScreen
          save={save}
          onPlay={play}
          onLearn={(levelId) => setScreen({ name: "learn", levelId, run: Date.now() })}
          onEditBuddy={() => setScreen({ name: "welcome", from: "map" })}
          onToggleSound={toggleSound}
          onGrownUps={() => setScreen({ name: "grownups" })}
          onDrill={() => setScreen({ name: "drill" })}
          onSubject={(subject) => setSave((s) => ({ ...s, subject }))}
        />
      );
    case "drill":
      return <DrillScreen save={save} onChange={setSave} onToggleSound={toggleSound} onExit={() => setScreen({ name: "map" })} />;
    case "grownups":
      return (
        <GrownUpsScreen
          save={save}
          onChange={setSave}
          onEditChild={() => setScreen({ name: "welcome", from: "grownups" })}
          onClose={() => setScreen({ name: "map" })}
        />
      );
    case "learn":
      return (
        <LearnScreen
          key={screen.run}
          levelId={screen.levelId}
          save={save}
          onToggleSound={toggleSound}
          onExit={() => setScreen({ name: "map" })}
          onPractice={() => play(screen.levelId)}
        />
      );
    case "play":
      return (
        <PlayScreen
          key={screen.run}
          levelId={screen.levelId}
          save={save}
          onToggleSound={toggleSound}
          onExit={() => setScreen({ name: "map" })}
          onFinish={finish}
          onSeen={seen}
        />
      );
    case "done":
      return (
        <DoneScreen
          result={screen.result}
          previousBest={screen.previousBest}
          save={save}
          onNext={play}
          onReplay={() => play(screen.result.levelId)}
          onMap={() => setScreen({ name: "map" })}
        />
      );
  }
}
