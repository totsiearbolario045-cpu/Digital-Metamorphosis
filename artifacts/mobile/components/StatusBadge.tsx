import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type StatusType = "active" | "inactive" | "maintenance" | "deprecated";

const STATUS_COLORS: Record<StatusType, { bg: string; text: string; dot: string }> = {
  active: { bg: "#0D2E1F", text: "#00C896", dot: "#00C896" },
  maintenance: { bg: "#2E2100", text: "#F5A623", dot: "#F5A623" },
  deprecated: { bg: "#2E0D0D", text: "#F44343", dot: "#F44343" },
  inactive: { bg: "#1A1F2E", text: "#8A92A5", dot: "#8A92A5" },
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const normalized = (status?.toLowerCase() ?? "inactive") as StatusType;
  const style = STATUS_COLORS[normalized] ?? STATUS_COLORS.inactive;
  const isSmall = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }, isSmall ? styles.small : styles.medium]}>
      <View style={[styles.dot, { backgroundColor: style.dot }]} />
      <Text style={[styles.text, { color: style.text }, isSmall ? styles.textSm : styles.textMd]}>
        {status?.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  small: { paddingHorizontal: 8, paddingVertical: 3 },
  medium: { paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontWeight: "600" as const, letterSpacing: 0.5 },
  textSm: { fontSize: 10 },
  textMd: { fontSize: 11 },
});
