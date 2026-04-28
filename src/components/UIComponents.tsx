// src/components/UIComponents.tsx
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, ViewStyle, Animated, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

// ── Button ────────────────────────────────────────────────────────
interface ButtonProps { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: string; style?: ViewStyle; }
export const Button: React.FC<ButtonProps> = ({ title, onPress, loading = false, disabled = false, variant = 'primary', size = 'md', icon, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  const heights = { sm: 40, md: 52, lg: 56 };
  const fontSizes = { sm: 13, md: 15, lg: 16 };
  const v = { primary: { bg: COLORS.primary, text: COLORS.white, border: 'transparent' }, secondary: { bg: COLORS.primaryGhost, text: COLORS.primary, border: 'transparent' }, ghost: { bg: 'transparent', text: COLORS.primary, border: COLORS.primary }, danger: { bg: COLORS.error, text: COLORS.white, border: 'transparent' } }[variant];
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} disabled={disabled || loading} activeOpacity={1}
        style={[{ height: heights[size], backgroundColor: disabled ? COLORS.border : v.bg, borderRadius: SIZES.radiusMd, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: v.border !== 'transparent' ? 1.5 : 0, borderColor: v.border as any, paddingHorizontal: size === 'sm' ? 16 : 24, ...(variant === 'primary' && !disabled ? SHADOWS.colored : {}) }, style]}>
        {loading ? <ActivityIndicator color={v.text} size="small" /> : (<>
          {icon && <MaterialIcons name={icon as any} size={18} color={disabled ? COLORS.textMuted : v.text} />}
          <Text style={{ color: disabled ? COLORS.textMuted : v.text, fontSize: fontSizes[size], fontWeight: '600', letterSpacing: 0.2 }}>{title}</Text>
        </>)}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Input ─────────────────────────────────────────────────────────
interface InputProps { label?: string; placeholder?: string; value: string; onChangeText: (t: string) => void; secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'numeric'; autoCapitalize?: 'none' | 'sentences' | 'words'; multiline?: boolean; numberOfLines?: number; icon?: string; error?: string; style?: ViewStyle; editable?: boolean; onFocus?: () => void; onBlur?: () => void; }
export const Input: React.FC<InputProps> = ({ label, placeholder, value, onChangeText, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences', multiline = false, numberOfLines = 1, icon, error, style, editable = true, onFocus, onBlur }) => {
  const [focused, setFocused] = React.useState(false);
  const [show, setShow] = React.useState(false);
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label && <Text style={s.inputLabel}>{label}</Text>}
      <View style={[s.inputContainer, focused && s.inputFocused, error ? s.inputError : {}, !editable && { backgroundColor: COLORS.surfaceSecondary }]}>
        {icon && <MaterialIcons name={icon as any} size={20} color={focused ? COLORS.primary : COLORS.textMuted} style={{ marginLeft: 14 }} />}
        <TextInput style={[s.input, multiline && { height: numberOfLines * 24 + 16, textAlignVertical: 'top', paddingTop: 12 }, icon ? { paddingLeft: 10 } : { paddingLeft: 16 }]}
          placeholder={placeholder} placeholderTextColor={COLORS.textMuted} value={value} onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !show} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
          multiline={multiline} numberOfLines={numberOfLines} editable={editable}
          onFocus={() => { setFocused(true); onFocus?.(); }} onBlur={() => { setFocused(false); onBlur?.(); }} />
        {secureTextEntry && <TouchableOpacity onPress={() => setShow(!show)} style={{ paddingRight: 14 }}>
          <MaterialIcons name={show ? 'visibility-off' : 'visibility'} size={20} color={COLORS.textMuted} />
        </TouchableOpacity>}
      </View>
      {error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
};

// ── Card ──────────────────────────────────────────────────────────
interface CardProps { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; padding?: number; }
export const Card: React.FC<CardProps> = ({ children, style, onPress, padding = 20 }) => {
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.card, { padding }, style]}>{children}</TouchableOpacity>;
  return <View style={[s.card, { padding }, style]}>{children}</View>;
};

// ── Section Header ────────────────────────────────────────────────
export const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: { label: string; onPress: () => void } }> = ({ title, subtitle, action }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
    <View><Text style={s.sectionTitle}>{title}</Text>{subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}</View>
    {action && <TouchableOpacity onPress={action.onPress}><Text style={{ color: COLORS.primary, fontSize: SIZES.fontSm, fontWeight: '600' }}>{action.label}</Text></TouchableOpacity>}
  </View>
);

// ── Badge ─────────────────────────────────────────────────────────
export const Badge: React.FC<{ label: string; color?: string; bgColor?: string; size?: 'sm' | 'md' }> = ({ label, color = COLORS.primary, bgColor = COLORS.primaryGhost, size = 'md' }) => (
  <View style={{ backgroundColor: bgColor, paddingHorizontal: size === 'sm' ? 8 : 12, paddingVertical: size === 'sm' ? 3 : 5, borderRadius: SIZES.radiusFull }}>
    <Text style={{ color, fontSize: size === 'sm' ? 10 : 12, fontWeight: '600', letterSpacing: 0.3 }}>{label}</Text>
  </View>
);

// ── Loading Overlay ───────────────────────────────────────────────
export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Thinking...' }) => (
  <View style={s.loadingOverlay}>
    <View style={s.loadingBox}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={s.loadingText}>{message}</Text>
      <Text style={s.loadingSubtext}>Powered by Groq ⚡</Text>
    </View>
  </View>
);

// ── Empty State ───────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: string; title: string; subtitle?: string; action?: { label: string; onPress: () => void } }> = ({ icon, title, subtitle, action }) => (
  <View style={s.emptyState}>
    <View style={s.emptyIconBg}><MaterialIcons name={icon as any} size={36} color={COLORS.primary} /></View>
    <Text style={s.emptyTitle}>{title}</Text>
    {subtitle && <Text style={s.emptySubtitle}>{subtitle}</Text>}
    {action && <Button title={action.label} onPress={action.onPress} size="sm" style={{ marginTop: 20 }} />}
  </View>
);

// ── Chat Bubble ───────────────────────────────────────────────────
export const ChatBubble: React.FC<{ message: string; role: 'user' | 'assistant'; timestamp?: string }> = ({ message, role, timestamp }) => {
  const isUser = role === 'user';
  return (
    <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12, paddingHorizontal: 16 }}>
      {!isUser && <View style={s.aiBubbleIcon}><MaterialIcons name="auto-awesome" size={14} color={COLORS.white} /></View>}
      <View style={{ maxWidth: '78%', backgroundColor: isUser ? COLORS.primary : COLORS.white, borderRadius: 18, padding: 14, ...(!isUser ? SHADOWS.sm : SHADOWS.colored) }}>
        <Text style={{ color: isUser ? COLORS.white : COLORS.textPrimary, fontSize: SIZES.fontMd, lineHeight: 22 }}>{message}</Text>
        {timestamp && <Text style={{ color: isUser ? 'rgba(255,255,255,0.6)' : COLORS.textMuted, fontSize: 10, marginTop: 4 }}>{timestamp}</Text>}
      </View>
    </View>
  );
};

// ── No API Key Banner ─────────────────────────────────────────────
export const NoApiKeyBanner: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={s.apiKeyBanner}>
    <MaterialIcons name="key" size={20} color={COLORS.warning} />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={{ color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 }}>Groq API Key Required</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }}>Tap to add your free Groq API key to unlock all features</Text>
    </View>
    <MaterialIcons name="arrow-forward-ios" size={16} color={COLORS.textMuted} />
  </TouchableOpacity>
);

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, ...SHADOWS.sm },
  inputLabel: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, borderWidth: 1.5, borderColor: COLORS.border, height: SIZES.inputHeight, ...SHADOWS.sm },
  inputFocused: { borderColor: COLORS.primary, ...SHADOWS.md },
  inputError: { borderColor: COLORS.error },
  input: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.textPrimary, paddingRight: 16, height: '100%' },
  errorText: { color: COLORS.error, fontSize: SIZES.fontXs, marginTop: 4, marginLeft: 4 },
  sectionTitle: { fontSize: SIZES.fontXl, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 2 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,24,40,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  loadingBox: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusXl, padding: 32, alignItems: 'center', gap: 12, ...SHADOWS.lg, minWidth: 200 },
  loadingText: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginTop: 4 },
  loadingSubtext: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryGhost, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: SIZES.fontXl, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  aiBubbleIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 4 },
  apiKeyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warningLight, borderRadius: SIZES.radiusMd, padding: 16, margin: 16, borderWidth: 1, borderColor: '#FFE0A0' },
});
