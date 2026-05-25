import { useRouter } from "expo-router";
import { Camera, ChevronLeft, Folder, Grid2X2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { MemoryDetailModal } from "@/components/memory-detail-modal";
import { AppShell, IconButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { formatDateLabel, type ProofEntry, type ProofTask } from "@/data/tasks";

export default function MemoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, user, loading, proofProjects, getProjectMemories } = useAppState();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<ProofEntry | null>(null);
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const folders = useMemo(
    () =>
      proofProjects
        .map((project) => ({ project, memories: getProjectMemories(project.id) }))
        .filter((folder) => folder.memories.length > 0)
        .sort((a, b) => (b.memories[0]?.createdAt ?? "").localeCompare(a.memories[0]?.createdAt ?? "")),
    [getProjectMemories, proofProjects]
  );
  const selectedFolder = selectedProjectId ? folders.find((folder) => folder.project.id === selectedProjectId) : null;
  const gridItemWidth = (contentWidth - 10) / 2;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 38 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 22, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <IconButton accessibilityLabel="Back" onPress={() => (selectedFolder ? setSelectedProjectId(null) : router.replace("/home"))}>
              <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
            </IconButton>
            <View style={{ alignItems: "center", gap: 3 }}>
              <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
                {selectedFolder ? selectedFolder.project.name : "Memories"}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
                {selectedFolder ? `${selectedFolder.memories.length} proof memories` : "Your proof of consistency"}
              </Text>
            </View>
            {selectedFolder ? (
              <IconButton accessibilityLabel="Close folder" onPress={() => setSelectedProjectId(null)}>
                <X size={22} color={colors.ink} />
              </IconButton>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {folders.length === 0 ? (
            <View
              style={{
                minHeight: 240,
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
                Complete project proofs with photos to build your consistency albums.
              </Text>
            </View>
          ) : selectedFolder ? (
            <MemoryGrid
              memories={selectedFolder.memories}
              itemWidth={gridItemWidth}
              onSelect={setSelectedMemory}
              project={selectedFolder.project}
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 34 }}>
              {folders.map(({ project, memories }) => (
                <FolderCard key={project.id} project={project} memories={memories} onPress={() => setSelectedProjectId(project.id)} />
              ))}
            </ScrollView>
          )}
        </View>
        <MemoryDetailModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
      </View>
    </AppShell>
  );
}

function FolderCard({ project, memories, onPress }: { project: ProofTask; memories: ProofEntry[]; onPress: () => void }) {
  const { colors } = useAppState();
  const latest = memories[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${project.name} memories`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 108,
        borderRadius: radii.md,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: 13,
        flexDirection: "row",
        gap: 13,
        opacity: pressed ? 0.76 : 1,
      })}
    >
      <View
        style={{
          width: 82,
          height: 82,
          borderRadius: 18,
          borderCurve: "continuous",
          overflow: "hidden",
          backgroundColor: colors.faint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {latest ? <Image source={{ uri: latest.photoUri }} style={{ width: "100%", height: "100%" }} /> : <Folder size={30} color={colors.muted} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
          {project.name}
        </Text>
        <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
          {memories.length} memor{memories.length === 1 ? "y" : "ies"} - Streak: {project.currentStreak} day{project.currentStreak === 1 ? "" : "s"}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
          Last completed {project.lastCompletedDate ? formatDateLabel(project.lastCompletedDate) : "Never"}
        </Text>
      </View>
      <Grid2X2 size={18} color={colors.greenDark} strokeWidth={2.2} />
    </Pressable>
  );
}

function MemoryGrid({
  memories,
  itemWidth,
  onSelect,
}: {
  memories: ProofEntry[];
  itemWidth: number;
  onSelect: (memory: ProofEntry) => void;
  project: ProofTask;
}) {
  const { colors } = useAppState();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {memories.map((memory) => (
          <Pressable
            key={memory.id}
            accessibilityRole="button"
            accessibilityLabel={`Open memory for ${memory.projectName}`}
            onPress={() => onSelect(memory)}
            style={({ pressed }) => ({
              width: itemWidth,
              borderRadius: radii.md,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              overflow: "hidden",
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Image source={{ uri: memory.photoUri }} style={{ width: "100%", height: itemWidth * 1.18, backgroundColor: colors.faint }} />
            <View style={{ padding: 10, gap: 5 }}>
              <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }}>
                {memory.projectName || memory.title}
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>
                {formatDateLabel(memory.date)}
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  borderRadius: radii.pill,
                  borderCurve: "continuous",
                  backgroundColor: colors.greenSoft,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                }}
              >
                <Text selectable style={{ color: colors.greenDark, fontSize: 11, fontWeight: "900" }}>
                  {memory.streakAtCompletion} day streak
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
