import { Show, For, createSignal } from 'solid-js';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Flag,
  Target,
  Clock,
  TrendingUp,
  Cog,
  Layers,
  Coins,
  Users,
  BookOpen,
  Globe,
  Leaf,
  Lightbulb,
  TriangleAlert,
  Star,
  Zap,
  Shuffle,
  Calendar,
  Grid3x3
} from 'lucide-solid';
import {
  PHASE_DURATIONS,
  RESOURCES_PER_TURN,
  MAX_TURNS,
  CELL_MULTIPLIERS,
  INDEX_BOOST_DIVISOR,
  REGION_SPECIALIZATION_MULTIPLIER,
  UNDERDOG_START_TURN_TIER1,
  UNDERDOG_START_TURN_TIER2,
  UNDERDOG_THRESHOLD,
  SOLO_PENALTY_COMPETITIVE,
  SOLO_PENALTY_SYNERGY,
  SOLO_PENALTY_COOPERATION
} from '~/config/game';
import { cellTypeLabels, cellEffects } from '~/components/game/play';

interface InstructionModalProps {
  onClose: () => void;
}

const pages = [
  { title: 'Chào mừng đến với Kiến Quốc Ký', subtitle: 'Tổng quan' },
  { title: 'Mục tiêu trò chơi', subtitle: 'Thắng & Thua' },
  { title: 'Vòng lượt chơi', subtitle: '4 giai đoạn mỗi lượt' },
  { title: 'Bàn chơi', subtitle: '5 loại ô' },
  { title: 'Chỉ số Quốc gia', subtitle: '6 chỉ số cần duy trì' },
  { title: 'Sự kiện & Biến động', subtitle: 'Yếu tố thay đổi mỗi lượt' }
];

const indexInfo = [
  { key: 'economy', color: '#f59e0b', label: 'Kinh tế', icon: Coins },
  { key: 'society', color: '#22c55e', label: 'Xã hội', icon: Users },
  { key: 'culture', color: '#a855f7', label: 'Văn hóa', icon: BookOpen },
  { key: 'integration', color: '#3b82f6', label: 'Hội nhập', icon: Globe },
  { key: 'environment', color: '#10b981', label: 'Môi trường', icon: Leaf },
  { key: 'science', color: '#f97316', label: 'Khoa học', icon: Lightbulb }
];

const cellTypes = [
  { type: 'project' as const, color: 'bg-red-600', count: 1, multi: `x${CELL_MULTIPLIERS.project}` },
  { type: 'synergy' as const, color: 'bg-indigo-500', count: 3, multi: `x${CELL_MULTIPLIERS.synergy}+` },
  { type: 'competitive' as const, color: 'bg-rose-500', count: 3, multi: `x${CELL_MULTIPLIERS.competitive}` },
  { type: 'cooperation' as const, color: 'bg-emerald-500', count: 3, multi: `x${CELL_MULTIPLIERS.cooperation}` },
  { type: 'independent' as const, color: 'bg-sky-500', count: 3, multi: `x${CELL_MULTIPLIERS.independent}` }
].map((item) => ({
  ...item,
  name: cellTypeLabels[item.type],
  desc: cellEffects[item.type]
}));

const phases = [
  {
    phase: 'Sự kiện',
    time: PHASE_DURATIONS.event,
    color: 'bg-amber-500',
    desc: 'Xem bối cảnh và dự án lượt này',
    icon: Flag,
    manual: true
  },
  {
    phase: 'Hành động',
    time: PHASE_DURATIONS.action,
    color: 'bg-green-500',
    desc: 'Phân bố tài nguyên',
    icon: Layers,
    manual: false
  },
  {
    phase: 'Kiểm tra',
    time: PHASE_DURATIONS.resolution,
    color: 'bg-blue-500',
    desc: 'Hệ thống tính toán kết quả',
    icon: Cog,
    manual: true
  },
  {
    phase: 'Kết quả',
    time: PHASE_DURATIONS.result,
    color: 'bg-purple-500',
    desc: 'Xem điểm và thay đổi chỉ số',
    icon: TrendingUp,
    manual: true
  }
];

export default function InstructionModal(props: InstructionModalProps) {
  const [currentPage, setCurrentPage] = createSignal(0);

  const nextPage = () => setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
  const prevPage = () => setCurrentPage((p) => Math.max(p - 1, 0));

  return (
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div class="bg-linear-to-r from-red-600 to-amber-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 class="text-xl font-bold text-white">{pages[currentPage()].title}</h2>
            <p class="text-red-100 text-sm">{pages[currentPage()].subtitle}</p>
          </div>
          <button onClick={props.onClose} class="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X class="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - fixed height for consistency */}
        <div class="p-6 h-125 overflow-y-auto">
          {/* Page 0: Welcome/Overview */}
          <Show when={currentPage() === 0}>
            <div class="text-center space-y-5">
              <div class="w-20 h-20 mx-auto bg-linear-to-br from-red-500 to-amber-500 rounded-full flex items-center justify-center">
                <Flag class="w-10 h-10 text-white" />
              </div>
              <div class="space-y-2">
                <p class="text-gray-700">
                  <strong>Kiến Quốc Ký</strong> là trò chơi chiến lược hợp tác, tái hiện hành trình{' '}
                  <strong>Đổi Mới</strong> của Việt Nam (1986-2007).
                </p>
                <p class="text-gray-600 text-sm">
                  Các vùng miền cùng phân bố tài nguyên để hoàn thành dự án quốc gia và duy trì 6 chỉ số đất nước.
                </p>
              </div>
              <div class="grid grid-cols-4 gap-3">
                <div class="p-3 bg-red-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-red-600">{MAX_TURNS}</div>
                  <div class="text-xs text-gray-600">Lượt chơi</div>
                </div>
                <div class="p-3 bg-amber-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-amber-600">6</div>
                  <div class="text-xs text-gray-600">Vùng miền</div>
                </div>
                <div class="p-3 bg-green-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-green-600">6</div>
                  <div class="text-xs text-gray-600">Chỉ số</div>
                </div>
                <div class="p-3 bg-blue-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-blue-600">{RESOURCES_PER_TURN}</div>
                  <div class="text-xs text-gray-600">RP/lượt</div>
                </div>
              </div>
              <div class="p-3 bg-gray-100 rounded-xl text-sm text-gray-600">
                <strong>Mẹo:</strong> Mỗi vùng có thế mạnh riêng (+
                {Math.round((REGION_SPECIALIZATION_MULTIPLIER - 1) * 100)}% điểm khi phân bố phù hợp)
              </div>
            </div>
          </Show>

          {/* Page 1: Goal - Win/Lose conditions */}
          <Show when={currentPage() === 1}>
            <div class="space-y-4">
              <div class="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <Target class="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h3 class="font-bold text-green-700 mb-1">Mục tiêu</h3>
                  <p class="text-sm text-gray-600">
                    Hoàn thành {MAX_TURNS} lượt với tất cả 6 chỉ số quốc gia còn <strong>&gt; 0</strong>.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
                <TriangleAlert class="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 class="font-bold text-red-700 mb-1">Lưu ý</h3>
                  <p class="text-sm text-gray-600">
                    Bất kỳ chỉ số nào về <strong>0</strong> = đất nước sụp đổ, game over.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 mt-4">
                <div class="p-3 bg-blue-50 rounded-xl">
                  <div class="font-bold text-blue-700 text-sm mb-2">✓ Dự án thành công</div>
                  <ul class="text-xs text-gray-600 space-y-1">
                    <li>• Đạt đủ RP yêu cầu</li>
                    <li>• Đủ số đội tham gia</li>
                    <li>
                      • <strong>Tăng</strong> chỉ số + điểm thưởng
                    </li>
                  </ul>
                </div>
                <div class="p-3 bg-orange-50 rounded-xl">
                  <div class="font-bold text-orange-700 text-sm mb-2">✗ Dự án thất bại</div>
                  <ul class="text-xs text-gray-600 space-y-1">
                    <li>• Không đủ RP/đội</li>
                    <li>
                      • <strong>Giảm</strong> chỉ số quốc gia
                    </li>
                    <li>• Không nhận điểm thưởng</li>
                  </ul>
                </div>
              </div>

              <div class="flex items-start gap-2 p-3 bg-purple-50 rounded-xl">
                <Star class="w-4 h-4 text-purple-600 shrink-0" />
                <p class="text-xs text-gray-600">
                  <strong>Hỗ trợ vượt khó:</strong> Từ lượt {UNDERDOG_START_TURN_TIER1}, đội cuối{' '}
                  {UNDERDOG_THRESHOLD * 100}% được +1 RP. Từ lượt {UNDERDOG_START_TURN_TIER2}: +2 RP và +5% điểm.
                </p>
              </div>
            </div>
          </Show>

          {/* Page 2: Turn Flow - Phases */}
          <Show when={currentPage() === 2}>
            <div class="space-y-4">
              <p class="text-gray-600 text-sm">
                Mỗi lượt gồm 4 giai đoạn. Chỉ <strong>Hành động</strong> có đếm ngược {PHASE_DURATIONS.action}s.
              </p>
              <div class="space-y-3">
                <For each={phases}>
                  {(item, i) => (
                    <div class="flex items-center gap-3">
                      <div
                        class={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
                      >
                        {i() + 1}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-gray-800 text-sm">{item.phase}</div>
                        <div class="text-xs text-gray-500">{item.desc}</div>
                      </div>
                      {!item.manual ? (
                        <div class="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded text-xs">
                          <Clock class="w-3 h-3" />
                          <span>{item.time}s</span>
                        </div>
                      ) : (
                        <div class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Quản trò</div>
                      )}
                    </div>
                  )}
                </For>
              </div>
              <div class="p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                <Lightbulb class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p class="text-xs text-gray-600">
                  Phân bố xong sớm? Nhấn <strong>Xác nhận</strong> để khóa lựa chọn trước khi hết giờ.
                </p>
              </div>
            </div>
          </Show>

          {/* Page 3: Board - Cell Types */}
          <Show when={currentPage() === 3}>
            <div class="space-y-4">
              <div class="flex items-center gap-2 text-gray-600 text-sm">
                <Grid3x3 class="w-4 h-4" />
                <span>
                  Bàn 4x4 với 16 ô. Mỗi đội có <strong>{RESOURCES_PER_TURN} RP</strong> để phân bố.
                </span>
              </div>
              <div class="space-y-2">
                <For each={cellTypes}>
                  {(cell) => (
                    <div class="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                      <div
                        class={`w-11 h-9 ${cell.color} rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0`}
                      >
                        {cell.multi}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-gray-800 text-sm flex items-center gap-2">
                          {cell.name}
                          <span class="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] rounded">x{cell.count}</span>
                        </div>
                        <div class="text-xs text-gray-500 truncate">{cell.desc}</div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
              <div class="p-3 bg-orange-50 rounded-xl flex items-start gap-2">
                <TriangleAlert class="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p class="text-xs text-gray-600">
                  <strong>Đừng tự cô lập bản thân:</strong> Phân bố một mình vào ô cạnh tranh, cộng hưởng hoặc hợp tác
                  sẽ bị giảm điểm tương ứng ({SOLO_PENALTY_COMPETITIVE}, {SOLO_PENALTY_SYNERGY},{' '}
                  {SOLO_PENALTY_COOPERATION})
                </p>
              </div>
            </div>
          </Show>

          {/* Page 4: National Indices */}
          <Show when={currentPage() === 4}>
            <div class="space-y-4">
              <p class="text-gray-600 text-sm">
                6 chỉ số bắt đầu ở <strong>10</strong>. Mỗi lượt <strong>-1</strong> do chi phí duy trì.
              </p>
              <div class="grid grid-cols-3 gap-2">
                <For each={indexInfo}>
                  {(item) => (
                    <div class="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                      <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: item.color }}
                      >
                        <item.icon class="w-4 h-4 text-white" />
                      </div>
                      <span class="font-medium text-gray-800 text-sm">{item.label}</span>
                    </div>
                  )}
                </For>
              </div>
              <div class="space-y-2">
                <div class="p-3 bg-blue-50 rounded-xl flex items-start gap-2">
                  <Lightbulb class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p class="text-xs text-gray-600">
                    Mỗi <strong>{INDEX_BOOST_DIVISOR} RP</strong> phân bố vào ô → <strong>+1</strong> chỉ số liên quan
                    của ô đó.
                  </p>
                </div>
                <div class="p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                  <Star class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p class="text-xs text-gray-600">
                    Phân bố vào ô trùng <strong>thế mạnh vùng</strong> → +
                    {Math.round((REGION_SPECIALIZATION_MULTIPLIER - 1) * 100)}% điểm!
                  </p>
                </div>
              </div>
            </div>
          </Show>

          {/* Page 5: Events & Modifiers */}
          <Show when={currentPage() === 5}>
            <div class="space-y-4">
              <p class="text-gray-600 text-sm">
                Mỗi lượt có <strong>sự kiện lịch sử</strong> và <strong>biến động</strong> ảnh hưởng đến điểm số.
              </p>

              <div class="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                <Calendar class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div class="font-bold text-amber-700 text-sm">8 sự kiện lịch sử (1986-2007)</div>
                  <p class="text-xs text-gray-600">Mỗi sự kiện có dự án riêng với yêu cầu RP và ảnh hưởng khác nhau.</p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-blue-50 rounded-xl">
                  <div class="flex items-center gap-2 mb-1.5">
                    <Zap class="w-4 h-4 text-blue-600" />
                    <span class="font-bold text-blue-700 text-sm">Biến động cố định</span>
                  </div>
                  <p class="text-xs text-gray-600">Gắn với sự kiện.</p>
                </div>
                <div class="p-3 bg-purple-50 rounded-xl">
                  <div class="flex items-center gap-2 mb-1.5">
                    <Shuffle class="w-4 h-4 text-purple-600" />
                    <span class="font-bold text-purple-700 text-sm">Biến động ngẫu nhiên</span>
                  </div>
                  <p class="text-xs text-gray-600">Ảnh hưởng ngẫu nhiên ở lượt mới.</p>
                </div>
              </div>

              <div class="p-3 bg-gray-100 rounded-xl">
                <div class="font-bold text-gray-700 text-sm mb-2">Ví dụ hiệu ứng</div>
                <div class="grid grid-cols-2 gap-2 text-xs text-black">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-500" />
                    <span>Ô Cộng hưởng +25%</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-red-500" />
                    <span>Tất cả điểm -20%</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-500" />
                    <span>RP dự án x1.5</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-red-500" />
                    <span>Hợp tác cần 3+ đội</span>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Footer Navigation */}
        <div class="px-6 py-4 bg-gray-50 flex justify-between items-center">
          <button
            onClick={prevPage}
            disabled={currentPage() === 0}
            class="flex items-center gap-1 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft class="w-4 h-4" /> Trước
          </button>

          {/* Page indicators */}
          <div class="flex gap-2">
            <For each={pages}>
              {(_, i) => (
                <button
                  onClick={() => setCurrentPage(i())}
                  class={`w-2.5 h-2.5 rounded-full transition-all ${
                    currentPage() === i() ? 'bg-red-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              )}
            </For>
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage() === pages.length - 1}
            class="flex items-center gap-1 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sau <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
