// app/quiz.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/store/useStore';
import { generateQuiz, QuizQuestion } from '../src/services/groq';
import { createAndSharePdf } from '../src/services/pdfMaker';
import { Button, Input, LoadingOverlay } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

type Difficulty = 'easy' | 'medium' | 'hard';
type State = 'setup' | 'playing' | 'results';

export default function QuizScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey, updateStats } = useStore();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [numQ, setNumQ] = useState(5);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<State>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  async function startQuiz() {
    if (!topic.trim()) return Alert.alert('Topic Required', 'Please enter a topic for your quiz.');
    if (!hasApiKey) return Alert.alert('API Key Required', 'Add your Groq API key in Profile.');
    setLoading(true);
    try {
      const qs = await generateQuiz(groqApiKey, topic, difficulty, numQ);
      setQuestions(qs); setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setAnswers([]); setState('playing'); updateStats('quizzesTaken');
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to generate quiz'); }
    finally { setLoading(false); }
  }

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx); setAnswered(true);
    const correct = idx === questions[current].correct;
    if (correct) { setScore(s => s + 1); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    setAnswers(a => [...a, idx]);
  }

  function next() {
    if (current + 1 >= questions.length) setState('results');
    else { setCurrent(c => c + 1); setSelected(null); setAnswered(false); }
  }

  async function exportPdf() {
    setExporting(true);
    try { await createAndSharePdf({ title: `${topic} Quiz`, subtitle: `${difficulty} · ${questions.length} Questions`, content: '', type: 'quiz', quizData: questions }); }
    catch { Alert.alert('Error', 'Could not export PDF'); }
    finally { setExporting(false); }
  }

  const diffColors = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.error };
  const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  if (loading) return <LoadingOverlay message="Generating quiz..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => state !== 'setup' ? setState('setup') : router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Quiz</Text>
        {state !== 'setup' && <TouchableOpacity onPress={() => setState('setup')} style={styles.headerAction}><MaterialIcons name="refresh" size={22} color="#fff" /></TouchableOpacity>}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {state === 'setup' && (
          <View style={{ padding: 16 }}>
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>Create Your Quiz</Text>
              <Text style={styles.setupSub}>AI generates personalized questions on any topic</Text>
              <Input label="Topic" placeholder="e.g. World War II, Python, Algebra..." value={topic} onChangeText={setTopic} icon="topic" style={{ marginTop: 20 }} />
              <Text style={styles.fieldLabel}>Difficulty</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                  <TouchableOpacity key={d} onPress={() => setDifficulty(d)} style={[styles.chip, difficulty === d && { backgroundColor: diffColors[d], borderColor: diffColors[d] }]}>
                    <Text style={[styles.chipText, difficulty === d && { color: '#fff' }]}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Questions</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                {[5, 10, 15, 20].map(n => (
                  <TouchableOpacity key={n} onPress={() => setNumQ(n)} style={[styles.chip, numQ === n && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                    <Text style={[styles.chipText, numQ === n && { color: '#fff' }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button title="Generate Quiz" onPress={startQuiz} icon="quiz" />
            </View>
          </View>
        )}

        {state === 'playing' && questions.length > 0 && (
          <View style={{ flex: 1 }}>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${((current + 1) / questions.length) * 100}%` as any }]} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
              <Text style={{ fontSize: 14, color: COLORS.textMuted, flex: 1 }}>{current + 1} / {questions.length}</Text>
              <View style={[styles.diffBadge, { backgroundColor: diffColors[difficulty] + '20', borderColor: diffColors[difficulty] }]}><Text style={[{ fontSize: 11, fontWeight: '700' }, { color: diffColors[difficulty] }]}>{difficulty}</Text></View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>Score: {score}</Text>
            </View>
            <View style={[styles.questionCard]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 1, marginBottom: 10 }}>QUESTION {current + 1}</Text>
              <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 26 }}>{questions[current].question}</Text>
            </View>
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {questions[current].options.map((opt, i) => {
                let bg = '#fff', border = COLORS.border, textColor = COLORS.textPrimary;
                if (answered) {
                  if (i === questions[current].correct) { bg = COLORS.success; border = COLORS.success; textColor = '#fff'; }
                  else if (i === selected) { bg = COLORS.error; border = COLORS.error; textColor = '#fff'; }
                }
                return (
                  <TouchableOpacity key={i} onPress={() => handleSelect(i)} style={[styles.option, { backgroundColor: bg, borderColor: border }]}>
                    <View style={[styles.optLetter, answered && i === questions[current].correct && { backgroundColor: 'rgba(255,255,255,0.3)' }]}><Text style={{ color: answered && (i === questions[current].correct || i === selected) ? '#fff' : COLORS.primary, fontWeight: '700', fontSize: 13 }}>{String.fromCharCode(65 + i)}</Text></View>
                    <Text style={[{ flex: 1, fontSize: 14, fontWeight: '500' }, { color: textColor }]}>{opt}</Text>
                    {answered && i === questions[current].correct && <MaterialIcons name="check-circle" size={20} color="#fff" />}
                    {answered && i === selected && i !== questions[current].correct && <MaterialIcons name="cancel" size={20} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            {answered && (
              <View style={styles.explanationBox}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 }}>💡 Explanation</Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 }}>{questions[current].explanation}</Text>
              </View>
            )}
            {answered && <Button title={current + 1 >= questions.length ? 'View Results' : 'Next Question →'} onPress={next} style={{ margin: 20 }} />}
          </View>
        )}

        {state === 'results' && (
          <View style={{ padding: 16 }}>
            <View style={[styles.setupCard, { alignItems: 'center', marginBottom: 16 }]}>
              <Text style={{ fontSize: 56, marginBottom: 12 }}>{scorePercent >= 80 ? '🏆' : scorePercent >= 60 ? '🎯' : scorePercent >= 40 ? '📚' : '💪'}</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.textPrimary }}>Quiz Complete!</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 16 }}>
                <Text style={{ fontSize: 48, fontWeight: '800', color: COLORS.primary, letterSpacing: -2 }}>{score}/{questions.length}</Text>
                <Text style={{ fontSize: 24, fontWeight: '600', color: COLORS.textMuted }}>{scorePercent}%</Text>
              </View>
              <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' }}>{scorePercent >= 80 ? 'Excellent work! 🌟' : scorePercent >= 60 ? 'Good job! Keep studying.' : 'Keep practicing, you\'re getting there!'}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>Question Review</Text>
            {questions.map((q, i) => (
              <View key={i} style={[styles.reviewItem, { borderLeftColor: answers[i] === q.correct ? COLORS.success : COLORS.error }]}>
                <MaterialIcons name={answers[i] === q.correct ? 'check-circle' : 'cancel'} size={20} color={answers[i] === q.correct ? COLORS.success : COLORS.error} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 }} numberOfLines={2}>{q.question}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Your: {q.options[answers[i]] || 'None'}</Text>
                  {answers[i] !== q.correct && <Text style={{ fontSize: 12, color: COLORS.success, fontWeight: '600', marginTop: 2 }}>Correct: {q.options[q.correct]}</Text>}
                </View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Button title="Export PDF" onPress={exportPdf} loading={exporting} variant="secondary" icon="picture-as-pdf" style={{ flex: 1 }} />
              <Button title="New Quiz" onPress={() => setState('setup')} icon="refresh" style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  headerAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  setupCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, ...SHADOWS.sm },
  setupTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.3 },
  setupSub: { fontSize: 14, color: COLORS.textMuted, marginTop: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10, letterSpacing: 0.3 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: '#fff' },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  progressBg: { height: 4, backgroundColor: COLORS.border, margin: 16, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  questionCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 20, ...SHADOWS.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16, borderWidth: 1.5, ...SHADOWS.sm },
  optLetter: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primaryGhost, alignItems: 'center', justifyContent: 'center' },
  explanationBox: { margin: 16, backgroundColor: '#FFF9E6', borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  reviewItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, ...SHADOWS.sm, borderLeftWidth: 3 },
});
