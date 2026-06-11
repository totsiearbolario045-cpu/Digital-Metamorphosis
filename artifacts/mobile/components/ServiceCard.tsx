import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { StatusBadge } from "@/components/StatusBadge";
import { useColors } from "@/hooks/useColors";

interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider: string;
  region: string;
  status: string;
  pricing?: string;
  categoryName?: string;
  tags?: string[];
  featured?: boolean;
}

interface ServiceCardProps {
  service: Service;
  compact?: boolean;
}

export function ServiceCard({ service, compact = false }: ServiceCardProps) {
  const colors = useColors();
  const router = useRouter();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    Haptics.selectionAsync();
    router.push(`/service/${service.slug}`);
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        testID={`service-card-${service.id}`}
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <StatusBadge status={service.status} />
            {service.featured && (
              <View style={[styles.featuredBadge, { backgroundColor: "#1A1A00" }]}>
                <Text style={[styles.featuredText, { color: "#F5A623" }]}>FEATURED</Text>
              </View>
            )}
          </View>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </View>

        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={compact ? 1 : 2}
        >
          {service.name}
        </Text>

        {!compact && (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
            {service.description}
          </Text>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Feather name="package" size={11} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {service.provider}
            </Text>
          </View>
          {service.pricing && (
            <Text style={[styles.pricing, { color: colors.primary }]} numberOfLines={1}>
              {service.pricing}
            </Text>
          )}
        </View>

        {!compact && service.tags && service.tags.length > 0 && (
          <View style={styles.tags}>
            {service.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  featuredBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  featuredText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.8 },
  name: { fontSize: 15, fontWeight: "600" as const, lineHeight: 20 },
  description: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1, marginVertical: 2 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  footerText: { fontSize: 11 },
  pricing: { fontSize: 11, fontWeight: "700" as const },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  tagText: { fontSize: 10 },
});
