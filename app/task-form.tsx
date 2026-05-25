import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Edit3, FileText, Folder, Minus, Plus, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell, IconButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { areaOptions, frequencyLabel, formatMonthTitle, parseDateKey, reminderFrequencyOptions, todayKey, type ReminderFrequency, type TaskInput } from "@/data/tasks";
import { goBackOrReplace } from "@/lib/navigation";
import { isStrictClockTimeLabel, parseDueDateTime } from "@/lib/notifications";

const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const standardAreaOptions = areaOptions.filter((area) => area !== "Custom");
const blockedTaskTitles = new Set(["untitled task", "untitled", "task"]);

type TimePeriod = "AM" | "PM";
type FieldErrors = Partial<Record<"title" | "dueDate" | "reminderStartTime" | "dueTime", string>>;
type TouchedFields = Partial<Record<keyof TaskInput | "customArea", boolean>>;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildMonthCells(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function nextAlarmTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() < 45 ? 0 : 0, 0, 0);
  if (new Date().getMinutes() >= 45) {
    now.setHours(now.getHours() + 2);
  } else {
    now.setHours(now.getHours() + 1);
  }

  return now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function createBlankTask(date = todayKey()): TaskInput {
  return {
    title: "",
    dueDate: date,
    reminderStartTime: "",
    dueTime: nextAlarmTime(),
    reminderFrequency: "none",
    customReminderMinutes: null,
    area: null,
    notes: "",
  };
}

function formatTaskDateLabel(value: string) {
  const date = parseDateKey(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = parseDateKey(todayKey());
  const tomorrow = addDays(today, 1);
  if (todayKey(date) === todayKey(today)) {
    return "Today";
  }
  if (todayKey(date) === todayKey(tomorrow)) {
    return "Tomorrow";
  }

  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function parseTimeParts(value?: string | null) {
  const match = (value || "").trim().match(/^(1[0-2]|[1-9]):([0-5]\d)\s(AM|PM)$/i);
  if (!match) {
    const fallback = nextAlarmTime().match(/^(1[0-2]|[1-9]):([0-5]\d)\s(AM|PM)$/i);
    return {
      hour: Number(fallback?.[1] ?? 9),
      minute: Number(fallback?.[2] ?? 0),
      period: (fallback?.[3]?.toUpperCase() ?? "AM") as TimePeriod,
    };
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

function taskTitleError(title: string) {
  const clean = title.trim();
  const normalized = clean.toLowerCase();
  if (!clean) {
    return "Task title is required.";
  }
  if (clean.length < 2 || /^\d+$/.test(clean) || blockedTaskTitles.has(normalized)) {
    return "Add a clear task name.";
  }
  return null;
}

function validateTaskForm(input: TaskInput): FieldErrors {
  const errors: FieldErrors = {};
  const titleError = taskTitleError(input.title);
  const alarm = parseDueDateTime(input.dueDate, input.dueTime);
  const reminder = input.reminderStartTime ? parseDueDateTime(input.dueDate, input.reminderStartTime) : null;

  if (titleError) {
    errors.title = titleError;
  }
  if (!input.dueDate || Number.isNaN(parseDateKey(input.dueDate).getTime())) {
    errors.dueDate = "Choose a valid date.";
  }
  if (!isStrictClockTimeLabel(input.dueTime) || !alarm) {
    errors.dueTime = "Alarm time is required.";
  } else if (alarm.getTime() <= Date.now()) {
    errors.dueTime = "Choose a future alarm time.";
  }
  if (input.reminderStartTime && (!isStrictClockTimeLabel(input.reminderStartTime) || !reminder)) {
    errors.reminderStartTime = "Choose a valid reminder time.";
  } else if (reminder && alarm && reminder >= alarm) {
    errors.reminderStartTime = "Reminder start time should be before alarm time.";
  }

  return errors;
}

function TextField({
  icon,
  label,
  value,
  onChangeText,
  onBlur,
  multiline = false,
  error,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  multiline?: boolean;
  error?: string;
}) {
  const { colors } = useAppState();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        {icon}
        <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 104 : 50,
          borderRadius: radii.md,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: error ? colors.red : focused ? colors.green : colors.line,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 14 : 0,
          fontSize: 15,
          lineHeight: 22,
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

function PickerField({
  icon,
  label,
  valueLabel,
  helper,
  error,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  valueLabel: string;
  helper?: string;
  error?: string;
  onPress: () => void;
}) {
  const { colors } = useAppState();

  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        {icon}
        <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
          {label}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 50,
          borderRadius: radii.md,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: error ? colors.red : colors.line,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <Text selectable numberOfLines={1} style={{ flex: 1, color: valueLabel ? colors.text : colors.muted, fontSize: 15, fontWeight: "800" }}>
          {valueLabel}
        </Text>
        <ChevronDown size={18} color={colors.muted} strokeWidth={2} />
      </Pressable>
      {error ? (
        <Text selectable style={{ color: colors.red, fontSize: 12, fontWeight: "800" }}>
          {error}
        </Text>
      ) : helper ? (
        <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function SelectField({
  icon,
  label,
  valueLabel,
  selectedValue,
  options,
  open,
  onToggle,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  valueLabel: string;
  selectedValue: string;
  options: { label: string; value: string }[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const { colors } = useAppState();

  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
        {icon}
        <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
          {label}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onToggle}
        style={({ pressed }) => ({
          minHeight: 50,
          borderRadius: radii.md,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <Text selectable numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" }}>
          {valueLabel}
        </Text>
        <ChevronDown size={18} color={colors.muted} strokeWidth={2} />
      </Pressable>

      {open ? (
        <View
          style={{
            borderRadius: radii.md,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          {options.map((option, index) => {
            const active = selectedValue === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => ({
                  minHeight: 43,
                  paddingHorizontal: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderBottomWidth: index === options.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  backgroundColor: active ? colors.greenSoft : colors.surface,
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <Text selectable numberOfLines={1} style={{ flex: 1, color: active ? colors.greenDark : colors.text, fontSize: 14, fontWeight: "800" }}>
                  {option.label}
                </Text>
                {active ? <Check size={16} color={colors.greenDark} strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function TaskFormScreen() {
  const router = useRouter();
  const { id, dueDate } = useLocalSearchParams<{ id?: string; dueDate?: string }>();
  const { width } = useWindowDimensions();
  const { colors, user, loading, error, clearError, getTask, addTask, updateTask } = useAppState();
  const [form, setForm] = useState<TaskInput>(() => createBlankTask(typeof dueDate === "string" ? dueDate : todayKey()));
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [areaOpen, setAreaOpen] = useState(false);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerField, setTimePickerField] = useState<"reminderStartTime" | "dueTime" | null>(null);
  const [customArea, setCustomArea] = useState("");
  const contentWidth = Math.max(300, Math.min(width, 430) - 48);
  const task = id ? getTask(id) : undefined;
  const isEditing = Boolean(id);
  const backFallback: Href = task ? (`/task/${task.id}` as `/task/${string}`) : dueDate ? "/calendar" : "/home";
  const areaIsCustom = Boolean(form.area && !standardAreaOptions.includes(form.area));
  const selectedAreaValue = form.area ? (areaIsCustom ? "__custom" : form.area) : "__none";
  const areaChoices = [
    { label: "No area", value: "__none" },
    ...standardAreaOptions.map((area) => ({ label: area, value: area })),
    { label: "Custom", value: "__custom" },
  ];
  const frequencyLabelText = frequencyLabel(form.reminderFrequency, form.customReminderMinutes);
  const errors = useMemo(() => validateTaskForm(form), [form]);
  const canSubmit = !errors.title && !errors.dueDate && !errors.reminderStartTime && !errors.dueTime;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        dueDate: task.dueDate,
        reminderStartTime: task.reminderStartTime,
        dueTime: task.dueTime,
        reminderFrequency: task.reminderFrequency,
        customReminderMinutes: task.customReminderMinutes,
        area: task.area,
        notes: task.notes,
      });
      setCustomArea(task.area && !standardAreaOptions.includes(task.area) ? task.area : "");
    } else if (!id && typeof dueDate === "string") {
      setForm((current) => ({ ...createBlankTask(dueDate), title: current.title, area: current.area, notes: current.notes }));
    }
  }, [dueDate, id, task]);

  const updateField = <Key extends keyof TaskInput>(key: Key, value: TaskInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const markTouched = (field: keyof TaskInput | "customArea") => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const errorFor = (field: keyof FieldErrors) => (submitted || touched[field] ? errors[field] : undefined);

  const handleAreaSelect = (value: string) => {
    setAreaOpen(false);
    if (value === "__none") {
      setCustomArea("");
      updateField("area", null);
      return;
    }
    if (value === "__custom") {
      updateField("area", customArea || "");
      return;
    }

    setCustomArea("");
    updateField("area", value);
  };

  const handleFrequencySelect = (value: string) => {
    setFrequencyOpen(false);
    updateField("reminderFrequency", value as ReminderFrequency);
    if (value !== "custom") {
      updateField("customReminderMinutes", null);
    }
  };

  const saveTask = async () => {
    setSubmitted(true);
    if (!canSubmit || saving) {
      return;
    }

    setSaving(true);
    try {
      const taskInput: TaskInput = {
        ...form,
        area: form.area?.trim() || null,
        customReminderMinutes: form.reminderFrequency === "custom" ? form.customReminderMinutes?.trim() || null : null,
      };

      if (task) {
        await updateTask(task.id, taskInput);
        router.replace(`/task/${task.id}`);
      } else {
        const created = await addTask(taskInput);
        router.replace(`/task/${created.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 38 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 18, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton accessibilityLabel="Back" onPress={() => goBackOrReplace(router, backFallback)}>
            <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
            {isEditing ? "Edit Task" : "Add Task"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {error ? (
          <Pressable onPress={clearError} style={{ borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: colors.orangeSoft, padding: 12 }}>
            <Text selectable style={{ color: colors.orange, fontWeight: "800", fontSize: 13 }}>
              {error}
            </Text>
          </Pressable>
        ) : null}

        {isEditing && !task && !loading ? (
          <View style={{ gap: 14 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 22, fontWeight: "900" }}>
              Task not found
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
              It may have been deleted before you started editing.
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 34 }}>
            <TextField
              icon={<Edit3 size={18} color={colors.ink} strokeWidth={2} />}
              label="Task title"
              value={form.title}
              onChangeText={(value) => {
                updateField("title", value);
                markTouched("title");
              }}
              onBlur={() => markTouched("title")}
              error={errorFor("title")}
            />

            <PickerField
              icon={<CalendarDays size={18} color={colors.ink} strokeWidth={2} />}
              label="Date"
              valueLabel={formatTaskDateLabel(form.dueDate)}
              error={errorFor("dueDate")}
              onPress={() => setDatePickerOpen(true)}
            />

            <PickerField
              icon={<Bell size={18} color={colors.ink} strokeWidth={2} />}
              label="Reminder starts"
              valueLabel={form.reminderStartTime || "No reminder"}
              helper={form.reminderStartTime ? undefined : "Soft reminders are off until you choose a start time."}
              error={errorFor("reminderStartTime")}
              onPress={() => setTimePickerField("reminderStartTime")}
            />

            <PickerField
              icon={<Clock3 size={18} color={colors.ink} strokeWidth={2} />}
              label="Alarm time"
              valueLabel={form.dueTime}
              error={errorFor("dueTime")}
              onPress={() => setTimePickerField("dueTime")}
            />

            <SelectField
              icon={<Bell size={18} color={colors.ink} strokeWidth={2} />}
              label="Reminder frequency"
              valueLabel={frequencyLabelText}
              selectedValue={form.reminderFrequency}
              options={reminderFrequencyOptions}
              open={frequencyOpen}
              onToggle={() => {
                setFrequencyOpen((open) => !open);
                setAreaOpen(false);
              }}
              onSelect={handleFrequencySelect}
            />

            {form.reminderFrequency === "custom" ? (
              <TextField
                icon={<Bell size={18} color={colors.ink} strokeWidth={2} />}
                label="Custom frequency minutes"
                value={form.customReminderMinutes ?? ""}
                onChangeText={(value) => updateField("customReminderMinutes", value)}
              />
            ) : null}

            <SelectField
              icon={<Folder size={18} color={colors.ink} strokeWidth={2} />}
              label="Area"
              valueLabel={form.area || "No area"}
              selectedValue={selectedAreaValue}
              options={areaChoices}
              open={areaOpen}
              onToggle={() => {
                setAreaOpen((open) => !open);
                setFrequencyOpen(false);
              }}
              onSelect={handleAreaSelect}
            />

            {areaIsCustom || selectedAreaValue === "__custom" ? (
              <TextField
                icon={<Folder size={18} color={colors.ink} strokeWidth={2} />}
                label="Custom area"
                value={form.area ?? customArea}
                onChangeText={(value) => {
                  setCustomArea(value);
                  updateField("area", value);
                }}
              />
            ) : null}

            <TextField
              icon={<FileText size={18} color={colors.ink} strokeWidth={2} />}
              label="Notes"
              value={form.notes}
              onChangeText={(value) => updateField("notes", value)}
              multiline
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEditing ? "Save Changes" : "Add Task"}
              accessibilityState={{ disabled: !canSubmit || saving }}
              disabled={!canSubmit || saving}
              onPress={saveTask}
              style={({ pressed }) => ({
                minHeight: 56,
                borderRadius: radii.md,
                borderCurve: "continuous",
                backgroundColor: !canSubmit || saving ? colors.faint : colors.green,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <Text selectable style={{ color: !canSubmit || saving ? colors.muted : colors.surface, fontSize: 16, fontWeight: "900" }}>
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Task"}
              </Text>
            </Pressable>
          </ScrollView>
        )}
        </View>
        <DatePickerSheet
          visible={datePickerOpen}
          value={form.dueDate}
          onClose={() => setDatePickerOpen(false)}
          onSave={(value) => {
            updateField("dueDate", value);
            markTouched("dueDate");
            setDatePickerOpen(false);
          }}
        />
        <TimePickerSheet
          visible={Boolean(timePickerField)}
          value={timePickerField ? form[timePickerField] : ""}
          allowClear={timePickerField === "reminderStartTime"}
          title={timePickerField === "reminderStartTime" ? "Reminder starts" : "Alarm time"}
          onClose={() => setTimePickerField(null)}
          onClear={() => {
            if (timePickerField === "reminderStartTime") {
              updateField("reminderStartTime", "");
              markTouched("reminderStartTime");
              setTimePickerField(null);
            }
          }}
          onSave={(value) => {
            if (timePickerField) {
              updateField(timePickerField, value);
              markTouched(timePickerField);
            }
            setTimePickerField(null);
          }}
        />
      </View>
    </AppShell>
  );
}

function DatePickerSheet({
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
  const [visibleMonth, setVisibleMonth] = useState(parseDateKey(value || todayKey()));
  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (visible) {
      setVisibleMonth(parseDateKey(value || todayKey()));
    }
  }, [value, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(5,10,14,0.66)", justifyContent: "center", padding: 20 }}>
        <View style={{ width: "100%", maxWidth: 390, alignSelf: "center", borderRadius: 24, borderCurve: "continuous", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <IconButton accessibilityLabel="Previous month" onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>
              <ChevronLeft size={24} color={colors.ink} />
            </IconButton>
            <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              {formatMonthTitle(visibleMonth)}
            </Text>
            <IconButton accessibilityLabel="Next month" onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>
              <ChevronRight size={24} color={colors.ink} />
            </IconButton>
          </View>

          <View style={{ flexDirection: "row" }}>
            {weekDays.map((day) => (
              <Text key={day} selectable style={{ flex: 1, color: colors.muted, fontSize: 11, fontWeight: "800", textAlign: "center" }}>
                {day}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 6 }}>
            {monthCells.map((date) => {
              const dateKey = todayKey(date);
              const selected = dateKey === value;
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  accessibilityLabel={formatTaskDateLabel(dateKey)}
                  onPress={() => onSave(dateKey)}
                  style={({ pressed }) => ({
                    width: `${100 / 7}%`,
                    alignItems: "center",
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: selected ? colors.green : "transparent", alignItems: "center", justifyContent: "center" }}>
                    <Text selectable style={{ color: selected ? colors.surface : inMonth ? colors.ink : colors.muted, fontSize: 14, fontWeight: selected ? "900" : "700" }}>
                      {date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Cancel date picker" onPress={onClose} style={{ minHeight: 46, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.faint, alignItems: "center", justifyContent: "center" }}>
            <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppState();
  const Icon = label === "Increase" ? Plus : Minus;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.faint, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 })}>
      <Icon size={18} color={colors.ink} />
    </Pressable>
  );
}

function TimePickerSheet({
  visible,
  value,
  title,
  allowClear = false,
  onClose,
  onClear,
  onSave,
}: {
  visible: boolean;
  value: string;
  title: string;
  allowClear?: boolean;
  onClose: () => void;
  onClear: () => void;
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
      <View style={{ flex: 1, backgroundColor: "rgba(5,10,14,0.66)", justifyContent: "center", padding: 22 }}>
        <View style={{ width: "100%", maxWidth: 360, alignSelf: "center", borderRadius: 24, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 18, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
              {title}
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
            <TimeColumn label="Hour" value={String(hour)} onIncrease={() => setHour((current) => (current === 12 ? 1 : current + 1))} onDecrease={() => setHour((current) => (current === 1 ? 12 : current - 1))} />
            <TimeColumn label="Minute" value={String(minute).padStart(2, "0")} onIncrease={() => setMinute((current) => (current + 5) % 60)} onDecrease={() => setMinute((current) => (current - 5 + 60) % 60)} />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {(["AM", "PM"] as const).map((item) => {
              const active = period === item;
              return (
                <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} onPress={() => setPeriod(item)} style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: active ? colors.green : colors.faint, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.76 : 1 })}>
                  <Text selectable style={{ color: active ? colors.surface : colors.muted, fontSize: 14, fontWeight: "900" }}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {allowClear ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear reminder time" onPress={onClear} style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.faint, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.76 : 1 })}>
                <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
                  No Reminder
                </Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Save time" onPress={() => onSave(selected)} style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.green, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.82 : 1 })}>
              <Text selectable style={{ color: colors.surface, fontSize: 14, fontWeight: "900" }}>
                Save Time
              </Text>
            </Pressable>
          </View>
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
