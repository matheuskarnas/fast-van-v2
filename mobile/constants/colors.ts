import { theme } from "./theme";

export const Colors = {
  primary: theme.colors.brand.navy,
  secondary: theme.colors.brand.orange,
  success: theme.colors.feedback.success,
  error: theme.colors.feedback.error,
  warning: theme.colors.feedback.warning,
  info: "#4B74D9",
  light: theme.colors.background.app,
  dark: theme.colors.text.primary,
  white: theme.colors.text.inverse,
  black: "#000000",
  gray: {
    50: "#F8F9FC",
    100: "#F0F2F7",
    200: "#E4E8F0",
    300: "#D4DAE4",
    400: "#A5AFBD",
    500: "#8A93A1",
    600: "#5F6B7A",
    700: "#334155",
    800: "#1B2430",
    900: "#0A2B5B",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 32,
};

export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export { theme };
