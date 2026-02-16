import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Alert,
  ActionSheetIOS,
  Platform,
  AppState,
  ActivityIndicator,
} from "react-native";
import Share from "react-native-share"; // Import react-native-share

// ... existing imports ...
import * as Sharing from "expo-sharing"; // Import sharing
import WelcomeView from "../components/WelcomeView";
import RecordingView from "../components/RecordingView";
import ProcessingView from "../components/ProcessingView";
import InterstitialView from "../components/InterstitialView";
import ResultView from "../components/ResultView";
import PermissionBlockedView from "../components/PermissionBlockedView"; // Import Blocked View

import { Audio } from "expo-av"; // Import Audio for permissions

import {
  setupAudioMode,
  extractBpmFromFilename,
  setPlaybackAudioMode,
  setRecordingAudioMode,
  createZipArchive, // Keep if needed for other things, or remove
} from "../utils/audioUtils";
import { uploadRecording, mixTracks } from "../services/api";

export type StudioPhase =
  | "welcome"
  | "idle"
  | "recording"
  | "processing"
  | "interstitial"
  | "result";

export default function StudioScreen() {
  const [phase, setPhase] = useState<StudioPhase>("welcome");
  const [recordingStep, setRecordingStep] = useState(0);
  const [tracks, setTracks] = useState<any[]>([]);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  const [currentRecordingUri, setCurrentRecordingUri] = useState<string | null>(null);
  const [currentRecordingOffset, setCurrentRecordingOffset] = useState<number | null>(null);
  const [isMixing, setIsMixing] = useState(false);

  // Playback State for Interstitial
  const [isPlaying, setIsPlaying] = useState(false);

  // Permission State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null); // null = loading/undetermined

  // Init Audio Mode & Permissions
  useEffect(() => {
    setupAudioMode();
    checkPermissions();
  }, []);

  // Listen for app foregrounding to re-check permissions (if user went to settings)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Audio Mode Switching based on Phase
  useEffect(() => {
    const switchAudioMode = async () => {
      // If we are in "recording" OR "idle" (Preview/Studio), we want mic permission to be active
      // but routed to speaker (allowsIOSDefaultToSpeaker: true).
      // This prevents the "switch" lag when going from Idle -> Recording.
      if (phase === "recording" || phase === "idle") {
        console.log("Switching to Recording Audio Mode (Mic + Speaker)");
        await setRecordingAudioMode();
      } else {
        // Welcome, Processing, Interstitial, Result -> Speaker Active (No Mic needed)
        console.log("Switching to Playback Mode (Speaker Active)");
        await setPlaybackAudioMode();
      }
    };
    switchAudioMode();
  }, [phase]);

  const checkPermissions = async () => {
    try {
      const response = await Audio.requestPermissionsAsync();
      setHasPermission(response.status === "granted");
    } catch (error) {
      console.error("Error asking for permissions:", error);
      // If error, assume denied or try again later?
      // Lets keep it as null or false
    }
  };

  const STEPS = [
    {
      id: "base",
      title: "Beat & Guitar",
      prompt: "Record your rhythmic foundation to set the groove.",
      apiParams: {
        mode: "inst",
        instrument: "",
        chord_pattern: "strum_up_down",
        add_drum: true,
        grid_resolution: "1/16",
      },
    },
    {
      id: "melody",
      title: "Melody",
      prompt: "Sing the lead vocal or melody line on top.",
      apiParams: {
        mode: "vox",
        instrument: "",
        chord_pattern: "",
        add_drum: false,
        tune_preset: "choir",
      },
    },
    {
      id: "piano",
      title: "Piano Layer",
      prompt: "Add harmonic richness with a piano.",
      apiParams: {
        mode: "inst",
        instrument: "dry_piano",
        chord_pattern: "", // Not used
        add_drum: false,
        grid_resolution: "1/16",
      },
    },
  ];

  const currentStepData = STEPS[Math.min(recordingStep, STEPS.length - 1)];

  // Processing Handler (API Call)
  useEffect(() => {
    const processRecording = async () => {
      if (phase === "processing" && currentRecordingUri) {
        try {
          const params = currentStepData.apiParams;

          // Call API
          const response = await uploadRecording(
            currentRecordingUri,
            params.mode,
            params.instrument,
            params.chord_pattern,
            {
              gridResolution: params.grid_resolution,
              tunePreset: params.tune_preset,
              // @ts-ignore
              addDrum: params.add_drum,
            }
          );

          // Use response data
          const trackUri = response.output_audio_url || currentRecordingUri;

          // Determine track specific info
          let trackName = "Processed Track";
          let trackColor = "#3B82F6";

          if (recordingStep === 0) {
            trackName = "Drums & Guitar";
            trackColor = "#3B82F6";
          } else if (recordingStep === 1) {
            trackName = "Vocals";
            trackColor = "#F97316";
          } else {
            trackName = "Piano";
            trackColor = "#10B981";
          }

          // Extract BPM if available (from filename)
          let bpm: number | null = null;
          bpm = extractBpmFromFilename(trackUri);

          // Fallback: If Step 0 (Base), we MUST have a beat. Default to 120 if server didn't provide one.
          if (recordingStep === 0 && !bpm) {
            console.log("No BPM found in filename, defaulting to 120 for Base track");
            bpm = 120;
          }

          if (bpm) {
            console.log("Extracted/Default BPM:", bpm);
          }

          addTrack(
            currentStepData.id,
            trackName,
            trackColor,
            trackUri,
            bpm,
            currentRecordingOffset || 0
          );

          if (recordingStep >= 1) {
            console.log("Step Complete. Going to Result.");
            setPhase("result");
          } else {
            setPhase("interstitial");
          }
        } catch (error: any) {
          console.error("Processing failed", error);
          Alert.alert(
            "Processing Failed",
            "Could not process your recording. Using raw audio instead."
          );

          // Fallback to raw recording
          addTrack(
            currentStepData.id,
            "Raw Recording",
            "#9CA3AF",
            currentRecordingUri,
            null,
            currentRecordingOffset || 0
          );
          setPhase("interstitial");
        }
      }
    };

    if (phase === "processing") {
      processRecording();
    }
  }, [phase, currentRecordingUri, currentRecordingOffset]);

  // Reset player when entering interstitial
  useEffect(() => {
    if (phase === "interstitial") {
      setIsPlaying(false);
      // Reset uri to avoid re-triggering?
      // Actually `phase` change prevents re-trigger.
    }
  }, [phase]);

  const addTrack = (
    type: string,
    name: string,
    color: string,
    uri: string,
    bpm?: number | null,
    offset?: number
  ) => {
    setTracks((prev) => [...prev, { id: Date.now(), type, name, color, uri, bpm, offset }]);
  };

  const startApp = () => {
    setPhase("idle");
  };

  const startRecording = () => {
    setPhase("recording");
    // Start Logic handled in RecordingView
  };

  const handleRecordingStop = async (duration: number, uri?: string, offset?: number) => {
    // If Step 0, save duration
    if (recordingStep === 0) {
      setSessionDuration(duration);
    }

    if (uri) {
      setCurrentRecordingUri(uri);
      if (offset) setCurrentRecordingOffset(offset);
    } else {
      console.warn("No URI returned from recording");
    }

    setPhase("processing");
  };

  const handleNextStep = () => {
    // If we just finished Step 0, go to Step 1
    if (recordingStep === 0) {
      setRecordingStep(1);
      setCurrentRecordingUri(null);
      setPhase("idle");
    } else if (recordingStep === 1) {
      // If we just finished Step 1 (Melody), go to Result immediately
      setPhase("result");
    } else {
      // Typically Piano is last?
      setPhase("result");
    }
  };

  const handleAddPiano = () => {
    setRecordingStep(2);
    setCurrentRecordingUri(null);
    setPhase("idle");
  };

  const handleFinish = () => {
    setPhase("result");
  };

  const resetStudio = () => {
    setPhase("welcome");
    setRecordingStep(0);
    setTracks([]);
    setSessionDuration(null);
    setCurrentRecordingUri(null);
    setCurrentRecordingOffset(null);
  };

  const handleRetakeTrack = (trackId: number) => {
    // Find index of this track
    const index = tracks.findIndex((t) => t.id === trackId);
    if (index === -1) return;

    // Based on index, rollback session state

    Alert.alert(
      "Retake Layer",
      "This will delete this layer and any layers recorded after it. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retake",
          style: "destructive",
          onPress: () => {
            // Rollback
            setTracks((prev) => prev.slice(0, index));
            setRecordingStep(index);
            setCurrentRecordingUri(null);
            if (index === 0) setSessionDuration(null);
            setPhase("idle");
          },
        },
      ]
    );
  };

  const handleRetake = () => {
    const options = ["Cancel", "Retake This Step", "Restart Session"];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 0;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: "Not satisfied?",
          message: "You can try this layer again or start over completely.",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Retake Step
            setTracks((prev) => prev.slice(0, -1)); // Remove last added track
            setCurrentRecordingUri(null);
            if (recordingStep === 0) setSessionDuration(null); // Reset duration if base
            setPhase("idle");
          } else if (buttonIndex === 2) {
            // Restart
            resetStudio();
          }
        }
      );
    } else {
      // Android fallback
      Alert.alert("Retake", "Choose an option", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retake Step",
          onPress: () => {
            setTracks((prev) => prev.slice(0, -1));
            setCurrentRecordingUri(null);
            if (recordingStep === 0) setSessionDuration(null);
            setPhase("idle");
          },
        },
        { text: "Restart Session", style: "destructive", onPress: resetStudio },
      ]);
    }
  };

  const handleShareTrack = async (trackId: number) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track || !track.uri) return;

    // Check availability
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Sharing not available on this device");
      return;
    }

    await Sharing.shareAsync(track.uri, {
      mimeType: "audio/wav",
      dialogTitle: `Share ${track.name}`,
      UTI: "public.audio",
    });
  };

  const handleShareAll = async () => {
    if (tracks.length === 0) return;

    try {
      const activeTracks = tracks.filter((t) => !!t.uri);
      if (activeTracks.length === 0) return;

      // Notify user mixing is starting
      setIsMixing(true);

      const filesToMix = activeTracks.map((t) => ({
        uri: t.uri,
      }));

      // Call API to mix
      const mixedUri = await mixTracks(filesToMix);

      // Dismiss Loading
      setIsMixing(false);

      await Sharing.shareAsync(mixedUri, {
        mimeType: "audio/wav",
        dialogTitle: "Share Mixed Track",
        UTI: "public.audio",
      });
    } catch (error) {
      console.log("Share/Mix failed", error);
      setIsMixing(false);
      Alert.alert("Mixing Failed", "Could not mix tracks. Please try again.");
    }
  };

  const handleShare = async () => {
    // Directly share all without prompt
    handleShareAll();
  };

  return (
    <SafeAreaView className="flex-1 bg-dark1">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-6 pt-6">
        {hasPermission === false ? (
          <PermissionBlockedView />
        ) : (
          <>
            {phase === "welcome" && <WelcomeView onStart={startApp} />}

            {(phase === "idle" || phase === "recording") && (
              <RecordingView
                stepData={currentStepData}
                recordingStep={recordingStep}
                totalSteps={STEPS.length}
                isRecording={phase === "recording"}
                maxDuration={sessionDuration}
                backingTracks={tracks}
                onRecordPress={startRecording}
                onStopPress={handleRecordingStop}
              />
            )}

            {phase === "processing" && <ProcessingView />}

            {phase === "interstitial" && (
              <InterstitialView
                recordingStep={recordingStep}
                lastTrack={tracks[tracks.length - 1]}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onNext={handleNextStep}
                onFinish={handleFinish}
                onRetake={handleRetake}
              />
            )}

            {phase === "result" && (
              <ResultView
                tracks={tracks}
                onReset={resetStudio}
                onShare={handleShare}
                onAddPiano={recordingStep < 2 ? handleAddPiano : undefined}
                onRetakeTrack={handleRetakeTrack}
                onShareTrack={handleShareTrack}
              />
            )}
          </>
        )}

        {/* Mixing Overlay */}
        {isMixing && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-black/70">
            <View className="items-center rounded-2xl bg-dark2 p-6">
              <ActivityIndicator size="large" color="#F97316" className="mb-4" />
              <Text className="text-lg font-bold text-white">Mixing Audio...</Text>
              <Text className="mt-1 text-sm text-gray-400">Please wait a moment</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
