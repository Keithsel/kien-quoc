/**
 * Host Route
 * Host view for online games - can see all, control game, cannot play
 */
import { createEffect, Show } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { GameProvider, useGame } from '~/lib/game/context';
import HostView from '~/components/game/host/HostView';

export default function Host() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <GameProvider mode="online" onlineRole="host">
      <HostContent onBack={() => navigate('/lobby?mode=online&role=host')} />
    </GameProvider>
  );
}

function HostContent(props: { onBack: () => void }) {
  const game = useGame();
  const navigate = useNavigate();

  // Redirect to lobby if game is not playing
  createEffect(() => {
    const status = game.status();
    if (status === 'lobby') {
      navigate('/lobby?mode=online&role=host');
    }
  });

  // Show loading while waiting for game data
  return (
    <Show
      when={game.status() !== 'lobby'}
      fallback={
        <div class="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center">
          <div class="text-gray-500">Đang tải...</div>
        </div>
      }
    >
      <HostView onBack={props.onBack} />
    </Show>
  );
}
