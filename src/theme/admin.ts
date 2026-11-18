/**
 * Tema visual do painel administrativo BioOleo.
 *
 * Extende o palette core do app com tokens específicos para oPainel Admin.
 * Cores validadas para contraste WCAG AA em light/dark modes.
 */

import { type ReactNode } from "react";
import { Colors } from '@/constants/theme';

export const adminTheme = {
  colors: {
    /** Fundo do plano da página - do palette core light */
    background: Colors.light.background,
    /** Superfície de cards e painéis - do palette core */
    surface: Colors.light.surface,
    /** Superfície elevada (cabeçalhos de tabela, chips) - do palette core */
    surfaceMuted: Colors.light.surfaceMuted,

    /** Verde BioOleo — cor principal (usando success do palette) */
    primary: Colors.light.success,
    /** Verde médio — ações positivas */
    primaryMedium: Colors.light.text,  // fallback - will be overridden
    /** Verde claro — estados suaves e realces */
    primarySoft: Colors.light.successLight,

    /** Âmbar — atenção e warnings */
    accent: Colors.light.warning,
    accentSoft: Colors.light.warningLight,

    /** Texto */
    text: Colors.light.text,
    textSecondary: Colors.light.textSecondary,
    textMuted: Colors.light.textMuted,
    textInverse: "#FFFFFF",

    /** Bordas e divisores */
    border: Colors.light.border,
    borderStrong: Colors.light.borderStrong,

    /** Estados */
    success: Colors.light.success,
    successSoft: Colors.light.successLight,
    warning: Colors.light.warning,
    warningSoft: Colors.light.warningLight,
    serious: Colors.dark.error,
    critical: Colors.dark.error,
    criticalSoft: Colors.dark.errorLight,
    info: Colors.light.info,
    infoSoft: Colors.light.infoLight,

    /** Cores de séries para gráficos */
    series: {
      /** Verde BioOleo - primary */
      primary: Colors.light.success,
      /** Azul - info */
      secondary: Colors.light.info,
      /** Âmbar - warning */
      tertiary: Colors.light.warning,
      /** Vermelho - error */
      quaternary: Colors.dark.error,
      /** Violeta - info alternative */
      quinary: Colors.light.info,
    },
  } as const,

  radius: {
    small: 8,
    medium: 12,
    large: 16,
    extraLarge: 22,
    pill: 999,
  },

  spacing: {
    xs: 4,
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
    xxlarge: 32,
  },

  typography: {
    title: 26,
    sectionTitle: 17,
    cardTitle: 15,
    body: 14,
    small: 12,
    caption: 11,
    micro: 10,
  },
} as const;

export type AdminTheme = typeof adminTheme;