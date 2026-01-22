import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import {
  Mic,
  Play,
  Share2,
  ArrowLeft,
  Music,
  CheckCircle2,
} from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

const WORKFLOW = [
  {
    id: 0,
    title: "Record Rhythm",
    sub: "Laying down the heavy foundation.",
    tag: "AI BASE",
    name: "Drums & Rhythm Section",
  },
  {
    id: 1,
    title: "Record Melody",
    sub: "Carving the soul of your track.",
    tag: "AI LEAD",
    name: "Melodic Lead Guitar",
  },
  {
    id: 2,
    title: "Record Piano",
    sub: "Adding harmonic elegance.",
    tag: "AI PIANO",
    name: "Grand Piano Layer",
  },
];

export default function StudioScreen() {
  const [phase, setPhase] = useState<"landing" | "recording" | "master">(
    "landing"
  );
  const [step, setStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);

  const pulseValue = useSharedValue(0);
  const rotationValue = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      pulseValue.value = withRepeat(
        withTiming(1, { duration: 1200 }),
        -1,
        false
      );
    } else {
      pulseValue.value = withTiming(0);
    }
  }, [isRecording]);

  useEffect(() => {
    if (phase === "master") {
      rotationValue.value = withRepeat(
        withTiming(1, { duration: 6000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [phase]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseValue.value, [0, 1], [1, 2.2]) }],
    opacity: interpolate(pulseValue.value, [0, 0.5, 1], [0, 0.5, 0]),
  }));

  const animatedDiscStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationValue.value * 360}deg` }],
  }));

  const handleRecord = () => {
    if (isRecording) return;
    setIsRecording(true);

    setTimeout(() => {
      setIsRecording(false);
      // Fixed: Prevent double track addition [cite: 2026-01-20]
      setTracks((prev) => {
        const currentId = WORKFLOW[step].id;
        if (prev.find((t) => t.id === currentId)) return prev;
        return [...prev, WORKFLOW[step]];
      });
    }, 2500);
  };

  return (
    <SafeAreaView className="flex-1 bg-dark1">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-8 pt-8">
        {/* --- Header & Progress --- */}
        <View className="flex-row items-center justify-between mb-20 px-2">
          <TouchableOpacity
            onPress={() =>
              phase === "master" ? setPhase("recording") : setPhase("landing")
            }
          >
            <ArrowLeft color="#888888" size={32} />
          </TouchableOpacity>
          {phase === "recording" && (
            <View className="flex-row gap-x-4 bg-dark2 p-2.5 rounded-full border border-dark3">
              {WORKFLOW.map((_, i) => (
                <View
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i <= step ? "bg-melodizrOrange" : "bg-dark3"
                  }`}
                />
              ))}
            </View>
          )}
          <View className="w-10" />
        </View>

        {/* --- Phase Content --- */}
        {phase === "recording" ? (
          <View className="flex-1">
            <View className="items-center mb-16">
              <Text className="text-white text-4xl font-black">
                {WORKFLOW[step].title}
              </Text>
              <Text className="text-grayText text-lg mt-4 text-center px-6 leading-relaxed">
                {WORKFLOW[step].sub}
              </Text>
            </View>

            <View className="items-center justify-center h-56 relative mb-12">
              <Animated.View
                style={animatedPulseStyle}
                className="absolute w-32 h-32 rounded-full border-2 border-melodizrOrange"
              />
              <TouchableOpacity
                activeOpacity={0.9}
                className="w-28 h-28 rounded-full bg-melodizrOrange items-center justify-center shadow-2xl shadow-melodizrOrange/50"
                onPress={handleRecord}
              >
                <Mic color="white" size={40} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="items-center">
            {/* Master Disc UI - Fixed container height to prevent overlap */}
            <View className="h-72 w-full items-center justify-center mb-10">
              <View className="absolute w-64 h-64 rounded-full bg-melodizrOrange/5 border border-melodizrOrange/10" />
              <Animated.View
                style={animatedDiscStyle}
                className="w-52 h-52 rounded-full bg-dark2 border-[8px] border-dark3 items-center justify-center shadow-2xl"
              >
                <View className="w-48 h-48 rounded-full border border-dark3/40 items-center justify-center">
                  <View className="w-14 h-14 rounded-full bg-melodizrOrange items-center justify-center shadow-lg">
                    <Music color="white" size={24} />
                  </View>
                </View>
              </Animated.View>
            </View>

            <View className="items-center mb-12">
              <Text className="text-white text-4xl font-black mb-6">
                Master Mix
              </Text>
              <TouchableOpacity className="w-16 h-16 rounded-full bg-white items-center justify-center shadow-lg">
                <Play color="#F97316" size={32} fill="#F97316" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- Universal Track List --- */}
        <Text className="text-grayText font-bold mb-6 ml-2 uppercase tracking-[3px] text-[11px]">
          {phase === "master" ? "Project Stems" : "Current Session Tracks"}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {tracks.map((track, i) => (
            <View
              key={i}
              className="bg-dark2 rounded-[36px] p-8 mb-6 border border-dark3 flex-row items-center"
            >
              <TouchableOpacity className="w-14 h-14 rounded-full bg-melodizrOrange items-center justify-center mr-8 shadow-sm">
                <Play color="white" size={24} fill="white" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-melodizrOrange text-[12px] font-black tracking-widest uppercase mb-2">
                  {track.tag}
                </Text>
                <Text className="text-white font-bold text-xl">
                  {track.name}
                </Text>
                <View className="h-[3px] bg-dark3 mt-5 rounded-full overflow-hidden">
                  <View className="h-full bg-melodizrOrange w-[45%]" />
                </View>
              </View>
            </View>
          ))}
          {/* Bottom space for smooth scrolling */}
          <View className="h-10" />
        </ScrollView>

        {/* --- Footer Actions --- */}
        <View className="py-10">
          {phase === "recording" ? (
            tracks.length > step && (
              <TouchableOpacity
                className="bg-melodizrOrange py-6 rounded-2xl flex-row items-center justify-center gap-x-4 shadow-xl"
                onPress={() =>
                  step < 2 ? setStep(step + 1) : setPhase("master")
                }
              >
                <Text className="text-white font-black text-2xl">
                  {step === 2 ? "Finalize Studio" : "Next Step"}
                </Text>
                <CheckCircle2 color="white" size={28} />
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity className="bg-melodizrOrange py-6 rounded-2xl flex-row items-center justify-center gap-x-3 shadow-xl active:opacity-90">
              <Share2 color="white" size={24} />
              <Text className="text-white font-black text-xl">
                Share Masterpiece
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
