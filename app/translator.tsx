// app/translator.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { translateText } from '../src/services/groq';
import { Button, LoadingOverlay, Card } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

const LANGUAGES = ['Spanish', 'French', 'German', 'Arabic', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Italian', 'Russian', 'Hindi', 'Turkish'];
type Mode = 'translate' | 'explain' | 'vocabulary';
const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'translate', label: 'Translate', icon: 'translate' },
  { key: 'explain', label: 'Explain + Nuances', icon: 'lightbulb' },
  { key: 'vocabulary', label: 'Vocabulary', icon: 'menu-book' },
];

export default function TranslatorScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey } = useStore();
  const [text, setText] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [mode, setMode] = useState<Mode>('translate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function handleTranslate() {
    if (!text.trim()) return Alert.alert('No Text', 'Enter text to translate.');
    if (!hasApiKey) return Alert.alert('API Key Required', 'Add your Groq API key in Profile.');
    setLoading(true);
    try { setResult(await translateText(groqApiKey, text, targetLang, undefined, mode)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingOverlay message="Translating..." />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#30D158' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Translator</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Mode selector */}
        <View style={styles.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity key={m.key} onPress={() => setMode(m.key)} style={[styles.modeChip, mode === m.key && { backgroundColor: '#30D158', borderColor: '#30D158' }]}>
              <MaterialIcons name={m.icon as any} size={15} color={mode === m.key ? '#fff' : COLORS.textMuted} />
              <Text style={[styles.modeText, mode === m.key && { color: '#fff' }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Target Language */}
        <Text style={styles.label}>Translate To</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map(l => (
            <TouchableOpacity key={l} onPress={() => setTargetLang(l)} style={[styles.langChip, targetLang === l && { backgroundColor: '#30D158', borderColor: '#30D158' }]}>
              <Text style={[styles.langText, targetLang === l && { color: '#fff' }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.label}>Text to Translate</Text>
          <TextInput style={styles.textInput} placeholder="Type or paste text here..." placeholderTextColor={COLORS.textMuted} value={text} onChangeText={setText} multiline textAlignVertical="top" />
          <Text style={styles.charCount}>{text.length} characters</Text>
        </Card>

        <Button title={`${MODES.find(m => m.key === mode)?.label} to ${targetLang}`} onPress={handleTranslate} icon="translate" style={{ backgroundColor: '#30D158', marginBottom: 16 }} />

        {result !== '' && (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.textPrimary }}>{targetLang} Translation</Text>
              <View style={styles.langBadge}><Text style={styles.langBadgeText}>{targetLang}</Text></View>
            </View>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 24 }}>{result}</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  modeText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  langChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  langText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  textInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.textPrimary, minHeight: 120, borderWidth: 1, borderColor: COLORS.border },
  charCount: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, textAlign: 'right' },
  langBadge: { backgroundColor: '#E8FFF0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  langBadgeText: { fontSize: 12, fontWeight: '700', color: '#30D158' },
});
