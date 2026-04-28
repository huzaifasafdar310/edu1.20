try {
  const path = require.resolve('react-native-worklets/plugin');
  console.log('Found plugin at:', path);
} catch (e) {
  console.error('Failed to find plugin:', e.message);
}
