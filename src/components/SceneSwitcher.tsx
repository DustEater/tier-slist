import { useState } from "react";
import { useScene } from "../context/SceneContext";
import { SCENE_OPTIONS } from "../domain/scene";

export function SceneSwitcher() {
  const { scene, setScene, customScenes, addCustomScene, removeCustomScene } = useScene();
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");

  function handleBuiltinClick(value: string) {
    setScene(value);
  }

  function handleCustomClick(name: string) {
    setScene(name);
  }

  function handleNewSubmit() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCustomScene(trimmed);
    setNewName("");
    setShowNewInput(false);
  }

  function handleNewKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleNewSubmit();
    } else if (e.key === "Escape") {
      setShowNewInput(false);
      setNewName("");
    }
  }

  return (
    <div className="scene-switcher">
      <span className="scene-switcher-label">场景</span>
      <div className="scene-switcher-tabs">
        {SCENE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`scene-tab ${scene === opt.value ? "scene-tab-active" : ""}`}
            onClick={() => handleBuiltinClick(opt.value)}
          >
            {opt.label}
          </button>
        ))}

        {customScenes.map((name) => (
          <div
            key={name}
            className={`scene-tab scene-tab-custom ${scene === name ? "scene-tab-active" : ""}`}
          >
            <button
              type="button"
              className="scene-tab-inner"
              onClick={() => handleCustomClick(name)}
            >
              {name}
            </button>
            <button
              type="button"
              className="scene-tab-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeCustomScene(name);
              }}
              aria-label={`删除场景 ${name}`}
            >
              ×
            </button>
          </div>
        ))}

        {showNewInput ? (
          <div className="scene-tab-input-wrap">
            <input
              type="text"
              className="scene-tab-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                if (!newName.trim()) {
                  setShowNewInput(false);
                }
              }}
              onKeyDown={handleNewKeyDown}
              placeholder="场景名称"
              autoFocus
              autoComplete="off"
            />
          </div>
        ) : (
          <button
            type="button"
            className="scene-tab scene-tab-new"
            onClick={() => setShowNewInput(true)}
            aria-label="新建场景"
          >
            + 新建
          </button>
        )}
      </div>
    </div>
  );
}