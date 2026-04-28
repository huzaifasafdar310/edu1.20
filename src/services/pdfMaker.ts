// src/services/pdfMaker.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export interface ConversionItem {
  uri: string;
  type: 'image' | 'text' | 'markdown';
  name?: string;
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*)/gm, '<h3>$1</h3>')
    .replace(/^## (.*)/gm, '<h2>$1</h2>')
    .replace(/^# (.*)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

export async function convertToPdf(title: string, items: ConversionItem[]): Promise<string> {
  let contentHtml = '';
  
  for (const item of items) {
    if (item.type === 'image') {
      const base64 = await FileSystem.readAsStringAsync(item.uri, { encoding: 'base64' });
      contentHtml += `
        <div class="page-break">
          ${item.name ? `<h2 class="item-title">${item.name}</h2>` : ''}
          <img src="data:image/jpeg;base64,${base64}" style="width:100%; max-height:900px; object-fit:contain; border-radius:8px; margin-bottom:20px;" />
        </div>`;
    } else {
      let text = '';
      if (item.uri.startsWith('file://')) {
        text = await FileSystem.readAsStringAsync(item.uri, { encoding: 'utf8' });
      } else {
        text = item.uri; // assume it's raw text
      }
      
      contentHtml += `
        <div class="page-break">
          ${item.name ? `<h2 class="item-title">${item.name}</h2>` : ''}
          <div class="text-content">${item.type === 'markdown' ? markdownToHtml(text) : `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 11px; background: #f8f9fa; padding: 15px; border-radius: 8px;">${text}</pre>`}</div>
        </div>`;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1a202c; background: #fff; position: relative; }
        .watermark { position: fixed; bottom: 30px; right: 30px; font-size: 14px; color: rgba(10, 132, 255, 0.2); font-weight: 800; transform: rotate(-15deg); border: 2px solid rgba(10, 132, 255, 0.1); padding: 8px 16px; border-radius: 8px; z-index: 1000; pointer-events: none; }
        .page-break { page-break-after: always; margin-bottom: 40px; }
        h1 { font-size: 24pt; color: #0A84FF; border-bottom: 3px solid #E8F4FF; padding-bottom: 12px; margin-bottom: 32px; font-weight: 800; }
        .item-title { font-size: 12pt; color: #718096; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
        .text-content { font-size: 11pt; color: #2d3748; line-height: 1.6; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9pt; color: #a0aec0; padding-bottom: 20px; }
        @media print { .page-break { page-break-after: always; } }
      </style>
    </head>
    <body>
      <div class="watermark">EduAI — Academic Export</div>
      <h1>${title}</h1>
      ${contentHtml}
      <div class="footer">Converted via EduAI Student App · Powered by Groq AI</div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const filename = `EduAI_Export_${Date.now()}.pdf`;
  const destUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.moveAsync({ from: uri, to: destUri });
  
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
  return destUri;
}
