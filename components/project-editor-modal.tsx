import { Bell, Check, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import {
  areaOptions,
  frequencyLabel,
  reminderFrequencyOptions,
  type ProofScheduleMode,
  type ProofTask,
  type ProofTaskInput,
  type ReminderFrequency,
} from "@/data/tasks";

export const blankProjectInput: ProofTaskInput = {
  name: "",
  dailyProofTask: "",
  scheduleMode: "anytime",
  fixedTime: null,
  alarmMessage: "Dude, yeh wala task toh nhi bhula?",
  reminderFrequency: "none",
  customReminderMinutes: null,
  area: null,
  description: "",
};

const primaryAreas = ["Study", "Fitness", "Work", "Personal"];
const moreAreas = areaOptions.filter((area) => !primaryAreas.includes(area) && area !== "Custom");

type FieldErrors = Partial<Record<"name" | "dailyProofTask" | "fixedTime", string>>;
type TouchedFields = Partial<Record<keyof ProofTaskInput | "customArea", boolean>>;

function validateProjectForm(input: ProofTaskInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) {
    errors.name = "Project name is required.";
  }
  if (!input.dailyProofTask.trim()) {
    errors.dailyProofTask = "Daily proof task is required.";
  }
  if (input.scheduleMode === "fixed" && !input.fixedTime?.trim()) {
    errors.fixedTime = "Fixed time is required for fixed-time projects.";
  }
  return errors;
}

function projectToInput(project: ProofTask): ProofTaskInput {
  return {
    name: project.name,
    dailyProofTask: project.dailyProofTask,
    scheduleMode: project.scheduleMode,
    fixedTime: project.fixedTime,
    alarmMessage: project.alarmMessage,
    reminderFrequency: project.reminderFrequency,
    customReminderMinutes: project.customReminderMinutes,
    area: project.area,
    description: project.description,
  };
}

function normalizedName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function similarScore(left: string, right: string) {
  const leftTokens = new Set(normalizedName(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizedName(right).split(" ").filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function findSimilarProject(projects: ProofTask[], name: string) {
  const normalized = normalizedName(name);
  if (!normalized) {
    return null;
  }

  return (
    projects.find((project) => {
      const projectName = normalizedName(project.name);
      return projectName === normalized || (normalized.length > 3 && projectName.includes(normalized)) || similarScore(project.name, name) >= 0.72;
    }) ?? null
  );
}

export function ProjectEditorModal({
  open,
  title,
  submitLabel,
  initialProject,
  duplicateProjects = [],
  onClose,
  onSubmit,
  onOpenDuplicate,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  initialProject?: ProofTask | null;
  duplicateProjects?: ProofTask[];
  onClose: () => void;
  onSubmit: (input: ProofTaskInput) => Promise<unknown>;
  onOpenDuplicate?: (project: ProofTask) => void;
}) {
  const { colors } = useAppState();
  const [form, setForm] = useState<ProofTaskInput>(initialProject ? projectToInput(initialProject) : blankProjectInput);
  const [customArea, setCustomArea] = useState("");
  const [customAreaMode, setCustomAreaMode] = useState(false);
  const [showMoreAreas, setShowMoreAreas] = useState(false);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({});

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextForm = initialProject ? projectToInput(initialProject) : blankProjectInput;
    const custom = Boolean(nextForm.area && !areaOptions.includes(nextForm.area));

    setForm(nextForm);
    setCustomArea(custom ? nextForm.area ?? "" : "");
    setCustomAreaMode(custom);
    setShowMoreAreas(custom || Boolean(nextForm.area && moreAreas.includes(nextForm.area)));
    setFrequencyOpen(false);
    setSaving(false);
    setSubmitted(false);
    setTouched({});
  }, [initialProject, open]);

  const errors = useMemo(() => validateProjectForm(form), [form]);
  const canSubmit = !errors.name && !errors.dailyProofTask && !errors.fixedTime;
  const similarProject = useMemo(() => findSimilarProject(duplicateProjects, form.name), [duplicateProjects, form.name]);

  const updateForm = <Key extends keyof ProofTaskInput>(key: Key, value: ProofTaskInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const markTouched = (field: keyof ProofTaskInput | "customArea") => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const setScheduleMode = (mode: ProofScheduleMode) => {
    setForm((current) => ({
      ...current,
      scheduleMode: mode,
      fixedTime: mode === "fixed" ? current.fixedTime ?? "" : null,
    }));
  };

  const handleArea = (area: string | null, custom = false) => {
    setCustomAreaMode(custom);
    if (!custom) {
      setCustomArea("");
    }
    updateForm("area", area);
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!canSubmit || saving) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        dailyProofTask: form.dailyProofTask.trim(),
        fixedTime: form.scheduleMode === "fixed" ? form.fixedTime?.trim() ?? "" : null,
        alarmMessage: form.alarmMessage.trim(),
        customReminderMinutes: form.reminderFrequency === "custom" ? form.customReminderMinutes?.trim() || null : null,
        area: form.area?.trim() || null,
        description: form.description.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const errorFor = (field: keyof FieldErrors) => (submitted || touched[field] ? errors[field] : undefined);
  const disabled = !canSubmit || saving;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(5,10,14,0.82)", justifyContent: "flex-end", padding: 16 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 430,
            alignSelf: "center",
            maxHeight: "92%",
            borderRadius: 26,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Close ${title.toLowerCase()}`}
              onPress={onClose}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <X size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20, gap: 14 }}>
            <ProjectInput
              label="Project name"
              value={form.name}
              onChangeText={(value) => updateForm("name", value)}
              onBlur={() => markTouched("name")}
              placeholder="Fitness, Flute, Study"
              error={errorFor("name")}
            />
            <ProjectInput
              label="Daily proof task"
              value={form.dailyProofTask}
              onChangeText={(value) => updateForm("dailyProofTask", value)}
              onBlur={() => markTouched("dailyProofTask")}
              placeholder="Run 2 km, Practice flute, Study DSA"
              error={errorFor("dailyProofTask")}
            />

            {similarProject && onOpenDuplicate ? (
              <View style={{ borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: colors.orangeSoft, padding: 12, gap: 8 }}>
                <Text selectable style={{ color: colors.orange, fontSize: 13, fontWeight: "900" }}>
                  You already have a similar project. Open it instead?
                </Text>
                <Pressable accessibilityRole="button" onPress={() => onOpenDuplicate(similarProject)} style={{ alignSelf: "flex-start" }}>
                  <Text selectable style={{ color: colors.orange, fontSize: 13, fontWeight: "900" }}>
                    Open {similarProject.name}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ gap: 9 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
                Schedule mode
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(
                  [
                    ["anytime", "Anytime Today"],
                    ["fixed", "Fixed Time"],
                  ] as const
                ).map(([value, label]) => {
                  const active = form.scheduleMode === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      onPress={() => setScheduleMode(value)}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 46,
                        borderRadius: radii.sm,
                        borderCurve: "continuous",
                        borderWidth: 1,
                        borderColor: active ? colors.green : colors.line,
                        backgroundColor: active ? colors.greenSoft : colors.faint,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.76 : 1,
                      })}
                    >
                      <Text selectable style={{ color: active ? colors.greenDark : colors.muted, fontSize: 13, fontWeight: "900" }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {form.scheduleMode === "fixed" ? (
              <>
                <ProjectInput
                  label="Fixed time"
                  value={form.fixedTime ?? ""}
                  onChangeText={(value) => updateForm("fixedTime", value)}
                  onBlur={() => markTouched("fixedTime")}
                  placeholder="7:00 AM"
                  error={errorFor("fixedTime")}
                />
                <ProjectInput
                  label="Alarm message"
                  value={form.alarmMessage}
                  onChangeText={(value) => updateForm("alarmMessage", value)}
                  placeholder="Dude, yeh wala task toh nhi bhula?"
                  multiline
                />
              </>
            ) : (
              <View style={{ borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: colors.greenSoft, padding: 12 }}>
                <Text selectable style={{ color: colors.greenDark, fontSize: 13, fontWeight: "800" }}>
                  Complete anytime today
                </Text>
              </View>
            )}

            <View style={{ gap: 9 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
                Reminder frequency
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reminder frequency"
                onPress={() => setFrequencyOpen((openValue) => !openValue)}
                style={{
                  minHeight: 48,
                  borderRadius: radii.sm,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.faint,
                  paddingHorizontal: 13,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <Bell size={17} color={colors.muted} />
                <Text selectable style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "800" }}>
                  {frequencyLabel(form.reminderFrequency, form.customReminderMinutes)}
                </Text>
              </Pressable>
              {frequencyOpen ? (
                <View style={{ borderRadius: radii.md, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                  {reminderFrequencyOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      onPress={() => {
                        updateForm("reminderFrequency", option.value as ReminderFrequency);
                        if (option.value !== "custom") {
                          updateForm("customReminderMinutes", null);
                        }
                        setFrequencyOpen(false);
                      }}
                      style={{
                        minHeight: 42,
                        paddingHorizontal: 13,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: form.reminderFrequency === option.value ? colors.greenSoft : colors.surface,
                      }}
                    >
                      {form.reminderFrequency === option.value ? <Check size={15} color={colors.greenDark} /> : null}
                      <Text selectable style={{ color: form.reminderFrequency === option.value ? colors.greenDark : colors.text, fontSize: 13, fontWeight: "800" }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {form.reminderFrequency === "custom" ? (
                <ProjectInput
                  label="Custom reminder minutes"
                  value={form.customReminderMinutes ?? ""}
                  onChangeText={(value) => updateForm("customReminderMinutes", value)}
                  placeholder="45"
                />
              ) : null}
            </View>

            <View style={{ gap: 9 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
                Area optional
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AreaChip label="No area" active={!form.area && !customAreaMode} onPress={() => handleArea(null)} />
                {primaryAreas.map((area) => (
                  <AreaChip key={area} label={area} active={form.area === area && !customAreaMode} onPress={() => handleArea(area)} />
                ))}
                <AreaChip label="More / Custom" active={showMoreAreas || customAreaMode} onPress={() => setShowMoreAreas((openValue) => !openValue)} />
              </View>
              {showMoreAreas ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {moreAreas.map((area) => (
                    <AreaChip key={area} label={area} active={form.area === area && !customAreaMode} onPress={() => handleArea(area)} />
                  ))}
                  <AreaChip label="Custom" active={customAreaMode} onPress={() => handleArea(customArea || "", true)} />
                </View>
              ) : null}
            </View>

            {customAreaMode ? (
              <ProjectInput
                label="Custom area"
                value={customArea}
                onChangeText={(value) => {
                  setCustomArea(value);
                  updateForm("area", value || null);
                }}
                onBlur={() => markTouched("customArea")}
                placeholder="Your area"
              />
            ) : null}

            <ProjectInput
              label="Description optional"
              value={form.description}
              onChangeText={(value) => updateForm("description", value)}
              placeholder="Why this matters"
              multiline
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              accessibilityState={{ disabled }}
              disabled={saving}
              onPress={handleSubmit}
              style={({ pressed }) => ({
                minHeight: 56,
                borderRadius: radii.md,
                borderCurve: "continuous",
                backgroundColor: disabled ? colors.faint : colors.green,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <Text selectable style={{ color: disabled ? colors.muted : colors.surface, fontSize: 16, fontWeight: "900" }}>
                {saving ? "Saving..." : submitLabel}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProjectInput({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string;
  multiline?: boolean;
}) {
  const { colors } = useAppState();

  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 84 : 48,
          borderRadius: radii.sm,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: error ? colors.red : colors.line,
          backgroundColor: colors.faint,
          color: colors.text,
          paddingHorizontal: 13,
          paddingVertical: multiline ? 11 : 0,
          fontSize: 14,
          lineHeight: 20,
        }}
      />
      {error ? (
        <Text selectable style={{ color: colors.red, fontSize: 12, fontWeight: "800" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function AreaChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useAppState();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        borderCurve: "continuous",
        backgroundColor: active ? colors.greenSoft : colors.faint,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Text selectable style={{ color: active ? colors.greenDark : colors.muted, fontSize: 12, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}
