import { useRouter } from "expo-router";
import { CalendarDays, CheckCircle2, Folder, TimerReset } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { AppShell, CheckMark, StatusPill } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { completionDateKey, formatDateLabel, formatTimeFromIso, sectionLabelForDate, type Task } from "@/data/tasks";

export default function TasksHistoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, user, loading, completedHistoryTasks } = useAppState();
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    completedHistoryTasks.forEach((task) => {
      const key = completionDateKey(task);
      if (!key) {
        return;
      }
      const group = groups.get(key) ?? [];
      group.push(task);
      groups.set(key, group);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [completedHistoryTasks]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 44 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 24, flex: 1 }}>
          <View style={{ alignItems: "center", justifyContent: "center", minHeight: 40 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              Task History
            </Text>
          </View>

          {grouped.length === 0 ? (
            <View
              style={{
                minHeight: 210,
                borderRadius: radii.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <CheckCircle2 size={42} color={colors.green} strokeWidth={2} />
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 16 }}>
                No completed tasks yet
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 7 }}>
                Complete normal tasks and they will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 22, paddingBottom: 110 }}>
              {grouped.map(([dateKey, group]) => (
                <View key={dateKey} style={{ gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                      {sectionLabelForDate(dateKey)}
                    </Text>
                    <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
                      {group.length} task{group.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  {group.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => router.push(`/task/${task.id}`)}
                      style={({ pressed }) => ({
                        borderRadius: radii.md,
                        borderCurve: "continuous",
                        borderWidth: 1,
                        borderColor: colors.line,
                        backgroundColor: colors.surface,
                        padding: 15,
                        gap: 12,
                        opacity: pressed ? 0.72 : 1,
                      })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <CheckMark checked />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>
                            {task.title}
                          </Text>
                          <Text selectable style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                            Due {task.dueTime}
                          </Text>
                        </View>
                        <StatusPill status={task.status} />
                      </View>
                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
                          <CalendarDays size={15} color={colors.muted} />
                          <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                            Original date {formatDateLabel(task.dueDate)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
                          <TimerReset size={15} color={colors.muted} />
                          <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                            Completed {formatDateLabel(dateKey)} at {formatTimeFromIso(task.completedAt)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
                          <Folder size={15} color={colors.muted} />
                          <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                            Area: {task.area || "None"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </AppShell>
  );
}
