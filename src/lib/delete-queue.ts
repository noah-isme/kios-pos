type Scheduled = {
  id: string;
  timeoutId: ReturnType<typeof setTimeout>;
};

const queue = new Map<string, Scheduled>();

export function scheduleDelete(key: string, fn: () => Promise<void>, delay = 6000) {
  if (queue.has(key)) {
    clearTimeout(queue.get(key)!.timeoutId);
  }

  const timeoutId = setTimeout(async () => {
    try {
      await fn();
    } finally {
      queue.delete(key);
    }
  }, delay);

  queue.set(key, { id: key, timeoutId });
}

export function cancelScheduledDelete(key: string) {
  const scheduled = queue.get(key);
  if (!scheduled) return false;
  clearTimeout(scheduled.timeoutId);
  queue.delete(key);
  return true;
}

export default {};
