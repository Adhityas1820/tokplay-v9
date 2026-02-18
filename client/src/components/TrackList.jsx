import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(s) {
  if (!s || isNaN(s)) return '—';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function TrackItem({ doc: trackDoc, viewIndex, isActive, activePlaylistId, uid, onPlay, onDelete, onAddToPlaylist, onRemoveFromPlaylist, animDelay }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const isProcessing = trackDoc.status === 'processing';
  const isError = trackDoc.status === 'error';
  const isReady = trackDoc.status === 'ready';

  const startEdit = (e) => {
    e.stopPropagation();
    setEditName(trackDoc.name || '');
    setEditing(true);
  };

  const saveName = async () => {
    setEditing(false);
    if (!editName.trim()) return;
    await updateDoc(doc(db, 'users', uid, 'tracks', trackDoc.id), { name: editName.trim() });
  };

  const numLabel = isActive ? '▶' : (viewIndex >= 0 ? viewIndex + 1 : '·');

  return (
    <div
      className={`track-item ${isActive ? 'active' : ''} ${isProcessing ? 'processing-track' : ''}`}
      style={{ animationDelay: `${animDelay}s` }}
      onClick={() => viewIndex >= 0 && !isProcessing && onPlay(viewIndex)}
    >
      <div className="track-num">{numLabel}</div>
      <div className="track-info">
        {editing ? (
          <input
            className="track-name-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div className="track-name">
            {trackDoc.name || trackDoc.videoId || '…'}
            {isProcessing && <span className="processing-badge">processing…</span>}
            {isError && <span className="error-badge" title={trackDoc.errorMessage || 'Error'}>error</span>}
          </div>
        )}
        <div className="track-duration">{fmt(trackDoc.durationSeconds)}</div>
      </div>
      <div className="track-actions">
        {activePlaylistId && isReady && (
          <button className="track-btn" onClick={e => { e.stopPropagation(); onRemoveFromPlaylist(trackDoc.id); }} title="Remove from playlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        )}
        {!activePlaylistId && isReady && (
          <>
            <button className="track-btn" onClick={e => { e.stopPropagation(); onAddToPlaylist(trackDoc.id); }} title="Add to playlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button className="track-btn" onClick={startEdit} title="Rename">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </>
        )}
        {!activePlaylistId && (
          <button className="track-btn delete" onClick={e => { e.stopPropagation(); onDelete(trackDoc.id); }} title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function TrackList({
  displayDocs, viewTracks, activePlaylistId, currentIndex, uid,
  onPlay, onDelete, onAddToPlaylist, onRemoveFromPlaylist
}) {
  if (!displayDocs.length) {
    const msg = activePlaylistId
      ? 'This playlist is empty.'
      : 'Paste a TikTok link or upload an audio file to get started';
    const hint = activePlaylistId
      ? 'Add tracks from the "All Tracks" view.'
      : 'Tap the ? icon for instructions';
    return (
      <div className="tracks-list">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
          <p>{msg}<br /><span className="hint">{hint}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="tracks-list">
      {displayDocs.map((trackDoc, di) => {
        const viewIndex = viewTracks.findIndex(t => t.id === trackDoc.id);
        const isActive = viewIndex !== -1 && viewIndex === currentIndex;
        return (
          <TrackItem
            key={trackDoc.id}
            doc={trackDoc}
            viewIndex={viewIndex}
            isActive={isActive}
            activePlaylistId={activePlaylistId}
            uid={uid}
            onPlay={onPlay}
            onDelete={onDelete}
            onAddToPlaylist={onAddToPlaylist}
            onRemoveFromPlaylist={id => onRemoveFromPlaylist(activePlaylistId, id)}
            animDelay={di * 0.04}
          />
        );
      })}
    </div>
  );
}
