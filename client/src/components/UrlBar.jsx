import { useRef } from 'react';

export default function UrlBar({ onAdd, onUpload, onCsv, pending }) {
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const csvRef = useRef(null);

  const handleAdd = () => {
    const url = inputRef.current.value.trim();
    if (!url) return;
    onAdd(url);
    inputRef.current.value = '';
  };

  return (
    <div className="url-bar">
      <input
        ref={inputRef}
        type="url"
        className="url-input"
        placeholder="Paste TikTok link..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
      />
      <button className="add-btn" onClick={handleAdd}>
        {pending > 0 ? `Add (${pending})` : 'Add'}
      </button>

      {/* MP3 upload */}
      <button className="upload-btn" onClick={() => fileRef.current.click()} title="Upload MP3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </button>
      <input ref={fileRef} type="file" accept=".mp3,audio/mpeg" style={{ display: 'none' }} onChange={e => { onUpload(e.target.files[0]); e.target.value = ''; }} />

      {/* CSV import */}
      <button className="upload-btn" onClick={() => csvRef.current.click()} title="Import links from CSV">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </button>
      <input ref={csvRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { onCsv(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}
