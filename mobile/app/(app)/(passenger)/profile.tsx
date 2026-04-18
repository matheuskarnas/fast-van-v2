import { View, Text, StyleSheet } from 'react-native';

export default function PassengerProfileScreen() {
  return (
    <View style={styles.container}>
      <Text>Passenger Profile</Text>
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
