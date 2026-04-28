// src/screens/features/DocExtractScreen.tsx
import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { pickAndExtractDocument, createDocumentFromText, ExtractedDocument } from '../../services/documentExtractor';
import { analyzeExtractedText } from '../../services/groq';
import { Button, LoadingOverlay, Card } from '../../components/UIComponents';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

interface Props { onNavigate: (r: string) => void; }

type AnalysisType = 'summary' | 'keypoints' | 'questions' | 'concepts';

export default function DocExtractScreen({ onNavigate }: Props) {
    const { groqApiKey, hasApiKey, updateStats } = useStore();
    const [extracting, setExtracting] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [doc, setDoc] = useState<ExtractedDocument | null>(null);
    const [analysis, setAnalysis] = useState('');
    const [activeTab, setActiveTab] = useState<'extract' | 'paste'>('extract');
    const [pastedText, setPastedText] = useState('');
    const [pasteTitle, setPasteTitle] = useState('');

    async function handlePickDocument() {
        setExtracting(true);
        try {
            const extracted = await pickAndExtractDocument();
            if (extracted) {
                setDoc(extracted);
                setAnalysis('');
                updateStats('documentsProcessed');
            }
        } catch (e: any) {
            Alert.alert('Extraction Failed', e.message || 'Could not extract text from file');
        } finally {
            setExtracting(false);
        }
    }

    function handlePasteSubmit() {
        if (!pastedText.trim()) {
            Alert.alert('No Text', 'Please paste some text first.');
            return;
        }
        const extracted = createDocumentFromText(pastedText, pasteTitle || 'Pasted Text');
        setDoc(extracted);
        setAnalysis('');
    }

    async function analyze(type: AnalysisType) {
        if (!doc) return;
        if (!hasApiKey) {
            Alert.alert('API Key Required', 'Add your Groq API key in Settings.');
            return;
        }

        setAnalyzing(true);
        try {
            const result = await analyzeExtractedText(groqApiKey, doc.text, type);
            setAnalysis(result);
        } catch (e: any) {
            Alert.alert('Analysis Failed', e.message || 'Failed to analyze document');
        } finally {
            setAnalyzing(false);
        }
    }

    if (extracting) return <LoadingOverlay message="Extracting text..." />;
    if (analyzing) return <LoadingOverlay message="Analyzing document..." />;

    const analysisOptions: { type: AnalysisType; label: string; icon: string; color: string }[] = [
        { type: 'summary', label: 'Summary', icon: 'summarize', color: COLORS.primary },
        { type: 'keypoints', label: 'Key Points', icon: 'format-list-bulleted', color: COLORS.success },
        { type: 'questions', label: 'Study Questions', icon: 'help-outline', color: COLORS.info },
        { type: 'concepts', label: 'Key Concepts', icon: 'lightbulb-outline', color: COLORS.warning },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate('/')} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Document Extractor</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Tab toggle */}
                <View style={styles.tabToggle}>
                    {(['extract', 'paste'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                        >
                            <MaterialIcons
                                name={tab === 'extract' ? 'upload-file' : 'content-paste'}
                                size={18}
                                color={activeTab === tab ? COLORS.white : COLORS.textMuted}
                            />
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'extract' ? 'Upload File' : 'Paste Text'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Upload Panel */}
                {activeTab === 'extract' && (
                    <Card style={{ marginBottom: 16 }}>
                        <TouchableOpacity onPress={handlePickDocument} style={styles.uploadZone} activeOpacity={0.8}>
                            <View style={styles.uploadIcon}>
                                <MaterialIcons name="upload-file" size={32} color={COLORS.primary} />
                            </View>
                            <Text style={styles.uploadTitle}>Tap to select a document</Text>
                            <Text style={styles.uploadSubtitle}>Supports PDF, DOCX, TXT files</Text>
                        </TouchableOpacity>
                    </Card>
                )}

                {/* Paste Panel */}
                {activeTab === 'paste' && (
                    <Card style={{ marginBottom: 16 }}>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Document title (optional)"
                            placeholderTextColor={COLORS.textMuted}
                            value={pasteTitle}
                            onChangeText={setPasteTitle}
                        />
                        <TextInput
                            style={styles.pasteInput}
                            placeholder="Paste your text here..."
                            placeholderTextColor={COLORS.textMuted}
                            value={pastedText}
                            onChangeText={setPastedText}
                            multiline
                            numberOfLines={8}
                            textAlignVertical="top"
                        />
                        <Button title="Process Text" onPress={handlePasteSubmit} icon="check" size="md" style={{ marginTop: 12 }} />
                    </Card>
                )}

                {/* Extracted Document Info */}
                {doc && (
                    <>
                        <Card style={styles.docInfo}>
                            <View style={styles.docInfoRow}>
                                <View style={styles.docIcon}>
                                    <MaterialIcons name="description" size={24} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                                    <Text style={styles.docMeta}>
                                        {doc.wordCount.toLocaleString()} words · {doc.charCount.toLocaleString()} chars · {doc.sizeKB}KB
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => { setDoc(null); setAnalysis(''); }}>
                                    <MaterialIcons name="close" size={20} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </Card>

                        {/* Extracted preview */}
                        <Card style={styles.previewCard}>
                            <Text style={styles.previewTitle}>Extracted Text Preview</Text>
                            <Text style={styles.previewText} numberOfLines={6}>
                                {doc.text}
                            </Text>
                        </Card>

                        {/* AI Analysis Options */}
                        <Text style={styles.sectionTitle}>AI Analysis</Text>
                        <View style={styles.analysisGrid}>
                            {analysisOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt.type}
                                    onPress={() => analyze(opt.type)}
                                    style={[styles.analysisCard, { borderTopColor: opt.color }]}
                                >
                                    <View style={[styles.analysisIcon, { backgroundColor: opt.color + '18' }]}>
                                        <MaterialIcons name={opt.icon as any} size={22} color={opt.color} />
                                    </View>
                                    <Text style={styles.analysisLabel}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Analysis Result */}
                        {analysis !== '' && (
                            <Card style={styles.resultCard}>
                                <Text style={styles.resultText}>{analysis}</Text>
                            </Card>
                        )}
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: '#5E5CE6',
        paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
    tabToggle: {
        flexDirection: 'row', backgroundColor: COLORS.white,
        borderRadius: 14, padding: 4, marginBottom: 16, ...SHADOWS.sm,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 10, borderRadius: 11,
    },
    tabActive: { backgroundColor: COLORS.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
    tabTextActive: { color: COLORS.white },
    uploadZone: {
        alignItems: 'center', paddingVertical: 32,
        borderWidth: 2, borderColor: COLORS.primaryMid,
        borderStyle: 'dashed', borderRadius: 16,
        backgroundColor: COLORS.primaryGhost,
    },
    uploadIcon: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: COLORS.white, alignItems: 'center',
        justifyContent: 'center', marginBottom: 16, ...SHADOWS.sm,
    },
    uploadTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    uploadSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
    titleInput: {
        backgroundColor: COLORS.background, borderRadius: 10, padding: 12,
        fontSize: 14, color: COLORS.textPrimary, marginBottom: 10,
        borderWidth: 1, borderColor: COLORS.border,
    },
    pasteInput: {
        backgroundColor: COLORS.background, borderRadius: 12, padding: 14,
        fontSize: 14, color: COLORS.textPrimary, minHeight: 160,
        borderWidth: 1, borderColor: COLORS.border,
    },
    docInfo: { marginBottom: 12 },
    docInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    docIcon: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: COLORS.primaryGhost, alignItems: 'center', justifyContent: 'center',
    },
    docName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
    docMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    previewCard: { marginBottom: 20 },
    previewTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
    previewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
    analysisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    analysisCard: {
        width: '47%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
        borderTopWidth: 3, ...SHADOWS.sm,
    },
    analysisIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    analysisLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    resultCard: { marginBottom: 16 },
    resultText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
});