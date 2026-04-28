// src/screens/features/FlashcardsScreen.tsx
import React, { useState, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Alert, Animated, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { generateFlashcards, Flashcard } from '../../services/groq';
import { Button, Input, LoadingOverlay, Badge } from '../../components/UIComponents';
import { COLORS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');
interface Props { onNavigate: (r: string) => void; }

export default function FlashcardsScreen({ onNavigate }: Props) {
    const { groqApiKey, hasApiKey } = useStore();
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [current, setCurrent] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [mastered, setMastered] = useState<Set<string>>(new Set());
    const [mode, setMode] = useState<'setup' | 'study'>('setup');

    const flipAnim = useRef(new Animated.Value(0)).current;

    async function generate() {
        if (!topic.trim()) { Alert.alert('Topic Required', 'Enter a topic.'); return; }
        if (!hasApiKey) { Alert.alert('API Key Required', 'Add your Groq key.'); return; }
        setLoading(true);
        try {
            const result = await generateFlashcards(groqApiKey, topic, count);
            setCards(result);
            setCurrent(0);
            setFlipped(false);
            setMastered(new Set());
            setMode('study');
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setLoading(false); }
    }

    function flipCard() {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const toValue = flipped ? 0 : 1;
        Animated.spring(flipAnim, { toValue, friction: 8, useNativeDriver: true }).start();
        setFlipped(!flipped);
    }

    function next() {
        setFlipped(false);
        flipAnim.setValue(0);
        setCurrent((c) => (c + 1) % cards.length);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    function prev() {
        setFlipped(false);
        flipAnim.setValue(0);
        setCurrent((c) => (c - 1 + cards.length) % cards.length);
    }

    function toggleMastered() {
        const id = cards[current].id;
        setMastered((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

    if (loading) return <LoadingOverlay message="Generating flashcards..." />;

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={[styles.header, { backgroundColor: '#FF9F0A' }]}>
                <TouchableOpacity onPress={() => { mode === 'study' ? setMode('setup') : onNavigate('/'); }} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Flashcards</Text>
                {mode === 'study' && (
                    <Badge label={`${mastered.size}/${cards.length} Mastered`} color={COLORS.white} bgColor="rgba(255,255,255,0.25)" />
                )}
            </View>

            {mode === 'setup' && (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <View style={styles.setupCard}>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 }}>Create Flashcards</Text>
                        <Text style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>AI generates study cards on any topic</Text>
                        <Input label="Topic" placeholder="e.g. Human Anatomy, Spanish Verbs..." value={topic} onChangeText={setTopic} icon="style" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 }}>Number of Cards</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                            {[5, 10, 15, 20].map((n) => (
                                <TouchableOpacity key={n} onPress={() => setCount(n)}
                                    style={[styles.countChip, count === n && { backgroundColor: '#FF9F0A', borderColor: '#FF9F0A' }]}>
                                    <Text style={[styles.countText, count === n && { color: COLORS.white }]}>{n}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Button title="Generate Cards" onPress={generate} style={{ backgroundColor: '#FF9F0A' }} icon="auto-awesome" />
                    </View>
                </ScrollView>
            )}

            {mode === 'study' && cards.length > 0 && (
                <View style={{ flex: 1, alignItems: 'center', paddingTop: 20 }}>
                    {/* Progress */}
                    <View style={{ width: width - 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 16 }}>
                        <View style={{ width: `${((current + 1) / cards.length) * 100}%` as any, height: 4, backgroundColor: '#FF9F0A', borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>
                        {current + 1} of {cards.length} · {cards[current].category}
                    </Text>

                    {/* Card */}
                    <TouchableOpacity onPress={flipCard} activeOpacity={0.95} style={{ width: width - 40 }}>
                        <View style={{ height: 240, position: 'relative' }}>
                            {/* Front */}
                            <Animated.View style={[styles.card, { transform: [{ rotateY: frontInterpolate }], backfaceVisibility: 'hidden' }]}>
                                <Text style={styles.cardSide}>QUESTION</Text>
                                <Text style={styles.cardFrontText}>{cards[current].front}</Text>
                                <Text style={styles.tapHint}>Tap to reveal answer</Text>
                            </Animated.View>
                            {/* Back */}
                            <Animated.View style={[styles.card, styles.cardBack, { transform: [{ rotateY: backInterpolate }], backfaceVisibility: 'hidden' }]}>
                                <Text style={[styles.cardSide, { color: 'rgba(255,255,255,0.7)' }]}>ANSWER</Text>
                                <Text style={styles.cardBackText}>{cards[current].back}</Text>
                            </Animated.View>
                        </View>
                    </TouchableOpacity>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity onPress={prev} style={styles.controlBtn}>
                            <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={toggleMastered}
                            style={[styles.masteredBtn, mastered.has(cards[current].id) && styles.masteredBtnActive]}
                        >
                            <MaterialIcons name={mastered.has(cards[current].id) ? 'star' : 'star-outline'} size={22} color={mastered.has(cards[current].id) ? COLORS.white : '#FF9F0A'} />
                            <Text style={[styles.masteredText, mastered.has(cards[current].id) && { color: COLORS.white }]}>
                                {mastered.has(cards[current].id) ? 'Mastered!' : 'Mark Mastered'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={next} style={styles.controlBtn}>
                            <MaterialIcons name="arrow-forward" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* All Cards List */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20, paddingLeft: 20 }}>
                        {cards.map((c, i) => (
                            <TouchableOpacity key={c.id} onPress={() => { setCurrent(i); setFlipped(false); flipAnim.setValue(0); }}
                                style={[styles.miniCard, i === current && styles.miniCardActive, mastered.has(c.id) && styles.miniCardMastered]}>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: i === current ? COLORS.white : COLORS.textMuted }}>
                                    {i + 1}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.white },
    setupCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, ...SHADOWS.sm },
    countChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border },
    countText: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
    card: {
        position: 'absolute', width: '100%', height: 240,
        backgroundColor: COLORS.white, borderRadius: 24, padding: 24,
        alignItems: 'center', justifyContent: 'center', ...SHADOWS.lg,
    },
    cardBack: { backgroundColor: COLORS.primary },
    cardSide: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: COLORS.primary, marginBottom: 16 },
    cardFrontText: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 28 },
    cardBackText: { fontSize: 16, color: COLORS.white, textAlign: 'center', lineHeight: 24 },
    tapHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 16 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24 },
    controlBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
    masteredBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 24, backgroundColor: COLORS.white,
        borderWidth: 1.5, borderColor: '#FF9F0A', ...SHADOWS.sm,
    },
    masteredBtnActive: { backgroundColor: '#FF9F0A', borderColor: '#FF9F0A' },
    masteredText: { fontSize: 14, fontWeight: '600', color: '#FF9F0A' },
    miniCard: {
        width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.white,
        alignItems: 'center', justifyContent: 'center', marginRight: 8,
        borderWidth: 1.5, borderColor: COLORS.border,
    },
    miniCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    miniCardMastered: { borderColor: '#FF9F0A' },
});