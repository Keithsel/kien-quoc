/**
 * Play Route
 * Entry point for the game - handles both online and offline modes
 * For online: handles player, spectator, and host roles
 */
import { createEffect, Show } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { GameProvider, useGame } from '~/lib/game/context';
import { PlayContainer, HostView } from '~/components/game';
import { getGameFacade } from '~/lib/core';

function PlayContent() {
  const navigate = useNavigate();
  const game = useGame();
  const facade = getGameFacade();

  // Redirect to appropriate screen if no active game
  // For online mode, don't redirect immediately - wait for Firebase data to load
  createEffect(() => {
    const status = game.status();

    // Only redirect offline mode when no saved game
    if (status === 'lobby' && !game.isOnline()) {
      // Offline: try to load saved game
      if (facade.hasSavedGame() && facade.load()) {
        return;
      }
      // No saved game - go to region selection
      navigate('/region?mode=offline');
    }
    // For online mode with status='lobby', just show loading - Firebase will sync
  });

  const handleBack = () => {
    navigate('/lobby?mode=online&role=host');
  };

  return (
    <Show
      when={game.status() !== 'lobby'}
      fallback={
        <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 to-amber-50">
          <div class="text-center">
            <div class="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p class="text-gray-600">Đang tải...</p>
          </div>
        </div>
      }
    >
      {/* Show HostView for host, PlayContainer for player/spectator */}
      <Show when={game.role() === 'host'} fallback={<PlayContainer />}>
        <HostView onBack={handleBack} />
      </Show>
    </Show>
  );
}

export default function Play() {
  const [searchParams] = useSearchParams();
  const mode = () => (searchParams.mode === 'online' ? 'online' : 'offline');
  const role = () => {
    const urlRole = searchParams.role as string;
    return (urlRole as 'host' | 'player' | 'spectator') || 'player';
  };

  return (
    <GameProvider mode={mode()} onlineRole={mode() === 'online' ? role() : undefined}>
      <PlayContent />
    </GameProvider>
  );
}
