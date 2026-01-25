/**
 * IndexCard Component
 *
 * Single national index display with icon, value, progress bar, and optional change indicator.
 * Extracted from LeftSidebar for reuse across views.
 */

import { Show } from 'solid-js';
import { Coins, Users, BookOpen, Globe, Leaf, Lightbulb, TrendingUp, TrendingDown } from 'lucide-solid';
import { ProgressBar } from '~/components/ui';
import type { IndexName } from '~/config/game';
import { INDEX_LABELS } from '~/config/game';

// Icon mapping
const indexIcons: Record<IndexName, typeof Coins> = {
  economy: Coins,
  society: Users,
  culture: BookOpen,
  integration: Globe,
  environment: Leaf,
  science: Lightbulb
};

// Color themes for each index
const indexColors: Record<IndexName, { bar: string; text: string; bg: string }> = {
  economy: { bar: 'amber', text: 'text-amber-700', bg: 'bg-amber-100' },
  society: { bar: 'green', text: 'text-green-700', bg: 'bg-green-100' },
  culture: { bar: 'purple', text: 'text-purple-700', bg: 'bg-purple-100' },
  integration: { bar: 'blue', text: 'text-blue-700', bg: 'bg-blue-100' },
  environment: { bar: 'emerald', text: 'text-emerald-700', bg: 'bg-emerald-100' },
  science: { bar: 'orange', text: 'text-orange-700', bg: 'bg-orange-100' }
};

export interface IndexCardProps {
  /** Which index to display */
  index: IndexName;
  /** Current value */
  value: number;
  /** Maximum value for progress bar */
  max?: number;
  /** Change from last turn (shown in result phase) */
  change?: number;
  /** Danger threshold - show warning state below this */
  dangerThreshold?: number;
}

export default function IndexCard(props: IndexCardProps) {
  const Icon = indexIcons[props.index];
  const colors = indexColors[props.index];
  const max = props.max ?? 20;
  const dangerThreshold = props.dangerThreshold ?? 3;

  const isDanger = () => props.value <= dangerThreshold;
  const hasChange = () => props.change !== undefined && props.change !== 0;

  return (
    <div class={`p-2 rounded-lg transition-all ${isDanger() ? 'bg-red-50 ring-2 ring-red-300' : colors.bg}`}>
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-1.5">
          <Icon class={`w-4 h-4 ${isDanger() ? 'text-red-600' : colors.text}`} />
          <span class={`text-xs font-medium ${isDanger() ? 'text-red-700' : colors.text}`}>
            {INDEX_LABELS[props.index]}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <span class={`font-bold text-sm ${isDanger() ? 'text-red-600' : colors.text}`}>{props.value}</span>
          {/* Change indicator */}
          <Show when={hasChange()}>
            <span
              class={`text-xs font-bold flex items-center ${props.change! > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {props.change! > 0 ? <TrendingUp class="w-3 h-3" /> : <TrendingDown class="w-3 h-3" />}
              {props.change! > 0 ? '+' : ''}
              {props.change}
            </span>
          </Show>
        </div>
      </div>
      <ProgressBar value={props.value} max={max} color={isDanger() ? 'red' : colors.bar} size="xs" animated />
    </div>
  );
}
