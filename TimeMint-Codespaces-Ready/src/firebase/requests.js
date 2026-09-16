import { 
  collection, 
  doc, 
  addDoc, 
  query, 
  orderBy, 
  where, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp 
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './config';

let signInPromise = null;

/**
 * Lazily sign in anonymously if not already signed in.
 * Never called at app boot — only invoked when accessing RequestsPage or performing actions.
 */
export async function ensureSignedIn() {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  if (!signInPromise) {
    signInPromise = signInAnonymously(auth)
      .then((userCredential) => {
        signInPromise = null;
        return userCredential.user;
      })
      .catch((err) => {
        signInPromise = null;
        throw err;
      });
  }
  return signInPromise;
}

/**
 * Real-time subscription to feature requests sorted/filtered by sortMode.
 * @param {'newest' | 'popular' | 'replied'} sortMode
 * @param {(requests: Array) => void} callback
 * @param {(error: Error) => void} onError
 * @returns {() => void} unsubscribe function
 */
export function subscribeToRequests(sortMode, callback, onError) {
  const requestsCollection = collection(db, 'featureRequests');
  let q;

  if (sortMode === 'replied') {
    q = query(
      requestsCollection, 
      where('hasReply', '==', true), 
      orderBy('createdAt', 'desc')
    );
  } else if (sortMode === 'newest') {
    q = query(
      requestsCollection, 
      orderBy('createdAt', 'desc')
    );
  } else {
    // Default: 'popular'
    q = query(
      requestsCollection, 
      orderBy('upvoteCount', 'desc')
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      callback(items);
    },
    (error) => {
      console.error(`[Firestore Requests] Subscription error (${sortMode}):`, error);
      if (onError) {
        onError(error);
      }
    }
  );

  return unsubscribe;
}

/**
 * Create a new feature request document in Firestore.
 * @param {{ title: string, description: string }} param0 
 */
export async function createRequest({ title, description }) {
  await ensureSignedIn();
  
  const payload = {
    title: title.trim(),
    description: description ? description.trim() : '',
    authorId: auth.currentUser.uid,
    status: 'under_review',
    hasReply: false,
    upvoteCount: 0,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'featureRequests'), payload);
  return docRef.id;
}

/**
 * Atomically toggle upvote status for a request.
 * Creates/deletes featureRequests/{requestId}/upvotes/{myUid} and updates upvoteCount in one transaction.
 * @param {string} requestId 
 */
export async function toggleUpvote(requestId) {
  await ensureSignedIn();
  const myUid = auth.currentUser.uid;
  const requestRef = doc(db, 'featureRequests', requestId);
  const upvoteRef = doc(db, 'featureRequests', requestId, 'upvotes', myUid);

  return runTransaction(db, async (transaction) => {
    const [requestSnap, upvoteSnap] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(upvoteRef)
    ]);

    if (!requestSnap.exists()) {
      throw new Error('Feature request does not exist');
    }

    const currentCount = requestSnap.data().upvoteCount || 0;

    if (!upvoteSnap.exists()) {
      // Upvote: create subdoc & increment parent upvoteCount
      transaction.set(upvoteRef, { votedAt: serverTimestamp() });
      transaction.update(requestRef, { upvoteCount: currentCount + 1 });
      return { upvoted: true, count: currentCount + 1 };
    } else {
      // Remove upvote: delete subdoc & decrement parent upvoteCount
      transaction.delete(upvoteRef);
      const newCount = Math.max(0, currentCount - 1);
      transaction.update(requestRef, { upvoteCount: newCount });
      return { upvoted: false, count: newCount };
    }
  });
}

/**
 * Determine which requests the current user has upvoted for the visible list.
 * Listens for auth state and doc existence of upvotes subcollection.
 * @param {string[]} requestIds 
 * @param {(upvotedSet: Set<string>) => void} callback 
 * @returns {() => void} unsubscribe function
 */
export function getMyUpvotedIds(requestIds, callback) {
  if (!requestIds || requestIds.length === 0) {
    callback(new Set());
    return () => {};
  }

  let activeDocUnsubscribes = [];
  const upvotedMap = {};

  const cleanupDocListeners = () => {
    activeDocUnsubscribes.forEach((unsub) => unsub());
    activeDocUnsubscribes = [];
  };

  const emitState = () => {
    const upvotedIds = new Set(
      Object.keys(upvotedMap).filter((id) => upvotedMap[id] === true)
    );
    callback(upvotedIds);
  };

  const authUnsubscribe = onAuthStateChanged(auth, (user) => {
    cleanupDocListeners();

    if (!user) {
      requestIds.forEach((id) => {
        upvotedMap[id] = false;
      });
      emitState();
      return;
    }

    requestIds.forEach((id) => {
      const upvoteDocRef = doc(db, 'featureRequests', id, 'upvotes', user.uid);
      const unsub = onSnapshot(
        upvoteDocRef,
        (docSnap) => {
          upvotedMap[id] = docSnap.exists();
          emitState();
        },
        (err) => {
          console.warn(`[Firestore Requests] Failed checking upvote for ${id}:`, err);
          upvotedMap[id] = false;
          emitState();
        }
      );
      activeDocUnsubscribes.push(unsub);
    });
  });

  return () => {
    authUnsubscribe();
    cleanupDocListeners();
  };
}
