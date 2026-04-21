import { useState, useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../../constants/theme";

interface DatePickerInputProps {
  label?: string;
  placeholder?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DatePickerInput({
  label,
  placeholder = "Selecione a data",
  value,
  onChange,
  minimumDate,
  maximumDate,
}: DatePickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(value);

  // Sincroniza tempDate quando value é atualizado externamente
  useEffect(() => {
    setTempDate(value);
  }, [value]);

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    // Algumas plataformas não expõem event.type de forma consistente.
    // Sempre que houver selectedDate, propaga para o formulário pai.
    if (selectedDate) {
      setTempDate(selectedDate);
      onChange(selectedDate);
    }

    // No Android o picker é modal; fecha após interação.
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return placeholder;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {formatDate(value)}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={tempDate || new Date()}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.font.sm,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border.input,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.input,
  },
  inputText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  placeholder: {
    color: theme.colors.text.muted,
  },
  icon: {
    fontSize: 20,
  },
});
