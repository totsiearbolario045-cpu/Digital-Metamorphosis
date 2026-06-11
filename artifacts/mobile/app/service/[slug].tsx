import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getGetServiceBySlugQueryKey,
  useGetServiceBySlug,
} from "@workspace/api-client-react";

import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";

function MetaRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metaRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: accent ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

export default function ServiceDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topPad = Platform.OS === "web" ? 67 : 0;

  const { data: service, isLoading } = useGetServiceBySlug(slug ?? "", {
    query: { enabled: !!slug, queryKey: getGetServiceBySlugQueryKey(slug ?? "") },
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Service not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, marginTop: 8 }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={16} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Catalog</Text>
      </Pressable>

      <View style={styles.serviceHeader}>
        <View style={styles.badgeRow}>
          <StatusBadge status={service.status} size="md" />
          {service.featured && (
            <View style={[styles.featuredBadge, { backgroundColor: "#1A1A00" }]}>
              <Text style={[styles.featuredText, { color: "#F5A623" }]}>FEATURED</Text>
            </View>
          )}
        </View>
        <Text style={[styles.serviceName, { color: colors.foreground }]}>{service.name}</Text>
        {service.categoryName && (
          <Text style={[styles.categoryLabel, { color: colors.primary }]}>{service.categoryName}</Text>
        )}
      </View>

      <Text style={[styles.description, { color: colors.mutedForeground }]}>{service.description}</Text>

      {service.pricing && (
        <View style={[styles.pricingCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30", borderRadius: colors.radius }]}>
          <Text style={[styles.pricingLabel, { color: colors.primary }]}>PRICING</Text>
          <Text style={[styles.pricingValue, { color: colors.foreground }]}>{service.pricing}</Text>
          {service.pricingDetails && (
            <Text style={[styles.pricingDetails, { color: colors.mutedForeground }]}>{service.pricingDetails}</Text>
          )}
        </View>
      )}

      <View style={[styles.metaTable, { borderColor: colors.border, borderRadius: colors.radius }]}>
        <MetaRow label="PROVIDER" value={service.provider} />
        <MetaRow label="REGION" value={service.region} />
        <MetaRow label="STATUS" value={service.status.toUpperCase()} accent={service.status === "active" ? "#00C896" : undefined} />
        {service.categoryName && <MetaRow label="CATEGORY" value={service.categoryName} />}
      </View>

      {service.tags && service.tags.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TAGS</Text>
          <View style={styles.tagList}>
            {service.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: 6 }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable
        testID="button-request-service"
        style={[styles.requestBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: "/(tabs)/request", params: { service: service.name } });
        }}
      >
        <Feather name="send" size={15} color={colors.primaryForeground} />
        <Text style={[styles.requestBtnText, { color: colors.primaryForeground }]}>Request This Service</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 15 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backText: { fontSize: 13 },
  serviceHeader: { gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  featuredText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.8 },
  serviceName: { fontSize: 24, fontWeight: "800" as const, lineHeight: 28 },
  categoryLabel: { fontSize: 11, letterSpacing: 1, fontWeight: "600" as const },
  description: { fontSize: 14, lineHeight: 22 },
  pricingCard: { padding: 16, borderWidth: 1, gap: 6 },
  pricingLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" as const },
  pricingValue: { fontSize: 20, fontWeight: "700" as const },
  pricingDetails: { fontSize: 12, lineHeight: 18 },
  metaTable: { borderWidth: 1, overflow: "hidden" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  metaLabel: { fontSize: 10, letterSpacing: 1, fontWeight: "600" as const },
  metaValue: { fontSize: 13, fontWeight: "500" as const, textAlign: "right", flex: 1, marginLeft: 16 },
  tagsSection: { gap: 8 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" as const },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  tagText: { fontSize: 11 },
  requestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, marginTop: 4 },
  requestBtnText: { fontSize: 15, fontWeight: "700" as const },
});
