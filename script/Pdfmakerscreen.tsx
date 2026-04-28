// src/screens/features/PdfMakerScreen.tsx
import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { generatePdfContent } from '../../services/groq';
import { createAndSharePdf, previewPdf } from '../../services/pdfMaker';
import { Button, Input, LoadingOverlay, Card } from '../../components/UIComponents';
import { COLORS, SHADOWS } from '../../constants/theme';

interface Props { onNavigate: (r: string) => void; }

type DocType = 'notes' | 'report' | 'summary' | 'study_guide';

const DOC_TYPES: { type: DocType; label: string; icon: string; desc: string; color: string }[] = [
    { type: 'notes', label: 'Study Notes', icon: 'edit-note', desc: 'Organized notes with key concepts', color: COLORS.primary },
    { type: 'report', label: 'Academic Report', icon: 'article', desc: 'Structured report with sections', color: '#5856D6' },
    { type: 'summary', label: 'Summary', icon: 'summarize', desc: 'Concise topic overview', color: COLORS.success },
    { type: 'study_guide', label: 'Study Guide', icon: 'menu-book', desc: 'Complete study reference', color: COLORS.warning },
];

export default function PdfMakerScreen({ onNavigate }: Props) {
    const { groqApiKey, hasApiKey } = useStore();
    const [topic, setTopic] = useState('');
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [author, setAuthor] = useState('');
    const [docType, setDocType] = useState<DocType>('notes');
    const [generatingContent, setGeneratingContent] = useState(false);
    const [creatingPdf, setCreatingPdf] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [customContent, setCustomContent] = useState('');
    const [mode, setMode] = useState<'ai' | 'manual'>('ai');

    async function generateContent() {
        if (!topic.trim()) { Alert.alert('Topic Required', 'Please enter a topic.'); return; }
        if (!hasApiKey) { Alert.alert('API Key Required', 'Add your Groq API key in Settings.'); return; }

        setGeneratingContent(true);
        try {
            const content = await generatePdfContent(groqApiKey, docType, topic, additionalInfo);
            setGeneratedContent(content);
        } catch (e: any) {
            Alert.alert('Generation Failed', e.message || 'Could not generate content');
        } finally {
            setGeneratingContent(false);
        }
    }

    async function exportPdf(preview = false) {
        const content = mode === 'ai' ? generatedContent : customContent;
        if (!content.trim()) {
            Alert.alert('No Content', mode === 'ai' ? 'Generate content first.' : 'Enter some content.');
            return;
        }

        const selectedType = DOC_TYPES.find((d) => d.type === docType)!;

        setCreatingPdf(true);
        try {
            const opts = {
                title: topic || 'EduAI Document',
                subtitle: selectedType.label,
                content,
                author: author || undefined,
                type: docType,
                date: new Date().toLocaleDateString(),
            };

            if (preview) {
                await previewPdf(opts);
            } else {
                await createAndSharePdf(opts);
            }
        } catch (e: any) {
            Alert.alert('Export Failed', e.message || 'Could not create PDF');
        } finally {
            setCreatingPdf(false);
        }
    }

    if (generatingContent) return <LoadingOverlay message="AI is writing content..." />;
    if (creatingPdf) return <LoadingOverlay message="Creating your PDF..." />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate('/')} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>PDF Maker</Text>
                    <Text style={styles.headerSubtitle}>Generate beautiful study documents</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                    {(['ai', 'manual'] as const).map((m) => (
                        <TouchableOpacity key={m} onPress={() => setMode(m)} style={[styles.modeBtn, mode === m && styles.modeBtnActive]}>
                            <MaterialIcons
                                name={m === 'ai' ? 'auto-awesome' : 'edit'}
                                size={16}
                                color={mode === m ? COLORS.white : COLORS.textMuted}
                            />
                            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                                {m === 'ai' ? 'AI Generated' : 'Write Manually'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Document Type */}
                <Text style={styles.sectionLabel}>Document Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 10, paddingRight: 16 }}>
                        {DOC_TYPES.map((dt) => (
                            <TouchableOpacity
                                key={dt.type}
                                onPress={() => setDocType(dt.type)}
                                style={[styles.docTypeCard, docType === dt.type && { borderColor: dt.color, backgroundColor: dt.color + '10' }]}
                            >
                                <View style={[styles.docTypeIcon, { backgroundColor: dt.color + '20' }]}>
                                    <MaterialIcons name={dt.icon as any} size={22} color={dt.color} />
                                </View>
                                <Text style={[styles.docTypeLabel, docType === dt.type && { color: dt.color }]}>{dt.label}</Text>
                                <Text style={styles.docTypeDesc}>{dt.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {/* Document Details */}
                <Card style={styles.formCard}>
                    <Input label="Document Title / Topic" placeholder="e.g. Photosynthesis, World War II..." value={topic} onChangeText={setTopic} icon="title" />
                    <Input label="Author (Optional)" placeholder="Your name" value={author} onChangeText={setAuthor} icon="person" />

                    {mode === 'ai' && (
                        <View style={{ marginBottom: 8 }}>
                            <Text style={styles.fieldLabel}>Additional Instructions (Optional)</Text>
                            <TextInput
                                style={styles.multilineInput}
                                placeholder="e.g. Focus on causes and effects, include formulas, add examples..."
                                placeholderTextColor={COLORS.textMuted}
                                value={additionalInfo}
                                onChangeText={setAdditionalInfo}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    )}

                    {mode === 'ai' ? (
                        <Button title="Generate with AI" onPress={generateContent} icon="auto-awesome" />
                    ) : (
                        <View>
                            <Text style={styles.fieldLabel}>Document Content</Text>
                            <TextInput
                                style={[styles.multilineInput, { minHeight: 200 }]}
                                placeholder="Write your content here. Use ## for headings, **bold** for emphasis, - for bullet points..."
                                placeholderTextColor={COLORS.textMuted}
                                value={customContent}
                                onChangeText={setCustomContent}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    )}
                </Card>

                {/* Generated Content Preview */}
                {mode === 'ai' && generatedContent !== '' && (
                    <Card style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            <Text style={styles.previewTitle}>Generated Content</Text>
                            <TouchableOpacity onPress={() => setGeneratedContent('')}>
                                <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.previewText} numberOfLines={12}>{generatedContent}</Text>
                    </Card>
                )}

                {/* Export Buttons */}
                {(generatedContent || customContent) && (
                    <View style={styles.exportRow}>
                        <Button
                            title="Preview"
                            onPress={() => exportPdf(true)}
                            variant="secondary"
                            icon="preview"
                            style={{ flex: 1 }}
                        />
                        <Button
                            title="Export & Share"
                            onPress={() => exportPdf(false)}
                            icon="picture-as-pdf"
                            style={{ flex: 1 }}
                        />
                    </View>
                )}

                {/* Tips */}
                <Card style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>💡 PDF Tips</Text>
                    <Text style={styles.tipText}>• Use **bold** and ## headings for better formatting</Text>
                    <Text style={styles.tipText}>• AI generates structured content ready to export</Text>
                    <Text style={styles.tipText}>• Preview before sharing to check layout</Text>
                    <Text style={styles.tipText}>• Share via email, AirDrop, or save to Files</Text>
                </Card>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: '#FF3B30', paddingTop: 52, paddingBottom: 16,
        paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    modeToggle: {
        flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 14,
        padding: 4, marginBottom: 16, ...SHADOWS.sm,
    },
    modeBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 11,
    },
    modeBtnActive: { backgroundColor: COLORS.primary },
    modeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
    modeBtnTextActive: { color: COLORS.white },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.5 },
    docTypeCard: {
        width: 140, backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
        borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    docTypeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    docTypeLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    docTypeDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 15 },
    formCard: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
    multilineInput: {
        backgroundColor: COLORS.background, borderRadius: 12, padding: 14,
        fontSize: 14, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border,
        minHeight: 80,
    },
    previewCard: { marginBottom: 16 },
    previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    previewTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
    previewText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
    exportRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    tipsCard: { marginBottom: 16, backgroundColor: COLORS.primaryGhost, borderWidth: 1, borderColor: COLORS.primaryMid },
    tipsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 10 },
    tipText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 22 },
});