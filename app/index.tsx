import { useRouter } from "expo-router";
import { Check, Circle } from "lucide-react-native";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { AppShell } from "@/components/ui";
import { colors, radii } from "@/constants/theme";

function LogoMark() {
  return (
    <View
      style={{
        width: 68,
        height: 68,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 47,
          height: 47,
          borderRadius: 10,
          borderCurve: "continuous",
          borderWidth: 5,
          borderColor: colors.ink,
          left: 9,
          top: 7
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 44,
          height: 44,
          borderRadius: 10,
          borderCurve: "continuous",
          borderWidth: 5,
          borderColor: colors.greenSoft,
          right: 4,
          bottom: 4
        }}
      />
      <Check size={42} color={colors.greenDark} strokeWidth={4.2} />
    </View>
  );
}

function Illustration() {
  return (
    <View style={{ height: 245, width: "100%", alignItems: "center", justifyContent: "flex-end" }}>
      <View
        style={{
          position: "absolute",
          width: 262,
          height: 185,
          borderRadius: 92,
          backgroundColor: colors.greenSoft,
          opacity: 0.82,
          transform: [{ rotate: "13deg" }],
          bottom: 20
        }}
      />
      <View
        style={{
          width: 216,
          height: 178,
          borderRadius: 14,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
          padding: 24,
          gap: 20,
          marginBottom: 34,
          boxShadow: "0 14px 26px rgba(18, 25, 38, 0.08)"
        }}
      >
        {[
          { checked: true, width: 86 },
          { checked: false, width: 68, blue: true },
          { checked: false, width: 68 }
        ].map((item, index) => (
          <View key={index} style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: item.checked ? 0 : 2,
                borderColor: item.blue ? colors.blue : "#cfd3d9",
                backgroundColor: item.checked ? colors.green : colors.surface,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {item.checked ? <Check size={14} color={colors.surface} strokeWidth={3} /> : item.blue ? <Circle size={8} color={colors.blue} fill={colors.blue} /> : null}
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ width: item.width, height: 7, borderRadius: 4, backgroundColor: "#d8dadd" }} />
              <View style={{ width: item.width + 28, height: 5, borderRadius: 3, backgroundColor: "#e4e6e9" }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ position: "absolute", right: 86, bottom: 32, gap: 7, alignItems: "center" }}>
        <View style={{ width: 8, height: 58, borderRadius: 4, backgroundColor: colors.green, transform: [{ rotate: "22deg" }] }} />
        <View style={{ width: 14, height: 38, borderRadius: 12, backgroundColor: colors.green, transform: [{ rotate: "-42deg" }], position: "absolute", bottom: 34, left: -18 }} />
        <View style={{ width: 14, height: 45, borderRadius: 12, backgroundColor: colors.green, transform: [{ rotate: "42deg" }], position: "absolute", bottom: 18, right: -15 }} />
        <View style={{ width: 13, height: 36, borderRadius: 12, backgroundColor: colors.green, transform: [{ rotate: "-45deg" }], position: "absolute", bottom: 6, left: -18 }} />
      </View>
      <View style={{ width: 282, height: 1, backgroundColor: "#cfd5d5", position: "absolute", bottom: 34 }} />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const buttonWidth = Math.max(260, Math.min(width, 430) - 52);

  return (
    <AppShell scroll={false}>
      <View style={{ flex: 1, paddingHorizontal: 26, paddingTop: 104, paddingBottom: 34, alignItems: "center" }}>
        <LogoMark />
        <Text selectable style={{ marginTop: 30, fontSize: 32, lineHeight: 37, color: colors.ink, fontWeight: "900", textAlign: "center" }}>
          Task Tracker
        </Text>
        <Text selectable style={{ marginTop: 16, fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: "center" }}>
          Stay organized. Get things done.{"\n"}One task at a time.
        </Text>
        <Illustration />
        <View style={{ flexDirection: "row", gap: 18, marginTop: 12 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink }} />
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#d8dadd" }} />
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#d8dadd" }} />
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/home")}
          style={({ pressed }) => ({
            width: buttonWidth,
            height: 58,
            borderRadius: 18,
            borderCurve: "continuous",
            backgroundColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.82 : 1
          })}
        >
          <Text selectable style={{ color: colors.surface, fontSize: 16, fontWeight: "800" }}>
            Get Started
          </Text>
        </Pressable>
        <View style={{ marginTop: 30, flexDirection: "row", gap: 4, alignItems: "center" }}>
          <Text selectable style={{ color: colors.muted, fontSize: 14 }}>
            Already have an account?
          </Text>
          <Text selectable style={{ color: colors.greenDark, fontSize: 14, fontWeight: "800" }}>
            Sign in
          </Text>
        </View>
      </View>
    </AppShell>
  );
}
