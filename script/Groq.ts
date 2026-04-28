// src/services/groq.ts
/**
 * EduAI – Groq API Service
 * All 10 AI-powered features use this service.
 * Users bring their own API key (BYOK model).
 */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama3-70b-8192';
const FAST_MODEL = 'llama3-8b-8192';
const CODE_MODEL = 'mixtral-8x7b-32768';

export interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface GroqResponse {
    choices: Array<{
        message: { role: string; content: string };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ─── Core request function ────────────────────────────────────────
async function groqRequest(
    apiKey: string,
    messages: GroqMessage[],
    options: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
    } = {}
): Promise<string> {
    if (!apiKey || apiKey.trim().length === 0) {
        throw new Error('NO_API_KEY');
    }

    const {
        model = DEFAULT_MODEL,
        temperature = 0.7,
        maxTokens = 2048,
    } = options;

    const response = await fetch(GROQ_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('INVALID_API_KEY');
        if (response.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || '';
}

// ─── Validate API Key ─────────────────────────────────────────────
export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        await groqRequest(apiKey, [{ role: 'user', content: 'hi' }], {
            model: FAST_MODEL,
            maxTokens: 5,
        });
        return true;
    } catch {
        return false;
    }
}

// ─── Feature 1: AI Tutor ──────────────────────────────────────────
export async function askTutor(
    apiKey: string,
    question: string,
    subject: string,
    chatHistory: GroqMessage[] = []
): Promise<string> {
    const systemPrompt = `You are EduAI Tutor, an expert and patient educational assistant specialized in helping students learn. 
Your current focus subject is: ${subject || 'General Knowledge'}.

Guidelines:
- Explain concepts clearly with examples and analogies
- Break down complex topics into digestible steps
- Encourage the student and celebrate their progress
- Ask follow-up questions to ensure understanding
- Use emojis sparingly to make learning fun
- Format responses with clear structure (use ** for bold, numbered lists)
- Keep responses concise but complete`;

    const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-8), // Keep last 8 messages for context
        { role: 'user', content: question },
    ];

    return groqRequest(apiKey, messages, { temperature: 0.6, maxTokens: 1500 });
}

// ─── Feature 2: Quiz Generator ────────────────────────────────────
export interface QuizQuestion {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
}

export async function generateQuiz(
    apiKey: string,
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    numQuestions: number = 5
): Promise<QuizQuestion[]> {
    const prompt = `Generate a ${difficulty} quiz about "${topic}" with exactly ${numQuestions} multiple choice questions.

Return ONLY valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Why this answer is correct"
  }
]

"correct" is the index (0-3) of the correct option.
Difficulty: ${difficulty}
Topic: ${topic}`;

    const raw = await groqRequest(
        apiKey,
        [{ role: 'user', content: prompt }],
        { model: DEFAULT_MODEL, temperature: 0.5, maxTokens: 2000 }
    );

    // Extract JSON from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid quiz response format');

    return JSON.parse(jsonMatch[0]);
}

// ─── Feature 3: Text Summarizer ───────────────────────────────────
export async function summarizeText(
    apiKey: string,
    text: string,
    style: 'brief' | 'detailed' | 'bullet_points' | 'academic' = 'brief',
    targetLength?: number
): Promise<string> {
    const styleInstructions = {
        brief: 'Write a concise 2-3 paragraph summary.',
        detailed: 'Write a comprehensive, detailed summary covering all key points.',
        bullet_points: 'Summarize using clear, organized bullet points with main ideas and sub-points.',
        academic: 'Write an academic-style abstract with objective language and structured sections.',
    };

    const prompt = `${styleInstructions[style]}${targetLength ? ` Target approximately ${targetLength} words.` : ''}

Text to summarize:
"""
${text.slice(0, 8000)}
"""

Provide only the summary, no preamble.`;

    return groqRequest(
        apiKey,
        [{ role: 'user', content: prompt }],
        { temperature: 0.4, maxTokens: 1500 }
    );
}

// ─── Feature 4: Flashcard Generator ──────────────────────────────
export interface Flashcard {
    id: string;
    front: string;
    back: string;
    category: string;
}

export async function generateFlashcards(
    apiKey: string,
    topic: string,
    count: number = 10
): Promise<Flashcard[]> {
    const prompt = `Create ${count} educational flashcards about "${topic}".

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "id": "1",
    "front": "Question or concept",
    "back": "Answer or explanation (1-3 sentences)",
    "category": "subcategory or type"
  }
]

Make cards progressively more complex. Cover key definitions, concepts, formulas, and applications.`;

    const raw = await groqRequest(
        apiKey,
        [{ role: 'user', content: prompt }],
        { temperature: 0.6, maxTokens: 2000 }
    );

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid flashcard response');
    return JSON.parse(jsonMatch[0]);
}

// ─── Feature 5: Essay Helper ──────────────────────────────────────
export async function essayHelper(
    apiKey: string,
    action: 'outline' | 'write' | 'improve' | 'proofread' | 'analyze',
    content: string,
    essayType?: string,
    wordCount?: number
): Promise<string> {
    const prompts = {
        outline: `Create a detailed essay outline for the topic: "${content}". Include thesis, main arguments, supporting evidence, and conclusion. Essay type: ${essayType || 'argumentative'}.`,
        write: `Write a ${wordCount || 500}-word ${essayType || 'argumentative'} essay on: "${content}". Include introduction with thesis, body paragraphs with evidence, and a strong conclusion.`,
        improve: `Improve this essay for clarity, flow, vocabulary, and argument strength. Provide the improved version:\n\n${content}`,
        proofread: `Proofread this text. Identify and fix grammatical errors, spelling mistakes, punctuation issues, and awkward phrasing. Show the corrected version with a brief list of changes:\n\n${content}`,
        analyze: `Analyze this essay and provide detailed feedback on: thesis clarity, argument strength, evidence quality, paragraph structure, transitions, and writing style:\n\n${content}`,
    };

    return groqRequest(
        apiKey,
        [{ role: 'user', content: prompts[action] }],
        { temperature: 0.6, maxTokens: 2000 }
    );
}

// ─── Feature 6: Code Helper ───────────────────────────────────────
export async function codeHelper(
    apiKey: string,
    action: 'explain' | 'debug' | 'generate' | 'optimize' | 'convert',
    code: string,
    language?: string,
    targetLanguage?: string,
    chatHistory: GroqMessage[] = []
): Promise<string> {
    const systemPrompt = `You are EduAI Code Helper, an expert programming tutor for students.
- Explain code in simple, educational terms
- Point out bugs with clear explanations of why they're wrong
- Provide working, well-commented code
- Always explain the concepts behind solutions
- Format code with proper markdown code blocks`;

    const prompts = {
        explain: `Explain this ${language || ''} code step-by-step for a student:\n\`\`\`\n${code}\n\`\`\``,
        debug: `Debug this ${language || ''} code. Identify all bugs, explain why each is a bug, and provide the corrected code:\n\`\`\`\n${code}\n\`\`\``,
        generate: `Generate clean, well-commented ${language || 'Python'} code for: ${code}`,
        optimize: `Optimize this ${language || ''} code for better performance and readability. Explain each optimization:\n\`\`\`\n${code}\n\`\`\``,
        convert: `Convert this code from ${language || 'Python'} to ${targetLanguage || 'JavaScript'}. Explain any differences:\n\`\`\`\n${code}\n\`\`\``,
    };

    const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6),
        { role: 'user', content: prompts[action] },
    ];

    return groqRequest(apiKey, messages, {
        model: CODE_MODEL,
        temperature: 0.3,
        maxTokens: 2048,
    });
}

// ─── Feature 7: Language Translator ──────────────────────────────
export async function translateText(
    apiKey: string,
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    mode: 'translate' | 'explain' | 'vocabulary' = 'translate'
): Promise<string> {
    const prompts = {
        translate: `Translate the following text${sourceLanguage ? ` from ${sourceLanguage}` : ''} to ${targetLanguage}. Provide only the translation:\n\n${text}`,
        explain: `Translate this to ${targetLanguage} and then explain cultural nuances, idioms, and important language notes:\n\n${text}`,
        vocabulary: `Extract key vocabulary from this text, translate each word/phrase to ${targetLanguage}, and explain usage:\n\n${text}`,
    };

    return groqRequest(
        apiKey,
        [{ role: 'user', content: prompts[mode] }],
        { temperature: 0.3, maxTokens: 1500 }
    );
}

// ─── Feature 8: Mind Map Generator ───────────────────────────────
export interface MindMapNode {
    id: string;
    label: string;
    children: MindMapNode[];
    color?: string;
}

export async function generateMindMap(
    apiKey: string,
    topic: string,
    depth: number = 3
): Promise<MindMapNode> {
    const prompt = `Create a mind map structure for the topic: "${topic}"
Depth: ${depth} levels

Return ONLY valid JSON (no markdown):
{
  "id": "root",
  "label": "Main Topic",
  "children": [
    {
      "id": "1",
      "label": "Branch 1",
      "children": [
        {"id": "1.1", "label": "Sub-branch", "children": []}
      ]
    }
  ]
}

Create ${depth >= 2 ? '4-6' : '3-4'} main branches, each with ${depth >= 3 ? '2-3' : '1-2'} sub-branches.`;

    const raw = await groqRequest(
        apiKey,
        [{ role: 'user', content: prompt }],
        { temperature: 0.5, maxTokens: 2000 }
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid mind map response');
    return JSON.parse(jsonMatch[0]);
}

// ─── Feature 9: Document Text Extraction + Analysis ───────────────
export async function analyzeExtractedText(
    apiKey: string,
    extractedText: string,
    analysisType: 'summary' | 'keypoints' | 'questions' | 'concepts'
): Promise<string> {
    const prompts = {
        summary: `Provide a comprehensive summary of this document:\n\n${extractedText.slice(0, 6000)}`,
        keypoints: `Extract and organize the key points, main arguments, and important facts from this document:\n\n${extractedText.slice(0, 6000)}`,
        questions: `Generate 10 thoughtful study questions based on this document's content:\n\n${extractedText.slice(0, 6000)}`,
        concepts: `Identify and explain the key concepts, terminology, and theories in this document:\n\n${extractedText.slice(0, 6000)}`,
    };

    return groqRequest(
        apiKey,
        [{ role: 'user', content: prompts[analysisType] }],
        { temperature: 0.5, maxTokens: 2000 }
    );
}

// ─── Feature 10: Study Plan Generator ────────────────────────────
export interface StudyPlan {
    title: string;
    duration: string;
    dailyGoal: string;
    weeks: Array<{
        week: number;
        theme: string;
        tasks: string[];
        resources: string[];
    }>;
    tips: string[];
}

export async function generateStudyPlan(
    apiKey: string,
    subject: string,
    duration: string,
    currentLevel: 'beginner' | 'intermediate' | 'advanced',
    goals: string
): Promise<StudyPlan> {
    const prompt = `Create a detailed study plan for a student.
Subject: ${subject}
Duration: ${duration}
Current Level: ${currentLevel}
Goals: ${goals}

Return ONLY valid JSON:
{
  "title": "Study Plan Title",
  "duration": "${duration}",
  "dailyGoal": "Daily study goal",
  "weeks": [
    {
      "week": 1,
      "theme": "Week theme",
      "tasks": ["Task 1", "Task 2", "Task 3"],
      "resources": ["Resource 1", "Resource 2"]
    }
  ],
  "tips": ["Study tip 1", "Study tip 2", "Study tip 3"]
}`;

    const raw = await groqRequest(
        apiKey,
        [{ role: 'user', content: prompt }],
        { temperature: 0.6, maxTokens: 2000 }
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid study plan response');
    return JSON.parse(jsonMatch[0]);
}

// ─── PDF Content Generator (for PDF Maker feature) ────────────────
export async function generatePdfContent(
    apiKey: string,
    type: 'notes' | 'report' | 'summary' | 'study_guide',
    topic: string,
    additionalInfo?: string
): Promise<string> {
    const typeInstructions = {
        notes: `Create comprehensive study notes with sections, key concepts, important formulas/dates, and review questions.`,
        report: `Write a structured academic report with: Abstract, Introduction, Main Content sections, Analysis, and Conclusion.`,
        summary: `Create a clear, organized summary document with an overview, main points organized by theme, and key takeaways.`,
        study_guide: `Create a comprehensive study guide with: Overview, Key Concepts, Definitions, Examples, Practice Questions, and Quick Review.`,
    };

    const prompt = `${typeInstructions[type]}

Topic: "${topic}"
${additionalInfo ? `Additional context: ${additionalInfo}` : ''}

Format with clear HTML-ready structure. Use ## for headers, **bold** for key terms, and - for lists.`;

    return groqRequest(
        apiKey,
        [{ role: 'user', content: prompt }],
        { temperature: 0.5, maxTokens: 3000 }
    );
}

export { groqRequest };