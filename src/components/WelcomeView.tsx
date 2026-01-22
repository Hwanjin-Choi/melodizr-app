import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { ArrowRight } from "lucide-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type WelcomeViewProps = {
  onStart: () => void;
};

export default function WelcomeView({ onStart }: WelcomeViewProps) {
  return (
    <Animated.View 
      entering={FadeIn} 
      exiting={FadeOut} 
      className="flex-1 justify-center items-center px-8"
    >
      <View className="mb-12 items-center">
        <View className="items-center justify-center mb-6 shadow-2xl shadow-melodizrOrange/50">
          <Image 
            source={require("../../assets/logo.png")} 
            className="w-32 h-32 rounded-3xl"
            resizeMode="contain"
          />
        </View>
        <Text className="text-white text-5xl font-black tracking-tighter mb-2">
          Melodizr
        </Text>
        <Text className="text-gray-400 text-lg font-medium text-center leading-relaxed">
          Unleash your inner producer.{"\n"}Layer by layer.
        </Text>
      </View>

      <TouchableOpacity
        onPress={onStart}
        className="bg-white w-full py-5 rounded-2xl flex-row justify-center items-center space-x-2 shadow-xl active:opacity-90"
      >
        <Text className="text-black font-bold text-xl mr-2">Start Studio</Text>
        <ArrowRight color="black" size={24} />
      </TouchableOpacity>
    </Animated.View>
  );
}
