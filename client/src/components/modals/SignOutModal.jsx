export default function SignOutModal({ show, onConfirm, onClose }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>Sign Out?</h3>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20 }}>Your library is saved in the cloud. Sign back in any time to access it.</p>
        <button className="modal-btn danger" onClick={onConfirm}>Sign Out</button>
        <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
