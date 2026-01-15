<script lang="ts">
  import { goto } from '$app/navigation'
  import { createRoom, getRegions, joinRoom } from '$lib/services/api'

  let hostName = $state('')
  let roomCode = $state('')
  let isCreating = $state(false)
  let error = $state('')

  async function handleCreate() {
    if (!hostName.trim()) return
    isCreating = true
    error = ''
    try {
      const result = await createRoom(hostName.trim())
      // Store host token and navigate to controller
      sessionStorage.setItem('hostToken', result.hostToken)
      goto(`/controller/${result.roomCode}`)
    } catch (e) {
      error = 'Không thể tạo phòng. Vui lòng thử lại.'
    } finally {
      isCreating = false
    }
  }

  async function handleJoin() {
    if (!roomCode.trim() || roomCode.length !== 6) return
    error = ''
    try {
      // Navigate to region selection
      goto(`/join/${roomCode.trim()}`)
    } catch (e) {
      error = 'Mã phòng không hợp lệ.'
    }
  }
</script>

<svelte:head>
  <title>Kiến Quốc Ký</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-yellow-800 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo/Title -->
    <div class="text-center mb-8">
      <h1 class="text-5xl font-bold text-yellow-400 mb-2 drop-shadow-lg">
        🏛️ KIẾN QUỐC KÝ
      </h1>
      <p class="text-amber-200 text-lg">
        Đổi Mới 1986 - 2007
      </p>
    </div>

    <!-- Card -->
    <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
      <!-- Create Room Section -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-white mb-4">Tạo phòng mới (Host)</h2>
        <input
          type="text"
          bind:value={hostName}
          placeholder="Tên của bạn"
          class="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-yellow-400 focus:outline-none mb-4"
        />
        <button
          onclick={handleCreate}
          disabled={isCreating || !hostName.trim()}
          class="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isCreating ? 'Đang tạo...' : 'TẠO PHÒNG MỚI'}
        </button>
      </div>

      <!-- Divider -->
      <div class="flex items-center mb-8">
        <div class="flex-1 border-t border-white/30"></div>
        <span class="px-4 text-white/60">HOẶC</span>
        <div class="flex-1 border-t border-white/30"></div>
      </div>

      <!-- Join Room Section -->
      <div>
        <h2 class="text-xl font-semibold text-white mb-4">Tham gia phòng</h2>
        <div class="flex gap-2 mb-4">
          {#each [0, 1, 2, 3, 4, 5] as i}
            <input
              type="text"
              maxlength="1"
              inputmode="numeric"
              pattern="[0-9]"
              class="w-12 h-14 text-center text-2xl font-bold rounded-lg bg-white/20 text-white border border-white/30 focus:border-yellow-400 focus:outline-none"
              value={roomCode[i] || ''}
              oninput={(e) => {
                const target = e.target as HTMLInputElement
                const val = target.value.replace(/\D/g, '')
                const chars = roomCode.split('')
                chars[i] = val
                roomCode = chars.join('').slice(0, 6)
                if (val && i < 5) {
                  const next = target.nextElementSibling as HTMLInputElement
                  next?.focus()
                }
              }}
              onkeydown={(e) => {
                if (e.key === 'Backspace' && !roomCode[i] && i > 0) {
                  const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                  prev?.focus()
                }
              }}
            />
          {/each}
        </div>
        <button
          onclick={handleJoin}
          disabled={roomCode.length !== 6}
          class="w-full py-3 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          THAM GIA
        </button>
      </div>

      <!-- Error message -->
      {#if error}
        <p class="mt-4 text-red-400 text-center">{error}</p>
      {/if}
    </div>

    <!-- Footer -->
    <p class="text-center text-amber-200/60 mt-6 text-sm">
      Board game giáo dục về lịch sử kinh tế Việt Nam
    </p>
  </div>
</div>
