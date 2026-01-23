import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle2, RotateCcw } from "lucide-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import TrackPreview from "./TrackPreview";

type InterstitialViewProps = {
  recordingStep: number;
  lastTrack: any;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onRetake: () => void;
  onFinish: () => void;
};

export default function InterstitialView({
  recordingStep,
  lastTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onRetake,
  onFinish,
}: InterstitialViewProps) {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="flex-1 items-center justify-center"
    >
      <View className="absolute right-0 top-0 z-10">
        <TouchableOpacity
          onPress={onRetake}
          className="flex-row items-center rounded-full bg-dark2/80 px-4 py-2"
        >
          <RotateCcw size={14} color="#9CA3AF" />
          <Text className="ml-2 text-xs font-bold uppercase text-gray-400">Retake</Text>
        </TouchableOpacity>
      </View>

      <CheckCircle2 size={64} color="#10B981" className="mb-6 mt-10" />
      <Text className="mb-8 text-center text-3xl font-bold text-white">Conversion Complete!</Text>

      {recordingStep === 0 && (
        <Text className="mb-8 px-8 text-center leading-6 text-gray-400">
          Review the converted base track. If you like it, let's add the melody layer.
        </Text>
      )}
      {recordingStep >= 1 && (
        <Text className="mb-8 px-8 text-center leading-6 text-gray-400">
          Changes applied. Ready for the next layer or the final mix?
        </Text>
      )}

      <View className="w-full gap-4">
        {recordingStep < 2 && (
          <TouchableOpacity
            onPress={onNext}
            className="items-center rounded-2xl bg-melodizrOrange py-4 shadow-lg"
          >
            <Text className="text-lg font-bold text-white">
              {recordingStep === 0 ? "Add Melody Layer" : "Add Piano Layer"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Allow finishing anytime after first track if desired, or strictly 3rd track? 
            User previous request implied strict logic "Base -> Melody -> Piano -> Result".
            But usually "Finish" is available early. I'll hide "Finish" until Piano if strict, 
            or show secondary "Finish" button.
            Let's stick to the "Add" button primarily until the end.
        */}
        {recordingStep >= 2 ? (
          <TouchableOpacity
            onPress={onFinish}
            className="items-center rounded-2xl bg-melodizrOrange py-4 shadow-lg"
          >
            <Text className="text-lg font-bold text-white">Finish & See Result</Text>
          </TouchableOpacity>
        ) : (
          // Early exit option
          <TouchableOpacity
            onPress={onFinish}
            className="items-center rounded-2xl border border-dark3 bg-dark2 py-4"
          >
            <Text className="text-lg font-bold text-white">Finish & See Result</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
