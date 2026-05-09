import React, { useState } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Text,
  StyleProp,
  ViewStyle,
} from "react-native";
import { createLineInvite } from "@/services/operations";
import { colors, theme } from "@/constants/theme";

interface InviteButtonProps {
  /** ID da linha para gerar o convite */
  lineId: string;

  /** Rótulo do botão (padrão: "Gerar Convite") */
  label?: string;

  /** Estilo customizado do botão */
  style?: StyleProp<ViewStyle>;

  /** Callback quando convite é gerado com sucesso */
  onSuccess?: (token: string, url: string) => void;

  /** Callback quando ocorre erro */
  onError?: (error: string) => void;

  /** Se deve usar o Share automaticamente ou mostrar modal com opções */
  autoShare?: boolean;
}

/**
 * Componente reutilizável para gerar e compartilhar convite de linha
 *
 * Uso:
 * ```tsx
 * <InviteButton
 *   lineId="line-123"
 *   label="Convidar Passageiro"
 *   onSuccess={(token, url) => console.log('Convite gerado!')}
 * />
 * ```
 *
 * Quando clicado, o botão:
 * 1. Gera um token de convite no backend
 * 2. Mostra um modal com opções para compartilhar ou copiar
 * 3. Permite que o motorista envie o link para o passageiro via Share API
 */
export default function InviteButton({
  lineId,
  label = "Gerar Convite",
  style,
  onSuccess,
  onError,
  autoShare = false,
}: InviteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerateInvite = async () => {
    try {
      setLoading(true);
      const response = await createLineInvite(lineId);

      if (!response.success) {
        const errorMsg = response.error?.message || "Não foi possível gerar o convite.";
        Alert.alert("Erro", errorMsg);
        onError?.(errorMsg);
        return;
      }

      const inviteUrl = response.data?.url || "";
      const token = response.data?.token || "";

      onSuccess?.(token, inviteUrl);

      if (autoShare) {
        shareInvite(inviteUrl, token);
      } else {
        showInviteOptions(inviteUrl, token);
      }
    } catch (_error) {
      const errorMsg = "Erro ao gerar convite. Tente novamente.";
      Alert.alert("Erro", errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const showInviteOptions = (url: string, token: string) => {
    Alert.alert("Convite Gerado!", `Token: ${token.substring(0, 8)}...`, [
      {
        text: "Copiar Link",
        onPress: () => {
          Alert.alert(
            "Link do Convite",
            url,
            [
              {
                text: "Fechar",
                style: "cancel",
              },
            ],
            { cancelable: false }
          );
        },
      },
      {
        text: "Compartilhar",
        onPress: () => shareInvite(url, token),
      },
      {
        text: "Copiar Token",
        onPress: () => {
          Alert.alert(
            "Token do Convite",
            token,
            [
              {
                text: "Fechar",
                style: "cancel",
              },
            ],
            { cancelable: false }
          );
        },
      },
      {
        text: "Fechar",
        style: "cancel",
      },
    ]);
  };

  const shareInvite = async (url: string, token: string) => {
    try {
      const message = `Opa! Entra na minha linha no FastVan!\n\nLink: ${url}\n\nOu usa o token: ${token}\n\nBaixe o app e clique no link acima ou use o token na aba "Entrar em uma Linha"!`;

      await Share.share({
        message,
        title: "Convite para entrar na linha",
      });
    } catch (_error) {
      // User cancelled share
    }
  };

  return (
    <TouchableOpacity
      style={[
        style || theme.button,
        { opacity: loading ? 0.6 : 1 },
      ]}
      onPress={handleGenerateInvite}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.buttonText} />
      ) : (
        <Text style={theme.buttonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
