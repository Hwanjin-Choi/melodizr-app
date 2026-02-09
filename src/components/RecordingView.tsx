import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import {
  Mic,
  Square,
  Music,
  Keyboard,
  Headphones,
  Volume2,
  Play,
  Pause,
} from "lucide-react-native";
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
import { Audio } from "expo-av";

type RecordingViewProps = {
  stepData: { id: string; title: string; prompt: string };
  recordingStep: number;
  totalSteps: number;
  isRecording: boolean;
  maxDuration: number | null;
  backingTracks?: any[];
  onRecordPress: () => void;
  onStopPress: (duration: number, uri?: string) => void;
};

export default function RecordingView({
  stepData,
  recordingStep,
  totalSteps,
  isRecording,
  maxDuration,
  backingTracks,
  onRecordPress,
  onStopPress,
}: RecordingViewProps) {
  const pulseValue = useSharedValue(0);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Real Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Overdub management
  const [backingSounds, setBackingSounds] = useState<{ [key: string]: Audio.Sound }>({});
  const [volume, setVolume] = useState(0.8);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const preparedRecording = useRef<Audio.Recording | null>(null);

  // Load Previous Tracks (Backing Tracks)
  useEffect(() => {
    const soundObjects: { [key: string]: Audio.Sound } = {};

    const loadSounds = async () => {
      // Unload existing
      await Promise.all(Object.values(backingSounds).map((s) => s.unloadAsync()));
      setBackingSounds({});

      if (backingTracks && backingTracks.length > 0) {
        try {
          // 1. Load All Backing Tracks
          for (const track of backingTracks) {
            console.log("[Audio] Loading Backing Track:", track.name, track.uri);
            const source =
              typeof track.uri === "string" ? { uri: track.uri } : require("../../assets/demo.wav");
            const { sound: s } = await Audio.Sound.createAsync(source);
            await s.setVolumeAsync(volume);
            soundObjects[track.id] = s;

            // Sync Base track for Preview loop
            if (track === backingTracks[0]) {
              s.setOnPlaybackStatusUpdate(async (status) => {
                if (status.isLoaded && status.didJustFinish) {
                  setIsPreviewPlaying(false);

                  // Reset all sounds to 0
                  await Promise.all(
                    Object.values(soundObjects).map((so) => so.setPositionAsync(0))
                  );
                }
              });
            }
          }
          setBackingSounds(soundObjects);
        } catch (e) {
          console.log("Failed to load sounds", e);
        }
      }
    };
    loadSounds();

    return () => {
      Object.values(soundObjects).forEach((s) => s.unloadAsync());
      // beatObj removed
    };
  }, [backingTracks, recordingStep]);

  // 1. Cleanup on Unmount ONLY
  useEffect(() => {
    return () => {
      if (preparedRecording.current) {
        try {
          preparedRecording.current.stopAndUnloadAsync();
        } catch (e) {}
        preparedRecording.current = null;
      }
    };
  }, []);

  // 2. Proactive Preparation (re-run when state changes, but don't cleanup on dependency change)
  useEffect(() => {
    const prepare = async () => {
      // Only prepare if we are NOT recording and don't have one ready
      if (!isRecording && !preparedRecording.current) {
        try {
          const perm = await Audio.requestPermissionsAsync();
          if (perm.status !== "granted") return;

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          // Check again before creating
          if (preparedRecording.current) return;

          const recording = new Audio.Recording();
          const RECORDING_OPTIONS = {
            isMeteringEnabled: true,
            android: {
              extension: ".m4a",
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 44100,
              numberOfChannels: 2,
              bitRate: 128000,
            },
            ios: {
              extension: ".wav",
              outputFormat: Audio.IOSOutputFormat.LINEARPCM,
              audioQuality: Audio.IOSAudioQuality.MAX,
              sampleRate: 44100,
              numberOfChannels: 2,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: {
              mimeType: "audio/wav",
              bitsPerSecond: 128000,
            },
          };

          await recording.prepareToRecordAsync(RECORDING_OPTIONS);
          preparedRecording.current = recording;
          console.log("[Audio] Recording prepared");
        } catch (err) {
          console.error("Failed to prepare recording", err);
        }
      }
    };

    prepare();
  }, [isRecording]);

  // Handle Recording Sync (Overdub)
  useEffect(() => {
    const handleSync = async () => {
      if (isRecording) {
        // START RECORDING -> START PLAYBACK
        // Stop preview if running
        setIsPreviewPlaying(false);

        try {
          // Start Recording (Instant)
          let newRecording: Audio.Recording;

          if (preparedRecording.current) {
            newRecording = preparedRecording.current;
            preparedRecording.current = null; // Consume it
            try {
              await newRecording.startAsync();
            } catch (err) {
              // Fallback if start fails (e.g. already started or invalidated)
              console.warn("Prepared recording failed to start, recreating...", err);
              const RECORDING_OPTIONS = {
                isMeteringEnabled: true,
                android: {
                  extension: ".m4a",
                  outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                  audioEncoder: Audio.AndroidAudioEncoder.AAC,
                  sampleRate: 44100,
                  numberOfChannels: 2,
                  bitRate: 128000,
                },
                ios: {
                  extension: ".wav",
                  outputFormat: Audio.IOSOutputFormat.LINEARPCM,
                  audioQuality: Audio.IOSAudioQuality.MAX,
                  sampleRate: 44100,
                  numberOfChannels: 2,
                  bitRate: 128000,
                  linearPCMBitDepth: 16,
                  linearPCMIsBigEndian: false,
                  linearPCMIsFloat: false,
                },
                web: {
                  mimeType: "audio/wav",
                  bitsPerSecond: 128000,
                },
              };
              const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
              newRecording = recording;
            }
          } else {
            // Fallback if not prepared
            console.log("No prepared recording found, creating new one...");
            const RECORDING_OPTIONS = {
              isMeteringEnabled: true,
              android: {
                extension: ".m4a",
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
                sampleRate: 44100,
                numberOfChannels: 2,
                bitRate: 128000,
              },
              ios: {
                extension: ".wav",
                outputFormat: Audio.IOSOutputFormat.LINEARPCM,
                audioQuality: Audio.IOSAudioQuality.MAX,
                sampleRate: 44100,
                numberOfChannels: 2,
                bitRate: 128000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
              },
              web: {
                mimeType: "audio/wav",
                bitsPerSecond: 128000,
              },
            };
            const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
            newRecording = recording;
          }

          setRecording(newRecording);

          // Pulse animation based on BPM
          let beatDuration = 1000; // default 60bpm
          const baseTrack = backingTracks?.find((t) => t.type === "base") || backingTracks?.[0];
          if (recordingStep >= 1 && baseTrack?.bpm) {
            beatDuration = 60000 / baseTrack.bpm;
            console.log("Using Visual Metronome BPM:", baseTrack?.bpm, "Duration:", beatDuration);
          }
          pulseValue.value = withRepeat(withTiming(1, { duration: beatDuration * 0.5 }), -1, true); // Pulse faster (up/down) to match beat

          // Play ALL backing tracks
          // Wait, loop map
          const sounds = Object.values(backingSounds);
          if (sounds.length > 0) {
            // Reset pos
            await Promise.all(sounds.map((s) => s.setPositionAsync(0)));

            // Mute logic: Step 1 & 2 use Visual Metronome, so MUTE AUDIO.
            if (recordingStep >= 1) {
              await Promise.all(sounds.map((s) => s.setVolumeAsync(0)));
            } else {
              await Promise.all(sounds.map((s) => s.setVolumeAsync(volume)));
            }

            await Promise.all(sounds.map((s) => s.playAsync()));
          }
          // Note: We do NOT play beatSound here for Step 1 anymore. Visual only.
          // if (beatSound) { ... } -> Removed for Recording Phase

          startTimeRef.current = Date.now();
          setElapsed(0);

          // Timer setup
          intervalRef.current = setInterval(async () => {
            if (startTimeRef.current) {
              const diff = Date.now() - startTimeRef.current;
              setElapsed(diff);

              // Auto-stop
              if (maxDuration && diff >= maxDuration) {
                console.log("Max duration reached. Stopping...", diff);
                clearInterval(intervalRef.current!);
                // Use the local newRecording variable to ensure we have the correct reference
                await stopRecordingAndFinish(newRecording, maxDuration);
              }
            }
          }, 50);
        } catch (err) {
          console.error("Failed to start recording", err);
        }
      } else {
        // STOP RECORDING (Manually triggered by User pressing Stop)
        // This block runs when `isRecording` changes to false.
        // However, `recording` state might be set.

        // Stop recording properly
        if (recording) {
          await stopRecordingAndFinish(recording, Date.now() - (startTimeRef.current || 0));
        } else {
          // Just cleanup UI if no recording object (e.g. permission fail case)
          cleanupUI();
        }
      }
    };

    // Helper to stop and finish
    const stopRecordingAndFinish = async (rec: Audio.Recording, finalDuration: number) => {
      let uri = "";
      try {
        // Try to get URI first
        uri = rec.getURI() || "";

        // Stop recording
        // Stop recording
        try {
          await rec.stopAndUnloadAsync();
        } catch (stopError) {
          console.warn("Error stopping/unloading, but proceeding if URI exists", stopError);
        }

        setRecording(null);
        cleanupUI();

        await Promise.all(Object.values(backingSounds).map((s) => s.stopAsync()));

        console.log("Recording finished. URI:", uri);

        // Notify Parent
        if (uri) {
          // Ensure positive duration
          const validDuration = finalDuration > 0 ? finalDuration : 0;
          onStopPress(validDuration, uri);
        } else {
          console.error("Failed to get recording URI");
          Alert.alert("Error", "Recording failed to save.");
        }
      } catch (error) {
        console.error("Failed to stop recording wrapper", error);
      }
    };

    const cleanupUI = () => {
      pulseValue.value = withTiming(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    };

    if (isRecording && !recording) {
      handleSync();
    }

    // Cleanup on unmount
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync(); // Emergency cleanup
      }
      Object.values(backingSounds).forEach((s) => s.stopAsync());
      // if (beatSound) beatSound.stopAsync();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording]); // Only react to `isRecording` flag for STARTING?

  // Volume Adjustment
  useEffect(() => {
    Object.values(backingSounds).forEach((s) => s.setVolumeAsync(volume));
    // if (beatSound) beatSound.setVolumeAsync(volume * 0.8);
  }, [volume, backingSounds]);

  // Preview Toggle (Rehearsal)
  const togglePreview = async () => {
    const sounds = Object.values(backingSounds);
    if (sounds.length === 0) return;

    if (isPreviewPlaying) {
      // Pause All
      await Promise.all(sounds.map((s) => s.pauseAsync()));
      setIsPreviewPlaying(false);
    } else {
      // Play All from 0
      // Restore Volume
      await Promise.all(sounds.map((s) => s.setVolumeAsync(volume)));
      await Promise.all(sounds.map((s) => s.setPositionAsync(0)));
      await Promise.all(sounds.map((s) => s.playAsync()));

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
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${millis}`;
  };

  const handleStop = async () => {
    // User pressed STOP button.
    // We need to stop the recording, process URI, then notify parent.
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null); // Clear local state

        await Promise.all(Object.values(backingSounds).map((s) => s.stopAsync()));
        cleanupUI();

        console.log(
          "Recording stopped. JSON:",
          JSON.stringify({ uri, duration: Date.now() - (startTimeRef.current || 0) })
        );

        // Now notify parent
        if (startTimeRef.current && uri) {
          onStopPress(Date.now() - startTimeRef.current, uri);
        } else {
          console.error("Recording URI is null or start time missing");
        }
      } catch (e) {
        console.error("Error stopping recording", e);
      }
    }
  };

  const cleanupUI = () => {
    pulseValue.value = withTiming(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setElapsed(0);
    // Restore volume just in case
    Object.values(backingSounds).forEach((s) => s.setVolumeAsync(volume));
  };

  const renderRecordingIcon = () => {
    if (recordingStep === 0) return <Square color="white" fill="white" size={40} />;
    if (recordingStep === 1) return <Music color="white" size={48} />;
    if (recordingStep === 2) return <Keyboard color="white" size={48} />;
    return <Square color="white" fill="white" size={40} />;
  };

  return (
    <Animated.View
      exiting={FadeOut}
      entering={FadeIn}
      className="flex-1 items-center justify-center"
    >
      {/* Top Section */}
      <View className="mb-10 w-full items-center px-6">
        {/* Progress Dots */}
        <View className="mb-6 flex-row gap-2">
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
        <Text className="mb-2 text-center text-4xl font-black leading-tight tracking-tighter text-white">
          {isRecording ? "Recording..." : stepData.title}
        </Text>

        {/* Prompt */}
        {!isRecording && (
          <Text className="max-w-[280px] text-center text-base font-medium text-gray-400">
            {stepData.prompt}
          </Text>
        )}

        {/* Headphones Recommendation Banner */}
        {backingTracks && backingTracks.length > 0 && !isRecording && (
          <View className="mt-4 flex-row items-center rounded-full border border-dark3/50 bg-dark2/60 px-4 py-2">
            <Headphones color="#3B82F6" size={14} />
            <Text className="ml-2 text-xs font-bold text-blue-400">Headphones Recommended</Text>
          </View>
        )}

        {/* Backing Track Controls (Mini Player) */}
        {backingTracks && backingTracks.length > 0 && !isRecording && (
          <Animated.View
            entering={FadeIn.delay(200)}
            className="mt-8 w-full rounded-xl border border-dark3 bg-dark2 p-4"
          >
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center text-center">
                <TouchableOpacity
                  onPress={togglePreview}
                  className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-dark3"
                >
                  {isPreviewPlaying ? (
                    <Pause color="white" size={16} fill="white" />
                  ) : (
                    <Play color="white" size={16} fill="white" />
                  )}
                </TouchableOpacity>
                <Text className="text-sm font-bold text-white">Preview Backing</Text>
              </View>

              {/* Volume */}
              <View className="flex-row items-center gap-1">
                <Volume2 color={volume > 0 ? "white" : "gray"} size={14} />
                {[0.4, 0.7, 1.0].map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setVolume(v)}
                    className={`h-4 w-1.5 rounded-full ${volume >= v ? "bg-melodizrOrange" : "bg-dark3"}`}
                  />
                ))}
              </View>
            </View>

            {/* List of Tracks in Preview */}
            <View className="ml-2 border-l-2 border-dark3 pl-3">
              {backingTracks.map((track, i) => (
                <Text key={track.id} className="mb-1 text-xs text-gray-400">
                  • {track.name}
                </Text>
              ))}
            </View>
          </Animated.View>
        )}
      </View>

      {/* Recording Button Area */}
      <View className="relative mb-8 items-center justify-center">
        {isRecording && (
          <Animated.View
            style={pulseStyle}
            className="absolute h-80 w-80 rounded-full bg-melodizrOrange/20"
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={isRecording ? handleStop : onRecordPress}
          className={`h-28 w-28 items-center justify-center rounded-full shadow-2xl shadow-melodizrOrange/40 ${
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
          className="rounded-full border border-dark3 bg-dark2 px-8 py-3"
        >
          <Text className="text-2xl font-black tracking-widest text-white">
            {formatTime(elapsed)} {maxDuration ? `/ ${formatTime(maxDuration)}` : ""}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}
