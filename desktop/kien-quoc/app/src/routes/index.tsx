import { A } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { Landmark, Users, Trophy, Flag, CircleQuestionMark } from 'lucide-solid';
import InstructionModal from '~/components/game/modals/InstructionModal';

export default function Home() {
  const [showInstructions, setShowInstructions] = createSignal(false);

  return (
    <main class="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-amber-900 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-20 left-10 w-32 h-32 border-4 border-amber-300 rotate-45" />
        <div class="absolute bottom-20 right-20 w-48 h-48 border-4 border-amber-300 rotate-12" />
        <div class="absolute top-1/2 left-1/4 w-24 h-24 border-4 border-amber-300 -rotate-12" />
      </div>

      {/* Main content */}
      <div class="relative z-10 text-center max-w-2xl">
        {/* Star emblem */}
        <div class="mb-8 flex justify-center">
          <div class="w-24 h-24 bg-amber-400 rotate-45 flex items-center justify-center shadow-2xl">
            <span class="text-red-900 text-5xl -rotate-45">★</span>
          </div>
        </div>

        {/* Title */}
        <h1 class="text-6xl font-bold mb-4 tracking-wider" style={{ 'font-family': "'Noto Serif', serif" }}>
          Kiến Quốc Ký
        </h1>
        <p class="text-xl text-amber-200 mb-2">Xây dựng Tương lai • 1986-2007</p>
        <p class="text-amber-300/70 mb-12">Trò chơi chiến thuật về hành trình Đổi Mới của Việt Nam</p>

        {/* Features */}
        <div class="grid grid-cols-4 gap-4 mb-12">
          <div class="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
            <Landmark class="w-8 h-8 text-amber-300" />
            <span class="text-sm">5 Vùng miền</span>
          </div>
          <div class="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
            <Users class="w-8 h-8 text-amber-300" />
            <span class="text-sm">2-5 Người chơi</span>
          </div>
          <div class="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
            <Trophy class="w-8 h-8 text-amber-300" />
            <span class="text-sm">8 Lượt chơi</span>
          </div>
          <div class="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
            <Flag class="w-8 h-8 text-amber-300" />
            <span class="text-sm">6 Chỉ số</span>
          </div>
        </div>

        {/* Buttons */}
        <div class="flex flex-col items-center gap-4">
          <A
            href="/mode"
            class="inline-block px-12 py-4 bg-amber-400 hover:bg-amber-300 text-red-900 font-bold text-xl rounded-xl transition-all transform hover:scale-105 shadow-xl"
          >
            BẮT ĐẦU CHƠI
          </A>

          <button
            onClick={() => setShowInstructions(true)}
            class="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-amber-200 font-medium rounded-lg transition-all backdrop-blur-sm"
          >
            <CircleQuestionMark class="w-5 h-5" />
            Hướng dẫn chơi
          </button>
        </div>
      </div>

      {/* Instruction Modal */}
      <Show when={showInstructions()}>
        <InstructionModal onClose={() => setShowInstructions(false)} />
      </Show>
    </main>
  );
}
