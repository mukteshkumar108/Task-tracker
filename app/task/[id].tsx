import { useLocalSearchParams, useRouter } from "expo-router";
import { Bell, CalendarDays, CheckCircle2, ChevronLeft, Clock3, Edit3, Folder, MoreVertical, PencilLine, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppShell, CheckMark, IconButton, MetaRow, PrimaryButton, StatusPill } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { formatDateLabel, frequencyLabel, formatTimeFromIso } from "@/data/tasks";
import { goBackOrReplace } from "@/lib/navigation";

export default function TaskDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, user, loading, error, clearError, getTask, deleteTask, completeTask, markTaskPending } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const contentWidth = Math.max(300, Math.min(width, 430) - 48);
  const task = id ? getTask(id) : undefined;
  const iconTone = task?.status === "completed" ? colors.blue : task?.status === "pending" ? colors.orange : colors.green;
  const iconBg = task?.status === "completed" ? colors.blueSoft : task?.status === "pending" ? colors.orangeSoft : colors.greenSoft;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const handleDelete = async () => {
    if (!task) {
      return;
    }
    await deleteTask(task.id);
    setMenuOpen(false);
    router.replace("/home");
  };

  if (loading) {
    return (
      <AppShell>
        <View style={{ width: contentWidth, alignSelf: "center", paddingTop: 52 }}>
          <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
            Loading task...
          </Text>
        </View>
      </AppShell>
    );
  }

  if (!task) {
    return (
      <AppShell>
        <View style={{ width: contentWidth, alignSelf: "center", minHeight: 820, paddingTop: 44, gap: 22 }}>
          <IconButton accessibilityLabel="Back" onPress={() => goBackOrReplace(router, "/home")}>
            <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <Text selectable style={{ color: colors.ink, fontSize: 22, fontWeight: "900" }}>
            Task not found
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            This task may have been deleted or belongs to another signed-in user.
          </Text>
          <PrimaryButton label="Back to Today" onPress={() => router.replace("/home")} />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View style={{ width: contentWidth, alignSelf: "center", minHeight: 820, paddingTop: 36, paddingBottom: 30, gap: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton accessibilityLabel="Back" onPress={() => goBackOrReplace(router, "/home")}>
            <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <IconButton accessibilityLabel="Task options" onPress={() => setMenuOpen((open) => !open)}>
            <MoreVertical size={25} color={colors.ink} strokeWidth={2} />
          </IconButton>
        </View>

        {menuOpen ? (
          <View
            style={{
              position: "absolute",
              top: 78,
              right: 24,
              zIndex: 3,
              width: 220,
              borderRadius: radii.md,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              padding: 8,
              gap: 4,
              boxShadow: `0 12px 28px ${colors.shadow}`,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit task"
              onPress={() => {
                setMenuOpen(false);
                router.push(`/task-form?id=${task.id}` as never);
              }}
              style={{ minHeight: 42, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Edit3 size={18} color={colors.ink} />
              <Text selectable style={{ color: colors.text, fontWeight: "800" }}>
                Edit task
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={task.status === "completed" ? "Mark as pending" : "Mark as completed"}
              onPress={async () => {
                if (task.status === "completed") {
                  await markTaskPending(task.id);
                } else {
                  await completeTask(task.id);
                  router.replace("/home");
                }
                setMenuOpen(false);
              }}
              style={{ minHeight: 42, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <CheckMark checked={task.status !== "completed"} size={18} />
              <Text selectable style={{ color: colors.text, fontWeight: "800" }}>
                Mark as {task.status === "completed" ? "pending" : "completed"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete task"
              onPress={handleDelete}
              style={{ minHeight: 42, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Trash2 size={18} color={colors.red} />
              <Text selectable style={{ color: colors.red, fontWeight: "900" }}>
                Delete task
              </Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <Pressable onPress={clearError} style={{ borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: colors.orangeSoft, padding: 12 }}>
            <Text selectable style={{ color: colors.orange, fontWeight: "800", fontSize: 13 }}>
              {error}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 13,
              borderCurve: "continuous",
              backgroundColor: iconBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PencilLine size={47} color={iconTone} strokeWidth={2.3} />
            <View style={{ width: 29, height: 4, borderRadius: 3, backgroundColor: iconTone, marginTop: 6 }} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "900" }}>
              {task.title}
            </Text>
            <View style={{ alignSelf: "flex-start" }}>
              <StatusPill status={task.status} />
            </View>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <MetaRow icon={CalendarDays} label="Date" value={formatDateLabel(task.dueDate)} />
          <MetaRow icon={Bell} label="Reminder starts" value={task.reminderStartTime || "No reminder"} />
          <MetaRow icon={Clock3} label="Alarm time" value={task.dueTime} />
          <MetaRow icon={Bell} label="Reminder frequency" value={frequencyLabel(task.reminderFrequency, task.customReminderMinutes)} />
          <MetaRow icon={Folder} label="Area" value={task.area || "None"} />
        </View>

        <View style={{ height: 1, backgroundColor: colors.line }} />

        <View style={{ gap: 12 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
            Notes
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            {task.notes || "No notes yet."}
          </Text>
        </View>

        {task.completedAt ? (
          <>
            <View style={{ height: 1, backgroundColor: colors.line }} />
            <MetaRow icon={CheckCircle2} label="Completed" value={formatTimeFromIso(task.completedAt)} valueColor={colors.blue} />
          </>
        ) : null}

        <View style={{ flex: 1 }} />

        {task.status === "completed" ? (
          <View
            style={{
              minHeight: 58,
              borderRadius: 17,
              borderCurve: "continuous",
              backgroundColor: colors.blueSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text selectable style={{ color: colors.blue, fontSize: 16, fontWeight: "900" }}>
              Completed
            </Text>
          </View>
        ) : (
          <PrimaryButton
            label="Mark as Completed"
            onPress={async () => {
              await completeTask(task.id);
              router.replace("/home");
            }}
          />
        )}
      </View>
    </AppShell>
  );
}
