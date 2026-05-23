import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from "react";

import { darkColors, lightColors, type AppColors, type ThemeMode } from "@/constants/theme";
import {
  completionDateKey,
  createId,
  isActiveTask,
  previousDateKey,
  sortTasksForToday,
  todayKey,
  type ProofCompletionInput,
  type ProofEntry,
  type ProofTask,
  type ProofTaskInput,
  type ReminderFrequency,
  type Subtask,
  type Task,
  type TaskInput,
} from "@/data/tasks";
import { cancelTaskNotifications, ensureNotificationPermission, parseDueDateTime, scheduleTaskNotifications } from "@/lib/notifications";
import { readJson, removeValue, writeJson } from "@/lib/storage";

type User = {
  uid: string;
  name: string;
};

type TaskUpdateInput = Partial<TaskInput & { status: Task["status"] }>;

type NotificationCenterItem = {
  id: string;
  title: string;
  body: string;
  tone: "green" | "blue" | "orange" | "red" | "neutral";
  date?: string;
};

type AppState = {
  colors: AppColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  user: User | null;
  signIn: () => void;
  signOut: () => void;
  updateUserName: (name: string) => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  tasks: Task[];
  todayTasks: Task[];
  completedHistoryTasks: Task[];
  todayCounts: {
    total: number;
    completed: number;
    pending: number;
  };
  currentAlarmTask: Task | null;
  notificationCenterItems: NotificationCenterItem[];
  getTask: (id: string) => Task | undefined;
  getTasksForDate: (dateKey: string) => Task[];
  addTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, input: TaskUpdateInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  markTaskPending: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  stopAlarm: (id: string) => Promise<void>;
  snoozeAlarm: (id: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  proofTasks: ProofTask[];
  proofEntries: ProofEntry[];
  addProofTask: (input: ProofTaskInput) => Promise<ProofTask>;
  completeProofTaskWithPhoto: (taskId: string, input: ProofCompletionInput) => Promise<ProofEntry>;
  getProofEntriesForDate: (dateKey: string) => ProofEntry[];
  getMissedProofTasksForDate: (dateKey: string) => ProofTask[];
  getPendingProofTasksForDate: (dateKey: string) => ProofTask[];
};

type LegacyTask = Partial<Task> & {
  time?: string;
  project?: string;
  category?: string;
  description?: string;
  reminderOption?: string;
  customReminderMinutes?: string | number | null;
};

const LOCAL_USER: User = {
  uid: "local-user",
  name: "Muktesh",
};

const THEME_KEY = "task-tracker:theme";
const SESSION_KEY = "task-tracker:session";
const SIGNED_OUT_KEY = "task-tracker:signed-out";
const reminderFrequencyValues = new Set<ReminderFrequency>(["none", "5_minutes", "15_minutes", "30_minutes", "1_hour", "custom"]);

function tasksKey(uid: string) {
  return `task-tracker:users:${uid}:tasks`;
}

function proofTasksKey(uid: string) {
  return `task-tracker:users:${uid}:proof-tasks`;
}

function proofEntriesKey(uid: string) {
  return `task-tracker:users:${uid}:proof-entries`;
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeFrequency(value?: string | null): ReminderFrequency {
  if (reminderFrequencyValues.has(value as ReminderFrequency)) {
    return value as ReminderFrequency;
  }

  return "none";
}

function normalizeTaskInput(input: TaskInput): TaskInput {
  const customMinutes = input.customReminderMinutes ? `${input.customReminderMinutes}`.trim() : null;

  return {
    title: input.title.trim() || "Untitled task",
    dueDate: input.dueDate.trim() || todayKey(),
    reminderStartTime: input.reminderStartTime.trim() || input.dueTime.trim() || "9:00 AM",
    dueTime: input.dueTime.trim() || input.reminderStartTime.trim() || "9:00 AM",
    reminderFrequency: normalizeFrequency(input.reminderFrequency),
    customReminderMinutes: customMinutes,
    area: input.area?.trim() || null,
    notes: input.notes.trim(),
  };
}

function normalizeStoredTasks(storedTasks: LegacyTask[]) {
  return storedTasks.map((legacyTask) => {
    const dueTime = cleanText(legacyTask.dueTime, cleanText(legacyTask.time, "9:00 AM"));
    const reminderStartTime = cleanText(legacyTask.reminderStartTime, dueTime);
    const legacyArea = cleanText(legacyTask.area, cleanText(legacyTask.category, cleanText(legacyTask.project, "")));
    const area = legacyArea && legacyArea !== "General" ? legacyArea : null;
    const status = legacyTask.status === "completed" || legacyTask.status === "in_progress" ? legacyTask.status : "pending";
    const legacyReminderFrequency =
      legacyTask.reminderOption && legacyTask.reminderOption !== "none" ? "1_hour" : legacyTask.reminderFrequency;

    return {
      id: cleanText(legacyTask.id, createId("task")),
      title: cleanText(legacyTask.title, "Untitled task"),
      status,
      dueDate: cleanText(legacyTask.dueDate, todayKey()),
      reminderStartTime,
      dueTime,
      reminderFrequency: normalizeFrequency(legacyReminderFrequency),
      customReminderMinutes: legacyTask.customReminderMinutes ? `${legacyTask.customReminderMinutes}` : null,
      area,
      notes: cleanText(legacyTask.notes, cleanText(legacyTask.description, "")),
      reminderAt: legacyTask.reminderAt ?? null,
      notificationId: legacyTask.notificationId ?? null,
      notificationIds: legacyTask.notificationIds ?? (legacyTask.notificationId ? [legacyTask.notificationId] : []),
      alarmNotificationId: legacyTask.alarmNotificationId ?? null,
      alarmStoppedAt: legacyTask.alarmStoppedAt ?? null,
      snoozedUntil: legacyTask.snoozedUntil ?? null,
      subtasks: legacyTask.subtasks ?? [],
      createdAt: cleanText(legacyTask.createdAt, new Date().toISOString()),
      updatedAt: cleanText(legacyTask.updatedAt, new Date().toISOString()),
      completedAt: legacyTask.completedAt ?? (status === "completed" ? legacyTask.updatedAt ?? new Date().toISOString() : null),
    } satisfies Task;
  });
}

function normalizeProofTask(input: ProofTaskInput): ProofTaskInput {
  return {
    title: input.title.trim() || "Untitled proof task",
    dailySchedule: input.dailySchedule.trim() || "Every day",
    reminderTime: input.reminderTime.trim() || "7:00 AM",
    area: input.area?.trim() || null,
    description: input.description.trim(),
  };
}

function normalizeStoredProofTasks(storedTasks: Partial<ProofTask>[]) {
  return storedTasks.map((task) => ({
    id: cleanText(task.id, createId("proof")),
    title: cleanText(task.title, "Untitled proof task"),
    dailySchedule: cleanText(task.dailySchedule, "Every day"),
    reminderTime: cleanText(task.reminderTime, "7:00 AM"),
    area: task.area?.trim() || null,
    description: cleanText(task.description, ""),
    streakCount: Number(task.streakCount ?? 0),
    lastCompletedDate: task.lastCompletedDate ?? null,
    createdAt: cleanText(task.createdAt, new Date().toISOString()),
    updatedAt: cleanText(task.updatedAt, new Date().toISOString()),
    archivedAt: task.archivedAt ?? null,
  }));
}

function normalizeStoredProofEntries(storedEntries: Partial<ProofEntry>[]) {
  return storedEntries
    .filter((entry) => entry.photoUri && entry.proofTaskId)
    .map((entry) => ({
      id: cleanText(entry.id, createId("proof-entry")),
      proofTaskId: cleanText(entry.proofTaskId),
      title: cleanText(entry.title, "Proof memory"),
      photoUri: cleanText(entry.photoUri),
      date: cleanText(entry.date, todayKey()),
      time: cleanText(entry.time, new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })),
      description: cleanText(entry.description, ""),
      area: entry.area?.trim() || null,
      streakCount: Number(entry.streakCount ?? 1),
      createdAt: cleanText(entry.createdAt, new Date().toISOString()),
      hiddenAt: entry.hiddenAt ?? null,
    }));
}

function calculateStreak(entries: ProofEntry[], proofTaskId: string, dateKey: string) {
  let streak = 0;
  let cursor = dateKey;

  while (entries.some((entry) => entry.proofTaskId === proofTaskId && entry.date === cursor && !entry.hiddenAt)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }

  return streak;
}

function isProofTaskDueOnDate(task: ProofTask, dateKey: string) {
  const createdDate = todayKey(new Date(task.createdAt));
  const archivedDate = task.archivedAt ? todayKey(new Date(task.archivedAt)) : null;

  return createdDate <= dateKey && (!archivedDate || archivedDate > dateKey);
}

function isSameOrBeforeToday(dateKey: string) {
  return dateKey <= todayKey();
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [themeModeState, setThemeModeState] = useState<ThemeMode>("light");
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [proofTasks, setProofTasks] = useState<ProofTask[]>([]);
  const [proofEntries, setProofEntries] = useState<ProofEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const theme = readJson<ThemeMode>(THEME_KEY, "light");
    const signedOut = readJson(SIGNED_OUT_KEY, false);
    const savedUser = readJson<User | null>(SESSION_KEY, null);
    const activeUser = signedOut ? null : savedUser ?? LOCAL_USER;

    setThemeModeState(theme);
    setUser(activeUser);
    setTasks(activeUser ? normalizeStoredTasks(readJson<LegacyTask[]>(tasksKey(activeUser.uid), [])) : []);
    setProofTasks(activeUser ? normalizeStoredProofTasks(readJson<Partial<ProofTask>[]>(proofTasksKey(activeUser.uid), [])) : []);
    setProofEntries(activeUser ? normalizeStoredProofEntries(readJson<Partial<ProofEntry>[]>(proofEntriesKey(activeUser.uid), [])) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    ensureNotificationPermission().catch((permissionError) => {
      console.warn("Notification permission setup failed", permissionError);
    });
  }, [user]);

  const persistTasks = useCallback(
    (nextTasks: Task[]) => {
      if (!user) {
        throw new Error("You need to be signed in to change tasks.");
      }

      setTasks(nextTasks);
      writeJson(tasksKey(user.uid), nextTasks);
    },
    [user]
  );

  const persistProofTasks = useCallback(
    (nextProofTasks: ProofTask[]) => {
      if (!user) {
        throw new Error("You need to be signed in to change Proof of Work tasks.");
      }

      setProofTasks(nextProofTasks);
      writeJson(proofTasksKey(user.uid), nextProofTasks);
    },
    [user]
  );

  const persistProofEntries = useCallback(
    (nextProofEntries: ProofEntry[]) => {
      if (!user) {
        throw new Error("You need to be signed in to save proof memories.");
      }

      setProofEntries(nextProofEntries);
      writeJson(proofEntriesKey(user.uid), nextProofEntries);
    },
    [user]
  );

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    writeJson(THEME_KEY, mode);
  }, []);

  const signIn = useCallback(() => {
    setError(null);
    setUser(LOCAL_USER);
    setTasks(normalizeStoredTasks(readJson<LegacyTask[]>(tasksKey(LOCAL_USER.uid), [])));
    setProofTasks(normalizeStoredProofTasks(readJson<Partial<ProofTask>[]>(proofTasksKey(LOCAL_USER.uid), [])));
    setProofEntries(normalizeStoredProofEntries(readJson<Partial<ProofEntry>[]>(proofEntriesKey(LOCAL_USER.uid), [])));
    writeJson(SESSION_KEY, LOCAL_USER);
    writeJson(SIGNED_OUT_KEY, false);
  }, []);

  const signOut = useCallback(() => {
    setError(null);
    setUser(null);
    setTasks([]);
    setProofTasks([]);
    setProofEntries([]);
    removeValue(SESSION_KEY);
    writeJson(SIGNED_OUT_KEY, true);
  }, []);

  const updateUserName = useCallback(
    (name: string) => {
      if (!user) {
        return;
      }

      const nextUser = {
        ...user,
        name: name.trim() || LOCAL_USER.name,
      };

      setUser(nextUser);
      writeJson(SESSION_KEY, nextUser);
    },
    [user]
  );

  const applyNotifications = useCallback(
    async (task: Task) => {
      if (task.status === "completed") {
        return {
          ...task,
          reminderAt: null,
          notificationId: null,
          notificationIds: [],
          alarmNotificationId: null,
        };
      }

      try {
        const scheduled = await scheduleTaskNotifications(task);
        return {
          ...task,
          reminderAt: scheduled.reminderAt,
          notificationId: scheduled.notificationIds[0] ?? null,
          notificationIds: scheduled.notificationIds,
          alarmNotificationId: scheduled.alarmNotificationId,
        };
      } catch (notificationError) {
        const message = notificationError instanceof Error ? notificationError.message : "Reminder scheduling failed.";
        setError(message);
        return {
          ...task,
          notificationId: null,
          notificationIds: [],
          alarmNotificationId: null,
        };
      }
    },
    []
  );

  const addTask = useCallback(
    async (input: TaskInput) => {
      try {
        setError(null);
        const now = new Date().toISOString();
        const task: Task = {
          id: createId("task"),
          ...normalizeTaskInput(input),
          status: "pending",
          reminderAt: null,
          notificationId: null,
          notificationIds: [],
          alarmNotificationId: null,
          alarmStoppedAt: null,
          snoozedUntil: null,
          subtasks: [],
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        };
        const taskWithNotifications = await applyNotifications(task);

        persistTasks([...tasks, taskWithNotifications]);
        return taskWithNotifications;
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task save failed.";
        setError(message);
        throw taskError;
      }
    },
    [applyNotifications, persistTasks, tasks]
  );

  const updateTask = useCallback(
    async (id: string, input: TaskUpdateInput) => {
      try {
        setError(null);
        const task = tasks.find((item) => item.id === id);
        if (!task) {
          throw new Error("Task not found.");
        }

        await cancelTaskNotifications(task);

        const now = new Date().toISOString();
        const nextStatus = input.status ?? task.status;
        const normalizedInput = normalizeTaskInput({
          title: input.title ?? task.title,
          dueDate: input.dueDate ?? task.dueDate,
          reminderStartTime: input.reminderStartTime ?? task.reminderStartTime,
          dueTime: input.dueTime ?? task.dueTime,
          reminderFrequency: input.reminderFrequency ?? task.reminderFrequency,
          customReminderMinutes: input.customReminderMinutes !== undefined ? input.customReminderMinutes : task.customReminderMinutes,
          area: input.area !== undefined ? input.area : task.area,
          notes: input.notes ?? task.notes,
        });
        const nextTask: Task = {
          ...task,
          ...normalizedInput,
          status: nextStatus,
          completedAt: nextStatus === "completed" ? task.completedAt ?? now : null,
          alarmStoppedAt: nextStatus === "completed" ? now : null,
          snoozedUntil: null,
          notificationId: null,
          notificationIds: [],
          alarmNotificationId: null,
          updatedAt: now,
        };
        const taskWithNotifications = await applyNotifications(nextTask);

        persistTasks(tasks.map((item) => (item.id === id ? taskWithNotifications : item)));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task update failed.";
        setError(message);
        throw taskError;
      }
    },
    [applyNotifications, persistTasks, tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const task = tasks.find((item) => item.id === id);
        await cancelTaskNotifications(task);
        persistTasks(tasks.filter((item) => item.id !== id));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task delete failed.";
        setError(message);
        throw taskError;
      }
    },
    [persistTasks, tasks]
  );

  const completeTask = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const now = new Date().toISOString();
        const task = tasks.find((item) => item.id === id);
        await cancelTaskNotifications(task);
        persistTasks(
          tasks.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "completed",
                  completedAt: item.completedAt ?? now,
                  alarmStoppedAt: now,
                  snoozedUntil: null,
                  notificationId: null,
                  notificationIds: [],
                  alarmNotificationId: null,
                  updatedAt: now,
                }
              : item
          )
        );
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task completion failed.";
        setError(message);
        throw taskError;
      }
    },
    [persistTasks, tasks]
  );

  const markTaskPending = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const task = tasks.find((item) => item.id === id);
        if (!task) {
          throw new Error("Task not found.");
        }

        await cancelTaskNotifications(task);

        const nextTask = await applyNotifications({
          ...task,
          status: "pending",
          completedAt: null,
          alarmStoppedAt: null,
          snoozedUntil: null,
          notificationId: null,
          notificationIds: [],
          alarmNotificationId: null,
          updatedAt: new Date().toISOString(),
        });

        persistTasks(tasks.map((item) => (item.id === id ? nextTask : item)));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task update failed.";
        setError(message);
        throw taskError;
      }
    },
    [applyNotifications, persistTasks, tasks]
  );

  const toggleTaskStatus = useCallback(
    async (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (task?.status === "completed") {
        await markTaskPending(id);
      } else {
        await completeTask(id);
      }
    },
    [completeTask, markTaskPending, tasks]
  );

  const stopAlarm = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const now = new Date().toISOString();
        persistTasks(tasks.map((task) => (task.id === id ? { ...task, alarmStoppedAt: now, snoozedUntil: null, updatedAt: now } : task)));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Could not stop the alarm.";
        setError(message);
        throw taskError;
      }
    },
    [persistTasks, tasks]
  );

  const snoozeAlarm = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const now = new Date();
        const snoozedUntil = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
        persistTasks(
          tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  snoozedUntil,
                  updatedAt: now.toISOString(),
                }
              : task
          )
        );
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Could not snooze the alarm.";
        setError(message);
        throw taskError;
      }
    },
    [persistTasks, tasks]
  );

  const mutateSubtasks = useCallback(
    async (taskId: string, updater: (subtasks: Subtask[]) => Subtask[]) => {
      try {
        setError(null);
        persistTasks(
          tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: updater(task.subtasks),
                  updatedAt: new Date().toISOString(),
                }
              : task
          )
        );
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Subtask update failed.";
        setError(message);
        throw taskError;
      }
    },
    [persistTasks, tasks]
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      const cleanTitleValue = title.trim();
      if (!cleanTitleValue) {
        setError("Subtask title is required.");
        return;
      }

      await mutateSubtasks(taskId, (subtasks) => [...subtasks, { id: createId("subtask"), title: cleanTitleValue, completed: false }]);
    },
    [mutateSubtasks]
  );

  const updateSubtask = useCallback(
    async (taskId: string, subtaskId: string, title: string) => {
      const cleanTitleValue = title.trim();
      if (!cleanTitleValue) {
        setError("Subtask title is required.");
        return;
      }

      await mutateSubtasks(taskId, (subtasks) =>
        subtasks.map((subtask) => (subtask.id === subtaskId ? { ...subtask, title: cleanTitleValue } : subtask))
      );
    },
    [mutateSubtasks]
  );

  const toggleSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      await mutateSubtasks(taskId, (subtasks) =>
        subtasks.map((subtask) => (subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask))
      );
    },
    [mutateSubtasks]
  );

  const deleteSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      await mutateSubtasks(taskId, (subtasks) => subtasks.filter((subtask) => subtask.id !== subtaskId));
    },
    [mutateSubtasks]
  );

  const addProofTask = useCallback(
    async (input: ProofTaskInput) => {
      try {
        setError(null);
        const now = new Date().toISOString();
        const proofTask: ProofTask = {
          id: createId("proof"),
          ...normalizeProofTask(input),
          streakCount: 0,
          lastCompletedDate: null,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };

        persistProofTasks([...proofTasks, proofTask]);
        return proofTask;
      } catch (proofError) {
        const message = proofError instanceof Error ? proofError.message : "Proof task save failed.";
        setError(message);
        throw proofError;
      }
    },
    [persistProofTasks, proofTasks]
  );

  const completeProofTaskWithPhoto = useCallback(
    async (taskId: string, input: ProofCompletionInput) => {
      try {
        setError(null);
        const task = proofTasks.find((item) => item.id === taskId);
        if (!task) {
          throw new Error("Proof of Work task not found.");
        }
        if (!input.photoUri) {
          throw new Error("Photo proof is required to complete this task.");
        }

        const now = new Date();
        const date = todayKey(now);
        const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const entriesWithoutToday = proofEntries.filter((entry) => !(entry.proofTaskId === taskId && entry.date === date));
        const streakCount = calculateStreak(entriesWithoutToday, taskId, previousDateKey(date)) + 1;
        const existingEntry = proofEntries.find((entry) => entry.proofTaskId === taskId && entry.date === date);
        const proofEntry: ProofEntry = {
          id: existingEntry?.id ?? createId("proof-entry"),
          proofTaskId: task.id,
          title: task.title,
          photoUri: input.photoUri,
          date,
          time,
          description: input.description.trim(),
          area: task.area,
          streakCount,
          createdAt: existingEntry?.createdAt ?? now.toISOString(),
          hiddenAt: null,
        };

        persistProofEntries([...entriesWithoutToday, proofEntry]);
        persistProofTasks(
          proofTasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  streakCount,
                  lastCompletedDate: date,
                  updatedAt: now.toISOString(),
                }
              : item
          )
        );

        return proofEntry;
      } catch (proofError) {
        const message = proofError instanceof Error ? proofError.message : "Proof save failed.";
        setError(message);
        throw proofError;
      }
    },
    [persistProofEntries, persistProofTasks, proofEntries, proofTasks]
  );

  const todayTasks = useMemo(() => tasks.filter((task) => task.dueDate === todayKey() && isActiveTask(task)).sort(sortTasksForToday), [tasks]);
  const completedHistoryTasks = useMemo(
    () => tasks.filter((task) => Boolean(completionDateKey(task))).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [tasks]
  );
  const currentAlarmTask = useMemo(() => {
    const now = new Date(nowTick);
    const today = todayKey(now);

    return (
      tasks.find((task) => {
        if (!isActiveTask(task) || task.dueDate !== today || task.alarmStoppedAt) {
          return false;
        }

        const snoozedUntil = task.snoozedUntil ? new Date(task.snoozedUntil).getTime() : 0;
        if (snoozedUntil > now.getTime()) {
          return false;
        }

        const due = parseDueDateTime(task.dueDate, task.dueTime);
        return Boolean(due && due.getTime() <= now.getTime());
      }) ?? null
    );
  }, [nowTick, tasks]);
  const notificationCenterItems = useMemo<NotificationCenterItem[]>(() => {
    const now = new Date(nowTick);
    const today = todayKey(now);
    const items: NotificationCenterItem[] = [];

    if (currentAlarmTask) {
      items.push({
        id: `alarm-${currentAlarmTask.id}`,
        title: "Alarm alert",
        body: `${currentAlarmTask.title} is due now.`,
        tone: "red",
      });
    }

    tasks.forEach((task) => {
      if (!isActiveTask(task)) {
        return;
      }

      const due = parseDueDateTime(task.dueDate, task.dueTime);
      if (!due) {
        return;
      }

      if (due.getTime() < now.getTime()) {
        items.push({
          id: `overdue-${task.id}`,
          title: "Overdue task",
          body: `${task.title} was due at ${task.dueTime}.`,
          tone: "red",
          date: task.dueDate,
        });
      } else if (due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
        items.push({
          id: `upcoming-${task.id}`,
          title: "Upcoming reminder",
          body: `${task.title} is due at ${task.dueTime}.`,
          tone: "orange",
          date: task.dueDate,
        });
      }
    });

    const todayProofEntries = proofEntries.filter((entry) => entry.date === today && !entry.hiddenAt);
    const pendingProofTasks = proofTasks.filter(
      (task) => isProofTaskDueOnDate(task, today) && !todayProofEntries.some((entry) => entry.proofTaskId === task.id)
    );

    pendingProofTasks.forEach((task) => {
      items.push({
        id: `proof-pending-${task.id}`,
        title: "Proof pending",
        body: `${task.title} proof pending today.`,
        tone: "blue",
      });

      if (task.streakCount >= 3) {
        items.push({
          id: `streak-risk-${task.id}`,
          title: "Streak warning",
          body: `Your ${task.streakCount}-day ${task.title} streak is at risk.`,
          tone: "orange",
        });
      }
    });

    todayProofEntries
      .filter((entry) => entry.streakCount > 1)
      .forEach((entry) => {
        items.push({
          id: `streak-${entry.id}`,
          title: "Streak achievement",
          body: `${entry.title} streak: ${entry.streakCount} days.`,
          tone: "green",
        });
      });

    const completedToday = tasks.filter((task) => completionDateKey(task) === today).length;
    if (completedToday > 0) {
      items.push({
        id: "summary-today",
        title: "Daily progress",
        body: `You completed ${completedToday} task${completedToday === 1 ? "" : "s"} today.`,
        tone: "green",
      });
    }

    const monthPrefix = today.slice(0, 7);
    const monthProofCount = proofEntries.filter((entry) => entry.date.startsWith(monthPrefix) && !entry.hiddenAt).length;
    if (monthProofCount > 0) {
      items.push({
        id: "summary-month",
        title: "Monthly memories",
        body: `This month you saved ${monthProofCount} proof memor${monthProofCount === 1 ? "y" : "ies"}.`,
        tone: "blue",
      });
    }

    return items.slice(0, 40);
  }, [currentAlarmTask, nowTick, proofEntries, proofTasks, tasks]);

  const value = useMemo<AppState>(() => {
    const today = todayKey();
    const pending = todayTasks.length;
    const completed = tasks.filter((task) => completionDateKey(task) === today).length;

    const getProofEntriesForDate = (dateKey: string) =>
      proofEntries
        .filter((entry) => entry.date === dateKey && !entry.hiddenAt)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    const getPendingProofTasksForDate = (dateKey: string) => {
      const entriesForDate = getProofEntriesForDate(dateKey);
      return proofTasks.filter(
        (task) => isProofTaskDueOnDate(task, dateKey) && isSameOrBeforeToday(dateKey) && !entriesForDate.some((entry) => entry.proofTaskId === task.id)
      );
    };

    return {
      colors: themeModeState === "dark" ? darkColors : lightColors,
      themeMode: themeModeState,
      setThemeMode,
      toggleTheme: () => setThemeMode(themeModeState === "dark" ? "light" : "dark"),
      user,
      signIn,
      signOut,
      updateUserName,
      loading,
      error,
      clearError: () => setError(null),
      tasks,
      todayTasks,
      completedHistoryTasks,
      todayCounts: {
        total: pending + completed,
        completed,
        pending,
      },
      currentAlarmTask,
      notificationCenterItems,
      getTask: (id: string) => tasks.find((task) => task.id === id),
      getTasksForDate: (dateKey: string) => tasks.filter((task) => task.dueDate === dateKey).sort(sortTasksForToday),
      addTask,
      updateTask,
      deleteTask,
      completeTask,
      markTaskPending,
      toggleTaskStatus,
      stopAlarm,
      snoozeAlarm,
      addSubtask,
      updateSubtask,
      toggleSubtask,
      deleteSubtask,
      proofTasks,
      proofEntries,
      addProofTask,
      completeProofTaskWithPhoto,
      getProofEntriesForDate,
      getPendingProofTasksForDate,
      getMissedProofTasksForDate: (dateKey: string) =>
        dateKey < today ? getPendingProofTasksForDate(dateKey) : [],
    };
  }, [
    addProofTask,
    addSubtask,
    addTask,
    completeProofTaskWithPhoto,
    completeTask,
    completedHistoryTasks,
    currentAlarmTask,
    deleteSubtask,
    deleteTask,
    error,
    loading,
    markTaskPending,
    notificationCenterItems,
    proofEntries,
    proofTasks,
    setThemeMode,
    signIn,
    signOut,
    snoozeAlarm,
    stopAlarm,
    tasks,
    themeModeState,
    todayTasks,
    toggleSubtask,
    toggleTaskStatus,
    updateSubtask,
    updateTask,
    updateUserName,
    user,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = use(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider.");
  }
  return value;
}
