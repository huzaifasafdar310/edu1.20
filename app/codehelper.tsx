// app/codehelper.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore, ChatMessage } from '../src/store/useStore';
import { codeHelper } from '../src/services/groq';
import { Button, LoadingOverlay, Card } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

type CodeAction = 'explain' | 'debug' | 'generate' | 'optimize' | 'convert';
const ACTIONS: { key: CodeAction; label: string; icon: string }[] = [
  { key: 'explain', label: 'Explain', icon: 'lightbulb' },
  { key: 'debug', label: 'Debug', icon: 'bug-report' },
  { key: 'generate', label: 'Generate', icon: 'auto-awesome' },
  { key: 'optimize', label: 'Optimize', icon: 'speed' },
  { key: 'convert', label: 'Convert', icon: 'swap-horiz' },
];
const LANGS = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin'];

export default function CodeHelperScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey, chatHistories, addChatMessage } = useStore();
  const [action, setAction] = useState<CodeAction>('explain');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('Python');
  const [targetLang, setTargetLang] = useState('JavaScript');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function handleSubmit() {
    if (!code.trim()) return Alert.alert('Code Required', action === 'generate' ? 'Describe what you want to generate.' : 'Paste your code.');
    if (!hasApiKey) return Alert.alert('API Key Required', 'Add your Groq API key in Profile.');
    setLoading(true);
    try { setResult(await codeHelper(groqApiKey, action, code, language, targetLang)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingOverlay message="Analyzing code..." />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#00C2FF' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Code Helper</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Action tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ACTIONS.map(a => (
              <TouchableOpacity key={a.key} onPress={() => setAction(a.key)} style={[styles.actionChip, action === a.key && { backgroundColor: '#00C2FF', borderColor: '#00C2FF' }]}>
                <MaterialIcons name={a.icon as any} size={16} color={action === a.key ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.actionText, action === a.key && { color: '#fff' }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Language selector */}
        <Text style={styles.label}>{action === 'convert' ? 'From Language' : 'Language'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LANGS.map(l => (
              <TouchableOpacity key={l} onPress={() => setLanguage(l)} style={[styles.langChip, language === l && { backgroundColor: '#00C2FF', borderColor: '#00C2FF' }]}>
                <Text style={[styles.langText, language === l && { color: '#fff' }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {action === 'convert' && (
          <>
            <Text style={styles.label}>To Language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {LANGS.map(l => (
                  <TouchableOpacity key={l} onPress={() => setTargetLang(l)} style={[styles.langChip, targetLang === l && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                    <Text style={[styles.langText, targetLang === l && { color: '#fff' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Code input */}
        <Text style={styles.label}>{action === 'generate' ? 'Describe what to generate' : 'Your Code'}</Text>
        <View style={styles.codeInputWrapper}>
          <TextInput style={styles.codeInput} placeholder={action === 'generate' ? 'e.g. A function to sort a list of dictionaries by key' : `// Paste your ${language} code here...`} placeholderTextColor={COLORS.textMuted} value={code} onChangeText={setCode} multiline textAlignVertical="top" />
        </View>

        <Button title={`${ACTIONS.find(a => a.key === action)?.label} Code`} onPress={handleSubmit} icon={ACTIONS.find(a => a.key === action)?.icon} style={{ backgroundColor: '#00C2FF', marginBottom: 16 }} />

        {result !== '' && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.textPrimary }}>Result</Text>
              <TouchableOpacity onPress={() => { setCode(result); setResult(''); Alert.alert('Copied to input'); }}>
                <MaterialIcons name="content-copy" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.resultCode}>
              <Text style={styles.resultCodeText}>{result}</Text>
            </View>
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
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  langChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  langText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  codeInputWrapper: { backgroundColor: '#0A1628', borderRadius: 16, padding: 16, marginBottom: 16 },
  codeInput: { fontSize: 14, color: '#E8F4FF', fontFamily: 'Courier New', minHeight: 160, textAlignVertical: 'top', lineHeight: 22 },
  resultCode: { backgroundColor: '#0A1628', borderRadius: 12, padding: 14 },
  resultCodeText: { fontSize: 13, color: '#E8F4FF', fontFamily: 'Courier New', lineHeight: 20 },
});
