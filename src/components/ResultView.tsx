import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Play, RotateCcw, Share2, Music } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import TrackPreview from "./TrackPreview";

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
  const [playingId, setPlayingId] = useState<number | null>(null);

  const togglePlay = (id: number) => {
    setPlayingId((prev) => (prev === id ? null : id));
  };

  return (
    <Animated.View entering={FadeIn} className="flex-1">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-white">Your Mix</Text>
        <TouchableOpacity onPress={onReset} className="rounded-full bg-dark2 p-3">
          <RotateCcw color="#888" size={20} />
        </TouchableOpacity>
      </View>

      {/* Master Player */}
      <View className="mb-6 h-40 justify-between rounded-3xl bg-gradient-to-br from-melodizrOrange to-red-600 p-6 shadow-lg shadow-melodizrOrange/20">
        <View className="flex-row items-start justify-between">
          <View className="rounded-lg bg-white/20 p-2">
            <Music color="white" size={24} />
          </View>
          <Text className="text-xs font-medium text-white/60">MASTER TRACK</Text>
        </View>
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="mb-1 text-2xl font-bold text-white">Session Final Mix</Text>
            <Text className="text-sm text-white/80">{tracks.length} Layers Combined</Text>
          </View>
          <TouchableOpacity
            onPress={() => togglePlay(-1)}
            className="rounded-full bg-white p-3 shadow-sm"
          >
            {playingId === -1 ? (
              <View className="h-5 w-5 rounded-sm bg-melodizrOrange" />
            ) : (
              <Play color="#F97316" size={20} fill="#F97316" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stems List with Waveforms */}
      <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
        Converted Layers
      </Text>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {tracks.map((track, i) => (
          <Animated.View entering={FadeIn.delay(i * 100)} key={track.id} className="mb-0.5">
            {/* Reuse TrackPreview for real playback/visuals */}
            <TrackPreview
              trackName={`${track.name} (${track.type})`}
              isPlaying={playingId === track.id}
              onTogglePlay={() => togglePlay(track.id)}
            />
          </Animated.View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={onShare}
        className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl bg-white py-4 shadow-xl"
      >
        <Share2 color="black" size={20} />
        <Text className="text-lg font-bold text-black">Share Masterpiece</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
