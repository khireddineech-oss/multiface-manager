import { isValidHttpsImageUrl } from './session';
import type { SavedAvatar } from './avatars.native';

export const saveAvatar = async (
  _nickname: string,
  _accountId: string,
  sourceUrl?: string,
): Promise<SavedAvatar | null> => {
  const url = sourceUrl?.trim();
  if (!url) return null;
  if (!isValidHttpsImageUrl(url)) throw new Error('INVALID_AVATAR_URL');
  return { uri: url, sourceUrl: url, isLocal: false };
};

export const deleteAvatar = async (_uri?: string, _isLocal?: boolean) => undefined;
