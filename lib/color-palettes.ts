export interface ColorPalette {
  name: string;
  label: string;
  light: ThemeColors;
  dark: ThemeColors;
  chart: string[];
}

interface ThemeColors {
  bg: string;
  text: string;
  primary: string;
  income: string;
  expense: string;
  cardBg: string;
  border: string;
  muted: string;
}

export const palettes: Record<string, ColorPalette> = {
  warm: {
    name: 'warm',
    label: '暖色像素',
    light: {
      bg: '#f0ebe3',
      text: '#2d2418',
      primary: '#e6a756',
      income: '#7ec88b',
      expense: '#e8756d',
      cardBg: '#ffffff',
      border: '#3d2e1a',
      muted: '#8c7a66',
    },
    dark: {
      bg: '#1a1a2e',
      text: '#f0ebe3',
      primary: '#e6a756',
      income: '#7ec88b',
      expense: '#e8756d',
      cardBg: '#2a2a4a',
      border: '#e6a756',
      muted: '#8888aa',
    },
    chart: ['#e6a756', '#7ec88b', '#e8756d', '#74b4d9', '#d4a0d4', '#8bc8c8', '#f0c87a', '#c8a07e'],
  },
  cool: {
    name: 'cool',
    label: '冷色像素',
    light: {
      bg: '#eef2f7',
      text: '#1a2332',
      primary: '#5b9bd5',
      income: '#6bcf8e',
      expense: '#f07070',
      cardBg: '#ffffff',
      border: '#2c3e50',
      muted: '#6b7d8e',
    },
    dark: {
      bg: '#0f0f23',
      text: '#eef2f7',
      primary: '#5b9bd5',
      income: '#6bcf8e',
      expense: '#f07070',
      cardBg: '#1a1a3a',
      border: '#5b9bd5',
      muted: '#7788aa',
    },
    chart: ['#5b9bd5', '#6bcf8e', '#f07070', '#a78bfa', '#f0a060', '#60d0d0', '#d070b0', '#90c060'],
  },
  soft: {
    name: 'soft',
    label: '柔和中性',
    light: {
      bg: '#faf8f5',
      text: '#2d2d3f',
      primary: '#8b7ec8',
      income: '#7bc89b',
      expense: '#e07b7b',
      cardBg: '#ffffff',
      border: '#4a4a5a',
      muted: '#8888a0',
    },
    dark: {
      bg: '#2d2d3f',
      text: '#faf8f5',
      primary: '#8b7ec8',
      income: '#7bc89b',
      expense: '#e07b7b',
      cardBg: '#3d3d52',
      border: '#8b7ec8',
      muted: '#9999b0',
    },
    chart: ['#8b7ec8', '#7bc89b', '#e07b7b', '#7ab8d4', '#d4a07b', '#c87bb8', '#7bc8c8', '#c8b87b'],
  },
};

export const defaultPalette = 'warm';
