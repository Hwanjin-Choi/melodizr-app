import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Play, RotateCcw, Share2, Music } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type Track = {
  id: number;
  type: string;
  name: string;
  color: string;
};

type ResultViewProps = {
  tracks: Track[];
  onReset: () => void;
  onShare: () => void;
};

export default function ResultView({ tracks, onReset, onShare }: ResultViewProps) {
  return (
    <Animated.View entering={FadeIn} className="flex-1">
      <View className="flex-row justify-between items-center mb-8">
        <Text className="text-white text-3xl font-black">Your Mix</Text>
        <TouchableOpacity onPress={onReset} className="bg-dark2 p-3 rounded-full">
          <RotateCcw color="#888" size={20} />
        </TouchableOpacity>
      </View>

      {/* Master Player */}
      <View className="bg-gradient-to-br from-melodizrOrange to-red-600 rounded-3xl p-6 mb-8 shadow-lg shadow-melodizrOrange/20 h-48 justify-between">
        <View className="flex-row justify-between items-start">
          <View className="bg-white/20 p-2 rounded-lg">
            <Music color="white" size={24} />
          </View>
          <Text className="text-white/60 font-medium text-xs">
            MASTER TRACK
          </Text>
        </View>
        <View>
          <Text className="text-white text-2xl font-bold mb-1">
            Session Final Mix
          </Text>
          <Text className="text-white/80 text-sm">
            {tracks.length} Layers Combined
          </Text>
        </View>
        <View className="flex-row items-center gap-4 mt-2">
          <TouchableOpacity className="w-12 h-12 bg-white rounded-full items-center justify-center">
            <Play fill="black" size={20} color="black" className="ml-1" />
          </TouchableOpacity>
          <View className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
            <View className="h-full w-1/3 bg-white" />
          </View>
        </View>
      </View>

      {/* Stems List */}
      <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4">
        Recorded Layers
      </Text>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {tracks.map((track, i) => (
          <Animated.View
            entering={FadeIn.delay(i * 100)}
            key={track.id}
            className="flex-row items-center bg-dark2/50 border border-dark3/50 p-4 rounded-2xl mb-3"
          >
            <View
              style={{ backgroundColor: track.color }}
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
            >
              <Play size={16} fill="white" color="white" className="ml-0.5" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{track.name}</Text>
              <Text className="text-gray-500 text-xs uppercase">
                {track.type}
              </Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={onShare}
        className="mb-4 bg-white py-4 rounded-2xl flex-row justify-center items-center gap-2 shadow-xl"
      >
        <Share2 color="black" size={20} />
        <Text className="text-black font-bold text-lg">Share Masterpiece</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
