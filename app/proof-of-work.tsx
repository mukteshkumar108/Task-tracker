import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, Check, ChevronLeft, Image as ImageIcon, Plus, ShieldCheck } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell, IconButton, PrimaryButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { areaOptions, todayKey, type ProofTaskInput } from "@/data/tasks";

const blankProofTask: ProofTaskInput = {
  title: "",
  dailySchedule: "Every day",
  reminderTime: "7:00 AM",
  area: null,
  description: "",
};

const standardAreaOptions = areaOptions.filter((area) => area !== "Custom");

export default function ProofOfWorkScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    colors,
    user,
    loading,
    error,
    clearError,
    proofTasks,
    proofEntries,
    addProofTask,
    completeProofTaskWithPhoto,
    getPendingProofTasksForDate,
  } = useAppState();
  const [form, setForm] = useState<ProofTaskInput>(blankProofTask);
  const [customArea, setCustomArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const today = todayKey();
  const pendingToday = getPendingProofTasksForDate(today);
  const todaysProofs = useMemo(() => proofEntries.filter((entry) => entry.date === today && !entry.hiddenAt), [proofEntries, today]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const updateForm = <Key extends keyof ProofTaskInput>(key: Key, value: ProofTaskInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await addProofTask({
        ...form,
        area: form.area?.trim() || null,
      });
      setForm(blankProofTask);
      setCustomArea("");
    } finally {
      setSaving(false);
    }
  };

  const pickProof = async (taskId: string, source: "camera" | "library") => {
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

    await completeProofTaskWithPhoto(taskId, {
      photoUri: result.assets[0].uri,
      description: noteDrafts[taskId] ?? "",
    });
    setNoteDrafts((current) => ({ ...current, [taskId]: "" }));
  };

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 38 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 22, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <IconButton accessibilityLabel="Back" onPress={() => router.replace("/home")}>
              <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
            </IconButton>
            <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              Proof of Work
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 34 }}>
            {error ? (
              <Pressable onPress={clearError} style={{ borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: colors.orangeSoft, padding: 12 }}>
                <Text selectable style={{ color: colors.orange, fontWeight: "800", fontSize: 13 }}>
                  {error}
                </Text>
              </Pressable>
            ) : null}

            <View
              style={{
                borderRadius: radii.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
                padding: 16,
                gap: 13,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <ShieldCheck size={20} color={colors.greenDark} strokeWidth={2.2} />
                <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                  Daily discipline task
                </Text>
              </View>

              <TextInput
                value={form.title}
                onChangeText={(value) => updateForm("title", value)}
                placeholder="Gym, Study, Reading..."
                placeholderTextColor={colors.muted}
                style={{
                  minHeight: 48,
                  borderRadius: radii.sm,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.line,
                  color: colors.text,
                  paddingHorizontal: 13,
                  fontSize: 15,
                }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  value={form.dailySchedule}
                  onChangeText={(value) => updateForm("dailySchedule", value)}
                  placeholder="Every day"
                  placeholderTextColor={colors.muted}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: radii.sm,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.line,
                    color: colors.text,
                    paddingHorizontal: 13,
                    fontSize: 15,
                  }}
                />
                <TextInput
                  value={form.reminderTime}
                  onChangeText={(value) => updateForm("reminderTime", value)}
                  placeholder="7:00 AM"
                  placeholderTextColor={colors.muted}
                  style={{
                    width: 110,
                    minHeight: 48,
                    borderRadius: radii.sm,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.line,
                    color: colors.text,
                    paddingHorizontal: 13,
                    fontSize: 15,
                  }}
                />
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    setCustomArea("");
                    updateForm("area", null);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radii.pill,
                    borderCurve: "continuous",
                    backgroundColor: !form.area ? colors.greenSoft : colors.faint,
                  }}
                >
                  <Text selectable style={{ color: !form.area ? colors.greenDark : colors.muted, fontSize: 12, fontWeight: "900" }}>
                    No area
                  </Text>
                </Pressable>
                {standardAreaOptions.map((area) => {
                  const active = form.area === area;
                  return (
                    <Pressable
                      key={area}
                      onPress={() => {
                        setCustomArea("");
                        updateForm("area", area);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: radii.pill,
                        borderCurve: "continuous",
                        backgroundColor: active ? colors.greenSoft : colors.faint,
                      }}
                    >
                      <Text selectable style={{ color: active ? colors.greenDark : colors.muted, fontSize: 12, fontWeight: "900" }}>
                        {area}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={customArea}
                onChangeText={(value) => {
                  setCustomArea(value);
                  updateForm("area", value || null);
                }}
                placeholder="Custom area"
                placeholderTextColor={colors.muted}
                style={{
                  minHeight: 44,
                  borderRadius: radii.sm,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.line,
                  color: colors.text,
                  paddingHorizontal: 13,
                  fontSize: 14,
                }}
              />

              <TextInput
                value={form.description}
                onChangeText={(value) => updateForm("description", value)}
                placeholder="Description optional"
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 78,
                  borderRadius: radii.sm,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.line,
                  color: colors.text,
                  paddingHorizontal: 13,
                  paddingVertical: 11,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              />

              <PrimaryButton label={saving ? "Saving..." : "Add Proof Task"} icon={<Plus size={19} color={colors.surface} />} onPress={handleSave} />
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                  Pending Today
                </Text>
                <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
                  {pendingToday.length}
                </Text>
              </View>

              {proofTasks.length === 0 ? (
                <View
                  style={{
                    minHeight: 130,
                    borderRadius: radii.md,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 22,
                  }}
                >
                  <Camera size={36} color={colors.green} strokeWidth={2} />
                  <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 12 }}>
                    No Proof of Work tasks
                  </Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 6 }}>
                    Add one daily habit and complete it with a photo.
                  </Text>
                </View>
              ) : null}

              {proofTasks.map((task) => {
                const completedToday = todaysProofs.find((entry) => entry.proofTaskId === task.id);

                return (
                  <View
                    key={task.id}
                    style={{
                      borderRadius: radii.md,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: colors.line,
                      backgroundColor: colors.surface,
                      padding: 15,
                      gap: 13,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: completedToday ? colors.greenSoft : colors.faint,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {completedToday ? <Check size={22} color={colors.greenDark} strokeWidth={2.8} /> : <Camera size={22} color={colors.muted} strokeWidth={2.1} />}
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                          {task.title}
                        </Text>
                        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                          {task.dailySchedule} at {task.reminderTime}
                        </Text>
                      </View>
                      <Text selectable style={{ color: colors.greenDark, fontSize: 12, fontWeight: "900" }}>
                        {task.streakCount}d
                      </Text>
                    </View>

                    {completedToday ? (
                      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                        <Image source={{ uri: completedToday.photoUri }} style={{ width: 58, height: 58, borderRadius: 13, backgroundColor: colors.faint }} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text selectable style={{ color: colors.greenDark, fontSize: 13, fontWeight: "900" }}>
                            Proof saved today
                          </Text>
                          <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                            Completed at {completedToday.time}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          value={noteDrafts[task.id] ?? ""}
                          onChangeText={(value) => setNoteDrafts((current) => ({ ...current, [task.id]: value }))}
                          placeholder="Completion note optional"
                          placeholderTextColor={colors.muted}
                          multiline
                          textAlignVertical="top"
                          style={{
                            minHeight: 70,
                            borderRadius: radii.sm,
                            borderCurve: "continuous",
                            borderWidth: 1,
                            borderColor: colors.line,
                            color: colors.text,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 14,
                            lineHeight: 19,
                          }}
                        />
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Take photo for ${task.title}`}
                            onPress={() => pickProof(task.id, "camera")}
                            style={({ pressed }) => ({
                              flex: 1,
                              minHeight: 48,
                              borderRadius: radii.sm,
                              borderCurve: "continuous",
                              backgroundColor: colors.green,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              opacity: pressed ? 0.76 : 1,
                            })}
                          >
                            <Camera size={18} color={colors.surface} strokeWidth={2.2} />
                            <Text selectable style={{ color: colors.surface, fontSize: 13, fontWeight: "900" }}>
                              Take photo
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Upload proof for ${task.title}`}
                            onPress={() => pickProof(task.id, "library")}
                            style={({ pressed }) => ({
                              flex: 1,
                              minHeight: 48,
                              borderRadius: radii.sm,
                              borderCurve: "continuous",
                              backgroundColor: colors.greenSoft,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              opacity: pressed ? 0.76 : 1,
                            })}
                          >
                            <ImageIcon size={18} color={colors.greenDark} strokeWidth={2.2} />
                            <Text selectable style={{ color: colors.greenDark, fontSize: 13, fontWeight: "900" }}>
                              Upload
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </AppShell>
  );
}
