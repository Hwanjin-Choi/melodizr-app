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
  };

  const toggleMasterPlay = async () => {
    // If playing, stop
    if (isMasterPlaying) {
      await stopMaster();
      return;
    }

    // Stop individual if playing
    setPlayingId(null);

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
          if (status.isLoaded && status.didJustFinish) {
            console.log("Master playback finished. Stopping all.");
            stopMaster();
            // Note: stopMaster clears masterSounds which prevents memory leaks
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
      stopBeatPreview();
    };
  }, []);

  // Individual Track Beat Sync Logic
  const beatPreviewSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const handleBeatSync = async () => {
      // If playingId matches a track that needs beat sync (e.g. tracks[0] or type="base")
      const playingTrack = tracks.find((t) => t.id === playingId);

      // Check if this track is the "Base" track (usually index 0 or type 'base')
      // And has BPM
      if (playingTrack && playingTrack.bpm && playingTrack.type === "base") {
        // Start Beat Sync
        // Load if not loaded
        if (!beatPreviewSound.current) {
          try {
            console.log("Loading Beat sync for Result View");
            const { sound: beat } = await Audio.Sound.createAsync(require("../../assets/Beat.wav"));
            const rate = playingTrack.bpm / 120.0;
            await beat.setIsLoopingAsync(true);
            await beat.setRateAsync(rate, true);
            await beat.setVolumeAsync(0.6);
            await beat.playAsync();
            beatPreviewSound.current = beat;
          } catch (e) {
            console.log("Failed to load beat for preview", e);
          }
        } else {
          await beatPreviewSound.current.playAsync();
        }
      } else {
        // Stop Beat Sync
        if (beatPreviewSound.current) {
          await beatPreviewSound.current.stopAsync();
        }
      }
    };

    handleBeatSync();

    // Cleanup on unmount handled by global cleanup, but also on id change
  }, [playingId]);

  const stopBeatPreview = async () => {
    if (beatPreviewSound.current) {
      await beatPreviewSound.current.stopAsync();
      await beatPreviewSound.current.unloadAsync();
      beatPreviewSound.current = null;
    }
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
            onPress={toggleMasterPlay}
            className="rounded-full bg-white p-3 shadow-sm"
          >
            {isMasterPlaying ? (
              <View className="h-5 w-5 rounded-sm bg-melodizrOrange" />
            ) : (
              <Play color="#F97316" size={20} fill="#F97316" />
            )}
          </TouchableOpacity>
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
        <Text className="text-lg font-bold text-black">Share Masterpiece</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
