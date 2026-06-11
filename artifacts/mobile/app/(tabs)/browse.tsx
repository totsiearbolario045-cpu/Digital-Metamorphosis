import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getListServicesQueryKey,
  useListServices,
} from "@workspace/api-client-react";

import { ServiceCard } from "@/components/ServiceCard";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = ["All", "Business Services", "Cloud Services", "AI Agents", "Environments"];
const STATUSES = ["All", "active", "maintenance", "deprecated"];

export default function BrowseScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ category?: string }>();

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState(params.category ?? "All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const queryParams = {
    ...(search ? { search } : {}),
    ...(selectedCat !== "All" ? { category: selectedCat } : {}),
    ...(selectedStatus !== "All" ? { status: selectedStatus } : {}),
  };

  const { data: services, isLoading, refetch } = useListServices(queryParams, {
    query: { queryKey: getListServicesQueryKey(queryParams) },
  });

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            testID="input-search"
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search services..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        renderItem={({ item }) => {
          const active = item === selectedCat;
          return (
            <TouchableOpacity
              testID={`filter-cat-${item}`}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.muted,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: 20,
                },
              ]}
              onPress={() => setSelectedCat(item)}
            >
              <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        horizontal
        data={STATUSES}
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        renderItem={({ item }) => {
          const active = item === selectedStatus;
          return (
            <TouchableOpacity
              testID={`filter-status-${item}`}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.secondary : colors.muted,
                  borderColor: active ? colors.border : colors.border,
                  borderRadius: 20,
                },
              ]}
              onPress={() => setSelectedStatus(item)}
            >
              <Text style={[styles.chipText, { color: active ? colors.foreground : colors.mutedForeground }]}>
                {item === "All" ? "All statuses" : item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={services ?? []}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <ServiceCard service={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(services && services.length > 0)}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={
            <Text style={[styles.resultsLabel, { color: colors.mutedForeground }]}>
              {services?.length ?? 0} RESULTS
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No services found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filtersRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "500" as const },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  resultsLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: "600" as const, marginBottom: 10 },
  empty: { alignItems: "center", gap: 10, paddingTop: 40 },
  emptyText: { fontSize: 14 },
});
