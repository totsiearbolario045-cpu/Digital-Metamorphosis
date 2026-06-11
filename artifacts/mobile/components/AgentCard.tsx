import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";

interface Agent {
  id: string;
  name: string;
  model?: string;
  status: string;
  role?: string;
}

interface AgentEnvironment {
  id: string;
  name: string;
  type: string;
  status: string;
  agentCount: number;
  activeAgents: number;
  description?: string;
  agents?: Agent[];
}

const ENV_ACCENT: Record<string, string> = {
  production: "#00C896",
  research: "#3A9FD5",
  devops: "#F5A623",
  staging: "#8A92A5",
};

interface AgentCardProps {
  env: AgentEnvironment;
}

export function AgentCard({ env }: AgentCardProps) {
  const colors = useColors();
  const accent = ENV_ACCENT[env.type] ?? "#8A92A5";
  const ratio = env.agentCount > 0 ? env.activeAgents / env.agentCount : 0;

  return (
    <View
      testID={`agent-env-${env.id}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, borderLeftColor: accent }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeBadge, { backgroundColor: accent + "22" }]}>
            <Text style={[styles.typeText, { color: accent }]}>{env.type?.toUpperCase()}</Text>
          </View>
          <StatusBadge status={env.status} />
        </View>
        <Feather name="cpu" size={16} color={accent} />
      </View>

      <Text style={[styles.name, { color: colors.foreground }]}>{env.name}</Text>

      {env.description && (
        <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
          {env.description}
        </Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: accent }]}>{env.activeAgents}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>active</Text>
        </View>
        <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{env.agentCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>total</Text>
        </View>
        <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{Math.round(ratio * 100)}%</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>capacity</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressBar, { backgroundColor: accent, width: `${ratio * 100}%` as any }]} />
      </View>

      {env.agents && env.agents.length > 0 && (
        <View style={styles.agentList}>
          {env.agents.slice(0, 3).map((agent) => (
            <View key={agent.id} style={[styles.agentRow, { borderColor: colors.border }]}>
              <View style={[styles.agentDot, { backgroundColor: agent.status === "active" ? "#00C896" : "#8A92A5" }]} />
              <Text style={[styles.agentName, { color: colors.foreground }]} numberOfLines={1}>{agent.name}</Text>
              {agent.role && (
                <Text style={[styles.agentRole, { color: colors.mutedForeground }]} numberOfLines={1}>{agent.role}</Text>
              )}
            </View>
          ))}
          {env.agents.length > 3 && (
            <Text style={[styles.moreAgents, { color: colors.mutedForeground }]}>
              +{env.agents.length - 3} more agents
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 12,
    gap: 10,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  typeText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.8 },
  name: { fontSize: 16, fontWeight: "700" as const },
  description: { fontSize: 13, lineHeight: 18 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 20, fontWeight: "700" as const },
  statLabel: { fontSize: 10, letterSpacing: 0.5, marginTop: 1 },
  dividerV: { width: 1, height: 28 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressBar: { height: 3, borderRadius: 2 },
  agentList: { gap: 4 },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, borderBottomWidth: 1 },
  agentDot: { width: 6, height: 6, borderRadius: 3 },
  agentName: { fontSize: 12, fontWeight: "500" as const, flex: 1 },
  agentRole: { fontSize: 11 },
  moreAgents: { fontSize: 11, paddingTop: 2 },
});
