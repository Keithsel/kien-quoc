import { createSignal, For, Show, createMemo, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { ArrowLeft, Crown, Users, Eye, Play, Check, Wifi, WifiOff, Bot, Plus, X, Info } from 'lucide-solid';
import {
  subscribeToGame,
  startOnlineGame,
  joinTeam,
  leaveTeam,
  getCurrentUserTeam,
  addAITeam,
  removeAITeam,
  resetGame
} from '~/lib/firebase/game';
import { ensureAuth } from '~/lib/firebase/client';
import type { OnlineGameData, Role } from '~/lib/firebase/types';
import type { RegionId } from '~/config/regions';
import { REGIONS } from '~/config/regions';
import InstructionModal from '~/components/game/modals/InstructionModal';

interface LobbyProps {
  role: Role;
  onGameStart: () => void;
  onBack: () => void;
}

export default function OnlineLobby(props: LobbyProps) {
  const navigate = useNavigate();
  const [game, setGame] = createSignal<OnlineGameData | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [selectedTeam, setSelectedTeam] = createSignal<RegionId | null>(null);
  const [showInstructions, setShowInstructions] = createSignal(false);

  let unsubscribe: (() => void) | null = null;

  onMount(async () => {
    await ensureAuth();
    unsubscribe = subscribeToGame((data) => {
      setGame(data);
      // Auto-navigate to game when host starts (players waiting in lobby)
      if (data?.status === 'playing' && props.role !== 'host') {
        props.onGameStart();
      }
      // Auto-reconnect: if player owns a team but is disconnected, reconnect them
      if (data && props.role === 'player') {
        const myTeam = getCurrentUserTeam(data);
        if (myTeam && !data.teams[myTeam]?.connected) {
          joinTeam(myTeam).catch(console.error);
        }
      }
    });
  });

  onCleanup(() => {
    unsubscribe?.();
  });

  // Computed
  const isHost = () => props.role === 'host';
  const isPlayer = () => props.role === 'player';
  const isSpectator = () => props.role === 'spectator';

  const connectedTeams = createMemo(() => {
    const g = game();
    if (!g) return [];
    return Object.entries(g.teams)
      .filter(([, t]) => t.ownerId && t.connected)
      .map(([id, t]) => ({ id: id as RegionId, ...t, region: REGIONS.find((r) => r.id === id) }))
      .sort((a, b) => {
        // Bots sink to bottom, humans stay on top
        const aIsBot = a.ownerId === 'bot';
        const bIsBot = b.ownerId === 'bot';
        if (aIsBot && !bIsBot) return 1;
        if (!aIsBot && bIsBot) return -1;
        return 0;
      });
  });

  const availableTeams = createMemo(() => {
    const g = game();
    if (!g) return [];
    return REGIONS.filter((r) => {
      const team = g.teams[r.id];
      return !team?.ownerId || !team?.connected;
    });
  });

  const myTeamId = createMemo(() => getCurrentUserTeam(game()));
  // Check if game is in progress (not lobby state)
  const gameInProgress = createMemo(() => {
    const g = game();
    return g && g.status !== 'lobby';
  });
  // Simple requirement: at least 2 players (human or bot)
  const canStart = createMemo(() => connectedTeams().length >= 2);

  // Handlers
  const handleJoinTeam = async (regionId: RegionId) => {
    setLoading(true);
    setError('');
    try {
      await joinTeam(regionId);
      setSelectedTeam(regionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    const teamId = myTeamId();
    if (!teamId) return;
    setLoading(true);
    try {
      await leaveTeam(teamId);
      setSelectedTeam(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    setLoading(true);
    setError('');
    try {
      await startOnlineGame();
      // Navigate to host screen immediately after starting
      props.onGameStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAI = async (regionId: RegionId) => {
    setLoading(true);
    setError('');
    try {
      await addAITeam(regionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAI = async (regionId: RegionId) => {
    setLoading(true);
    try {
      await removeAITeam(regionId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueGame = () => {
    props.onGameStart();
  };

  const handleResetGame = async () => {
    setLoading(true);
    try {
      await resetGame();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex flex-col p-8">
      {/* Header */}
      <div class="relative flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button
            onClick={() => navigate('/mode')}
            class="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
            <span>Quay lại</span>
          </button>

          <button
            onClick={() => setShowInstructions(true)}
            class="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <Info class="w-5 h-5" />
            <span>Hướng dẫn</span>
          </button>
        </div>

        {/* Connection status - absolutely centered */}
        <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <Show
            when={game()}
            fallback={
              <>
                <WifiOff class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-400">Đang kết nối...</span>
              </>
            }
          >
            <Wifi class="w-4 h-4 text-green-500" />
            <span class="text-sm text-green-600">Đã kết nối</span>
          </Show>
        </div>

        {/* Role badge */}
        <div
          class={`px-4 py-2 rounded-full flex items-center gap-2 ${
            isHost()
              ? 'bg-red-100 text-red-700'
              : isPlayer()
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {isHost() && <Crown class="w-4 h-4" />}
          {isPlayer() && <Users class="w-4 h-4" />}
          {isSpectator() && <Eye class="w-4 h-4" />}
          <span class="font-medium">{isHost() ? 'Quản trò' : isPlayer() ? 'Người chơi' : 'Khán giả'}</span>
        </div>
      </div>

      {/* Title */}
      <div class="w-full text-center mb-8">
        <h1 class="text-4xl font-bold text-red-700 mb-2">Phòng chờ</h1>
        <p class="text-gray-600">
          {isHost() ? 'Chờ người chơi tham gia' : isPlayer() ? 'Chọn vùng miền của bạn' : 'Chờ game bắt đầu'}
        </p>
      </div>

      {/* Content based on role */}
      <div class="max-w-2xl mx-auto w-full flex-1">
        {/* Game in progress - show continue/reset options for host */}
        <Show when={gameInProgress() && isHost()}>
          <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Play class="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-700">Game đang diễn ra</h2>
                <p class="text-sm text-gray-500">Lượt {game()?.currentTurn || 1}</p>
              </div>
            </div>
            <div class="flex gap-3">
              <button
                onClick={handleContinueGame}
                class="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
              >
                Tiếp tục game
              </button>
              <button
                onClick={handleResetGame}
                disabled={loading()}
                class="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition-all disabled:opacity-50"
              >
                Tạo mới
              </button>
            </div>
          </div>
        </Show>

        {/* No game yet (for players/spectators) */}
        <Show when={!game() && !isHost()}>
          <div class="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff class="w-8 h-8 text-gray-400" />
            </div>
            <h2 class="text-xl font-bold text-gray-700 mb-2">Chờ quản trò</h2>
            <p class="text-gray-500">Quản trò chưa tạo phòng. Vui lòng chờ...</p>
          </div>
        </Show>

        {/* Team picker for players */}
        <Show when={game() && isPlayer() && !myTeamId()}>
          <div class="bg-white rounded-2xl shadow-lg p-6">
            <h2 class="text-xl font-bold text-gray-700 mb-4">Chọn vùng miền</h2>
            <div class="grid grid-cols-1 gap-3">
              <For each={availableTeams()}>
                {(region) => {
                  const IconComponent = region.icon;
                  return (
                    <button
                      onClick={() => handleJoinTeam(region.id)}
                      disabled={loading()}
                      class={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        loading() ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500 hover:bg-red-50'
                      } border-gray-200`}
                    >
                      <div
                        class={`w-12 h-12 rounded-xl ${region.colorClass} flex items-center justify-center shrink-0`}
                      >
                        <IconComponent class="w-6 h-6 text-white" />
                      </div>
                      <div class="text-left flex-1 min-w-0">
                        <div class="font-bold text-gray-800">{region.name}</div>
                        <div class="text-xs text-gray-500">{region.description}</div>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        {/* Player has joined - show waiting state */}
        <Show when={game() && isPlayer() && myTeamId()}>
          <div class="bg-white rounded-2xl shadow-lg p-6 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check class="w-8 h-8 text-green-600" />
            </div>
            <h2 class="text-xl font-bold text-gray-700 mb-2">Đã tham gia!</h2>
            <p class="text-gray-500 mb-4">
              Bạn là đội <span class="font-bold text-red-600">{game()?.teams[myTeamId()!]?.name}</span>
            </p>
            <button
              onClick={handleLeaveTeam}
              disabled={loading()}
              class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Rời khỏi
            </button>
          </div>
        </Show>

        {/* Connected teams list */}
        <Show when={game()}>
          <div class="bg-white rounded-2xl shadow-lg p-6 mt-6">
            <h2 class="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Users class="w-5 h-5" />
              Đội đã tham gia ({connectedTeams().length}/5)
            </h2>
            <div class="space-y-2">
              {/* Add Bot buttons for empty slots - FIRST so they're easy to spam add */}
              <Show when={isHost()}>
                <For each={availableTeams()}>
                  {(region) => (
                    <button
                      onClick={() => handleAddAI(region.id)}
                      disabled={loading()}
                      class="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-dashed border-blue-200 transition-colors"
                    >
                      <div
                        class={`w-10 h-10 rounded-lg ${region.colorClass} flex items-center justify-center opacity-50`}
                      >
                        <Plus class="w-5 h-5 text-white" />
                      </div>
                      <span class="text-blue-600 font-medium">Thêm Bot: {region.name}</span>
                    </button>
                  )}
                </For>
              </Show>
              {/* Connected teams - bots sink to bottom via sort in connectedTeams() */}
              <For each={connectedTeams()}>
                {(team) => (
                  <div class={`flex items-center gap-3 p-3 rounded-lg ${team.isAI ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <div
                      class={`w-10 h-10 rounded-lg ${team.region?.colorClass || 'bg-gray-400'} flex items-center justify-center`}
                    >
                      {team.isAI ? (
                        <Bot class="w-5 h-5 text-white" />
                      ) : (
                        <span class="text-white font-bold">{team.name.charAt(0)}</span>
                      )}
                    </div>
                    <span class="flex-1 font-medium">
                      {team.name}
                      {team.isAI && <span class="ml-2 text-xs text-blue-600 font-normal">(AI)</span>}
                    </span>
                    {team.isAI && isHost() ? (
                      <button
                        onClick={() => handleRemoveAI(team.id)}
                        disabled={loading()}
                        class="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                        title="Xóa AI"
                      >
                        <X class="w-4 h-4" />
                      </button>
                    ) : (
                      <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                )}
              </For>
              <Show when={connectedTeams().length === 0 && !isHost()}>
                <div class="text-center text-gray-400 py-4">Chưa có đội nào tham gia</div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Error */}
        <Show when={error()}>
          <div class="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">{error()}</div>
        </Show>

        {/* Host controls - Start button only */}
        <Show when={isHost() && game() && !gameInProgress()}>
          <div class="mt-6">
            <button
              onClick={handleStartGame}
              disabled={!canStart() || loading()}
              class="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Play class="w-5 h-5" />
              {canStart() ? 'Bắt đầu game' : `Cần ít nhất 2 đội (${connectedTeams().length}/2)`}
            </button>
          </div>
        </Show>
      </div>
      <Show when={showInstructions()}>
        <InstructionModal onClose={() => setShowInstructions(false)} />
      </Show>
    </main>
  );
}
