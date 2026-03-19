import { ensureTwitchService } from "@/lib/twitch";
import PlayerClient from "./player-client";

export const metadata = {
  title: "Player Control",
  description: "YouTube queue and Twitch song request control room",
};

export default function PlayerPage() {
  ensureTwitchService();

  return <PlayerClient />;
}
