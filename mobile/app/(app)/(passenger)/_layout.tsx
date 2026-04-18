import { BottomTabNavigationProp, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

const Tab = createBottomTabNavigator();

// Placeholder screens
const HomeScreen = () => <View />;
const LinesScreen = () => <View />;
const ChatScreen = () => <View />;
const ProfileScreen = () => <View />;

export default function PassengerLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Tab.Screen name="home" component={HomeScreen} />
      <Tab.Screen name="lines" component={LinesScreen} />
      <Tab.Screen name="chat" component={ChatScreen} />
      <Tab.Screen name="profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
