import { useLocalSearchParams, useRouter } from "expo-router";
import { BriefcaseBusiness, ChevronLeft, MoreVertical, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppShell, CheckMark, EmptyCircle, IconButton, SoftButton, StatusPill } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { overviewItems, type Task } from "@/data/tasks";
import { goBackOrReplace } from "@/lib/navigation";

function slugArea(area: string) {
  return area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ProjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { colors, user, loading, tasks } = useAppState();
  const [tab, setTab] = useState<"tasks" | "overview">("tasks");
  const contentWidth = Math.max(300, Math.min(width, 430) - 48);
  const visibleTasks = useMemo(() => {
    if (!id || id === "all") {
      return tasks;
    }
    return tasks.filter((task) => task.area && slugArea(task.area) === id);
  }, [id, tasks]);
  const projectName = id === "all" || !id ? "All Tasks" : visibleTasks[0]?.area ?? "Area";
  const completed = visibleTasks.filter((task) => task.status === "completed").length;
  const progress = visibleTasks.length ? Math.round((completed / visibleTasks.length) * 100) : 0;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  return (
    <AppShell scroll={false}>
      <View style={{ width: contentWidth, alignSelf: "center", flex: 1, minHeight: 820, paddingTop: 44, paddingBottom: 30, gap: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton accessibilityLabel="Back" onPress={() => goBackOrReplace(router, "/home")}>
            <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <IconButton accessibilityLabel="Project options">
            <MoreVertical size={25} color={colors.ink} strokeWidth={2} />
          </IconButton>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
          <View
            style={{
              width: 108,
              height: 108,
              borderRadius: 13,
              borderCurve: "continuous",
              backgroundColor: colors.violetSoft,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <BriefcaseBusiness size={49} color={colors.violet} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
              {projectName}
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}>
              {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.violetSoft, overflow: "hidden" }}>
                <View style={{ width: `${progress}%`, height: "100%", borderRadius: 3, backgroundColor: colors.violet }} />
              </View>
              <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                {progress}%
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            height: 48,
            padding: 4,
            borderRadius: radii.sm,
            borderCurve: "continuous",
            backgroundColor: colors.faint,
            flexDirection: "row"
          }}
        >
          {(["tasks", "overview"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setTab(item)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                borderCurve: "continuous",
                backgroundColor: tab === item ? colors.surface : "transparent",
                boxShadow: tab === item ? "0 3px 9px rgba(18, 25, 38, 0.05)" : "none"
              }}
            >
              <Text selectable style={{ color: tab === item ? colors.violet : colors.muted, fontSize: 14, fontWeight: "800" }}>
                {item === "tasks" ? "Tasks" : "Overview"}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "tasks" ? (
          <View style={{ gap: 14, flex: 1 }}>
            {visibleTasks.length === 0 ? (
              <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
                No tasks here yet.
              </Text>
            ) : (
              visibleTasks.map((task: Task) => (
                <Pressable
                  accessibilityRole="button"
                  key={task.id}
                  onPress={() => router.push(`/task/${task.id}`)}
                  style={({ pressed }) => ({
                    minHeight: 62,
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
                    boxShadow: "0 4px 14px rgba(18, 25, 38, 0.04)"
                  })}
                >
                  {task.status === "completed" ? <CheckMark checked /> : <EmptyCircle />}
                  <Text selectable numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" }}>
                    {task.title}
                  </Text>
                  <StatusPill status={task.status} />
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={{ gap: 14, flex: 1 }}>
            {overviewItems.map((item) => {
              const Icon = item.icon;
              return (
                <View
                  key={item.label}
                  style={{
                    minHeight: 68,
                    borderRadius: radii.md,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14
                  }}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" }}>
                    <Icon size={20} color={colors.blue} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>
                      {item.label}
                    </Text>
                    <Text selectable style={{ color: colors.muted, fontSize: 13 }}>
                      {item.value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <SoftButton label="Add Task" icon={<Plus size={22} color={colors.violet} strokeWidth={2.2} />} onPress={() => router.push("/task-form" as never)} />
      </View>
    </AppShell>
  );
}
