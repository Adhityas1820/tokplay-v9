import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useLibrary(uid) {
  const [allTrackDocs, setAllTrackDocs] = useState([]);
  const [tracks, setTracks] = useState([]); // only "ready" tracks

  useEffect(() => {
    if (!uid) { setAllTrackDocs([]); setTracks([]); return; }
    const q = query(
      collection(db, 'users', uid, 'tracks'),
      orderBy('ordinal', 'asc')
    );
    return onSnapshot(q, snapshot => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTrackDocs(docs);
      setTracks(docs.filter(t => t.status === 'ready'));
    });
  }, [uid]);

  return { allTrackDocs, tracks };
}
