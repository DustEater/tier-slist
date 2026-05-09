import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="配色主题">
      <button
        type="button"
        className={`theme-toggle-btn ${theme === "light" ? "theme-toggle-btn-active" : ""}`}
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
      >
        浅色
      </button>
      <button
        type="button"
        className={`theme-toggle-btn ${theme === "dark" ? "theme-toggle-btn-active" : ""}`}
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
      >
        深色
      </button>
    </div>
  );
}
