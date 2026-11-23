export type UpdateRecord = {
  id: string;
  message: string;
  module: string;
  priority: string;
  createdOn: string;
  readAtUtc?: string | null;
  occurredAtUtc: string;
};

export type UpdatePage = {
  items: UpdateRecord[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
  availableModules?: string[];
};

export function shouldAnnounceUpdate(update: UpdateRecord) {
  return !update.readAtUtc;
}

export function findFreshNotificationIds(items: UpdateRecord[], seenIds: string[]) {
  const seen = new Set(seenIds);
  return items.filter(item => !seen.has(item.id)).map(item => item.id);
}

export function mergeSeenNotificationIds(seenIds: string[], items: UpdateRecord[], limit = 250) {
  return [...new Set([...seenIds, ...items.map(item => item.id)])].slice(-limit);
}

export function getAnnounceableUpdates(items: UpdateRecord[], seenIds: string[], initialized: boolean) {
  if (!initialized) return [];
  const fresh = new Set(findFreshNotificationIds(items, seenIds));
  return items.filter(item => fresh.has(item.id) && shouldAnnounceUpdate(item));
}

export function shouldPlayNotificationSound(isMuted: boolean, hasUserInteracted: boolean) {
  return !isMuted && hasUserInteracted;
}

export function markUpdateAsRead(page: UpdatePage, id: string, readAtUtc: string, unreadOnly = false): UpdatePage {
  const current = page.items.find(item => item.id === id);
  if (!current || current.readAtUtc) return page;
  const items = unreadOnly
    ? page.items.filter(item => item.id !== id)
    : page.items.map(item => item.id === id ? { ...item, readAtUtc } : item);
  return {
    ...page,
    items,
    total: Math.max(0, page.total - (unreadOnly ? 1 : 0)),
    unread: Math.max(0, page.unread - 1),
  };
}
