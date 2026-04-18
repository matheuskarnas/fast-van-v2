import { View, Text, StyleSheet } from 'react-native';

export default function DriverHomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Driver Home</Text>
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
