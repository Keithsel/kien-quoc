import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH, REGIONS, MAX_TEAMS } from '@kien-quoc/shared'
import type { RoomState, RegionAvailability, Team } from '@kien-quoc/shared'

interface Room {
  code: string
  hostName: string
  hostToken: string
  createdAt: number
  status: 'waiting' | 'playing' | 'finished'
  teams: Map<string, Team>
  takenRegions: Map<string, string> // regionId -> teamId
}

// In-memory room store
const rooms = new Map<string, Room>()

// Token to room mapping
const tokenToRoom = new Map<string, string>() // token -> roomCode
const tokenToTeam = new Map<string, string>()  // token -> teamId

export function generateRoomCode(): string {
  let code: string
  do {
    code = ''
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_CHARSET[Math.floor(Math.random() * ROOM_CODE_CHARSET.length)]
    }
  } while (rooms.has(code))
  return code
}

export function generateToken(): string {
  return crypto.randomUUID()
}

export function createRoom(hostName: string): { roomCode: string; hostToken: string } {
  const roomCode = generateRoomCode()
  const hostToken = generateToken()
  
  const room: Room = {
    code: roomCode,
    hostName,
    hostToken,
    createdAt: Date.now(),
    status: 'waiting',
    teams: new Map(),
    takenRegions: new Map(),
  }
  
  rooms.set(roomCode, room)
  tokenToRoom.set(hostToken, roomCode)
  
  return { roomCode, hostToken }
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode)
}

export function validateHostToken(roomCode: string, token: string): boolean {
  const room = rooms.get(roomCode)
  return room?.hostToken === token
}

export function getRegionAvailability(roomCode: string): RegionAvailability[] {
  const room = rooms.get(roomCode)
  if (!room) return []
  
  return REGIONS.map(region => {
    const teamId = room.takenRegions.get(region.id)
    const team = teamId ? room.teams.get(teamId) : undefined
    
    return {
      regionId: region.id,
      regionName: region.name,
      isAvailable: !teamId,
      takenBy: team ? { teamId: team.id, teamName: team.name } : undefined,
    }
  })
}

export function joinRoom(
  roomCode: string, 
  teamName: string, 
  regionId: string
): { success: true; teamId: string; sessionToken: string } | { success: false; error: string } {
  const room = rooms.get(roomCode)
  
  if (!room) {
    return { success: false, error: 'Room not found' }
  }
  
  if (room.status !== 'waiting') {
    return { success: false, error: 'Game already started' }
  }
  
  if (room.teams.size >= MAX_TEAMS) {
    return { success: false, error: 'Room is full' }
  }
  
  if (room.takenRegions.has(regionId)) {
    return { success: false, error: 'Region already taken' }
  }
  
  if (!REGIONS.find(r => r.id === regionId)) {
    return { success: false, error: 'Invalid region' }
  }
  
  const teamId = generateToken()
  const sessionToken = generateToken()
  
  const team: Team = {
    id: teamId,
    name: teamName,
    regionId,
    score: 0,
    resources: 14,
    placements: [],
    hasSubmitted: false,
    isConnected: false,
    connectedClients: 0,
  }
  
  room.teams.set(teamId, team)
  room.takenRegions.set(regionId, teamId)
  tokenToRoom.set(sessionToken, roomCode)
  tokenToTeam.set(sessionToken, teamId)
  
  return { success: true, teamId, sessionToken }
}

export function kickTeam(roomCode: string, teamId: string): boolean {
  const room = rooms.get(roomCode)
  if (!room) return false
  
  const team = room.teams.get(teamId)
  if (!team) return false
  
  room.teams.delete(teamId)
  room.takenRegions.delete(team.regionId)
  
  // Clean up tokens for this team
  for (const [token, tId] of tokenToTeam) {
    if (tId === teamId) {
      tokenToTeam.delete(token)
      tokenToRoom.delete(token)
    }
  }
  
  return true
}

export function getRoomState(roomCode: string): RoomState | null {
  const room = rooms.get(roomCode)
  if (!room) return null
  
  return {
    roomCode: room.code,
    hostName: room.hostName,
    status: room.status,
    teams: Array.from(room.teams.values()).map(t => ({
      id: t.id,
      name: t.name,
      regionId: t.regionId,
      isConnected: t.isConnected,
    })),
    regions: getRegionAvailability(roomCode),
  }
}

export function setRoomStatus(roomCode: string, status: 'waiting' | 'playing' | 'finished'): boolean {
  const room = rooms.get(roomCode)
  if (!room) return false
  room.status = status
  return true
}

export function getTeamByToken(token: string): { room: Room; team: Team } | null {
  const roomCode = tokenToRoom.get(token)
  const teamId = tokenToTeam.get(token)
  
  if (!roomCode || !teamId) return null
  
  const room = rooms.get(roomCode)
  if (!room) return null
  
  const team = room.teams.get(teamId)
  if (!team) return null
  
  return { room, team }
}

export function getRoomByHostToken(token: string): Room | null {
  const roomCode = tokenToRoom.get(token)
  if (!roomCode) return null
  
  const room = rooms.get(roomCode)
  if (!room || room.hostToken !== token) return null
  
  return room
}

// Cleanup expired rooms (call periodically)
export function cleanupExpiredRooms(expiryMs: number = 2 * 60 * 60 * 1000): number {
  const now = Date.now()
  let cleaned = 0
  
  for (const [code, room] of rooms) {
    if (now - room.createdAt > expiryMs) {
      rooms.delete(code)
      cleaned++
    }
  }
  
  return cleaned
}
