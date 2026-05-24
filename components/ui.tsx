import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { CalendarDays, ChevronRight, Circle, Check, Folder, Home } from "lucide-react-native";
import type { ComponentType, ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";

import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { statusLabel, type TaskStatus } from "@/data/tasks";

export const shadowTiny = {
  boxShadow: "0 4px 14px rgba(18, 25, 38, 0.06)"
} as const;

export function AppShell({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useAppState();
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
              boxShadow: `0 14px 36px ${colors.shadow}`
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
  onPress,
  accessibilityLabel
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
  const { colors } = useAppState();

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
  const { colors } = useAppState();
  const tone = status === "completed" ? colors.blue : status === "in_progress" ? colors.green : colors.orange;
  const bg = status === "completed" ? colors.blueSoft : status === "in_progress" ? colors.greenSoft : colors.orangeSoft;

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
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function CheckMark({ checked, size = 22 }: { checked: boolean; size?: number }) {
  const { colors } = useAppState();

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
  const { colors } = useAppState();

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
  const { colors } = useAppState();

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
  valueColor
}: {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { colors } = useAppState();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 34 }}>
      <Icon size={20} color={colors.ink} strokeWidth={1.9} />
      <Text selectable style={{ flex: 1, color: colors.muted, fontSize: 15 }}>
        {label}
      </Text>
      <Text selectable style={{ color: valueColor ?? colors.text, fontSize: 15, fontWeight: "600", textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

export function RowDisclosure({
  title,
  subtitle,
  href,
  right,
  checked = false
}: {
  title: string;
  subtitle?: string;
  href: string;
  right?: ReactNode;
  checked?: boolean;
}) {
  const router = useRouter();
  const { colors } = useAppState();

  return (
    <Pressable
      accessibilityRole="button"
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
      <CheckMark checked={checked} />
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
  const { colors } = useAppState();
  return <Circle size={22} color={colors.muted} strokeWidth={1.7} />;
}

export function BottomNav({ active }: { active: "home" | "calendar" | "projects" }) {
  const router = useRouter();
  const { colors } = useAppState();
  const items = [
    { key: "home" as const, label: "Home", icon: Home, href: "/home" },
    { key: "calendar" as const, label: "Calendar", icon: CalendarDays, href: "/calendar" },
    { key: "projects" as const, label: "Projects", icon: Folder, href: "/projects" }
  ];

  return (
    <View
      style={{
        height: 80,
        borderTopWidth: 1,
        borderTopColor: colors.line,
        backgroundColor: colors.surface,
        paddingHorizontal: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around"
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <Pressable key={item.key} onPress={() => router.push(item.href as never)} style={{ alignItems: "center", gap: 6, minWidth: 58 }}>
            <Icon size={22} color={isActive ? colors.green : colors.muted} strokeWidth={2.2} fill={isActive ? colors.green : "transparent"} />
            <Text selectable style={{ color: isActive ? colors.greenDark : colors.muted, fontSize: 11, fontWeight: isActive ? "800" : "600" }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
