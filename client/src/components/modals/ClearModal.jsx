export default function ClearModal({ show, onConfirm, onClose }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>Clear Playlist?</h3>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>This removes all tracks from your library permanently.</p>
        <button className="modal-btn danger" onClick={onConfirm}>Clear All Tracks</button>
        <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
