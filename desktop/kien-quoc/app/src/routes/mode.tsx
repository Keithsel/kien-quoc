import { A } from '@solidjs/router';
import { Monitor, Globe, ArrowLeft } from 'lucide-solid';

export default function ModeSelection() {
  return (
    <main class="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex flex-col items-center justify-center p-8">
      {/* Back button */}
      <A
        href="/"
        class="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
        <span>Quay lại</span>
      </A>

      <div class="max-w-xl w-full text-center">
        <h1 class="text-4xl font-bold text-red-700 mb-2">Chọn chế độ chơi</h1>
        <p class="text-gray-600 mb-8">Chơi một mình hoặc cùng bạn bè</p>

        <div class="space-y-4">
          {/* Offline mode */}
          <A
            href="/region?mode=offline"
            class="block p-6 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-red-500 hover:shadow-xl transition-all group"
          >
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                <Monitor class="w-8 h-8 text-red-600 group-hover:text-white transition-colors" />
              </div>
              <div class="text-left flex-1">
                <h2 class="text-xl font-bold text-gray-800">Chơi một mình</h2>
              </div>
            </div>
          </A>

          {/* Online mode - Now enabled! */}
          <A
            href="/online"
            class="block p-6 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-red-500 hover:shadow-xl transition-all group"
          >
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center group-hover:bg-red-600 transition-colors">
                <Globe class="w-8 h-8 text-red-600 group-hover:text-white transition-colors" />
              </div>
              <div class="text-left flex-1">
                <h2 class="text-xl font-bold text-gray-800">Chơi trực tuyến</h2>
              </div>
            </div>
          </A>
        </div>
      </div>
    </main>
  );
}
