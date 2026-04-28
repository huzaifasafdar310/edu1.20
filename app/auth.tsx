// app/auth.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/store/useStore';
import { db } from '../src/services/database';
import { Button, Input } from '../src/components/UIComponents';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

type AuthMode = 'login' | 'register';
function pwStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++; if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return [{ label: 'Very Weak', color: COLORS.error }, { label: 'Weak', color: '#FF6B00' }, { label: 'Fair', color: COLORS.warning }, { label: 'Strong', color: '#00C896' }, { label: 'Very Strong', color: '#00A67E' }][s];
}

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [biometricAvail, setBiometricAvail] = useState(false);
  const { setUser } = useStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
    LocalAuthentication.hasHardwareAsync().then(async (h) => {
      const e = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvail(h && e);
    });
  }, []);

  async function handleBiometricLogin() {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Authenticate to access EduAI', fallbackLabel: 'Use Password' });
    if (result.success) {
      const user = await db.restoreSession();
      if (user) { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setUser(user); router.replace('/(tabs)'); }
      else Alert.alert('No Session', 'Please login with your credentials first.');
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'At least 8 characters required';
    if (mode === 'register') {
      if (!name.trim()) e.name = 'Full name is required';
      if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await db.login(email.trim(), password);
        if (result.success && result.user) {
          const groqKey = await db.getGroqApiKey(result.user.id);
          if (groqKey) result.user.groqApiKey = groqKey;
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setUser(result.user);
          router.replace('/(tabs)');
        } else {
          setErrors({ general: result.error || 'Login failed' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } else {
        const result = await db.register(name.trim(), email.trim(), password);
        if (result.success && result.user) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('🎉 Account Created!', 'Welcome to EduAI! Add your Groq API key in Settings to unlock all AI features.', [{ text: 'Get Started', onPress: () => { setUser(result.user!); router.replace('/(tabs)'); } }]);
        } else {
          setErrors({ general: result.error || 'Registration failed' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } finally { setLoading(false); }
  }

  function switchMode() { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}); setPassword(''); setConfirmPassword(''); }
  const strength = mode === 'register' && password ? pwStrength(password) : null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.bgCircle1} /><View style={styles.bgCircle2} /><View style={styles.bgCircle3} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onLongPress={() => {
              Alert.alert('Developer Options', 'Do you want to reset the entire database? This will remove all accounts.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset Database', style: 'destructive', onPress: async () => { await db.clearAllData(); Alert.alert('Success', 'Database cleared.'); } },
              ]);
            }}
          >
            <View style={styles.logoContainer}><MaterialIcons name="auto-awesome" size={36} color={COLORS.white} /></View>
          </TouchableOpacity>
          <Text style={styles.appName}>EduAI</Text>
          <Text style={styles.appTagline}>Your intelligent study companion</Text>
        </Animated.View>

        <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modeToggle}>
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <TouchableOpacity key={m} onPress={() => m !== mode && switchMode()} style={[styles.modeBtn, mode === m && styles.modeBtnActive]}>
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m === 'login' ? 'Sign In' : 'Sign Up'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {errors.general && (<View style={styles.errorBanner}><MaterialIcons name="error-outline" size={16} color={COLORS.error} /><Text style={styles.errorBannerText}>{errors.general}</Text></View>)}

          {mode === 'register' && <Input label="Full Name" placeholder="Your full name" value={name} onChangeText={setName} icon="person" autoCapitalize="words" error={errors.name} />}
          <Input label="Email Address" placeholder="you@university.edu" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="email" error={errors.email} />
          <Input label="Password" placeholder={mode === 'register' ? 'Min. 8 chars, uppercase, number, symbol' : 'Your password'} value={password} onChangeText={setPassword} secureTextEntry icon="lock" error={errors.password} />

          {strength && password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3].map((i) => {
                  const score = [0, 0, 0, 0].map((_, j) => { let s = 0; if (password.length >= 8) s++; if (/[A-Z]/.test(password)) s++; if (/[0-9]/.test(password)) s++; if (/[^A-Za-z0-9]/.test(password)) s++; return s; })[0];
                  const active = i < ([password.length >= 8 ? 1 : 0, /[A-Z]/.test(password) ? 1 : 0, /[0-9]/.test(password) ? 1 : 0, /[^A-Za-z0-9]/.test(password) ? 1 : 0].reduce((a, b) => a + b, 0));
                  return <View key={i} style={[styles.strengthBar, active && { backgroundColor: strength.color }]} />;
                })}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          {mode === 'register' && <Input label="Confirm Password" placeholder="Re-enter your password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry icon="lock-outline" error={errors.confirmPassword} />}

          <Button title={mode === 'login' ? 'Sign In' : 'Create Account'} onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />

          {mode === 'login' && biometricAvail && (
            <TouchableOpacity onPress={handleBiometricLogin} style={styles.biometricBtn}>
              <MaterialIcons name="fingerprint" size={24} color={COLORS.primary} />
              <Text style={styles.biometricText}>Use Biometric Login</Text>
            </TouchableOpacity>
          )}

          <View style={styles.securityNote}>
            <MaterialIcons name="shield" size={14} color={COLORS.success} />
            <Text style={styles.securityNoteText}>End-to-end encrypted · Data stays on device · Lockout after 5 failed attempts</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.securityFeatures, { opacity: fadeAnim }]}>
          {[{ icon: 'lock', label: 'Encrypted Storage' }, { icon: 'fingerprint', label: 'Biometric Auth' }, { icon: 'key', label: 'Your API Key' }].map((item) => (
            <View key={item.icon} style={styles.securityFeature}>
              <MaterialIcons name={item.icon as any} size={16} color={COLORS.primaryLight} />
              <Text style={styles.securityFeatureText}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryDark },
  bgCircle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.04)', top: -80, right: -60 },
  bgCircle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.03)', top: 120, left: -80 },
  bgCircle3: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(0,194,255,0.1)', bottom: 100, right: -40 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...SHADOWS.colored },
  appName: { fontSize: 32, fontWeight: '800', color: COLORS.white, letterSpacing: -1 },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  formCard: { backgroundColor: COLORS.white, borderRadius: 28, padding: 24, ...SHADOWS.lg },
  modeToggle: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 4, marginBottom: 24 },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: COLORS.white, ...SHADOWS.sm },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  modeBtnTextActive: { color: COLORS.textPrimary },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.errorLight, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorBannerText: { color: COLORS.error, fontSize: 13, fontWeight: '500', flex: 1 },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8, marginBottom: 16 },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  strengthLabel: { fontSize: 11, fontWeight: '600' },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 8 },
  biometricText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  securityNoteText: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  securityFeatures: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 24 },
  securityFeature: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  securityFeatureText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
});
