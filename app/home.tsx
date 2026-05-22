import { useRouter } from "expo-router";
import { Bell, CalendarDays, Flag, Home, LayoutList, Menu, Plus, UserRound } from "lucide-react-native";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppShell, CheckMark, IconButton, RowDisclosure, SectionHeader, shadowTiny } from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { stats, tasks } from "@/data/tasks";

function StatCard({ item }: { item: (typeof stats)[number] }) {
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
          {item.value}
        </Text>
        <Text selectable numberOfLines={1} style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>
          {item.label}
        </Text>
      </View>
    </View>
  );
}

function BottomNav() {
  const items = [
    { label: "Home", icon: Home, active: true },
    { label: "Calendar", icon: CalendarDays },
    { label: "Tasks", icon: LayoutList },
    { label: "Profile", icon: UserRound }
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
        justifyContent: "space-between"
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Pressable key={item.label} style={{ alignItems: "center", gap: 6, minWidth: 58 }}>
            <Icon size={22} color={item.active ? colors.green : colors.muted} strokeWidth={2.2} fill={item.active ? colors.green : "transparent"} />
            <Text selectable style={{ color: item.active ? colors.greenDark : colors.muted, fontSize: 11, fontWeight: item.active ? "800" : "600" }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingTop: 44 }}>
        <View style={{ width: contentWidth, alignSelf: "center", gap: 26, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <IconButton>
              <Menu size={26} color={colors.ink} strokeWidth={2} />
            </IconButton>
            <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
              Today
            </Text>
            <IconButton>
              <Bell size={24} color={colors.ink} strokeWidth={2} />
            </IconButton>
          </View>

          <View style={{ gap: 8 }}>
            <Text selectable style={{ color: colors.ink, fontSize: 21, fontWeight: "900" }}>
              {greeting}, Alex!
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 15 }}>
              You have 8 tasks today
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {stats.map((item) => (
              <StatCard key={item.label} item={item} />
            ))}
          </View>

          <View style={{ gap: 14, flex: 1 }}>
            <SectionHeader title="Today's Tasks" actionHref="/project/website-redesign" actionLabel="View all" />
            <View style={{ gap: 12 }}>
              {tasks.map((task) => {
                const flagColor = task.flag === "green" ? colors.green : task.flag === "blue" ? colors.blue : task.flag === "red" ? colors.red : colors.muted;
                return (
                  <RowDisclosure
                    key={task.id}
                    href={`/task/${task.id}`}
                    title={task.title}
                    subtitle={task.time}
                    right={<Flag size={19} color={flagColor} strokeWidth={2.1} fill={task.flag === "green" ? colors.greenSoft : "transparent"} />}
                  />
                );
              })}
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/task/design-landing-page")}
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

        <BottomNav />
      </View>
    </AppShell>
  );
}
