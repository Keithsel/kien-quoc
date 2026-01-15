export type Role = 'host' | 'player' | 'spectator'

export interface RoomInfo {
  roomCode: string
  hostName: string
  createdAt: number
  status: 'waiting' | 'playing' | 'finished'
}

export interface RegionAvailability {
  regionId: string
  regionName: string
  isAvailable: boolean
  takenBy?: { teamId: string; teamName: string }
}

export interface RoomState {
  roomCode: string
  hostName: string
  status: 'waiting' | 'playing' | 'finished'
  teams: { id: string; name: string; regionId: string; isConnected: boolean }[]
  regions: RegionAvailability[]
}

// API Types
export interface CreateRoomRequest { hostName: string }
export interface CreateRoomResponse { roomCode: string; hostToken: string }
export interface GetRegionsResponse { regions: RegionAvailability[] }
export interface JoinRoomRequest { roomCode: string; teamName: string; regionId: string; role: 'player' | 'spectator' }
export interface JoinRoomResponse { teamId: string; sessionToken: string }
export interface KickTeamRequest { roomCode: string; teamId: string; hostToken: string }
export interface RoomActionRequest { roomCode: string; hostToken: string }
