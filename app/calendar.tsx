import { useRouter } from "expo-router";
import { CalendarDays, ChevronDown, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppShell, BottomNav, CheckMark, EmptyCircle, IconButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { formatDateLabel, formatMonthTitle, parseDateKey, todayKey, type Task, type TaskPriority } from "@/data/tasks";

const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function priorityColor(priority: TaskPriority, colors: ReturnType<typeof useAppState>["colors"]) {
  if (priority === "High") {
    return colors.violet;
  }
  if (priority === "Medium") {
    return colors.orange;
  }
  return colors.blue;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { colors } = useAppState();
  const color = priorityColor(priority, colors);
  const background = priority === "High" ? colors.violetSoft : priority === "Medium" ? colors.orangeSoft : colors.blueSoft;

  return (
    <View
      style={{
        minWidth: 56,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: radii.sm,
        borderCurve: "continuous",
        backgroundColor: background,
        alignItems: "center"
      }}
    >
      <Text selectable style={{ color, fontSize: 12, fontWeight: "800" }}>
        {priority}
      </Text>
    </View>
  );
}

function buildMonthCells(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export default function CalendarScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, user, loading, tasks, getTasksForDate } = useAppState();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [visibleMonth, setVisibleMonth] = useState(parseDateKey(todayKey()));
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const selectedTasks = getTasksForDate(selectedDate);
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const group = grouped.get(task.dueDate) ?? [];
      group.push(task);
      grouped.set(task.dueDate, group);
    });
    return grouped;
  }, [tasks]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 44 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 24, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ width: 40, height: 40 }} />
            <Pressable
              onPress={() => setVisibleMonth(parseDateKey(todayKey()))}
              style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
            >
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                {formatMonthTitle(visibleMonth)}
              </Text>
              <ChevronDown size={18} color={colors.ink} strokeWidth={2} />
            </Pressable>
            <IconButton accessibilityLabel="Today" onPress={() => setSelectedDate(todayKey())}>
              <CalendarDays size={22} color={colors.ink} strokeWidth={2} />
            </IconButton>
          </View>

          <View style={{ gap: 18 }}>
            <View style={{ flexDirection: "row" }}>
              {weekDays.map((day) => (
                <Text key={day} selectable style={{ flex: 1, textAlign: "center", color: colors.muted, fontSize: 11, fontWeight: "800" }}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 13 }}>
              {monthCells.map((date) => {
                const dateKey = todayKey(date);
                const isSelected = dateKey === selectedDate;
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const dayTasks = tasksByDate.get(dateKey) ?? [];
                const dotTasks = dayTasks.slice(0, 3);

                return (
                  <Pressable
                    key={dateKey}
                    onPress={() => {
                      setSelectedDate(dateKey);
                      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                    }}
                    style={{ width: `${100 / 7}%`, alignItems: "center", gap: 5 }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: isSelected ? colors.green : "transparent",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          color: isSelected ? colors.surface : isCurrentMonth ? colors.ink : colors.muted,
                          fontSize: 15,
                          fontWeight: isSelected ? "900" : "600"
                        }}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                    <View style={{ height: 4, flexDirection: "row", gap: 4 }}>
                      {dotTasks.map((task) => (
                        <View
                          key={task.id}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: task.status === "completed" ? colors.green : priorityColor(task.priority, colors)
                          }}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            style={{
              flex: 1,
              marginHorizontal: -22,
              paddingHorizontal: 22,
              paddingTop: 18,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderColor: colors.line,
              gap: 16
            }}
          >
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: "center" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                Tasks for {formatDateLabel(selectedDate)}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>
                {selectedTasks.length} {selectedTasks.length === 1 ? "task" : "tasks"}
              </Text>
            </View>

            {selectedTasks.length === 0 ? (
              <View style={{ minHeight: 112, borderRadius: radii.md, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", padding: 18 }}>
                <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                  No tasks on this date
                </Text>
                <Text selectable style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>
                  Add one from the green button.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {selectedTasks.map((task) => (
                  <Pressable
                    key={task.id}
                    onPress={() => router.push(`/task/${task.id}`)}
                    style={({ pressed }) => ({
                      minHeight: 66,
                      borderRadius: radii.md,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: colors.line,
                      backgroundColor: colors.surface,
                      paddingHorizontal: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      opacity: pressed ? 0.72 : 1
                    })}
                  >
                    {task.status === "completed" ? <CheckMark checked /> : <EmptyCircle />}
                    <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                      <Text selectable numberOfLines={1} style={{ color: task.status === "completed" ? colors.muted : colors.text, fontSize: 15, fontWeight: "700" }}>
                        {task.title}
                      </Text>
                      <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                        {task.dueTime}
                      </Text>
                    </View>
                    <PriorityBadge priority={task.priority} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add task"
          onPress={() => router.push(`/task-form?dueDate=${selectedDate}` as never)}
          style={({ pressed }) => ({
            position: "absolute",
            right: 22,
            bottom: 92,
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: colors.green,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.78 : 1,
            boxShadow: "0 12px 25px rgba(33, 147, 95, 0.30)"
          })}
        >
          <Plus size={31} color={colors.surface} strokeWidth={2.2} />
        </Pressable>

        <BottomNav active="calendar" />
      </View>
    </AppShell>
  );
}
