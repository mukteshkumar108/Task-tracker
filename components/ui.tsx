import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronRight, Circle, Check } from "lucide-react-native";
import type { ComponentType, ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { colors, radii } from "@/constants/theme";
import type { TaskStatus } from "@/data/tasks";

export const shadowSoft = {
  boxShadow: `0 14px 36px ${colors.shadow}`
} as const;

export const shadowTiny = {
  boxShadow: "0 4px 14px rgba(18, 25, 38, 0.06)"
} as const;

export function AppShell({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const frameWidth = Math.min(width, 430);

  const content = (
    <View
      style={{
        width: frameWidth,
        maxWidth: 430,
        minHeight: "100%",
        alignSelf: isWide ? "center" : "flex-start",
        backgroundColor: colors.surface,
        overflow: "hidden",
        ...(isWide
          ? {
              borderRadius: 28,
              borderCurve: "continuous",
              marginVertical: 28,
              minHeight: 820,
              ...shadowSoft
            }
          : null)
      }}
    >
      {children}
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background
      }}
    >
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: isWide ? "center" : "flex-start"
          }}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function IconButton({
  children,
  onPress
}: {
  children: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1
      })}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  actionHref,
  actionLabel
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const router = useRouter();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text selectable style={{ fontSize: 18, fontWeight: "800", color: colors.ink }}>
        {title}
      </Text>
      {actionHref && actionLabel ? (
        <Pressable onPress={() => router.push(actionHref as never)}>
          <Text selectable style={{ color: colors.greenDark, fontWeight: "700", fontSize: 13 }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatusPill({ status }: { status: TaskStatus }) {
  const tone = status === "completed" ? colors.blue : status === "in-progress" ? colors.green : colors.orange;
  const bg = status === "completed" ? colors.blueSoft : status === "in-progress" ? colors.greenSoft : colors.orangeSoft;
  const label = status === "completed" ? "Completed" : status === "in-progress" ? "In Progress" : "Pending";

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radii.sm,
        borderCurve: "continuous",
        minWidth: 78,
        alignItems: "center"
      }}
    >
      <Text selectable style={{ color: tone, fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

export function CheckMark({ checked, size = 22 }: { checked: boolean; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: checked ? 0 : 1.5,
        borderColor: "#c7ccd3",
        backgroundColor: checked ? colors.green : colors.surface,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {checked ? <Check size={size * 0.58} color={colors.surface} strokeWidth={3} /> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon
}: {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
      style={({ pressed }) => ({
        height: 58,
        borderRadius: 17,
        borderCurve: "continuous",
        backgroundColor: colors.green,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        opacity: pressed ? 0.86 : 1
      })}
    >
      {icon}
      <Text selectable style={{ color: colors.surface, fontSize: 16, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SoftButton({
  label,
  onPress,
  icon
}: {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 58,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: colors.violetSoft,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 12,
        opacity: pressed ? 0.75 : 1
      })}
    >
      {icon}
      <Text selectable style={{ color: colors.violet, fontSize: 16, fontWeight: "800" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function MetaRow({
  icon: Icon,
  label,
  value,
  valueColor = colors.text
}: {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 34 }}>
      <Icon size={20} color={colors.ink} strokeWidth={1.9} />
      <Text selectable style={{ flex: 1, color: colors.muted, fontSize: 15 }}>
        {label}
      </Text>
      <Text selectable style={{ color: valueColor, fontSize: 15, fontWeight: "600", textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

export function RowDisclosure({
  title,
  subtitle,
  href,
  right
}: {
  title: string;
  subtitle?: string;
  href: string;
  right?: ReactNode;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      style={({ pressed }) => ({
        alignSelf: "stretch",
        minHeight: 66,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: radii.md,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.72 : 1,
        ...shadowTiny
      })}
    >
      <CheckMark checked={title.toLowerCase().includes("design")} />
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <ChevronRight size={17} color={colors.muted} />}
    </Pressable>
  );
}

export function EmptyCircle() {
  return <Circle size={22} color="#c3c8d0" strokeWidth={1.7} />;
}
