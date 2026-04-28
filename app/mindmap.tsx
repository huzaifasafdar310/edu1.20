// app/mindmap.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { generateMindMap, MindMapNode } from '../src/services/groq';
import { Button, Input, LoadingOverlay, Card } from '../src/components/UIComponents';
import { COLORS, SHADOWS } from '../src/constants/theme';

const { width } = Dimensions.get('window');

const MindMapItem = ({ node, depth = 0 }: { node: MindMapNode; depth?: number }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <View style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <TouchableOpacity
        onPress={() => hasChildren && setExpanded(!expanded)}
        activeOpacity={0.7}
        style={[
          styles.node,
          {
            backgroundColor: depth === 0 ? COLORS.primary : depth === 1 ? '#FF2D55' : '#fff',
            borderColor: depth > 1 ? COLORS.border : 'transparent',
            borderWidth: depth > 1 ? 1 : 0,
          },
        ]}
      >
        <Text style={[styles.nodeText, { color: depth <= 1 ? '#fff' : COLORS.textPrimary }]}>
          {node.label}
        </Text>
        {hasChildren && (
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-down' : 'keyboard-arrow-right'}
            size={20}
            color={depth <= 1 ? '#fff' : COLORS.textMuted}
          />
        )}
      </TouchableOpacity>
      {hasChildren && expanded && (
        <View style={styles.childrenContainer}>
          {node.children.map((child) => (
            <MindMapItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </View>
      )}
    </View>
  );
};

export default function MindMapScreen() {
  const router = useRouter();
  const { groqApiKey, hasApiKey } = useStore();
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState(3);
  const [loading, setLoading] = useState(false);
  const [mindMap, setMindMap] = useState<MindMapNode | null>(null);

  async function handleGenerate() {
    if (!topic.trim()) return Alert.alert('Topic Required', 'Enter a topic to map out.');
    if (!hasApiKey) return Alert.alert('API Key Required', 'Add your Groq API key in Profile.');
    setLoading(true);
    try {
      setMindMap(await generateMindMap(groqApiKey, topic, depth));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingOverlay message="Mapping concepts..." />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#FF2D55' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mind Map</Text>
        {mindMap && (
          <TouchableOpacity onPress={() => setMindMap(null)} style={styles.headerAction}>
            <MaterialIcons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {!mindMap ? (
          <Card style={styles.formCard}>
            <Text style={styles.cardTitle}>Visualise Concepts</Text>
            <Text style={styles.cardSub}>AI creates a hierarchical breakdown of any topic</Text>
            <Input
              label="Main Topic"
              placeholder="e.g. Ancient Rome, Solar System, Photosynthesis..."
              value={topic}
              onChangeText={setTopic}
              icon="account-tree"
            />
            <Text style={styles.label}>Complexity (Depth)</Text>
            <View style={styles.depthRow}>
              {[2, 3, 4].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDepth(d)}
                  style={[styles.depthChip, depth === d && { backgroundColor: '#FF2D55', borderColor: '#FF2D55' }]}
                >
                  <Text style={[styles.depthText, depth === d && { color: '#fff' }]}>
                    Level {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              title="Generate Mind Map"
              onPress={handleGenerate}
              icon="auto-awesome"
              style={{ backgroundColor: '#FF2D55' }}
            />
          </Card>
        ) : (
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>{mindMap.label}</Text>
              <Text style={styles.mapSub}>Tap branches to expand/collapse</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ paddingVertical: 10 }}>
                <MindMapItem node={mindMap} />
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  headerAction: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  formCard: { padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  cardSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },
  depthRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  depthChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border },
  depthText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  mapContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 20, ...SHADOWS.sm },
  mapHeader: { marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  mapTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  mapSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  node: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 10, alignSelf: 'flex-start', ...SHADOWS.sm },
  nodeText: { fontSize: 14, fontWeight: '600' },
  childrenContainer: { borderLeftWidth: 2, borderLeftColor: COLORS.borderLight, marginLeft: 16, paddingLeft: 8 },
});
