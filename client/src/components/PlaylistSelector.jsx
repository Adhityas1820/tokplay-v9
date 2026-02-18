export default function PlaylistSelector({ playlists, activeId, onSwitch, onAdd, onOptions }) {
  return (
    <div className="playlist-selector">
      <button className={`playlist-pill ${!activeId ? 'active' : ''}`} onClick={() => onSwitch(null)}>
        All Tracks
      </button>
      {playlists.map(p => (
        <button
          key={p.id}
          className={`playlist-pill ${activeId === p.id ? 'active' : ''}`}
          onClick={() => onSwitch(p.id)}
          onContextMenu={e => { e.preventDefault(); onOptions(p.id); }}
        >
          {p.name}
        </button>
      ))}
      <button className="playlist-pill add-pill" onClick={onAdd}>+</button>
    </div>
  );
}
