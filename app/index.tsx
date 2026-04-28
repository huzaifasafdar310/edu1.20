// app/index.tsx — Auth gate / splash screen
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { db } from '../src/services/database';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const router = useRouter();
  const { setUser, setLoading } = useStore();

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      try {
        const user = await db.restoreSession();
        if (user) {
          const groqKey = await db.getGroqApiKey(user.id);
          if (groqKey) user.groqApiKey = groqKey;
          setUser(user);
          router.replace('/(tabs)');
        } else {
          router.replace('/auth');
        }
      } catch {
        router.replace('/auth');
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' },
});
