/**
 * Lobby Route (Online)
 * Uses the OnlineLobby component for proper online game setup
 * Handles team selection, AI additions, start game, etc.
 */
import { useNavigate, useSearchParams } from '@solidjs/router';
import OnlineLobby from '~/components/game/Lobby';

export default function LobbyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = () => (searchParams.role as 'host' | 'player' | 'spectator') || 'player';

  const handleGameStart = () => {
    // All roles go to play route with their role
    navigate('/play?mode=online&role=' + role());
  };

  const handleBack = () => {
    navigate('/online');
  };

  return <OnlineLobby role={role()} onGameStart={handleGameStart} onBack={handleBack} />;
}
