import { redirect } from "next/navigation";
import { getDefaultRoom } from "@/lib/rooms";

export const metadata = {
  title: "YouTube Player",
  description: "YouTube queue and Twitch song request control room",
};

export default function PlayerPage() {
  redirect(`/room/${getDefaultRoom().id}`);
}
