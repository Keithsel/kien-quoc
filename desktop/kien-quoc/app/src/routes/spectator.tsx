/**
 * Spectator Route
 * Uses the OnlineLobby component with spectator role - waits for game to start
 */
import { useNavigate } from '@solidjs/router';
import OnlineLobby from '~/components/game/Lobby';

export default function SpectatorPage() {
  const navigate = useNavigate();

  const handleGameStart = () => {
    navigate('/play?mode=online&role=spectator');
  };

  const handleBack = () => {
    navigate('/online');
  };

  return <OnlineLobby role="spectator" onGameStart={handleGameStart} onBack={handleBack} />;
}
