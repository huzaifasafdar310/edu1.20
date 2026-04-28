// app/(tabs)/profile.tsx — Settings & Profile
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/store/useStore';
import { db } from '../../src/services/database';
import { validateApiKey } from '../../src/services/groq';
import { Button, Input } from '../../src/components/UIComponents';
import { COLORS, SHADOWS, SIZES } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, groqApiKey, hasApiKey, setGroqApiKey, logout } = useStore();
  const [apiKeyInput, setApiKeyInput] = useState(groqApiKey || '');
  const [validating, setValidating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) { Alert.alert('Empty Key', 'Please enter your Groq API key.'); return; }
    setValidating(true);
    try {
      const result = await validateApiKey(apiKeyInput.trim());
      if (result.valid) {
        await db.saveGroqApiKey(user!.id, apiKeyInput.trim());
        setGroqApiKey(apiKeyInput.trim());
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ API Key Saved', 'Your Groq API key is valid and saved securely!');
      } else {
        Alert.alert('❌ Invalid Key', result.error || 'This API key is not valid. Please check and try again.');
      }
    } catch { Alert.alert('Error', 'Could not validate API key. Check your internet connection.'); }
    finally { setValidating(false); }
  }

  async function handleResetApp() {
    Alert.alert('Reset App Data', 'This will delete ALL accounts and settings. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset Everything', style: 'destructive', onPress: async () => { await db.clearAllData(); logout(); router.replace('/auth'); } },
    ]);
  }

  async function handleRemoveApiKey() {
    Alert.alert('Remove API Key', 'This will disable all AI features.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await db.deleteGroqApiKey(user!.id); setGroqApiKey(''); setApiKeyInput(''); } },
    ]);
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await db.logout(); logout(); router.replace('/auth'); } },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert('Delete Account', 'This will permanently delete all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await db.deleteAccount(user!.id); logout(); router.replace('/auth'); } },
    ]);
  }

  const maskedKey = groqApiKey ? `${groqApiKey.slice(0, 8)}${'•'.repeat(20)}${groqApiKey.slice(-4)}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text></View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.memberSince}>Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsCard}>
          {[
            { label: 'Questions', value: user?.stats.questionsAsked || 0 },
            { label: 'Quizzes', value: user?.stats.quizzesTaken || 0 },
            { label: 'Docs', value: user?.stats.documentsProcessed || 0 },
            { label: 'Streak', value: `${user?.stats.studyStreak || 0}d` },
          ].map((s, i, arr) => (
            <View key={s.label} style={[styles.statItem, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: COLORS.borderLight }]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* API Key Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="key" size={20} color={hasApiKey ? COLORS.success : COLORS.warning} />
            <Text style={styles.sectionTitle}>Groq API Key</Text>
            <View style={[styles.statusBadge, { backgroundColor: hasApiKey ? COLORS.successLight : COLORS.warningLight }]}>
              <Text style={[styles.statusText, { color: hasApiKey ? COLORS.success : COLORS.warning }]}>{hasApiKey ? 'Active' : 'Not Set'}</Text>
            </View>
          </View>
          <Text style={styles.sectionDesc}>Get your free API key at <Text onPress={() => Linking.openURL('https://console.groq.com/keys')} style={{ color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline' }}>console.groq.com/keys</Text></Text>

          {hasApiKey && (
            <View style={styles.currentKey}>
              <MaterialIcons name="shield" size={16} color={COLORS.success} />
              <Text style={styles.currentKeyText}>{showApiKey ? groqApiKey : maskedKey}</Text>
              <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)}><MaterialIcons name={showApiKey ? 'visibility-off' : 'visibility'} size={18} color={COLORS.textMuted} /></TouchableOpacity>
            </View>
          )}

          <Input label={hasApiKey ? 'Update API Key' : 'Enter API Key'} placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" value={apiKeyInput} onChangeText={setApiKeyInput} icon="vpn-key" autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={validating ? 'Validating...' : 'Save & Validate'} onPress={handleSaveApiKey} loading={validating} style={{ flex: 1 }} />
            {hasApiKey && <Button title="Remove" onPress={handleRemoveApiKey} variant="danger" style={{ flex: 1 }} />}
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="security" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Security</Text>
          </View>
          {[
            { icon: 'lock', label: 'Password hashed with salt', ok: true },
            { icon: 'fingerprint', label: 'Biometric authentication available', ok: true },
            { icon: 'storage', label: 'API key encrypted in SecureStore', ok: true },
            { icon: 'timer-off', label: 'Account locks after 5 failed attempts', ok: true },
          ].map((item) => (
            <View key={item.label} style={styles.securityItem}>
              <MaterialIcons name={item.icon as any} size={18} color={COLORS.success} />
              <Text style={styles.securityText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Account Actions */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={COLORS.warning} />
            <Text style={[styles.actionText, { color: COLORS.warning }]}>Sign Out</Text>
            <MaterialIcons name="arrow-forward-ios" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: COLORS.borderLight, marginVertical: 4 }} />
          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
            <MaterialIcons name="delete-forever" size={20} color={COLORS.error} />
            <Text style={[styles.actionText, { color: COLORS.error }]}>Delete Account</Text>
            <MaterialIcons name="arrow-forward-ios" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>EduAI v1.0.0 · Powered by Groq</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  userName: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  memberSince: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  statsCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 16, ...SHADOWS.sm, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '500' },
  sectionCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 16, ...SHADOWS.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sectionDesc: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 20 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  currentKey: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.successLight, borderRadius: 12, padding: 12, marginBottom: 16 },
  currentKeyText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Courier New' },
  securityItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  securityText: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
});
