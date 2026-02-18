export default function Player({
  track, isPlaying, shuffleOn, loopOn, playbackSpeed, progress, fmt,
  onTogglePlay, onPrev, onNext, onToggleShuffle, onToggleLoop, onCycleSpeed, onSeek
}) {
  const title = track ? track.name : 'No track selected';
  const status = track ? null : 'Paste a link to begin';

  const handleProgressClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek((e.clientX - r.left) / r.width);
  };

  return (
    <div className="now-playing">
      <div className="player-card">
        <div className="progress-row">
          <span className="progress-time">{fmt(progress.current)}</span>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
          </div>
          <span className="progress-time">{fmt(progress.total)}</span>
        </div>
        <div className="now-info">
          <div className={`now-art ${isPlaying ? 'spinning' : ''}`}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="18" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            <div className="disc" />
          </div>
          <div className="now-meta">
            <div className="now-title">{title}</div>
            <div className="now-status">{status}</div>
          </div>
        </div>
        <div className="controls">
          <button className={`ctrl-btn small ${shuffleOn ? 'active' : ''}`} onClick={onToggleShuffle} title="Shuffle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
          </button>
          <button className={`ctrl-btn small ${loopOn ? 'active' : ''}`} onClick={onToggleLoop} title="Loop">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
          <button className="ctrl-btn" onClick={onPrev}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16z"/><rect x="5" y="4" width="2" height="16"/></svg>
          </button>
          <button className="ctrl-btn play" onClick={onTogglePlay}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              {isPlaying
                ? <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
                : <polygon points="6,3 20,12 6,21"/>
              }
            </svg>
          </button>
          <button className="ctrl-btn" onClick={onNext}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4z"/><rect x="17" y="4" width="2" height="16"/></svg>
          </button>
          <button className={`ctrl-btn small ${playbackSpeed !== 1 ? 'active' : ''}`} onClick={onCycleSpeed}>
            <span className="speed-label">{playbackSpeed}x</span>
          </button>
        </div>
      </div>
    </div>
  );
}
