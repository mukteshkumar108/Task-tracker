import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Bell, CalendarDays, Check, ChevronDown, ChevronLeft, Clock3, Edit3, FileText, Folder } from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell, IconButton, PrimaryButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { areaOptions, frequencyLabel, reminderFrequencyOptions, todayKey, type ReminderFrequency, type TaskInput } from "@/data/tasks";
import { goBackOrReplace } from "@/lib/navigation";

const blankTask: TaskInput = {
  title: "",
  dueDate: todayKey(),
  reminderStartTime: "9:00 AM",
  dueTime: "8:00 PM",
  reminderFrequency: "1_hour",
  customReminderMinutes: null,
  area: null,
  notes: "",
};

const standardAreaOptions = areaOptions.filter((area) => area !== "Custom");

function Field({
  icon,
  label,
  value,
  onChangeText,
  multiline = false,
  placeholder,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
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
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{
          minHeight: multiline ? 104 : 50,
          borderRadius: radii.md,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 14 : 0,
          fontSize: 15,
          lineHeight: 22,
        }}
      />
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
  const [form, setForm] = useState<TaskInput>(blankTask);
  const [saving, setSaving] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
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
      setForm((current) => ({ ...blankTask, ...current, dueDate }));
    }
  }, [dueDate, id, task]);

  const updateField = <Key extends keyof TaskInput>(key: Key, value: TaskInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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
    <AppShell>
      <View style={{ width: contentWidth, alignSelf: "center", minHeight: 820, paddingTop: 38, paddingBottom: 30, gap: 22 }}>
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
          <>
            <Field
              icon={<Edit3 size={18} color={colors.ink} strokeWidth={2} />}
              label="Task title"
              value={form.title}
              onChangeText={(value) => updateField("title", value)}
              placeholder="Study DSA"
            />

            <Field
              icon={<CalendarDays size={18} color={colors.ink} strokeWidth={2} />}
              label="Date"
              value={form.dueDate}
              onChangeText={(value) => updateField("dueDate", value)}
              placeholder="YYYY-MM-DD"
            />

            <Field
              icon={<Bell size={18} color={colors.ink} strokeWidth={2} />}
              label="Reminder start time"
              value={form.reminderStartTime}
              onChangeText={(value) => updateField("reminderStartTime", value)}
              placeholder="9:00 AM"
            />

            <Field
              icon={<Clock3 size={18} color={colors.ink} strokeWidth={2} />}
              label="Due time / alarm time"
              value={form.dueTime}
              onChangeText={(value) => updateField("dueTime", value)}
              placeholder="8:00 PM"
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
              <Field
                icon={<Bell size={18} color={colors.ink} strokeWidth={2} />}
                label="Custom frequency minutes"
                value={form.customReminderMinutes ?? ""}
                onChangeText={(value) => updateField("customReminderMinutes", value)}
                placeholder="45"
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
              <Field
                icon={<Folder size={18} color={colors.ink} strokeWidth={2} />}
                label="Custom area"
                value={form.area ?? customArea}
                onChangeText={(value) => {
                  setCustomArea(value);
                  updateField("area", value);
                }}
                placeholder="My area"
              />
            ) : null}

            <Field
              icon={<FileText size={18} color={colors.ink} strokeWidth={2} />}
              label="Notes"
              value={form.notes}
              onChangeText={(value) => updateField("notes", value)}
              multiline
              placeholder="Add useful details..."
            />

            <PrimaryButton label={saving ? "Saving..." : isEditing ? "Save Changes" : "Add Task"} onPress={saveTask} />
          </>
        )}
      </View>
    </AppShell>
  );
}
