import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useNavigation } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { listOperationsLines, createLineInvite } from "@/services/operations";
import { colors, theme } from "@/constants/theme";

export default function ShareInviteScreen() {
  const { auth } = useAuth();
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingInvite, setGeneratingInvite] = useState<string | null>(null);

  React.useEffect(() => {
    loadLines();
  }, []);

  const loadLines = async () => {
    try {
      setLoading(true);
      const response = await listOperationsLines();

      if (response.success && response.lines) {
        setLines(response.lines);
      } else {
        Alert.alert("Erro", response.error?.message || "Não foi possível carregar suas linhas.");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro ao carregar linhas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async (lineId: string) => {
    try {
      setGeneratingInvite(lineId);
      const response = await createLineInvite(lineId);

      if (!response.success) {
        Alert.alert("Erro", response.error?.message || "Não foi possível gerar o convite.");
        return;
      }

      const inviteUrl = response.data?.url || "";
      const token = response.data?.token || "";

      Alert.alert("Convite Gerado!", `Token: ${token.substring(0, 8)}...`, [
        {
          text: "Copiar Link",
          onPress: () => {
            Clipboard.setStringAsync(inviteUrl);
            Alert.alert("Sucesso", "Link copiado para a área de transferência!");
          },
        },
        {
          text: "Copiar Token",
          onPress: () => {
            Clipboard.setStringAsync(token);
            Alert.alert("Sucesso", "Token copiado para a área de transferência!");
          },
        },
        {
          text: "Compartilhar",
          onPress: () => shareInvite(inviteUrl, token),
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ]);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível gerar o convite. Tente novamente.");
    } finally {
      setGeneratingInvite(null);
    }
  };

  const shareInvite = async (url: string, token: string) => {
    try {
      const message = `Opa! Entrar na minha linha no FastVan!\n\nLink: ${url}\n\nOu copie o token: ${token}\n\nBaixe o app e use seu código de passageiro!`;

      await Share.share({
        message,
        title: "Convite para entrar na linha",
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível compartilhar o convite.");
    }
  };

  if (loading) {
    return (
      <View style={[theme.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (lines.length === 0) {
    return (
      <View style={[theme.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 16 }}>
          Você não tem linhas cadastradas.
        </Text>
        <TouchableOpacity
          style={[theme.button, { marginTop: 16 }]}
          onPress={() => router.push("/vehicles")}
        >
          <Text style={theme.buttonText}>Criar Linha</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={theme.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16, color: colors.text }}>
        Compartilhar Convite para Linha
      </Text>

      {lines.map((line) => (
        <View
          key={line.lineId}
          style={{
            backgroundColor: colors.background,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
              Linha: {line.lineId}
            </Text>
            {line.nextDate && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                Próxima: {new Date(line.nextDate).toLocaleDateString("pt-BR")}
              </Text>
            )}
            {line.capacity && (
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Capacidade: {line.capacity} passageiros
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[theme.button, { opacity: generatingInvite === line.lineId ? 0.6 : 1 }]}
            onPress={() => handleGenerateInvite(line.lineId)}
            disabled={generatingInvite === line.lineId}
          >
            {generatingInvite === line.lineId ? (
              <ActivityIndicator size="small" color={colors.buttonText} />
            ) : (
              <Text style={theme.buttonText}>Gerar e Compartilhar Convite</Text>
            )}
          </TouchableOpacity>
        </View>
      ))}

      <View
        style={{
          backgroundColor: colors.info + "20",
          borderRadius: 8,
          padding: 12,
          marginTop: 24,
          borderLeftWidth: 4,
          borderLeftColor: colors.info,
        }}
      >
        <Text style={{ fontSize: 12, color: colors.text, fontWeight: "600", marginBottom: 4 }}>
          💡 Como funciona:
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          1. Clique em "Gerar Convite"{"\n"}
          2. Copie o link ou token{"\n"}
          3. Compartilhe com o passageiro{"\n"}
          4. Passageiro clica no link ou insere o token no app{"\n"}
          5. Pronto! Passageiro entra na sua linha
        </Text>
      </View>
    </ScrollView>
  );
}
