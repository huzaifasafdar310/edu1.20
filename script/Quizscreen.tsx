// src/screens/features/QuizScreen.tsx
import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    StyleSheet, Alert, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import { generateQuiz, QuizQuestion } from '../../services/groq';
import { createAndSharePdf } from '../../services/pdfMaker';
import { Button, Input, LoadingOverlay } from '../../components/UIComponents';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

type Difficulty = 'easy' | 'medium' | 'hard';
type QuizState = 'setup' | 'playing' | 'results';

interface QuizScreenProps { onNavigate: (r: string) => void; }

export default function QuizScreen({ onNavigate }: QuizScreenProps) {
    const { groqApiKey, hasApiKey, updateStats } = useStore();
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [numQuestions, setNumQuestions] = useState(5);
    const [loading, setLoading] = useState(false);
    const [quizState, setQuizState] = useState<QuizState>('setup');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [exportingPdf, setExportingPdf] = useState(false);

    async function startQuiz() {
        if (!topic.trim()) return Alert.alert('Topic Required', 'Please enter a topic for your quiz.');
        if (!hasApiKey) { Alert.alert('API Key Required', 'Add your Groq API key in Settings.'); return; }

        setLoading(true);
        try {
            const qs = await generateQuiz(groqApiKey, topic, difficulty, numQuestions);
            setQuestions(qs);
            setCurrent(0);
            setSelected(null);
            setAnswered(false);
            setScore(0);
            setAnswers([]);
            setQuizState('playing');
            updateStats('quizzesTaken');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to generate quiz');
        } finally {
            setLoading(false);
        }
    }

    function handleSelect(idx: number) {
        if (answered) return;
        setSelected(idx);
        setAnswered(true);
        const correct = idx === questions[current].correct;
        if (correct) {
            setScore((s) => s + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        setAnswers((a) => [...a, idx]);
    }

    function next() {
        if (current + 1 >= questions.length) {
            setQuizState('results');
        } else {
            setCurrent((c) => c + 1);
            setSelected(null);
            setAnswered(false);
        }
    }

    async function exportToPdf() {
        setExportingPdf(true);
        try {
            await createAndSharePdf({
                title: `${topic} Quiz`,
                subtitle: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level · ${questions.length} Questions`,
                content: '',
                type: 'quiz',
                quizData: questions,
                date: new Date().toLocaleDateString(),
            });
        } catch (e) {
            Alert.alert('Export Failed', 'Could not create PDF');
        } finally {
            setExportingPdf(false);
        }
    }

    const diffColors = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.error };
    const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    if (loading) return <LoadingOverlay message="Generating quiz..." />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate('/')} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Smart Quiz</Text>
                {quizState !== 'setup' && (
                    <TouchableOpacity onPress={() => setQuizState('setup')} style={styles.headerAction}>
                        <MaterialIcons name="refresh" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                {/* ── SETUP ── */}
                {quizState === 'setup' && (
                    <View style={styles.setupContainer}>
                        <View style={styles.setupCard}>
                            <Text style={styles.setupTitle}>Create Your Quiz</Text>
                            <Text style={styles.setupSubtitle}>AI generates personalized questions on any topic</Text>

                            <Input
                                label="Topic"
                                placeholder="e.g. World War II, Algebra, Python..."
                                value={topic}
                                onChangeText={setTopic}
                                icon="topic"
                                style={{ marginTop: 20 }}
                            />

                            <Text style={styles.fieldLabel}>Difficulty</Text>
                            <View style={styles.difficultyRow}>
                                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                                    <TouchableOpacity
                                        key={d}
                                        onPress={() => setDifficulty(d)}
                                        style={[
                                            styles.diffChip,
                                            difficulty === d && { backgroundColor: diffColors[d], borderColor: diffColors[d] },
                                        ]}
                                    >
                                        <Text style={[styles.diffChipText, difficulty === d && { color: COLORS.white }]}>
                                            {d.charAt(0).toUpperCase() + d.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>Number of Questions</Text>
                            <View style={styles.numRow}>
                                {[5, 10, 15, 20].map((n) => (
                                    <TouchableOpacity
                                        key={n}
                                        onPress={() => setNumQuestions(n)}
                                        style={[styles.numChip, numQuestions === n && styles.numChipActive]}
                                    >
                                        <Text style={[styles.numChipText, numQuestions === n && styles.numChipTextActive]}>
                                            {n}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Button title="Generate Quiz" onPress={startQuiz} icon="quiz" style={{ marginTop: 24 }} />
                        </View>
                    </View>
                )}

                {/* ── PLAYING ── */}
                {quizState === 'playing' && questions.length > 0 && (
                    <View style={styles.playContainer}>
                        {/* Progress */}
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${((current + 1) / questions.length) * 100}%` as any }]} />
                        </View>
                        <View style={styles.progressMeta}>
                            <Text style={styles.progressText}>{current + 1} / {questions.length}</Text>
                            <View style={[styles.diffBadge, { backgroundColor: diffColors[difficulty] + '20', borderColor: diffColors[difficulty] }]}>
                                <Text style={[styles.diffBadgeText, { color: diffColors[difficulty] }]}>{difficulty}</Text>
                            </View>
                            <Text style={styles.scoreText}>Score: {score}</Text>
                        </View>

                        <View style={styles.questionCard}>
                            <Text style={styles.questionNum}>Question {current + 1}</Text>
                            <Text style={styles.questionText}>{questions[current].question}</Text>
                        </View>

                        <View style={styles.optionsList}>
                            {questions[current].options.map((opt, i) => {
                                let optStyle = styles.option;
                                let textStyle = styles.optionText;

                                if (answered) {
                                    if (i === questions[current].correct) {
                                        optStyle = { ...styles.option, ...styles.optionCorrect };
                                        textStyle = { ...styles.optionText, color: COLORS.white };
                                    } else if (i === selected && i !== questions[current].correct) {
                                        optStyle = { ...styles.option, ...styles.optionWrong };
                                        textStyle = { ...styles.optionText, color: COLORS.white };
                                    }
                                } else if (selected === i) {
                                    optStyle = { ...styles.option, ...styles.optionSelected };
                                }

                                return (
                                    <TouchableOpacity key={i} onPress={() => handleSelect(i)} style={optStyle}>
                                        <View style={styles.optionLetter}>
                                            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
                                                {String.fromCharCode(65 + i)}
                                            </Text>
                                        </View>
                                        <Text style={[textStyle, { flex: 1 }]}>{opt}</Text>
                                        {answered && i === questions[current].correct && (
                                            <MaterialIcons name="check-circle" size={20} color={COLORS.white} />
                                        )}
                                        {answered && i === selected && i !== questions[current].correct && (
                                            <MaterialIcons name="cancel" size={20} color={COLORS.white} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {answered && (
                            <View style={styles.explanationBox}>
                                <Text style={styles.explanationTitle}>💡 Explanation</Text>
                                <Text style={styles.explanationText}>{questions[current].explanation}</Text>
                            </View>
                        )}

                        {answered && (
                            <Button
                                title={current + 1 >= questions.length ? 'View Results' : 'Next Question →'}
                                onPress={next}
                                style={{ margin: 20 }}
                            />
                        )}
                    </View>
                )}

                {/* ── RESULTS ── */}
                {quizState === 'results' && (
                    <View style={styles.resultsContainer}>
                        <View style={styles.resultsCard}>
                            <Text style={styles.resultsEmoji}>
                                {scorePercent >= 80 ? '🏆' : scorePercent >= 60 ? '🎯' : scorePercent >= 40 ? '📚' : '💪'}
                            </Text>
                            <Text style={styles.resultsTitle}>Quiz Complete!</Text>
                            <View style={styles.scoreBadge}>
                                <Text style={styles.scoreBig}>{score}/{questions.length}</Text>
                                <Text style={styles.scorePercent}>{scorePercent}%</Text>
                            </View>
                            <Text style={styles.scoreMessage}>
                                {scorePercent >= 80 ? 'Excellent work! 🌟' :
                                    scorePercent >= 60 ? 'Good job! Keep studying.' :
                                        scorePercent >= 40 ? 'Keep practicing, you\'re getting there!' :
                                            'Don\'t give up! Review the material and try again.'}
                            </Text>
                        </View>

                        <View style={styles.resultsReview}>
                            <Text style={styles.reviewTitle}>Question Review</Text>
                            {questions.map((q, i) => (
                                <View key={i} style={[
                                    styles.reviewItem,
                                    answers[i] === q.correct ? styles.reviewCorrect : styles.reviewWrong,
                                ]}>
                                    <MaterialIcons
                                        name={answers[i] === q.correct ? 'check-circle' : 'cancel'}
                                        size={20}
                                        color={answers[i] === q.correct ? COLORS.success : COLORS.error}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reviewQ} numberOfLines={2}>{q.question}</Text>
                                        <Text style={styles.reviewA}>Your answer: {q.options[answers[i]] || 'None'}</Text>
                                        {answers[i] !== q.correct && (
                                            <Text style={styles.reviewCorrectA}>Correct: {q.options[q.correct]}</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.resultsActions}>
                            <Button title="Export PDF" onPress={exportToPdf} loading={exportingPdf} variant="secondary" icon="picture-as-pdf" style={{ flex: 1 }} />
                            <Button title="New Quiz" onPress={() => setQuizState('setup')} icon="refresh" style={{ flex: 1 }} />
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 52,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.white },
    headerAction: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    setupContainer: { padding: 16 },
    setupCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, ...SHADOWS.sm },
    setupTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
    setupSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 6 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
    difficultyRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    diffChip: {
        flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
        borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
    },
    diffChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    numRow: { flexDirection: 'row', gap: 10 },
    numChip: {
        flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
        backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    },
    numChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    numChipText: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
    numChipTextActive: { color: COLORS.white },
    playContainer: { flex: 1 },
    progressContainer: { height: 4, backgroundColor: COLORS.border, margin: 16, borderRadius: 2 },
    progressBar: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
    progressMeta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
    progressText: { fontSize: 14, color: COLORS.textMuted, flex: 1 },
    diffBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
    diffBadgeText: { fontSize: 11, fontWeight: '700' },
    scoreText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
    questionCard: { backgroundColor: COLORS.white, margin: 16, borderRadius: 20, padding: 20, ...SHADOWS.sm },
    questionNum: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 1, marginBottom: 10 },
    questionText: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 26 },
    optionsList: { paddingHorizontal: 16, gap: 10 },
    option: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: COLORS.white, borderRadius: 14, padding: 16,
        borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.sm,
    },
    optionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGhost },
    optionCorrect: { backgroundColor: COLORS.success, borderColor: COLORS.success },
    optionWrong: { backgroundColor: COLORS.error, borderColor: COLORS.error },
    optionLetter: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: COLORS.primaryGhost, alignItems: 'center', justifyContent: 'center',
    },
    optionText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
    explanationBox: {
        margin: 16, backgroundColor: '#FFF9E6',
        borderRadius: 16, padding: 16,
        borderLeftWidth: 4, borderLeftColor: COLORS.warning,
    },
    explanationTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
    explanationText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
    resultsContainer: { padding: 16 },
    resultsCard: {
        backgroundColor: COLORS.white, borderRadius: 24, padding: 28,
        alignItems: 'center', ...SHADOWS.sm, marginBottom: 16,
    },
    resultsEmoji: { fontSize: 56, marginBottom: 12 },
    resultsTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
    scoreBadge: {
        flexDirection: 'row', alignItems: 'baseline', gap: 8,
        marginVertical: 16,
    },
    scoreBig: { fontSize: 48, fontWeight: '800', color: COLORS.primary, letterSpacing: -2 },
    scorePercent: { fontSize: 24, fontWeight: '600', color: COLORS.textMuted },
    scoreMessage: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
    resultsReview: { marginBottom: 16 },
    reviewTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
    reviewItem: {
        flexDirection: 'row', gap: 12, alignItems: 'flex-start',
        backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
        marginBottom: 8, ...SHADOWS.sm,
    },
    reviewCorrect: { borderLeftWidth: 3, borderLeftColor: COLORS.success },
    reviewWrong: { borderLeftWidth: 3, borderLeftColor: COLORS.error },
    reviewQ: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
    reviewA: { fontSize: 12, color: COLORS.textMuted },
    reviewCorrectA: { fontSize: 12, color: COLORS.success, fontWeight: '600', marginTop: 2 },
    resultsActions: { flexDirection: 'row', gap: 12, marginBottom: 32 },
});