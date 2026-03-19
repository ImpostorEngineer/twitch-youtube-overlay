const MAX_QUEUE_SIZE = 250;

function createStore() {
  return {
    queue: [],
    currentIndex: 0,
    lastRequestedByUser: new Map(),
  };
}

const store = globalThis.__musicQueueStore || createStore();

if (!globalThis.__musicQueueStore) {
  globalThis.__musicQueueStore = store;
}

function sanitizeVideo(video) {
  if (!video?.videoId) {
    throw new Error("A valid videoId is required.");
  }

  return {
    videoId: video.videoId,
    title: video.title || "Untitled video",
    thumbnail:
      video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
  };
}

function normalizeRequestedBy(requestedBy) {
  return requestedBy?.trim?.() || "system";
}

export function getQueue() {
  return store.queue;
}

export function getCurrent() {
  return store.queue[store.currentIndex] || null;
}

export function getNext() {
  return store.queue[store.currentIndex + 1] || null;
}

export function getQueueState() {
  return {
    queue: store.queue,
    currentIndex: store.currentIndex,
    current: getCurrent(),
    next: getNext(),
  };
}

export function addToQueue(video, options = {}) {
  const normalizedVideo = sanitizeVideo(video);
  const requestedBy = normalizeRequestedBy(options.requestedBy);
  const duplicate = store.queue.some(
    (item) => item.videoId === normalizedVideo.videoId
  );

  if (duplicate) {
    return {
      added: false,
      reason: "duplicate",
      ...getQueueState(),
    };
  }

  const userEntries = store.queue.filter(
    (item) => item.requestedBy === requestedBy
  ).length;

  if (requestedBy !== "system" && userEntries >= 3) {
    return {
      added: false,
      reason: "user_limit",
      ...getQueueState(),
    };
  }

  if (store.queue.length >= MAX_QUEUE_SIZE) {
    return {
      added: false,
      reason: "queue_full",
      ...getQueueState(),
    };
  }

  const queuedVideo = {
    ...normalizedVideo,
    requestedBy,
    source: options.source || "manual",
    addedAt: Date.now(),
  };

  store.queue.push(queuedVideo);
  store.lastRequestedByUser.set(requestedBy, Date.now());

  return {
    added: true,
    video: queuedVideo,
    ...getQueueState(),
  };
}

export function skip() {
  if (store.queue.length === 0) {
    return getQueueState();
  }

  if (store.currentIndex < store.queue.length - 1) {
    store.currentIndex += 1;
  }

  return getQueueState();
}

export function setCurrentIndex(index) {
  const numericIndex = Number(index);

  if (!Number.isInteger(numericIndex)) {
    throw new Error("Queue index must be an integer.");
  }

  if (numericIndex < 0 || numericIndex >= store.queue.length) {
    throw new Error("Queue index is out of range.");
  }

  store.currentIndex = numericIndex;
  return getQueueState();
}

export function resetQueue(videos = []) {
  store.queue = [];
  store.currentIndex = 0;
  store.lastRequestedByUser.clear();

  videos.forEach((video) => {
    addToQueue(video, { source: "playlist" });
  });

  return getQueueState();
}

export function canUserRequest(requestedBy, cooldownMs = 15000) {
  const normalizedUser = normalizeRequestedBy(requestedBy);
  const lastRequestedAt = store.lastRequestedByUser.get(normalizedUser);

  if (!lastRequestedAt) {
    return true;
  }

  return Date.now() - lastRequestedAt >= cooldownMs;
}
