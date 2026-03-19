import { notFound } from "next/navigation";
import { getPublicRoom } from "@/lib/rooms";
import OverlayClient from "@/app/overlay/overlay-client";

export async function generateMetadata(props) {
  const { roomId } = await props.params;
  const room = getPublicRoom(roomId);

  if (!room) {
    return {
      title: "Overlay Not Found",
    };
  }

  return {
    title: `${room.name} Overlay`,
    description: `Transparent overlay for ${room.name}`,
  };
}

export default async function OverlayRoomPage(props) {
  const { roomId } = await props.params;
  const room = getPublicRoom(roomId);

  if (!room) {
    notFound();
  }

  return <OverlayClient room={room} />;
}
