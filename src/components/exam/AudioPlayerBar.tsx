"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Headphones, FastForward, CheckCircle2 } from "lucide-react";
import { formatSeconds } from "@/utils/timer";

interface AudioPlayerBarProps {
  audioUrl?: string;
  title?: string;
  autoPlay?: boolean;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioUrl,
  title = "HSK 官方原版听力录音 (Official Listening Audio)",
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [jumpFeedback, setJumpFeedback] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    const handleCustomSeek = (e: any) => {
      const targetTime = e.detail?.time;
      if (typeof targetTime === "number" && audioRef.current) {
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        setJumpFeedback(`🎧 已跳转至 ${formatSeconds(targetTime)}`);
        setTimeout(() => setJumpFeedback(null), 2500);
      }
    };
    window.addEventListener("seek-audio-time", handleCustomSeek);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      window.removeEventListener("seek-audio-time", handleCustomSeek);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const seekRelative = (sec: number) => {
    if (audioRef.current) {
      const target = Math.max(0, Math.min(duration, audioRef.current.currentTime + sec));
      audioRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  if (!audioUrl) return null;

  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs relative">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Jump Feedback Pill */}
      {jumpFeedback && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold shadow-md animate-in fade-in zoom-in-95 flex items-center gap-1 z-20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{jumpFeedback}</span>
        </div>
      )}

      {/* Left: Audio Info & Icon */}
      <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
        <div className="w-8 h-8 rounded-lg bg-red-600/30 text-red-400 border border-red-500/30 flex items-center justify-center flex-shrink-0">
          <Headphones className="w-4 h-4 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
            <span>🎧 听力录音 (듣기 오디오)</span>
            <span className="text-[10px] bg-red-950 text-red-300 border border-red-800/50 px-1.5 py-0.2 rounded font-mono">
              MP3
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {formatSeconds(currentTime)} / {formatSeconds(duration || 0)}
          </div>
        </div>
      </div>

      {/* Middle: Controls & Progress */}
      <div className="flex items-center gap-2 flex-1 max-w-md w-full">
        <button
          type="button"
          onClick={() => seekRelative(-5)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="后退5秒"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-600/30 transition transform active:scale-95 flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
        />

        <button
          type="button"
          onClick={() => seekRelative(5)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="快进5秒"
        >
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Playback Speed & Volume */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Speed Toggles */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          {[0.8, 1.0, 1.2].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRateChange(r)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition ${
                playbackRate === r
                  ? "bg-red-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r}x
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 text-slate-400 hover:text-white transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerBar;
