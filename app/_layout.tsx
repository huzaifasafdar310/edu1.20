// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="tutor" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="quiz" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="summarize" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="flashcards" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="essay" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="codehelper" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="translator" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="studyplan" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="docextract" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="pdfmaker" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="mindmap" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
