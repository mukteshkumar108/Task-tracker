import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, ChevronLeft, Clock3, Edit3, LayoutList, MoreVertical, PencilLine, Plus, Tag, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell, CheckMark, IconButton, MetaRow, PrimaryButton, StatusPill } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { formatDateLabel } from "@/data/tasks";
import { goBackOrReplace } from "@/lib/navigation";

export default function TaskDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    colors,
    user,
    loading,
    error,
    clearError,
    getTask,
    deleteTask,
    completeTask,
    markTaskPending,
    addSubtask,
    updateSubtask,
    toggleSubtask,
    deleteSubtask
  } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
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

  const handleAddSubtask = async () => {
    if (!task) {
      return;
    }
    await addSubtask(task.id, newSubtask);
    setNewSubtask("");
  };

  const handleSaveSubtask = async (subtaskId: string) => {
    if (!task) {
      return;
    }
    await updateSubtask(task.id, subtaskId, editingTitle);
    setEditingSubtask(null);
    setEditingTitle("");
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
              width: 206,
              borderRadius: radii.md,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              padding: 8,
              gap: 4,
              boxShadow: `0 12px 28px ${colors.shadow}`
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
              justifyContent: "center"
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
          <MetaRow icon={CalendarDays} label="Due Date" value={formatDateLabel(task.dueDate)} />
          <MetaRow icon={Clock3} label="Due Time" value={task.dueTime} />
          <MetaRow icon={Tag} label="Priority" value={task.priority} valueColor={task.priority === "High" ? colors.red : colors.greenDark} />
          <MetaRow icon={LayoutList} label="Category / Project" value={task.category} />
        </View>

        <View style={{ height: 1, backgroundColor: colors.line }} />

        <View style={{ gap: 12 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
            Description
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            {task.description || "No description yet."}
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colors.line }} />

        <View style={{ gap: 12 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
            Subtasks
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radii.md,
              borderCurve: "continuous",
              overflow: "hidden",
              backgroundColor: colors.surface
            }}
          >
            {task.subtasks.length === 0 ? (
              <View style={{ minHeight: 48, paddingHorizontal: 17, justifyContent: "center" }}>
                <Text selectable style={{ color: colors.muted, fontSize: 14 }}>
                  No subtasks yet.
                </Text>
              </View>
            ) : (
              task.subtasks.map((subtask, index) => {
                const isEditing = editingSubtask === subtask.id;
                return (
                  <View
                    key={subtask.id}
                    style={{
                      minHeight: 48,
                      paddingHorizontal: 17,
                      paddingVertical: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderBottomWidth: index === task.subtasks.length - 1 ? 0 : 1,
                      borderBottomColor: colors.line
                    }}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: subtask.completed }}
                      accessibilityLabel={`Toggle subtask ${subtask.title}`}
                      onPress={() => toggleSubtask(task.id, subtask.id)}
                    >
                      <CheckMark checked={subtask.completed} size={20} />
                    </Pressable>
                    {isEditing ? (
                      <TextInput
                        value={editingTitle}
                        onChangeText={setEditingTitle}
                        autoFocus
                        style={{
                          flex: 1,
                          minHeight: 38,
                          color: colors.text,
                          borderWidth: 1,
                          borderColor: colors.line,
                          borderRadius: radii.sm,
                          paddingHorizontal: 10
                        }}
                      />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit subtask ${subtask.title}`}
                        onPress={() => {
                          setEditingSubtask(subtask.id);
                          setEditingTitle(subtask.title);
                        }}
                        style={{ flex: 1 }}
                      >
                        <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                          {subtask.title}
                        </Text>
                      </Pressable>
                    )}
                    {isEditing ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Save subtask ${subtask.title}`} onPress={() => handleSaveSubtask(subtask.id)}>
                        <Text selectable style={{ color: colors.greenDark, fontSize: 13, fontWeight: "900" }}>
                          Save
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={`Delete subtask ${subtask.title}`} onPress={() => deleteSubtask(task.id, subtask.id)}>
                      <Trash2 size={17} color={colors.muted} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              value={newSubtask}
              onChangeText={setNewSubtask}
              placeholder="Add subtask"
              placeholderTextColor={colors.muted}
              style={{
                flex: 1,
                height: 46,
                borderRadius: radii.sm,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.line,
                color: colors.text,
                paddingHorizontal: 14
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add subtask"
              onPress={handleAddSubtask}
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                borderCurve: "continuous",
                backgroundColor: colors.green,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Plus size={22} color={colors.surface} />
            </Pressable>
          </View>
        </View>

        {task.status === "completed" ? (
          <View
            style={{
              minHeight: 58,
              borderRadius: 17,
              borderCurve: "continuous",
              backgroundColor: colors.blueSoft,
              alignItems: "center",
              justifyContent: "center"
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
