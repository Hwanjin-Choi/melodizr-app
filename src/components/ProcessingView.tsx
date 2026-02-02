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
      className="flex-1 items-center justify-center"
    >
      <View className="items-center">
        <Animated.View
          style={style}
          className="mb-12 h-24 w-24 items-center justify-center rounded-full border-l-4 border-t-4 border-melodizrOrange"
        >
          <View className="h-20 w-20 rounded-full bg-dark2/50" />
        </Animated.View>
        <Animated.Text
          key={text}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(400)}
          className="mb-2 text-center text-2xl font-bold text-white"
        >
          {text}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}
