/**
 * Online Mode Entry Route
 * Handles role selection (host/player/spectator) and password auth for host
 */
import { createSignal, Show, onMount } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { ArrowLeft, Crown, Users, Eye, Lock, WifiOff, Wifi } from 'lucide-solid';
import { getGameFacade } from '~/lib/core';
import { ensureAuth } from '~/lib/firebase/client';

type Role = 'host' | 'player' | 'spectator';

const HOST_PASSWORD_KEY = 'kienquoc_host_password';

export default function OnlineRoleSelection() {
  const navigate = useNavigate();
  const facade = getGameFacade();
  const [selectedRole, setSelectedRole] = createSignal<Role | null>(null);
  const [hostPassword, setHostPassword] = createSignal('');
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [connected, setConnected] = createSignal(false);
  const [connecting, setConnecting] = createSignal(true);

  // Check Firebase connection on mount
  onMount(async () => {
    try {
      await ensureAuth();
      setConnected(true);
      // Initialize facade for online mode only after connection confirmed
      facade.setMode('online');
    } catch (err) {
      setError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối internet.');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  });

  // Load saved password
  const savedPassword = localStorage.getItem(HOST_PASSWORD_KEY);
  if (savedPassword) {
    setHostPassword(savedPassword);
  }

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleContinue = async () => {
    const role = selectedRole();
    if (!role) return;

    setLoading(true);
    setError('');

    try {
      if (role === 'host') {
        // Verify password and create/host game
        await facade.hostGame(hostPassword());
        localStorage.setItem(HOST_PASSWORD_KEY, hostPassword());
      } else {
        // Player/spectator: just initialize to subscribe to Firebase
        await facade.initialize({});
      }

      facade.setOnlineRole(role);

      // All roles go to lobby
      navigate(`/lobby?mode=online&role=${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      localStorage.removeItem(HOST_PASSWORD_KEY);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="min-h-screen bg-linear-to-br from-red-50 to-amber-50 flex flex-col items-center justify-center p-8">
      {/* Back button */}
      <A
        href="/"
        class="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
        <span>Quay lại</span>
      </A>

      {/* Title */}
      <div class="w-full text-center mb-8">
        <h1 class="text-4xl font-bold text-red-700 mb-2">Chế độ trực tuyến</h1>
        <p class="text-gray-600">Chọn vai trò của bạn</p>

        {/* Connection status */}
        <div class="mt-4 flex items-center justify-center gap-2">
          <Show when={connecting()}>
            <div class="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            <span class="text-sm text-gray-500">Đang kết nối...</span>
          </Show>
          <Show when={!connecting() && connected()}>
            <Wifi class="w-4 h-4 text-green-500" />
            <span class="text-sm text-green-600">Đã kết nối</span>
          </Show>
          <Show when={!connecting() && !connected()}>
            <WifiOff class="w-4 h-4 text-red-500" />
            <span class="text-sm text-red-600">Không thể kết nối</span>
          </Show>
        </div>
      </div>

      <div class="max-w-xl w-full">
        {/* Role cards - disabled when not connected */}
        <div class={`space-y-3 mb-6 ${!connected() ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Host */}
          <button
            onClick={() => handleRoleSelect('host')}
            class={`w-full p-5 rounded-2xl shadow-lg border-2 transition-all text-left ${
              selectedRole() === 'host'
                ? 'border-red-500 bg-red-50'
                : 'border-transparent bg-white hover:border-red-300'
            }`}
          >
            <div class="flex items-center gap-4">
              <div
                class={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  selectedRole() === 'host' ? 'bg-red-600' : 'bg-red-100'
                }`}
              >
                <Crown class={`w-7 h-7 ${selectedRole() === 'host' ? 'text-white' : 'text-red-600'}`} />
              </div>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-gray-800">Quản trò (Host)</h2>
                <p class="text-sm text-gray-500">Điều khiển game, thêm AI, quản lý lượt chơi</p>
              </div>
            </div>
          </button>

          {/* Player */}
          <button
            onClick={() => handleRoleSelect('player')}
            class={`w-full p-5 rounded-2xl shadow-lg border-2 transition-all text-left ${
              selectedRole() === 'player'
                ? 'border-red-500 bg-red-50'
                : 'border-transparent bg-white hover:border-red-300'
            }`}
          >
            <div class="flex items-center gap-4">
              <div
                class={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  selectedRole() === 'player' ? 'bg-blue-600' : 'bg-blue-100'
                }`}
              >
                <Users class={`w-7 h-7 ${selectedRole() === 'player' ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-gray-800">Người chơi (Player)</h2>
                <p class="text-sm text-gray-500">Chọn khu vực và phân bố tài nguyên</p>
              </div>
            </div>
          </button>

          {/* Spectator */}
          <button
            onClick={() => handleRoleSelect('spectator')}
            class={`w-full p-5 rounded-2xl shadow-lg border-2 transition-all text-left ${
              selectedRole() === 'spectator'
                ? 'border-red-500 bg-red-50'
                : 'border-transparent bg-white hover:border-red-300'
            }`}
          >
            <div class="flex items-center gap-4">
              <div
                class={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
                  selectedRole() === 'spectator' ? 'bg-gray-600' : 'bg-gray-100'
                }`}
              >
                <Eye class={`w-7 h-7 ${selectedRole() === 'spectator' ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <div class="flex-1">
                <h2 class="text-lg font-bold text-gray-800">Khán giả (Spectator)</h2>
                <p class="text-sm text-gray-500">Xem game diễn ra</p>
              </div>
            </div>
          </button>
        </div>

        {/* Password input for host */}
        <Show when={selectedRole() === 'host'}>
          <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div class="flex items-center gap-2 mb-2">
              <Lock class="w-4 h-4 text-amber-600" />
              <span class="text-sm font-medium text-amber-700">Mật khẩu quản trò</span>
            </div>
            <input
              type="password"
              value={hostPassword()}
              onInput={(e) => setHostPassword(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hostPassword()) {
                  handleContinue();
                }
              }}
              placeholder="Nhập mật khẩu"
              class="w-full px-4 py-2 bg-white text-gray-900 border border-amber-300 rounded-lg focus:border-red-500 focus:outline-none placeholder:text-gray-400"
            />
          </div>
        </Show>

        {/* Error message */}
        <Show when={error()}>
          <div class="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">{error()}</div>
        </Show>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selectedRole() || loading() || (selectedRole() === 'host' && !hostPassword())}
          class="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all"
        >
          {loading() ? 'Đang kết nối...' : 'Tiếp tục'}
        </button>
      </div>
    </main>
  );
}
