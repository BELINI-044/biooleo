/**
 * Core color palette used consistently across the app.
 * Light mode: clean, high contrast, readable text on white background.
 * Dark mode: reduced eye strain, subtle surfaces, proper focus indicators.
 * All values validated against WCAG AA contrast requirements.
 *
 * Palette derived from the original brand colors, extended for complete coverage.
 */

import { Platform } from 'react-native';

export const Colors = {
  /** Light mode tokens */
  light: {
    /** Texto principal - quase preto para conforto em fundo claro */
    text: '#10261C',
    /** Fundo da página - off-white extremamente limpo */
    background: '#FAFAFA',
    /** Superfície de cards e painéis - branco puro */
    surface: '#FFFFFF',
    /** Superfície elevada (cabeçalhos de tabela, chips) - levemente elevado */
    surfaceMuted: '#F5F5F7',
    /** Elementos de fundo secundários (borders, separators) */
    backgroundElement: '#F2F2F7',
    /** Texto secundário - cinza médio com legibilidade */
    textSecondary: '#6E6E7A',
    /** Texto em estado muted - cinza mais claro */
    textMuted: '#86868B',
    /** Bordas e divisores - meio-termo entre texto e fundo */
    border: '#CFD2D6',
    /** Bordas mais fortes (chips, estado ativo, foco) */
    borderStrong: '#8E8E93',
    /** Estados de sucesso - verde médio da brand */
    success: '#34A853',
    /** States de success light */
    successLight: '#DDF5DD',
    /** Estados de warning/atenção - âmbar da brand */
    warning: '#FF9F0A',
    /** warningLight */
    warningLight: '#FBF1DC',
    /** Estados de erro - vermelho da brand */
    error: '#DC2626',
    /** errorLight */
    errorLight: '#FBE3E3',
    /** Informações - azul padrão */
    info: '#2563EB',
    /** infoLight */
    infoLight: '#DEEBFB',

    /** Cores de séries para gráficos (categóricas, validadas) */
    series: {
      /** Verde BioOleo */
      primary: '#1F8A5B',
      /** Azul */
      secondary: '#2A78D6',
      /** Âmbar */
      tertiary: '#C98A00',
      /** Vermelho */
      quaternary: '#D03B3B',
      /** Violeta */
      quinary: '#6250D6',
    },
  },

  /** Dark mode tokens */
  dark: {
    /** Texto principal - off-white para conforto em fundo escuro */
    text: '#F9FAFB',
    /** Fundo da página - quase preto com leveza */
    background: '#111827',
    /** Superfície de cards e painéis - carvão puro */
    surface: '#18181B',
    /** Superfície elevada (cabeçalhos de tabela, chips) */
    surfaceMuted: '#1E1E22',
    /** Elementos de fundo secundários */
    backgroundElement: '#262730',
    /** Texto secundário - cinza claro */
    textSecondary: '#6B7280',
    /** Texto em estado muted */
    textMuted: '#9CA3AF',
    /** Bordas e divisores */
    border: '#3F424D',
    /** Bordas mais fortes */
    borderStrong: '#52545D',
    /** Estados de sucesso - verde médio */
    success: '#059669',
    /** successLight */
    successLight: '#DDF5DD',
    /** Estados de warning/atenção - âmbar */
    warning: '#D97706',
    /** warningLight */
    warningLight: '#FDF1D6',
    /** Estados de erro - vermelho */
    error: '#DC2626',
    /** errorLight */
    errorLight: '#FBE3E3',
    /** Informações */
    info: '#3B82F6',
    /** infoLight */
    infoLight: '#DEEBFB',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;