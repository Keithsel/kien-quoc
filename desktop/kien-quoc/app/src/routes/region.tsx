/**
 * Region Selection Route
 * Handles offline game setup - region selection and saved game continuation
 */
import { createSignal, For, Show, onMount } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { ArrowLeft, MapPin, Play, Building2, Waves, Trees, Wheat, Factory, RotateCcw } from 'lucide-solid';
import { REGIONS, type RegionId } from '~/config/regions';
import { getGameFacade } from '~/lib/core';

const regionIcons: Record<RegionId, typeof Building2> = {
  'thu-do': Building2,
  'duyen-hai': Waves,
  'tay-nguyen': Trees,
  'dong-bang': Wheat,
  'mien-dong': Factory
};

export default function RegionSelection() {
  const navigate = useNavigate();
  const facade = getGameFacade();
  const [selectedRegion, setSelectedRegion] = createSignal<RegionId | null>(null);
  const [showContinueDialog, setShowContinueDialog] = createSignal(false);

  // Initialize facade for offline mode
  facade.setMode('offline');

  // Check for saved game on mount
  onMount(() => {
    if (facade.hasSavedGame()) {
      setShowContinueDialog(true);
    }
  });

  function handleContinue() {
    if (facade.load()) {
      navigate('/play?mode=offline');
    } else {
      facade.clearSavedGame();
      setShowContinueDialog(false);
    }
  }

  function handleNewGame() {
    facade.clearSavedGame();
    setShowContinueDialog(false);
  }

  async function handleStart() {
    const region = selectedRegion();
    if (!region) return;

    facade.clearSavedGame();
    await facade.initialize({ playerRegion: region });
    await facade.startGame();
    navigate('/play?mode=offline');
  }

  return (
    <main class="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex flex-col items-center justify-center p-8">
      {/* Continue game dialog */}
      <Show when={showContinueDialog()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scale-in text-center">
            <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw class="w-8 h-8 text-amber-600" />
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Có game chưa hoàn thành</h2>
            <p class="text-gray-600 mb-6">Bạn muốn tiếp tục hay bắt đầu game mới?</p>
            <div class="flex gap-3 justify-center">
              <button
                onClick={handleContinue}
                class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
              >
                Tiếp tục
              </button>
              <button
                onClick={handleNewGame}
                class="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Game mới
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Back button */}
      <A
        href="/"
        class="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
        <span>Quay lại</span>
      </A>

      <div class="max-w-lg w-full text-center">
        <div class="flex items-center justify-center gap-2 mb-2">
          <MapPin class="w-8 h-8 text-red-600" />
          <h1 class="text-4xl font-bold text-red-700">Chọn khu vực</h1>
        </div>
        <p class="text-gray-600 mb-8 text-lg">Bạn sẽ đại diện cho vùng nào?</p>

        <div class="space-y-3 mb-8">
          <For each={REGIONS}>
            {(region) => {
              const IconComponent = regionIcons[region.id];
              return (
                <button
                  class={`w-full p-5 rounded-xl border-2 transition-all flex items-center gap-4
                    ${
                      selectedRegion() === region.id
                        ? 'border-red-500 bg-red-50 shadow-lg scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  onClick={() => setSelectedRegion(region.id)}
                >
                  <div class={`w-14 h-14 rounded-xl ${region.colorClass} flex items-center justify-center shadow-md`}>
                    <IconComponent class="w-7 h-7 text-white" />
                  </div>
                  <span class="font-bold text-gray-800 text-xl flex-1 text-left">{region.name}</span>
                  {selectedRegion() === region.id && (
                    <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-lg font-bold">✓</span>
                    </div>
                  )}
                </button>
              );
            }}
          </For>
        </div>

        <button
          class="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02]"
          onClick={handleStart}
          disabled={!selectedRegion()}
        >
          <Play class="w-6 h-6" />
          Bắt đầu trò chơi
        </button>
      </div>
    </main>
  );
}
