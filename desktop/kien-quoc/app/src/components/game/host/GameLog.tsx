/**
 * GameLog Component
 * Shows game events and actions in real-time
 * Matches PlayContainer white panel theming
 */
import { For, createMemo } from 'solid-js';
import { useGame } from '~/lib/game/context';

export default function GameLog() {
  const game = useGame();

  const logEntries = createMemo(() => {
    const entries: { id: string; icon: string; text: string; time: string }[] = [];

    entries.push({
      id: 'phase',
      icon: '📍',
      text: `Giai đoạn: ${game.currentPhase()}`,
      time: 'Hiện tại'
    });

    const teams = Object.entries(game.teams());
    // Filter for active teams: connected humans OR AI
    const activeTeams = teams.filter(([_, t]) => (t.ownerId !== null && t.connected) || t.isAI);
    const submittedTeams = activeTeams.filter(([_, t]) => t.submitted);
    if (submittedTeams.length > 0) {
      entries.push({
        id: 'submitted',
        icon: '✓',
        text: `${submittedTeams.length}/${activeTeams.length} đội đã đặt lệnh`,
        time: ''
      });
    }

    entries.push({
      id: 'turn',
      icon: '🗓',
      text: `Lượt ${game.currentTurn()} - Năm ${game.event()?.year || '?'}`,
      time: ''
    });

    return entries;
  });

  return (
    <div class="flex-1 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-3 overflow-auto min-h-0">
      <h3 class="font-bold text-gray-700 text-sm mb-3">Nhật ký</h3>
      <div class="space-y-2 text-sm">
        <For each={logEntries()}>
          {(entry) => (
            <div class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
              <span class="text-lg">{entry.icon}</span>
              <div class="flex-1">
                <div class="text-gray-700">{entry.text}</div>
                {entry.time && <div class="text-xs text-gray-400">{entry.time}</div>}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
