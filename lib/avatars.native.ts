import * as FileSystem from 'expo-file-system/legacy';
import { isValidHttpsImageUrl } from './session';

export interface SavedAvatar {
  uri: string;
  sourceUrl: string;
  isLocal: boolean;
}

const safeName = (nickname: string) => {
  const cleaned = nickname
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 42);
  return cleaned || 'account';
};

const imageExtension = (url: string) => {
  const match = url.split('?')[0].toLowerCase().match(/\.(png|jpe?g|webp|gif)$/);
  return match?.[1]?.replace('jpeg', 'jpg') || 'jpg';
};

export const saveAvatar = async (
  nickname: string,
  accountId: string,
  sourceUrl?: string,
): Promise<SavedAvatar | null> => {
  const url = sourceUrl?.trim();
  if (!url) return null;
  if (!isValidHttpsImageUrl(url)) throw new Error('INVALID_AVATAR_URL');

  const directory = FileSystem.documentDirectory;
  if (!directory) return { uri: url, sourceUrl: url, isLocal: false };
  const folder = `${directory}account-avatars/`;
  const destination = `${folder}${safeName(nickname)}-${accountId}.${imageExtension(url)}`;

  try {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    const result = await FileSystem.downloadAsync(url, destination);
    if (result.status >= 200 && result.status < 300) {
      return { uri: result.uri, sourceUrl: url, isLocal: true };
    }
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(
      () => undefined,
    );
  } catch {
    // A signed CDN URL can expire or block downloads. Retain the source URL and
    // mark it as linked so the UI never claims it was saved locally.
  }
  return { uri: url, sourceUrl: url, isLocal: false };
};

export const deleteAvatar = async (uri?: string, isLocal?: boolean) => {
  if (!uri || !isLocal || !uri.startsWith('file://')) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
};
