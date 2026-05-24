import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, Camera, CheckCircle2, ChevronLeft, Clock3, Edit3, Flame, Image as ImageIcon, MoreVertical, Trash2, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { MemoryDetailModal } from "@/components/memory-detail-modal";
import { PhotoProofModal } from "@/components/photo-proof-modal";
import { ProjectAvatar } from "@/components/project-avatar";
import { ProjectEditorModal } from "@/components/project-editor-modal";
import { AppShell, IconButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { formatDateLabel, frequencyLabel, todayKey, type ProofEntry, type ProofTask } from "@/data/tasks";

function scheduleText(project: ProofTask) {
  return project.scheduleMode === "fixed" && project.fixedTime ? `Fixed time - ${project.fixedTime}` : "Anytime today";
}

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const {
    colors,
    user,
    loading,
    proofProjects,
    updateProofProject,
    deleteProofProject,
    getProjectMemories,
    getProofProjectStatusForDate,
  } = useAppState();
  const [proofProject, setProofProject] = useState<ProofTask | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<ProofEntry | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const project = proofProjects.find((item) => item.id === id);
  const memories = useMemo(() => (project ? getProjectMemories(project.id) : []), [getProjectMemories, project]);
  const today = todayKey();
  const todayMemory = memories.find((memory) => memory.date === today);
  const status = project ? getProofProjectStatusForDate(project.id, today) : "pending";
  const recentMemories = memories.slice(0, 6);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <AppShell>
        <View style={{ width: contentWidth, alignSelf: "center", paddingTop: 52 }}>
          <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
            Loading project...
          </Text>
        </View>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <View style={{ width: contentWidth, alignSelf: "center", minHeight: 820, paddingTop: 44, gap: 18 }}>
          <IconButton accessibilityLabel="Back" onPress={() => router.replace("/projects" as never)}>
            <ChevronLeft size={28} color={colors.ink} />
          </IconButton>
          <Text selectable style={{ color: colors.ink, fontSize: 22, fontWeight: "900" }}>
            Project not found
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            It may have been removed.
          </Text>
        </View>
      </AppShell>
    );
  }

  const statusColor = status === "completed" ? colors.greenDark : status === "missed" ? colors.red : colors.orange;
  const statusBg = status === "completed" ? colors.greenSoft : status === "missed" ? "rgba(255,60,66,0.10)" : colors.orangeSoft;

  const confirmDelete = () => {
    setMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  const deleteProject = async () => {
    setDeleteConfirmOpen(false);
    await deleteProofProject(project.id);
    router.replace("/projects" as never);
  };

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 38 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 20, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <IconButton accessibilityLabel="Back" onPress={() => router.replace("/projects" as never)}>
              <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
            </IconButton>
            <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 18, fontWeight: "900", maxWidth: contentWidth - 96 }}>
              {project.name}
            </Text>
            <IconButton accessibilityLabel="Project actions" onPress={() => setMenuOpen(true)}>
              <MoreVertical size={23} color={colors.ink} strokeWidth={2.3} />
            </IconButton>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 34 }}>
            <View
              style={{
                borderRadius: radii.md,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
                padding: 16,
                gap: 14,
              }}
            >
              <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                <View
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 18,
                    borderCurve: "continuous",
                    backgroundColor: colors.greenSoft,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <ProjectAvatar project={project} photoUri={memories[0]?.photoUri ?? project.latestPhotoUri} />
                </View>
                <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
                  <Text selectable style={{ color: colors.ink, fontSize: 23, fontWeight: "900" }}>
                    {project.name}
                  </Text>
                  <Text selectable numberOfLines={2} style={{ color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: "700" }}>
                    {project.dailyProofTask}
                  </Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
                    {project.area || "No area"} - {scheduleText(project)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Metric icon={<Flame size={17} color={colors.greenDark} />} label="Streak" value={`${project.currentStreak} day${project.currentStreak === 1 ? "" : "s"}`} />
                <Metric icon={<ImageIcon size={17} color={colors.blue} />} label="Memories" value={`${memories.length}`} />
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                Today's Proof
              </Text>
              <View
                style={{
                  borderRadius: radii.md,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                  padding: 15,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: statusBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 size={20} color={statusColor} />
                    ) : status === "missed" ? (
                      <Clock3 size={20} color={statusColor} />
                    ) : (
                      <Camera size={20} color={statusColor} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                      {status === "completed" ? "Proof saved today" : status === "missed" ? "Missed today" : "Proof pending today"}
                    </Text>
                    <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
                      {todayMemory ? `Completed at ${todayMemory.time}` : scheduleText(project)}
                    </Text>
                  </View>
                </View>

                {todayMemory ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open today's proof"
                    onPress={() => setSelectedMemory(todayMemory)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      opacity: pressed ? 0.76 : 1,
                    })}
                  >
                    <Image source={{ uri: todayMemory.photoUri }} style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: colors.faint }} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text selectable style={{ color: colors.greenDark, fontSize: 13, fontWeight: "900" }}>
                        Streak: {todayMemory.streakAtCompletion} day{todayMemory.streakAtCompletion === 1 ? "" : "s"}
                      </Text>
                      <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                        Tap photo to view memory
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add Photo Proof"
                    onPress={() => setProofProject(project)}
                    style={({ pressed }) => ({
                      minHeight: 52,
                      borderRadius: radii.md,
                      borderCurve: "continuous",
                      backgroundColor: colors.green,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.82 : 1,
                    })}
                  >
                    <Text selectable style={{ color: colors.surface, fontSize: 15, fontWeight: "900" }}>
                      Add Photo Proof
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                Reminder / Alarm
              </Text>
              <View style={{ borderRadius: radii.md, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 15, gap: 10 }}>
                <InfoLine icon={<CalendarDays size={17} color={colors.muted} />} label="Schedule" value={scheduleText(project)} />
                <InfoLine icon={<Clock3 size={17} color={colors.muted} />} label="Reminder" value={frequencyLabel(project.reminderFrequency, project.customReminderMinutes)} />
                {project.scheduleMode === "fixed" ? <InfoLine icon={<Camera size={17} color={colors.muted} />} label="Alarm message" value={project.alarmMessage} /> : null}
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                Recent Memories
              </Text>
              {recentMemories.length === 0 ? (
                <EmptyProjectState text="No proof memories yet." />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {recentMemories.map((memory) => (
                    <Pressable
                      key={memory.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open memory for ${memory.projectName}`}
                      onPress={() => setSelectedMemory(memory)}
                      style={({ pressed }) => ({
                        width: 128,
                        borderRadius: radii.md,
                        borderCurve: "continuous",
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.line,
                        overflow: "hidden",
                        opacity: pressed ? 0.76 : 1,
                      })}
                    >
                      <Image source={{ uri: memory.photoUri }} style={{ width: "100%", height: 132, backgroundColor: colors.faint }} />
                      <View style={{ padding: 9, gap: 4 }}>
                        <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
                          {formatDateLabel(memory.date)}
                        </Text>
                        <Text selectable style={{ color: colors.greenDark, fontSize: 11, fontWeight: "900" }}>
                          {memory.streakAtCompletion} day streak
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900" }}>
                Project History
              </Text>
              {memories.length === 0 ? (
                <EmptyProjectState text="History starts after your first photo proof." />
              ) : (
                <View style={{ gap: 10 }}>
                  {memories.map((memory) => (
                    <Pressable
                      key={`history-${memory.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${memory.date} memory`}
                      onPress={() => setSelectedMemory(memory)}
                      style={({ pressed }) => ({
                        minHeight: 64,
                        borderRadius: radii.md,
                        borderCurve: "continuous",
                        borderWidth: 1,
                        borderColor: colors.line,
                        backgroundColor: colors.surface,
                        padding: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        opacity: pressed ? 0.76 : 1,
                      })}
                    >
                      <Image source={{ uri: memory.photoUri }} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.faint }} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
                          {formatDateLabel(memory.date)}
                        </Text>
                        <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
                          Completed at {memory.time}
                        </Text>
                      </View>
                      <Text selectable style={{ color: colors.greenDark, fontSize: 12, fontWeight: "900" }}>
                        {memory.streakAtCompletion}d
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <PhotoProofModal project={proofProject} onClose={() => setProofProject(null)} />
        <MemoryDetailModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
        <ProjectActionMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onEdit={() => {
            setMenuOpen(false);
            setEditOpen(true);
          }}
          onDelete={confirmDelete}
        />
        <ProjectDeleteConfirmModal
          visible={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onDelete={deleteProject}
        />
        <ProjectEditorModal
          open={editOpen}
          title="Edit Project"
          submitLabel="Save Changes"
          initialProject={project}
          onClose={() => setEditOpen(false)}
          onSubmit={(input) => updateProofProject(project.id, input)}
        />
      </View>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const { colors } = useAppState();
  return (
    <View style={{ flex: 1, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.faint, padding: 12, gap: 7 }}>
      {icon}
      <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
        {value}
      </Text>
      <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
        {label}
      </Text>
    </View>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const { colors } = useAppState();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon}
      <Text selectable style={{ flex: 1, color: colors.muted, fontSize: 13, fontWeight: "700" }}>
        {label}
      </Text>
      <Text selectable numberOfLines={1} style={{ maxWidth: 180, color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

function EmptyProjectState({ text }: { text: string }) {
  const { colors } = useAppState();
  return (
    <View
      style={{
        minHeight: 96,
        borderRadius: radii.md,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <Text selectable style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
        {text}
      </Text>
    </View>
  );
}

function ProjectActionMenu({
  visible,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useAppState();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close project menu"
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(5,10,14,0.42)",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 82,
            right: 18,
            width: 230,
            borderRadius: radii.md,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            padding: 8,
            gap: 2,
          }}
        >
          <ProjectMenuRow icon={<Edit3 size={18} color={colors.ink} />} label="Edit Project" onPress={onEdit} />
          <ProjectMenuRow icon={<Trash2 size={18} color={colors.red} />} label="Delete Project" onPress={onDelete} danger />
        </View>
      </View>
    </Modal>
  );
}

function ProjectDeleteConfirmModal({
  visible,
  onClose,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { colors } = useAppState();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(5,10,14,0.62)", justifyContent: "center", padding: 22 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 390,
            alignSelf: "center",
            borderRadius: 24,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            padding: 18,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255,60,66,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={19} color={colors.red} />
            </View>
            <Text selectable style={{ flex: 1, color: colors.ink, fontSize: 20, fontWeight: "900" }}>
              Delete project?
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel delete project" onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }}>
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>

          <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: "700" }}>
            This will permanently delete this project and all linked proof memories. This cannot be undone.
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel project delete"
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                borderRadius: radii.md,
                borderCurve: "continuous",
                backgroundColor: colors.faint,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.76 : 1,
              })}
            >
              <Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm delete project"
              onPress={onDelete}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                borderRadius: radii.md,
                borderCurve: "continuous",
                backgroundColor: colors.red,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text selectable style={{ color: colors.surface, fontSize: 14, fontWeight: "900" }}>
                Delete Project
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProjectMenuRow({ icon, label, onPress, danger = false }: { icon: ReactNode; label: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useAppState();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        borderRadius: radii.sm,
        borderCurve: "continuous",
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: pressed ? colors.faint : colors.surface,
      })}
    >
      {icon}
      <Text selectable style={{ color: danger ? colors.red : colors.ink, fontSize: 14, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}
