import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { FacebookSession } from './types';
import { hasSessionCredentials } from './session';

const CHUNK_SIZE = 1600;
const MAX_CHUNKS = 100;
const keyPrefix = (accountId: string) => `mf_session_${accountId}`;
const indexKey = (accountId: string) => `${keyPrefix(accountId)}_index`;
const chunkKey = (accountId: string, index: number) =>
  `${keyPrefix(accountId)}_${index}`;

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const assertSecureStorage = async () => {
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) {
    throw new Error('SECURE_STORAGE_UNAVAILABLE');
  }
};

interface SessionIndex {
  version: 1;
  chunks: number;
}

export const writeSecureSession = async (
  accountId: string,
  session: FacebookSession,
) => {
  await assertSecureStorage();
  if (!hasSessionCredentials(session.cookies)) {
    throw new Error('SAVED_SESSION_INVALID');
  }

  await deleteSecureSession(accountId);
  const serialized = JSON.stringify(session);
  const chunks: string[] = [];
  for (let offset = 0; offset < serialized.length; offset += CHUNK_SIZE) {
    chunks.push(serialized.slice(offset, offset + CHUNK_SIZE));
  }
  if (chunks.length > MAX_CHUNKS) throw new Error('SESSION_TOO_LARGE');

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(chunkKey(accountId, index), chunks[index], options);
    }
    const index: SessionIndex = { version: 1, chunks: chunks.length };
    await SecureStore.setItemAsync(indexKey(accountId), JSON.stringify(index), options);

    // Read-back verification catches unavailable/invalidated secure storage before
    // the account is presented as saved.
    const verified = await readSecureSession(accountId);
    if (
      verified.userId !== session.userId ||
      verified.cookies.length !== session.cookies.length
    ) {
      throw new Error('SESSION_SAVE_VERIFICATION_FAILED');
    }
  } catch (error) {
    await deleteSecureSession(accountId, chunks.length).catch(() => undefined);
    throw error;
  }
};

export const readSecureSession = async (accountId: string): Promise<FacebookSession> => {
  await assertSecureStorage();
  const rawIndex = await SecureStore.getItemAsync(indexKey(accountId), options);
  if (!rawIndex) throw new Error('SAVED_SESSION_NOT_FOUND');

  let index: SessionIndex;
  try {
    index = JSON.parse(rawIndex) as SessionIndex;
  } catch {
    throw new Error('SAVED_SESSION_CORRUPTED');
  }
  if (
    index.version !== 1 ||
    !Number.isInteger(index.chunks) ||
    index.chunks < 1 ||
    index.chunks > MAX_CHUNKS
  ) {
    throw new Error('SAVED_SESSION_CORRUPTED');
  }

  const chunks = await Promise.all(
    Array.from({ length: index.chunks }, (_, chunkIndex) =>
      SecureStore.getItemAsync(chunkKey(accountId, chunkIndex), options),
    ),
  );
  if (chunks.some((chunk) => chunk === null)) {
    throw new Error('SAVED_SESSION_INCOMPLETE');
  }

  try {
    const session = JSON.parse(chunks.join('')) as FacebookSession;
    if (
      typeof session.userId !== 'string' ||
      !Array.isArray(session.cookies) ||
      !hasSessionCredentials(session.cookies)
    ) {
      throw new Error('SAVED_SESSION_CORRUPTED');
    }
    return session;
  } catch {
    throw new Error('SAVED_SESSION_CORRUPTED');
  }
};

export const deleteSecureSession = async (
  accountId: string,
  fallbackChunkCount = 0,
) => {
  if (Platform.OS === 'web') return;
  const rawIndex = await SecureStore.getItemAsync(indexKey(accountId), options).catch(
    () => null,
  );
  let count = Math.min(Math.max(fallbackChunkCount, 0), MAX_CHUNKS);
  if (rawIndex) {
    try {
      const index = JSON.parse(rawIndex) as SessionIndex;
      if (Number.isInteger(index.chunks) && index.chunks >= 0) {
        count = Math.min(index.chunks, MAX_CHUNKS);
      } else {
        count = MAX_CHUNKS;
      }
    } catch {
      // A damaged index must not strand encrypted chunks on the device.
      count = MAX_CHUNKS;
    }
  }
  await Promise.all(
    Array.from({ length: count }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(accountId, index), options).catch(
        () => undefined,
      ),
    ),
  );
  await SecureStore.deleteItemAsync(indexKey(accountId), options).catch(
    () => undefined,
  );
};
