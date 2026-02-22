/** Maps programming languages to hex colors.
 *  Palette based on GitHub Linguist colors.
 */
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#ffffff",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Haskell: "#5e5086",
  Scala: "#c22d40",
  Elixir: "#6e4a7e",
  Clojure: "#db5855",
  Lua: "#000080",
  R: "#198CE7",
  MATLAB: "#e16737",
  Julia: "#a270ba",
  Zig: "#ec915c",
  Nix: "#7e7eff",
};

export const DEFAULT_COLOR = "#aaaaaa";

export function getLanguageColor(language: string | null): string {
  if (!language) return DEFAULT_COLOR;
  return LANGUAGE_COLORS[language] ?? DEFAULT_COLOR;
}
