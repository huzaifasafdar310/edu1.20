// src/screens/features/SummarizerScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { summarizeText } from '../../services/groq';
import { createAndSharePdf } from '../../services/pdfMaker';
import { Button, LoadingOverlay, Card } from '../../components/UIComponents';
import { COLORS, SHADOWS } from '../../constants/theme';

interface Props { onNavigate: (r: string) => void; }

type SumStyle = 'brief' | 'detailed' | 'bullet_points' | 'academic';

const STYLES: { key: SumStyle; label: string; icon: string }[] = [
    { key: 'brief', label: 'Brief', icon: 'short-text' },
    { key: 'detailed', label: 'Detailed', icon: 'subject' },
    { key: 'bullet_points', label: 'Bullet Points', icon: 'format-list-bulleted' },
    { key: 'academic', label: 'Academic', icon: 'school' },
];

export default function SummarizerScreen({ onNavigate }: Props) {
    const { groqApiKey, hasApiKey } = useStore();
    const [inputText, setInputText] = useState('');
    const [style, setStyle] = useState<SumStyle>('brief');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');

    async function handleSummarize() {
        if (!inputText.trim()) { Alert.alert('No Text', 'Paste some text to summarize.'); return; }
        if (!hasApiKey) { Alert.alert('API Key Required', 'Add your Groq API key in Settings.'); return; }
        setLoading(true);
        try {
            const summary = await summarizeText(groqApiKey, inputText, style);
            setResult(summary);
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setLoading(false); }
    }

    async function exportPdf() {
        if (!result) return;
        await createAndSharePdf({ title: 'Summary', content: result, type: 'summary' });
    }

    if (loading) return <LoadingOverlay message="Summarizing..." />;

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={[styles.header, { backgroundColor: '#5856D6' }]}>
                <TouchableOpacity onPress={() => onNavigate('/')} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Summarizer</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Card style={{ marginBottom: 16 }}>
                    <Text style={styles.label}>Paste Text to Summarize</Text>
                    <TextInput
                        style={styles.bigInput}
                        placeholder="Paste articles, textbook sections, notes..."
                        placeholderTextColor={COLORS.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{inputText.length} chars</Text>
                </Card>

                <Text style={styles.label}>Summary Style</Text>
                <View style={styles.styleRow}>
                    {STYLES.map((s) => (
                        <TouchableOpacity
                            key={s.key}
                            onPress={() => setStyle(s.key)}
                            style={[styles.styleChip, style === s.key && styles.styleChipActive]}
                        >
                            <MaterialIcons name={s.icon as any} size={16} color={style === s.key ? COLORS.white : COLORS.textMuted} />
                            <Text style={[styles.styleText, style === s.key && { color: COLORS.white }]}>{s.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Button title="Summarize" onPress={handleSummarize} icon="summarize" style={{ marginBottom: 16 }} />

                {result !== '' && (
                    <Card style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ fontWeight: '700', fontSize: 15, color: COLORS.textPrimary }}>Summary</Text>
                            <TouchableOpacity onPress={exportPdf}>
                                <MaterialIcons name="picture-as-pdf" size={22} color="#FF3B30" />
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
    header: {
        paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
    label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },
    bigInput: {
        backgroundColor: COLORS.background, borderRadius: 12, padding: 14,
        fontSize: 14, color: COLORS.textPrimary, minHeight: 160,
        borderWidth: 1, borderColor: COLORS.border,
    },
    charCount: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, textAlign: 'right' },
    styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    styleChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    },
    styleChipActive: { backgroundColor: '#5856D6', borderColor: '#5856D6' },
    styleText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
});