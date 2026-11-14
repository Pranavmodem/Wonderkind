import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { unlockOnFirstTap } from "./game/sound";
import "./styles.css";
import "./visuals.css";
import "./screens.css";
import "./activities.css";
import "./physics.css";
import "./chemistry.css";
import "./onboard.css";
import "./theme.css";

unlockOnFirstTap();

// Installable on phones and tablets, and playable offline once loaded.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
