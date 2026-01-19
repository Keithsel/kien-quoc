/**
 * ProjectCard Component
 *
 * Displays current project status, requirements, and success/failure verdict.
 * Extracted from RightSidebar for reuse.
 */

import { Show, createMemo } from 'solid-js';
import { Target, Star, Check, X, ChevronRight } from 'lucide-solid';
import { Card } from '~/components/ui';
import { useGame } from '~/lib/game/context';
import { PROJECT_CELLS } from '~/config/board';

export interface ProjectCardProps {
  /** Click handler for opening project details */
  onClick?: () => void;
  /** Use glass effect */
  glass?: boolean;
}

export default function ProjectCard(props: ProjectCardProps) {
  const game = useGame();

  // Project success status - calculate from placements during resolution
  const isSuccess = createMemo(() => {
    const phase = game.currentPhase();
    const result = game.lastTurnResult();
    const ev = game.event();

    // In result phase, use the actual result
    if (phase === 'result' && result) {
      return result.success;
    }

    // In resolution phase, calculate from team placements
    if (phase === 'resolution' && ev) {
      const scaledEv = game.scaledEvent();
      if (!scaledEv) return false;

      let totalRP = 0;
      let teamCount = 0;
      for (const team of Object.values(game.teams())) {
        if (team.ownerId === null) continue;
        const rp = PROJECT_CELLS.reduce((sum, cell) => sum + (team.placements[cell.id] || 0), 0);
        if (rp > 0) {
          totalRP += rp;
          teamCount++;
        }
      }
      return totalRP >= scaledEv.minTotal && teamCount >= scaledEv.minTeams;
    }

    return false;
  });

  const event = () => game.event();
  const scaledEvent = () => game.scaledEvent();

  return (
    <Card glass={props.glass} padding="md" onClick={props.onClick} hoverable={!!props.onClick}>
      <h3 class="font-bold text-gray-700 text-sm mb-3 flex items-center justify-between">
        <span class="flex items-center gap-2">
          <Target class="w-4 h-4 text-red-600" />
          Dự án hiện tại
        </span>
        <Show when={props.onClick}>
          <ChevronRight class="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
        </Show>
      </h3>

      <Show when={event()} fallback={<div class="text-center text-gray-500 py-4 text-sm">Chưa có dự án</div>}>
        <div class="space-y-3">
          {/* Project name */}
          <div class="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
            <Star class="w-5 h-5 text-red-600" />
            <div class="flex-1 min-w-0">
              <div class="font-bold text-red-700 text-sm truncate">{event()!.project}</div>
              <div class="text-xs text-red-600 truncate">{event()!.name}</div>
            </div>
          </div>

          {/* Requirements summary */}
          <Show when={scaledEvent()}>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="text-center p-2 bg-gray-50 rounded-lg">
                <div class="text-xs text-gray-500">Cần RP</div>
                <div class="font-bold text-gray-700">{scaledEvent()!.minTotal}</div>
              </div>
              <div class="text-center p-2 bg-gray-50 rounded-lg">
                <div class="text-xs text-gray-500">Cần đội</div>
                <div class="font-bold text-gray-700">{scaledEvent()!.minTeams}</div>
              </div>
            </div>
          </Show>

          {/* Verdict indicator during resolution/result phase */}
          <Show when={game.currentPhase() === 'resolution' || game.currentPhase() === 'result'}>
            <div
              class={`p-2.5 rounded-lg text-center font-bold text-sm ${
                isSuccess() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {isSuccess() ? (
                <span class="flex items-center justify-center gap-1.5">
                  <Check class="w-4 h-4" /> Thành công
                </span>
              ) : (
                <span class="flex items-center justify-center gap-1.5">
                  <X class="w-4 h-4" /> Thất bại
                </span>
              )}
            </div>
          </Show>
        </div>
      </Show>
    </Card>
  );
}
