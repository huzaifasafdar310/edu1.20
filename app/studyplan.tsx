// app/studyplan.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { generateStudyPlan, StudyPlan } from '../src/services/groq';
import { createAndSharePdf } from '../src/services/pdfMaker';
import { Button, Input, LoadingOverlay } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

const DURATIONS = ['1 Week', '2 Weeks', '1 Month', '3 Months', '6 Months'];
const LEVELS: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];
const levelColors = { beginner: '#30D158', intermediate: COLORS.warning, advanced: '#FF453A' };

export default function StudyPlanScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey } = useStore();
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState('1 Month');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleGenerate() {
    if (!subject.trim()) return Alert.alert('Subject Required', 'Enter the subject you want to study.');
    if (!hasApiKey) return Alert.alert('API Key Required', 'Add your Groq API key in Profile.');
    setLoading(true);
    try { setPlan(await generateStudyPlan(groqApiKey, subject, duration, level, goals || 'Master the fundamentals and gain practical knowledge.')); }
    catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  async function exportPdf() {
    if (!plan) return;
    setExporting(true);
    try {
      const content = `${plan.dailyGoal}\n\n${plan.weeks.map(w => `## Week ${w.week}: ${w.theme}\n\n### Tasks\n${w.tasks.map(t => `- ${t}`).join('\n')}\n\n### Resources\n${w.resources.map(r => `- ${r}`).join('\n')}`).join('\n\n')}\n\n## Study Tips\n${plan.tips.map(t => `- ${t}`).join('\n')}`;
      await createAndSharePdf({ title: plan.title, subtitle: `${duration} · ${level} Level`, content, type: 'study_guide' });
    } catch { Alert.alert('Export Failed'); }
    finally { setExporting(false); }
  }

  if (loading) return <LoadingOverlay message="Creating your personalized study plan..." />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#FF6B6B' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Study Plan</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {!plan ? (
          <View style={styles.formCard}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 }}>Create Study Plan</Text>
            <Text style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24 }}>AI builds a personalised schedule for you</Text>

            <Input label="Subject / Topic" placeholder="e.g. Machine Learning, Spanish, Calculus..." value={subject} onChangeText={setSubject} icon="book" />
            <Input label="Your Goals (optional)" placeholder="e.g. Pass the exam, get a job, learn for fun..." value={goals} onChangeText={setGoals} icon="flag" multiline numberOfLines={2} />

            <Text style={styles.label}>Duration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DURATIONS.map(d => (
                  <TouchableOpacity key={d} onPress={() => setDuration(d)} style={[styles.chip, duration === d && { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' }]}>
                    <Text style={[styles.chipText, duration === d && { color: '#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Current Level</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
              {LEVELS.map(l => (
                <TouchableOpacity key={l} onPress={() => setLevel(l)} style={[styles.chip, { flex: 1 }, level === l && { backgroundColor: levelColors[l], borderColor: levelColors[l] }]}>
                  <Text style={[styles.chipText, level === l && { color: '#fff' }]}>{l.charAt(0).toUpperCase() + l.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Generate Study Plan" onPress={handleGenerate} icon="event-note" style={{ backgroundColor: '#FF6B6B' }} />
          </View>
        ) : (
          <>
            <View style={[styles.planHeader]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 6 }}>YOUR STUDY PLAN</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 }}>{plan.title}</Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{plan.duration} · {level} Level</Text>
              <View style={styles.dailyGoalBadge}><MaterialIcons name="today" size={16} color="#FF6B6B" /><Text style={{ fontSize: 13, color: COLORS.textSecondary, flex: 1, fontWeight: '500' }}>{plan.dailyGoal}</Text></View>
            </View>

            {plan.weeks.map(week => (
              <View key={week.week} style={styles.weekCard}>
                <View style={styles.weekHeader}>
                  <View style={styles.weekNum}><Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>W{week.week}</Text></View>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>{week.theme}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>📋 Tasks</Text>
                {week.tasks.map((task, i) => (
                  <View key={i} style={styles.taskRow}><View style={styles.taskDot} /><Text style={styles.taskText}>{task}</Text></View>
                ))}
                {week.resources.length > 0 && <>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 12, marginBottom: 8 }}>📚 Resources</Text>
                  {week.resources.map((r, i) => (
                    <View key={i} style={styles.taskRow}><MaterialIcons name="link" size={14} color={COLORS.primary} /><Text style={[styles.taskText, { color: COLORS.primary }]}>{r}</Text></View>
                  ))}
                </>}
              </View>
            ))}

            {plan.tips.length > 0 && (
              <View style={styles.tipsCard}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 }}>💡 Study Tips</Text>
                {plan.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}><Text style={styles.tipNum}>{i + 1}</Text><Text style={styles.tipText}>{tip}</Text></View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Button title="Export PDF" onPress={exportPdf} loading={exporting} variant="secondary" icon="picture-as-pdf" style={{ flex: 1 }} />
              <Button title="New Plan" onPress={() => setPlan(null)} icon="refresh" style={{ flex: 1, backgroundColor: '#FF6B6B' }} />
            </View>
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
  formCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, ...SHADOWS.sm },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  planHeader: { backgroundColor: '#FF6B6B', borderRadius: 20, padding: 24, marginBottom: 16 },
  dailyGoalBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 16 },
  weekCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 12, ...SHADOWS.sm, borderLeftWidth: 4, borderLeftColor: '#FF6B6B' },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  weekNum: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  taskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B', marginTop: 6 },
  taskText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  tipsCard: { backgroundColor: '#FFF9E6', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFE4A0' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.warning, textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 22 },
  tipText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
});
