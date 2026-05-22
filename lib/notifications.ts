import * as Notifications from "expo-notifications";

import type { ReminderOption, TaskInput } from "@/data/tasks";

const TASK_REMINDER_CHANNEL_ID = "task-reminders";

const reminderOffsets: Record<ReminderOption, number | null> = {
  none: null,
  due_time: 0,
  "5_minutes": 5,
  "10_minutes": 10,
  "30_minutes": 30,
  "1_hour": 60,
  "1_day": 1440,
  custom: null
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

function isNotificationRuntimeAvailable() {
  return process.env.EXPO_OS !== "web";
}

function parseDateParts(dueDate: string) {
  const [year, month, day] = dueDate.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return { year, month, day };
}

export function parseDueDateTime(dueDate: string, dueTime: string) {
  const parts = parseDateParts(dueDate);
  if (!parts) {
    return null;
  }

  const match = dueTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hour < 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const date = new Date(parts.year, parts.month - 1, parts.day, hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCustomReminderAt(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  return match ? parseDueDateTime(match[1], match[2]) : null;
}

export function computeReminderAt(input: Pick<TaskInput, "dueDate" | "dueTime" | "reminderOption" | "reminderAt">) {
  if (input.reminderOption === "none") {
    return null;
  }

  if (input.reminderOption === "custom") {
    return parseCustomReminderAt(input.reminderAt)?.toISOString() ?? null;
  }

  const dueAt = parseDueDateTime(input.dueDate, input.dueTime);
  const offset = reminderOffsets[input.reminderOption];
  if (!dueAt || offset === null) {
    return null;
  }

  dueAt.setMinutes(dueAt.getMinutes() - offset);
  return dueAt.toISOString();
}

export async function ensureNotificationPermission() {
  if (!isNotificationRuntimeAvailable()) {
    return false;
  }

  if (process.env.EXPO_OS === "android") {
    await Notifications.setNotificationChannelAsync(TASK_REMINDER_CHANNEL_ID, {
      name: "Task reminders",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelTaskReminder(notificationId?: string | null) {
  if (!notificationId || !isNotificationRuntimeAvailable()) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleTaskReminder(input: Pick<TaskInput, "title" | "dueDate" | "dueTime" | "reminderOption" | "reminderAt">) {
  const reminderAt = computeReminderAt(input);
  if (!reminderAt) {
    return { reminderAt, notificationId: null };
  }

  if (!isNotificationRuntimeAvailable()) {
    return { reminderAt, notificationId: null };
  }

  const triggerDate = new Date(reminderAt);
  if (triggerDate.getTime() <= Date.now()) {
    return { reminderAt, notificationId: null };
  }

  const permitted = await ensureNotificationPermission();
  if (!permitted) {
    throw new Error("Notification permission is required to schedule reminders.");
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Task reminder",
      body: `${input.title.trim() || "Task"} is due at ${input.dueTime}`,
      sound: "default",
      data: {
        dueDate: input.dueDate,
        dueTime: input.dueTime
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: TASK_REMINDER_CHANNEL_ID
    }
  });

  return { reminderAt: triggerDate.toISOString(), notificationId };
}
