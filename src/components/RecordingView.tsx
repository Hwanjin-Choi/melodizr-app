import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Mic, Square, Music, Keyboard, Headphones, Volume2, Play, Pause } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  ZoomIn,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Audio } from 'expo-av';

type RecordingViewProps = {
  stepData: { id: string; title: string; prompt: string };
  recordingStep: number;
  totalSteps: number;
  isRecording: boolean;
  maxDuration: number | null;
  previousTrack?: any;
  onRecordPress: () => void;
  onStopPress: (duration: number) => void;
};

export default function RecordingView({
  stepData,
  recordingStep,
  totalSteps,
  isRecording,
  maxDuration,
  previousTrack,
  onRecordPress,
  onStopPress,
}: RecordingViewProps) {
  const pulseValue = useSharedValue(0);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Overdub management
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Load Previous Track (Backing Track)
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    const loadSound = async () => {
        if (previousTrack) {
            try {
                // Placeholder: In real app, use previousTrack.uri or similar.
                // Using the demo asset for consistency with other views.
                const { sound: s } = await Audio.Sound.createAsync(
                    require("../../assets/demo.wav") // Fallback/Demo
                );
                soundObj = s;
                await s.setVolumeAsync(volume);
                setSound(s);
            } catch (e) {
                console.log("Failed to load backing track", e);
            }
        }
    };
    loadSound();
    return () => {
        if (soundObj) soundObj.unloadAsync();
    };
  }, [previousTrack]);

  // Handle Recording Sycn (Overdub)
  useEffect(() => {
    const handleSync = async () => {
        if (isRecording) {
             // START RECORDING -> START PLAYBACK
             // Stop preview if running
             setIsPreviewPlaying(false);
             
             // Pulse animation
             pulseValue.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
             
             startTimeRef.current = Date.now();
             setElapsed(0);
             
             // Play backing
             if (sound) {
                 await sound.setPositionAsync(0);
                 await sound.playAsync();
             }

             // Timer setup
             intervalRef.current = setInterval(() => {
                if (startTimeRef.current) {
                  const diff = Date.now() - startTimeRef.current;
                  setElapsed(diff);
                  
                  // Auto-stop handled by parent/props usually, but ensure cleanup
                  if (maxDuration && diff >= maxDuration) {
                     clearInterval(intervalRef.current!);
                     onStopPress(maxDuration);
                  }
                }
             }, 50);

        } else {
             // STOP RECORDING -> STOP PLAYBACK
             pulseValue.value = withTiming(0);
             if (intervalRef.current) clearInterval(intervalRef.current);
             setElapsed(0);

             if (sound) {
                 await sound.stopAsync();
             }
        }
    };
    
    handleSync();

    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isRecording, sound]); 

  // Volume Adjustment
  useEffect(() => {
      if (sound) {
          sound.setVolumeAsync(volume);
      }
  }, [volume, sound]);

  // Preview Toggle (Rehearsal)
  const togglePreview = async () => {
      if (!sound) return;
      if (isPreviewPlaying) {
          await sound.pauseAsync();
          setIsPreviewPlaying(false);
      } else {
          await sound.playAsync();
          setIsPreviewPlaying(true);
      }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseValue.value, [0, 1], [1, 1.5]) }],
    opacity: interpolate(pulseValue.value, [0, 1], [0.6, 0]),
  }));

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 100); 
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis}`;
  };

  const handleStop = () => {
     if (startTimeRef.current) {
        onStopPress(Date.now() - startTimeRef.current);
     }
  };

  const renderRecordingIcon = () => {
     if (recordingStep === 0) return <Square color="white" fill="white" size={40} />; 
     if (recordingStep === 1) return <Music color="white" size={48} />; 
     if (recordingStep === 2) return <Keyboard color="white" size={48} />; 
     return <Square color="white" fill="white" size={40} />;
  };

  return (
    <Animated.View exiting={FadeOut} entering={FadeIn} className="flex-1 justify-center items-center">
      
      {/* Top Section */}
      <View className="items-center mb-10 w-full px-6">
        {/* Progress Dots */}
        <View className="flex-row mb-6 gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              className={`h-1.5 w-8 rounded-full ${
                i <= recordingStep ? "bg-melodizrOrange" : "bg-dark3"
              }`}
            />
          ))}
        </View>

        {/* Title */}
        <Text className="text-white text-4xl font-black tracking-tighter text-center mb-2 leading-tight">
          {isRecording ? "Recording..." : stepData.title}
        </Text>
        
        {/* Prompt */}
        {!isRecording && (
            <Text className="text-gray-400 text-base font-medium text-center max-w-[280px]">
             {stepData.prompt}
            </Text>
        )}

        {/* Headphones Recommendation Banner */}
        {previousTrack && !isRecording && (
            <View className="flex-row items-center bg-dark2/60 px-4 py-2 rounded-full mt-4 border border-dark3/50">
                <Headphones color="#3B82F6" size={14} />
                <Text className="text-blue-400 text-xs font-bold ml-2">Headphones Recommended</Text>
            </View>
        )}

        {/* Backing Track Controls (Mini Player) */}
        {previousTrack && !isRecording && (
            <Animated.View entering={FadeIn.delay(200)} className="mt-8 w-full bg-dark2 p-4 rounded-xl border border-dark3 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity onPress={togglePreview} className="w-10 h-10 bg-dark3 rounded-full items-center justify-center mr-3">
                        {isPreviewPlaying ? <Pause color="white" size={16} fill="white" /> : <Play color="white" size={16} fill="white" />}
                    </TouchableOpacity>
                    <View>
                        <Text className="text-white font-bold text-sm">Backing Track</Text>
                        <Text className="text-gray-400 text-xs">{previousTrack.name}</Text>
                    </View>
                </View>

                {/* Vertical Separator */}
                <View className="w-[1px] h-8 bg-dark3 mx-4" />

                {/* Volume Control */}
                <View className="flex-row items-center gap-2">
                    <Volume2 color={volume > 0 ? "white" : "gray"} size={16} />
                    <View className="flex-row gap-1">
                        {[0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
                            <TouchableOpacity 
                                key={v} 
                                onPress={() => setVolume(v)} 
                                className={`w-1.5 h-6 rounded-full ${volume >= v ? 'bg-melodizrOrange' : 'bg-dark3'}`}
                            />
                        ))}
                    </View>
                </View>
            </Animated.View>
        )}
      </View>

      {/* Recording Button Area */}
      <View className="relative items-center justify-center mb-8">
        {isRecording && (
          <Animated.View
            style={pulseStyle}
            className="absolute w-80 h-80 rounded-full bg-melodizrOrange/20"
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={isRecording ? handleStop : onRecordPress}
          className={`w-28 h-28 rounded-full items-center justify-center shadow-2xl shadow-melodizrOrange/40 ${
            isRecording ? "bg-red-500" : "bg-melodizrOrange"
          }`}
        >
          {isRecording ? renderRecordingIcon() : <Mic color="white" size={40} />}
        </TouchableOpacity>
      </View>

      {/* Timer Display */}
      {isRecording && (
        <Animated.View
          entering={ZoomIn.duration(500)}
          className="bg-dark2 px-8 py-3 rounded-full border border-dark3"
        >
          <Text className="text-white tracking-widest text-2xl font-black">
            {formatTime(elapsed)} {maxDuration ? `/ ${formatTime(maxDuration)}` : ''}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}
