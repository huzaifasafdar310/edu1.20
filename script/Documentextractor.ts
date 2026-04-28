// src/services/documentExtractor.ts
/**
 * EduAI Document Extraction Service
 * Supports: PDF (via expo-print rendering), DOCX (via mammoth), TXT, plain text
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface ExtractedDocument {
    name: string;
    text: string;
    wordCount: number;
    charCount: number;
    mimeType: string;
    uri: string;
    sizeKB: number;
}

/**
 * Pick and extract text from a document file
 */
export async function pickAndExtractDocument(): Promise<ExtractedDocument | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            'text/markdown',
        ],
        copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;

    const asset = result.assets[0];
    const { uri, name, mimeType, size } = asset;

    let extractedText = '';

    try {
        if (mimeType === 'text/plain' || name?.endsWith('.txt') || name?.endsWith('.md')) {
            extractedText = await extractFromTxt(uri);
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            name?.endsWith('.docx')
        ) {
            extractedText = await extractFromDocx(uri);
        } else if (mimeType === 'application/pdf' || name?.endsWith('.pdf')) {
            extractedText = await extractFromPdf(uri);
        } else {
            // Try as plain text
            extractedText = await extractFromTxt(uri);
        }
    } catch (e) {
        console.error('Extraction error:', e);
        throw new Error(`Failed to extract text from "${name}". File may be corrupted or unsupported.`);
    }

    const cleaned = cleanText(extractedText);
    const words = cleaned.split(/\s+/).filter(Boolean);

    return {
        name: name || 'document',
        text: cleaned,
        wordCount: words.length,
        charCount: cleaned.length,
        mimeType: mimeType || 'unknown',
        uri,
        sizeKB: Math.round((size || 0) / 1024),
    };
}

async function extractFromTxt(uri: string): Promise<string> {
    return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
    });
}

async function extractFromDocx(uri: string): Promise<string> {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to array buffer
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    const buffer = bytes.buffer;

    // Use mammoth to extract text (works in React Native with metro bundler)
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
}

async function extractFromPdf(uri: string): Promise<string> {
    /**
     * PDF text extraction in React Native/Expo is limited without native modules.
     * For production, use: react-native-pdf-lib, pdf.js via WebView, or a backend service.
     *
     * This implementation reads the raw PDF bytes and extracts visible text streams
     * using a simple regex approach that works for text-based PDFs.
     */
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const binaryStr = atob(base64);
    return extractTextFromPdfBytes(binaryStr);
}

function extractTextFromPdfBytes(binaryStr: string): string {
    const textParts: string[] = [];

    // Match PDF text stream objects
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    const bjRegex = /BT([\s\S]*?)ET/g;
    const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|TJ|'|")/g;

    let streamMatch;
    while ((streamMatch = streamRegex.exec(binaryStr)) !== null) {
        const streamContent = streamMatch[1];
        let bjMatch;
        while ((bjMatch = bjRegex.exec(streamContent)) !== null) {
            const btContent = bjMatch[1];
            let tjMatch;
            while ((tjMatch = tjRegex.exec(btContent)) !== null) {
                const text = tjMatch[1]
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\(/g, '(')
                    .replace(/\\\)/g, ')')
                    .replace(/\\\\/g, '\\');
                if (text.trim().length > 0) {
                    textParts.push(text);
                }
            }
        }
    }

    if (textParts.length === 0) {
        return '[PDF appears to be image-based or encrypted. Text extraction is limited. Please use a text-based PDF.]';
    }

    return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

function cleanText(text: string): string {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

/**
 * Paste text manually (alternative to file upload)
 */
export function createDocumentFromText(text: string, title: string): ExtractedDocument {
    const cleaned = cleanText(text);
    const words = cleaned.split(/\s+/).filter(Boolean);
    return {
        name: title || 'Pasted Text',
        text: cleaned,
        wordCount: words.length,
        charCount: cleaned.length,
        mimeType: 'text/plain',
        uri: '',
        sizeKB: Math.round(cleaned.length / 1024),
    };
}