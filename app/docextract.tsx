// app/docextract.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { pickAndExtractDocument, createDocumentFromText, ExtractedDocument } from '../src/services/documentExtractor';
import { Button, LoadingOverlay, Card } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

export default function DocExtractScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey, updateStats } = useStore();
  const [doc, setDoc] = useState<ExtractedDocument | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function pickDocument() {
    setLoading(true);
    try {
      const extracted = await pickAndExtractDocument();
      if (extracted) { setDoc(extracted); updateStats('documentsProcessed'); }
    } catch (e: any) { Alert.alert('Extraction Failed', e.message); }
    finally { setLoading(false); }
  }

  function usePastedText() {
    if (!pasteText.trim()) return Alert.alert('No Text', 'Paste some text first.');
    const doc = createDocumentFromText(pasteText, 'Pasted Text');
    setDoc(doc); setPasteMode(false);
  }

  if (loading) return <LoadingOverlay message="Extracting text from document..." />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#5E5CE6' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Doc Extract</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {!doc ? (
          <>
            <View style={styles.uploadCard}>
              <View style={styles.uploadIcon}><MaterialIcons name="description" size={40} color="#5E5CE6" /></View>
              <Text style={styles.uploadTitle}>Extract Text from Documents</Text>
              <Text style={styles.uploadSub}>Supports PDF, DOCX, TXT and Markdown files</Text>
              <Button title="Choose File" onPress={pickDocument} icon="folder-open" style={{ backgroundColor: '#5E5CE6', marginTop: 20 }} />
              <TouchableOpacity onPress={() => setPasteMode(!pasteMode)} style={styles.pasteToggle}>
                <MaterialIcons name="content-paste" size={18} color="#5E5CE6" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#5E5CE6' }}>{pasteMode ? 'Hide Paste Area' : 'Or Paste Text Manually'}</Text>
              </TouchableOpacity>
            </View>

            {pasteMode && (
              <Card style={{ marginTop: 16 }}>
                <Text style={styles.label}>Paste Text</Text>
                <TextInput style={styles.pasteInput} placeholder="Paste your text here..." placeholderTextColor={COLORS.textMuted} value={pasteText} onChangeText={setPasteText} multiline textAlignVertical="top" />
                <Button title="Use This Text" onPress={usePastedText} icon="check" style={{ marginTop: 12, backgroundColor: '#5E5CE6' }} />
              </Card>
            )}

            {/* Supported formats info */}
            <View style={styles.formatsCard}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>Supported Formats</Text>
              {[{ icon: 'picture-as-pdf', label: 'PDF', color: '#FF3B30', desc: 'Text-based PDFs' }, { icon: 'description', label: 'DOCX', color: '#0A84FF', desc: 'Word documents' }, { icon: 'text-snippet', label: 'TXT / MD', color: '#30D158', desc: 'Plain text & Markdown' }].map(f => (
                <View key={f.label} style={styles.formatRow}>
                  <MaterialIcons name={f.icon as any} size={22} color={f.color} />
                  <View><Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{f.label}</Text><Text style={{ fontSize: 12, color: COLORS.textMuted }}>{f.desc}</Text></View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Document info */}
            <View style={styles.docInfo}>
              <View style={styles.docIconBg}><MaterialIcons name="description" size={28} color="#5E5CE6" /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }} numberOfLines={2}>{doc.name}</Text>
                <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>{doc.wordCount.toLocaleString()} words · {doc.charCount.toLocaleString()} chars · {doc.sizeKB} KB</Text>
              </View>
              <TouchableOpacity onPress={() => { setDoc(null); }} style={styles.clearBtn}><MaterialIcons name="close" size={20} color={COLORS.textMuted} /></TouchableOpacity>
            </View>

            {/* Text preview */}
            <Card style={{ marginBottom: 16 }}>
              <Text style={styles.label}>Extracted Text</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 }}>{doc.text}</Text>
            </Card>
          </>
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
  uploadCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', ...SHADOWS.sm },
  uploadIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#EEEEFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  uploadTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  uploadSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
  pasteToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  pasteInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, fontSize: 14, color: COLORS.textPrimary, minHeight: 140, borderWidth: 1, borderColor: COLORS.border },
  formatsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 16, ...SHADOWS.sm },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  docInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, ...SHADOWS.sm },
  docIconBg: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#EEEEFF', alignItems: 'center', justifyContent: 'center' },
  clearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  analysisRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  analysisChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  analysisText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF0EF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
