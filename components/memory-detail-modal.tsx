import { Edit3, Folder, MoreVertical, Trash2, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { formatDateLabel, type ProofEntry, type ProofTask } from "@/data/tasks";

function scheduleText(entry: ProofEntry) {
  return entry.scheduleMode === "fixed" && entry.fixedTime ? `Scheduled at ${entry.fixedTime}` : "Anytime today";
}

export function MemoryDetailModal({
  memory,
  onClose,
}: {
  memory: ProofEntry | null;
  onClose: () => void;
}) {
  const {
    colors,
    proofEntries,
    proofProjects,
    updateProofMemoryNote,
    moveProofMemoryToProject,
    deleteProofMemory,
  } = useAppState();
  const liveMemory = memory ? proofEntries.find((entry) => entry.id === memory.id) ?? memory : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [changeProjectOpen, setChangeProjectOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const activeProjects = useMemo(
    () => proofProjects.filter((project) => project.id !== liveMemory?.projectId && project.id !== liveMemory?.proofTaskId),
    [liveMemory?.projectId, liveMemory?.proofTaskId, proofProjects]
  );

  useEffect(() => {
    if (!liveMemory) {
      setMenuOpen(false);
      setNoteOpen(false);
      setChangeProjectOpen(false);
      setDeleteConfirmOpen(false);
      return;
    }

    setDraftNote(liveMemory.note || liveMemory.description || "");
  }, [liveMemory]);

  const closeAll = () => {
    setMenuOpen(false);
    setNoteOpen(false);
    setChangeProjectOpen(false);
    setDeleteConfirmOpen(false);
    onClose();
  };

  const saveNote = async () => {
    if (!liveMemory || savingNote) {
      return;
    }

    setSavingNote(true);
    try {
      await updateProofMemoryNote(liveMemory.id, draftNote);
      setNoteOpen(false);
    } finally {
      setSavingNote(false);
    }
  };

  const confirmDelete = () => {
    if (!liveMemory) {
      return;
    }

    setMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  const deleteMemory = async () => {
    if (!liveMemory) {
      return;
    }

    await deleteProofMemory(liveMemory.id);
    closeAll();
  };

  return (
    <Modal visible={Boolean(liveMemory)} transparent animationType="fade" onRequestClose={closeAll}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(5, 10, 14, 0.94)",
          justifyContent: "center",
          padding: 18,
        }}
      >
        {liveMemory ? (
          <View
            style={{
              maxWidth: 430,
              width: "100%",
              alignSelf: "center",
              borderRadius: 26,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              overflow: "hidden",
            }}
          >
            <View style={{ minHeight: 430, backgroundColor: colors.faint }}>
              <Image source={{ uri: liveMemory.photoUri }} style={{ width: "100%", height: 430 }} resizeMode="cover" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close memory"
                onPress={closeAll}
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "rgba(0,0,0,0.42)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={23} color="#fff" strokeWidth={2.4} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Memory actions"
                onPress={() => setMenuOpen(true)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "rgba(0,0,0,0.42)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MoreVertical size={23} color="#fff" strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={{ padding: 18, gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Text selectable style={{ color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: "900" }}>
                  {liveMemory.projectName || liveMemory.title}
                </Text>
                <Text selectable style={{ color: colors.greenDark, fontSize: 14, fontWeight: "900" }}>
                  Streak: {liveMemory.streakAtCompletion} day{liveMemory.streakAtCompletion === 1 ? "" : "s"}
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
                  {formatDateLabel(liveMemory.date)} at {liveMemory.time}
                </Text>
                <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
                  {scheduleText(liveMemory)}
                </Text>
                {liveMemory.area ? (
                  <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
                    Area: {liveMemory.area}
                  </Text>
                ) : null}
              </View>

              {liveMemory.note || liveMemory.description ? (
                <View
                  style={{
                    borderRadius: radii.md,
                    borderCurve: "continuous",
                    backgroundColor: colors.faint,
                    padding: 13,
                  }}
                >
                  <Text selectable style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
                    {liveMemory.note || liveMemory.description}
                  </Text>
                </View>
              ) : null}
            </View>

            <MemoryActionMenu
              visible={menuOpen}
              onClose={() => setMenuOpen(false)}
              onEditNote={() => {
                setMenuOpen(false);
                setDraftNote(liveMemory.note || liveMemory.description || "");
                setNoteOpen(true);
              }}
              onChangeProject={() => {
                setMenuOpen(false);
                setChangeProjectOpen(true);
              }}
              onDelete={confirmDelete}
            />
            <MemoryDeleteConfirmModal
              visible={deleteConfirmOpen}
              onClose={() => setDeleteConfirmOpen(false)}
              onDelete={deleteMemory}
            />
            <EditNoteSheet
              visible={noteOpen}
              note={draftNote}
              saving={savingNote}
              onChangeNote={setDraftNote}
              onClose={() => setNoteOpen(false)}
              onSave={saveNote}
            />
            <ChangeProjectSheet
              visible={changeProjectOpen}
              projects={activeProjects}
              onClose={() => setChangeProjectOpen(false)}
              onChoose={async (project) => {
                await moveProofMemoryToProject(liveMemory.id, project.id);
                setChangeProjectOpen(false);
              }}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function MemoryActionMenu({
  visible,
  onClose,
  onEditNote,
  onChangeProject,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onEditNote: () => void;
  onChangeProject: () => void;
  onDelete: () => void;
}) {
  const { colors } = useAppState();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close memory menu"
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(5,10,14,0.38)",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 96,
            right: 26,
            width: 222,
            borderRadius: radii.md,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            padding: 8,
            gap: 2,
          }}
        >
          <MemoryMenuRow icon={<Edit3 size={18} color={colors.ink} />} label="Edit Note" onPress={onEditNote} />
          <MemoryMenuRow icon={<Folder size={18} color={colors.ink} />} label="Change Project" onPress={onChangeProject} />
          <MemoryMenuRow icon={<Trash2 size={18} color={colors.red} />} label="Delete Memory" onPress={onDelete} danger />
        </View>
      </View>
    </Modal>
  );
}

function MemoryDeleteConfirmModal({
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
              Delete memory?
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel delete memory" onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }}>
              <X size={20} color={colors.ink} />
            </Pressable>
          </View>

          <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: "700" }}>
            This proof photo will be permanently removed. This cannot be undone.
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel memory delete"
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
              accessibilityLabel="Confirm delete memory"
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
                Delete Memory
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MemoryMenuRow({ icon, label, onPress, danger = false }: { icon: ReactNode; label: string; onPress: () => void; danger?: boolean }) {
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

function EditNoteSheet({
  visible,
  note,
  saving,
  onChangeNote,
  onClose,
  onSave,
}: {
  visible: boolean;
  note: string;
  saving: boolean;
  onChangeNote: (note: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { colors } = useAppState();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(5,10,14,0.72)", justifyContent: "flex-end", padding: 16 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 430,
            alignSelf: "center",
            borderRadius: 24,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            padding: 18,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
              Edit Note
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close edit note" onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}>
              <X size={21} color={colors.ink} />
            </Pressable>
          </View>
          <TextInput
            value={note}
            onChangeText={onChangeNote}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 132,
              borderRadius: radii.md,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.faint,
              color: colors.text,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              lineHeight: 20,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save memory note"
            onPress={onSave}
            disabled={saving}
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
              {saving ? "Saving..." : "Save Note"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ChangeProjectSheet({
  visible,
  projects,
  onClose,
  onChoose,
}: {
  visible: boolean;
  projects: ProofTask[];
  onClose: () => void;
  onChoose: (project: ProofTask) => void;
}) {
  const { colors } = useAppState();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(5,10,14,0.72)", justifyContent: "flex-end", padding: 16 }}>
        <View
          style={{
            width: "100%",
            maxWidth: 430,
            alignSelf: "center",
            maxHeight: "70%",
            borderRadius: 24,
            borderCurve: "continuous",
            backgroundColor: colors.surface,
            padding: 18,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text selectable style={{ color: colors.ink, fontSize: 20, fontWeight: "900" }}>
              Change Project
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close change project" onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}>
              <X size={21} color={colors.ink} />
            </Pressable>
          </View>
          {projects.length === 0 ? (
            <View style={{ minHeight: 90, borderRadius: radii.md, borderCurve: "continuous", backgroundColor: colors.faint, alignItems: "center", justifyContent: "center", padding: 14 }}>
              <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800", textAlign: "center" }}>
                No other active projects available.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {projects.map((project) => (
                <Pressable
                  key={project.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Move memory to ${project.name}`}
                  onPress={() => onChoose(project)}
                  style={({ pressed }) => ({
                    minHeight: 58,
                    borderRadius: radii.md,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: pressed ? colors.faint : colors.surface,
                    paddingHorizontal: 13,
                    justifyContent: "center",
                    gap: 3,
                  })}
                >
                  <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                    {project.name}
                  </Text>
                  {project.area ? (
                    <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
                      {project.area}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
