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
  type ProofProjectUpdateInput,
  type ProofScheduleMode,
  type ProofTask,
  type ProofTaskInput,
  type ReminderFrequency,
  type Subtask,
  type Task,
  type TaskInput,
} from "@/data/tasks";
import {
  cancelProofProjectNotifications,
  cancelTaskNotifications,
  ensureNotificationPermission,
  isStrictClockTimeLabel,
  parseDueDateTime,
  scheduleProjectNotifications,
  scheduleTaskNotifications,
} from "@/lib/notifications";
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
  proofProjects: ProofTask[];
  proofEntries: ProofEntry[];
  proofMemories: ProofEntry[];
  currentProjectAlarm: ProofTask | null;
  addProofTask: (input: ProofTaskInput) => Promise<ProofTask>;
  addProofProject: (input: ProofTaskInput) => Promise<ProofTask>;
  updateProofProject: (projectId: string, input: ProofProjectUpdateInput) => Promise<void>;
  deleteProofProject: (projectId: string) => Promise<void>;
  completeProofTaskWithPhoto: (taskId: string, input: ProofCompletionInput) => Promise<ProofEntry>;
  completeProjectProof: (projectId: string, input: ProofCompletionInput) => Promise<ProofEntry>;
  updateProofMemoryNote: (memoryId: string, note: string) => Promise<void>;
  moveProofMemoryToProject: (memoryId: string, projectId: string) => Promise<void>;
  deleteProofMemory: (memoryId: string) => Promise<void>;
  getProofEntriesForDate: (dateKey: string) => ProofEntry[];
  getMissedProofTasksForDate: (dateKey: string) => ProofTask[];
  getPendingProofTasksForDate: (dateKey: string) => ProofTask[];
  getProjectMemories: (projectId: string) => ProofEntry[];
  getProofProjectStatusForDate: (projectId: string, dateKey: string) => "pending" | "completed" | "missed";
  stopProjectAlarm: (projectId: string) => Promise<void>;
  snoozeProjectAlarm: (projectId: string) => Promise<void>;
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
const proofScheduleModeValues = new Set<ProofScheduleMode>(["anytime", "fixed"]);
const cleanTaskExamples = ["Practice Flute", "Study DSA", "Gym", "Read 10 pages", "Build Task Tracker", "Morning Walk"];
const projectAlarmWindowMs = 2 * 60 * 1000;
const blockedDemoTitles = new Set(["lund lele", "hugna", "untitled task", "test", "demo"]);

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

function normalizeProofScheduleMode(value?: string | null): ProofScheduleMode {
  if (proofScheduleModeValues.has(value as ProofScheduleMode)) {
    return value as ProofScheduleMode;
  }

  return "anytime";
}

function proofProjectValidationErrors(input: ProofTaskInput) {
  const errors: Partial<Record<"name" | "fixedTime", string>> = {};
  const scheduleMode = normalizeProofScheduleMode(input.scheduleMode);

  if (!input.name.trim()) {
    errors.name = "Project name is required.";
  }
  if (scheduleMode === "fixed" && (!input.fixedTime?.trim() || !isStrictClockTimeLabel(input.fixedTime))) {
    errors.fixedTime = "Alarm time is required for fixed-time projects.";
  }

  return errors;
}

function assertValidProofProjectInput(input: ProofTaskInput) {
  const errors = proofProjectValidationErrors(input);
  const firstError = errors.name ?? errors.fixedTime;
  if (firstError) {
    throw new Error(firstError);
  }
}

function getInvalidProofProjectReason(project?: ProofTask | null) {
  if (!project) {
    return "Project does not exist.";
  }

  const name = project.name.trim();
  if (!name || name.toLowerCase().startsWith("untitled")) {
    return "Project name is missing.";
  }
  if (project.scheduleMode === "fixed" && (!project.fixedTime?.trim() || !isStrictClockTimeLabel(project.fixedTime))) {
    return "Alarm time is missing for a fixed-time project.";
  }

  return null;
}

function cleanDemoTitle(title: string, index: number) {
  const normalized = title.trim().toLowerCase();
  if (blockedDemoTitles.has(normalized) || normalized.startsWith("untitled")) {
    return cleanTaskExamples[index % cleanTaskExamples.length];
  }

  return title;
}

function cleanDemoNote(note: string) {
  const normalized = note.toLowerCase();
  if (normalized.includes("ghar se bhaag")) {
    return "Completed today's proof.";
  }

  return note;
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
  return storedTasks.map((legacyTask, index) => {
    const dueTime = cleanText(legacyTask.dueTime, cleanText(legacyTask.time, "9:00 AM"));
    const reminderStartTime = cleanText(legacyTask.reminderStartTime, dueTime);
    const legacyArea = cleanText(legacyTask.area, cleanText(legacyTask.category, cleanText(legacyTask.project, "")));
    const area = legacyArea && legacyArea !== "General" ? legacyArea : null;
    const status = legacyTask.status === "completed" || legacyTask.status === "in_progress" ? legacyTask.status : "pending";
    const legacyReminderFrequency =
      legacyTask.reminderOption && legacyTask.reminderOption !== "none" ? "1_hour" : legacyTask.reminderFrequency;

    return {
      id: cleanText(legacyTask.id, createId("task")),
      title: cleanDemoTitle(cleanText(legacyTask.title, cleanTaskExamples[index % cleanTaskExamples.length]), index),
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
  assertValidProofProjectInput(input);

  const scheduleMode = normalizeProofScheduleMode(input.scheduleMode);
  const fixedTime = scheduleMode === "fixed" ? input.fixedTime?.trim() ?? null : null;
  const name = input.name.trim();

  return {
    name,
    dailyProofTask: input.dailyProofTask.trim() || name,
    scheduleMode,
    fixedTime,
    alarmMessage: input.alarmMessage.trim() || "Dude, yeh wala task toh nhi bhula?",
    reminderFrequency: normalizeFrequency(input.reminderFrequency),
    customReminderMinutes: input.customReminderMinutes ? `${input.customReminderMinutes}`.trim() : null,
    area: input.area?.trim() || null,
    description: input.description.trim(),
  };
}

function normalizeStoredProofTasks(storedTasks: Partial<ProofTask>[]) {
  return storedTasks.map((task, index) => {
    const requestedScheduleMode = normalizeProofScheduleMode(task.scheduleMode);
    const storedFixedTime = cleanText(task.fixedTime, cleanText(task.reminderTime, ""));
    const fixedTime = requestedScheduleMode === "fixed" && isStrictClockTimeLabel(storedFixedTime) ? storedFixedTime : null;
    const scheduleMode: ProofScheduleMode = requestedScheduleMode === "fixed" && fixedTime ? "fixed" : "anytime";
    const name = cleanDemoTitle(cleanText(task.name, cleanText(task.title, cleanTaskExamples[(index + 2) % cleanTaskExamples.length])), index + 2);
    const dailyProofTask = name;
    const currentStreak = Number(task.currentStreak ?? task.streakCount ?? 0);

    return {
      id: cleanText(task.id, createId("proof")),
      name,
      dailyProofTask,
      scheduleMode,
      fixedTime,
      alarmMessage: cleanText(task.alarmMessage, "Dude, yeh wala task toh nhi bhula?"),
      reminderFrequency: normalizeFrequency(task.reminderFrequency),
      customReminderMinutes: task.customReminderMinutes ? `${task.customReminderMinutes}` : null,
      area: task.area?.trim() || null,
      description: cleanText(task.description, ""),
      currentStreak,
      totalMemories: Number(task.totalMemories ?? 0),
      latestPhotoUri: task.latestPhotoUri ?? null,
      lastCompletedDate: task.lastCompletedDate ?? null,
      reminderAt: task.reminderAt ?? null,
      notificationId: task.notificationId ?? null,
      notificationIds: task.notificationIds ?? (task.notificationId ? [task.notificationId] : []),
      alarmNotificationId: task.alarmNotificationId ?? null,
      alarmStoppedAt: task.alarmStoppedAt ?? null,
      snoozedUntil: task.snoozedUntil ?? null,
      title: name,
      dailySchedule: dailyProofTask,
      reminderTime: fixedTime ?? "",
      streakCount: currentStreak,
      createdAt: cleanText(task.createdAt, new Date().toISOString()),
      updatedAt: cleanText(task.updatedAt, new Date().toISOString()),
      archivedAt: null,
    };
  });
}

function normalizeStoredProofEntries(storedEntries: Partial<ProofEntry>[]) {
  return storedEntries
    .filter((entry) => entry.photoUri && (entry.proofTaskId || entry.taskId))
    .map((entry, index) => {
      const id = cleanText(entry.id, createId("proof-entry"));
      const taskId = cleanText(entry.projectId, cleanText(entry.taskId, cleanText(entry.proofTaskId)));
      const scheduleMode = normalizeProofScheduleMode(entry.scheduleMode);
      const createdAt = cleanText(entry.createdAt, new Date().toISOString());
      const projectName = cleanDemoTitle(cleanText(entry.projectName, cleanText(entry.taskTitle, cleanText(entry.title, cleanTaskExamples[(index + 3) % cleanTaskExamples.length]))), index + 3);
      const dailyProofTask = cleanDemoTitle(cleanText(entry.dailyProofTask, cleanText(entry.taskTitle, projectName)), index + 4);
      const completedAt = cleanText(entry.completedAt, createdAt);
      const note = cleanDemoNote(cleanText(entry.note, cleanText(entry.description, "")));
      const streakAtCompletion = Number(entry.streakAtCompletion ?? entry.streakCount ?? 1);

      return {
        id,
        proofId: cleanText(entry.proofId, id),
        proofTaskId: taskId,
        taskId,
        projectId: taskId,
        projectName,
        dailyProofTask,
        title: projectName,
        taskTitle: dailyProofTask,
        photoUri: cleanText(entry.photoUri),
        date: cleanText(entry.date, todayKey()),
        time: cleanText(entry.time, new Date(completedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })),
        completedAt,
        note,
        description: note,
        area: entry.area?.trim() || null,
        streakCount: streakAtCompletion,
        streakAtCompletion,
        scheduleMode,
        fixedTime: scheduleMode === "fixed" ? entry.fixedTime ?? null : null,
        createdAt,
        hiddenAt: null,
      };
    });
}

function calculateStreak(entries: ProofEntry[], proofTaskId: string, dateKey: string) {
  let streak = 0;
  let cursor = dateKey;

  while (entries.some((entry) => (entry.proofTaskId === proofTaskId || entry.projectId === proofTaskId) && entry.date === cursor && !entry.hiddenAt)) {
    streak += 1;
    cursor = previousDateKey(cursor);
  }

  return streak;
}

function isProjectEntry(entry: ProofEntry, projectId: string) {
  return entry.proofTaskId === projectId || entry.projectId === projectId || entry.taskId === projectId;
}

function refreshProofProjectStats(projects: ProofTask[], entries: ProofEntry[], projectIds?: string[]) {
  const idsToRefresh = projectIds ? new Set(projectIds) : null;

  return projects.map((project) => {
    if (idsToRefresh && !idsToRefresh.has(project.id)) {
      return project;
    }

    const visibleEntries = entries
      .filter((entry) => !entry.hiddenAt && isProjectEntry(entry, project.id))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    const latestEntry = visibleEntries[0] ?? null;
    const currentStreak = latestEntry ? calculateStreak(entries, project.id, latestEntry.date) : 0;

    return {
      ...project,
      currentStreak,
      streakCount: currentStreak,
      totalMemories: visibleEntries.length,
      latestPhotoUri: latestEntry?.photoUri ?? null,
      lastCompletedDate: latestEntry?.date ?? null,
    };
  });
}

function isProofTaskDueOnDate(task: ProofTask, dateKey: string) {
  const createdDate = todayKey(new Date(task.createdAt));

  return createdDate <= dateKey;
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

  const applyProjectNotifications = useCallback(
    async (project: ProofTask, entries: ProofEntry[]) => {
      const today = todayKey();
      const completedToday = entries.some((entry) => isProjectEntry(entry, project.id) && entry.date === today && !entry.hiddenAt);
      if (completedToday || getInvalidProofProjectReason(project)) {
        return {
          ...project,
          reminderAt: null,
          notificationId: null,
          notificationIds: [],
          alarmNotificationId: null,
        };
      }

      try {
        const scheduled = await scheduleProjectNotifications(project);
        return {
          ...project,
          reminderAt: scheduled.reminderAt,
          notificationId: scheduled.notificationIds[0] ?? null,
          notificationIds: scheduled.notificationIds,
          alarmNotificationId: scheduled.alarmNotificationId,
        };
      } catch (notificationError) {
        const message = notificationError instanceof Error ? notificationError.message : "Project reminder scheduling failed.";
        setError(message);
        return {
          ...project,
          reminderAt: null,
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
        const normalized = normalizeProofTask(input);
        const proofTask: ProofTask = {
          id: createId("proof"),
          ...normalized,
          title: normalized.name,
          dailySchedule: normalized.dailyProofTask,
          reminderTime: normalized.fixedTime ?? "",
          streakCount: 0,
          currentStreak: 0,
          totalMemories: 0,
          latestPhotoUri: null,
          lastCompletedDate: null,
          reminderAt: null,
          notificationId: null,
          notificationIds: [],
          alarmNotificationId: null,
          alarmStoppedAt: null,
          snoozedUntil: null,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        };

        const proofTaskWithNotifications = await applyProjectNotifications(proofTask, proofEntries);

        persistProofTasks([...proofTasks, proofTaskWithNotifications]);
        return proofTaskWithNotifications;
      } catch (proofError) {
        const message = proofError instanceof Error ? proofError.message : "Proof task save failed.";
        setError(message);
        throw proofError;
      }
    },
    [applyProjectNotifications, persistProofTasks, proofEntries, proofTasks]
  );

  const updateProofProject = useCallback(
    async (projectId: string, input: ProofProjectUpdateInput) => {
      try {
        setError(null);
        const project = proofTasks.find((item) => item.id === projectId);
        if (!project) {
          throw new Error("Project not found.");
        }

        await cancelProofProjectNotifications(project);

        const now = new Date().toISOString();
        const normalized = normalizeProofTask({
          name: input.name ?? project.name,
          dailyProofTask: input.dailyProofTask ?? project.dailyProofTask,
          scheduleMode: input.scheduleMode ?? project.scheduleMode,
          fixedTime: input.fixedTime !== undefined ? input.fixedTime : project.fixedTime,
          alarmMessage: input.alarmMessage ?? project.alarmMessage,
          reminderFrequency: input.reminderFrequency ?? project.reminderFrequency,
          customReminderMinutes: input.customReminderMinutes !== undefined ? input.customReminderMinutes : project.customReminderMinutes,
          area: input.area !== undefined ? input.area : project.area,
          description: input.description ?? project.description,
        });

        const nextProject = await applyProjectNotifications(
          {
            ...project,
            ...normalized,
            title: normalized.name,
            dailySchedule: normalized.dailyProofTask,
            reminderTime: normalized.fixedTime ?? "",
            reminderAt: null,
            notificationId: null,
            notificationIds: [],
            alarmNotificationId: null,
            alarmStoppedAt: null,
            snoozedUntil: null,
            updatedAt: now,
          },
          proofEntries
        );

        persistProofTasks(proofTasks.map((item) => (item.id === projectId ? nextProject : item)));
      } catch (projectError) {
        const message = projectError instanceof Error ? projectError.message : "Project update failed.";
        setError(message);
        throw projectError;
      }
    },
    [applyProjectNotifications, persistProofTasks, proofEntries, proofTasks]
  );

  const deleteProofProject = useCallback(
    async (projectId: string) => {
      try {
        setError(null);
        const project = proofTasks.find((item) => item.id === projectId);
        if (!project) {
          throw new Error("Project not found.");
        }

        await cancelProofProjectNotifications(project);
        persistProofEntries(proofEntries.filter((entry) => !isProjectEntry(entry, projectId)));
        persistProofTasks(proofTasks.filter((item) => item.id !== projectId));
      } catch (projectError) {
        const message = projectError instanceof Error ? projectError.message : "Project delete failed.";
        setError(message);
        throw projectError;
      }
    },
    [persistProofEntries, persistProofTasks, proofEntries, proofTasks]
  );

  const completeProofTaskWithPhoto = useCallback(
    async (taskId: string, input: ProofCompletionInput) => {
      try {
        setError(null);
        const task = proofTasks.find((item) => item.id === taskId);
        if (!task) {
          throw new Error("Proof of Work task not found.");
        }
        const invalidReason = getInvalidProofProjectReason(task);
        if (invalidReason) {
          throw new Error(invalidReason);
        }
        if (!input.photoUri) {
          throw new Error("Photo proof is required to complete this task.");
        }

        await cancelProofProjectNotifications(task);

        const now = new Date();
        const date = todayKey(now);
        const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const entriesWithoutToday = proofEntries.filter((entry) => !(isProjectEntry(entry, taskId) && entry.date === date));
        const streakCount = calculateStreak(entriesWithoutToday, taskId, previousDateKey(date)) + 1;
        const existingEntry = proofEntries.find((entry) => isProjectEntry(entry, taskId) && entry.date === date);
        const entryId = existingEntry?.id ?? createId("proof-entry");
        const completedAt = now.toISOString();
        const proofEntry: ProofEntry = {
          id: entryId,
          proofId: entryId,
          proofTaskId: task.id,
          taskId: task.id,
          projectId: task.id,
          projectName: task.name,
          dailyProofTask: task.name,
          title: task.name,
          taskTitle: task.name,
          photoUri: input.photoUri,
          date,
          time,
          completedAt,
          note: input.description.trim(),
          description: input.description.trim(),
          area: task.area,
          streakCount,
          streakAtCompletion: streakCount,
          scheduleMode: task.scheduleMode,
          fixedTime: task.fixedTime,
          createdAt: existingEntry?.createdAt ?? completedAt,
          hiddenAt: null,
        };

        const nextProofEntries = [...entriesWithoutToday, proofEntry];
        persistProofEntries(nextProofEntries);
        persistProofTasks(
          refreshProofProjectStats(
            proofTasks.map((item) =>
              item.id === taskId
                ? {
                    ...item,
                    reminderAt: null,
                    notificationId: null,
                    notificationIds: [],
                    alarmNotificationId: null,
                    alarmStoppedAt: completedAt,
                    snoozedUntil: null,
                    updatedAt: now.toISOString(),
                  }
                : item
            ),
            nextProofEntries,
            [taskId]
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

  const updateProofMemoryNote = useCallback(
    async (memoryId: string, note: string) => {
      try {
        setError(null);
        const memory = proofEntries.find((entry) => entry.id === memoryId);
        if (!memory) {
          throw new Error("Memory not found.");
        }

        const cleanNote = note.trim();
        persistProofEntries(
          proofEntries.map((entry) =>
            entry.id === memoryId
              ? {
                  ...entry,
                  note: cleanNote,
                  description: cleanNote,
                }
              : entry
          )
        );
      } catch (memoryError) {
        const message = memoryError instanceof Error ? memoryError.message : "Memory update failed.";
        setError(message);
        throw memoryError;
      }
    },
    [persistProofEntries, proofEntries]
  );

  const moveProofMemoryToProject = useCallback(
    async (memoryId: string, projectId: string) => {
      try {
        setError(null);
        const memory = proofEntries.find((entry) => entry.id === memoryId);
        const project = proofTasks.find((item) => item.id === projectId);
        if (!memory) {
          throw new Error("Memory not found.");
        }
        if (!project) {
          throw new Error("Choose a project.");
        }
        const invalidReason = getInvalidProofProjectReason(project);
        if (invalidReason) {
          throw new Error(invalidReason);
        }

        const previousProjectId = memory.projectId || memory.proofTaskId || memory.taskId;
        const nextProofEntries = proofEntries.map((entry) =>
          entry.id === memoryId
            ? {
                ...entry,
                proofTaskId: project.id,
                taskId: project.id,
                projectId: project.id,
                projectName: project.name,
                dailyProofTask: project.name,
                title: project.name,
                taskTitle: project.name,
                area: project.area,
                scheduleMode: project.scheduleMode,
                fixedTime: project.fixedTime,
              }
            : entry
        );

        persistProofEntries(nextProofEntries);
        persistProofTasks(refreshProofProjectStats(proofTasks, nextProofEntries, [previousProjectId, project.id]));
      } catch (memoryError) {
        const message = memoryError instanceof Error ? memoryError.message : "Memory move failed.";
        setError(message);
        throw memoryError;
      }
    },
    [persistProofEntries, persistProofTasks, proofEntries, proofTasks]
  );

  const deleteProofMemory = useCallback(
    async (memoryId: string) => {
      try {
        setError(null);
        const memory = proofEntries.find((entry) => entry.id === memoryId);
        if (!memory) {
          throw new Error("Memory not found.");
        }

        const projectId = memory.projectId || memory.proofTaskId || memory.taskId;
        const nextProofEntries = proofEntries.filter((entry) => entry.id !== memoryId);

        persistProofEntries(nextProofEntries);
        persistProofTasks(refreshProofProjectStats(proofTasks, nextProofEntries, [projectId]));
      } catch (memoryError) {
        const message = memoryError instanceof Error ? memoryError.message : "Memory delete failed.";
        setError(message);
        throw memoryError;
      }
    },
    [persistProofEntries, persistProofTasks, proofEntries, proofTasks]
  );

  const stopProjectAlarm = useCallback(
    async (projectId: string) => {
      try {
        setError(null);
        const now = new Date().toISOString();
        const project = proofTasks.find((item) => item.id === projectId);
        await cancelProofProjectNotifications(project);
        persistProofTasks(
          proofTasks.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  reminderAt: null,
                  notificationId: null,
                  notificationIds: [],
                  alarmNotificationId: null,
                  alarmStoppedAt: now,
                  snoozedUntil: null,
                  updatedAt: now,
                }
              : project
          )
        );
      } catch (projectError) {
        const message = projectError instanceof Error ? projectError.message : "Could not stop the project alarm.";
        setError(message);
        throw projectError;
      }
    },
    [persistProofTasks, proofTasks]
  );

  const snoozeProjectAlarm = useCallback(
    async (projectId: string) => {
      try {
        setError(null);
        const now = new Date();
        const snoozedUntil = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
        persistProofTasks(
          proofTasks.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  snoozedUntil,
                  updatedAt: now.toISOString(),
                }
              : project
          )
        );
      } catch (projectError) {
        const message = projectError instanceof Error ? projectError.message : "Could not snooze the project alarm.";
        setError(message);
        throw projectError;
      }
    },
    [persistProofTasks, proofTasks]
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
  const currentProjectAlarm = useMemo(() => {
    const now = new Date(nowTick);
    const today = todayKey(now);

    return (
      proofTasks.find((project) => {
        const invalidReason = getInvalidProofProjectReason(project);
        if (invalidReason) {
          if (project.scheduleMode === "fixed") {
            console.warn(`Skipping invalid project alarm for ${project.id}: ${invalidReason}`);
          }
          return false;
        }
        if (project.scheduleMode !== "fixed" || !project.fixedTime) {
          return false;
        }
        if (proofEntries.some((entry) => (entry.projectId === project.id || entry.proofTaskId === project.id) && entry.date === today && !entry.hiddenAt)) {
          return false;
        }
        if (project.alarmStoppedAt && todayKey(new Date(project.alarmStoppedAt)) === today) {
          return false;
        }
        const snoozedUntil = project.snoozedUntil ? new Date(project.snoozedUntil).getTime() : 0;
        if (snoozedUntil > now.getTime()) {
          return false;
        }
        if (snoozedUntil && todayKey(new Date(snoozedUntil)) === today) {
          return now.getTime() - snoozedUntil <= projectAlarmWindowMs;
        }
        const due = parseDueDateTime(today, project.fixedTime);
        if (!due) {
          console.warn(`Skipping invalid project alarm for ${project.id}: Fixed time could not be parsed.`);
        }
        const createdAt = new Date(project.createdAt);
        if (!due || (!Number.isNaN(createdAt.getTime()) && createdAt.getTime() >= due.getTime())) {
          return false;
        }
        const elapsed = now.getTime() - due.getTime();
        return elapsed >= 0 && elapsed <= projectAlarmWindowMs;
      }) ?? null
    );
  }, [nowTick, proofEntries, proofTasks]);
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

    if (currentProjectAlarm) {
      items.push({
        id: `project-alarm-${currentProjectAlarm.id}`,
        title: "Project alarm",
        body: `${currentProjectAlarm.name} alarm time: ${currentProjectAlarm.fixedTime}.`,
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
      (task) => !getInvalidProofProjectReason(task) && isProofTaskDueOnDate(task, today) && !todayProofEntries.some((entry) => isProjectEntry(entry, task.id))
    );

    pendingProofTasks.forEach((task) => {
      items.push({
        id: `proof-pending-${task.id}`,
        title: "Proof pending",
        body: `${task.name} proof pending today.`,
        tone: "blue",
      });

      if (task.currentStreak >= 3) {
        items.push({
          id: `streak-risk-${task.id}`,
          title: "Streak warning",
          body: `Your ${task.currentStreak}-day ${task.name} streak is at risk.`,
          tone: "orange",
        });
      }
    });

    todayProofEntries
      .filter((entry) => entry.streakAtCompletion > 1)
      .forEach((entry) => {
        items.push({
          id: `streak-${entry.id}`,
          title: "Streak achievement",
          body: `${entry.projectName} streak: ${entry.streakAtCompletion} days.`,
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
  }, [currentAlarmTask, currentProjectAlarm, nowTick, proofEntries, proofTasks, tasks]);

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
        (task) =>
          !getInvalidProofProjectReason(task) &&
          isProofTaskDueOnDate(task, dateKey) &&
          isSameOrBeforeToday(dateKey) &&
          !entriesForDate.some((entry) => isProjectEntry(entry, task.id))
      );
    };
    const getProofProjectStatusForDate = (projectId: string, dateKey: string) => {
      if (getProofEntriesForDate(dateKey).some((entry) => isProjectEntry(entry, projectId))) {
        return "completed" as const;
      }
      return dateKey < today ? "missed" : "pending";
    };
    const getProjectMemories = (projectId: string) =>
      proofEntries
        .filter((entry) => !entry.hiddenAt && isProjectEntry(entry, projectId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
      currentProjectAlarm,
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
      proofProjects: proofTasks,
      proofEntries,
      proofMemories: proofEntries.filter((entry) => !entry.hiddenAt),
      addProofTask,
      addProofProject: addProofTask,
      updateProofProject,
      deleteProofProject,
      completeProofTaskWithPhoto,
      completeProjectProof: completeProofTaskWithPhoto,
      updateProofMemoryNote,
      moveProofMemoryToProject,
      deleteProofMemory,
      getProofEntriesForDate,
      getPendingProofTasksForDate,
      getProjectMemories,
      getProofProjectStatusForDate,
      stopProjectAlarm,
      snoozeProjectAlarm,
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
    currentProjectAlarm,
    deleteProofMemory,
    deleteProofProject,
    deleteSubtask,
    deleteTask,
    error,
    loading,
    markTaskPending,
    moveProofMemoryToProject,
    notificationCenterItems,
    proofEntries,
    proofTasks,
    setThemeMode,
    signIn,
    signOut,
    snoozeAlarm,
    snoozeProjectAlarm,
    stopAlarm,
    stopProjectAlarm,
    tasks,
    themeModeState,
    todayTasks,
    toggleSubtask,
    toggleTaskStatus,
    updateProofMemoryNote,
    updateProofProject,
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
