export default function PlaylistOptionsModal({ show, playlist, onRename, onDelete, onClose }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>{playlist?.name || ''}</h3>
        <button className="modal-btn" style={{ background: 'var(--surface2)', color: 'var(--text)' }} onClick={() => { onClose(); onRename(); }}>
          Rename Playlist
        </button>
        <button className="modal-btn danger" onClick={() => { onClose(); onDelete(); }}>
          Delete Playlist
        </button>
        <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
