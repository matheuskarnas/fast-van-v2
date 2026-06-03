import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { apiService } from "../../../../services/api";
import { ApiEndpoints } from "../../../../constants/api";
import { theme } from "../../../../constants/theme";
import { getDriverLines, type Line } from "../../../../services/driverLines";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
  userId: string;
}

export default function VehiclesListScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getVehicleDeleteErrorMessage = (errorCode?: string) => {
    const messages: Record<string, string> = {
      VEHICLE_HAS_ACTIVE_ROUTE:
        "Não foi possível excluir este veículo porque ele está vinculado a uma linha ativa. Remova ou encerre a linha antes de tentar novamente.",
      FORBIDDEN_RESOURCE: "Você não tem permissão para excluir este veículo.",
      VEHICLE_NOT_FOUND:
        "Este veículo não foi encontrado. Atualize a lista e tente novamente.",
      NETWORK_ERROR:
        "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
      INTERNAL_ERROR:
        "Ocorreu um erro interno ao excluir o veículo. Tente novamente em instantes.",
    };

    return (
      messages[errorCode || ""] ||
      "Não foi possível excluir o veículo no momento. Tente novamente."
    );
  };

  const loadVehicles = useCallback(async () => {
    try {
      const [vehicleRes, linesRes] = await Promise.all([
        apiService.get<{ success: boolean; vehicles: Vehicle[] }>(ApiEndpoints.GET_VEHICLES),
        getDriverLines(),
      ]);
      if (vehicleRes.data?.success) setVehicles(vehicleRes.data.vehicles || []);
      if (linesRes.success) setLines(linesRes.lines ?? []);
    } catch {
      Alert.alert("Falha ao carregar veículos", "Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [loadVehicles]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    loadVehicles();
  };

  const handleAddVehicle = () => {
    router.push("/vehicles/create");
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    Alert.alert(
      "Excluir veículo?",
      "Esta ação não pode ser desfeita. Se o veículo estiver vinculado a uma linha ativa, a exclusão será bloqueada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiService.delete(
                ApiEndpoints.UPDATE_VEHICLE.replace(":id", vehicleId),
              );

              if ((response.data as any)?.success) {
                Alert.alert(
                  "Veículo excluído",
                  "O veículo foi removido com sucesso da sua conta.",
                );
                loadVehicles();
                return;
              }

              const errorCode = (response.data as any)?.error?.code;
              Alert.alert(
                "Não foi possível excluir",
                getVehicleDeleteErrorMessage(errorCode),
              );
            } catch {
              Alert.alert(
                "Não foi possível excluir",
                getVehicleDeleteErrorMessage("NETWORK_ERROR"),
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minha Frota</Text>
        <Text style={styles.fleetSummary}>
          {vehicles.length} van{vehicles.length !== 1 ? "s" : ""} · {lines.length} linha{lines.length !== 1 ? "s" : ""} ativa{lines.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="car-outline"
            size={64}
            color={theme.colors.text.muted}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Nenhum veículo cadastrado</Text>
          <Text style={styles.emptyText}>
            Clique no botão acima para adicionar seu primeiro veículo
          </Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item: Vehicle) => item.id}
          renderItem={({ item }: { item: Vehicle }) => {
            const associatedLines = lines.filter((l) => l.vehicleId === item.id);
            return (
              <View style={styles.vehicleCard}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehiclePlate}>{item.plate}</Text>
                  <Text style={styles.vehicleDetails}>
                    {item.brand} {item.model} • {item.year}
                  </Text>
                  <Text style={styles.vehicleCapacity}>
                    Capacidade: {item.capacity} lugares
                  </Text>
                  {associatedLines.length > 0 ? (
                    associatedLines.map((l) => (
                      <View key={l.id} style={styles.lineBadge}>
                        <Ionicons name="map-outline" size={12} color={theme.colors.brand.orange} />
                        <Text style={styles.lineBadgeText} numberOfLines={1}>{l.name || l.originCity}</Text>
                        <Text style={styles.linePax}>{l.passengerCount ?? 0} passageiros</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noLine}>Sem linha associada</Text>
                  )}
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteVehicle(item.id)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.colors.feedback.error}
                  />
                </Pressable>
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable style={styles.floatingButton} onPress={handleAddVehicle}>
        <Ionicons name="add" size={28} color={theme.colors.text.inverse} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.screen,
  },
  header: {
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.soft,
  },
  title: {
    fontSize: theme.font.xl,
    fontWeight: "800",
    color: theme.colors.text.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIcon: {
    marginBottom: theme.spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: theme.font.lg,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.font.md,
    color: theme.colors.text.secondary,
    textAlign: "center",
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  vehicleCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.soft,
    ...theme.shadow.card,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: theme.font.lg,
    fontWeight: "800",
    color: theme.colors.text.brand,
    marginBottom: theme.spacing.xs,
  },
  vehicleDetails: {
    fontSize: theme.font.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  vehicleCapacity: {
    fontSize: theme.font.sm,
    color: theme.colors.text.secondary,
  },
  fleetSummary: {
    fontSize: theme.font.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  lineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.xs,
    backgroundColor: theme.colors.brand.orange + "10",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    alignSelf: "flex-start",
  },
  lineBadgeText: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    color: theme.colors.brand.orange,
    maxWidth: 150,
  },
  linePax: {
    fontSize: theme.font.xs,
    color: theme.colors.brand.orange,
    opacity: 0.7,
  },
  noLine: {
    fontSize: theme.font.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
  deleteButton: {
    padding: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  floatingButton: {
    position: "absolute",
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    backgroundColor: theme.colors.brand.orange,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadow.card,
  },
});
