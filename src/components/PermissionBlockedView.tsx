import React from "react";
import { View, Text, TouchableOpacity, Linking, Platform } from "react-native";
import { MicOff, Settings } from "lucide-react-native";

export default function PermissionBlockedView() {
  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-dark1 px-8">
      <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-dark2">
        <MicOff size={64} color="#EF4444" />
      </View>

      <Text className="mb-4 text-center text-3xl font-black text-white">
        Microphone Access Required
      </Text>

      <Text className="mb-8 text-center text-lg leading-relaxed text-gray-400">
        Melodizr needs access to your microphone to record your masterpieces. Please enable it in
        your device settings to continue.
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={openSettings}
        className="flex-row items-center rounded-full bg-melodizrOrange px-8 py-4"
      >
        <Settings size={20} color="white" className="mr-2" />
        <Text className="ml-2 text-lg font-bold text-white">Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
}
