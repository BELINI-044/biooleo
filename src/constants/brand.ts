export const brand = {
  name: "BIOOLEO BRASIL",

  colors: {
    /** Core palette references to the unified theme Colors */
    primary: "colors.primary",
    primaryDark: "colors.primaryDark",
    yellow: "colors.warning",
    yellowDark: "colors.warningDark",

    text: "colors.text",
    textSecondary: "colors.textSecondary",
    textMuted: "colors.textMuted",

    background: "colors.background",
    surface: "colors.surface",
    surfaceElevated: "colors.surfaceMuted",

    border: "colors.border",
    success: "colors.success",
    error: "colors.error",
    warning: "colors.warning",
  },

  radius: {
    small: 8,
    medium: 12,
    large: 18,
    extraLarge: 24,
  },

  spacing: {
    small: 8,
    medium: 16,
    large: 24,
    extraLarge: 32,
  },
} as const;