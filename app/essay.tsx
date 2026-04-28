// app/essay.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { essayHelper } from '../src/services/groq';
import { createAndSharePdf } from '../src/services/pdfMaker';
import { Button, Input, LoadingOverlay, Card } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

type Action = 'outline' | 'write' | 'improve' | 'proofread' | 'analyze';
const ACTIONS: { key: Action; label: string; icon: string; desc: string }[] = [
  { key: 'outline', label: 'Outline', icon: 'format-list-numbered', desc: 'Create a structured outline' },
  { key: 'write', label: 'Write', icon: 'edit', desc: 'Write a full essay' },
  { key: 'improve', label: 'Improve', icon: 'auto-fix-high', desc: 'Enhance clarity & flow' },
  { key: 'proofread', label: 'Proofread', icon: 'spellcheck', desc: 'Fix grammar & spelling' },
  { key: 'analyze', label: 'Analyze', icon: 'analytics', desc: 'Get detailed feedback' },
];
const ESSAY_TYPES = ['Argumentative', 'Expository', 'Narrative', 'Descriptive', 'Persuasive', 'Compare & Contrast'];

export default function EssayScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey } = useStore();
  const [action, setAction] = useState<Action>('write');
  const [content, setContent] = useState('');
  const [essayType, setEssayType] = useState('Argumentative');
  const [wordCount, setWordCount] = useState(500);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function handleSubmit() {
    if (!content.trim()) return Alert.alert('Content Required', action === 'write' || action === 'outline' ? 'Enter a topic or thesis.' : 'Paste your essay text.');
    if (!hasApiKey) return Alert.alert('API Key Required', 'Add your Groq API key in Profile.');
    setLoading(true);
    try { setResult(await essayHelper(groqApiKey, action, content, essayType, wordCount)); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  async function exportPdf() {
    if (!result) return;
    try { await createAndSharePdf({ title: content.slice(0, 60), content: result, type: 'report' }); }
    catch { Alert.alert('Export Failed'); }
  }

  if (loading) return <LoadingOverlay message={`${action === 'write' ? 'Writing essay' : action === 'proofread' ? 'Proofreading' : 'Analyzing'}...`} />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#FF453A' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Essay Helper</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Action Selector */}
        <Text style={styles.label}>What would you like to do?</Text>
        <View style={{ gap: 8, marginBottom: 20 }}>
          {ACTIONS.map(a => (
            <TouchableOpacity key={a.key} onPress={() => setAction(a.key)} style={[styles.actionCard, action === a.key && styles.actionCardActive]}>
              <View style={[styles.actionIcon, action === a.key && { backgroundColor: '#FF453A' }]}><MaterialIcons name={a.icon as any} size={20} color={action === a.key ? '#fff' : COLORS.primary} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.actionLabel, action === a.key && { color: '#FF453A' }]}>{a.label}</Text><Text style={styles.actionDesc}>{a.desc}</Text></View>
              {action === a.key && <MaterialIcons name="check-circle" size={20} color="#FF453A" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Essay Type (only for write/outline) */}
        {(action === 'write' || action === 'outline') && (
          <>
            <Text style={styles.label}>Essay Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ESSAY_TYPES.map(t => (
                  <TouchableOpacity key={t} onPress={() => setEssayType(t)} style={[styles.typeChip, essayType === t && { backgroundColor: '#FF453A', borderColor: '#FF453A' }]}>
                    <Text style={[styles.typeText, essayType === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {action === 'write' && (
              <>
                <Text style={styles.label}>Target Word Count</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {[250, 500, 750, 1000].map(w => (
                    <TouchableOpacity key={w} onPress={() => setWordCount(w)} style={[styles.typeChip, wordCount === w && { backgroundColor: '#FF453A', borderColor: '#FF453A' }]}>
                      <Text style={[styles.typeText, wordCount === w && { color: '#fff' }]}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <Input label={action === 'write' || action === 'outline' ? 'Topic / Thesis' : 'Paste Your Essay'} placeholder={action === 'write' || action === 'outline' ? 'e.g. The impact of social media on education' : 'Paste your essay text here...'} value={content} onChangeText={setContent} multiline numberOfLines={action === 'write' || action === 'outline' ? 3 : 8} />

        <Button title={`${ACTIONS.find(a => a.key === action)?.label} Essay`} onPress={handleSubmit} icon={ACTIONS.find(a => a.key === action)?.icon} style={{ backgroundColor: '#FF453A', marginBottom: 16 }} />

        {result !== '' && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.textPrimary }}>Result</Text>
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
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: COLORS.border },
  actionCardActive: { borderColor: '#FF453A', backgroundColor: '#FFF5F5' },
  actionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryGhost, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  actionDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#fff' },
  typeText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
});
