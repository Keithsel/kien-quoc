export type RegionId = 'thu-do' | 'duyen-hai' | 'tay-nguyen' | 'dong-bang' | 'mien-dong';

export interface Region {
  id: RegionId;
  name: string;
  description: string;
  colorClass: string; // Tailwind bg color class
  icon: string; // Emoji as fallback
}

export const REGIONS: Region[] = [
  { id: 'thu-do', name: 'Thủ đô', description: 'Trung tâm chính trị - văn hóa', colorClass: 'bg-red-600', icon: '🏛️' },
  { id: 'duyen-hai', name: 'Duyên hải', description: 'Vùng biển và thương mại', colorClass: 'bg-blue-600', icon: '🌊' },
  {
    id: 'tay-nguyen',
    name: 'Tây Nguyên',
    description: 'Cao nguyên và nông nghiệp',
    colorClass: 'bg-green-600',
    icon: '🌿'
  },
  { id: 'dong-bang', name: 'Đồng bằng', description: 'Lúa gạo và nông sản', colorClass: 'bg-amber-600', icon: '🌾' },
  { id: 'mien-dong', name: 'Miền Đông', description: 'Công nghiệp và kinh tế', colorClass: 'bg-purple-600', icon: '🏭' }
];

export const REGION_MAP = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>;

export function getRegion(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id)!;
}
