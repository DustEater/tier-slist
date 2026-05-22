import { createContext, useContext, useState, type ReactNode } from "react";
import type { Scene } from "../domain/scene";

const SCENE_KEY = "tier-slist-scene";
const CUSTOM_SCENES_KEY = "tier-slist-custom-scenes";

function loadScene(): Scene {
  try {
    const v = localStorage.getItem(SCENE_KEY);
    if (v && typeof v === "string") return v;
  } catch {}
  return "home";
}

function saveScene(scene: Scene): void {
  try {
    localStorage.setItem(SCENE_KEY, scene);
  } catch {}
}

function loadCustomScenes(): Scene[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCENES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string" && s.trim());
    }
  } catch {}
  return [];
}

function saveCustomScenes(scenes: Scene[]): void {
  try {
    localStorage.setItem(CUSTOM_SCENES_KEY, JSON.stringify(scenes));
  } catch {}
}

type SceneContextValue = {
  scene: Scene;
  setScene: (s: Scene) => void;
  customScenes: Scene[];
  addCustomScene: (name: string) => void;
  removeCustomScene: (name: string) => void;
};

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({ children }: { children: ReactNode }) {
  const [scene, setSceneState] = useState<Scene>(loadScene);
  const [customScenes, setCustomScenes] = useState<Scene[]>(loadCustomScenes);

  function setScene(next: Scene) {
    setSceneState(next);
    saveScene(next);
  }

  function addCustomScene(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (customScenes.includes(trimmed)) {
      setSceneState(trimmed);
      saveScene(trimmed);
      return;
    }
    const next = [...customScenes, trimmed];
    setCustomScenes(next);
    saveCustomScenes(next);
    setSceneState(trimmed);
    saveScene(trimmed);
  }

  function removeCustomScene(name: string) {
    const next = customScenes.filter((s) => s !== name);
    setCustomScenes(next);
    saveCustomScenes(next);
    if (scene === name) {
      setSceneState("home");
      saveScene("home");
    }
  }

  return (
    <SceneContext.Provider value={{ scene, setScene, customScenes, addCustomScene, removeCustomScene }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene(): SceneContextValue {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used within SceneProvider");
  return ctx;
}