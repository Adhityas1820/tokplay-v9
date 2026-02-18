export default function DeletePlaylistModal({ show, onConfirm, onClose }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>Delete Playlist?</h3>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>This only removes the playlist. Your tracks will remain in your library.</p>
        <button className="modal-btn danger" onClick={onConfirm}>Delete Playlist</button>
        <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
