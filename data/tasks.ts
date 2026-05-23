import { CalendarDays, Camera, CheckCircle2, Clock3, FileText, LayoutList, PencilLine, ShieldCheck } from "lucide-react-native";
import type { ComponentType } from "react";

export type TaskStatus = "pending" | "in_progress" | "completed";
export type ReminderFrequency = "none" | "5_minutes" | "15_minutes" | "30_minutes" | "1_hour" | "custom";

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string;
  reminderStartTime: string;
  dueTime: string;
  reminderFrequency: ReminderFrequency;
  customReminderMinutes: string | null;
  area: string | null;
  notes: string;
  reminderAt: string | null;
  notificationId: string | null;
  notificationIds: string[];
  alarmNotificationId: string | null;
  alarmStoppedAt: string | null;
  snoozedUntil: string | null;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type TaskInput = {
  title: string;
  dueDate: string;
  reminderStartTime: string;
  dueTime: string;
  reminderFrequency: ReminderFrequency;
  customReminderMinutes: string | null;
  area: string | null;
  notes: string;
};

export type ProofTask = {
  id: string;
  title: string;
  dailySchedule: string;
  reminderTime: string;
  area: string | null;
  description: string;
  streakCount: number;
  lastCompletedDate: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ProofTaskInput = {
  title: string;
  dailySchedule: string;
  reminderTime: string;
  area: string | null;
  description: string;
};

export type ProofEntry = {
  id: string;
  proofTaskId: string;
  title: string;
  photoUri: string;
  date: string;
  time: string;
  description: string;
  area: string | null;
  streakCount: number;
  createdAt: string;
  hiddenAt: string | null;
};

export type ProofCompletionInput = {
  photoUri: string;
  description: string;
};

export const areaOptions = ["Study", "Fitness", "Work", "Business", "Personal", "Health", "Finance", "Custom"];

export const reminderFrequencyOptions: { label: string; value: ReminderFrequency }[] = [
  { label: "No repeat", value: "none" },
  { label: "Every 5 minutes", value: "5_minutes" },
  { label: "Every 15 minutes", value: "15_minutes" },
  { label: "Every 30 minutes", value: "30_minutes" },
  { label: "Every 1 hour", value: "1_hour" },
  { label: "Custom", value: "custom" }
];

export const frequencyMinutes: Record<ReminderFrequency, number | null> = {
  none: null,
  "5_minutes": 5,
  "15_minutes": 15,
  "30_minutes": 30,
  "1_hour": 60,
  custom: null
};

export const stats = [
  {
    label: "Total Tasks",
    tone: "green" as const,
    icon: CheckCircle2
  },
  {
    label: "Completed",
    tone: "blue" as const,
    icon: ShieldCheck
  },
  {
    label: "Pending",
    tone: "orange" as const,
    icon: Clock3
  }
];

export const overviewItems: {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}[] = [
  { label: "Timeline", value: "Active task window", icon: CalendarDays },
  { label: "Scope", value: "Tasks grouped by area", icon: LayoutList },
  { label: "Memories", value: "Proof of Work photo log", icon: Camera },
  { label: "Notes", value: "Simple personal tracking", icon: FileText },
  { label: "Design", value: "Today-first workflow", icon: PencilLine }
];

export function createId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatDateLabel(value: string) {
  const date = parseDateKey(value);
  if (Number.isNaN(date.getTime())) {
    return value || "No date";
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export function formatMonthTitle(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

export function formatTimeFromIso(value?: string | null) {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function sectionLabelForDate(dateKey: string) {
  const selected = parseDateKey(dateKey);
  const today = parseDateKey(todayKey());
  const delta = Math.round((today.getTime() - selected.getTime()) / 86400000);

  if (delta === 0) {
    return "Today";
  }
  if (delta === 1) {
    return "Yesterday";
  }
  if (delta === 2) {
    return "2 days ago";
  }
  return formatDateLabel(dateKey);
}

export function statusLabel(status: TaskStatus) {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "in_progress") {
    return "In Progress";
  }
  return "Pending";
}

export function sortTasksForToday(a: Task, b: Task) {
  return a.dueTime.localeCompare(b.dueTime) || a.createdAt.localeCompare(b.createdAt);
}

export function isActiveTask(task: Task) {
  return task.status === "pending" || task.status === "in_progress";
}

export function completionDateKey(task: Task) {
  return task.completedAt ? todayKey(new Date(task.completedAt)) : null;
}

export function previousDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

export function frequencyLabel(value: ReminderFrequency, customMinutes?: string | null) {
  if (value === "custom") {
    return customMinutes ? `Every ${customMinutes} min` : "Custom";
  }
  return reminderFrequencyOptions.find((option) => option.value === value)?.label ?? "No repeat";
}
