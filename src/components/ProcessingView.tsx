import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

export default function ProcessingView() {
  const rotation = useSharedValue(0);
  const [text, setText] = useState("Analyzing Audio...");

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

    const texts = [
      "Analyzing Audio...",
      "Generating Stems...",
      "Enhancing Clarity...",
      "Mixing Layers...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setText(texts[i]);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      className="flex-1 justify-center items-center"
    >
      <View className="items-center">
        <Animated.View
          style={style}
          className="mb-12 w-24 h-24 rounded-full border-t-4 border-l-4 border-melodizrOrange items-center justify-center"
        >
          <View className="w-20 h-20 rounded-full bg-dark2/50" />
        </Animated.View>
        <Animated.Text
          key={text}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(400)}
          className="text-white text-2xl font-bold mb-2 text-center"
        >
          {text}
        </Animated.Text>
        <Text className="text-gray-500 text-sm font-medium tracking-wide uppercase">
          AI Engine Active
        </Text>
      </View>
    </Animated.View>
  );
}
