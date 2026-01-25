/**
 * LeaderboardCard Component
 *
 * Displays team rankings with points and optional change indicators.
 * Extracted from RightSidebar for reuse.
 */

import { For, Show, createMemo } from 'solid-js';
import { Trophy, TrendingUp } from 'lucide-solid';
import { Card, RankBadge } from '~/components/ui';
import { useGame } from '~/lib/game/context';
import { REGIONS, type RegionId } from '~/config/regions';

export interface LeaderboardCardProps {
  /** Optional title */
  title?: string;
  /** Use glass effect */
  glass?: boolean;
}

export default function LeaderboardCard(props: LeaderboardCardProps) {
  const game = useGame();

  // Calculate sorted leaderboard with rankings
  const leaderboard = createMemo(() => {
    const result = game.lastTurnResult();
    const sorted = Object.values(game.teams())
      // Include teams that are either: connected humans OR AI
      .filter((t) => (t.ownerId !== null && t.connected) || t.isAI)
      .map((t) => {
        const pointsChange = result?.teamPoints[t.id] || 0;
        return { ...t, pointsChange };
      })
      .sort((a, b) => b.points - a.points);

    return sorted.map((t, i) => ({ ...t, rank: i + 1 }));
  });

  return (
    <Card glass={props.glass} padding="md">
      <h3 class="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
        <Trophy class="w-4 h-4 text-amber-500" />
        {props.title ?? 'Bảng xếp hạng'}
      </h3>

      <div class="space-y-2">
        <For each={leaderboard()}>
          {(team) => {
            const region = REGIONS.find((r) => r.id === team.id);
            const Icon = region?.icon;
            const isMe = team.id === game.myTeamId();
            const showChange = game.currentPhase() === 'result' && team.pointsChange > 0;

            return (
              <div
                class={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  isMe ? 'bg-red-50 ring-2 ring-red-300' : 'bg-gray-50'
                }`}
              >
                {/* Rank badge */}
                <RankBadge rank={team.rank} size="sm" />

                {/* Team icon */}
                <div
                  class={`w-8 h-8 ${region?.colorClass || 'bg-gray-400'} rounded-lg flex items-center justify-center shadow-sm`}
                >
                  {Icon && <Icon class="w-4 h-4 text-white" />}
                </div>

                {/* Team name */}
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm text-gray-800 truncate">{region?.name || team.name}</div>
                  <Show when={isMe}>
                    <div class="text-xs text-red-600 font-medium">Bạn</div>
                  </Show>
                </div>

                {/* Points with change indicator */}
                <div class="text-right">
                  <div class="font-bold text-gray-800">{team.points.toFixed(2)}</div>
                  <Show when={showChange}>
                    <div class="text-xs text-green-600 flex items-center justify-end gap-0.5">
                      <TrendingUp class="w-3 h-3" />+{Math.round(team.pointsChange)}
                    </div>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Card>
  );
}
