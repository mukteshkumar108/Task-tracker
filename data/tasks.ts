import { CalendarDays, CheckCircle2, Clock3, FileText, LayoutList, PencilLine, ShieldCheck } from "lucide-react-native";
import type { ComponentType } from "react";

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "Low" | "Medium" | "High";
export type ReminderOption = "none" | "due_time" | "5_minutes" | "10_minutes" | "30_minutes" | "1_hour" | "1_day" | "custom";

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
  dueTime: string;
  priority: TaskPriority;
  category: string;
  description: string;
  reminderOption: ReminderOption;
  reminderAt: string | null;
  notificationId: string | null;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type TaskInput = {
  title: string;
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  category: string;
  description: string;
  reminderOption: ReminderOption;
  reminderAt: string | null;
};

export const priorityOrder: TaskPriority[] = ["Low", "Medium", "High"];

export const categoryOptions = [
  "General",
  "Task Tracker",
  "Startup",
  "Work",
  "Personal",
  "Study / College",
  "Money / Finance",
  "Fitness / Health",
  "Learning / Skills",
  "Content / Marketing",
  "Client Work",
  "Home / Family",
  "Website Redesign"
];

export const reminderOptions: { label: string; value: ReminderOption }[] = [
  { label: "No reminder", value: "none" },
  { label: "At due time", value: "due_time" },
  { label: "5 minutes before", value: "5_minutes" },
  { label: "10 minutes before", value: "10_minutes" },
  { label: "30 minutes before", value: "30_minutes" },
  { label: "1 hour before", value: "1_hour" },
  { label: "1 day before", value: "1_day" },
  { label: "Custom", value: "custom" }
];

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
  { label: "Scope", value: "Live user tasks", icon: LayoutList },
  { label: "Brief", value: "Minimal, focused tracking", icon: FileText },
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
