import { Building2, Waves, Trees, Wheat, Factory } from 'lucide-solid';
import type { IndexName } from './game';

export type RegionId = 'thu-do' | 'duyen-hai' | 'tay-nguyen' | 'dong-bang' | 'mien-dong';

export interface Region {
  id: RegionId;
  name: string;
  description: string;
  colorClass: string; // Tailwind bg color class
  icon: any; // Lucide icon component
  specializedIndices: IndexName[];
}

export const REGIONS: Region[] = [
  {
    id: 'thu-do',
    name: 'Thủ đô',
    description: 'Ưu thế: Văn hóa',
    colorClass: 'bg-red-600',
    icon: Building2,
    specializedIndices: ['culture']
  },
  {
    id: 'duyen-hai',
    name: 'Duyên hải',
    description: 'Ưu thế: Hội nhập',
    colorClass: 'bg-blue-600',
    icon: Waves,
    specializedIndices: ['integration']
  },
  {
    id: 'tay-nguyen',
    name: 'Tây Nguyên',
    description: 'Ưu thế: Môi trường',
    colorClass: 'bg-green-600',
    icon: Trees,
    specializedIndices: ['environment']
  },
  {
    id: 'dong-bang',
    name: 'Đồng bằng',
    description: 'Ưu thế: Xã hội',
    colorClass: 'bg-amber-600',
    icon: Wheat,
    specializedIndices: ['society']
  },
  {
    id: 'mien-dong',
    name: 'Miền Đông',
    description: 'Ưu thế: Kinh tế',
    colorClass: 'bg-purple-600',
    icon: Factory,
    specializedIndices: ['economy']
  }
];

export const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>;

export function getRegion(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id)!;
}
