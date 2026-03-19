import { assertRoom } from "@/lib/rooms";

const MAX_QUEUE_SIZE = 250;

function createRoomState() {
  return {
    queue: [],
    currentIndex: 0,
    playlistUrl: "",
    lastRequestedByUser: new Map(),
  };
}

function createStore() {
  return {
    rooms: new Map(),
  };
}

const store = globalThis.__musicQueueStore || createStore();

if (!globalThis.__musicQueueStore) {
  globalThis.__musicQueueStore = store;
}

function getRoomStore(roomId) {
  const room = assertRoom(roomId);

  if (!store.rooms.has(room.id)) {
    store.rooms.set(room.id, createRoomState());
  }

  return store.rooms.get(room.id);
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

export function getQueue(roomId) {
  return getRoomStore(roomId).queue;
}

export function getCurrent(roomId) {
  const roomStore = getRoomStore(roomId);
  return roomStore.queue[roomStore.currentIndex] || null;
}

export function getNext(roomId) {
  const roomStore = getRoomStore(roomId);
  return roomStore.queue[roomStore.currentIndex + 1] || null;
}

export function getQueueState(roomId) {
  const roomStore = getRoomStore(roomId);

  return {
    queue: roomStore.queue,
    currentIndex: roomStore.currentIndex,
    playlistUrl: roomStore.playlistUrl,
    current: getCurrent(roomId),
    next: getNext(roomId),
  };
}

export function setPlaylistUrl(roomId, playlistUrl) {
  const roomStore = getRoomStore(roomId);
  roomStore.playlistUrl = playlistUrl?.trim?.() || "";
  return getQueueState(roomId);
}

export function getPlaylistUrl(roomId) {
  return getRoomStore(roomId).playlistUrl;
}

export function addToQueue(roomId, video, options = {}) {
  const roomStore = getRoomStore(roomId);
  const normalizedVideo = sanitizeVideo(video);
  const requestedBy = normalizeRequestedBy(options.requestedBy);
  const duplicate = roomStore.queue.some(
    (item) => item.videoId === normalizedVideo.videoId
  );

  if (duplicate) {
    return {
      added: false,
      reason: "duplicate",
      ...getQueueState(roomId),
    };
  }

  const userEntries = roomStore.queue.filter(
    (item) => item.requestedBy === requestedBy
  ).length;

  if (requestedBy !== "system" && userEntries >= 3) {
    return {
      added: false,
      reason: "user_limit",
      ...getQueueState(roomId),
    };
  }

  if (roomStore.queue.length >= MAX_QUEUE_SIZE) {
    return {
      added: false,
      reason: "queue_full",
      ...getQueueState(roomId),
    };
  }

  const queuedVideo = {
    ...normalizedVideo,
    requestedBy,
    source: options.source || "manual",
    addedAt: Date.now(),
  };

  const shouldInsertAfterCurrent =
    options.insertAfterCurrent && roomStore.queue.length > 0;
  const insertIndex = shouldInsertAfterCurrent
    ? Math.min(roomStore.currentIndex + 1, roomStore.queue.length)
    : roomStore.queue.length;

  roomStore.queue.splice(insertIndex, 0, queuedVideo);
  roomStore.lastRequestedByUser.set(requestedBy, Date.now());

  return {
    added: true,
    video: queuedVideo,
    ...getQueueState(roomId),
  };
}

export function skip(roomId) {
  const roomStore = getRoomStore(roomId);

  if (roomStore.queue.length === 0) {
    return getQueueState(roomId);
  }

  if (roomStore.currentIndex < roomStore.queue.length - 1) {
    roomStore.currentIndex += 1;
  }

  return getQueueState(roomId);
}

export function setCurrentIndex(roomId, index) {
  const roomStore = getRoomStore(roomId);
  const numericIndex = Number(index);

  if (!Number.isInteger(numericIndex)) {
    throw new Error("Queue index must be an integer.");
  }

  if (numericIndex < 0 || numericIndex >= roomStore.queue.length) {
    throw new Error("Queue index is out of range.");
  }

  roomStore.currentIndex = numericIndex;
  return getQueueState(roomId);
}

export function resetQueue(roomId, videos = [], options = {}) {
  const roomStore = getRoomStore(roomId);
  roomStore.queue = [];
  roomStore.currentIndex = 0;
  roomStore.lastRequestedByUser.clear();

  if (typeof options.playlistUrl === "string") {
    roomStore.playlistUrl = options.playlistUrl.trim();
  }

  videos.forEach((video) => {
    addToQueue(roomId, video, { source: "playlist" });
  });

  return getQueueState(roomId);
}

export function removeFromQueue(roomId, index) {
  const roomStore = getRoomStore(roomId);
  const numericIndex = Number(index);

  if (!Number.isInteger(numericIndex)) {
    throw new Error("Queue index must be an integer.");
  }

  if (numericIndex < 0 || numericIndex >= roomStore.queue.length) {
    throw new Error("Queue index is out of range.");
  }

  roomStore.queue.splice(numericIndex, 1);

  if (roomStore.queue.length === 0) {
    roomStore.currentIndex = 0;
    return getQueueState(roomId);
  }

  if (numericIndex < roomStore.currentIndex) {
    roomStore.currentIndex -= 1;
  } else if (roomStore.currentIndex >= roomStore.queue.length) {
    roomStore.currentIndex = roomStore.queue.length - 1;
  }

  return getQueueState(roomId);
}

export function shuffleQueue(roomId) {
  const roomStore = getRoomStore(roomId);

  if (roomStore.queue.length <= 2) {
    return getQueueState(roomId);
  }

  const current = roomStore.queue[roomStore.currentIndex];
  const beforeCurrent = roomStore.queue.slice(0, roomStore.currentIndex);
  const upcoming = roomStore.queue.slice(roomStore.currentIndex + 1);

  for (let index = upcoming.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [upcoming[index], upcoming[swapIndex]] = [
      upcoming[swapIndex],
      upcoming[index],
    ];
  }

  roomStore.queue = [...beforeCurrent, current, ...upcoming];
  return getQueueState(roomId);
}

export function canUserRequest(roomId, requestedBy, cooldownMs = 15000) {
  const roomStore = getRoomStore(roomId);
  const normalizedUser = normalizeRequestedBy(requestedBy);
  const lastRequestedAt = roomStore.lastRequestedByUser.get(normalizedUser);

  if (!lastRequestedAt) {
    return true;
  }

  return Date.now() - lastRequestedAt >= cooldownMs;
}
