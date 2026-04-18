import { View, Text, StyleSheet } from 'react-native';

export default function DriverProfileScreen() {
  return (
    <View style={styles.container}>
      <Text>Driver Profile</Text>
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
