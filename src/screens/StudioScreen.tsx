import React, { useState, useEffect } from "react";
import {
  View,
  SafeAreaView,
  StatusBar,
  Share,
  Alert,
} from "react-native";
import WelcomeView from "../components/WelcomeView";
import RecordingView from "../components/RecordingView";
import ProcessingView from "../components/ProcessingView";
import InterstitialView from "../components/InterstitialView";
import ResultView from "../components/ResultView";

export type StudioPhase = "welcome" | "idle" | "recording" | "processing" | "interstitial" | "result";

export default function StudioScreen() {
  const [phase, setPhase] = useState<StudioPhase>("welcome");
  const [recordingStep, setRecordingStep] = useState(0); 
  const [tracks, setTracks] = useState<any[]>([]);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);

  const STEPS = [
     { id: 'base', title: "Beat & Guitar", prompt: "Record your rhythmic foundation to set the groove." },
     { id: 'melody', title: "Melody", prompt: "Sing the lead vocal or melody line on top." },
     { id: 'piano', title: "Piano Layer", prompt: "Add harmonic richness with a piano or pads." }
  ];

  const currentStepData = STEPS[Math.min(recordingStep, STEPS.length - 1)];

  // Processing Handler
  useEffect(() => {
    if (phase === "processing") {
      const timer = setTimeout(() => {
        // After processing, determine where to go
        if (recordingStep === 0) {
            addTrack("base", "Drums & Guitar", "#3B82F6"); 
            setPhase("interstitial");
        } else if (recordingStep === 1) {
            addTrack("melody", "Vocals", "#F97316");
            setPhase("interstitial");
        } else {
            addTrack("piano", "Piano & Harmony", "#10B981");
            // After Piano, we go straight to Result (Limit 3 tracks)
            setPhase("result");
        }
      }, 4000); 
      
      return () => clearTimeout(timer);
    }
  }, [phase, recordingStep]);

  const addTrack = (type: string, name: string, color: string) => {
     setTracks(prev => [...prev, { id: Date.now(), type, name, color }]);
  };

  const startApp = () => {
    setPhase("idle");
  };

  const startRecording = () => {
    setPhase("recording");
    // Start Logic handled in RecordingView via useEffect mounting
  };

  const handleRecordingStop = (duration: number) => {
      // If Step 0, save duration
      if (recordingStep === 0) {
          setSessionDuration(duration);
      }
      setPhase("processing");
  };

  const handleNextStep = () => {
      setRecordingStep(prev => prev + 1);
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
  };

  const handleShare = async () => {
     try {
       const result = await Share.share({
         message: 'Check out my new track created with Melodizr! 🎵',
         url: 'https://melodizr.app/shared/track-123.wav', // Simulated URL
         title: 'My Melodizr Track'
       });
     } catch (error: any) {
       Alert.alert(error.message);
     }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark1">
      <StatusBar barStyle="light-content" />
      <View className="flex-1 px-6 pt-6">
        
        {phase === "welcome" && (
          <WelcomeView onStart={startApp} />
        )}

        {(phase === "idle" || phase === "recording") && (
           <RecordingView 
             stepData={currentStepData}
             recordingStep={recordingStep}
             totalSteps={STEPS.length}
             isRecording={phase === 'recording'}
             maxDuration={sessionDuration}
             onRecordPress={startRecording}
             onStopPress={handleRecordingStop}
          />
        )}

        {phase === "processing" && (
           <ProcessingView />
        )}

        {phase === "interstitial" && (
           <InterstitialView 
             recordingStep={recordingStep}
             onNext={handleNextStep}
             onFinish={handleFinish}
           />
        )}

        {phase === "result" && (
          <ResultView 
             tracks={tracks}
             onReset={resetStudio}
             onShare={handleShare}
          />
        )}

      </View>
    </SafeAreaView>
  );
}
