import { notFound } from "next/navigation";
import { ensureTwitchService } from "@/lib/twitch";
import { getPublicRoom, isValidRoomToken } from "@/lib/rooms";
import PlayerClient from "@/app/player/player-client";

export async function generateMetadata(props) {
  const { roomId } = await props.params;
  const room = getPublicRoom(roomId);

  if (!room) {
    return {
      title: "Room Not Found",
    };
  }

  return {
    title: `${room.name} Player`,
    description: `Shared player room for ${room.name}`,
  };
}

export default async function RoomPage(props) {
  const { roomId } = await props.params;
  const searchParams = await props.searchParams;
  const room = getPublicRoom(roomId);

  if (!room) {
    notFound();
  }

  ensureTwitchService();

  const editorToken = isValidRoomToken(room.id, searchParams.token)
    ? searchParams.token
    : "";

  return <PlayerClient room={room} editorToken={editorToken} />;
}
