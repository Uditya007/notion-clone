'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './MeetingHud.module.css';

type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export default function MeetingHud() {
  const [platform, setPlatform] = useState('Google Meet');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [summaryPageId, setSummaryPageId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const outputPathRef = useRef<string | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Animate in
    setTimeout(() => setVisible(true), 50);

    // Get platform from URL
    const params = new URLSearchParams(window.location.search);
    const p = params.get('platform');
    if (p) setPlatform(p);

    // Listen for platform updates from main process
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.on('meeting-platform', (p: any) => {
        if (typeof p === 'string') setPlatform(p);
      });
    }
  }, []);

  // Duration timer
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingState === 'idle') setDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordingState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartRecording = async () => {
    if (!window.electron) return;
    setRecordingState('recording');
    const result = await window.electron.startSystemRecording();
    if (result.success) {
      outputPathRef.current = result.outputPath;
    } else {
      setRecordingState('error');
    }
  };

  const handleStopAndSummarise = async () => {
    if (!window.electron || !outputPathRef.current) return;
    setRecordingState('processing');

    const result = await window.electron.stopSystemRecording(outputPathRef.current);
    if (!result.success) { setRecordingState('error'); return; }

    // Convert base64 to blob and send to Gemini API
    try {
      const byteChars = atob(result.base64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const audioBlob = new Blob([byteArr], { type: result.mimeType });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'meeting.wav');
      formData.append('platform', platform);

      const res = await fetch('/api/pages/audio/meeting', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.pageId) {
        setSummaryPageId(data.pageId);
        setRecordingState('done');
      } else {
        setRecordingState('error');
      }
    } catch (err) {
      setRecordingState('error');
    }
  };

  const handleOpenInCora = () => {
    if (window.electron && summaryPageId) {
      window.electron.openMeetingInCora(summaryPageId);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      if (window.electron) window.electron.closeMeetingHud();
    }, 300);
  };

  const platformIcon = platform === 'Zoom' ? '💙' : '🟢';

  return (
    <div className={`${styles.hud} ${visible ? styles.hudVisible : ''}`}>
      {/* Header */}
      <div className={styles.hudHeader}>
        <div className={styles.platformBadge}>
          <span className={styles.platformDot} />
          <span>{platformIcon} {platform} detected</span>
        </div>
        <button className={styles.dismissBtn} onClick={handleDismiss}>✕</button>
      </div>

      {/* Body */}
      <div className={styles.hudBody}>
        {recordingState === 'idle' && (
          <button className={styles.recordBtn} onClick={handleStartRecording}>
            <span className={styles.micIcon}>🎙️</span>
            Record & Summarise
          </button>
        )}

        {recordingState === 'recording' && (
          <div className={styles.recordingRow}>
            <div className={styles.recordingIndicator}>
              <span className={styles.redDot} />
              <span className={styles.durationText}>{formatDuration(duration)}</span>
            </div>
            <button className={styles.stopBtn} onClick={handleStopAndSummarise}>
              ⏹ Stop & Summarise
            </button>
          </div>
        )}

        {recordingState === 'processing' && (
          <div className={styles.processingRow}>
            <div className={styles.spinner} />
            <span>Summarising with Gemini AI...</span>
          </div>
        )}

        {recordingState === 'done' && (
          <div className={styles.doneRow}>
            <span className={styles.doneCheck}>✅</span>
            <span>Summary ready!</span>
            <button className={styles.openBtn} onClick={handleOpenInCora}>
              Open in Cora →
            </button>
          </div>
        )}

        {recordingState === 'error' && (
          <div className={styles.errorRow}>
            <span>❌ Error — check mic permissions</span>
            <button className={styles.retryBtn} 
              onClick={() => setRecordingState('idle')}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}
