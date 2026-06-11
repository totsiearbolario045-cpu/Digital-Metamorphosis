import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getListServicesQueryKey,
  useListServices,
  useSubmitServiceRequest,
} from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  testID?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        testID={testID}
        style={[
          styles.input,
          { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius },
          multiline && styles.multiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

export default function RequestScreen() {
  const colors = useColors();
  const [serviceName, setServiceName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const { data: services } = useListServices({}, {
    query: { queryKey: getListServicesQueryKey({}) },
  });

  const mutation = useSubmitServiceRequest();

  const topPad = Platform.OS === "web" ? 67 : 0;

  function handleSubmit() {
    setError("");
    if (!serviceName.trim() || !contactName.trim() || !contactEmail.trim()) {
      setError("Service, name, and email are required.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate(
      { data: { serviceName, contactName, contactEmail, contactPhone: contactPhone || undefined, organization: organization || undefined, notes: notes || undefined } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSubmitted(true);
        },
        onError: () => setError("Submission failed. Please try again."),
      }
    );
  }

  function handleReset() {
    setServiceName(""); setContactName(""); setContactEmail("");
    setContactPhone(""); setOrganization(""); setNotes("");
    setError(""); setSubmitted(false);
  }

  if (submitted) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.successIcon, { backgroundColor: "#00C89618" }]}>
          <Feather name="check-circle" size={40} color="#00C896" />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Request Submitted</Text>
        <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
          Your inquiry has been received. Our team will contact you within 1 business day.
        </Text>
        <Pressable
          testID="button-new-request"
          style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={handleReset}
        >
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>New Request</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 118 : 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.pageLabel, { color: colors.primary }]}>SERVICE INQUIRY</Text>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Request Access</Text>
      <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
        Submit an inquiry for any catalog service and our team will follow up directly.
      </Text>

      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SERVICE</Text>

        <Pressable
          testID="button-service-picker"
          style={[styles.picker, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}
          onPress={() => setShowPicker(!showPicker)}
        >
          <Text style={[styles.pickerText, { color: serviceName ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
            {serviceName || "Select a service..."}
          </Text>
          <Feather name={showPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </Pressable>

        {showPicker && (
          <View style={[styles.pickerDropdown, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}>
            {(services ?? []).slice(0, 20).map((svc) => (
              <Pressable
                key={svc.id}
                style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => { setServiceName(svc.name); setShowPicker(false); }}
              >
                <Text style={[styles.pickerItemText, { color: colors.foreground }]} numberOfLines={1}>{svc.name}</Text>
                <Text style={[styles.pickerItemSub, { color: colors.mutedForeground }]}>{svc.categoryName}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!showPicker && (
          <Field label="OR ENTER SERVICE NAME" value={serviceName} onChangeText={setServiceName} placeholder="Service name" testID="input-service-name" />
        )}
      </View>

      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CONTACT</Text>
        <Field label="FULL NAME *" value={contactName} onChangeText={setContactName} placeholder="Your full name" testID="input-contact-name" />
        <Field label="EMAIL *" value={contactEmail} onChangeText={setContactEmail} placeholder="your@email.com" keyboardType="email-address" testID="input-contact-email" />
        <Field label="PHONE" value={contactPhone} onChangeText={setContactPhone} placeholder="+63 9XX XXX XXXX" keyboardType="phone-pad" testID="input-contact-phone" />
        <Field label="ORGANIZATION" value={organization} onChangeText={setOrganization} placeholder="Company or agency name" testID="input-organization" />
      </View>

      <View style={[styles.section, { borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTES</Text>
        <Field label="ADDITIONAL CONTEXT" value={notes} onChangeText={setNotes} placeholder="Describe your use case, scale, or any special requirements..." multiline testID="input-notes" />
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
      ) : null}

      <Pressable
        testID="button-submit"
        style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: mutation.isPending ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : (
          <>
            <Feather name="send" size={14} color={colors.primaryForeground} />
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Submit Inquiry</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  pageLabel: { fontSize: 10, letterSpacing: 2, fontWeight: "700" as const },
  pageTitle: { fontSize: 26, fontWeight: "800" as const, marginTop: 4 },
  pageSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  section: { gap: 10, paddingBottom: 16, borderBottomWidth: 1 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" as const, marginTop: 4 },
  fieldWrap: { gap: 5 },
  label: { fontSize: 10, letterSpacing: 1, fontWeight: "600" as const },
  input: { padding: 12, borderWidth: 1, fontSize: 14 },
  multiline: { height: 100, textAlignVertical: "top" },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderWidth: 1 },
  pickerText: { fontSize: 14, flex: 1 },
  pickerDropdown: { borderWidth: 1, overflow: "hidden" },
  pickerItem: { padding: 12, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 13, fontWeight: "500" as const },
  pickerItemSub: { fontSize: 11, marginTop: 1 },
  errorText: { fontSize: 13, fontWeight: "500" as const },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, marginTop: 8 },
  submitText: { fontSize: 15, fontWeight: "700" as const },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontWeight: "700" as const },
  successBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
