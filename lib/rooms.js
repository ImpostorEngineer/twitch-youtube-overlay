const DEFAULT_ROOMS = [
  {
    envPrefix: "ROOM_1",
    fallbackId: "impostorengineer",
  },
  {
    envPrefix: "ROOM_2",
    fallbackId: "deradlerskartal",
  },
];

function normalizeRoomId(roomId) {
  return roomId?.trim?.().toLowerCase() || "";
}

function createRoomConfig({ envPrefix, fallbackId }) {
  const id = normalizeRoomId(process.env[`${envPrefix}_ID`] || fallbackId);

  return {
    id,
    name: process.env[`${envPrefix}_NAME`] || id,
    token: process.env[`${envPrefix}_TOKEN`] || "",
    logoUrl: process.env[`${envPrefix}_LOGO_URL`] || "",
  };
}

export function getRooms() {
  return DEFAULT_ROOMS.map(createRoomConfig);
}

export function getDefaultRoom() {
  return getRooms()[0];
}

export function getRoom(roomId) {
  const normalizedRoomId = normalizeRoomId(roomId);

  return getRooms().find((room) => room.id === normalizedRoomId) || null;
}

export function getPublicRoom(roomId) {
  const room = getRoom(roomId);

  if (!room) {
    return null;
  }

  return {
    id: room.id,
    name: room.name,
    logoUrl: room.logoUrl,
  };
}

export function assertRoom(roomId) {
  const room = getRoom(roomId);

  if (!room) {
    throw new Error("Unknown room.");
  }

  return room;
}

export function isValidRoomToken(roomId, token) {
  const room = getRoom(roomId);

  if (!room?.token || !token) {
    return false;
  }

  return room.token === token;
}

export function assertRoomToken(roomId, token) {
  const room = assertRoom(roomId);

  if (!room.token || room.token !== token) {
    throw new Error("You do not have permission to edit this room.");
  }

  return room;
}
