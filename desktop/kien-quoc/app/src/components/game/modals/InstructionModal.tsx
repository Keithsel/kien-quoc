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
  TriangleAlert
} from 'lucide-solid';
import { PHASE_DURATIONS, RESOURCES_PER_TURN, MAX_TURNS } from '~/config/game';

interface InstructionModalProps {
  onClose: () => void;
}

const pages = [
  { title: 'Chào mừng đến Kiến Quốc Ký', subtitle: 'Hướng dẫn cơ bản' },
  { title: 'Mục tiêu trò chơi', subtitle: 'Xây dựng quốc gia' },
  { title: '6 Chỉ số Quốc gia', subtitle: 'Sức mạnh của dân tộc' },
  { title: '5 Loại ô trên bàn chơi', subtitle: 'Chiến lược phân bổ' },
  { title: '4 Giai đoạn mỗi lượt', subtitle: 'Vòng lượt chơi' }
];

const indexInfo = [
  { key: 'economy', color: '#f59e0b', label: 'Kinh tế', desc: 'Sức mạnh tài chính, công nghiệp', icon: Coins },
  { key: 'society', color: '#22c55e', label: 'Xã hội', desc: 'Phúc lợi, đời sống người dân', icon: Users },
  { key: 'culture', color: '#a855f7', label: 'Văn hóa', desc: 'Bản sắc, di sản dân tộc', icon: BookOpen },
  { key: 'integration', color: '#3b82f6', label: 'Hội nhập', desc: 'Quan hệ quốc tế', icon: Globe },
  { key: 'environment', color: '#10b981', label: 'Môi trường', desc: 'Tài nguyên, sinh thái', icon: Leaf },
  { key: 'science', color: '#f97316', label: 'Khoa học', desc: 'Công nghệ, đổi mới', icon: Lightbulb }
];

const cellTypes = [
  {
    name: 'Dự án',
    type: 'project',
    count: 1,
    multi: 'x1.0',
    color: 'bg-red-600',
    desc: 'Đóng góp trực tiếp vào dự án quốc gia'
  },
  {
    name: 'Cộng hưởng',
    type: 'synergy',
    count: 3,
    multi: 'x1.8',
    color: 'bg-indigo-500',
    desc: 'Thưởng khi nhiều đội cùng đặt'
  },
  {
    name: 'Cạnh tranh',
    type: 'competitive',
    count: 3,
    multi: 'x1.5',
    color: 'bg-rose-500',
    desc: 'Chỉ người cao nhất được tính'
  },
  {
    name: 'Hợp tác',
    type: 'cooperation',
    count: 3,
    multi: 'x2.5',
    color: 'bg-emerald-500',
    desc: 'Thưởng cao nhất khi hợp lực'
  },
  { name: 'Chia sẻ', type: 'shared', count: 3, multi: 'x1.5', color: 'bg-sky-500', desc: 'Chia đều cho tất cả' }
];

const phases = [
  {
    phase: 'Sự kiện',
    hasTimer: false,
    color: 'bg-amber-500',
    desc: 'Xem dự án mới và yêu cầu (quản trò điều khiển)',
    icon: Flag
  },
  {
    phase: 'Hành động',
    hasTimer: true,
    time: PHASE_DURATIONS.action,
    color: 'bg-green-500',
    desc: 'Phân bổ tài nguyên (có đếm ngược)',
    icon: Layers
  },
  {
    phase: 'Kiểm tra',
    hasTimer: false,
    color: 'bg-blue-500',
    desc: 'Tổng hợp kết quả các đội (quản trò điều khiển)',
    icon: Cog
  },
  {
    phase: 'Kết quả',
    hasTimer: false,
    color: 'bg-purple-500',
    desc: 'Xem dự án thành công hay thất bại (quản trò điều khiển)',
    icon: TrendingUp
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
        <div class="bg-gradient-to-r from-red-600 to-amber-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 class="text-xl font-bold text-white">{pages[currentPage()].title}</h2>
            <p class="text-red-100 text-sm">{pages[currentPage()].subtitle}</p>
          </div>
          <button onClick={props.onClose} class="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X class="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - fixed height for consistency */}
        <div class="p-6 h-[420px] overflow-y-auto">
          {/* Page 0: Welcome */}
          <Show when={currentPage() === 0}>
            <div class="text-center space-y-6">
              <div class="w-24 h-24 mx-auto bg-gradient-to-br from-red-500 to-amber-500 rounded-full flex items-center justify-center">
                <Flag class="w-12 h-12 text-white" />
              </div>
              <div class="space-y-3">
                <p class="text-gray-700 text-lg">
                  <strong>Kiến Quốc Ký</strong> là trò chơi chiến lược hợp tác, tái hiện hành trình
                  <strong> Đổi Mới</strong> của Việt Nam (1986-2007).
                </p>
                <p class="text-gray-600">
                  Các vùng miền cùng phân bổ tài nguyên để hoàn thành các dự án quốc gia và duy trì sức mạnh đất nước
                  qua 6 chỉ số.
                </p>
              </div>
              <div class="grid grid-cols-4 gap-3 mt-6">
                <div class="p-3 bg-red-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-red-600">{MAX_TURNS}</div>
                  <div class="text-xs text-gray-600">Lượt</div>
                </div>
                <div class="p-3 bg-amber-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-amber-600">5</div>
                  <div class="text-xs text-gray-600">Vùng miền</div>
                </div>
                <div class="p-3 bg-green-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-green-600">6</div>
                  <div class="text-xs text-gray-600">Chỉ số</div>
                </div>
                <div class="p-3 bg-blue-50 rounded-xl text-center">
                  <div class="text-2xl font-bold text-blue-600">{RESOURCES_PER_TURN}</div>
                  <div class="text-xs text-gray-600">Tài nguyên</div>
                </div>
              </div>
            </div>
          </Show>

          {/* Page 1: Goal */}
          <Show when={currentPage() === 1}>
            <div class="space-y-5">
              <div class="flex items-start gap-4 p-4 bg-red-50 rounded-xl">
                <Target class="w-8 h-8 text-red-600 shrink-0 mt-1" />
                <div>
                  <h3 class="font-bold text-red-700 mb-1">Mục tiêu chính</h3>
                  <p class="text-gray-700 text-sm">
                    Hoàn thành <strong>dự án quốc gia</strong> mỗi lượt. Mỗi dự án cần đạt đủ
                    <strong> tổng RP</strong> (Resource Points) và có đủ <strong>số đội tham gia</strong>.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                  <div class="text-green-700 font-bold mb-2">✓ Dự án thành công</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• Đạt đủ RP yêu cầu</li>
                    <li>• Đủ 2+ đội tham gia</li>
                    <li>
                      • <strong>Tăng</strong> chỉ số quốc gia
                    </li>
                    <li>• Nhận điểm thưởng theo đóng góp</li>
                  </ul>
                </div>
                <div class="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                  <div class="text-red-700 font-bold mb-2">✗ Dự án thất bại</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• Không đủ RP hoặc đội</li>
                    <li>
                      • <strong>Giảm</strong> chỉ số quốc gia
                    </li>
                    <li>• Không nhận điểm thưởng</li>
                  </ul>
                </div>
              </div>

              <div class="p-4 bg-amber-50 rounded-xl flex items-start gap-3">
                <TriangleAlert class="w-5 h-5 text-amber-600" />
                <div>
                  <div class="font-bold text-amber-700 text-sm">Cảnh báo</div>
                  <p class="text-sm text-gray-600">
                    Mỗi lượt, tất cả chỉ số <strong>-1</strong> do chi phí duy trì. Nếu bất kỳ chỉ số nào về 0, đất nước
                    sẽ sụp đổ.
                  </p>
                </div>
              </div>
            </div>
          </Show>

          {/* Page 2: National Indices */}
          <Show when={currentPage() === 2}>
            <div class="space-y-4">
              <p class="text-gray-600 text-sm">
                Quốc gia có 6 chỉ số, bắt đầu ở mức <strong>10</strong>. Duy trì trên 0 để tránh thất bại.
              </p>
              <div class="grid grid-cols-2 gap-3">
                <For each={indexInfo}>
                  {(item) => (
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div
                        class="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: item.color }}
                      >
                        <item.icon class="w-5 h-5 text-white" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-gray-800 text-sm">{item.label}</div>
                        <div class="text-xs text-gray-500 truncate">{item.desc}</div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
              <div class="p-3 bg-blue-50 rounded-xl text-center text-sm text-gray-600 flex items-center justify-center gap-2">
                <Lightbulb class="w-4 h-4 text-blue-600" />
                Đặt tài nguyên vào <strong>ô có chỉ số tương ứng</strong> để tăng chỉ số đó (bất kể dự án)
              </div>
            </div>
          </Show>

          {/* Page 3: Cell Types */}
          <Show when={currentPage() === 3}>
            <div class="space-y-4">
              <p class="text-gray-600 text-sm">
                Bàn chơi 4x4 với 5 loại ô. Mỗi đội có <strong>{RESOURCES_PER_TURN} điểm</strong> tài nguyên để phân bổ.
              </p>
              <div class="space-y-2">
                <For each={cellTypes}>
                  {(cell) => (
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div
                        class={`w-12 h-10 ${cell.color} rounded-lg flex items-center justify-center text-white text-xs font-bold`}
                      >
                        {cell.multi}
                      </div>
                      <div class="flex-1">
                        <div class="font-bold text-gray-800 text-sm flex items-center gap-2">
                          {cell.name}
                          <span class="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded">x{cell.count}</span>
                        </div>
                        <div class="text-xs text-gray-500">{cell.desc}</div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Page 4: Phases */}
          <Show when={currentPage() === 4}>
            <div class="space-y-4">
              <p class="text-gray-600 text-sm">
                Mỗi lượt gồm 4 giai đoạn. Chỉ <strong>Hành động</strong> có đếm ngược, các giai đoạn khác do quản trò
                điều khiển.
              </p>
              <div class="space-y-3">
                <For each={phases}>
                  {(item, i) => (
                    <div class="flex items-center gap-4">
                      <div
                        class={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white font-bold`}
                      >
                        {i() + 1}
                      </div>
                      <div class="flex-1">
                        <div class="font-bold text-gray-800">{item.phase}</div>
                        <div class="text-sm text-gray-500">{item.desc}</div>
                      </div>
                      {item.hasTimer ? (
                        <div class="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded">
                          <Clock class="w-3.5 h-3.5" />
                          <span class="text-sm font-medium">{item.time}s</span>
                        </div>
                      ) : (
                        <div class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Thủ công</div>
                      )}
                    </div>
                  )}
                </For>
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
