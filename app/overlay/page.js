import { redirect } from "next/navigation";
import { getDefaultRoom } from "@/lib/rooms";

export const metadata = {
  title: "OBS Overlay",
  description: "Transparent overlay for current and next song",
};

export default function OverlayPage() {
  redirect(`/overlay/${getDefaultRoom().id}`);
}
