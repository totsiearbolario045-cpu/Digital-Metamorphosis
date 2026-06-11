import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getGetCatalogStatsQueryKey,
  getGetFeaturedServicesQueryKey,
  getListCategoriesQueryKey,
  useGetCatalogStats,
  useGetFeaturedServices,
  useListCategories,
} from "@workspace/api-client-react";

import { ServiceCard } from "@/components/ServiceCard";
import { StatCard } from "@/components/StatCard";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  "business-services": "briefcase",
  "cloud-services": "cloud",
  "ai-agents": "cpu",
  environments: "layers",
};

const CATEGORY_ACCENTS: Record<string, string> = {
  "business-services": "#3A9FD5",
  "cloud-services": "#00C896",
  "ai-agents": "#A855F7",
  environments: "#F5A623",
};

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetCatalogStats({
    query: { queryKey: getGetCatalogStatsQueryKey() },
  });
  const { data: featured, isLoading: featuredLoading, refetch: refetchFeatured } = useGetFeaturedServices({
    query: { queryKey: getGetFeaturedServicesQueryKey() },
  });
  const { data: categories, isLoading: catsLoading, refetch: refetchCats } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() },
  });

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchFeatured(), refetchCats()]);
    setRefreshing(false);
  }

  const topPad = Platform.OS === "web" ? 67 : 0;
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: botPad + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.heroRow}>
        <View>
          <Text style={[styles.heroLabel, { color: colors.primary }]}>ENTERPRISE CATALOG</Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>DIGITAL{"\n"}METAMORPHOSIS</Text>
        </View>
        <View style={[styles.pulseWrap, { borderColor: colors.primary + "33" }]}>
          <View style={[styles.pulse, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="zap" size={18} color={colors.primary} />
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {statsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : stats ? (
        <View style={styles.statsGrid}>
          <StatCard label="SERVICES" value={stats.totalServices} icon="layers" />
          <StatCard label="CLOUD" value={stats.totalCloudComponents} icon="cloud" accent="#3A9FD5" />
          <StatCard label="AI AGENTS" value={stats.totalAgentEnvironments} icon="cpu" accent="#A855F7" />
          <StatCard label="REQUESTS" value={stats.totalRequests} icon="inbox" accent="#F5A623" />
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>CATEGORIES</Text>
      {catsLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.categoryGrid}>
          {(categories ?? []).map((cat) => {
            const icon = CATEGORY_ICONS[cat.slug] ?? "grid";
            const accent = CATEGORY_ACCENTS[cat.slug] ?? colors.primary;
            return (
              <Pressable
                key={cat.id}
                testID={`category-${cat.id}`}
                style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => router.push({ pathname: "/(tabs)/browse", params: { category: cat.name } })}
              >
                <View style={[styles.catIconWrap, { backgroundColor: accent + "18" }]}>
                  <Feather name={icon} size={18} color={accent} />
                </View>
                <Text style={[styles.catName, { color: colors.foreground }]} numberOfLines={2}>{cat.name}</Text>
                <Text style={[styles.catCount, { color: accent }]}>{cat.serviceCount}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>FEATURED</Text>
        <Pressable onPress={() => router.push("/(tabs)/browse")}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>

      {featuredLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        (featured ?? []).map((svc) => <ServiceCard key={svc.id} service={svc} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  heroLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "700" as const, marginBottom: 4 },
  heroTitle: { fontSize: 28, fontWeight: "800" as const, lineHeight: 32, letterSpacing: -0.5 },
  pulseWrap: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pulse: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, marginBottom: 20 },
  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 2, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  categoryCard: { width: "47.5%", padding: 14, borderWidth: 1, gap: 8 },
  catIconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16 },
  catCount: { fontSize: 20, fontWeight: "700" as const },
});
