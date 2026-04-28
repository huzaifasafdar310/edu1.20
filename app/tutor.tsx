// app/tutor.tsx
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useStore, ChatMessage } from '../src/store/useStore';
import { askTutor } from '../src/services/groq';
import { COLORS, SHADOWS, SIZES } from '../src/constants/theme';
import { ChatBubble, NoApiKeyBanner } from '../src/components/UIComponents';

const SUBJECTS = ['General', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'English', 'Computer Science', 'Economics'];

export default function TutorScreen() {
  const router = useRouter();
  const { user, groqApiKey, hasApiKey, chatHistories, addChatMessage, clearChatHistory } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('General');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const messages: ChatMessage[] = chatHistories['tutor'] || [];

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    if (!hasApiKey) { Alert.alert('API Key Required', 'Add your Groq API key in Profile → Settings.'); return; }
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    addChatMessage('tutor', userMsg);
    setInput('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      const response = await askTutor(groqApiKey, userMsg.content, subject, history);
      addChatMessage('tutor', { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      useStore.getState().updateStats('questionsAsked');
    } catch (e: any) {
      const msg = e.message === 'INVALID_API_KEY' ? 'Invalid API key. Check your Groq key in Profile.' : e.message === 'NO_API_KEY' ? 'Please add your Groq API key in Profile.' : 'Failed to get response. Try again.';
      addChatMessage('tutor', { id: Date.now().toString(), role: 'assistant', content: `⚠️ ${msg}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } finally { setLoading(false); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200); }
  }, [input, loading, hasApiKey, groqApiKey, subject, messages]);

  const speakLast = () => {
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (!last) return;
    if (isSpeaking) { Speech.stop(); setIsSpeaking(false); return; }
    setIsSpeaking(true);
    Speech.speak(last.content, { language: 'en', pitch: 1, rate: 0.9, onDone: () => setIsSpeaking(false), onError: () => setIsSpeaking(false) });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.headerTitle}>AI Tutor</Text><Text style={styles.headerSub}>{subject}</Text></View>
        <TouchableOpacity onPress={speakLast} style={styles.headerAction}><MaterialIcons name={isSpeaking ? 'stop' : 'volume-up'} size={22} color="#fff" /></TouchableOpacity>
        <TouchableOpacity onPress={() => { clearChatHistory('tutor'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={styles.headerAction}><MaterialIcons name="delete-outline" size={22} color="#fff" /></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjects}>
        <View style={styles.subjectsInner}>
          {SUBJECTS.map(s => (
            <TouchableOpacity key={s} onPress={() => setSubject(s)} style={[styles.subjectChip, subject === s && styles.subjectChipActive]}>
              <Text style={[styles.subjectChipText, subject === s && styles.subjectChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {!hasApiKey && <NoApiKeyBanner onPress={() => router.push('/(tabs)/profile')} />}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
        {messages.length === 0 && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeEmoji}>🎓</Text>
            <Text style={styles.welcomeTitle}>Hello, {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.welcomeText}>I'm your AI tutor. Ask me anything about {subject === 'General' ? 'any subject' : subject}!</Text>
            <View style={{ width: '100%', marginTop: 20, gap: 8 }}>
              {[`Explain ${subject === 'General' ? 'photosynthesis' : subject + ' basics'}`, 'Help me solve a problem', 'Give me a study tip'].map(s => (
                <TouchableOpacity key={s} onPress={() => setInput(s)} style={styles.suggestion}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {messages.map(msg => <ChatBubble key={msg.id} message={msg.content} role={msg.role as 'user' | 'assistant'} timestamp={msg.timestamp} />)}
        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
            <View style={styles.aiBubbleIcon}><MaterialIcons name="auto-awesome" size={12} color="#fff" /></View>
            <View style={styles.typingDots}>{[0, 1, 2].map(i => <View key={i} style={[styles.dot, { opacity: 0.4 + i * 0.2 }]} />)}</View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <TextInput style={styles.textInput} placeholder="Ask anything..." placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} multiline maxLength={1000} />
          <TouchableOpacity onPress={sendMessage} disabled={!input.trim() || loading} style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}>
            <MaterialIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  headerAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  subjects: { maxHeight: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  subjectsInner: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  subjectChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subjectChipText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  subjectChipTextActive: { color: '#fff' },
  welcomeCard: { margin: 20, backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', ...SHADOWS.sm },
  welcomeEmoji: { fontSize: 48, marginBottom: 12 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  welcomeText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  suggestion: { backgroundColor: COLORS.primaryGhost, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.primaryMid },
  suggestionText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  aiBubbleIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  typingDots: { flexDirection: 'row', gap: 5, backgroundColor: '#fff', padding: 14, borderRadius: 18, ...SHADOWS.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  inputArea: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  textInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, maxHeight: 120, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.colored },
  sendBtnDisabled: { backgroundColor: COLORS.border, shadowOpacity: 0 },
});
