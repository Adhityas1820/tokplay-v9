import { useState, useRef, useEffect, useCallback } from 'react';

const SPEEDS = [1, 1.5, 2, 0.5];

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function recalcVolumes(tracks) {
  if (!tracks.length) return tracks;
  const minRMS = Math.min(...tracks.map(t => t.rms || 0.001));
  return tracks.map(t => {
    const ratio = minRMS / (t.rms || 0.001);
    return { ...t, vol: Math.max(0.05, Math.min(ratio, 1.0)) };
  });
}

export function usePlayer(viewTracks) {
  const audioRef = useRef(new Audio());
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [loopOn, setLoopOn] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState({ current: 0, total: 0, pct: 0 });

  const enrichedTracks = recalcVolumes(viewTracks);
  const enrichedRef = useRef(enrichedTracks);
  enrichedRef.current = enrichedTracks;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const shuffleRef = useRef(shuffleOn);
  shuffleRef.current = shuffleOn;
  const loopRef = useRef(loopOn);
  loopRef.current = loopOn;

  const audio = audioRef.current;

  const getNextIndex = useCallback((idx) => {
    const tracks = enrichedRef.current;
    if (shuffleRef.current && tracks.length > 1) {
      let r; do { r = Math.floor(Math.random() * tracks.length); } while (r === idx);
      return r;
    }
    return (idx + 1) % tracks.length;
  }, []);

  const loadTrack = useCallback((index, autoplay = false) => {
    const tracks = enrichedRef.current;
    if (index < 0 || index >= tracks.length) return;
    const track = tracks[index];
    audio.src = track.downloadUrl;
    audio.playbackRate = audio.playbackRate; // preserve speed
    audio.load();
    audio.volume = track.vol != null ? track.vol : 1;
    setCurrentIndex(index);
    if (autoplay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: track.name, artist: 'TokPlay', album: 'TikTok Audio' });
    }
  }, [audio]);

  const togglePlay = useCallback(() => {
    const tracks = enrichedRef.current;
    if (!tracks.length) return;
    if (currentIndexRef.current === -1) { loadTrack(0, true); return; }
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  }, [audio, isPlaying, loadTrack]);

  const nextTrack = useCallback(() => {
    const tracks = enrichedRef.current;
    if (!tracks.length) return;
    loadTrack(getNextIndex(currentIndexRef.current), true);
  }, [loadTrack, getNextIndex]);

  const prevTrack = useCallback(() => {
    const tracks = enrichedRef.current;
    if (!tracks.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    loadTrack((currentIndexRef.current - 1 + tracks.length) % tracks.length, true);
  }, [audio, loadTrack]);

  const seek = useCallback((pct) => {
    const tracks = enrichedRef.current;
    const track = tracks[currentIndexRef.current];
    if (!track || !audio.duration) return;
    audio.currentTime = pct * (track.durationSeconds || audio.duration);
  }, [audio]);

  const cycleSpeed = useCallback(() => {
    const idx = (SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length;
    const speed = SPEEDS[idx];
    audio.playbackRate = speed;
    setPlaybackSpeed(speed);
    return speed;
  }, [audio]);

  useEffect(() => {
    const onTimeUpdate = () => {
      const tracks = enrichedRef.current;
      const track = tracks[currentIndexRef.current];
      if (!track || !audio.duration) return;
      const dur = track.durationSeconds || audio.duration;
      const pct = Math.min((audio.currentTime / dur) * 100, 100);
      setProgress({ current: audio.currentTime, total: dur, pct });
      if (audio.currentTime >= dur) {
        if (loopRef.current) { audio.currentTime = 0; return; }
        const ni = getNextIndex(currentIndexRef.current);
        loadTrack(ni, true);
      }
    };
    const onEnded = () => {
      if (loopRef.current) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      const ni = getNextIndex(currentIndexRef.current);
      loadTrack(ni, true);
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', togglePlay);
      navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
      navigator.mediaSession.setActionHandler('seekto', d => { if (d.seekTime != null) audio.currentTime = d.seekTime; });
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [audio, togglePlay, prevTrack, nextTrack, loadTrack, getNextIndex]);

  const toggleShuffle = () => setShuffleOn(v => !v);
  const toggleLoop = () => setLoopOn(v => !v);

  const stopAndReset = () => {
    audio.pause();
    audio.src = '';
    setIsPlaying(false);
    setCurrentIndex(-1);
    setProgress({ current: 0, total: 0, pct: 0 });
  };

  return {
    currentIndex, isPlaying, shuffleOn, loopOn, playbackSpeed,
    progress, fmt,
    loadTrack, togglePlay, nextTrack, prevTrack, seek,
    toggleShuffle, toggleLoop, cycleSpeed, stopAndReset,
    enrichedTracks,
  };
}
