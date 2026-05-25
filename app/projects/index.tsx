import { useRouter } from "expo-router";
import { Folder, Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { MemoryDetailModal } from "@/components/memory-detail-modal";
import { PhotoProofModal } from "@/components/photo-proof-modal";
import { ProjectAvatar } from "@/components/project-avatar";
import { ProjectEditorModal } from "@/components/project-editor-modal";
import { AppShell, BottomNav } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { todayKey, type ProofEntry, type ProofTask } from "@/data/tasks";

function scheduleText(project: ProofTask) {
  return project.scheduleMode === "fixed" && project.fixedTime ? `Fixed time - ${project.fixedTime}` : "Anytime today";
}

const webSafeButtonRole = process.env.EXPO_OS === "web" ? undefined : "button";

export default function ProjectsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    colors,
    user,
    loading,
    error,
    clearError,
    proofProjects,
    addProofProject,
    getProjectMemories,
    getProofProjectStatusForDate,
  } = useAppState();
  const [createOpen, setCreateOpen] = useState(false);
  const [proofProject, setProofProject] = useState<ProofTask | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<ProofEntry | null>(null);
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const projects = proofProjects;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 44 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 18, flex: 1 }}>
          <View style={{ alignItems: "center", justifyContent: "center", minHeight: 40 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              Projects
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 3 }}>
              Discipline folders
            </Text>
          </View>

          {error ? (
            <Pressable onPress={clearError} style={{ borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: colors.orangeSoft, padding: 12 }}>
              <Text selectable style={{ color: colors.orange, fontWeight: "800", fontSize: 13 }}>
                {error}
              </Text>
            </Pressable>
          ) : null}

          {projects.length === 0 ? (
            <View
              style={{
                minHeight: 230,
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
              <Folder size={42} color={colors.green} strokeWidth={2} />
              <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 16 }}>
                No projects yet
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 7 }}>
                Create a folder for any daily discipline you want to prove with photos.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 112 }}>
              {projects.map((project) => {
                const memories = getProjectMemories(project.id);
                const latestMemory = memories[0];
                const status = getProofProjectStatusForDate(project.id, todayKey());
                const statusTone = status === "completed" ? colors.greenDark : status === "missed" ? colors.red : colors.orange;
                const statusBg = status === "completed" ? colors.greenSoft : status === "missed" ? "rgba(255,60,66,0.10)" : colors.orangeSoft;
                const todayMemory = memories.find((memory) => memory.date === todayKey());
                const actionLabel = status === "completed" && todayMemory ? "View Memory" : status === "completed" ? "Open Project" : "Add Today's Proof";

                return (
                  <View
                    key={project.id}
                    style={{
                      borderRadius: radii.md,
                      borderCurve: "continuous",
                      borderWidth: 1,
                      borderColor: colors.line,
                      backgroundColor: colors.surface,
                      padding: 15,
                      gap: 14,
                    }}
                  >
                    <Pressable
                      accessibilityRole={webSafeButtonRole}
                      accessibilityLabel={`Open ${project.name} project`}
                      onPress={() => router.push(`/projects/${project.id}` as never)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        gap: 13,
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <ProjectAvatar project={project} photoUri={latestMemory?.photoUri ?? project.latestPhotoUri} />
                      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                        <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 19, fontWeight: "900" }}>
                          {project.name}
                        </Text>
                        <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
                          {project.area || "No area"} - {scheduleText(project)}
                        </Text>
                        <Text selectable style={{ color: colors.greenDark, fontSize: 12, fontWeight: "900" }}>
                          Streak: {project.currentStreak} day{project.currentStreak === 1 ? "" : "s"} - {memories.length} memor
                          {memories.length === 1 ? "y" : "ies"}
                        </Text>
                      </View>
                    </Pressable>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View
                        style={{
                          borderRadius: radii.pill,
                          borderCurve: "continuous",
                          backgroundColor: statusBg,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                        }}
                      >
                        <Text selectable style={{ color: statusTone, fontSize: 12, fontWeight: "900" }}>
                          Today: {status[0].toUpperCase() + status.slice(1)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <Pressable
                        accessibilityRole={webSafeButtonRole}
                        accessibilityLabel={`${actionLabel} for ${project.name}`}
                        onPress={() => {
                          if (status !== "completed") {
                            setProofProject(project);
                          } else if (todayMemory) {
                            setSelectedMemory(todayMemory);
                          } else {
                            router.push(`/projects/${project.id}` as never);
                          }
                        }}
                        style={({ pressed }) => ({
                          minHeight: 38,
                          borderRadius: radii.pill,
                          borderCurve: "continuous",
                          backgroundColor: status !== "completed" ? colors.green : colors.greenSoft,
                          paddingHorizontal: 13,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.78 : 1,
                        })}
                      >
                        <Text selectable style={{ color: status !== "completed" ? colors.surface : colors.greenDark, fontSize: 12, fontWeight: "900" }}>
                          {actionLabel}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create project"
          onPress={() => setCreateOpen(true)}
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

        <BottomNav active="projects" />
        <MemoryDetailModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
        <ProjectEditorModal
          open={createOpen}
          title="Create Project"
          submitLabel="Create Project"
          duplicateProjects={proofProjects}
          onClose={() => setCreateOpen(false)}
          onSubmit={addProofProject}
          onOpenDuplicate={(project) => {
            setCreateOpen(false);
            router.push(`/projects/${project.id}` as never);
          }}
        />
        <PhotoProofModal project={proofProject} onClose={() => setProofProject(null)} />
      </View>
    </AppShell>
  );
}
