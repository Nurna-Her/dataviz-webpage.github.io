export const COLORS = {
  background: "#060E08", // Onyx Greenish Black

  text: {
    primary: "#FFFFFF",
    secondary: "#AAAAAA", // Gray
    muted: "#555555"      // Darker gray
  },

  axis: {
    line: "#27542F",
    tick: "#27542F"
  },

  red: {
    strong: "#A30000",   // Inferno
    bright: "#F53100",   // Scarlet Fire
    scale: d3.interpolateRgb("#A30000", "#F53100")
  },

  green: {
    strong: "#27542F",   // Dark Spruce
    bright: "#9AA140",   // Palm Leaf
    scale: d3.interpolateRgb("#27542F", "#9AA140")
  },

  neutral: {
    dark: "#0A1A1E",
    mid: "#27542F",
    light: "#9AA140"
  }
};
