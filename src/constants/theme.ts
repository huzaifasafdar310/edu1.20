// src/constants/theme.ts

export const COLORS = {
  // Primary Blues
  primary: '#0A84FF',
  primaryDark: '#0060D1',
  primaryLight: '#3D9FFF',
  primaryGhost: '#E8F4FF',
  primaryMid: '#C0DEFF',

  // Accents
  accent: '#00C2FF',
  accentSoft: '#E0F7FF',

  // Whites & Grays
  white: '#FFFFFF',
  background: '#F0F6FF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F7FAFF',
  border: '#D4E4FF',
  borderLight: '#EBF3FF',

  // Text
  textPrimary: '#0A1628',
  textSecondary: '#3D5680',
  textMuted: '#7A94BF',
  textOnBlue: '#FFFFFF',

  // Status
  success: '#00C896',
  successLight: '#E0FFF7',
  warning: '#FF9F0A',
  warningLight: '#FFF4E0',
  error: '#FF453A',
  errorLight: '#FFE5E4',
  info: '#5856D6',
  infoLight: '#EEEEFF',

  // Gradients
  gradientStart: '#0A84FF',
  gradientMid: '#0060D1',
  gradientEnd: '#003DA8',

  // Card backgrounds
  cardBlue: '#0A84FF',
  cardNavy: '#003DA8',
  cardCyan: '#00C2FF',
  cardTeal: '#00B8A9',

  // Shadow
  shadow: 'rgba(10, 132, 255, 0.15)',
  shadowDark: 'rgba(10, 24, 40, 0.12)',
};

export const FONTS = {
  display: 'System',
  body: 'System',
  mono: 'Courier New',
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 9999,
  fontXs: 11,
  fontSm: 13,
  fontMd: 15,
  fontLg: 17,
  fontXl: 20,
  fontXxl: 24,
  fontDisplay: 32,
  fontHero: 40,
  buttonHeight: 52,
  inputHeight: 52,
  headerHeight: 56,
  tabBarHeight: 64,
  iconSm: 16,
  iconMd: 24,
  iconLg: 32,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  colored: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const FEATURE_CARDS = [
  {
    id: 'tutor',
    title: 'AI Tutor',
    subtitle: 'Personal learning assistant',
    icon: 'school',
    color: '#0A84FF',
    gradient: ['#0A84FF', '#003DA8'],
    route: '/tutor',
  },
  {
    id: 'quiz',
    title: 'Smart Quiz',
    subtitle: 'Generate & practice quizzes',
    icon: 'quiz',
    color: '#00B8A9',
    gradient: ['#00B8A9', '#007A73'],
    route: '/quiz',
  },
  {
    id: 'summarize',
    title: 'Summarizer',
    subtitle: 'Condense any content',
    icon: 'summarize',
    color: '#5856D6',
    gradient: ['#5856D6', '#3634A3'],
    route: '/summarize',
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    subtitle: 'AI-generated study cards',
    icon: 'style',
    color: '#FF9F0A',
    gradient: ['#FF9F0A', '#D4760A'],
    route: '/flashcards',
  },
  {
    id: 'essay',
    title: 'Essay Helper',
    subtitle: 'Write & improve essays',
    icon: 'edit-note',
    color: '#FF453A',
    gradient: ['#FF453A', '#D4302F'],
    route: '/essay',
  },
  {
    id: 'codehelper',
    title: 'Code Helper',
    subtitle: 'Debug & learn coding',
    icon: 'code',
    color: '#00C2FF',
    gradient: ['#00C2FF', '#0090C2'],
    route: '/codehelper',
  },
  {
    id: 'translator',
    title: 'Translator',
    subtitle: 'Multi-language learning',
    icon: 'translate',
    color: '#30D158',
    gradient: ['#30D158', '#1A8C36'],
    route: '/translator',
  },
  {
    id: 'studyplan',
    title: 'Study Plan',
    subtitle: 'AI personalised schedule',
    icon: 'event-note',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#D44040'],
    route: '/studyplan',
  },
  {
    id: 'docextract',
    title: 'Doc Extract',
    subtitle: 'Extract text from docs',
    icon: 'description',
    color: '#5E5CE6',
    gradient: ['#5E5CE6', '#3A38B0'],
    route: '/docextract',
  },
  {
    id: 'pdfmaker',
    title: 'PDF Maker',
    subtitle: 'Generate beautiful PDFs',
    icon: 'picture-as-pdf',
    color: '#FF3B30',
    gradient: ['#FF3B30', '#C4211A'],
    route: '/pdfmaker',
  },
  {
    id: 'mindmap',
    title: 'Mind Map',
    subtitle: 'Visualise complex topics',
    icon: 'account-tree',
    color: '#FF2D55',
    gradient: ['#FF2D55', '#D61D44'],
    route: '/mindmap',
  },
];
