"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MeetingRecorderDashboard.module.css";
import { Mic, Square, Trash2, RefreshCw, UploadCloud, FileAudio, Sparkles, Zap, Plus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface MeetingRecorderDashboardProps {
  pageId: string;
  onTranscriptionComplete: () => void;
}

export default function MeetingRecorderDashboard({ pageId, onTranscriptionComplete }: MeetingRecorderDashboardProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const { addToast } = useAppStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Speech Recognition refs
  const recognitionRef = useRef<any>(null);
  const recognitionTextRef = useRef<string>("");

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

  const handleChooseRecord = () => {
    setStatus("recording");
    setIsRecordingActive(false);
    setDuration(0);
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
        if (useAI) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          await handleAudioProcessing(audioBlob);
        } else {
          await handleLocalProcessing();
        }
      };

      // Set up browser-based real-time SpeechRecognition if AI is disabled
      if (!useAI) {
        recognitionTextRef.current = "";
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionClass) {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          
          recognition.onresult = (event: any) => {
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
              }
            }
            if (finalTranscript) {
              recognitionTextRef.current += finalTranscript;
            }
          };

          recognition.onerror = (e: any) => {
            console.error("Speech recognition error:", e);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } else {
          addToast("⚠️ Web Speech API is not supported in this browser. Transcript will be empty.", "warning");
        }
      }

      setupVisualizer(stream);

      mediaRecorder.start();
      setIsRecordingActive(true);
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
    setIsRecordingActive(false);
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

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
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

  // Local Free Mode Processing (Zero Token cost)
  const handleLocalProcessing = async () => {
    setStatus("processing");
    
    const textStr = recognitionTextRef.current.trim();

    const localMeetingNotes = {
      type: "meeting",
      summary: {
        actionItems: [
          { text: "Double click to write your first action item here...", citations: [1] }
        ],
        sections: [
          {
            title: "Context & Purpose",
            bullets: [
              { text: "Double click to write custom notes on purpose here...", citations: [1] }
            ]
          },
          {
            title: "Logistics & Setup",
            bullets: [
              { text: "Details on logistics and setup...", citations: [1] }
            ]
          }
        ]
      },
      notes: `
        <h2 style="color: #a78bfa; font-size: 18px; margin-top: 0;">Manual Meeting Notes</h2>
        <p style="color: #d1d5db; line-height: 1.6;">Use the text fields or double click headings to customize these manual notes.</p>
      `,
      transcript: [
        { index: 1, speaker: "Transcribed Voice", text: textStr || "No live speech captured. Click the options menu to edit raw contents." }
      ]
    };

    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Meeting @${new Date().toLocaleDateString('default', { dateStyle: 'medium' })}`,
          content: JSON.stringify(localMeetingNotes),
        }),
      });

      if (res.ok) {
        addToast("✨ Local meeting notes template created successfully!", "success");
        onTranscriptionComplete();
      } else {
        addToast("Failed to save local template.", "error");
        setStatus("idle");
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to save local template.", "error");
      setStatus("idle");
    }
  };

  // Start directly with a blank manual draft (Zero tokens)
  const handleStartBlankManualNotes = async () => {
    setStatus("processing");
    const blankMeetingNotes = {
      type: "meeting",
      summary: {
        actionItems: [
          { text: "Add your first action item here...", citations: [] }
        ],
        sections: [
          {
            title: "Context & Purpose",
            bullets: [
              { text: "Write the meeting context here...", citations: [] }
            ]
          },
          {
            title: "Logistics & Setup",
            bullets: [
              { text: "Write setup details here...", citations: [] }
            ]
          }
        ]
      },
      notes: `
        <h2 style="color: #a78bfa; font-size: 18px; margin-top: 0;">Meeting Details</h2>
        <p style="color: #d1d5db; line-height: 1.6;">Start manually logging notes here.</p>
      `,
      transcript: [
        { index: 1, speaker: "Editor", text: "Manual meeting note drafting session." }
      ]
    };

    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Meeting @${new Date().toLocaleDateString('default', { dateStyle: 'medium' })}`,
          content: JSON.stringify(blankMeetingNotes),
        }),
      });

      if (res.ok) {
        addToast("📝 Created a blank manual meeting note draft!", "success");
        onTranscriptionComplete();
      } else {
        addToast("Failed to save blank template.", "error");
        setStatus("idle");
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to save blank template.", "error");
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

          {/* Toggle Switch */}
          <div className={styles.toggleRow}>
            <button 
              className={`${styles.toggleBtn} ${useAI ? styles.toggleActive : ""}`}
              onClick={() => setUseAI(true)}
              title="Transcribes and summarizes automatically with Gemini AI (uses API credits)"
            >
              <Sparkles size={14} /> AI Copilot
            </button>
            <button 
              className={`${styles.toggleBtn} ${!useAI ? styles.toggleActive : ""}`}
              onClick={() => setUseAI(false)}
              title="Transcribes locally on your device for free, with zero token costs"
            >
              <Zap size={14} /> Free Local Mode
            </button>
          </div>

          <div className={styles.actionsGrid}>
            <div className={styles.actionCard} onClick={handleChooseRecord}>
              <Mic size={24} className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Record Live Meeting</h3>
              <p className={styles.cardDesc}>
                {useAI ? "Transcribe & summarize with AI" : "Local real-time free transcription"}
              </p>
            </div>

            {useAI ? (
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
            ) : (
              <div className={styles.actionCard} onClick={handleStartBlankManualNotes}>
                <Plus size={24} className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>Blank Manual Draft</h3>
                <p className={styles.cardDesc}>Write meeting notes directly without recording</p>
              </div>
            )}
          </div>
        </>
      )}

      {status === "recording" && (
        <div className={styles.recordingPanel}>
          <div className={styles.animationContainer}>
            {isRecordingActive && (
              <>
                <div className={styles.pulseRing} />
                <div className={`${styles.pulseRing} ${styles.ring2}`} />
              </>
            )}
            <div 
              className={`${styles.iconWrapper} ${isRecordingActive ? styles.pulseMic : ""}`} 
              style={isRecordingActive ? { background: "rgba(220, 38, 38, 0.1)", borderColor: "rgba(220, 38, 38, 0.3)", color: "#ef4444", marginBottom: 0 } : { background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)", color: "#9ca3af", marginBottom: 0 }}
            >
              <Mic size={32} />
            </div>
          </div>

          <div className={styles.timer}>{formatTime(duration)}</div>
          
          {isRecordingActive && (
            <div className={styles.visualizerWrapper}>
              <canvas ref={canvasRef} width={300} height={60} className={styles.canvas} />
            </div>
          )}

          <div className={styles.recordingControls}>
            {!isRecordingActive ? (
              <button className={styles.startBtn} onClick={startRecordingSession}>
                <Mic size={16} /> Start Recording
              </button>
            ) : (
              <button className={styles.stopButton} onClick={stopRecordingSession} title="Stop and generate meeting notes">
                <Square size={20} fill="#ffffff" />
              </button>
            )}
            <button className={styles.cancelButton} onClick={cancelRecordingSession} title="Discard and go back">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className={styles.processingPanel}>
          <div className={styles.spinner}></div>
          <h3 className={styles.cardTitle} style={{ marginBottom: "8px" }}>
            {useAI ? "Analyzing & Structuring Notes" : "Preparing Workspace Notes"}
          </h3>
          <p className={styles.cardDesc}>
            {useAI ? "Cora AI is processing transcription and parsing action items..." : "Structuring your manual workspace note template..."}
          </p>
        </div>
      )}
    </div>
  );
}
