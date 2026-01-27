import { Building2, Waves, Trees, Wheat, Factory, GraduationCap } from 'lucide-solid';
import type { IndexName } from './game';

export type RegionId = 'thu-do' | 'duyen-hai' | 'cao-nguyen' | 'cuu-long' | 'sai-gon' | 'bac-bo';

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
    id: 'cao-nguyen',
    name: 'Cao nguyên',
    description: 'Ưu thế: Môi trường',
    colorClass: 'bg-green-600',
    icon: Trees,
    specializedIndices: ['environment']
  },
  {
    id: 'cuu-long',
    name: 'Cửu Long',
    description: 'Ưu thế: Xã hội',
    colorClass: 'bg-amber-600',
    icon: Wheat,
    specializedIndices: ['society']
  },
  {
    id: 'sai-gon',
    name: 'Sài Gòn',
    description: 'Ưu thế: Kinh tế',
    colorClass: 'bg-purple-600',
    icon: Factory,
    specializedIndices: ['economy']
  },
  {
    id: 'bac-bo',
    name: 'Bắc Bộ',
    description: 'Ưu thế: Khoa học',
    colorClass: 'bg-cyan-600',
    icon: GraduationCap,
    specializedIndices: ['science']
  }
];

export const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>;

export function getRegion(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id)!;
}
