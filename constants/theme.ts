export const lightColors = {
  background: "#f6f7f9",
  surface: "#ffffff",
  ink: "#17191d",
  text: "#2e3035",
  muted: "#7e838b",
  faint: "#eef0f3",
  line: "#e7e9ed",
  green: "#45b47c",
  greenDark: "#21935f",
  greenSoft: "#eaf6ef",
  blue: "#5d7df1",
  blueSoft: "#edf1ff",
  violet: "#6d62e9",
  violetSoft: "#eeecff",
  orange: "#f59c45",
  orangeSoft: "#fff1e4",
  red: "#ff5161",
  shadow: "rgba(18, 25, 38, 0.10)"
};

export const darkColors: typeof lightColors = {
  background: "#111316",
  surface: "#1b1f24",
  ink: "#f4f6f8",
  text: "#e6e9ed",
  muted: "#a5acb6",
  faint: "#2a3037",
  line: "#303740",
  green: "#52c78b",
  greenDark: "#65d69b",
  greenSoft: "#183528",
  blue: "#7f99ff",
  blueSoft: "#20284c",
  violet: "#978cff",
  violetSoft: "#29264c",
  orange: "#ffad5f",
  orangeSoft: "#3d2b1a",
  red: "#ff6674",
  shadow: "rgba(0, 0, 0, 0.28)"
};

export const colors = lightColors;
export type AppColors = typeof lightColors;
export type ThemeMode = "light" | "dark";

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999
};
