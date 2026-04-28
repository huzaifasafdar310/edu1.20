// src/services/groq.ts
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const FAST_MODEL = 'llama-3.1-8b-instant';
const CODE_MODEL = 'llama-3.3-70b-versatile';

export interface GroqMessage { role: 'system' | 'user' | 'assistant'; content: string; }

async function groqRequest(apiKey: string, messages: GroqMessage[], options: { model?: string; temperature?: number; maxTokens?: number } = {}): Promise<string> {
  if (!apiKey?.trim()) throw new Error('NO_API_KEY');
  const { model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 2048 } = options;
  const response = await fetch(GROQ_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('INVALID_API_KEY');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(err.error?.message || `API error ${response.status}`);
  }
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await groqRequest(apiKey, [{ role: 'user', content: 'hello' }], { model: FAST_MODEL, maxTokens: 5 });
    return { valid: true };
  } catch (e: any) {
    let msg = e.message;
    if (msg === 'NO_API_KEY') msg = 'API Key is required';
    if (msg === 'INVALID_API_KEY') msg = 'The provided API key is invalid';
    if (msg === 'RATE_LIMIT') msg = 'Rate limit exceeded, please try again later';
    console.error('API Validation Error:', msg);
    return { valid: false, error: msg };
  }
}

// Feature 1: AI Tutor
export async function askTutor(apiKey: string, question: string, subject: string, chatHistory: GroqMessage[] = []): Promise<string> {
  const system = `You are EduAI Tutor, an expert educational assistant. Subject: ${subject || 'General'}.
Explain clearly with examples. Use ** for bold, numbered lists. Keep responses structured and concise.`;
  return groqRequest(apiKey, [{ role: 'system', content: system }, ...chatHistory.slice(-8), { role: 'user', content: question }], { temperature: 0.6, maxTokens: 1500 });
}

// Feature 2: Quiz Generator
export interface QuizQuestion { question: string; options: string[]; correct: number; explanation: string; }
export async function generateQuiz(apiKey: string, topic: string, difficulty: 'easy' | 'medium' | 'hard', numQuestions = 5): Promise<QuizQuestion[]> {
  const prompt = `Generate a ${difficulty} quiz about "${topic}" with exactly ${numQuestions} multiple choice questions.
Return ONLY valid JSON array:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]
"correct" is the 0-based index of the correct option.`;
  const raw = await groqRequest(apiKey, [{ role: 'user', content: prompt }], { model: DEFAULT_MODEL, temperature: 0.5, maxTokens: 2000 });
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Invalid quiz response');
  return JSON.parse(match[0]);
}

// Feature 3: Summarizer
export async function summarizeText(apiKey: string, text: string, style: 'brief' | 'detailed' | 'bullet_points' | 'academic' = 'brief'): Promise<string> {
  const styles = { brief: 'Write a concise 2-3 paragraph summary.', detailed: 'Write a comprehensive detailed summary.', bullet_points: 'Summarize as organized bullet points.', academic: 'Write an academic abstract with structured sections.' };
  const prompt = `${styles[style]}\n\nText:\n"""\n${text.slice(0, 8000)}\n"""\n\nProvide only the summary.`;
  return groqRequest(apiKey, [{ role: 'user', content: prompt }], { temperature: 0.4, maxTokens: 1500 });
}

// Feature 4: Flashcard Generator
export interface Flashcard { id: string; front: string; back: string; category: string; }
export async function generateFlashcards(apiKey: string, topic: string, count = 10): Promise<Flashcard[]> {
  const prompt = `Create ${count} educational flashcards about "${topic}".
Return ONLY valid JSON array:
[{"id":"1","front":"Question","back":"Answer (1-3 sentences)","category":"subcategory"}]
Make cards progressively more complex.`;
  const raw = await groqRequest(apiKey, [{ role: 'user', content: prompt }], { temperature: 0.6, maxTokens: 2000 });
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Invalid flashcard response');
  return JSON.parse(match[0]);
}

// Feature 5: Essay Helper
export async function essayHelper(apiKey: string, action: 'outline' | 'write' | 'improve' | 'proofread' | 'analyze', content: string, essayType?: string, wordCount?: number): Promise<string> {
  const prompts = {
    outline: `Create a detailed essay outline for: "${content}". Include thesis, arguments, evidence, conclusion. Type: ${essayType || 'argumentative'}.`,
    write: `Write a ${wordCount || 500}-word ${essayType || 'argumentative'} essay on: "${content}". Include intro with thesis, body with evidence, strong conclusion.`,
    improve: `Improve this essay for clarity, flow, vocabulary and argument strength:\n\n${content}`,
    proofread: `Proofread this text. Fix grammar, spelling, punctuation. Show corrected version with list of changes:\n\n${content}`,
    analyze: `Analyze this essay: thesis clarity, argument strength, evidence, structure, transitions, style:\n\n${content}`,
  };
  return groqRequest(apiKey, [{ role: 'user', content: prompts[action] }], { temperature: 0.6, maxTokens: 2000 });
}

// Feature 6: Code Helper
export async function codeHelper(apiKey: string, action: 'explain' | 'debug' | 'generate' | 'optimize' | 'convert', code: string, language?: string, targetLanguage?: string, chatHistory: GroqMessage[] = []): Promise<string> {
  const system = `You are EduAI Code Helper, an expert programming tutor. Explain in simple educational terms. Use proper markdown code blocks.`;
  const prompts = {
    explain: `Explain this ${language || ''} code step-by-step:\n\`\`\`\n${code}\n\`\`\``,
    debug: `Debug this ${language || ''} code. Identify bugs, explain why, provide corrected code:\n\`\`\`\n${code}\n\`\`\``,
    generate: `Generate clean, well-commented ${language || 'Python'} code for: ${code}`,
    optimize: `Optimize this ${language || ''} code for performance and readability:\n\`\`\`\n${code}\n\`\`\``,
    convert: `Convert from ${language || 'Python'} to ${targetLanguage || 'JavaScript'}:\n\`\`\`\n${code}\n\`\`\``,
  };
  return groqRequest(apiKey, [{ role: 'system', content: system }, ...chatHistory.slice(-6), { role: 'user', content: prompts[action] }], { model: CODE_MODEL, temperature: 0.3, maxTokens: 2048 });
}

// Feature 7: Translator
export async function translateText(apiKey: string, text: string, targetLanguage: string, sourceLanguage?: string, mode: 'translate' | 'explain' | 'vocabulary' = 'translate'): Promise<string> {
  const prompts = {
    translate: `Translate${sourceLanguage ? ` from ${sourceLanguage}` : ''} to ${targetLanguage}. Provide only the translation:\n\n${text}`,
    explain: `Translate to ${targetLanguage} then explain cultural nuances and idioms:\n\n${text}`,
    vocabulary: `Extract key vocabulary, translate each to ${targetLanguage}, explain usage:\n\n${text}`,
  };
  return groqRequest(apiKey, [{ role: 'user', content: prompts[mode] }], { temperature: 0.3, maxTokens: 1500 });
}

// Feature 8: Mind Map Generator
export interface MindMapNode { id: string; label: string; children: MindMapNode[]; color?: string; }
export async function generateMindMap(apiKey: string, topic: string, depth = 3): Promise<MindMapNode> {
  const prompt = `Create a mind map for: "${topic}" with ${depth} depth levels.
Return ONLY valid JSON:
{"id":"root","label":"Main Topic","children":[{"id":"1","label":"Branch","children":[{"id":"1.1","label":"Sub","children":[]}]}]}
Create 4-6 main branches, each with 2-3 sub-branches.`;
  const raw = await groqRequest(apiKey, [{ role: 'user', content: prompt }], { temperature: 0.5, maxTokens: 2000 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Invalid mind map response');
  return JSON.parse(match[0]);
}

// Feature 9: Document Analysis (after text extraction)
export async function analyzeExtractedText(apiKey: string, extractedText: string, analysisType: 'summary' | 'keypoints' | 'questions' | 'concepts'): Promise<string> {
  const prompts = {
    summary: `Comprehensive summary of this document:\n\n${extractedText.slice(0, 6000)}`,
    keypoints: `Extract and organize key points, main arguments, important facts:\n\n${extractedText.slice(0, 6000)}`,
    questions: `Generate 10 thoughtful study questions from this document:\n\n${extractedText.slice(0, 6000)}`,
    concepts: `Identify and explain key concepts, terminology, theories:\n\n${extractedText.slice(0, 6000)}`,
  };
  return groqRequest(apiKey, [{ role: 'user', content: prompts[analysisType] }], { temperature: 0.5, maxTokens: 2000 });
}

// Feature 10: Study Plan Generator
export interface StudyPlan { title: string; duration: string; dailyGoal: string; weeks: Array<{ week: number; theme: string; tasks: string[]; resources: string[] }>; tips: string[]; }
export async function generateStudyPlan(apiKey: string, subject: string, duration: string, currentLevel: 'beginner' | 'intermediate' | 'advanced', goals: string): Promise<StudyPlan> {
  const prompt = `Create a study plan.
Subject: ${subject}, Duration: ${duration}, Level: ${currentLevel}, Goals: ${goals}
Return ONLY valid JSON:
{"title":"...","duration":"${duration}","dailyGoal":"...","weeks":[{"week":1,"theme":"...","tasks":["..."],"resources":["..."]}],"tips":["..."]}`;
  const raw = await groqRequest(apiKey, [{ role: 'user', content: prompt }], { temperature: 0.6, maxTokens: 2000 });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Invalid study plan response');
  return JSON.parse(match[0]);
}

// PDF Content Generator (for PDF Maker screen)
export async function generatePdfContent(apiKey: string, type: 'notes' | 'report' | 'summary' | 'study_guide', topic: string, additionalInfo?: string): Promise<string> {
  const instructions = {
    notes: `Create comprehensive study notes with sections, key concepts, formulas, and review questions.`,
    report: `Write a structured academic report: Abstract, Introduction, Content, Analysis, Conclusion.`,
    summary: `Create an organized summary with overview, main points by theme, and key takeaways.`,
    study_guide: `Create a study guide: Overview, Key Concepts, Definitions, Examples, Practice Questions, Quick Review.`,
  };
  const prompt = `${instructions[type]}\nTopic: "${topic}"${additionalInfo ? `\nContext: ${additionalInfo}` : ''}\nFormat with ## headers, **bold** key terms, - for lists.`;
  return groqRequest(apiKey, [{ role: 'user', content: prompt }], { temperature: 0.5, maxTokens: 3000 });
}
