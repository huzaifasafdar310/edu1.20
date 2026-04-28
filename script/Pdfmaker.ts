// src/services/pdfMaker.ts
/**
 * EduAI PDF Maker Service
 * Generates beautiful, branded PDFs using expo-print
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export interface PdfOptions {
    title: string;
    subtitle?: string;
    content: string;
    author?: string;
    date?: string;
    type?: 'notes' | 'report' | 'summary' | 'study_guide' | 'quiz';
    quizData?: QuizPdfData[];
}

export interface QuizPdfData {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
}

function markdownToHtml(md: string): string {
    return md
        .replace(/^### (.*)/gm, '<h3>$1</h3>')
        .replace(/^## (.*)/gm, '<h2>$1</h2>')
        .replace(/^# (.*)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/^\d+\. (.*)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}

function generateHtml(options: PdfOptions): string {
    const { title, subtitle, content, author, date, type, quizData } = options;
    const dateStr = date || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const typeLabel = {
        notes: '📝 Study Notes',
        report: '📊 Academic Report',
        summary: '📋 Summary',
        study_guide: '📚 Study Guide',
        quiz: '❓ Quiz',
    }[type || 'notes'];

    const quizHtml = quizData ? quizData.map((q, i) => `
    <div class="quiz-question">
      <div class="question-num">Question ${i + 1}</div>
      <p class="question-text">${q.question}</p>
      <div class="options">
        ${q.options.map((opt, j) => `
          <div class="option ${j === q.correct ? 'correct' : ''}">
            <span class="option-letter">${String.fromCharCode(65 + j)}</span>
            <span>${opt}</span>
            ${j === q.correct ? '<span class="correct-badge">✓</span>' : ''}
          </div>
        `).join('')}
      </div>
      <div class="explanation">
        <strong>💡 Explanation:</strong> ${q.explanation}
      </div>
    </div>
  `).join('') : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #1a2744;
    background: #fff;
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, #0A84FF 0%, #003DA8 100%);
    padding: 40px 48px 36px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 300px;
    height: 300px;
    background: rgba(255,255,255,0.06);
    border-radius: 50%;
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: 20%;
    width: 200px;
    height: 200px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
  }
  .edu-brand {
    font-size: 9pt;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
    margin-bottom: 12px;
  }
  .doc-type-badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 9pt;
    color: rgba(255,255,255,0.9);
    margin-bottom: 16px;
  }
  .header h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28pt;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
    margin-bottom: 8px;
    position: relative;
    z-index: 1;
  }
  .header .subtitle {
    font-size: 11pt;
    color: rgba(255,255,255,0.8);
    position: relative;
    z-index: 1;
  }
  .header-meta {
    margin-top: 20px;
    display: flex;
    gap: 24px;
    position: relative;
    z-index: 1;
  }
  .meta-item {
    font-size: 8pt;
    color: rgba(255,255,255,0.7);
  }
  .meta-item strong {
    color: rgba(255,255,255,0.9);
    display: block;
    font-size: 9pt;
    margin-bottom: 2px;
  }

  /* Content area */
  .content {
    padding: 36px 48px;
    max-width: 100%;
  }

  h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 18pt; color: #0A84FF; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #E8F4FF; }
  h2 { font-size: 14pt; font-weight: 600; color: #003DA8; margin: 20px 0 10px; }
  h3 { font-size: 12pt; font-weight: 600; color: #0060D1; margin: 16px 0 8px; }
  
  p { margin-bottom: 12px; color: #2d3748; }
  
  strong { color: #0A84FF; font-weight: 600; }
  em { color: #5856D6; }
  
  ul, ol { margin: 8px 0 12px 20px; }
  li { margin-bottom: 6px; color: #2d3748; }
  
  code {
    background: #F0F6FF;
    color: #003DA8;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
  }

  blockquote {
    border-left: 4px solid #0A84FF;
    background: #F0F6FF;
    padding: 12px 20px;
    margin: 16px 0;
    border-radius: 0 8px 8px 0;
    color: #3D5680;
    font-style: italic;
  }

  /* Info box */
  .info-box {
    background: linear-gradient(135deg, #F0F6FF, #E8F4FF);
    border: 1px solid #C0DEFF;
    border-left: 4px solid #0A84FF;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 20px 0;
  }

  /* Quiz styles */
  .quiz-question {
    background: #FAFCFF;
    border: 1px solid #D4E4FF;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  .question-num {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #0A84FF;
    margin-bottom: 8px;
  }
  .question-text {
    font-size: 12pt;
    font-weight: 600;
    color: #0A1628;
    margin-bottom: 14px;
  }
  .options { display: flex; flex-direction: column; gap: 8px; }
  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid #D4E4FF;
    background: white;
  }
  .option.correct {
    background: #E0FFF7;
    border-color: #00C896;
  }
  .option-letter {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #E8F4FF;
    color: #0A84FF;
    font-weight: 700;
    font-size: 10pt;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .option.correct .option-letter { background: #00C896; color: white; }
  .correct-badge {
    margin-left: auto;
    color: #00C896;
    font-weight: 700;
  }
  .explanation {
    margin-top: 14px;
    padding: 12px 16px;
    background: #FFF9E6;
    border-radius: 8px;
    border-left: 3px solid #FF9F0A;
    font-size: 10pt;
    color: #5a4000;
  }

  /* Footer */
  .footer {
    margin-top: 48px;
    padding: 20px 48px;
    border-top: 2px solid #E8F4FF;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-brand {
    font-size: 9pt;
    font-weight: 700;
    color: #0A84FF;
    letter-spacing: 1px;
  }
  .footer-date {
    font-size: 8pt;
    color: #7A94BF;
  }

  /* Page break */
  .page-break { page-break-before: always; }

  /* Print */
  @media print {
    body { font-size: 10pt; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="edu-brand">EduAI Student</div>
  <div class="doc-type-badge">${typeLabel}</div>
  <h1>${title}</h1>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  <div class="header-meta">
    ${author ? `<div class="meta-item"><strong>Author</strong>${author}</div>` : ''}
    <div class="meta-item"><strong>Date</strong>${dateStr}</div>
    ${type ? `<div class="meta-item"><strong>Document Type</strong>${typeLabel}</div>` : ''}
  </div>
</div>

<div class="content">
  ${quizData ? quizHtml : `<div class="doc-content">${markdownToHtml(content)}</div>`}
</div>

<div class="footer">
  <div class="footer-brand">EduAI — Powered by Groq</div>
  <div class="footer-date">Generated ${dateStr}</div>
</div>

</body>
</html>`;
}

/**
 * Generate and save a PDF, then share it
 */
export async function createAndSharePdf(options: PdfOptions): Promise<string> {
    const html = generateHtml(options);

    const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
    });

    // Move to a permanent location
    const filename = `EduAI_${options.title.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_${Date.now()}.pdf`;
    const destUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.moveAsync({ from: uri, to: destUri });

    // Share the PDF
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(destUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Share ${options.title}`,
            UTI: 'com.adobe.pdf',
        });
    }

    return destUri;
}

/**
 * Preview PDF (open print dialog)
 */
export async function previewPdf(options: PdfOptions): Promise<void> {
    const html = generateHtml(options);
    await Print.printAsync({ html });
}