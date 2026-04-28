// app/pdfmaker.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { convertToPdf, ConversionItem } from '../src/services/pdfMaker';
import { Button, LoadingOverlay, Card } from '../src/components/UIComponents';
import { COLORS, SHADOWS, SIZES } from '../src/constants/theme';

export default function ConvertToPdfScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('EduAI Export');
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [converting, setConverting] = useState(false);


  async function pickFile() {
    try {
      const { pickAndExtractDocument } = await import('../src/services/documentExtractor');
      const doc = await pickAndExtractDocument();
      if (doc) {
        const isImage = doc.mimeType.startsWith('image/') || doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        setItems([...items, {
          uri: isImage ? doc.uri : doc.text, // For images, use the file URI. For text, use extracted text.
          type: isImage ? 'image' : (doc.mimeType.includes('markdown') ? 'markdown' : 'text'),
          name: doc.name
        }]);
      }
    } catch (e: any) {
      Alert.alert('File Error', e.message);
    }
  }

  async function handleConvert() {
    if (items.length === 0) return Alert.alert('No Files', 'Please add some images or text files first.');
    setConverting(true);
    try {
      await convertToPdf(title, items);
      Alert.alert('Success', 'PDF converted and shared successfully!');
    } catch (e: any) {
      Alert.alert('Conversion Failed', e.message);
    } finally {
      setConverting(false);
    }
  }

  function removeItem(index: number) {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  }

  if (converting) return <LoadingOverlay message="Converting files to PDF..." />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { backgroundColor: '#FF3B30' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><MaterialIcons name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Convert to PDF</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.titleInputContainer}>
          <MaterialIcons name="edit" size={18} color={COLORS.primary} />
          <Text style={styles.titleLabel}>Document Title:</Text>
          <TouchableOpacity onPress={() => {
            Alert.prompt('Rename Document', 'Enter a new title for your PDF', (text) => setTitle(text || 'EduAI Export'));
          }}>
            <Text style={styles.titleText}>{title}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={pickFile} style={[styles.actionBtn, { flex: 1 }]}>
            <MaterialIcons name="note-add" size={24} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Upload Document</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <Card style={styles.itemCard}>
              {item.type === 'image' ? (
                <Image source={{ uri: item.uri }} style={styles.itemThumb} />
              ) : (
                <View style={[styles.itemThumb, { backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialIcons name="description" size={24} color={COLORS.primary} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(index)}>
                <MaterialIcons name="close" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </Card>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyContainer}>
              <MaterialIcons name="picture-as-pdf" size={64} color={COLORS.border} />
              <Text style={styles.emptyText}>No items added yet</Text>
              <Text style={styles.emptySubtext}>Add images or text files to combine them into a single PDF with a watermark.</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.footer}>
        <Button 
          title={`Convert ${items.length} ${items.length === 1 ? 'Item' : 'Items'} to PDF`} 
          onPress={handleConvert} 
          disabled={items.length === 0}
          style={{ backgroundColor: '#FF3B30' }}
          icon="picture-as-pdf"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 16 },
  titleInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, backgroundColor: COLORS.white, padding: 12, borderRadius: 12, ...SHADOWS.sm },
  titleLabel: { fontSize: 13, color: COLORS.textMuted },
  titleText: { fontSize: 15, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderDashArray: [4, 4], borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12 },
  itemThumb: { width: 50, height: 50, borderRadius: 8 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  itemType: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.textMuted, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderTopWidth: 1, borderTopColor: COLORS.borderLight },
});
