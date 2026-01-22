import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type InterstitialViewProps = {
  recordingStep: number;
  onNext: () => void;
  onFinish: () => void;
};

export default function InterstitialView({
  recordingStep,
  onNext,
  onFinish,
}: InterstitialViewProps) {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="flex-1 justify-center items-center"
    >
      <CheckCircle2 size={80} color="#10B981" className="mb-8" />
      <Text className="text-white text-3xl font-bold mb-4 text-center">
        Layer Recorded!
      </Text>

      {recordingStep === 0 && (
        <Text className="text-gray-400 text-center mb-10 px-8">
          Great foundation. Now, let's add the melody?
        </Text>
      )}
      {recordingStep >= 1 && (
        <Text className="text-gray-400 text-center mb-10 px-8">
          Sounding good. Want to add the **Piano** layer or finish the
          mix?
        </Text>
      )}

      <View className="w-full gap-4">
        <TouchableOpacity
          onPress={onNext}
          className="bg-melodizrOrange py-4 rounded-2xl items-center shadow-lg"
        >
          <Text className="text-white font-bold text-lg">
            {recordingStep === 0 ? "Add Melody Layer" : "Add Piano Layer"}
          </Text>
        </TouchableOpacity>

        {recordingStep >= 1 && (
          <TouchableOpacity
            onPress={onFinish}
            className="bg-dark2 border border-dark3 py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-bold text-lg">
              Finish & See Result
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
