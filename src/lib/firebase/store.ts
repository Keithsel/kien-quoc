import { createSignal } from 'solid-js';
import { subscribeToGame, getCurrentUserTeam, isCurrentUserHost } from '~/lib/firebase/game';
import type { OnlineGameData, Role } from '~/lib/firebase/types';
import type { RegionId } from '~/config/regions';

const ROLE_STORAGE_KEY = 'kienquoc_online_role';

// Initialize signals (sessionStorage read happens after module load for SSR compatibility)
const [onlineGame, setOnlineGame] = createSignal<OnlineGameData | null>(null);
const [onlineRole, setOnlineRoleInternal] = createSignal<Role | null>(null);
const [isSubscribed, setIsSubscribed] = createSignal(false);

// Sync role from sessionStorage on client (handles SSR where sessionStorage is undefined)
if (typeof sessionStorage !== 'undefined') {
  const savedRole = sessionStorage.getItem(ROLE_STORAGE_KEY) as Role | null;
  if (savedRole) {
    setOnlineRoleInternal(savedRole);
  }
}

let unsubscribe: (() => void) | null = null;

export function subscribeOnline() {
  if (unsubscribe) return;

  unsubscribe = subscribeToGame((game) => {
    setOnlineGame(game);
  });
  setIsSubscribed(true);
}

export function unsubscribeOnline() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  setIsSubscribed(false);
  setOnlineGame(null);
}

export function setRole(role: Role | null) {
  setOnlineRoleInternal(role);
  // Persist to sessionStorage (per-tab, unlike localStorage which is shared across tabs)
  if (role) {
    sessionStorage.setItem(ROLE_STORAGE_KEY, role);
  } else {
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
  }
}

export function getOnlineGame() {
  return onlineGame();
}

export function getOnlineRole() {
  return onlineRole();
}

export function getMyTeamId(): RegionId | null {
  return getCurrentUserTeam(onlineGame());
}

export function amIHost(): boolean {
  return isCurrentUserHost(onlineGame());
}

export function getTimeRemaining(): number {
  const game = onlineGame();
  if (!game || game.status !== 'playing') return 0;

  const remaining = Math.max(0, Math.floor((game.phaseEndTime - Date.now()) / 1000));
  return remaining;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export { onlineGame, onlineRole, isSubscribed };
