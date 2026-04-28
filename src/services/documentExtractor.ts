// src/services/documentExtractor.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export interface ExtractedDocument {
  name: string; text: string; wordCount: number;
  charCount: number; mimeType: string; uri: string; sizeKB: number;
}

export async function pickAndExtractDocument(): Promise<ExtractedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const { uri, name, mimeType, size } = result.assets[0];
  let extractedText = '';
  try {
    const isImage = mimeType?.startsWith('image/') || name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
    const isText = mimeType === 'text/plain' || name?.toLowerCase().endsWith('.txt') || name?.toLowerCase().endsWith('.md');
    const isDocx = mimeType?.includes('wordprocessingml') || name?.toLowerCase().endsWith('.docx');
    const isPdf = mimeType === 'application/pdf' || name?.toLowerCase().endsWith('.pdf');

    if (isImage) {
      return { name: name || 'image', text: '', wordCount: 0, charCount: 0, mimeType: mimeType || 'image/jpeg', uri, sizeKB: Math.round((size || 0) / 1024) };
    }

    if (isText) {
      extractedText = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
    } else if (isDocx) {
      extractedText = await extractFromDocx(uri);
    } else if (isPdf) {
      extractedText = await extractFromPdf(uri);
    } else {
      // Fallback for unknown types: try to read as text but catch binary errors
      try {
        extractedText = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
      } catch {
        throw new Error('This file format is not supported for text extraction.');
      }
    }
  } catch (e: any) {
    console.error('Extraction Error:', e.message);
    throw new Error(e.message.includes('supported') ? e.message : `Failed to read "${name}". The file may be in an unsupported binary format.`);
  }
  const cleaned = cleanText(extractedText);
  const words = cleaned.split(/\s+/).filter(Boolean);
  return { name: name || 'document', text: cleaned, wordCount: words.length, charCount: cleaned.length, mimeType: mimeType || 'unknown', uri, sizeKB: Math.round((size || 0) / 1024) };
}

async function extractFromDocx(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ base64: base64 });
    return result.value || '';
  } catch (e: any) {
    console.error('Docx Extraction Error:', e.message);
    throw e;
  }
}

async function extractFromPdf(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const binaryStr = atob(base64);
  const textParts: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const bjRegex = /BT([\s\S]*?)ET/g;
  const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|TJ|'|")/g;
  let streamMatch;
  while ((streamMatch = streamRegex.exec(binaryStr)) !== null) {
    const streamContent = streamMatch[1];
    let bjMatch;
    while ((bjMatch = bjRegex.exec(streamContent)) !== null) {
      let tjMatch;
      while ((tjMatch = tjRegex.exec(bjMatch[1])) !== null) {
        const text = tjMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\');
        if (text.trim().length > 0) textParts.push(text);
      }
    }
  }
  if (textParts.length === 0) return '[PDF appears to be image-based or encrypted. Text extraction limited. Use a text-based PDF.]';
  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

function cleanText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

export function createDocumentFromText(text: string, title: string): ExtractedDocument {
  const cleaned = cleanText(text);
  const words = cleaned.split(/\s+/).filter(Boolean);
  return { name: title || 'Pasted Text', text: cleaned, wordCount: words.length, charCount: cleaned.length, mimeType: 'text/plain', uri: '', sizeKB: Math.round(cleaned.length / 1024) };
}
