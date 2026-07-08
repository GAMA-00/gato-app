export interface CoverTheme {
  id: string;
  label: string;
  gradient: string; // Tailwind classes
}

export const COVER_THEMES: CoverTheme[] = [
  {
    id: "coral",
    label: "Coral",
    gradient: "bg-gradient-to-br from-primary via-primary to-orange-400",
  },
  {
    id: "ocean",
    label: "Océano",
    gradient: "bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400",
  },
  {
    id: "forest",
    label: "Bosque",
    gradient: "bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400",
  },
  {
    id: "sunset",
    label: "Atardecer",
    gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400",
  },
  {
    id: "midnight",
    label: "Noche",
    gradient: "bg-gradient-to-br from-indigo-700 via-purple-600 to-violet-500",
  },
];

export function getThemeGradient(themeId?: string | null): string {
  return (
    COVER_THEMES.find((t) => t.id === themeId)?.gradient ??
    COVER_THEMES[0].gradient
  );
}
