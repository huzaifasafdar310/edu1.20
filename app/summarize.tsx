// app/summarize.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { summarizeText } from '../src/services/groq';
import { createAndSharePdf } from '../src/services/pdfMaker';
import { Button, LoadingOverlay, Card } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

type SumStyle = 'brief' | 'detailed' | 'bullet_points' | 'academic';
const STYLES: { key: SumStyle; label: string; icon: string }[] = [
  { key: 'brief', label: 'Brief', icon: 'short-text' },
  { key: 'detailed', label: 'Detailed', icon: 'subject' },
  { key: 'bullet_points', label: 'Bullets', icon: 'format-list-bulleted' },
  { key: 'academic', label: 'Academic', icon: 'school' },
];

export default function SummarizerScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey } = useStore();
  const [inputText, setInputText] = useState('');
  const [style, setStyle] = useState<SumStyle>('brief');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function handleSummarize() {
    if (!inputText.trim()) return Alert.alert('No Text', 'Paste some text to summarize.');
    if (!hasApiKey) return Alert.alert('API Key Required', 'Add your Groq API key in Profile.');
    setLoading(true);
    try { setResult(await summarizeText(groqApiKey, inputText, style)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  async function exportPdf() {
    if (!result) return;
    try { await createAndSharePdf({ title: 'Summary', content: result, type: 'summary' }); }
    catch { Alert.alert('Export Failed', 'Could not create PDF'); }
  }

  if (loading) return <LoadingOverlay message="Summarizing..." />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#5856D6' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Summarizer</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Card style={{ marginBottom: 16 }}>
          <Text style={styles.label}>Paste Text to Summarize</Text>
          <TextInput style={styles.bigInput} placeholder="Paste articles, textbook sections, lecture notes..." placeholderTextColor={COLORS.textMuted} value={inputText} onChangeText={setInputText} multiline textAlignVertical="top" />
          <Text style={styles.charCount}>{inputText.length.toLocaleString()} characters · {inputText.split(/\s+/).filter(Boolean).length} words</Text>
        </Card>

        <Text style={styles.label}>Summary Style</Text>
        <View style={styles.styleRow}>
          {STYLES.map(s => (
            <TouchableOpacity key={s.key} onPress={() => setStyle(s.key)} style={[styles.styleChip, style === s.key && { backgroundColor: '#5856D6', borderColor: '#5856D6' }]}>
              <MaterialIcons name={s.icon as any} size={16} color={style === s.key ? '#fff' : COLORS.textMuted} />
              <Text style={[styles.styleText, style === s.key && { color: '#fff' }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Summarize" onPress={handleSummarize} icon="summarize" style={{ marginBottom: 16, backgroundColor: '#5856D6' }} />

        {result !== '' && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.textPrimary }}>Summary</Text>
              <TouchableOpacity onPress={exportPdf} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0EF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <MaterialIcons name="picture-as-pdf" size={18} color="#FF3B30" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF3B30' }}>Export PDF</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 }}>{result}</Text>
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
  bigInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.textPrimary, minHeight: 160, borderWidth: 1, borderColor: COLORS.border },
  charCount: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, textAlign: 'right' },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  styleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  styleText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
});
