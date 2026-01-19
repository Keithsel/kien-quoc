/**
 * IndexList Component
 *
 * Displays all national indices using IndexCard.
 * Replaces the indices section from LeftSidebar.
 */

import { For, Show, createMemo } from 'solid-js';
import { TriangleAlert } from 'lucide-solid';
import { Card } from '~/components/ui';
import IndexCard from './IndexCard';
import { useGame } from '~/lib/game/context';
import { INDEX_NAMES, type IndexName } from '~/config/constants';

export interface IndexListProps {
  /** Optional title override */
  title?: string;
  /** Show danger warning banner */
  showWarning?: boolean;
  /** Whether this is a glass card */
  glass?: boolean;
}

export default function IndexList(props: IndexListProps) {
  const game = useGame();

  // Find indices in danger (≤3)
  const dangerIndices = createMemo(() => INDEX_NAMES.filter((idx) => game.nationalIndices()[idx] <= 3));

  // Get index changes from last turn result (only in result phase)
  const indexChanges = createMemo(() => {
    if (game.currentPhase() !== 'result') return {};
    const result = game.lastTurnResult();
    if (!result) return {};

    const changes: Record<string, number> = {};
    if (result.indexChanges) {
      for (const [k, v] of Object.entries(result.indexChanges)) {
        changes[k] = (changes[k] || 0) + v;
      }
    }
    if (result.zoneBoosts) {
      for (const [k, v] of Object.entries(result.zoneBoosts)) {
        changes[k] = (changes[k] || 0) + v;
      }
    }
    return changes;
  });

  return (
    <Card glass={props.glass} padding="md">
      <h3 class="font-bold text-gray-700 text-sm mb-3">{props.title ?? 'Chỉ số Quốc gia'}</h3>

      {/* Danger warning */}
      <Show when={props.showWarning !== false && dangerIndices().length > 0}>
        <div class="mb-3 px-3 py-2 bg-red-100 rounded-lg text-red-700 text-xs font-medium animate-pulse flex items-center gap-1">
          <TriangleAlert class="w-4 h-4" />
          Cảnh báo: {dangerIndices().length} chỉ số ở mức nguy hiểm!
        </div>
      </Show>

      <div class="space-y-3">
        <For each={INDEX_NAMES}>
          {(idx) => <IndexCard index={idx} value={game.nationalIndices()[idx]} change={indexChanges()[idx]} />}
        </For>
      </div>
    </Card>
  );
}
