import { BookOpen, Briefcase, Dumbbell, Music2, User, type LucideIcon } from "lucide-react-native";
import { Image, Text, View } from "react-native";

import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import type { ProofTask } from "@/data/tasks";

function inferProjectIcon(project: ProofTask): LucideIcon | null {
  const source = `${project.name} ${project.area ?? ""}`.toLowerCase();

  if (source.includes("fitness") || source.includes("gym") || source.includes("run") || source.includes("walk") || source.includes("health")) {
    return Dumbbell;
  }
  if (source.includes("study") || source.includes("read") || source.includes("dsa") || source.includes("book")) {
    return BookOpen;
  }
  if (source.includes("flute") || source.includes("bansuri") || source.includes("music") || source.includes("sing")) {
    return Music2;
  }
  if (source.includes("work") || source.includes("business") || source.includes("build") || source.includes("client")) {
    return Briefcase;
  }
  if (source.includes("personal")) {
    return User;
  }

  return null;
}

export function ProjectAvatar({ project, photoUri, size = 78 }: { project: ProofTask; photoUri?: string | null; size?: number }) {
  const { colors } = useAppState();
  const Icon = inferProjectIcon(project);
  const initial = project.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.min(radii.lg, size / 3.8),
        borderCurve: "continuous",
        backgroundColor: colors.greenSoft,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} />
      ) : Icon ? (
        <Icon size={Math.round(size * 0.42)} color={colors.greenDark} strokeWidth={2.2} />
      ) : (
        <Text selectable style={{ color: colors.greenDark, fontSize: Math.round(size * 0.38), fontWeight: "900" }}>
          {initial}
        </Text>
      )}
    </View>
  );
}
