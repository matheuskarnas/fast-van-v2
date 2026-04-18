import { View, Text, StyleSheet } from 'react-native';

export default function PassengerHomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Passenger Home</Text>
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
