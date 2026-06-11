import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getListAgentEnvironmentsQueryKey,
  useListAgentEnvironments,
} from "@workspace/api-client-react";

import { AgentCard } from "@/components/AgentCard";
import { useColors } from "@/hooks/useColors";

export default function AgentsScreen() {
  const colors = useColors();
  const { data: envs, isLoading, refetch } = useListAgentEnvironments({
    query: { queryKey: getListAgentEnvironmentsQueryKey() },
  });

  const topPad = Platform.OS === "web" ? 67 : 0;

  const totalAgents = (envs ?? []).reduce((sum, e) => sum + e.agentCount, 0);
  const activeAgents = (envs ?? []).reduce((sum, e) => sum + e.activeAgents, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerLabel, { color: colors.primary }]}>AI ENVIRONMENTS</Text>
        {!isLoading && envs && (
          <View style={styles.headerStats}>
            <Text style={[styles.headerStat, { color: colors.foreground }]}>
              <Text style={{ color: colors.primary }}>{activeAgents}</Text>
              <Text style={{ color: colors.mutedForeground }}>/{totalAgents} agents active</Text>
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={envs ?? []}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <AgentCard env={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(envs && envs.length > 0)}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No environments found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 4 },
  headerLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "700" as const },
  headerStats: {},
  headerStat: { fontSize: 14, fontWeight: "600" as const },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 14 },
});
