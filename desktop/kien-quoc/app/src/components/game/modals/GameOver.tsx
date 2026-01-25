import { For, Show } from 'solid-js';
import { Trophy, HeartCrack, RotateCcw, ArrowLeft, Building2, Waves, Trees, Wheat, Factory, Users } from 'lucide-solid';
import type { GameOver, Team } from '~/lib/types';
import type { RegionId } from '~/config/regions';
import { REGIONS } from '~/config/regions';
import { INDEX_LABELS } from '~/config/game';
import ExportButton from '~/components/ui/ExportButton';

// Region icons matching region selection page
const regionIcons: Record<RegionId, any> = {
  'thu-do': Building2,
  'duyen-hai': Waves,
  'tay-nguyen': Trees,
  'dong-bang': Wheat,
  'mien-dong': Factory
};

interface GameOverProps {
  gameOver: GameOver;
  teams: Record<RegionId, Team>;
  myTeamId: RegionId | null;
  onPlayAgain: () => void;
  onQuit: () => void;
  /** For online mode: navigate to lobby instead of replay */
  onLobby?: () => void;
  /** Whether in online mode */
  isOnline?: boolean;
  /** Player role (player/spectator) - host uses different UI */
  role?: 'player' | 'spectator';
}

export default function GameOverModal(props: GameOverProps) {
  // In online mode:
  // - Player clicks "replay" → goes to lobby (onLobby callback)
  // - Spectator sees "Lobby" button instead of "Chơi lại"
  const handlePrimaryAction = () => {
    if (props.isOnline && props.onLobby) {
      props.onLobby();
    } else {
      props.onPlayAgain();
    }
  };

  const primaryButtonLabel = () => {
    if (props.isOnline) {
      return props.role === 'spectator' ? 'Lobby' : 'Chơi tiếp';
    }
    return 'Chơi lại';
  };

  const PrimaryIcon = () => {
    if (props.isOnline && props.role === 'spectator') {
      return <Users class="w-4 h-4" />;
    }
    return <RotateCcw class="w-4 h-4" />;
  };

  return (
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-scale-in text-center">
        {/* Header */}
        <div class="mb-6">
          <div class="flex justify-center mb-4">
            {props.gameOver.reason === 'completed' ? (
              <Trophy class="w-20 h-20 text-amber-500" />
            ) : (
              <HeartCrack class="w-20 h-20 text-red-500" />
            )}
          </div>
          <h1 class="text-3xl font-bold text-red-700 mb-2">
            {props.gameOver.reason === 'completed' ? 'Hoàn thành!' : 'Game Over'}
          </h1>
          <Show when={props.gameOver.reason === 'index_zero'}>
            <p class="text-gray-600">
              Chỉ số <span class="font-bold text-red-600">{INDEX_LABELS[props.gameOver.zeroIndex!]}</span> đã về 0
            </p>
          </Show>
          <Show when={props.gameOver.reason === 'completed'}>
            <p class="text-gray-600">Đã hoàn thành 8 lượt chơi</p>
          </Show>
        </div>

        {/* Ranking */}
        <div class="mb-6">
          <h2 class="text-lg font-bold text-gray-700 mb-3">Bảng xếp hạng</h2>
          <div class="space-y-2">
            <For each={props.gameOver.finalRanking}>
              {(entry, i) => {
                const team = props.teams[entry.regionId];
                const region = REGIONS.find((r) => r.id === entry.regionId);
                const isMe = entry.regionId === props.myTeamId;
                const medalColors = [
                  'bg-amber-400 text-amber-900',
                  'bg-gray-300 text-gray-700',
                  'bg-amber-600 text-white'
                ];
                return (
                  <div
                    class={`flex items-center gap-3 p-3 rounded-lg ${
                      isMe ? 'ring-2 ring-red-400 bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    <span
                      class={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i() < 3 ? medalColors[i()] : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {i() + 1}
                    </span>
                    {(() => {
                      const IconComponent = regionIcons[entry.regionId];
                      return (
                        <div
                          class={`w-8 h-8 rounded-lg ${region?.colorClass || 'bg-gray-400'} flex items-center justify-center`}
                        >
                          <IconComponent class="w-4 h-4 text-white" />
                        </div>
                      );
                    })()}
                    <span class={`flex-1 text-left font-medium ${isMe ? 'text-red-700' : ''}`}>{team?.name}</span>
                    <span class="font-bold text-gray-700">{entry.points.toFixed(2)}</span>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Actions */}
        <div class="flex gap-3 justify-center flex-wrap">
          <button
            onClick={handlePrimaryAction}
            class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <PrimaryIcon />
            {primaryButtonLabel()}
          </button>
          <Show when={!props.isOnline}>
            <ExportButton label="Xuất lịch sử" class="px-6 py-3 rounded-xl" />
          </Show>
          <button
            onClick={props.onQuit}
            class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <ArrowLeft class="w-4 h-4" />
            Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
