export default function HelpModal({ show, onClose }) {
  return (
    <div className={`modal-overlay ${show ? 'show' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>How to Use TokPlay</h3>
        <div className="help-section">
          <h4><span className="step-num">1</span> Find a video</h4>
          <p>Open TikTok, tap the share button on any video, then tap <strong>"Copy link"</strong>.</p>
        </div>
        <div className="help-section">
          <h4><span className="step-num">2</span> Paste the link</h4>
          <p>Paste the link into the input bar at the top and tap <strong>Add</strong>. TokPlay downloads and converts the audio automatically.</p>
        </div>
        <div className="help-section">
          <h4><span className="step-num">3</span> Play &amp; enjoy</h4>
          <p>Tap any track to play. Use controls to skip, shuffle, loop, or change speed. Your library is synced to the cloud.</p>
        </div>
        <div className="help-section">
          <h4><span className="step-num">+</span> Upload audio files</h4>
          <p>Tap the <strong>upload icon</strong> (arrow) to upload MP3 files directly. Max 5 minutes, 10 MB.</p>
        </div>
        <div className="help-section">
          <h4><span className="step-num">+</span> Batch import from CSV</h4>
          <p>Tap the <strong>document icon</strong> to import a CSV or text file with TikTok links. All links queue automatically.</p>
        </div>
        <div className="help-divider" />
        <div className="help-tip">
          <strong>Processing takes ~30 seconds</strong> — the server downloads and converts the audio. The track appears automatically when done.
        </div>
        <button className="modal-btn cancel" onClick={onClose} style={{ marginTop: 16 }}>Got it!</button>
      </div>
    </div>
  );
}
