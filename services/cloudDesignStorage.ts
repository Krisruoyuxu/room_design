
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  QueryDocumentSnapshot,
  SnapshotOptions
} from 'firebase/firestore';
import { db } from './firebase';
import { StoredDesign } from './designTypes';

const DESIGNS_COLLECTION_NAME = 'designs';

function getDesignsCollection(userId: string) {
  return collection(db, 'users', userId, DESIGNS_COLLECTION_NAME);
}

// Converter to ensure types
const designConverter = {
  toFirestore: (design: Omit<StoredDesign, 'id'>) => {
    return {
      ...design,
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): StoredDesign => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      userId: data.userId,
      name: data.name,
      roomType: data.roomType,
      previewImage: data.previewImage,
      state: data.state,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  }
};

export async function listUserDesigns(userId: string): Promise<StoredDesign[]> {
  try {
    const q = query(getDesignsCollection(userId), orderBy('updatedAt', 'desc')).withConverter(designConverter);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error listing user designs:", error);
    throw error;
  }
}

export async function createUserDesign(
  userId: string,
  data: Omit<StoredDesign, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const colRef = getDesignsCollection(userId).withConverter(designConverter);
    // serverTimestamp() returns a FieldValue, which types incompatible with Timestamp in strict mode
    // We cast to any to bypass the client-side Timestamp vs server FieldValue type mismatch during write
    const docData = {
      userId,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any;
    
    const docRef = await addDoc(colRef, docData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating user design:", error);
    throw error;
  }
}

export async function updateUserDesign(
  userId: string,
  designId: string,
  data: Partial<Omit<StoredDesign, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, DESIGNS_COLLECTION_NAME, designId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user design:", error);
    throw error;
  }
}

export async function deleteUserDesign(userId: string, designId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, DESIGNS_COLLECTION_NAME, designId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting user design:", error);
    throw error;
  }
}
