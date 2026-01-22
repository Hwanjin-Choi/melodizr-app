import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Mic, Square, Music, Keyboard } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  ZoomIn,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

type RecordingViewProps = {
  stepData: { id: string; title: string; prompt: string };
  recordingStep: number;
  totalSteps: number;
  isRecording: boolean;
  maxDuration: number | null;
  onRecordPress: () => void;
  onStopPress: (duration: number) => void;
};

export default function RecordingView({
  stepData,
  recordingStep,
  totalSteps,
  isRecording,
  maxDuration,
  onRecordPress,
  onStopPress,
}: RecordingViewProps) {
  const pulseValue = useSharedValue(0);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      pulseValue.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
      
      startTimeRef.current = Date.now();
      setElapsed(0);

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const diff = now - startTimeRef.current;
          setElapsed(diff);

          // Auto-stop if we hit maxDuration
          if (maxDuration && diff >= maxDuration) {
             clearInterval(intervalRef.current!);
             onStopPress(maxDuration);
          }
        }
      }, 50);

    } else {
      pulseValue.value = withTiming(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseValue.value, [0, 1], [1, 1.5]) }],
    opacity: interpolate(pulseValue.value, [0, 1], [0.6, 0]),
  }));

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 100); // Tenths of second
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis}`;
  };

  const handleStop = () => {
     if (startTimeRef.current) {
        onStopPress(Date.now() - startTimeRef.current);
     }
  };

  const renderRecordingIcon = () => {
     if (recordingStep === 0) return <Square color="white" fill="white" size={40} />; // Base - Stop
     if (recordingStep === 1) return <Music color="white" size={48} />; // Melody - Music
     if (recordingStep === 2) return <Keyboard color="white" size={48} />; // Piano - Keys
     return <Square color="white" fill="white" size={40} />;
  };

  return (
    <Animated.View exiting={FadeOut} entering={FadeIn} className="flex-1 justify-center items-center">
      <View className="items-center mb-20">
        <View className="flex-row mb-4 gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              className={`h-1.5 w-8 rounded-full ${
                i <= recordingStep ? "bg-melodizrOrange" : "bg-dark3"
              }`}
            />
          ))}
        </View>
        <Text className="text-white text-5xl font-black tracking-tighter text-center mb-4 leading-tight">
          {isRecording ? "Recording..." : stepData.title}
        </Text>
        <Text className="text-gray-400 text-lg font-medium text-center max-w-[250px]">
          {isRecording ? "Keep it going!" : stepData.prompt}
        </Text>
      </View>

      <View className="relative items-center justify-center">
        {isRecording && (
          <Animated.View
            style={pulseStyle}
            className="absolute w-80 h-80 rounded-full bg-melodizrOrange/20"
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          // Always allow stop if recording, otherwise start
          onPress={isRecording ? handleStop : onRecordPress}
          className={`w-32 h-32 rounded-full items-center justify-center shadow-2xl shadow-melodizrOrange/40 ${
            isRecording ? "bg-red-500" : "bg-melodizrOrange"
          }`}
        >
          {isRecording ? (
             renderRecordingIcon()
          ) : (
            <Mic color="white" size={48} />
          )}
        </TouchableOpacity>
      </View>

      {isRecording && (
        <Animated.View
          entering={ZoomIn.duration(500)}
          className="mt-16 bg-dark2 px-10 py-4 rounded-full border border-dark3"
        >
          {/* Removed font-mono, kept tabular-nums for fixed width numbers if supported, otherwise just standard font */}
          <Text className="text-white tracking-widest text-3xl font-black">
            {formatTime(elapsed)} {maxDuration ? `/ ${formatTime(maxDuration)}` : ''}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}
