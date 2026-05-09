import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { acceptLineInvite } from "@/services/operations";
import { colors, theme } from "@/constants/theme";

export default function AcceptInviteScreen() {
  const { auth } = useAuth();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAcceptInvite = async () => {
    if (!token.trim()) {
      Alert.alert("Erro", "Por favor, insira o token do convite.");
      return;
    }

    try {
      setLoading(true);
      const response = await acceptLineInvite(token.trim());

      if (!response.success) {
        Alert.alert("Erro", response.error?.message || "Não foi possível aceitar o convite.");
        return;
      }

      Alert.alert("Sucesso!", "Você entrou na linha com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            setToken("");
            router.replace("/(passenger)/home");
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Erro", "Erro ao processar o convite. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!auth?.user) {
    return (
      <View style={[theme.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 24 }}>
          Você precisa estar logado para aceitar um convite.
        </Text>
        <TouchableOpacity style={theme.button} onPress={() => router.replace("/(auth)/login")}>
          <Text style={theme.buttonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[theme.container, { justifyContent: "center", paddingHorizontal: 24 }]}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 32, color: colors.text }}>
        Entrar em uma Linha
      </Text>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, color: colors.text }}>
          Token do Convite
        </Text>
        <TextInput
          style={[
            theme.input,
            {
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="Cole o token aqui..."
          placeholderTextColor={colors.textSecondary}
          value={token}
          onChangeText={setToken}
          editable={!loading}
          selectionColor={colors.primary}
        />
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 8,
          }}
        >
          Você recebeu o token do motorista via WhatsApp, email ou outro meio.
        </Text>
      </View>

      <TouchableOpacity
        style={[theme.button, { opacity: loading ? 0.6 : 1 }]}
        onPress={handleAcceptInvite}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.buttonText} />
        ) : (
          <Text style={theme.buttonText}>Aceitar Convite</Text>
        )}
      </TouchableOpacity>

      <View
        style={{
          backgroundColor: colors.info + "20",
          borderRadius: 8,
          padding: 12,
          marginTop: 32,
          borderLeftWidth: 4,
          borderLeftColor: colors.info,
        }}
      >
        <Text style={{ fontSize: 12, color: colors.text, fontWeight: "600", marginBottom: 4 }}>
          💡 Dica:
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          Se o motorista compartilhou um link, você pode clicar nele diretamente. O token será
          preenchido automaticamente.
        </Text>
      </View>
    </View>
  );
}
