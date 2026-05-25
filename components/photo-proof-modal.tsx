import * as ImagePicker from "expo-image-picker";
import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import type { ProofTask } from "@/data/tasks";

export function PhotoProofModal({
  project,
  onClose,
}: {
  project: ProofTask | null;
  onClose: () => void;
}) {
  const { colors, completeProjectProof } = useAppState();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const pickProof = async (source: "camera" | "library") => {
    if (!project) {
      return;
    }

    const permission =
      source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.75, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setSaving(true);
    try {
      await completeProjectProof(project.id, {
        photoUri: result.assets[0].uri,
        description: note,
      });
      setNote("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={Boolean(project)} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(5, 10, 14, 0.88)",
          justifyContent: "flex-end",
          padding: 16,
        }}
      >
        {project ? (
          <View
            style={{
              width: "100%",
              maxWidth: 430,
              alignSelf: "center",
              borderRadius: 26,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              padding: 18,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
                  Add Today's Proof
                </Text>
                <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
                  {project.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close proof modal"
                onPress={onClose}
                style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}
              >
                <X size={22} color={colors.ink} />
              </Pressable>
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 92,
                borderRadius: radii.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.faint,
                color: colors.text,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                lineHeight: 20,
              }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <ProofButton
                label={saving ? "Saving..." : "Take Photo"}
                icon={<Camera size={19} color={colors.surface} strokeWidth={2.3} />}
                primary
                onPress={() => pickProof("camera")}
              />
              <ProofButton
                label="Upload"
                icon={<ImageIcon size={19} color={colors.greenDark} strokeWidth={2.3} />}
                onPress={() => pickProof("library")}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function ProofButton({
  label,
  icon,
  primary = false,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  primary?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppState();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 52,
        borderRadius: radii.md,
        borderCurve: "continuous",
        backgroundColor: primary ? colors.green : colors.greenSoft,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      {icon}
      <Text selectable style={{ color: primary ? colors.surface : colors.greenDark, fontSize: 14, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}
