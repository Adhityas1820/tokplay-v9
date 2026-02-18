import { useState, useEffect, useRef } from 'react';

export default function CreatePlaylistModal({ show, title = 'New Playlist', initialValue = '', onConfirm, onClose }) {
  const [name, setName] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show) {
      setName(initialValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show, initialValue]);

  const submit = () => {
    if (!name.trim()) return;
    onConfirm(name.trim());
    onClose();
  };

  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>{title}</h3>
        <input
          ref={inputRef}
          type="text"
          className="url-input"
          placeholder="Playlist name..."
          maxLength={100}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ marginBottom: 16 }}
        />
        <button className="modal-btn primary" onClick={submit}>
          {title === 'New Playlist' ? 'Create' : 'Save'}
        </button>
        <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
