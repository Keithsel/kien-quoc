import type { GameState, Phase, Team, TurnEvent, TurnResult, GameOverResult } from './game'
import type { RoomState } from './room'

// Client → Server
export type ClientMessage =
  | { type: 'AUTHENTICATE'; payload: { token: string; role: 'host' | 'player' | 'spectator'; teamId?: string } }
  | { type: 'PLACE_RESOURCE'; payload: { cellId: string; amount: number } }
  | { type: 'REMOVE_RESOURCE'; payload: { cellId: string; amount: number } }
  | { type: 'SUBMIT_TURN'; payload: Record<string, never> }
  | { type: 'HOST_START_GAME'; payload: Record<string, never> }
  | { type: 'HOST_PAUSE_GAME'; payload: Record<string, never> }
  | { type: 'HOST_RESUME_GAME'; payload: Record<string, never> }
  | { type: 'HOST_SKIP_PHASE'; payload: Record<string, never> }
  | { type: 'HOST_EXTEND_TIME'; payload: { seconds: number } }
  | { type: 'HOST_KICK_TEAM'; payload: { teamId: string } }
  | { type: 'HOST_END_GAME'; payload: Record<string, never> }
  | { type: 'PONG'; payload: Record<string, never> }

// Server → Client
export type ServerMessage =
  | { type: 'CONNECTED'; payload: { clientId: string } }
  | { type: 'AUTH_SUCCESS'; payload: { role: string } }
  | { type: 'AUTH_FAILED'; payload: { reason: string } }
  | { type: 'ROOM_STATE'; payload: RoomState }
  | { type: 'GAME_STATE'; payload: GameState }
  | { type: 'PARTIAL_UPDATE'; payload: Partial<GameState> }
  | { type: 'TEAM_JOINED'; payload: { team: Team } }
  | { type: 'TEAM_LEFT'; payload: { teamId: string; regionId: string } }
  | { type: 'TEAM_SUBMITTED'; payload: { teamId: string } }
  | { type: 'PHASE_STARTED'; payload: { phase: Phase; timeLimit: number; event?: TurnEvent } }
  | { type: 'TURN_RESULT'; payload: TurnResult }
  | { type: 'GAME_OVER'; payload: GameOverResult }
  | { type: 'ERROR'; payload: { code: string; message: string } }
  | { type: 'PING'; payload: { serverTime: number } }

export type ClientMessageType = ClientMessage['type']
export type ServerMessageType = ServerMessage['type']
