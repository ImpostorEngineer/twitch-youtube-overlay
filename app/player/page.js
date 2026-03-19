import { ensureTwitchService } from '@/lib/twitch';
import PlayerClient from './player-client';

export const metadata = {
  title: 'YouTube Player',
  description: 'YouTube queue and Twitch song request control room v0.2',
};

export default function PlayerPage() {
  ensureTwitchService();

  return <PlayerClient />;
}
