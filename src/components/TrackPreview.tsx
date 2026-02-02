import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Play, Pause, RefreshCcw, Share } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
  useDerivedValue,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { extractWaveform } from "../utils/audioUtils";

type TrackPreviewProps = {
  trackName: string;
  uri?: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRetake?: () => void;
  onShare?: () => void;
};

// Placeholder while loading real data
const LOADING_WAVE = Array.from({ length: 40 }).map(() => 0.2);

const PROGRESS_WIDTH = 200; // Fixed width for progress bar for now, or use flex

export default function TrackPreview({
  trackName,
  uri,
  isPlaying,
  onTogglePlay,
  onRetake,
  onShare,
  onFinish,
}: TrackPreviewProps & { onFinish?: () => void }) {
  const progress = useSharedValue(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0); // Add state for UI text updates

  // Load Sound
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;

    const load = async () => {
      try {
        const source = uri ? { uri } : require("../../assets/demo.wav");
        const { sound: s, status } = await Audio.Sound.createAsync(source);
        soundObj = s;
        setSound(s);

        if (status.isLoaded && status.durationMillis) {
          setDuration(status.durationMillis);
        }

        // Listener for sync
        s.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            if (status.durationMillis) {
              progress.value = withTiming(status.positionMillis / status.durationMillis, {
                duration: 100,
                easing: Easing.linear,
              });

              if (status.didJustFinish) {
                console.log("Track Finished");
                if (onFinish) onFinish(); // Notify parent
                // Don't auto-replay. Parent toggles off.
                // Reset visuals
                progress.value = withTiming(0);
                setPosition(0);
                s.setPositionAsync(0);
              }
            }
          }
        });
      } catch (e) {
        console.log("Error loading audio:", e);
      }
    };

    load();

    return () => {
      if (soundObj) {
        soundObj.unloadAsync();
      }
    };
  }, [uri]);

  // Handle Playback Control from Parent
  useEffect(() => {
    const controlSound = async () => {
      if (!sound) return;

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

      if (isPlaying) {
        // Check if finished, if so restart
        if (status.positionMillis >= (status.durationMillis || 0)) {
          await sound.replayAsync();
        } else {
          await sound.playAsync();
        }
      } else {
        await sound.pauseAsync();
      }
    };
    controlSound();
  }, [isPlaying, sound]);

  // Simple formatter
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View className="mb-4 w-full rounded-2xl border border-dark3/50 bg-dark2/80 px-4 py-3">
      <View className="flex-row items-center justify-between">
        {/* Play Button */}
        <TouchableOpacity
          onPress={onTogglePlay}
          className="h-10 w-10 items-center justify-center rounded-full bg-melodizrOrange shadow-sm active:scale-95"
        >
          {isPlaying ? (
            <Pause fill="white" color="white" size={18} />
          ) : (
            <Play fill="white" color="white" size={18} className="ml-0.5" />
          )}
        </TouchableOpacity>

        {/* Progress Bar & Info */}
        <View className="ml-3 flex-1">
          <View className="mb-1 flex-row justify-between">
            <Text className="text-sm font-bold text-white">{trackName}</Text>
            <Text className="text-xs font-medium text-gray-400">
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>

          <View className="relative h-2 w-full overflow-hidden rounded-full bg-dark3">
            <Animated.View
              className="absolute bottom-0 left-0 top-0 bg-melodizrOrange"
              style={progressStyle}
            />
          </View>
        </View>

        {/* Retake Button */}
        {onRetake && (
          <TouchableOpacity
            onPress={onRetake}
            className="ml-3 h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-dark3 active:scale-95"
          >
            <RefreshCcw color="#ef4444" size={16} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
