import { Bell, Check, ChevronDown, Clock3, Minus, Plus, X } from "lucide-react-native";
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
const defaultTime = "7:00 AM";

type FieldErrors = Partial<Record<"name" | "fixedTime", string>>;
type TouchedFields = Partial<Record<keyof ProofTaskInput | "customArea", boolean>>;
type TimePeriod = "AM" | "PM";
const blockedProjectNames = new Set(["untitled project", "untitled", "project"]);

function isClockTime(value?: string | null) {
  return /^(1[0-2]|[1-9]):[0-5]\d\s(AM|PM)$/i.test((value || "").trim());
}

function parseTimeParts(value?: string | null) {
  const match = (value || "").trim().match(/^(1[0-2]|[1-9]):([0-5]\d)\s(AM|PM)$/i);
  if (!match) {
    return { hour: 7, minute: 0, period: "AM" as TimePeriod };
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    period: match[3].toUpperCase() as TimePeriod,
  };
}

function formatTimeParts(hour: number, minute: number, period: TimePeriod) {
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function validateProjectForm(input: ProofTaskInput): FieldErrors {
  const errors: FieldErrors = {};
  const cleanName = input.name.trim();
  const normalizedName = cleanName.toLowerCase();
  if (!cleanName) {
    errors.name = "Project name is required.";
  } else if (cleanName.length < 2 || /^\d+$/.test(cleanName) || blockedProjectNames.has(normalizedName)) {
    errors.name = "Add a clear project name.";
  }
  if (input.scheduleMode === "fixed" && !isClockTime(input.fixedTime)) {
    errors.fixedTime = "Alarm time is required for fixed-time projects.";
  }
  return errors;
}

function projectToInput(project: ProofTask): ProofTaskInput {
  return {
    name: project.name,
    dailyProofTask: project.dailyProofTask || project.name,
    scheduleMode: project.scheduleMode,
    fixedTime: isClockTime(project.fixedTime) ? project.fixedTime : null,
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

function customIntervalParts(value?: string | null) {
  const minutes = Number(value);
  if (Number.isFinite(minutes) && minutes > 0 && minutes % 60 === 0) {
    return { amount: Math.max(1, Math.min(12, minutes / 60)), unit: "hours" as const };
  }

  return { amount: Number.isFinite(minutes) && minutes > 0 ? Math.max(1, Math.min(240, minutes)) : 15, unit: "minutes" as const };
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
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [customAmount, setCustomAmount] = useState(15);
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">("minutes");

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextForm = initialProject ? projectToInput(initialProject) : blankProjectInput;
    const custom = Boolean(nextForm.area && !areaOptions.includes(nextForm.area));
    const customParts = customIntervalParts(nextForm.customReminderMinutes);

    setForm(nextForm);
    setCustomArea(custom ? nextForm.area ?? "" : "");
    setCustomAreaMode(custom);
    setShowMoreAreas(custom || Boolean(nextForm.area && moreAreas.includes(nextForm.area)));
    setFrequencyOpen(false);
    setTimePickerOpen(false);
    setSaving(false);
    setSubmitted(false);
    setTouched({});
    setCustomAmount(customParts.amount);
    setCustomUnit(customParts.unit);
  }, [initialProject, open]);

  const errors = useMemo(() => validateProjectForm(form), [form]);
  const canSubmit = !errors.name && !errors.fixedTime;
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
      fixedTime: mode === "fixed" ? (isClockTime(current.fixedTime) ? current.fixedTime : defaultTime) : null,
    }));
  };

  const handleArea = (area: string | null, custom = false) => {
    setCustomAreaMode(custom);
    if (!custom) {
      setCustomArea("");
    }
    updateForm("area", area);
  };

  const setCustomInterval = (amount: number, unit: "minutes" | "hours") => {
    const cleanAmount = unit === "hours" ? Math.max(1, Math.min(12, amount)) : Math.max(1, Math.min(240, amount));
    setCustomAmount(cleanAmount);
    setCustomUnit(unit);
    updateForm("customReminderMinutes", `${unit === "hours" ? cleanAmount * 60 : cleanAmount}`);
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!canSubmit || saving) {
      return;
    }

    const cleanName = form.name.trim();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        name: cleanName,
        dailyProofTask: cleanName,
        fixedTime: form.scheduleMode === "fixed" ? form.fixedTime : null,
        alarmMessage: form.alarmMessage.trim() || "Dude, yeh wala task toh nhi bhula?",
        customReminderMinutes: form.reminderFrequency === "custom" ? `${customUnit === "hours" ? customAmount * 60 : customAmount}` : null,
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
              onChangeText={(value) => {
                updateForm("name", value);
                markTouched("name");
              }}
              onBlur={() => markTouched("name")}
              error={errorFor("name")}
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
                <View style={{ gap: 8 }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
                    Alarm time
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose alarm time"
                    onPress={() => setTimePickerOpen(true)}
                    style={({ pressed }) => ({
                      minHeight: 50,
                      borderRadius: radii.sm,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: errorFor("fixedTime") ? colors.red : colors.line,
                      backgroundColor: colors.faint,
                      paddingHorizontal: 13,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      opacity: pressed ? 0.76 : 1,
                    })}
                  >
                    <Clock3 size={17} color={colors.muted} />
                    <Text selectable style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "900" }}>
                      {form.fixedTime ?? defaultTime}
                    </Text>
                    <ChevronDown size={18} color={colors.muted} />
                  </Pressable>
                  {errorFor("fixedTime") ? (
                    <Text selectable style={{ color: colors.red, fontSize: 12, fontWeight: "800" }}>
                      {errorFor("fixedTime")}
                    </Text>
                  ) : null}
                </View>
                <ProjectInput
                  label="Alarm message"
                  value={form.alarmMessage}
                  onChangeText={(value) => updateForm("alarmMessage", value)}
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
                Reminder spam
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
                  {frequencyLabel(form.reminderFrequency, form.reminderFrequency === "custom" ? `${customUnit === "hours" ? customAmount * 60 : customAmount}` : form.customReminderMinutes)}
                </Text>
                <ChevronDown size={18} color={colors.muted} />
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
                        if (option.value === "custom") {
                          setCustomInterval(customAmount, customUnit);
                        } else {
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
                <CustomIntervalControl
                  amount={customAmount}
                  unit={customUnit}
                  onChange={(amount, unit) => setCustomInterval(amount, unit)}
                />
              ) : null}
            </View>

            <View style={{ gap: 9 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "800" }}>
                Area
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
              />
            ) : null}

            <ProjectInput
              label="Description / Why this matters"
              value={form.description}
              onChangeText={(value) => updateForm("description", value)}
              multiline
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              accessibilityState={{ disabled }}
              disabled={disabled}
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
      <TimePickerSheet
        visible={timePickerOpen}
        value={form.fixedTime ?? defaultTime}
        onClose={() => setTimePickerOpen(false)}
        onSave={(value) => {
          updateForm("fixedTime", value);
          markTouched("fixedTime");
          setTimePickerOpen(false);
        }}
      />
    </Modal>
  );
}

function ProjectInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
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

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppState();
  const Icon = label === "Increase" ? Plus : Minus;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        borderCurve: "continuous",
        backgroundColor: colors.faint,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Icon size={18} color={colors.ink} />
    </Pressable>
  );
}

function TimePickerSheet({
  visible,
  value,
  onClose,
  onSave,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const { colors } = useAppState();
  const initial = parseTimeParts(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<TimePeriod>(initial.period);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const next = parseTimeParts(value);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [value, visible]);

  const selected = formatTimeParts(hour, minute, period);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(5,10,14,0.62)", justifyContent: "center", padding: 22 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            alignSelf: "center",
            borderRadius: 24,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            padding: 18,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
              Alarm time
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close time picker" onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>

          <View style={{ borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.greenSoft, padding: 14, alignItems: "center" }}>
            <Text selectable style={{ color: colors.greenDark, fontSize: 28, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
              {selected}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TimeColumn
              label="Hour"
              value={String(hour)}
              onIncrease={() => setHour((current) => (current === 12 ? 1 : current + 1))}
              onDecrease={() => setHour((current) => (current === 1 ? 12 : current - 1))}
            />
            <TimeColumn
              label="Minute"
              value={String(minute).padStart(2, "0")}
              onIncrease={() => setMinute((current) => (current + 5) % 60)}
              onDecrease={() => setMinute((current) => (current - 5 + 60) % 60)}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {(["AM", "PM"] as const).map((item) => {
              const active = period === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                  onPress={() => setPeriod(item)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 44,
                    borderRadius: radii.sm,
                    borderCurve: "continuous",
                    backgroundColor: active ? colors.green : colors.faint,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.76 : 1,
                  })}
                >
                  <Text selectable style={{ color: active ? colors.surface : colors.muted, fontSize: 14, fontWeight: "900" }}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save alarm time"
            onPress={() => onSave(selected)}
            style={({ pressed }) => ({
              minHeight: 50,
              borderRadius: radii.md,
              borderCurve: "continuous",
              backgroundColor: colors.green,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text selectable style={{ color: colors.surface, fontSize: 15, fontWeight: "900" }}>
              Save Time
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function TimeColumn({ label, value, onIncrease, onDecrease }: { label: string; value: string; onIncrease: () => void; onDecrease: () => void }) {
  const { colors } = useAppState();

  return (
    <View style={{ flex: 1, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.faint, padding: 12, gap: 10, alignItems: "center" }}>
      <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
        {label}
      </Text>
      <StepperButton label="Increase" onPress={onIncrease} />
      <Text selectable style={{ color: colors.ink, fontSize: 26, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
      <StepperButton label="Decrease" onPress={onDecrease} />
    </View>
  );
}

function CustomIntervalControl({
  amount,
  unit,
  onChange,
}: {
  amount: number;
  unit: "minutes" | "hours";
  onChange: (amount: number, unit: "minutes" | "hours") => void;
}) {
  const { colors } = useAppState();
  const step = unit === "hours" ? 1 : 5;

  return (
    <View style={{ borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.faint, padding: 12, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <StepperButton label="Decrease" onPress={() => onChange(amount - step, unit)} />
        <Text selectable style={{ flex: 1, textAlign: "center", color: colors.ink, fontSize: 20, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
          {amount}
        </Text>
        <StepperButton label="Increase" onPress={() => onChange(amount + step, unit)} />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(["minutes", "hours"] as const).map((item) => {
          const active = unit === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={item}
              onPress={() => onChange(item === "hours" ? Math.max(1, Math.round(amount / 60)) : unit === "hours" ? amount * 60 : amount, item)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 38,
                borderRadius: radii.sm,
                borderCurve: "continuous",
                backgroundColor: active ? colors.greenSoft : colors.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.76 : 1,
              })}
            >
              <Text selectable style={{ color: active ? colors.greenDark : colors.muted, fontSize: 13, fontWeight: "900" }}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
