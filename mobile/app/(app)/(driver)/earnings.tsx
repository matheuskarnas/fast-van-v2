import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../constants/theme";
import { apiService } from "../../../services/api";
import { ApiEndpoints } from "../../../constants/api";

interface PaymentSummary {
  pending: { total: number; count: number };
  paid: { total: number; count: number };
}

interface FinancialEntry {
  id: string;
  type: "income" | "expense";
  category: string;
  description?: string;
  amount: number;
  entryDate: string;
}

interface Dashboard {
  month: string;
  payments: PaymentSummary;
  totalMonthlyReceived: number;
  totalExtraIncome: number;
  totalExpenses: number;
  netProfit: number;
  entries: FinancialEntry[];
}

const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Combustível",
  maintenance: "Manutenção",
  toll: "Pedágio",
  extra_trip: "Viagem avulsa",
  other: "Outros",
};

const EXPENSE_CATEGORIES = ["fuel", "maintenance", "toll", "other"];
const INCOME_CATEGORIES = ["extra_trip", "other"];

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  if (mo === 1) return `${y - 1}-12`;
  return `${y}-${String(mo - 1).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  if (mo === 12) return `${y + 1}-01`;
  return `${y}-${String(mo + 1).padStart(2, "0")}`;
}

export default function EarningsScreen() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<"income" | "expense">("expense");
  const [entryCategory, setEntryCategory] = useState("fuel");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get<{ success: boolean } & Dashboard>(
        `${ApiEndpoints.GET_FINANCE_DASHBOARD}?month=${month}`,
      );
      if (res.data.success) setData(res.data as Dashboard);
    } catch { /* silent */ }
    setLoading(false);
  }, [month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddEntry = async () => {
    const amount = parseFloat(entryAmount.replace(",", "."));
    if (!amount || amount <= 0) { Alert.alert("Erro", "Informe um valor válido."); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await apiService.post<{ success: boolean }>(ApiEndpoints.POST_FINANCE_ENTRY, {
        type: entryType,
        category: entryCategory,
        description: entryDescription || undefined,
        amount,
        entryDate: today,
      });
      if ((res.data as any).success) {
        setShowEntryModal(false);
        setEntryDescription("");
        setEntryAmount("");
        await load();
      } else {
        Alert.alert("Erro", (res.data as any).error?.message ?? "Não foi possível salvar.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao salvar lançamento.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.brand.orange} />
        </View>
      </SafeAreaView>
    );
  }

  const categories = entryType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <SafeAreaView style={styles.container}>
      {/* Navegação de mês */}
      <View style={styles.monthNav}>
        <Pressable onPress={() => setMonth(prevMonth(month))} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.brand.orange} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
        <Pressable onPress={() => setMonth(nextMonth(month))} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.brand.orange} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Cards de resumo */}
        <View style={styles.summaryGrid}>
          <SummaryCard icon="cash-outline" label="Mensalidades recebidas" value={formatCurrency(data?.totalMonthlyReceived ?? 0)} color={theme.colors.feedback.success} />
          <SummaryCard icon="add-circle-outline" label="Receitas extras" value={formatCurrency(data?.totalExtraIncome ?? 0)} color={theme.colors.brand.navy} />
          <SummaryCard icon="remove-circle-outline" label="Despesas" value={formatCurrency(data?.totalExpenses ?? 0)} color={theme.colors.feedback.error} />
          <SummaryCard
            icon="trending-up-outline"
            label="Lucro líquido"
            value={formatCurrency(data?.netProfit ?? 0)}
            color={(data?.netProfit ?? 0) >= 0 ? theme.colors.feedback.success : theme.colors.feedback.error}
          />
        </View>

        {/* Mensalidades */}
        {data && (data.payments.pending.count > 0 || data.payments.paid.count > 0) && (
          <>
            <Text style={styles.sectionTitle}>Mensalidades</Text>
            <View style={styles.card}>
              <View style={styles.paymentRow}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.feedback.success} />
                <Text style={styles.paymentLabel}>Pagas</Text>
                <Text style={[styles.paymentValue, { color: theme.colors.feedback.success }]}>
                  {data.payments.paid.count} passageiros · {formatCurrency(data.payments.paid.total)}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Ionicons name="time-outline" size={16} color={theme.colors.feedback.warning} />
                <Text style={styles.paymentLabel}>Pendentes</Text>
                <Text style={[styles.paymentValue, { color: theme.colors.feedback.warning }]}>
                  {data.payments.pending.count} passageiros · {formatCurrency(data.payments.pending.total)}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Lançamentos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lançamentos</Text>
          <Pressable style={styles.addBtn} onPress={() => setShowEntryModal(true)}>
            <Ionicons name="add" size={16} color={theme.colors.text.inverse} />
            <Text style={styles.addBtnText}>Novo</Text>
          </Pressable>
        </View>

        {(!data?.entries || data.entries.length === 0) ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum lançamento em {formatMonth(month)}.</Text>
          </View>
        ) : (
          data.entries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <Ionicons
                name={entry.type === "income" ? "arrow-up-circle" : "arrow-down-circle"}
                size={20}
                color={entry.type === "income" ? theme.colors.feedback.success : theme.colors.feedback.error}
              />
              <View style={styles.entryInfo}>
                <Text style={styles.entryCategory}>{CATEGORY_LABELS[entry.category] ?? entry.category}</Text>
                {entry.description && <Text style={styles.entryDescription}>{entry.description}</Text>}
                <Text style={styles.entryDate}>{entry.entryDate}</Text>
              </View>
              <Text style={[styles.entryAmount, { color: entry.type === "income" ? theme.colors.feedback.success : theme.colors.feedback.error }]}>
                {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal novo lançamento */}
      <Modal visible={showEntryModal} animationType="slide" transparent onRequestClose={() => setShowEntryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Novo lançamento</Text>

            <View style={styles.typeToggle}>
              {(["expense", "income"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeBtn, entryType === t && { backgroundColor: t === "income" ? theme.colors.feedback.success : theme.colors.feedback.error }]}
                  onPress={() => { setEntryType(t); setEntryCategory(t === "expense" ? "fuel" : "extra_trip"); }}
                >
                  <Text style={[styles.typeBtnText, entryType === t && { color: "#fff" }]}>
                    {t === "expense" ? "Despesa" : "Receita"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Categoria</Text>
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categoryChip, entryCategory === cat && styles.categoryChipSelected]}
                  onPress={() => setEntryCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, entryCategory === cat && styles.categoryChipTextSelected]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>Descrição (opcional)</Text>
            <TextInput
              style={styles.input}
              value={entryDescription}
              onChangeText={setEntryDescription}
              placeholder="Ex: Abastecimento posto X"
              placeholderTextColor={theme.colors.text.muted}
            />

            <Text style={styles.inputLabel}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              value={entryAmount}
              onChangeText={setEntryAmount}
              placeholder="0,00"
              placeholderTextColor={theme.colors.text.muted}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowEntryModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAddEntry} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.screen },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: theme.spacing.md, gap: theme.spacing.xl, borderBottomWidth: 1, borderBottomColor: theme.colors.border.soft },
  monthBtn: { padding: theme.spacing.sm },
  monthLabel: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary, minWidth: 120, textAlign: "center" },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  summaryCard: { flex: 1, minWidth: "45%", backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: 4, borderWidth: 1, borderColor: theme.colors.border.soft, alignItems: "flex-start" },
  summaryValue: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  summaryLabel: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  sectionTitle: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.brand.orange, paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.pill },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: theme.font.sm },
  card: { backgroundColor: theme.colors.background.card, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  paymentLabel: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.secondary },
  paymentValue: { fontSize: theme.font.sm, fontWeight: "700" },
  emptyBox: { padding: theme.spacing.xl, alignItems: "center" },
  emptyText: { color: theme.colors.text.muted, fontSize: theme.font.sm },
  entryCard: { flexDirection: "row", alignItems: "center", gap: theme.spacing.md, backgroundColor: theme.colors.background.card, borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border.soft },
  entryInfo: { flex: 1 },
  entryCategory: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.primary },
  entryDescription: { fontSize: theme.font.xs, color: theme.colors.text.secondary },
  entryDate: { fontSize: theme.font.xs, color: theme.colors.text.muted },
  entryAmount: { fontSize: theme.font.md, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: theme.colors.background.card, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.xl, gap: theme.spacing.md },
  modalTitle: { fontSize: theme.font.lg, fontWeight: "800", color: theme.colors.text.primary },
  typeToggle: { flexDirection: "row", gap: theme.spacing.md },
  typeBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, alignItems: "center", backgroundColor: theme.colors.background.muted, borderWidth: 1, borderColor: theme.colors.border.default },
  typeBtnText: { fontWeight: "700", color: theme.colors.text.secondary },
  inputLabel: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary },
  input: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.screen },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  categoryChip: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.radius.pill, borderWidth: 1.5, borderColor: theme.colors.border.default, backgroundColor: theme.colors.background.screen },
  categoryChipSelected: { borderColor: theme.colors.brand.orange, backgroundColor: theme.colors.brand.orange + "15" },
  categoryChipText: { fontSize: theme.font.sm, color: theme.colors.text.secondary },
  categoryChipTextSelected: { color: theme.colors.brand.orange, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", borderWidth: 1.5, borderColor: theme.colors.border.default },
  cancelBtnText: { fontWeight: "700", color: theme.colors.text.secondary },
  saveBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.pill, alignItems: "center", backgroundColor: theme.colors.brand.orange },
  saveBtnText: { fontWeight: "700", color: "#fff" },
});
