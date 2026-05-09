import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { acceptLineInvite } from "@/services/operations";
import { colors, theme } from "@/constants/theme";

/**
 * Tela de deep linking para aceitar convite de linha
 *
 * Pode ser acessada por:
 * - Link externo: fastvan://invite/TOKEN
 * - Deep link HTTP: https://fastvan.app/invite/TOKEN
 *
 * Se o usuário for autenticado, aceita automaticamente
 * Se não for, mostra a tela para entrar o token
 */
export default function InviteLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { auth, isLoading: authLoading } = useAuth();
  const [accepting, setAccepting] = useState(false);

  /**
   * Se o usuário estiver autenticado, tenta aceitar o convite automaticamente
   */
  useEffect(() => {
    if (!authLoading && auth?.user && token) {
      acceptInviteAutomatically();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, auth?.user, token]);

  const acceptInviteAutomatically = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      const response = await acceptLineInvite(token);

      if (!response.success) {
        Alert.alert(
          "Não foi possível aceitar",
          response.error?.message || "Token inválido ou expirado.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(app)/(passenger)/home"),
            },
          ]
        );
        return;
      }

      Alert.alert("Sucesso!", "Você entrou na linha!", [
        {
          text: "OK",
          onPress: () => router.replace("/(app)/(passenger)/home"),
        },
      ]);
    } catch (_error) {
      Alert.alert(
        "Erro",
        "Erro ao processar o convite. Tente novamente.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(app)/(passenger)/home"),
          },
        ]
      );
    } finally {
      setAccepting(false);
    }
  };

  // Se está carregando auth ou aceitando convite
  if (authLoading || accepting) {
    return (
      <View style={[theme.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>
          {accepting ? "Processando convite..." : "Carregando..."}
        </Text>
      </View>
    );
  }

  // Se não estiver autenticado, redireciona para login com redirecionamento pós-login
  if (!auth?.user) {
    return (
      <View style={[theme.container, { justifyContent: "center", paddingHorizontal: 24 }]}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 32, color: colors.text }}>
          Convite de Linha
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            marginBottom: 24,
            lineHeight: 24,
          }}
        >
          Para aceitar este convite, você precisa ter uma conta no FastVan.
        </Text>

        <TouchableOpacity
          style={theme.button}
          onPress={() => {
            // Salva o token para usar após login/registro
            router.push({
              pathname: "/(auth)/login",
              params: { inviteToken: token },
            });
          }}
        >
          <Text style={theme.buttonText}>Fazer Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[theme.button, { marginTop: 12, backgroundColor: colors.secondary }]}
          onPress={() => {
            // Salva o token para usar após registro
            router.push({
              pathname: "/(auth)/register",
              params: { inviteToken: token },
            });
          }}
        >
          <Text style={theme.buttonText}>Criar Conta</Text>
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
          <Text
            style={{
              fontSize: 12,
              color: colors.text,
              fontWeight: "600",
              marginBottom: 4,
            }}
          >
            💡 Dica:
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Faça login ou crie uma conta. Após isso, o convite será aceito automaticamente!
          </Text>
        </View>
      </View>
    );
  }

  // Se chegou aqui, aceitou o convite com sucesso
  return (
    <View style={[theme.container, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ marginTop: 16, color: colors.textSecondary }}>
        Aceitando convite...
      </Text>
    </View>
  );
}
