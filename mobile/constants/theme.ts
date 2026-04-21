export const theme = {
  colors: {
    brand: {
      navy: "#0A2B5B",
      orange: "#F7931E",
      orangeDark: "#E48310",
    },
    background: {
      app: "#F4F5FA",
      screen: "#F4F5FA",
      auth: "#101A3B",
      card: "#FFFFFF",
      muted: "#F0F2F7",
      input: "#F3F4F7",
    },
    text: {
      primary: "#1B2430",
      secondary: "#5F6B7A",
      muted: "#8A93A1",
      inverse: "#FFFFFF",
      brand: "#0A2B5B",
      accent: "#F7931E",
    },
    border: {
      soft: "#E4E8F0",
      default: "#CBD5E1",
      input: "#D4DAE4",
    },
    feedback: {
      error: "#D94A4A",
      success: "#2FA56A",
      warning: "#F0B232",
    },
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  font: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 36,
  },
  shadow: {
    card: {
      shadowColor: "#0A2B5B",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
  },
} as const;

export type Theme = typeof theme;
