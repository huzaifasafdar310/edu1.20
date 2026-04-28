// app/(tabs)/index.tsx — Home Dashboard
import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';
import { COLORS, SHADOWS, FEATURE_CARDS, SIZES } from '../../src/constants/theme';
import { NoApiKeyBanner } from '../../src/components/UIComponents';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const QUICK_ACTIONS = [
  { id: 'tutor', title: 'Ask Tutor', icon: 'school', color: COLORS.primary, route: '/tutor' },
  { id: 'quiz', title: 'Quick Quiz', icon: 'quiz', color: '#00B8A9', route: '/quiz' },
  { id: 'docextract', title: 'Extract Doc', icon: 'description', color: '#5E5CE6', route: '/docextract' },
  { id: 'pdfmaker', title: 'Make PDF', icon: 'picture-as-pdf', color: '#FF3B30', route: '/pdfmaker' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, hasApiKey } = useStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.bgDecor1} /><View style={styles.bgDecor2} />
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.userName}>{firstName}</Text>
          <Text style={styles.headerSubtitle}>Ready to learn something amazing?</Text>
        </Animated.View>

        {/* Stats row */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          {[
            { label: 'Questions', value: user?.stats.questionsAsked || 0, icon: 'chat' },
            { label: 'Quizzes', value: user?.stats.quizzesTaken || 0, icon: 'quiz' },
            { label: 'Docs', value: user?.stats.documentsProcessed || 0, icon: 'description' },
            { label: 'Streak', value: `${user?.stats.studyStreak || 0}d`, icon: 'local-fire-department' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <MaterialIcons name={stat.icon as any} size={16} color={COLORS.primaryLight} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {!hasApiKey && <NoApiKeyBanner onPress={() => router.push('/(tabs)/profile')} />}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity key={action.id} onPress={() => router.push(action.route as any)} style={[styles.quickAction, { backgroundColor: action.color + '15', borderColor: action.color + '30' }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <MaterialIcons name={action.icon as any} size={20} color={COLORS.white} />
              </View>
              <Text style={[styles.quickActionText, { color: action.color }]}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Feature Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All AI Features</Text>
        <View style={styles.featureGrid}>
          {FEATURE_CARDS.map((card, idx) => (
            <Animated.View key={card.id} style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20 + idx * 5, 0] }) }] }}>
              <TouchableOpacity onPress={() => router.push(card.route as any)} style={[styles.featureCard, { width: CARD_W }]} activeOpacity={0.85}>
                <View style={[styles.featureIconBg, { backgroundColor: card.color }]}>
                  <MaterialIcons name={card.icon as any} size={26} color={COLORS.white} />
                </View>
                <Text style={styles.featureTitle}>{card.title}</Text>
                <Text style={styles.featureSubtitle}>{card.subtitle}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primaryDark, paddingHorizontal: 20, paddingBottom: 28, position: 'relative', overflow: 'hidden' },
  bgDecor1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -60 },
  bgDecor2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(0,194,255,0.08)', bottom: -40, left: -30 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', color: COLORS.white, marginTop: 2, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14, letterSpacing: -0.3 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1 },
  quickActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 18, ...SHADOWS.sm },
  featureIconBg: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  featureSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, lineHeight: 16 },
});
