import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function usePlaylists(uid) {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (!uid) { setPlaylists([]); return; }
    const q = query(collection(db, 'users', uid, 'playlists'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snapshot => {
      setPlaylists(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  const createPlaylist = (name) =>
    addDoc(collection(db, 'users', uid, 'playlists'), {
      name: name.trim(), trackIds: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });

  const renamePlaylist = (playlistId, newName) =>
    updateDoc(doc(db, 'users', uid, 'playlists', playlistId), {
      name: newName.trim(), updatedAt: serverTimestamp()
    });

  const deletePlaylist = (playlistId) =>
    deleteDoc(doc(db, 'users', uid, 'playlists', playlistId));

  const addTrackToPlaylist = (playlistId, trackId) =>
    updateDoc(doc(db, 'users', uid, 'playlists', playlistId), {
      trackIds: arrayUnion(trackId), updatedAt: serverTimestamp()
    });

  const removeTrackFromPlaylist = (playlistId, trackId) =>
    updateDoc(doc(db, 'users', uid, 'playlists', playlistId), {
      trackIds: arrayRemove(trackId), updatedAt: serverTimestamp()
    });

  return { playlists, createPlaylist, renamePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist };
}
