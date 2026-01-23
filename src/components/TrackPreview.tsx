import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Play, Pause } from "lucide-react-native";
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    Easing, 
    cancelAnimation,
    useDerivedValue
} from "react-native-reanimated";
import { Audio } from 'expo-av';
import { extractWaveform } from "../utils/audioUtils";

type TrackPreviewProps = {
  trackName: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
};

// Placeholder while loading real data
const LOADING_WAVE = Array.from({ length: 40 }).map(() => 0.2);

export default function TrackPreview({ trackName, isPlaying, onTogglePlay }: TrackPreviewProps) {
  const progress = useSharedValue(0);
  const [waveform, setWaveform] = useState<number[]>(LOADING_WAVE);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [duration, setDuration] = useState(5000);

  // Load Audio & Waveform
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;

    const load = async () => {
       try {
           // 1. Analyze Waveform (Heavy-ish op, do first or parallel)
           // Using local require for demo asset
           const waveData = await extractWaveform(require("../../assets/demo.wav"), 40);
           setWaveform(waveData);

           // 2. Load Sound
           const { sound: s, status } = await Audio.Sound.createAsync(
               require("../../assets/demo.wav")
           );
           soundObj = s;
           setSound(s);
           
           if (status.isLoaded && status.durationMillis) {
               setDuration(status.durationMillis);
           }

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
  }, []);

  // Handle Playback Sync
  useEffect(() => {
    const syncPlayback = async () => {
        if (!sound) return;

        if (isPlaying) {
             // Play
             await sound.playFromPositionAsync(0); // Restart for demo loop feel? or resume? 
             // Implementing "Restart on toggle" logic for previews usually feels snappier.
             // Or better: resume. Let's resume.
             // Actually, parent toggles.
             // Let's just play.
             // Problem: if I was paused, I resume. If I finished, I replay?
             const status = await sound.getStatusAsync();
             if (status.isLoaded) {
                 if (status.positionMillis >= status.durationMillis!) {
                     await sound.replayAsync();
                 } else {
                     await sound.playAsync();
                 }
                 
                 // Animation
                 progress.value = withTiming(1, { 
                     duration: duration - status.positionMillis, // Remaining time
                     easing: Easing.linear 
                 });
             }
        } else {
             // Pause
             await sound.pauseAsync();
             cancelAnimation(progress);
        }
    };
    syncPlayback();
  }, [isPlaying, sound, duration]);
  
  // Update progress value based on playback status intervals?
  // Reanimated `withTiming` is smooth, but drifting can happen.
  // For a short preview, it's fine. 
  // Ideally, we'd use `setOnPlaybackStatusUpdate` to sync exactly, 
  // but that causes many re-renders. `withTiming` is good enough UI approximation.
  
  // Stop when unmounting or changing tracks
  useEffect(() => {
       return () => {
           if (sound) sound.stopAsync();
       }
  }, [trackName]);

  return (
    <View className="bg-dark2/50 border border-dark3/50 px-6 py-4 rounded-xl items-center w-full mb-8">
      <Text className="text-gray-400 text-xs uppercase tracking-widest mb-4">
        {waveform === LOADING_WAVE ? "Analyzing..." : "Converted Result Preview"}
      </Text>
      
      <View className="flex-row items-center w-full justify-between">
         <TouchableOpacity 
            onPress={onTogglePlay}
            className="w-12 h-12 bg-melodizrOrange rounded-full items-center justify-center shadow-lg"
         >
            {isPlaying ? (
                <Pause fill="white" color="white" size={20} />
            ) : (
                <Play fill="white" color="white" size={20} className="ml-1" />
            )}
         </TouchableOpacity>

         <View className="flex-1 ml-4 h-12 flex-row items-center justify-between gap-0.5 opacity-90">
             {waveform.map((barHeight, i) => {
                 return (
                    <WaveBar 
                       key={i} 
                       index={i} 
                       totalBars={waveform.length} 
                       progress={progress} 
                       heightMultiplier={barHeight}
                    />
                 );
             })}
         </View>
      </View>
      
      <Text className="text-white font-bold mt-4">{trackName}</Text>
    </View>
  );
}

const WaveBar = ({ index, totalBars, progress, heightMultiplier }: any) => {
    // Determine if this bar is "active" (played) based on progress
    const isActive = useDerivedValue(() => {
        return (index / totalBars) < progress.value;
    });

    const style = useAnimatedStyle(() => ({
        height: 16 + (heightMultiplier * 24), // Dynamic height 16-40
        backgroundColor: isActive.value ? '#F97316' : '#374151', // Melodizr Orange vs Gray
        opacity: isActive.value ? 1 : 0.5
    }));

    return <Animated.View style={style} className="w-1.5 rounded-full" />;
};
