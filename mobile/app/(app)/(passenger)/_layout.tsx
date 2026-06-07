import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { useUnreadChatCount } from "../../../hooks/useUnreadChatCount";

export default function PassengerLayout() {
  const { badge } = useUnreadChatCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand.orange,
        tabBarInactiveTintColor: theme.colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background.card,
          borderTopColor: theme.colors.border.soft,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lines"
        options={{
          title: "Linhas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bus-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Market",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarBadge: badge,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.feedback.error,
            color: "#fff",
            fontSize: 10,
            fontWeight: "800",
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="rate"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
