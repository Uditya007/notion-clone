"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AudioRecorder.module.css";
import { Mic, Square, Trash2, X, RefreshCw } from "lucide-react";

interface AudioRecorderProps {
  onTranscribeComplete: (html: string) => void;
  onClose: () => void;
}

export default function AudioRecorder({ onTranscribeComplete, onClose }: AudioRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Visualizer refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopRecordingSession();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecordingSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioProcessing(audioBlob);
      };

      // Set up real-time audio visualization
      setupVisualizer(stream);

      // Start capture
      mediaRecorder.start();
      setStatus("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Failed to start audio recording:", err);
      alert("Microphone permission was denied or failed to initialize.");
      onClose();
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    if (typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    analyser.fftSize = 64;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    drawVisualizer();
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!ctx || !analyser || !dataArray) return;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray as any);

      // Gradient background matching dark theme
      ctx.fillStyle = "rgba(17, 24, 39, 0.2)";
      ctx.fillRect(0, 0, width, height);

      const barWidth = (width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2;

        // Soft visual purple and blue hues matching Cora theme
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "#3b82f6");
        gradient.addColorStop(1, "#8b5cf6");

        ctx.fillStyle = gradient;
        
        // Render symmetric visualization
        const yOffset = (height - barHeight) / 2;
        ctx.fillRect(x, yOffset, barWidth - 4, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const stopRecordingSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleAudioProcessing = async (blob: Blob) => {
    setStatus("processing");
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    try {
      const res = await fetch("/api/pages/audio", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onTranscribeComplete(data.html);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to process audio.");
      }
    } catch (err) {
      console.error("Failed to upload/transcribe audio:", err);
      alert("An error occurred during audio AI transcription.");
    } finally {
      setStatus("idle");
      onClose();
    }
  };

  const cancelRecordingSession = () => {
    stopRecordingSession();
    setStatus("idle");
    onClose();
  };

  return (
    <div className={styles.recorderFloatingBar}>
      {status === "idle" && (
        <div className={styles.idleState}>
          <div className={styles.desc}>
            <Mic size={18} style={{ color: "#8b5cf6" }} />
            <span>Ready to record dynamic Voice Note</span>
          </div>
          <button className={styles.recordStartBtn} onClick={startRecordingSession}>
            Start Recording
          </button>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      )}

      {status === "recording" && (
        <div className={styles.recordingState}>
          <div className={styles.pulseIndicator}>
            <span className={styles.redDot} />
            <span className={styles.timer}>{formatTime(duration)}</span>
          </div>

          <div className={styles.visualizerContainer}>
            <canvas ref={canvasRef} width={220} height={40} className={styles.canvas} />
          </div>

          <div className={styles.controls}>
            <button className={styles.stopBtn} onClick={stopRecordingSession} title="Stop and transcribe speech">
              <Square size={16} />
              <span>Transcribe</span>
            </button>
            <button className={styles.cancelBtn} onClick={cancelRecordingSession} title="Cancel recording">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className={styles.processingState}>
          <RefreshCw size={18} className={styles.spinningIcon} />
          <span>Cora AI is parsing speech & generating document block...</span>
        </div>
      )}
    </div>
  );
}
