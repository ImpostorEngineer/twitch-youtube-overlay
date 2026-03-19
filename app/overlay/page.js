import OverlayClient from "./overlay-client";

export const metadata = {
  title: "OBS Overlay",
  description: "Transparent overlay for current and next song",
};

export default function OverlayPage() {
  return <OverlayClient />;
}
