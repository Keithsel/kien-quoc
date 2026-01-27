/**
 * Shared Game Constants
 * Centralized styling constants for indices and phases used across components
 */
import { Coins, Users, BookOpen, Globe, Leaf, Lightbulb, type LucideIcon } from 'lucide-solid';
import type { IndexName, PhaseName } from '~/config/game';

// National Index Icons
export const INDEX_ICONS: Record<IndexName, LucideIcon> = {
  economy: Coins,
  society: Users,
  culture: BookOpen,
  integration: Globe,
  environment: Leaf,
  science: Lightbulb
};

// National Index Colors (Tailwind classes)
export const INDEX_COLORS: Record<IndexName, { bar: string; text: string; bg: string }> = {
  economy: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-100' },
  society: { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-100' },
  culture: { bar: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-100' },
  integration: { bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-100' },
  environment: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-100' },
  science: { bar: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-100' }
};

// Phase Labels (Vietnamese)
export const PHASE_LABELS: Record<PhaseName, string> = {
  event: 'Sự kiện',
  action: 'Hành động',
  resolution: 'Xử lý',
  result: 'Kết quả'
};

// Phase Colors (Tailwind classes)
export const PHASE_COLORS: Record<PhaseName, string> = {
  event: 'bg-amber-500',
  action: 'bg-blue-500',
  resolution: 'bg-purple-500',
  result: 'bg-green-500'
};

// Helper function to get phase color
export function getPhaseColor(phase: PhaseName): string {
  return PHASE_COLORS[phase];
}

// Phase order for iteration
export const PHASES: PhaseName[] = ['event', 'action', 'resolution', 'result'];
