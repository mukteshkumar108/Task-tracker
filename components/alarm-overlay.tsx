import { AlarmClock, CheckCircle2, Moon, X } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, Text, Vibration, View } from "react-native";

import { radii } from "@/constants/theme";
import { useAppState } from "@/contexts/app-state";

export function AlarmOverlay() {
  const { colors, currentAlarmTask, completeTask, snoozeAlarm, stopAlarm } = useAppState();

  useEffect(() => {
    if (!currentAlarmTask) {
      Vibration.cancel();
      return undefined;
    }

    Vibration.vibrate([600, 400, 900, 400], true);
    return () => Vibration.cancel();
  }, [currentAlarmTask]);

  if (!currentAlarmTask) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
        backgroundColor: "rgba(12, 18, 24, 0.92)",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 390,
          borderRadius: 28,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          padding: 24,
          gap: 22,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.orangeSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlarmClock size={44} color={colors.orange} strokeWidth={2.3} />
        </View>

        <View style={{ gap: 8, alignItems: "center" }}>
          <Text selectable style={{ color: colors.ink, fontSize: 26, fontWeight: "900", textAlign: "center" }}>
            Task Alarm
          </Text>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" }}>
            {currentAlarmTask.title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
            Due at {currentAlarmTask.dueTime}
          </Text>
        </View>

        <View style={{ alignSelf: "stretch", gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark completed"
            onPress={() => completeTask(currentAlarmTask.id)}
            style={{
              height: 54,
              borderRadius: radii.md,
              borderCurve: "continuous",
              backgroundColor: colors.green,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <CheckCircle2 size={21} color={colors.surface} strokeWidth={2.4} />
            <Text selectable style={{ color: colors.surface, fontSize: 16, fontWeight: "900" }}>
              Mark Completed
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Snooze alarm"
            onPress={() => snoozeAlarm(currentAlarmTask.id)}
            style={{
              height: 52,
              borderRadius: radii.md,
              borderCurve: "continuous",
              backgroundColor: colors.greenSoft,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Moon size={20} color={colors.greenDark} strokeWidth={2.3} />
            <Text selectable style={{ color: colors.greenDark, fontSize: 15, fontWeight: "900" }}>
              Snooze 5 min
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop alarm"
            onPress={() => stopAlarm(currentAlarmTask.id)}
            style={{
              height: 52,
              borderRadius: radii.md,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.line,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <X size={20} color={colors.ink} strokeWidth={2.3} />
            <Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: "900" }}>
              Stop Alarm
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
