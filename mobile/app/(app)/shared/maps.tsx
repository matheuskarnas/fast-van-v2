import { View, Text, StyleSheet } from 'react-native';

export default function MapsScreen() {
  return (
    <View style={styles.container}>
      <Text>Maps</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
