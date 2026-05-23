import { useRouter } from "expo-router";
import {
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Home,
  Info,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Settings,
  X
} from "lucide-react-native";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell, BottomNav, IconButton, RowDisclosure, SectionHeader, shadowTiny } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";
import { stats } from "@/data/tasks";

function StatCard({ item, value }: { item: (typeof stats)[number]; value: number }) {
  const { colors } = useAppState();
  const Icon = item.icon;
  const tone = item.tone === "green" ? colors.green : item.tone === "blue" ? colors.blue : colors.orange;
  const bg = item.tone === "green" ? colors.greenSoft : item.tone === "blue" ? colors.blueSoft : colors.orangeSoft;

  return (
    <View
      style={{
        flex: 1,
        minHeight: 122,
        borderRadius: radii.md,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: 16,
        justifyContent: "space-between",
        ...shadowTiny
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={tone} strokeWidth={2.4} />
      </View>
      <View style={{ gap: 6 }}>
        <Text selectable style={{ fontSize: 24, color: colors.ink, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
        <Text selectable numberOfLines={1} style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>
          {item.label}
        </Text>
      </View>
    </View>
  );
}

function DrawerItem({
  label,
  icon: Icon,
  active = false,
  destructive = false,
  accessory,
  onPress
}: {
  label: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  active?: boolean;
  destructive?: boolean;
  accessory?: ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useAppState();
  const tone = destructive ? colors.red : active ? colors.greenDark : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: radii.md,
        borderCurve: "continuous",
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 18,
        backgroundColor: active ? colors.greenSoft : "transparent",
        opacity: pressed ? 0.68 : 1
      })}
    >
      <Icon size={26} color={tone} strokeWidth={2} />
      <Text selectable style={{ flex: 1, color: tone, fontSize: 19, fontWeight: active ? "800" : "500" }}>
        {label}
      </Text>
      {accessory}
    </Pressable>
  );
}

function DrawerMenu({ onClose }: { onClose: () => void }) {
  const { colors, themeMode, toggleTheme, user, updateUserName, signOut } = useAppState();
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(user?.name ?? "Muktesh");
  const firstInitial = (user?.name?.trim()?.[0] ?? "A").toUpperCase();
  const menuItems = [
    { label: "Home", icon: Home, href: "/home", active: true },
    { label: "Calendar", icon: CalendarDays, href: "/calendar" },
    { label: "Proof of Work", icon: Camera, href: "/proof-of-work" },
    { label: "Task History / Memories", icon: CheckCircle2, href: "/tasks" }
  ] as const;
  const secondaryItems = [
    {
      label: "Settings",
      icon: Settings,
      onPress: toggleTheme,
      accessory: (
        <View style={{ minWidth: 52, borderRadius: radii.pill, borderCurve: "continuous", backgroundColor: colors.faint, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "900", textAlign: "center" }}>
            {themeMode === "dark" ? "Dark" : "Light"}
          </Text>
        </View>
      )
    },
    { label: "Help & Support", icon: CircleHelp, onPress: undefined },
    { label: "About Task Tracker", icon: Info, onPress: undefined }
  ] as const;
  const navigateTo = (href: string) => {
    onClose();
    router.push(href as never);
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        flexDirection: "row"
      }}
    >
      <View
        style={{
          width: 312,
          backgroundColor: colors.surface,
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
          borderCurve: "continuous",
          paddingTop: 54,
          paddingHorizontal: 18,
          paddingBottom: 24,
          gap: 20,
          boxShadow: `12px 0 34px ${colors.shadow}`
        }}
      >
        <View style={{ alignItems: "flex-end" }}>
          <IconButton onPress={onClose}>
            <X size={28} color={colors.ink} strokeWidth={2} />
          </IconButton>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 18 }}>
          <View
            style={{
              width: 78,
              height: 78,
              borderRadius: 39,
              backgroundColor: colors.greenSoft,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text selectable style={{ color: colors.greenDark, fontSize: 34, fontWeight: "900" }}>
              {firstInitial}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            {editingName ? (
              <TextInput
                autoFocus
                value={draftName}
                onChangeText={setDraftName}
                onSubmitEditing={() => {
                  updateUserName(draftName);
                  setEditingName(false);
                }}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
                style={{
                  minHeight: 42,
                  borderRadius: radii.sm,
                  borderCurve: "continuous",
                  borderWidth: 1,
                  borderColor: colors.line,
                  color: colors.text,
                  paddingHorizontal: 10,
                  fontSize: 17,
                  fontWeight: "800"
                }}
              />
            ) : (
              <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 21, fontWeight: "900" }}>
                {user?.name ?? "Muktesh"}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editingName ? "Save name" : "Edit name"}
              onPress={() => {
                if (editingName) {
                  updateUserName(draftName);
                }
                setEditingName((editing) => !editing);
              }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <Text selectable style={{ color: colors.greenDark, fontSize: 16, fontWeight: "800" }}>
                {editingName ? "Save name" : "Edit name"}
              </Text>
              <Pencil size={18} color={colors.greenDark} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingBottom: 4 }}>
          <View style={{ gap: 6 }}>
            {menuItems.map((item) => (
              <DrawerItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                active={"active" in item ? item.active : false}
                onPress={() => navigateTo(item.href)}
              />
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: colors.line, marginHorizontal: 18 }} />

          <View style={{ gap: 6 }}>
            {secondaryItems.map((item) => (
              <DrawerItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                accessory={"accessory" in item ? item.accessory : undefined}
                onPress={item.onPress}
              />
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: colors.line, marginHorizontal: 18 }} />

          <DrawerItem
            label="Logout"
            icon={LogOut}
            destructive
            onPress={() => {
              signOut();
              onClose();
              router.replace("/");
            }}
          />
        </ScrollView>
      </View>
      <Pressable style={{ flex: 1, backgroundColor: themeMode === "dark" ? "rgba(0,0,0,0.54)" : "rgba(21,28,38,0.44)" }} onPress={onClose} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, user, loading, error, todayTasks, todayCounts, clearError } = useAppState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const greeting = clock.getHours() < 12 ? "Good morning" : clock.getHours() < 18 ? "Good afternoon" : "Good night";
  const counterValues = [todayCounts.total, todayCounts.completed, todayCounts.pending];

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 44 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 26, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <IconButton accessibilityLabel="Open menu" onPress={() => setDrawerOpen(true)}>
              <Menu size={26} color={colors.ink} strokeWidth={2} />
            </IconButton>
            <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              Today
            </Text>
            <IconButton accessibilityLabel="Notifications" onPress={() => router.push("/notifications" as never)}>
              <Bell size={24} color={colors.ink} strokeWidth={2} />
            </IconButton>
          </View>

          <View style={{ gap: 8 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 21, fontWeight: "900" }}>
              {greeting}, {user?.name ?? "there"}!
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
              {loading ? "Loading tasks..." : `You have ${todayCounts.pending} ${todayCounts.pending === 1 ? "task" : "tasks"} left today`}
            </Text>
          </View>

          {error ? (
            <Pressable onPress={clearError} style={{ borderRadius: radii.sm, borderCurve: "continuous", backgroundColor: colors.orangeSoft, padding: 12 }}>
              <Text selectable style={{ color: colors.orange, fontWeight: "800", fontSize: 13 }}>
                {error}
              </Text>
            </Pressable>
          ) : null}

          <View style={{ flexDirection: "row", gap: 12 }}>
            {stats.map((item, index) => (
              <StatCard key={item.label} item={item} value={counterValues[index] ?? 0} />
            ))}
          </View>

          <View style={{ gap: 14, flex: 1 }}>
            <SectionHeader title="Today's Tasks" actionHref="/tasks" actionLabel="View all" />
            <View style={{ gap: 12 }}>
              {loading ? (
                <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
                  Fetching your tasks...
                </Text>
              ) : todayTasks.length === 0 ? (
                <View
                  style={{
                    minHeight: 120,
                    borderRadius: radii.md,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20
                  }}
                >
                  <Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
                    No tasks for today
                  </Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 13, marginTop: 6, textAlign: "center" }}>
                    Tap the plus button to add one.
                  </Text>
                </View>
              ) : (
                todayTasks.map((task) => (
                  <RowDisclosure
                    key={task.id}
                    href={`/task/${task.id}`}
                    title={task.title}
                    subtitle={task.dueTime}
                    checked={false}
                    right={<Clock3 size={19} color={colors.green} strokeWidth={2.1} />}
                  />
                ))
              )}
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add task"
          onPress={() => router.push("/task-form" as never)}
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
            boxShadow: "0 12px 25px rgba(33, 147, 95, 0.30)"
          })}
        >
          <Plus size={31} color={colors.surface} strokeWidth={2.2} />
        </Pressable>

        <BottomNav active="home" />
        {drawerOpen ? <DrawerMenu onClose={() => setDrawerOpen(false)} /> : null}
      </View>
    </AppShell>
  );
}
