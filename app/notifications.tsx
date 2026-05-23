import { useRouter } from "expo-router";
import { Bell, ChevronLeft, Clock3 } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppShell, IconButton } from "@/components/ui";
import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";

export default function NotificationCenterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, user, loading, notificationCenterItems } = useAppState();
  const contentWidth = Math.max(300, Math.min(width, 430) - 44);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  return (
    <AppShell>
      <View style={{ width: contentWidth, alignSelf: "center", minHeight: 820, paddingTop: 38, paddingBottom: 34, gap: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton accessibilityLabel="Back" onPress={() => router.replace("/home")}>
            <ChevronLeft size={28} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>
            Notifications
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {notificationCenterItems.length === 0 ? (
          <View
            style={{
              minHeight: 210,
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
            <Bell size={42} color={colors.green} strokeWidth={2} />
            <Text selectable style={{ color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 16 }}>
              Nothing needs attention
            </Text>
            <Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 7 }}>
              Upcoming reminders, alarms, proof alerts, and progress summaries will appear here.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {notificationCenterItems.map((item) => {
              const tone =
                item.tone === "red"
                  ? colors.red
                  : item.tone === "orange"
                    ? colors.orange
                    : item.tone === "blue"
                      ? colors.blue
                      : item.tone === "green"
                        ? colors.greenDark
                        : colors.muted;
              const bg =
                item.tone === "red"
                  ? "rgba(255, 60, 66, 0.10)"
                  : item.tone === "orange"
                    ? colors.orangeSoft
                    : item.tone === "blue"
                      ? colors.blueSoft
                      : item.tone === "green"
                        ? colors.greenSoft
                        : colors.faint;

              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => ({
                    minHeight: 74,
                    borderRadius: radii.md,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    padding: 15,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 13,
                    opacity: pressed ? 0.76 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Clock3 size={21} color={tone} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                    <Text selectable numberOfLines={1} style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
                      {item.title}
                    </Text>
                    <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                      {item.body}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </AppShell>
  );
}
