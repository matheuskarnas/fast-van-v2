import { View, Text, StyleSheet } from 'react-native';

export default function DriverRegisterVehicleScreen() {
  return (
    <View style={styles.container}>
      <Text>Register Vehicle</Text>
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
