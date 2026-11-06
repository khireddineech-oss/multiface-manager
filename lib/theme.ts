import type { ThemeMode } from './types';

export const createTheme = (mode: ThemeMode) => {
  const dark = mode === 'dark';
  return {
    mode,
    dark,
    background: dark ? '#070A14' : '#F2F5FC',
    backgroundElevated: dark ? '#0C1121' : '#FFFFFF',
    surface: dark ? '#11182B' : '#FFFFFF',
    surfaceMuted: dark ? '#161F35' : '#EDF1FA',
    surfacePressed: dark ? '#1C2741' : '#E2E9F8',
    border: dark ? '#26314B' : '#DDE4F2',
    borderBright: dark ? '#3B4B70' : '#C8D4EB',
    text: dark ? '#F5F7FF' : '#11182A',
    textSecondary: dark ? '#A9B4CC' : '#5D6980',
    textMuted: dark ? '#74809A' : '#8792A7',
    primary: dark ? '#82A2FF' : '#3467EB',
    primaryStrong: '#4F46E5',
    facebook: '#1877F2',
    success: dark ? '#4ADE9C' : '#11875D',
    successSurface: dark ? '#102C29' : '#E3F8EF',
    warning: dark ? '#FBBF68' : '#A65C00',
    warningSurface: dark ? '#302316' : '#FFF4DE',
    danger: dark ? '#FF7D91' : '#D93655',
    dangerSurface: dark ? '#321823' : '#FFF0F3',
    overlay: dark ? 'rgba(2, 5, 14, 0.82)' : 'rgba(18, 27, 48, 0.48)',
    gradient: ['#4159D9', '#635BDF', '#8B5CF6'] as const,
    heroGradient: dark
      ? (['#111D42', '#11152C', '#0C1121'] as const)
      : (['#E7EDFF', '#F3F0FF', '#FFFFFF'] as const),
    tabGradient: dark
      ? (['#11182B', '#0C1121'] as const)
      : (['#FFFFFF', '#F8FAFF'] as const),
    shadow: dark ? '#000000' : '#526188',
  };
};

export type AppTheme = ReturnType<typeof createTheme>;
