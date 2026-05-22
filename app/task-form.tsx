import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Bell, CalendarDays, Check, ChevronDown, ChevronLeft, Clock3, Edit3, FileText, Folder, Tag } from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell, IconButton, PrimaryButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { categoryOptions, priorityOrder, reminderOptions, todayKey, type ReminderOption, type TaskInput } from "@/data/tasks";
import { goBackOrReplace } from "@/lib/navigation";

const blankTask: TaskInput = {
  title: "",
  dueDate: todayKey(),
  dueTime: "9:00 AM",
  priority: "Medium",
  category: "General",
  description: "",
  reminderOption: "none",
  reminderAt: null
};

function formatReminderAtForInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const period = date.getHours() >= 12 ? "PM" : "AM";
  const hour = date.getHours() % 12 || 12;
  const minute = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute} ${period}`;
}

function Field({
  icon,
  label,
  value,
  onChangeText,
  multiline = false,
  placeholder
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
          lineHeight: 22
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
  onSelect
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
          opacity: pressed ? 0.72 : 1
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
            overflow: "hidden"
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
                  opacity: pressed ? 0.72 : 1
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
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const contentWidth = Math.max(300, Math.min(width, 430) - 48);
  const task = id ? getTask(id) : undefined;
  const isEditing = Boolean(id);
  const backFallback: Href = task ? (`/task/${task.id}` as `/task/${string}`) : dueDate ? "/calendar" : "/home";
  const categoryIsCustom = !categoryOptions.includes(form.category);
  const categoryChoices = [...categoryOptions.map((category) => ({ label: category, value: category })), { label: "Custom category...", value: "__custom" }];
  const reminderLabel = reminderOptions.find((option) => option.value === form.reminderOption)?.label ?? "No reminder";

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (task) {
      const category = task.category || "General";
      setForm({
        title: task.title,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        priority: task.priority,
        category,
        description: task.description,
        reminderOption: task.reminderOption ?? "none",
        reminderAt: task.reminderOption === "custom" ? formatReminderAtForInput(task.reminderAt) : task.reminderAt
      });
      setCustomCategory(categoryOptions.includes(category) ? "" : category);
    } else if (!id && typeof dueDate === "string") {
      setForm((current) => ({ ...current, dueDate }));
    }
  }, [dueDate, id, task]);

  const updateField = <Key extends keyof TaskInput>(key: Key, value: TaskInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCategorySelect = (value: string) => {
    setCategoryOpen(false);
    if (value === "__custom") {
      updateField("category", customCategory || "");
      return;
    }

    setCustomCategory("");
    updateField("category", value);
  };

  const handleReminderSelect = (value: string) => {
    setReminderOpen(false);
    updateField("reminderOption", value as ReminderOption);
    if (value !== "custom") {
      updateField("reminderAt", null);
    }
  };

  const saveTask = async () => {
    setSaving(true);
    try {
      const taskInput = {
        ...form,
        category: form.category.trim() || "General",
        reminderAt: form.reminderOption === "custom" ? form.reminderAt : null
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
              placeholder="Design landing page"
            />

            <Field
              icon={<CalendarDays size={18} color={colors.ink} strokeWidth={2} />}
              label="Due date"
              value={form.dueDate}
              onChangeText={(value) => updateField("dueDate", value)}
              placeholder="YYYY-MM-DD"
            />

            <Field
              icon={<Clock3 size={18} color={colors.ink} strokeWidth={2} />}
              label="Due Time"
              value={form.dueTime}
              onChangeText={(value) => updateField("dueTime", value)}
              placeholder="9:00 AM"
            />

            <View style={{ gap: 9 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                <Tag size={18} color={colors.ink} strokeWidth={2} />
                <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
                  Priority
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {priorityOrder.map((priority) => {
                  const active = form.priority === priority;
                  return (
                    <Pressable
                      key={priority}
                      onPress={() => updateField("priority", priority)}
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: radii.sm,
                        borderCurve: "continuous",
                        backgroundColor: active ? colors.greenSoft : colors.surface,
                        borderWidth: 1,
                        borderColor: active ? colors.green : colors.line,
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Text selectable style={{ color: active ? colors.greenDark : colors.muted, fontWeight: "900", fontSize: 13 }}>
                        {priority}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <SelectField
              icon={<Folder size={18} color={colors.ink} strokeWidth={2} />}
              label="Category / Project"
              valueLabel={categoryIsCustom ? form.category || "Custom category" : form.category}
              selectedValue={categoryIsCustom ? "__custom" : form.category}
              options={categoryChoices}
              open={categoryOpen}
              onToggle={() => {
                setCategoryOpen((open) => !open);
                setReminderOpen(false);
              }}
              onSelect={handleCategorySelect}
            />

            {categoryIsCustom ? (
              <Field
                icon={<Folder size={18} color={colors.ink} strokeWidth={2} />}
                label="Custom category"
                value={form.category}
                onChangeText={(value) => {
                  setCustomCategory(value);
                  updateField("category", value);
                }}
                placeholder="My category"
              />
            ) : null}

            <SelectField
              icon={<Bell size={18} color={colors.ink} strokeWidth={2} />}
              label="Reminder"
              valueLabel={reminderLabel}
              selectedValue={form.reminderOption}
              options={reminderOptions}
              open={reminderOpen}
              onToggle={() => {
                setReminderOpen((open) => !open);
                setCategoryOpen(false);
              }}
              onSelect={handleReminderSelect}
            />

            {form.reminderOption === "custom" ? (
              <Field
                icon={<Bell size={18} color={colors.ink} strokeWidth={2} />}
                label="Reminder at"
                value={form.reminderAt ?? ""}
                onChangeText={(value) => updateField("reminderAt", value)}
                placeholder="2026-05-25 8:30 AM"
              />
            ) : null}

            <Field
              icon={<FileText size={18} color={colors.ink} strokeWidth={2} />}
              label="Description"
              value={form.description}
              onChangeText={(value) => updateField("description", value)}
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
