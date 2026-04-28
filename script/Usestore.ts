// src/store/useStore.ts
import { create } from 'zustand';

export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    createdAt: string;
    groqApiKey?: string;
    preferences: {
        theme: 'light' | 'dark';
        language: string;
        notifications: boolean;
        biometricEnabled: boolean;
    };
    stats: {
        questionsAsked: number;
        quizzesTaken: number;
        documentsProcessed: number;
        studyStreak: number;
        lastStudyDate: string;
    };
}

interface AppState {
    // Auth
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // API Key
    groqApiKey: string;
    hasApiKey: boolean;

    // Chat history per feature
    chatHistories: Record<string, ChatMessage[]>;

    // UI state
    activeFeature: string | null;

    // Actions
    setUser: (user: User | null) => void;
    setGroqApiKey: (key: string) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
    updateStats: (stat: keyof User['stats'], value?: number) => void;
    addChatMessage: (feature: string, message: ChatMessage) => void;
    clearChatHistory: (feature: string) => void;
    setActiveFeature: (feature: string | null) => void;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export const useStore = create<AppState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    groqApiKey: '',
    hasApiKey: false,
    chatHistories: {},
    activeFeature: null,

    setUser: (user) =>
        set({
            user,
            isAuthenticated: !!user,
            groqApiKey: user?.groqApiKey || '',
            hasApiKey: !!(user?.groqApiKey),
        }),

    setGroqApiKey: (key) =>
        set((state) => ({
            groqApiKey: key,
            hasApiKey: key.length > 0,
            user: state.user ? { ...state.user, groqApiKey: key } : null,
        })),

    setLoading: (loading) => set({ isLoading: loading }),

    logout: () =>
        set({
            user: null,
            isAuthenticated: false,
            groqApiKey: '',
            hasApiKey: false,
            chatHistories: {},
            activeFeature: null,
        }),

    updateStats: (stat, value = 1) =>
        set((state) => {
            if (!state.user) return state;
            return {
                user: {
                    ...state.user,
                    stats: {
                        ...state.user.stats,
                        [stat]: typeof value === 'number'
                            ? (state.user.stats[stat] as number) + value
                            : value,
                        lastStudyDate: new Date().toISOString(),
                    },
                },
            };
        }),

    addChatMessage: (feature, message) =>
        set((state) => ({
            chatHistories: {
                ...state.chatHistories,
                [feature]: [...(state.chatHistories[feature] || []), message],
            },
        })),

    clearChatHistory: (feature) =>
        set((state) => ({
            chatHistories: {
                ...state.chatHistories,
                [feature]: [],
            },
        })),

    setActiveFeature: (feature) => set({ activeFeature: feature }),
}));