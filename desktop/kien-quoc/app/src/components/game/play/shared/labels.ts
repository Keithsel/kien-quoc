/**
 * Shared Labels, Colors, and Effects for Game Components
 */
import type { CellType, PhaseName } from '~/config/game';

export const PHASES = ['event', 'action', 'resolution', 'result'] as const;

export const phaseLabels: Record<PhaseName, string> = {
  event: 'Sự kiện',
  action: 'Hành động',
  resolution: 'Xử lý',
  result: 'Kết quả'
};

export const cellTypeLabels: Record<CellType, string> = {
  competitive: 'Cạnh tranh',
  synergy: 'Cộng hưởng',
  shared: 'Chia sẻ',
  cooperation: 'Hợp tác',
  project: 'Dự án'
};

export const cellColors: Record<CellType, string> = {
  competitive: 'from-rose-500 to-rose-600',
  synergy: 'from-indigo-500 to-indigo-600',
  shared: 'from-sky-500 to-sky-600',
  cooperation: 'from-emerald-500 to-emerald-600',
  project: 'from-red-600 to-red-700'
};

export const cellEffects: Record<CellType, string> = {
  competitive: 'Đội phân bố nhiều tài nguyên nhất nhận TOÀN BỘ điểm. Các đội khác mất điểm.',
  synergy: 'Tất cả các đội cùng phân bố đều nhận điểm. Phân bố càng nhiều, điểm càng cao.',
  shared: 'Điểm được chia đều cho tất cả đội cùng phân bố, bất kể số lượng.',
  cooperation: 'Cần tối thiểu 2 đội cùng phân bố. Tất cả đều nhận điểm bonus.',
  project: 'Đóng góp vào Dự án Quốc gia. Cần đạt mốc yêu cầu để thành công.'
};

export function getPhaseColor(phase: PhaseName): string {
  switch (phase) {
    case 'event':
      return 'bg-amber-500';
    case 'action':
      return 'bg-green-500';
    case 'resolution':
      return 'bg-blue-500';
    case 'result':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}
