import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { frequencyMinutes, todayKey, type ProofTask, type ReminderFrequency, type Task, type TaskInput } from "@/data/tasks";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const reminderChannelId = "task-reminders";
const alarmChannelId = "task-alarms";

export type ScheduledTaskNotifications = {
  notificationIds: string[];
  alarmNotificationId: string | null;
  reminderAt: string | null;
};

export type ScheduledProjectNotifications = ScheduledTaskNotifications;

type SchedulableTask = Pick<
  TaskInput,
  "title" | "dueDate" | "reminderStartTime" | "dueTime" | "reminderFrequency" | "customReminderMinutes"
>;

type SchedulableProject = Pick<
  ProofTask,
  "name" | "scheduleMode" | "fixedTime" | "alarmMessage" | "reminderFrequency" | "customReminderMinutes" | "createdAt"
>;

const isWeb = Platform.OS === "web";

function normaliseFrequency(
  reminderFrequency: ReminderFrequency,
  customReminderMinutes?: number | string | null
) {
  if (reminderFrequency === "custom") {
    const minutes = Number(customReminderMinutes);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
  }

  return frequencyMinutes[reminderFrequency] ?? null;
}

export function isStrictClockTimeLabel(timeLabel?: string | null) {
  return /^(1[0-2]|[1-9]):[0-5]\d\s(AM|PM)$/i.test((timeLabel || "").trim());
}

export async function ensureNotificationPermission() {
  if (isWeb) {
    return true;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(reminderChannelId, {
      name: "Task reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync(alarmChannelId, {
      name: "Task alarms",
      importance: Notifications.AndroidImportance.MAX,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "default",
      vibrationPattern: [0, 700, 300, 700, 300, 1000],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function parseDueDateTime(dateKey: string, timeLabel: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const trimmed = (timeLabel || "").trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }
  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getNextProjectAlarmDate(project: SchedulableProject, from = new Date()) {
  if (project.scheduleMode !== "fixed" || !project.fixedTime || !isStrictClockTimeLabel(project.fixedTime)) {
    return null;
  }

  const todayAlarm = parseDueDateTime(todayKey(from), project.fixedTime);
  if (!todayAlarm) {
    return null;
  }

  const createdAt = new Date(project.createdAt);
  if (todayAlarm.getTime() <= from.getTime() || (!Number.isNaN(createdAt.getTime()) && todayAlarm.getTime() <= createdAt.getTime())) {
    return addDays(todayAlarm, 1);
  }

  return todayAlarm;
}

export function buildReminderSchedule(task: SchedulableTask) {
  if (!task.reminderStartTime || !isStrictClockTimeLabel(task.reminderStartTime) || !isStrictClockTimeLabel(task.dueTime)) {
    return [];
  }

  const frequency = normaliseFrequency(task.reminderFrequency, task.customReminderMinutes);
  const start = parseDueDateTime(task.dueDate, task.reminderStartTime);
  const due = parseDueDateTime(task.dueDate, task.dueTime);
  if (!start || !due || start >= due) {
    return [];
  }

  const reminders: Date[] = [];
  const now = Date.now();

  if (!frequency) {
    return start.getTime() > now ? [start] : [];
  }

  for (let next = start.getTime(); next < due.getTime(); next += frequency * 60 * 1000) {
    if (next > now) {
      reminders.push(new Date(next));
    }
  }

  return reminders;
}

export async function scheduleTaskNotifications(task: SchedulableTask): Promise<ScheduledTaskNotifications> {
  const empty: ScheduledTaskNotifications = {
    notificationIds: [],
    alarmNotificationId: null,
    reminderAt: null,
  };

  if (isWeb) {
    return empty;
  }

  const permitted = await ensureNotificationPermission();
  if (!permitted) {
    return empty;
  }

  const reminders = buildReminderSchedule(task);
  const notificationIds: string[] = [];

  for (const reminder of reminders) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task reminder",
        body: `${task.title || "Your task"} is due at ${task.dueTime}`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder,
        channelId: reminderChannelId,
      },
    });
    notificationIds.push(id);
  }

  let alarmNotificationId: string | null = null;
  const due = parseDueDateTime(task.dueDate, task.dueTime);
  if (isStrictClockTimeLabel(task.dueTime) && due && due.getTime() > Date.now()) {
    // Expo Notifications gives us high-priority local notifications. True Android
    // full-screen alarms that ring indefinitely while the app is killed require
    // an EAS/dev build with native full-screen intent and exact-alarm handling.
    // app.json declares the Android permissions for that native path; the app
    // also provides an in-app full-screen alarm with vibration when running.
    alarmNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task alarm",
        body: `${task.title || "Your task"} is due now.`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: due,
        channelId: alarmChannelId,
      },
    });
  }

  return {
    notificationIds,
    alarmNotificationId,
    reminderAt: reminders[0]?.toISOString() ?? null,
  };
}

function buildProjectReminderSchedule(project: SchedulableProject, now = new Date()) {
  const frequency = normaliseFrequency(project.reminderFrequency, project.customReminderMinutes);
  if (!frequency) {
    return [];
  }

  const alarmDate = getNextProjectAlarmDate(project, now);
  const end =
    project.scheduleMode === "fixed" && alarmDate
      ? alarmDate
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const reminders: Date[] = [];

  for (let next = now.getTime() + frequency * 60 * 1000; next < end.getTime() && reminders.length < 64; next += frequency * 60 * 1000) {
    reminders.push(new Date(next));
  }

  return reminders;
}

export async function scheduleProjectNotifications(project: SchedulableProject): Promise<ScheduledProjectNotifications> {
  const empty: ScheduledProjectNotifications = {
    notificationIds: [],
    alarmNotificationId: null,
    reminderAt: null,
  };

  if (isWeb) {
    return empty;
  }

  const permitted = await ensureNotificationPermission();
  if (!permitted) {
    return empty;
  }

  const reminders = buildProjectReminderSchedule(project);
  const notificationIds: string[] = [];

  for (const reminder of reminders) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Project reminder",
        body: `${project.name || "Your project"}: add today's proof.`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder,
        channelId: reminderChannelId,
      },
    });
    notificationIds.push(id);
  }

  let alarmNotificationId: string | null = null;
  const alarmDate = getNextProjectAlarmDate(project);
  if (alarmDate && alarmDate.getTime() > Date.now()) {
    alarmNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: project.alarmMessage || "Dude, yeh wala task toh nhi bhula?",
        body: `${project.name || "Your project"} alarm time: ${project.fixedTime}.`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alarmDate,
        channelId: alarmChannelId,
      },
    });
  }

  return {
    notificationIds,
    alarmNotificationId,
    reminderAt: reminders[0]?.toISOString() ?? null,
  };
}

export async function cancelNotificationIds(ids: Array<string | null | undefined>) {
  if (isWeb) {
    return;
  }

  await Promise.all(
    ids
      .filter((id): id is string => Boolean(id))
      .map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined))
  );
}

export async function cancelTaskNotifications(task?: Partial<Task> | null) {
  if (!task) {
    return;
  }

  await cancelNotificationIds([
    ...(task.notificationIds ?? []),
    task.notificationId,
    task.alarmNotificationId,
  ]);
}

export async function cancelProofProjectNotifications(project?: Partial<ProofTask> | null) {
  if (!project) {
    return;
  }

  await cancelNotificationIds([
    ...(project.notificationIds ?? []),
    project.notificationId,
    project.alarmNotificationId,
  ]);
}
