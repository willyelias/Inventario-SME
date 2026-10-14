import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { app, auth } from './firebaseAuth';
import firebaseConfig from '../../firebase-applet-config.json';
import { InventoryItem, GoogleSheetConfig } from '../types/inventory';

export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Subscribe to real-time inventory updates
export function subscribeToInventory(
  onData: (items: InventoryItem[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'inventory';
  const q = query(collection(db, path), orderBy('itemNumber', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InventoryItem;
        items.push({
          ...data,
          id: docSnap.id
        });
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

// Helper to strip undefined fields so Firestore doesn't reject writes
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

// Save or Update single inventory item
export async function saveInventoryItemFirestore(item: InventoryItem): Promise<void> {
  const path = `inventory/${item.id}`;
  try {
    await setDoc(doc(db, 'inventory', item.id), sanitizeForFirestore(item), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete inventory item
export async function deleteInventoryItemFirestore(itemId: string): Promise<void> {
  const path = `inventory/${itemId}`;
  try {
    await deleteDoc(doc(db, 'inventory', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Batch save multiple inventory items (e.g., seeding or Excel import)
export async function batchSaveInventoryFirestore(items: InventoryItem[]): Promise<void> {
  const path = 'inventory';
  try {
    // Firestore batches have max 500 operations
    const chunks: InventoryItem[][] = [];
    for (let i = 0; i < items.length; i += 400) {
      chunks.push(items.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        batch.set(doc(db, 'inventory', item.id), sanitizeForFirestore(item), { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Save Google Sheets link configuration to Firestore
export async function saveSettingsFirestore(settings: GoogleSheetConfig): Promise<void> {
  const path = 'settings/googleSheets';
  try {
    await setDoc(doc(db, 'settings', 'googleSheets'), sanitizeForFirestore(settings), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Retrieve shared Google Sheets settings
export async function getSettingsFirestore(): Promise<GoogleSheetConfig | null> {
  const path = 'settings/googleSheets';
  try {
    const snap = await getDoc(doc(db, 'settings', 'googleSheets'));
    if (snap.exists()) {
      return snap.data() as GoogleSheetConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Clear and replace all inventory items in Firestore
export async function resetInventoryFirestore(newItems: InventoryItem[]): Promise<void> {
  const path = 'inventory';
  try {
    const snap = await getDocs(collection(db, path));
    const docs = snap.docs;

    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await batchSaveInventoryFirestore(newItems);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Get and set dataset version in settings/datasetVersion
export async function getDatasetVersionFirestore(): Promise<string | null> {
  const path = 'settings/datasetVersion';
  try {
    const snap = await getDoc(doc(db, 'settings', 'datasetVersion'));
    if (snap.exists()) {
      return (snap.data() as { version?: string })?.version || null;
    }
    return null;
  } catch (error) {
    console.warn('Erro ao obter versão do dataset:', error);
    return null;
  }
}

export async function setDatasetVersionFirestore(version: string): Promise<void> {
  const path = 'settings/datasetVersion';
  try {
    await setDoc(doc(db, 'settings', 'datasetVersion'), { version, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn('Erro ao atualizar versão do dataset:', error);
  }
}
