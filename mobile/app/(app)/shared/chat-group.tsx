import { View, Text, StyleSheet } from 'react-native';

export default function ChatGroupScreen() {
  return (
    <View style={styles.container}>
      <Text>Chat Group</Text>
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
