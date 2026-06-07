import { useCallback, useEffect, useState } from "react";
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
import { DatePickerInput } from "../../../components/common/DatePickerInput";
import { getDriverLines, type Line } from "../../../services/driverLines";

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

interface PassengerPayment {
  passengerId: string;
  passengerName?: string;
  amount: number | null;
  month: string;
  status: "paid" | "pending";
  displayStatus?: "paid" | "pending" | "overdue";
  dueDay?: number | null;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
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

function formatDate(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function dateToISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseISODate(value?: string | null) {
  if (!value) return new Date();
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function formatCurrencyInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const value = Number(digits) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseCurrencyInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
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
  const [entryDate, setEntryDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [payments, setPayments] = useState<PassengerPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PassengerPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("pending");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

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

  const loadLines = useCallback(async () => {
    const result = await getDriverLines();
    if (result.success) {
      const nextLines = result.lines ?? [];
      setLines(nextLines);
      setSelectedLineId((current) => current || nextLines[0]?.id || "");
    }
  }, []);

  const loadPayments = useCallback(async () => {
    if (!selectedLineId) {
      setPayments([]);
      return;
    }
    setLoadingPayments(true);
    try {
      const url = ApiEndpoints.GET_LINE_PAYMENTS.replace(":lineId", selectedLineId);
      const response = await apiService.get<{ success: boolean; payments?: PassengerPayment[] }>(
        `${url}?month=${month}`,
      );
      if (response.data.success) setPayments(response.data.payments ?? []);
    } catch {
      setPayments([]);
    }
    setLoadingPayments(false);
  }, [month, selectedLineId]);

  useFocusEffect(useCallback(() => { loadLines(); }, [loadLines]));
  useEffect(() => { loadPayments(); }, [loadPayments]);

  const handleAddEntry = async () => {
    const amount = parseCurrencyInput(entryAmount);
    if (!amount || amount <= 0) { Alert.alert("Erro", "Informe um valor válido."); return; }
    setSaving(true);
    try {
      const res = await apiService.post<{ success: boolean }>(ApiEndpoints.POST_FINANCE_ENTRY, {
        type: entryType,
        category: entryCategory,
        description: entryDescription || undefined,
        amount,
        entryDate: dateToISO(entryDate),
      });
      if ((res.data as any).success) {
        setShowEntryModal(false);
        setEntryDescription("");
        setEntryAmount("");
        setEntryDate(new Date());
        await load();
      } else {
        Alert.alert("Erro", (res.data as any).error?.message ?? "Não foi possível salvar.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao salvar lançamento.");
    }
    setSaving(false);
  };

  const openPaymentModal = (payment: PassengerPayment) => {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount ? formatCurrencyInput(String(Math.round(payment.amount * 100))) : "");
    setPaymentDueDay(payment.dueDay ? String(payment.dueDay) : "");
    setPaymentStatus(payment.status);
    setPaymentDate(parseISODate(payment.paidAt));
    setPaymentNotes(payment.notes ?? "");
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedLineId || !editingPayment) return;
    const amount = parseCurrencyInput(paymentAmount);
    const dueDay = Number(paymentDueDay);
    if (!amount || amount <= 0) {
      Alert.alert("Erro", "Informe um valor válido para a mensalidade.");
      return;
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      Alert.alert("Erro", "Informe um dia de vencimento entre 1 e 31.");
      return;
    }
    setSavingPayment(true);
    try {
      const url = ApiEndpoints.UPSERT_PAYMENT
        .replace(":lineId", selectedLineId)
        .replace(":passengerId", editingPayment.passengerId);
      const response = await apiService.put<{ success: boolean; error?: { message?: string } }>(url, {
        amount,
        month,
        status: paymentStatus,
        dueDay,
        paidAt: paymentStatus === "paid" ? dateToISO(paymentDate) : undefined,
        notes: paymentNotes || undefined,
      });
      if (response.data.success) {
        setShowPaymentModal(false);
        setEditingPayment(null);
        await Promise.all([loadPayments(), load()]);
      } else {
        Alert.alert("Erro", response.data.error?.message ?? "Não foi possível salvar a mensalidade.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.response?.data?.error?.message ?? "Falha ao salvar mensalidade.");
    }
    setSavingPayment(false);
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
        <Text style={styles.sectionTitle}>Gerenciar mensalidades</Text>
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.feedback.success} />
            <Text style={styles.paymentLabel}>Pagas</Text>
            <Text style={[styles.paymentValue, { color: theme.colors.feedback.success }]}>
              {data?.payments.paid.count ?? 0} passageiros · {formatCurrency(data?.payments.paid.total ?? 0)}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.feedback.warning} />
            <Text style={styles.paymentLabel}>Pendentes</Text>
            <Text style={[styles.paymentValue, { color: theme.colors.feedback.warning }]}>
              {data?.payments.pending.count ?? 0} passageiros · {formatCurrency(data?.payments.pending.total ?? 0)}
            </Text>
          </View>

          {lines.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineSelector}>
                {lines.map((line) => (
                  <Pressable
                    key={line.id}
                    style={[styles.lineChip, selectedLineId === line.id && styles.lineChipSelected]}
                    onPress={() => setSelectedLineId(line.id)}
                  >
                    <Text style={[styles.lineChipText, selectedLineId === line.id && styles.lineChipTextSelected]} numberOfLines={1}>
                      {line.name || `${line.originCity} → ${line.destinationPlace}`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {loadingPayments ? (
                <View style={styles.paymentsLoading}>
                  <ActivityIndicator size="small" color={theme.colors.brand.orange} />
                </View>
              ) : payments.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum passageiro matriculado nesta linha.</Text>
              ) : (
                payments.map((payment) => (
                  <Pressable key={payment.passengerId} style={styles.passengerPaymentRow} onPress={() => openPaymentModal(payment)}>
                    <View style={styles.passengerPaymentInfo}>
                      <Text style={styles.passengerName}>{payment.passengerName || payment.passengerId}</Text>
                      <Text style={styles.passengerPaymentMeta}>
                        {payment.amount ? formatCurrency(payment.amount) : "Valor não definido"}
                        {payment.dueDay ? ` · vence dia ${payment.dueDay}` : ""}
                        {payment.status === "paid" && payment.paidAt ? ` · Pago em ${formatDate(payment.paidAt)}` : ""}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      payment.displayStatus === "overdue"
                        ? styles.statusBadgeOverdue
                        : payment.status === "paid"
                          ? styles.statusBadgePaid
                          : styles.statusBadgePending,
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        payment.displayStatus === "overdue"
                          ? styles.statusBadgeOverdueText
                          : payment.status === "paid"
                            ? styles.statusBadgePaidText
                            : styles.statusBadgePendingText,
                      ]}>
                        {payment.displayStatus === "overdue" ? "Em atraso" : payment.status === "paid" ? "Pago" : "Pendente"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
                  </Pressable>
                ))
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>Crie uma linha e adicione passageiros para gerenciar mensalidades.</Text>
          )}
        </View>

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

            <DatePickerInput
              label="Data do lançamento"
              value={entryDate}
              onChange={setEntryDate}
            />

            <Text style={styles.inputLabel}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              value={entryAmount}
              onChangeText={(value) => setEntryAmount(formatCurrencyInput(value))}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.text.muted}
              keyboardType="number-pad"
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

      {/* Modal mensalidade */}
      <Modal visible={showPaymentModal} animationType="slide" transparent onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mensalidade</Text>
            <Text style={styles.modalSubtitle}>{editingPayment?.passengerName || editingPayment?.passengerId}</Text>

            <Text style={styles.inputLabel}>Valor</Text>
            <TextInput
              style={styles.input}
              value={paymentAmount}
              onChangeText={(value) => setPaymentAmount(formatCurrencyInput(value))}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.text.muted}
              keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Vencimento mensal</Text>
            <View style={styles.dueDayRow}>
              <Text style={styles.dueDayPrefix}>Dia</Text>
              <TextInput
                style={[styles.input, styles.dueDayInput]}
                value={paymentDueDay}
                onChangeText={(value) => setPaymentDueDay(value.replace(/\D/g, "").slice(0, 2))}
                placeholder="10"
                placeholderTextColor={theme.colors.text.muted}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.dueDayHint}>de todo mês</Text>
            </View>

            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.typeToggle}>
              {(["pending", "paid"] as const).map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.typeBtn,
                    paymentStatus === status && {
                      backgroundColor: status === "paid" ? theme.colors.feedback.success : theme.colors.feedback.warning,
                    },
                  ]}
                  onPress={() => setPaymentStatus(status)}
                >
                  <Text style={[styles.typeBtnText, paymentStatus === status && { color: "#fff" }]}>
                    {status === "paid" ? "Pago" : "Pendente"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {paymentStatus === "paid" && (
              <DatePickerInput
                label="Data do pagamento"
                value={paymentDate}
                onChange={setPaymentDate}
              />
            )}

            <Text style={styles.inputLabel}>Observações (opcional)</Text>
            <TextInput
              style={styles.input}
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              placeholder="Ex: Pix recebido, desconto combinado..."
              placeholderTextColor={theme.colors.text.muted}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, savingPayment && { opacity: 0.6 }]} onPress={handleSavePayment} disabled={savingPayment}>
                {savingPayment ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
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
  lineSelector: { gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  lineChip: {
    maxWidth: 220,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.screen,
  },
  lineChipSelected: {
    borderColor: theme.colors.brand.orange,
    backgroundColor: theme.colors.brand.orange + "15",
  },
  lineChipText: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary },
  lineChipTextSelected: { color: theme.colors.brand.orange },
  paymentsLoading: { paddingVertical: theme.spacing.md, alignItems: "center" },
  passengerPaymentRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.soft,
  },
  passengerPaymentInfo: { flex: 1 },
  passengerName: { fontSize: theme.font.sm, fontWeight: "800", color: theme.colors.text.primary },
  passengerPaymentMeta: { fontSize: theme.font.xs, color: theme.colors.text.secondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  statusBadgePaid: {
    backgroundColor: theme.colors.feedback.success + "15",
    borderColor: theme.colors.feedback.success + "50",
  },
  statusBadgePending: {
    backgroundColor: theme.colors.feedback.warning + "15",
    borderColor: theme.colors.feedback.warning + "50",
  },
  statusBadgeOverdue: {
    backgroundColor: theme.colors.feedback.error + "15",
    borderColor: theme.colors.feedback.error + "50",
  },
  statusBadgeText: { fontSize: theme.font.xs, fontWeight: "800" },
  statusBadgePaidText: { color: theme.colors.feedback.success },
  statusBadgePendingText: { color: theme.colors.feedback.warning },
  statusBadgeOverdueText: { color: theme.colors.feedback.error },
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
  modalSubtitle: { fontSize: theme.font.sm, color: theme.colors.text.secondary, marginTop: -theme.spacing.sm },
  typeToggle: { flexDirection: "row", gap: theme.spacing.md },
  typeBtn: { flex: 1, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, alignItems: "center", backgroundColor: theme.colors.background.muted, borderWidth: 1, borderColor: theme.colors.border.default },
  typeBtnText: { fontWeight: "700", color: theme.colors.text.secondary },
  inputLabel: { fontSize: theme.font.sm, fontWeight: "700", color: theme.colors.text.secondary },
  input: { borderWidth: 1.5, borderColor: theme.colors.border.default, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.md, color: theme.colors.text.primary, backgroundColor: theme.colors.background.screen },
  dueDayRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  dueDayPrefix: { fontSize: theme.font.md, color: theme.colors.text.secondary, fontWeight: "700" },
  dueDayInput: { width: 78, textAlign: "center", fontWeight: "800" },
  dueDayHint: { flex: 1, fontSize: theme.font.sm, color: theme.colors.text.secondary },
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
