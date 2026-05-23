import { useRouter } from "expo-router";
import { CalendarDays, Camera, Folder, TimerReset } from "lucide-react-native";
import { useEffect, useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { AppShell, BottomNav, CheckMark, StatusPill } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { completionDateKey, formatDateLabel, formatTimeFromIso, sectionLabelForDate, type ProofEntry, type Task } from "@/data/tasks";

type HistoryItem =
  | { type: "task"; id: string; dateKey: string; createdAt: string; task: Task }
  | { type: "proof"; id: string; dateKey: string; createdAt: string; entry: ProofEntry };

export default function TasksHistoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, user, loading, completedHistoryTasks, proofEntries } = useAppState();
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const grouped = useMemo(() => {
    const groups = new Map<string, HistoryItem[]>();

    completedHistoryTasks.forEach((task) => {
      const key = completionDateKey(task);
      if (!key) {
        return;
      }
      const group = groups.get(key) ?? [];
      group.push({ type: "task", id: task.id, dateKey: key, createdAt: task.completedAt ?? task.updatedAt, task });
      groups.set(key, group);
    });

    proofEntries
      .filter((entry) => !entry.hiddenAt)
      .forEach((entry) => {
        const group = groups.get(entry.date) ?? [];
        group.push({ type: "proof", id: entry.id, dateKey: entry.date, createdAt: entry.createdAt, entry });
        groups.set(entry.date, group);
      });

    return Array.from(groups.entries())
      .map(([dateKey, items]) => [dateKey, items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))] as const)
      .sort(([a], [b]) => b.localeCompare(a));
  }, [completedHistoryTasks, proofEntries]);

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
              Task History / Memories
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
              <Camera size={42} color={colors.green} strokeWidth={2} />
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 16 }}>
                No memories yet
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 7 }}>
                Complete tasks or save Proof of Work photos to build your discipline timeline.
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
                      {group.length} item{group.length === 1 ? "" : "s"}
                    </Text>
                  </View>

                  {group.map((item) =>
                    item.type === "proof" ? (
                      <View
                        key={`proof-${item.id}`}
                        style={{
                          borderRadius: radii.md,
                          borderCurve: "continuous",
                          borderWidth: 1,
                          borderColor: colors.line,
                          backgroundColor: colors.surface,
                          padding: 12,
                          flexDirection: "row",
                          gap: 12,
                        }}
                      >
                        <Image source={{ uri: item.entry.photoUri }} style={{ width: 74, height: 74, borderRadius: 15, backgroundColor: colors.faint }} />
                        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Camera size={16} color={colors.greenDark} />
                            <Text selectable numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "900" }}>
                              {item.entry.title}
                            </Text>
                          </View>
                          <Text selectable style={{ color: colors.greenDark, fontSize: 12, fontWeight: "900" }}>
                            Proof streak: {item.entry.streakCount} day{item.entry.streakCount === 1 ? "" : "s"}
                          </Text>
                          <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                            Completed {formatDateLabel(item.entry.date)} at {item.entry.time}
                          </Text>
                          {item.entry.area ? (
                            <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                              Area: {item.entry.area}
                            </Text>
                          ) : null}
                          {item.entry.description ? (
                            <Text selectable numberOfLines={2} style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
                              {item.entry.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        key={`task-${item.id}`}
                        onPress={() => router.push(`/task/${item.task.id}`)}
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
                              {item.task.title}
                            </Text>
                            <Text selectable style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                              Due {item.task.dueTime}
                            </Text>
                          </View>
                          <StatusPill status={item.task.status} />
                        </View>
                        <View style={{ gap: 8 }}>
                          <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
                            <CalendarDays size={15} color={colors.muted} />
                            <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                              Original date {formatDateLabel(item.task.dueDate)}
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
                            <TimerReset size={15} color={colors.muted} />
                            <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                              Completed {formatDateLabel(dateKey)} at {formatTimeFromIso(item.task.completedAt)}
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row", gap: 9, alignItems: "center" }}>
                            <Folder size={15} color={colors.muted} />
                            <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                              Area: {item.task.area || "None"}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    )
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <BottomNav active="tasks" />
      </View>
    </AppShell>
  );
}
