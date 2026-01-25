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
  independent: 'Độc lập',
  cooperation: 'Hợp tác',
  project: 'Dự án'
};

export const cellColors: Record<CellType, string> = {
  competitive: 'from-rose-500 to-rose-600',
  synergy: 'from-indigo-500 to-indigo-600',
  independent: 'from-sky-500 to-sky-600',
  cooperation: 'from-emerald-500 to-emerald-600',
  project: 'from-red-600 to-red-700'
};

export const cellEffects: Record<CellType, string> = {
  competitive: 'Đội phân bố nhiều nhất nhận nhiều điểm nhất.',
  synergy: 'Càng nhiều đội tham gia, thưởng càng cao cho tất cả đội.',
  independent: 'Mỗi đội nhận điểm theo RP đã phân bố.',
  cooperation: 'Cần 2+ đội tham gia để nhận điểm.',
  project: 'Đóng góp vào Dự án Quốc gia. Nhận điểm cơ bản và thưởng thêm nếu thành công.'
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
