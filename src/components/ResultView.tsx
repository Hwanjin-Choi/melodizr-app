import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Play, RotateCcw, Share2, Music } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import TrackPreview from "./TrackPreview";

type Track = {
  id: number;
  type: string;
  name: string;
  color: string;
  uri: string;
  bpm?: number | null;
};

type ResultViewProps = {
  tracks: Track[];
  onReset: () => void;
  onShare: () => void;
  onAddPiano?: () => void;
  onRetakeTrack?: (id: number) => void;
  onShareTrack?: (id: number) => void;
};

import { Audio } from "expo-av";
import { Plus } from "lucide-react-native";

export default function ResultView({
  tracks,
  onReset,
  onShare,
  onAddPiano,
  onRetakeTrack,
  onShareTrack,
}: ResultViewProps) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const masterSounds = useRef<Audio.Sound[]>([]);
  const [isMasterPlaying, setIsMasterPlaying] = useState(false);

  // Stop master if individual clicked
  const togglePlay = (id: number) => {
    stopMaster();
    setPlayingId((prev) => (prev === id ? null : id));
  };

  const stopMaster = async () => {
    if (masterSounds.current.length > 0) {
      await Promise.all(masterSounds.current.map((s) => s.stopAsync().catch(() => {})));
      await Promise.all(masterSounds.current.map((s) => s.unloadAsync().catch(() => {})));
      masterSounds.current = [];
    }
    setIsMasterPlaying(false);
    setMasterProgress(0);
  };

  const [masterProgress, setMasterProgress] = useState(0);

  const toggleMasterPlay = async () => {
    // If playing, stop
    if (isMasterPlaying) {
      await stopMaster();
      return;
    }

    // Stop individual if playing
    setPlayingId(null);
    setMasterProgress(0);

    // Load ALL tracks
    try {
      const loadedSounds: Audio.Sound[] = [];

      // 1. Load User/Converted Tracks
      for (const track of tracks) {
        const source =
          typeof track.uri === "string" ? { uri: track.uri } : require("../../assets/demo.wav");
        const { sound } = await Audio.Sound.createAsync(source);
        loadedSounds.push(sound);
      }

      // Auto-stop logic for Master Player
      // We attach a listener to the first main track (index 0) to stop everything when it finishes.
      if (loadedSounds.length > 0) {
        loadedSounds[0].setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setMasterProgress(status.positionMillis / status.durationMillis);
            }
            if (status.didJustFinish) {
              console.log("Master playback finished. Stopping all.");
              stopMaster();
              setMasterProgress(0);
            }
          }
        });
      }

      // 2. Load Beat if BPM is present in any track (specifically the first processed one)
      // Find track with BPM
      const trackWithBpm = tracks.find((t) => t.bpm);
      if (trackWithBpm && trackWithBpm.bpm) {
        const { sound: beat } = await Audio.Sound.createAsync(require("../../assets/Beat.wav"));
        const rate = trackWithBpm.bpm / 120.0;
        await beat.setIsLoopingAsync(true);
        await beat.setRateAsync(rate, true);
        // Lower volume for beat in master mix maybe?
        await beat.setVolumeAsync(0.6);
        loadedSounds.push(beat);
      }

      masterSounds.current = loadedSounds;
      setIsMasterPlaying(true);

      // Play All
      await Promise.all(loadedSounds.map((s) => s.playAsync()));
    } catch (e) {
      console.error("Master Playback Failed", e);
      stopMaster();
    }
  };

  // Cleanup
  React.useEffect(() => {
    return () => {
      stopMaster();
    };
  }, []);

  return (
    <Animated.View entering={FadeIn} className="flex-1">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-white">Your Mix</Text>
        <TouchableOpacity onPress={onReset} className="rounded-full bg-dark2 p-3">
          <RotateCcw color="#888" size={20} />
        </TouchableOpacity>
      </View>

      {/* Master Player - Hero Card */}
      <View className="mb-8 h-80 w-full justify-between rounded-[40px] bg-dark2 p-8">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-melodizrOrange/20">
              <Music color="#F97316" size={20} />
            </View>
            <View>
              <Text className="text-xs font-bold uppercase tracking-widest text-melodizrOrange">
                Master Track
              </Text>
              <Text className="text-sm font-medium text-gray-400">
                {tracks.length} Layers Combined
              </Text>
            </View>
          </View>
        </View>

        {/* Central Visual / Title */}
        <View className="flex-1 items-center justify-center py-6">
          <Text className="mb-2 text-center text-3xl font-black leading-tight tracking-tight text-white">
            Session Final Mix
          </Text>
        </View>

        {/* Controls Area */}
        <View className="w-full gap-6">
          {/* Progress Bar */}
          <View className="h-2 w-full overflow-hidden rounded-full bg-dark3">
            <View
              className="h-full bg-melodizrOrange"
              style={{ width: `${masterProgress * 100}%` }}
            />
          </View>

          <View className="items-center">
            <TouchableOpacity
              onPress={toggleMasterPlay}
              className="h-20 w-20 items-center justify-center rounded-full bg-melodizrOrange active:scale-95"
            >
              {isMasterPlaying ? (
                <View className="h-8 w-8 rounded-md bg-white" />
              ) : (
                <Play color="white" size={32} fill="white" className="ml-1" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Add Piano Option */}
      {onAddPiano && (
        <TouchableOpacity
          onPress={onAddPiano}
          className="mb-6 flex-row items-center justify-between rounded-2xl bg-dark2 p-4"
        >
          <View>
            <Text className="text-lg font-bold text-white">Add Piano Layer?</Text>
            <Text className="text-xs text-gray-400">Enhance your track with harmony</Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-dark3">
            <Plus color="white" size={24} />
          </View>
        </TouchableOpacity>
      )}

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
              uri={track.uri}
              bpm={track.type === "base" ? track.bpm : undefined}
              isPlaying={playingId === track.id}
              onTogglePlay={() => togglePlay(track.id)}
              onFinish={() => togglePlay(track.id)} // Toggling off resets ID -> stops beat
              onRetake={onRetakeTrack ? () => onRetakeTrack(track.id) : undefined}
              onShare={onShareTrack ? () => onShareTrack(track.id) : undefined}
            />
          </Animated.View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={onShare}
        className="mb-4 flex-row items-center justify-center gap-2 rounded-2xl bg-white py-4 shadow-xl"
      >
        <Share2 color="black" size={20} />
        <Text className="text-lg font-bold text-black">Share Track</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
