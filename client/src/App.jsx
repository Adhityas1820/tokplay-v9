import { useState, useMemo, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useLibrary } from './hooks/useLibrary';
import { usePlaylists } from './hooks/usePlaylists';
import { usePlayer } from './hooks/usePlayer';
import { useToast } from './components/Toast';
import { addTrack, deleteTrack, uploadTrack } from './services/api';

import AuthGate from './components/AuthGate';
import Header from './components/Header';
import UrlBar from './components/UrlBar';
import PlaylistSelector from './components/PlaylistSelector';
import TrackList from './components/TrackList';
import Player from './components/Player';
import Toast from './components/Toast';
import HelpModal from './components/modals/HelpModal';
import ClearModal from './components/modals/ClearModal';
import SignOutModal from './components/modals/SignOutModal';
import CreatePlaylistModal from './components/modals/CreatePlaylistModal';
import AddToPlaylistModal from './components/modals/AddToPlaylistModal';
import PlaylistOptionsModal from './components/modals/PlaylistOptionsModal';
import DeletePlaylistModal from './components/modals/DeletePlaylistModal';

// ── Upload queue (module-level so it persists across renders) ──
const uploadQueue = [];
let uploadRunning = false;

export default function App() {
  const { user, signIn, signOut } = useAuth();
  const { allTrackDocs, tracks } = useLibrary(user?.uid);
  const { playlists, createPlaylist, renamePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist } = usePlaylists(user?.uid);
  const { toast, showToast } = useToast();

  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [queuePending, setQueuePending] = useState(0);

  // ── Modals ──
  const [showHelp, setShowHelp] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [createModal, setCreateModal] = useState({ show: false, title: 'New Playlist', initial: '', onConfirm: null });
  const [addToPlaylistModal, setAddToPlaylistModal] = useState({ show: false, trackId: null });
  const [playlistOptions, setPlaylistOptions] = useState({ show: false, playlist: null });
  const [deletePlaylistModal, setDeletePlaylistModal] = useState({ show: false, playlistId: null });

  // ── Compute view tracks ──
  const viewTracks = useMemo(() => {
    if (!activePlaylistId) return tracks;
    const pl = playlists.find(p => p.id === activePlaylistId);
    if (!pl) return tracks;
    return pl.trackIds.map(id => tracks.find(t => t.id === id)).filter(Boolean);
  }, [activePlaylistId, tracks, playlists]);

  const displayDocs = activePlaylistId ? viewTracks : allTrackDocs;

  const player = usePlayer(viewTracks);

  // ── Upload queue processor ──
  const processQueue = useCallback(async () => {
    if (uploadRunning || !uploadQueue.length) return;
    uploadRunning = true;
    setQueuePending(uploadQueue.length);
    while (uploadQueue.length) {
      const url = uploadQueue.shift();
      setQueuePending(uploadQueue.length + 1);
      try {
        const res = await addTrack(url);
        if (res.status === 'duplicate') showToast('Already in your library', 'success');
        else showToast('Track added!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to process track', 'error');
      }
    }
    uploadRunning = false;
    setQueuePending(0);
  }, [showToast]);

  const handleAdd = useCallback((url) => {
    if (!user) { showToast('Please sign in first', 'error'); return; }
    uploadQueue.push(url);
    setQueuePending(uploadQueue.length);
    showToast(`Queued (${uploadQueue.length} pending)`, 'success');
    processQueue();
  }, [user, showToast, processQueue]);

  const handleUpload = useCallback(async (file) => {
    if (!file || !user) return;
    if (!file.name.toLowerCase().endsWith('.mp3')) { showToast('Only MP3 files are supported', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('File too large (max 10 MB)', 'error'); return; }
    showToast('Uploading ' + file.name + '...', 'success');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await uploadTrack(base64, file.name);
      showToast('Track added!', 'success');
    } catch (err) { showToast(err.message || 'Upload failed', 'error'); }
  }, [user, showToast]);

  const handleCsv = useCallback((file) => {
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const urls = reader.result.split(/[\r\n,]+/)
        .map(s => s.replace(/^["'\s]+|["'\s]+$/g, '').trim())
        .filter(s => s.startsWith('http'));
      if (!urls.length) { showToast('No links found in file', 'error'); return; }
      urls.forEach(url => uploadQueue.push(url));
      setQueuePending(uploadQueue.length);
      showToast(`Queued ${urls.length} link${urls.length !== 1 ? 's' : ''}`, 'success');
      processQueue();
    };
    reader.onerror = () => showToast('Failed to read file', 'error');
    reader.readAsText(file);
  }, [user, showToast, processQueue]);

  const handleDelete = useCallback(async (trackId) => {
    if (player.currentIndex !== -1 && viewTracks[player.currentIndex]?.id === trackId) {
      player.stopAndReset();
    }
    try {
      await deleteTrack(trackId);
      for (const p of playlists) {
        if (p.trackIds?.includes(trackId)) removeTrackFromPlaylist(p.id, trackId).catch(() => {});
      }
    } catch (err) { showToast('Delete failed: ' + err.message, 'error'); }
  }, [player, viewTracks, playlists, removeTrackFromPlaylist, showToast]);

  const handleClearAll = useCallback(async () => {
    player.stopAndReset();
    setShowClear(false);
    showToast('Clearing library...', 'success');
    for (const t of allTrackDocs) await deleteTrack(t.id).catch(() => {});
    for (const p of playlists) await deletePlaylist(p.id).catch(() => {});
    setActivePlaylistId(null);
    showToast('Library cleared', 'success');
  }, [player, allTrackDocs, playlists, deletePlaylist, showToast]);

  const handleSwitchPlaylist = (id) => {
    setActivePlaylistId(id);
    player.stopAndReset();
  };

  const openPlaylistOptions = (id) => {
    const pl = playlists.find(p => p.id === id);
    setPlaylistOptions({ show: true, playlist: pl });
  };

  const handleRenamePlaylist = () => {
    const pl = playlistOptions.playlist;
    if (!pl) return;
    setCreateModal({
      show: true, title: 'Rename Playlist', initial: pl.name,
      onConfirm: (name) => renamePlaylist(pl.id, name)
    });
  };

  const handleConfirmDeletePlaylist = () => {
    setDeletePlaylistModal({ show: true, playlistId: playlistOptions.playlist?.id });
  };

  const doDeletePlaylist = async () => {
    const id = deletePlaylistModal.playlistId;
    if (activePlaylistId === id) { setActivePlaylistId(null); player.stopAndReset(); }
    await deletePlaylist(id);
    setDeletePlaylistModal({ show: false, playlistId: null });
    showToast('Playlist deleted', 'success');
  };

  // ── Auth loading ──
  if (user === undefined) return null;

  if (!user) {
    return <AuthGate onSignIn={() => signIn().catch(err => showToast(err.message, 'error'))} />;
  }

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  return (
    <>
      <div className={`ambient${player.isPlaying ? ' playing' : ''}`} />
      <Header onHelp={() => setShowHelp(true)} onSignOut={() => setShowSignOut(true)} />
      <UrlBar
        onAdd={handleAdd}
        onUpload={handleUpload}
        onCsv={handleCsv}
        pending={queuePending}
      />
      <PlaylistSelector
        playlists={playlists}
        activeId={activePlaylistId}
        onSwitch={handleSwitchPlaylist}
        onAdd={() => setCreateModal({ show: true, title: 'New Playlist', initial: '', onConfirm: createPlaylist })}
        onOptions={openPlaylistOptions}
      />

      <div className="playlist-section">
        <div className="playlist-header">
          <div className="playlist-title">{activePlaylist ? activePlaylist.name : 'All Tracks'}</div>
          <span className="track-count">{viewTracks.length} track{viewTracks.length !== 1 ? 's' : ''}</span>
          {activePlaylistId
            ? <button className="clear-btn" onClick={handleConfirmDeletePlaylist}>Delete Playlist</button>
            : <button className="clear-btn" onClick={() => allTrackDocs.length && setShowClear(true)}>Clear All</button>
          }
        </div>
        <TrackList
          displayDocs={displayDocs}
          viewTracks={viewTracks}
          activePlaylistId={activePlaylistId}
          currentIndex={player.currentIndex}
          uid={user.uid}
          onPlay={(idx) => player.loadTrack(idx, true)}
          onDelete={handleDelete}
          onAddToPlaylist={(trackId) => setAddToPlaylistModal({ show: true, trackId })}
          onRemoveFromPlaylist={removeTrackFromPlaylist}
        />
      </div>

      <Player
        track={viewTracks[player.currentIndex] || null}
        isPlaying={player.isPlaying}
        shuffleOn={player.shuffleOn}
        loopOn={player.loopOn}
        playbackSpeed={player.playbackSpeed}
        progress={player.progress}
        fmt={player.fmt}
        onTogglePlay={player.togglePlay}
        onPrev={player.prevTrack}
        onNext={player.nextTrack}
        onToggleShuffle={() => { player.toggleShuffle(); showToast(player.shuffleOn ? 'Shuffle off' : 'Shuffle on'); }}
        onToggleLoop={() => { player.toggleLoop(); showToast(player.loopOn ? 'Loop off' : 'Loop on'); }}
        onCycleSpeed={() => { const s = player.cycleSpeed(); showToast(`Speed: ${s}x`); }}
        onSeek={player.seek}
      />

      <Toast msg={toast.msg} type={toast.type} show={toast.show} />

      <HelpModal show={showHelp} onClose={() => setShowHelp(false)} />
      <ClearModal show={showClear} onConfirm={handleClearAll} onClose={() => setShowClear(false)} />
      <SignOutModal show={showSignOut} onConfirm={() => { player.stopAndReset(); signOut(); setShowSignOut(false); }} onClose={() => setShowSignOut(false)} />
      <CreatePlaylistModal
        show={createModal.show}
        title={createModal.title}
        initialValue={createModal.initial}
        onConfirm={createModal.onConfirm || (() => {})}
        onClose={() => setCreateModal(m => ({ ...m, show: false }))}
      />
      <AddToPlaylistModal
        show={addToPlaylistModal.show}
        playlists={playlists}
        trackId={addToPlaylistModal.trackId}
        onToggle={(pid, tid, add) => add ? addTrackToPlaylist(pid, tid) : removeTrackFromPlaylist(pid, tid)}
        onClose={() => setAddToPlaylistModal({ show: false, trackId: null })}
      />
      <PlaylistOptionsModal
        show={playlistOptions.show}
        playlist={playlistOptions.playlist}
        onRename={handleRenamePlaylist}
        onDelete={handleConfirmDeletePlaylist}
        onClose={() => setPlaylistOptions({ show: false, playlist: null })}
      />
      <DeletePlaylistModal
        show={deletePlaylistModal.show}
        onConfirm={doDeletePlaylist}
        onClose={() => setDeletePlaylistModal({ show: false, playlistId: null })}
      />
    </>
  );
}
