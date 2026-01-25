/**
 * Shared Icons for Game Components
 */
import { Crown, Sparkles, Zap, Handshake, Star } from 'lucide-solid';
import type { CellType } from '~/config/game';

export const cellTypeIcons: Record<CellType, typeof Crown> = {
  competitive: Crown,
  synergy: Sparkles,
  independent: Zap,
  cooperation: Handshake,
  project: Star
};
