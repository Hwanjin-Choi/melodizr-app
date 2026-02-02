import React, { useState, useEffect } from "react";
import {
  View,
  SafeAreaView,
  StatusBar,
  Share,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native";
import * as Sharing from "expo-sharing"; // Import sharing
import WelcomeView from "../components/WelcomeView";
import RecordingView from "../components/RecordingView";
import ProcessingView from "../components/ProcessingView";
import InterstitialView from "../components/InterstitialView";
import ResultView from "../components/ResultView";

import { setupAudioMode, extractBpmFromFilename } from "../utils/audioUtils";
import { uploadRecording } from "../services/api";

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

  // Playback State for Interstitial
  const [isPlaying, setIsPlaying] = useState(false);

  // Init Audio Mode
  useEffect(() => {
    setupAudioMode();
  }, []);

  const STEPS = [
    {
      id: "base",
      title: "Beat & Guitar",
      prompt: "Record your rhythmic foundation to set the groove.",
      apiParams: {
        instrument: "acoustic_guitar",
        mode: "chord",
        // Options: strum_down, strum_up_down, arpeggio, quarter, eighth
        chord_pattern: "strum_down",
      },
    },
    {
      id: "melody",
      title: "Melody",
      prompt: "Sing the lead vocal or melody line on top.",
      apiParams: { instrument: "", mode: "vox", chord_pattern: "" },
    },
    {
      id: "piano",
      title: "Piano Layer",
      prompt: "Add harmonic richness with a piano.",
      apiParams: { instrument: "dry_piano", mode: "chord", chord_pattern: "strum_down" },
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
            params.chord_pattern
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
          if (bpm) {
            console.log("Extracted BPM:", bpm);
          }

          addTrack(currentStepData.id, trackName, trackColor, trackUri, bpm);

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
          addTrack(currentStepData.id, "Raw Recording", "#9CA3AF", currentRecordingUri);
          setPhase("interstitial");
        }
      }
    };

    if (phase === "processing") {
      processRecording();
    }
  }, [phase, currentRecordingUri]);

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
    bpm?: number | null
  ) => {
    setTracks((prev) => [...prev, { id: Date.now(), type, name, color, uri, bpm }]);
  };

  const startApp = () => {
    setPhase("idle");
  };

  const startRecording = () => {
    setPhase("recording");
    // Start Logic handled in RecordingView
  };

  const handleRecordingStop = async (duration: number, uri?: string) => {
    // If Step 0, save duration
    if (recordingStep === 0) {
      setSessionDuration(duration);
    }

    if (uri) {
      setCurrentRecordingUri(uri);
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

  const handleShare = async () => {
    // Show ActionSheet to choose track to share
    const options = ["Cancel", ...tracks.map((t) => `Share ${t.name} (${t.type})`)];
    const cancelButtonIndex = 0;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Share Masterpiece",
          message: "Select a track stem to share",
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            // Determine track based on index
            // options has Cancel at 0.
            // tracks array index = buttonIndex - 1.
            const track = tracks[buttonIndex - 1];
            if (track) handleShareTrack(track.id);
          }
        }
      );
    } else {
      // Android simple alert fallback? Or just simple share last track?
      // Let's implement alert with options if possible, but Alert buttons are limited.
      // For now, let's just default to sharing the last track or generic share.
      // Actually, Android usually relies on custom UI or just single share.
      // We will just let them click the individual buttons for stems on Android.
      // But for the main button, let's share the LAST added track (usually the full mix if we had one, or Piano).
      if (tracks.length > 0) {
        const buttons: {
          text: string;
          style?: "default" | "cancel" | "destructive";
          onPress: () => Promise<void> | void;
        }[] = tracks.map((t) => ({
          text: t.name,
          style: "default",
          onPress: async () => await handleShareTrack(t.id),
        }));
        buttons.push({ text: "Cancel", style: "cancel", onPress: async () => {} });

        Alert.alert("Share", "Select a track to share", buttons);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark1">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-6 pt-6">
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
            onTogglePlay={() => setIsPlaying(!isPlaying)}
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
      </View>
    </SafeAreaView>
  );
}
