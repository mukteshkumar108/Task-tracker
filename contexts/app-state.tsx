import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from "react";

import { darkColors, lightColors, type AppColors, type ThemeMode } from "@/constants/theme";
import {
  completionDateKey,
  createId,
  isActiveTask,
  reminderOptions,
  sortTasksForToday,
  type ReminderOption,
  type Subtask,
  type Task,
  type TaskInput,
  todayKey
} from "@/data/tasks";
import { cancelTaskReminder, computeReminderAt, ensureNotificationPermission, scheduleTaskReminder } from "@/lib/notifications";
import { readJson, removeValue, writeJson } from "@/lib/storage";

type User = {
  uid: string;
  name: string;
};

type TaskUpdateInput = Partial<TaskInput & { status: Task["status"] }>;

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
  getTask: (id: string) => Task | undefined;
  getTasksForDate: (dateKey: string) => Task[];
  addTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, input: TaskUpdateInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  markTaskPending: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
};

type LegacyTask = Task & {
  time?: string;
  project?: string;
};

const LOCAL_USER: User = {
  uid: "local-user",
  name: "Alex"
};

const THEME_KEY = "task-tracker:theme";
const SESSION_KEY = "task-tracker:session";
const SIGNED_OUT_KEY = "task-tracker:signed-out";
const reminderValues = new Set<ReminderOption>(reminderOptions.map((option) => option.value));

function tasksKey(uid: string) {
  return `task-tracker:users:${uid}:tasks`;
}

function normalizeReminderOption(value?: string | null): ReminderOption {
  return reminderValues.has(value as ReminderOption) ? (value as ReminderOption) : "none";
}

function normalizeTask(input: TaskInput): TaskInput {
  const reminderOption = normalizeReminderOption(input.reminderOption);

  return {
    title: input.title.trim() || "Untitled task",
    dueDate: input.dueDate.trim() || todayKey(),
    dueTime: input.dueTime.trim() || "9:00 AM",
    priority: input.priority,
    category: input.category.trim() || "General",
    description: input.description.trim(),
    reminderOption,
    reminderAt: reminderOption === "none" ? null : input.reminderAt?.trim() || null
  };
}

function normalizeStoredTasks(storedTasks: Task[]) {
  return storedTasks.map((task) => {
    const legacyTask = task as LegacyTask;
    const { time: legacyTime, project: legacyProject, ...taskWithoutLegacyFields } = legacyTask;
    const reminderOption = normalizeReminderOption(task.reminderOption);

    return {
      ...taskWithoutLegacyFields,
      dueTime: task.dueTime ?? legacyTime ?? "9:00 AM",
      category: task.category ?? legacyProject ?? "General",
      reminderOption,
      reminderAt: task.reminderAt ?? null,
      notificationId: task.notificationId ?? null,
      completedAt: task.completedAt ?? (task.status === "completed" ? task.updatedAt : null),
      subtasks: task.subtasks ?? []
    };
  });
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [themeModeState, setThemeModeState] = useState<ThemeMode>("light");
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const theme = readJson<ThemeMode>(THEME_KEY, "light");
    const signedOut = readJson(SIGNED_OUT_KEY, false);
    const savedUser = readJson<User | null>(SESSION_KEY, null);
    const activeUser = signedOut ? null : savedUser ?? LOCAL_USER;

    setThemeModeState(theme);
    setUser(activeUser);
    setTasks(activeUser ? normalizeStoredTasks(readJson<Task[]>(tasksKey(activeUser.uid), [])) : []);
    setLoading(false);
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

  const runTaskMutation = useCallback(
    async (mutation: (current: Task[]) => Task[]) => {
      try {
        setError(null);
        persistTasks(mutation(tasks));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task update failed.";
        setError(message);
        throw taskError;
      }
    },
    [persistTasks, tasks]
  );

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    writeJson(THEME_KEY, mode);
  }, []);

  const signIn = useCallback(() => {
    setError(null);
    setUser(LOCAL_USER);
    setTasks(normalizeStoredTasks(readJson<Task[]>(tasksKey(LOCAL_USER.uid), [])));
    writeJson(SESSION_KEY, LOCAL_USER);
    writeJson(SIGNED_OUT_KEY, false);
  }, []);

  const signOut = useCallback(() => {
    setError(null);
    setUser(null);
    setTasks([]);
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
        name: name.trim() || "Alex"
      };

      setUser(nextUser);
      writeJson(SESSION_KEY, nextUser);
    },
    [user]
  );

  const cancelExistingReminder = useCallback(async (task?: Task) => {
    if (!task?.notificationId) {
      return;
    }

    try {
      await cancelTaskReminder(task.notificationId);
    } catch (reminderError) {
      const message = reminderError instanceof Error ? reminderError.message : "Could not cancel the existing reminder.";
      setError(message);
    }
  }, []);

  const applyReminder = useCallback(async (task: Task) => {
    const reminderAt = computeReminderAt(task);
    if (task.status === "completed" || task.reminderOption === "none") {
      return { ...task, reminderAt: null, notificationId: null };
    }

    if (task.reminderOption === "custom" && !reminderAt) {
      setError("Custom reminder time should look like 2026-05-25 8:30 AM.");
      return { ...task, reminderAt: null, notificationId: null };
    }

    try {
      const scheduled = await scheduleTaskReminder(task);
      return {
        ...task,
        reminderAt: scheduled.reminderAt,
        notificationId: scheduled.notificationId
      };
    } catch (reminderError) {
      const message = reminderError instanceof Error ? reminderError.message : "Reminder scheduling failed.";
      setError(message);
      return { ...task, reminderAt, notificationId: null };
    }
  }, []);

  const addTask = useCallback(
    async (input: TaskInput) => {
      try {
        setError(null);
        const now = new Date().toISOString();
        const task: Task = {
          id: createId("task"),
          ...normalizeTask(input),
          status: "pending",
          subtasks: [],
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          notificationId: null
        };
        const taskWithReminder = await applyReminder(task);

        persistTasks([...tasks, taskWithReminder]);
        return taskWithReminder;
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task save failed.";
        setError(message);
        throw taskError;
      }
    },
    [applyReminder, persistTasks, tasks]
  );

  const updateTask = useCallback(
    async (id: string, input: TaskUpdateInput) => {
      try {
        setError(null);
        const task = tasks.find((item) => item.id === id);
        if (!task) {
          throw new Error("Task not found.");
        }

        await cancelExistingReminder(task);

        const now = new Date().toISOString();
        const nextStatus = input.status ?? task.status;
        const normalizedInput = normalizeTask({
          title: input.title ?? task.title,
          dueDate: input.dueDate ?? task.dueDate,
          dueTime: input.dueTime ?? task.dueTime,
          priority: input.priority ?? task.priority,
          category: input.category ?? task.category,
          description: input.description ?? task.description,
          reminderOption: input.reminderOption ?? task.reminderOption,
          reminderAt: input.reminderAt !== undefined ? input.reminderAt : task.reminderAt
        });
        const nextTask: Task = {
          ...task,
          ...normalizedInput,
          status: nextStatus,
          completedAt: nextStatus === "completed" ? task.completedAt ?? now : null,
          notificationId: null,
          updatedAt: now
        };
        const taskWithReminder = await applyReminder(nextTask);

        persistTasks(tasks.map((item) => (item.id === id ? taskWithReminder : item)));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task update failed.";
        setError(message);
        throw taskError;
      }
    },
    [applyReminder, cancelExistingReminder, persistTasks, tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const task = tasks.find((item) => item.id === id);
        await cancelExistingReminder(task);
        persistTasks(tasks.filter((item) => item.id !== id));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task delete failed.";
        setError(message);
        throw taskError;
      }
    },
    [cancelExistingReminder, persistTasks, tasks]
  );

  const completeTask = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const now = new Date().toISOString();
        const task = tasks.find((item) => item.id === id);
        await cancelExistingReminder(task);
        persistTasks(
          tasks.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "completed",
                  completedAt: item.completedAt ?? now,
                  notificationId: null,
                  updatedAt: now
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
    [cancelExistingReminder, persistTasks, tasks]
  );

  const markTaskPending = useCallback(
    async (id: string) => {
      try {
        setError(null);
        const task = tasks.find((item) => item.id === id);
        if (!task) {
          throw new Error("Task not found.");
        }

        const nextTask = await applyReminder({
          ...task,
          status: "pending",
          completedAt: null,
          notificationId: null,
          updatedAt: new Date().toISOString()
        });

        persistTasks(tasks.map((item) => (item.id === id ? nextTask : item)));
      } catch (taskError) {
        const message = taskError instanceof Error ? taskError.message : "Task update failed.";
        setError(message);
        throw taskError;
      }
    },
    [applyReminder, persistTasks, tasks]
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

  const mutateSubtasks = useCallback(
    async (taskId: string, updater: (subtasks: Subtask[]) => Subtask[]) => {
      await runTaskMutation((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                subtasks: updater(task.subtasks),
                updatedAt: new Date().toISOString()
              }
            : task
        )
      );
    },
    [runTaskMutation]
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        setError("Subtask title is required.");
        return;
      }
      await mutateSubtasks(taskId, (subtasks) => [...subtasks, { id: createId("subtask"), title: cleanTitle, completed: false }]);
    },
    [mutateSubtasks]
  );

  const updateSubtask = useCallback(
    async (taskId: string, subtaskId: string, title: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        setError("Subtask title is required.");
        return;
      }
      await mutateSubtasks(taskId, (subtasks) => subtasks.map((subtask) => (subtask.id === subtaskId ? { ...subtask, title: cleanTitle } : subtask)));
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

  const todayTasks = useMemo(() => tasks.filter((task) => task.dueDate === todayKey() && isActiveTask(task)).sort(sortTasksForToday), [tasks]);
  const completedHistoryTasks = useMemo(() => {
    const today = new Date(todayKey()).getTime();
    const oldest = today - 2 * 86400000;

    return tasks
      .filter((task) => {
        const completedKey = completionDateKey(task);
        if (!completedKey) {
          return false;
        }
        const completedTime = new Date(completedKey).getTime();
        return completedTime >= oldest && completedTime <= today;
      })
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  }, [tasks]);

  const value = useMemo<AppState>(() => {
    const pending = todayTasks.length;
    const completed = tasks.filter((task) => completionDateKey(task) === todayKey()).length;

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
        pending
      },
      getTask: (id: string) => tasks.find((task) => task.id === id),
      getTasksForDate: (dateKey: string) => tasks.filter((task) => task.dueDate === dateKey).sort(sortTasksForToday),
      addTask,
      updateTask,
      deleteTask,
      completeTask,
      markTaskPending,
      toggleTaskStatus,
      addSubtask,
      updateSubtask,
      toggleSubtask,
      deleteSubtask
    };
  }, [
    addSubtask,
    addTask,
    completeTask,
    completedHistoryTasks,
    deleteSubtask,
    deleteTask,
    error,
    loading,
    markTaskPending,
    setThemeMode,
    signIn,
    signOut,
    tasks,
    themeModeState,
    todayTasks,
    toggleSubtask,
    toggleTaskStatus,
    updateSubtask,
    updateTask,
    updateUserName,
    user
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
