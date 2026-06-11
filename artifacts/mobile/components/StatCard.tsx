import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: keyof typeof Feather.glyphMap;
  accent?: string;
}

export function StatCard({ label, value, icon, accent }: StatCardProps) {
  const colors = useColors();
  const color = accent ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
    minWidth: 80,
  },
  iconWrap: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 22, fontWeight: "700" as const },
  label: { fontSize: 10, letterSpacing: 0.4, textAlign: "center" },
});
