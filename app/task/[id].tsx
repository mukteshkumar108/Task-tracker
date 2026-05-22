import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, ChevronLeft, Clock3, LayoutList, MoreVertical, PencilLine, Tag } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppShell, CheckMark, IconButton, MetaRow, PrimaryButton, StatusPill } from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { tasks } from "@/data/tasks";

export default function TaskDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useMemo(() => tasks.find((item) => item.id === id) ?? tasks[0], [id]);
  const [completed, setCompleted] = useState(task.status === "completed");
  const contentWidth = Math.max(300, Math.min(width, 430) - 48);

  return (
    <AppShell>
      <View style={{ width: contentWidth, alignSelf: "center", minHeight: 820, paddingTop: 36, paddingBottom: 30, gap: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton onPress={() => router.back()}>
            <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <IconButton>
            <MoreVertical size={25} color={colors.ink} strokeWidth={2} />
          </IconButton>
        </View>

        <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 13,
              borderCurve: "continuous",
              backgroundColor: colors.greenSoft,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <PencilLine size={47} color={colors.greenDark} strokeWidth={2.3} />
            <View style={{ width: 29, height: 4, borderRadius: 3, backgroundColor: colors.greenDark, marginTop: 6 }} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "900" }}>
              {task.title}
            </Text>
            <View style={{ alignSelf: "flex-start" }}>
              <StatusPill status={completed ? "completed" : task.status} />
            </View>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <MetaRow icon={CalendarDays} label="Due Date" value={task.dueDate} />
          <MetaRow icon={Clock3} label="Time" value={task.time} />
          <MetaRow icon={Tag} label="Priority" value={task.priority} valueColor={task.priority === "High" ? colors.red : colors.greenDark} />
          <MetaRow icon={LayoutList} label="Project" value={task.project} />
        </View>

        <View style={{ height: 1, backgroundColor: colors.line }} />

        <View style={{ gap: 12 }}>
          <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
            Description
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
            {task.description}
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
            {task.subtasks.map((subtask, index) => (
              <Pressable
                key={subtask.title}
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingHorizontal: 17,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderBottomWidth: index === task.subtasks.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  opacity: pressed ? 0.72 : 1
                })}
              >
                <CheckMark checked={subtask.done || (completed && index > 1)} size={20} />
                <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {subtask.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <PrimaryButton label={completed ? "Completed" : "Mark as Completed"} onPress={() => setCompleted(true)} />
      </View>
    </AppShell>
  );
}
