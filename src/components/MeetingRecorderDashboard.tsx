"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MeetingRecorderDashboard.module.css";
import { Mic, Square, Trash2, RefreshCw, UploadCloud, FileAudio } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface MeetingRecorderDashboardProps {
  pageId: string;
  onTranscriptionComplete: () => void;
}

export default function MeetingRecorderDashboard({ pageId, onTranscriptionComplete }: MeetingRecorderDashboardProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const [duration, setDuration] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { addToast } = useAppStore();

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
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

      setupVisualizer(stream);

      mediaRecorder.start();
      setStatus("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      addToast("🎙️ Microphone active. Recording meeting...", "info");
    } catch (err) {
      console.error("Failed to start audio recording:", err);
      addToast("❌ Microphone permission was denied or failed to initialize.", "error");
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
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(10, 10, 18, 0.3)";
      ctx.fillRect(0, 0, width, height);

      const barWidth = (width / dataArray.length) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
        gradient.addColorStop(1, "#8b5cf6");

        ctx.fillStyle = gradient;
        const yOffset = (height - barHeight) / 2;
        ctx.fillRect(x, yOffset, barWidth - 2, barHeight);

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
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const cancelRecordingSession = () => {
    stopRecordingSession();
    setStatus("idle");
    addToast("🗑️ Recording discarded.", "warning");
  };

  const handleAudioProcessing = async (blob: Blob) => {
    setStatus("processing");
    const formData = new FormData();
    formData.append("file", blob, "meeting_recording.webm");
    formData.append("pageId", pageId);

    try {
      const res = await fetch("/api/pages/audio/meeting", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        addToast("✨ Cora AI successfully generated meeting notes!", "success");
        onTranscriptionComplete();
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to process audio meeting notes.", "error");
        setStatus("idle");
      }
    } catch (err) {
      console.error("Failed to transcribe audio:", err);
      addToast("❌ An error occurred during audio AI transcription.", "error");
      setStatus("idle");
    }
  };

  // Upload Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleAudioProcessing(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      await handleAudioProcessing(file);
    } else {
      addToast("❌ Please drop a valid audio file (MP3, WAV, M4A, WEBM)", "error");
    }
  };

  return (
    <div className={styles.container}>
      {status === "idle" && (
        <>
          <div className={styles.iconWrapper}>
            <Mic size={32} />
          </div>
          <h2 className={styles.title}>Cora Meeting Intelligence</h2>
          <p className={styles.subtitle}>
            Capture your conversations. Cora AI transcribes audio and synthesizes professional meeting notes with summaries, key decisions, and action tables instantly.
          </p>

          <div className={styles.actionsGrid}>
            <div className={styles.actionCard} onClick={startRecordingSession}>
              <Mic size={24} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Record Live Meeting</h3>
              <p className={styles.cardDesc}>Transcribe voice in real time</p>
            </div>

            <div 
              className={`${styles.actionCard} ${isDragOver ? styles.dragover : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={24} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Upload Audio File</h3>
              <p className={styles.cardDesc}>Drag & drop MP3, WAV, M4A, WEBM</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                accept="audio/*"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </>
      )}

      {status === "recording" && (
        <div className={styles.recordingPanel}>
          <div className={`${styles.iconWrapper} ${styles.pulseMic}`} style={{ background: "rgba(220, 38, 38, 0.1)", borderColor: "rgba(220, 38, 38, 0.3)", color: "#ef4444" }}>
            <Mic size={32} />
          </div>
          <div className={styles.timer}>{formatTime(duration)}</div>
          <div className={styles.visualizerWrapper}>
            <canvas ref={canvasRef} width={300} height={60} className={styles.canvas} />
          </div>

          <div className={styles.recordingControls}>
            <button className={styles.stopButton} onClick={stopRecordingSession} title="Stop and generate meeting notes">
              <Square size={20} fill="#ffffff" />
            </button>
            <button className={styles.cancelButton} onClick={cancelRecordingSession} title="Discard recording">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className={styles.processingPanel}>
          <div className={styles.spinner}></div>
          <h3 className={styles.cardTitle} style={{ marginBottom: "8px" }}>Analyzing & Structuring Notes</h3>
          <p className={styles.cardDesc}>Cora AI is processing transcription and parsing action items...</p>
        </div>
      )}
    </div>
  );
}
