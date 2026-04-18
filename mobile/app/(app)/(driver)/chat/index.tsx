import { View, Text, StyleSheet } from 'react-native';

export default function DriverChatListScreen() {
  return (
    <View style={styles.container}>
      <Text>Driver Chat List</Text>
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
