import { useRouter } from "expo-router";
import { CalendarDays, Camera, ChevronDown, Clock3, Image as ImageIcon, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { MemoryDetailModal } from "@/components/memory-detail-modal";
import { AppShell, BottomNav, CheckMark, EmptyCircle, IconButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { formatDateLabel, formatMonthTitle, formatTimeFromIso, parseDateKey, todayKey, type ProofEntry, type Task } from "@/data/tasks";

const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

function hasValidProjectBasics(task: { name: string; scheduleMode: string; fixedTime?: string | null }) {
  const name = task.name.trim();
  return Boolean(name && !name.toLowerCase().startsWith("untitled") && (task.scheduleMode !== "fixed" || task.fixedTime?.trim()));
}

function TaskTimelineCard({ task }: { task: Task }) {
  const router = useRouter();
  const { colors } = useAppState();
  const completed = task.status === "completed";

  return (
    <Pressable
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
        opacity: pressed ? 0.72 : 1,
      })}
    >
      {completed ? <CheckMark checked /> : <EmptyCircle />}
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text selectable numberOfLines={1} style={{ color: completed ? colors.muted : colors.text, fontSize: 15, fontWeight: "700" }}>
          {task.title}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          {completed && task.completedAt ? `Completed ${formatTimeFromIso(task.completedAt)}` : `Due ${task.dueTime}`}
        </Text>
      </View>
      <View
        style={{
          minWidth: 58,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: radii.sm,
          borderCurve: "continuous",
          backgroundColor: completed ? colors.greenSoft : colors.orangeSoft,
          alignItems: "center",
        }}
      >
        <Text selectable style={{ color: completed ? colors.greenDark : colors.orange, fontSize: 12, fontWeight: "800" }}>
          {completed ? "Done" : "Open"}
        </Text>
      </View>
    </Pressable>
  );
}

function ProofMemoryCard({ entry, onPress }: { entry: ProofEntry; onPress: () => void }) {
  const { colors } = useAppState();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open memory for ${entry.projectName}`}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radii.md,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: 12,
        flexDirection: "row",
        gap: 12,
        opacity: pressed ? 0.76 : 1,
      })}
    >
      <Image source={{ uri: entry.photoUri }} style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: colors.faint }} />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Camera size={16} color={colors.greenDark} strokeWidth={2.2} />
          <Text selectable numberOfLines={1} style={{ flex: 1, color: colors.ink, fontSize: 15, fontWeight: "900" }}>
            {entry.projectName || entry.title}
          </Text>
        </View>
        <Text selectable style={{ color: colors.greenDark, fontSize: 12, fontWeight: "800" }}>
          Streak: {entry.streakAtCompletion} day{entry.streakAtCompletion === 1 ? "" : "s"}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
          Completed at {entry.time}
        </Text>
        {entry.note || entry.description ? (
          <Text selectable numberOfLines={2} style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
            {entry.note || entry.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    colors,
    user,
    loading,
    tasks,
    proofEntries,
    proofTasks,
    getTasksForDate,
    getProofEntriesForDate,
    getMissedProofTasksForDate,
    getPendingProofTasksForDate,
  } = useAppState();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [visibleMonth, setVisibleMonth] = useState(parseDateKey(todayKey()));
  const [selectedMemory, setSelectedMemory] = useState<ProofEntry | null>(null);
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const selectedTasks = getTasksForDate(selectedDate);
  const selectedProofEntries = getProofEntriesForDate(selectedDate);
  const selectedMissedProofTasks = getMissedProofTasksForDate(selectedDate);
  const selectedPendingProofTasks = getPendingProofTasksForDate(selectedDate).filter((task) => selectedDate === todayKey());
  const selectedCount = selectedTasks.length + selectedProofEntries.length + selectedMissedProofTasks.length + selectedPendingProofTasks.length;
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const group = grouped.get(task.dueDate) ?? [];
      group.push(task);
      grouped.set(task.dueDate, group);
    });
    return grouped;
  }, [tasks]);
  const proofsByDate = useMemo(() => {
    const grouped = new Map<string, ProofEntry[]>();
    proofEntries
      .filter((entry) => !entry.hiddenAt)
      .forEach((entry) => {
      const group = grouped.get(entry.date) ?? [];
      group.push(entry);
      grouped.set(entry.date, group);
    });
    return grouped;
  }, [proofEntries]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 38 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 16, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ width: 40, height: 40 }} />
            <Pressable onPress={() => setVisibleMonth(parseDateKey(todayKey()))} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                {formatMonthTitle(visibleMonth)}
              </Text>
              <ChevronDown size={18} color={colors.ink} strokeWidth={2} />
            </Pressable>
            <IconButton accessibilityLabel="Today" onPress={() => setSelectedDate(todayKey())}>
              <CalendarDays size={22} color={colors.ink} strokeWidth={2} />
            </IconButton>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 14 }}>
              <LegendDot color={colors.green} label="Completed" />
              <LegendDot color={colors.red} label="Missed" />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <ImageIcon size={13} color={colors.greenDark} strokeWidth={2.2} />
                <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
                  Memory
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row" }}>
              {weekDays.map((day) => (
                <Text key={day} selectable style={{ flex: 1, textAlign: "center", color: colors.muted, fontSize: 11, fontWeight: "800" }}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 4 }}>
              {monthCells.map((date) => {
                const dateKey = todayKey(date);
                const isSelected = dateKey === selectedDate;
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const dayTasks = tasksByDate.get(dateKey) ?? [];
                const dayProofs = proofsByDate.get(dateKey) ?? [];
                const missedProofCount =
                  dateKey < todayKey()
                    ? proofTasks.filter((task) => {
                        const createdDate = todayKey(new Date(task.createdAt));
                        return hasValidProjectBasics(task) && createdDate <= dateKey && !dayProofs.some((entry) => entry.proofTaskId === task.id || entry.projectId === task.id);
                      }).length
                    : 0;
                const hasCompleted = dayProofs.length > 0 || dayTasks.some((task) => task.status === "completed");
                const hasActiveTasks = dayTasks.some((task) => task.status !== "completed");

                return (
                  <Pressable
                    key={dateKey}
                    onPress={() => {
                      setSelectedDate(dateKey);
                      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                    }}
                    style={{ width: `${100 / 7}%`, alignItems: "center", gap: 2 }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: isSelected ? colors.green : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          color: isSelected ? colors.surface : isCurrentMonth ? colors.ink : colors.muted,
                          fontSize: 14,
                          fontWeight: isSelected ? "900" : "600",
                        }}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                    <View style={{ height: 6, flexDirection: "row", gap: 3, alignItems: "center" }}>
                      {hasCompleted ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green }} /> : null}
                      {missedProofCount > 0 ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.red }} /> : null}
                      {hasActiveTasks ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.orange }} /> : null}
                      {dayProofs.length > 0 ? <ImageIcon size={7} color={colors.greenDark} strokeWidth={2.8} /> : null}
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
              paddingTop: 14,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderColor: colors.line,
              gap: 16,
            }}
          >
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: "center" }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                {formatDateLabel(selectedDate)}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>
                {selectedCount} item{selectedCount === 1 ? "" : "s"}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 132 }}>
              {selectedCount === 0 ? (
              <View
                style={{
                  minHeight: 112,
                  borderRadius: radii.md,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.line,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 18,
                }}
              >
                <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                  No memories on this date
                </Text>
                <Text selectable style={{ color: colors.muted, fontSize: 13, marginTop: 5, textAlign: "center" }}>
                  Add a task or save a project proof.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {selectedProofEntries.map((entry) => (
                  <ProofMemoryCard key={entry.id} entry={entry} onPress={() => setSelectedMemory(entry)} />
                ))}

                {selectedTasks.map((task) => (
                  <TaskTimelineCard key={task.id} task={task} />
                ))}

                {[...selectedPendingProofTasks, ...selectedMissedProofTasks].map((task) => {
                  const missed = selectedMissedProofTasks.some((item) => item.id === task.id);

                  return (
                    <View
                      key={`${missed ? "missed" : "pending"}-${task.id}`}
                      style={{
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
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: missed ? colors.red : colors.orange,
                        }}
                      />
                      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                        <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                          {task.name}
                        </Text>
                        <Text selectable style={{ color: missed ? colors.red : colors.orange, fontSize: 12, fontWeight: "800" }}>
                          {missed ? "Missed project proof" : "Proof pending today"}
                        </Text>
                      </View>
                      <Clock3 size={19} color={missed ? colors.red : colors.orange} strokeWidth={2.1} />
                    </View>
                  );
                })}
              </View>
            )}
            </ScrollView>
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
            boxShadow: "0 12px 25px rgba(33, 147, 95, 0.30)",
          })}
        >
          <Plus size={31} color={colors.surface} strokeWidth={2.2} />
        </Pressable>

        <BottomNav active="calendar" />
        <MemoryDetailModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
      </View>
    </AppShell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useAppState();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}
