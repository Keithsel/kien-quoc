/**
 * Shared Icons for Game Components
 */
import { Crown, Sparkles, Zap, Handshake, Star, Building2, Waves, Trees, Wheat, Factory } from 'lucide-solid';
import type { CellType } from '~/config/game';
import type { RegionId } from '~/config/regions';

export const cellTypeIcons: Record<CellType, typeof Crown> = {
  competitive: Crown,
  synergy: Sparkles,
  independent: Zap,
  cooperation: Handshake,
  project: Star
};

export const regionIcons: Record<RegionId, typeof Building2> = {
  'thu-do': Building2,
  'duyen-hai': Waves,
  'tay-nguyen': Trees,
  'dong-bang': Wheat,
  'mien-dong': Factory
};
