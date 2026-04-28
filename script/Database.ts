// src/services/database.ts
/**
 * EduAI Database Service
 * Uses AsyncStorage as the primary local store + SecureStore for sensitive data.
 * For production: replace AsyncStorage with a real backend (Supabase, Firebase, etc.)
 * SecureStore is used for tokens & API keys (hardware-backed encryption on device).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User } from '../store/useStore';

// ─── Key Namespaces ───────────────────────────────────────────────
const KEYS = {
    USERS_INDEX: 'eduai:users_index',
    USER_PREFIX: 'eduai:user:',
    SESSION: 'eduai:session',
    GROQ_KEY: 'eduai:groq_key',
    BIOMETRIC_TOKEN: 'eduai:biometric_token',
    NOTES_PREFIX: 'eduai:notes:',
    HISTORY_PREFIX: 'eduai:history:',
};

// ─── Simple password hashing (use bcrypt in production) ──────────
function hashPassword(password: string, salt: string): string {
    // In production use: bcryptjs.hashSync(password, 12)
    // Here we use a deterministic hash simulation
    let hash = 0;
    const str = password + salt + 'eduai_secret_2024';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + salt.split('').reverse().join('');
}

function generateSalt(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ─── User record stored in AsyncStorage ──────────────────────────
interface StoredUser {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
    preferences: User['preferences'];
    stats: User['stats'];
}

// ─── Auth Operations ─────────────────────────────────────────────
export const db = {
    /**
     * Register a new user
     */
    async register(
        name: string,
        email: string,
        password: string
    ): Promise<{ success: boolean; error?: string; user?: User }> {
        try {
            // Check if email already exists
            const indexRaw = await AsyncStorage.getItem(KEYS.USERS_INDEX);
            const usersIndex: string[] = indexRaw ? JSON.parse(indexRaw) : [];

            for (const userId of usersIndex) {
                const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
                if (userRaw) {
                    const stored: StoredUser = JSON.parse(userRaw);
                    if (stored.email.toLowerCase() === email.toLowerCase()) {
                        return { success: false, error: 'Email already registered.' };
                    }
                }
            }

            // Validate password strength
            if (password.length < 8) {
                return { success: false, error: 'Password must be at least 8 characters.' };
            }
            if (!/[A-Z]/.test(password)) {
                return { success: false, error: 'Password must contain at least one uppercase letter.' };
            }
            if (!/[0-9]/.test(password)) {
                return { success: false, error: 'Password must contain at least one number.' };
            }

            const salt = generateSalt();
            const passwordHash = hashPassword(password, salt);
            const id = generateId();

            const storedUser: StoredUser = {
                id,
                email: email.toLowerCase().trim(),
                name: name.trim(),
                passwordHash,
                salt,
                createdAt: new Date().toISOString(),
                preferences: {
                    theme: 'light',
                    language: 'en',
                    notifications: true,
                    biometricEnabled: false,
                },
                stats: {
                    questionsAsked: 0,
                    quizzesTaken: 0,
                    documentsProcessed: 0,
                    studyStreak: 0,
                    lastStudyDate: '',
                },
            };

            // Save user
            await AsyncStorage.setItem(KEYS.USER_PREFIX + id, JSON.stringify(storedUser));

            // Update index
            usersIndex.push(id);
            await AsyncStorage.setItem(KEYS.USERS_INDEX, JSON.stringify(usersIndex));

            const publicUser = mapToPublicUser(storedUser);
            return { success: true, user: publicUser };
        } catch (e) {
            console.error('Register error:', e);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    },

    /**
     * Login with email + password
     */
    async login(
        email: string,
        password: string
    ): Promise<{ success: boolean; error?: string; user?: User }> {
        try {
            const indexRaw = await AsyncStorage.getItem(KEYS.USERS_INDEX);
            const usersIndex: string[] = indexRaw ? JSON.parse(indexRaw) : [];

            for (const userId of usersIndex) {
                const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
                if (!userRaw) continue;

                const stored: StoredUser = JSON.parse(userRaw);
                if (stored.email.toLowerCase() !== email.toLowerCase()) continue;

                const hash = hashPassword(password, stored.salt);
                if (hash !== stored.passwordHash) {
                    return { success: false, error: 'Incorrect password.' };
                }

                // Save session token
                const sessionToken = generateId() + generateId();
                await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify({
                    userId: stored.id,
                    token: sessionToken,
                    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
                }));

                const publicUser = mapToPublicUser(stored);
                return { success: true, user: publicUser };
            }

            return { success: false, error: 'No account found with this email.' };
        } catch (e) {
            console.error('Login error:', e);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    },

    /**
     * Restore session on app start
     */
    async restoreSession(): Promise<User | null> {
        try {
            const sessionRaw = await SecureStore.getItemAsync(KEYS.SESSION);
            if (!sessionRaw) return null;

            const session = JSON.parse(sessionRaw);
            if (session.expiresAt < Date.now()) {
                await SecureStore.deleteItemAsync(KEYS.SESSION);
                return null;
            }

            const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + session.userId);
            if (!userRaw) return null;

            const stored: StoredUser = JSON.parse(userRaw);
            const groqKey = await SecureStore.getItemAsync(KEYS.GROQ_KEY + stored.id);

            const publicUser = mapToPublicUser(stored);
            if (groqKey) publicUser.groqApiKey = groqKey;

            return publicUser;
        } catch {
            return null;
        }
    },

    /**
     * Logout - clear session
     */
    async logout(): Promise<void> {
        await SecureStore.deleteItemAsync(KEYS.SESSION);
    },

    /**
     * Save Groq API key (SecureStore = encrypted on device)
     */
    async saveGroqApiKey(userId: string, key: string): Promise<void> {
        await SecureStore.setItemAsync(KEYS.GROQ_KEY + userId, key);
    },

    /**
     * Get Groq API key
     */
    async getGroqApiKey(userId: string): Promise<string | null> {
        return await SecureStore.getItemAsync(KEYS.GROQ_KEY + userId);
    },

    /**
     * Delete Groq API key
     */
    async deleteGroqApiKey(userId: string): Promise<void> {
        await SecureStore.deleteItemAsync(KEYS.GROQ_KEY + userId);
    },

    /**
     * Update user preferences
     */
    async updatePreferences(userId: string, preferences: Partial<User['preferences']>): Promise<void> {
        const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
        if (!userRaw) return;
        const stored: StoredUser = JSON.parse(userRaw);
        stored.preferences = { ...stored.preferences, ...preferences };
        await AsyncStorage.setItem(KEYS.USER_PREFIX + userId, JSON.stringify(stored));
    },

    /**
     * Update user stats
     */
    async updateStats(userId: string, stats: Partial<User['stats']>): Promise<void> {
        const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
        if (!userRaw) return;
        const stored: StoredUser = JSON.parse(userRaw);
        stored.stats = { ...stored.stats, ...stats };
        await AsyncStorage.setItem(KEYS.USER_PREFIX + userId, JSON.stringify(stored));
    },

    /**
     * Save a note
     */
    async saveNote(userId: string, note: { id: string; title: string; content: string; createdAt: string }): Promise<void> {
        const key = KEYS.NOTES_PREFIX + userId;
        const raw = await AsyncStorage.getItem(key);
        const notes = raw ? JSON.parse(raw) : [];
        const idx = notes.findIndex((n: { id: string }) => n.id === note.id);
        if (idx >= 0) notes[idx] = note;
        else notes.push(note);
        await AsyncStorage.setItem(key, JSON.stringify(notes));
    },

    /**
     * Get all notes
     */
    async getNotes(userId: string): Promise<Array<{ id: string; title: string; content: string; createdAt: string }>> {
        const raw = await AsyncStorage.getItem(KEYS.NOTES_PREFIX + userId);
        return raw ? JSON.parse(raw) : [];
    },

    /**
     * Save a biometric token
     */
    async saveBiometricToken(userId: string, token: string): Promise<void> {
        await SecureStore.setItemAsync(KEYS.BIOMETRIC_TOKEN + userId, token);
    },

    /**
     * Get biometric token for auto-login
     */
    async getBiometricToken(userId: string): Promise<string | null> {
        return SecureStore.getItemAsync(KEYS.BIOMETRIC_TOKEN + userId);
    },

    /**
     * Delete user account
     */
    async deleteAccount(userId: string): Promise<void> {
        const indexRaw = await AsyncStorage.getItem(KEYS.USERS_INDEX);
        const usersIndex: string[] = indexRaw ? JSON.parse(indexRaw) : [];
        const updated = usersIndex.filter((id) => id !== userId);
        await AsyncStorage.multiRemove([KEYS.USER_PREFIX + userId, KEYS.NOTES_PREFIX + userId]);
        await AsyncStorage.setItem(KEYS.USERS_INDEX, JSON.stringify(updated));
        await SecureStore.deleteItemAsync(KEYS.SESSION);
        await SecureStore.deleteItemAsync(KEYS.GROQ_KEY + userId);
        await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_TOKEN + userId);
    },
};

function mapToPublicUser(stored: StoredUser): User {
    return {
        id: stored.id,
        email: stored.email,
        name: stored.name,
        createdAt: stored.createdAt,
        preferences: stored.preferences,
        stats: stored.stats,
    };
}