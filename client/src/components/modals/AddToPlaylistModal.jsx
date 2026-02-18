export default function AddToPlaylistModal({ show, playlists, trackId, onToggle, onClose }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>Add to Playlist</h3>
        <div style={{ marginBottom: 16 }}>
          {!playlists.length
            ? <p style={{ color: 'var(--text3)', fontSize: 14, padding: '12px 0' }}>No playlists yet. Create one first.</p>
            : playlists.map(p => (
              <label key={p.id} className="playlist-check-item">
                <input
                  type="checkbox"
                  checked={!!(p.trackIds && p.trackIds.includes(trackId))}
                  onChange={e => onToggle(p.id, trackId, e.target.checked)}
                />
                <span>{p.name}</span>
              </label>
            ))
          }
        </div>
        <button className="modal-btn cancel" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
