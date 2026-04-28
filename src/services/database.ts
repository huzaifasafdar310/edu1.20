// src/services/database.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User } from '../store/useStore';

const KEYS = {
  USERS_INDEX: 'eduai_users_index',
  USER_PREFIX: 'eduai_user_',
  SESSION: 'eduai_session',
  GROQ_KEY: 'eduai_groq_key_',
  BIOMETRIC_TOKEN: 'eduai_biometric_token_',
  NOTES_PREFIX: 'eduai_notes_',
};

function hashPassword(password: string, salt: string): string {
  let hash = 0;
  const str = password + salt + 'eduai_secure_2024_#$!';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  let hash2 = 0;
  const str2 = salt + Math.abs(hash).toString(36) + 'eduai';
  for (let i = 0; i < str2.length; i++) {
    hash2 = (hash2 << 5) - hash2 + str2.charCodeAt(i);
    hash2 = hash2 & hash2;
  }
  return Math.abs(hash).toString(36) + '_' + Math.abs(hash2).toString(36) + '_' + salt.slice(0, 4);
}

function generateSalt(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  failedAttempts: number;
  lockedUntil: number;
  preferences: User['preferences'];
  stats: User['stats'];
}

export const db = {
  async register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const indexRaw = await AsyncStorage.getItem(KEYS.USERS_INDEX);
      const usersIndex: string[] = indexRaw ? JSON.parse(indexRaw) : [];
      
      // Check for existing email more efficiently
      for (const userId of usersIndex) {
        const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
        if (userRaw) {
          const stored: StoredUser = JSON.parse(userRaw);
          if (stored.email === cleanEmail) {
            console.log('Register: Email already exists:', cleanEmail);
            return { success: false, error: 'An account with this email already exists.' };
          }
        }
      }

      if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
      
      const salt = generateSalt();
      const id = generateId();
      const storedUser: StoredUser = {
        id, email: cleanEmail, name: name.trim(),
        passwordHash: hashPassword(password, salt), salt,
        createdAt: new Date().toISOString(), failedAttempts: 0, lockedUntil: 0,
        preferences: { theme: 'light', language: 'en', notifications: true, biometricEnabled: false },
        stats: { questionsAsked: 0, quizzesTaken: 0, documentsProcessed: 0, studyStreak: 0, lastStudyDate: '' },
      };

      await AsyncStorage.setItem(KEYS.USER_PREFIX + id, JSON.stringify(storedUser));
      const newIndex = [...usersIndex, id];
      await AsyncStorage.setItem(KEYS.USERS_INDEX, JSON.stringify(newIndex));
      
      console.log('Register: Success for', cleanEmail, 'ID:', id);
      return { success: true, user: mapToPublicUser(storedUser) };
    } catch (e: any) {
      console.error('Register Error:', e.message);
      return { success: false, error: 'Registration failed: ' + e.message };
    }
  },

  async login(email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const cleanEmail = email.toLowerCase().trim();
      console.log('Login attempt for:', cleanEmail);
      
      const indexRaw = await AsyncStorage.getItem(KEYS.USERS_INDEX);
      const usersIndex: string[] = indexRaw ? JSON.parse(indexRaw) : [];
      
      if (usersIndex.length === 0) {
        console.log('Login: No users in index');
        return { success: false, error: 'No accounts found on this device.' };
      }

      for (const userId of usersIndex) {
        const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
        if (!userRaw) {
          console.log('Login: User data missing for ID', userId);
          continue;
        }
        
        const stored: StoredUser = JSON.parse(userRaw);
        if (stored.email !== cleanEmail) continue;

        if (stored.lockedUntil > Date.now()) {
          const mins = Math.ceil((stored.lockedUntil - Date.now()) / 60000);
          return { success: false, error: `Account locked. Try again in ${mins} minute(s).` };
        }

        const hash = hashPassword(password, stored.salt);
        if (hash !== stored.passwordHash) {
          console.log('Login: Password mismatch for', cleanEmail);
          stored.failedAttempts = (stored.failedAttempts || 0) + 1;
          if (stored.failedAttempts >= 5) { 
            stored.lockedUntil = Date.now() + 15 * 60 * 1000; 
            stored.failedAttempts = 0; 
          }
          await AsyncStorage.setItem(KEYS.USER_PREFIX + userId, JSON.stringify(stored));
          const rem = 5 - stored.failedAttempts;
          return { success: false, error: stored.lockedUntil > 0 ? 'Account locked for 15 minutes.' : `Incorrect password. ${rem} attempt(s) left.` };
        }

        console.log('Login: Success for', cleanEmail);
        stored.failedAttempts = 0; 
        stored.lockedUntil = 0;
        await AsyncStorage.setItem(KEYS.USER_PREFIX + userId, JSON.stringify(stored));
        
        const sessionToken = generateId();
        await SecureStore.setItemAsync(KEYS.SESSION, JSON.stringify({ 
          userId: stored.id, 
          token: sessionToken, 
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 
        }));
        
        return { success: true, user: mapToPublicUser(stored) };
      }
      
      console.log('Login: No matching email found');
      return { success: false, error: 'Incorrect email or account does not exist.' };
    } catch (e: any) {
      console.error('Login Error:', e.message);
      return { success: false, error: 'Login failed: ' + e.message };
    }
  },

  async restoreSession(): Promise<User | null> {
    try {
      const sessionRaw = await SecureStore.getItemAsync(KEYS.SESSION);
      if (!sessionRaw) return null;
      const session = JSON.parse(sessionRaw);
      if (session.expiresAt < Date.now()) { await SecureStore.deleteItemAsync(KEYS.SESSION); return null; }
      const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + session.userId);
      if (!userRaw) return null;
      const stored: StoredUser = JSON.parse(userRaw);
      const publicUser = mapToPublicUser(stored);
      const groqKey = await SecureStore.getItemAsync(KEYS.GROQ_KEY + stored.id);
      if (groqKey) publicUser.groqApiKey = groqKey;
      return publicUser;
    } catch { return null; }
  },

  async logout(): Promise<void> { await SecureStore.deleteItemAsync(KEYS.SESSION); },
  async saveGroqApiKey(userId: string, key: string): Promise<void> { await SecureStore.setItemAsync(KEYS.GROQ_KEY + userId, key); },
  async getGroqApiKey(userId: string): Promise<string | null> { return SecureStore.getItemAsync(KEYS.GROQ_KEY + userId); },
  async deleteGroqApiKey(userId: string): Promise<void> { await SecureStore.deleteItemAsync(KEYS.GROQ_KEY + userId); },
  async saveBiometricToken(userId: string, token: string): Promise<void> { await SecureStore.setItemAsync(KEYS.BIOMETRIC_TOKEN + userId, token); },
  async getBiometricToken(userId: string): Promise<string | null> { return SecureStore.getItemAsync(KEYS.BIOMETRIC_TOKEN + userId); },

  async updateStats(userId: string, stats: Partial<User['stats']>): Promise<void> {
    const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
    if (!userRaw) return;
    const stored: StoredUser = JSON.parse(userRaw);
    stored.stats = { ...stored.stats, ...stats };
    await AsyncStorage.setItem(KEYS.USER_PREFIX + userId, JSON.stringify(stored));
  },

  async updatePreferences(userId: string, prefs: Partial<User['preferences']>): Promise<void> {
    const userRaw = await AsyncStorage.getItem(KEYS.USER_PREFIX + userId);
    if (!userRaw) return;
    const stored: StoredUser = JSON.parse(userRaw);
    stored.preferences = { ...stored.preferences, ...prefs };
    await AsyncStorage.setItem(KEYS.USER_PREFIX + userId, JSON.stringify(stored));
  },

  async saveNote(userId: string, note: { id: string; title: string; content: string; createdAt: string }): Promise<void> {
    const key = KEYS.NOTES_PREFIX + userId;
    const raw = await AsyncStorage.getItem(key);
    const notes = raw ? JSON.parse(raw) : [];
    const idx = notes.findIndex((n: { id: string }) => n.id === note.id);
    if (idx >= 0) notes[idx] = note; else notes.push(note);
    await AsyncStorage.setItem(key, JSON.stringify(notes));
  },

  async getNotes(userId: string): Promise<Array<{ id: string; title: string; content: string; createdAt: string }>> {
    const raw = await AsyncStorage.getItem(KEYS.NOTES_PREFIX + userId);
    return raw ? JSON.parse(raw) : [];
  },

  async deleteAccount(userId: string): Promise<void> {
    const indexRaw = await AsyncStorage.getItem(KEYS.USERS_INDEX);
    const usersIndex: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    await AsyncStorage.multiRemove([KEYS.USER_PREFIX + userId, KEYS.NOTES_PREFIX + userId]);
    await AsyncStorage.setItem(KEYS.USERS_INDEX, JSON.stringify(usersIndex.filter(id => id !== userId)));
    await SecureStore.deleteItemAsync(KEYS.SESSION);
    await SecureStore.deleteItemAsync(KEYS.GROQ_KEY + userId);
    await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_TOKEN + userId);
  },

  async clearAllData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const eduaiKeys = keys.filter(k => k.startsWith('eduai_'));
      await AsyncStorage.multiRemove(eduaiKeys);
      await SecureStore.deleteItemAsync(KEYS.SESSION);
      // Try to clear all keys from SecureStore if possible (iterate through users)
      const usersIndex: string[] = JSON.parse(await AsyncStorage.getItem(KEYS.USERS_INDEX) || '[]');
      for (const uid of usersIndex) {
        await SecureStore.deleteItemAsync(KEYS.GROQ_KEY + uid);
        await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_TOKEN + uid);
      }
      await AsyncStorage.removeItem(KEYS.USERS_INDEX);
      console.log('App database fully reset');
    } catch (e) {
      console.error('Reset failed:', e);
      throw e;
    }
  },
};

function mapToPublicUser(stored: StoredUser): User {
  return { id: stored.id, email: stored.email, name: stored.name, createdAt: stored.createdAt, preferences: stored.preferences, stats: stored.stats };
}
