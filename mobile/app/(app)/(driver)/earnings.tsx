import { View, Text, StyleSheet } from 'react-native';

export default function DriverEarningsScreen() {
  return (
    <View style={styles.container}>
      <Text>Driver Earnings</Text>
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
