import type { ClientMessage, ServerMessage, Role } from '@kien-quoc/shared'
import { WS_PING_INTERVAL } from '@kien-quoc/shared'
import { getRoom, getTeamByToken, getRoomByHostToken, getRoomState } from './room.service'

// Elysia WebSocket type - simplified interface
interface ElysiaWS {
  id: string
  send: (data: string | Buffer) => void
  data: ClientInfo
}

interface ClientInfo {
  id: string
  roomCode: string
  role: Role
  teamId?: string
  authenticated: boolean
}

// Connection stores
const clients = new Map<string, ElysiaWS>() // clientId -> ws
const roomClients = new Map<string, Set<string>>() // roomCode -> clientIds

export function generateClientId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function handleOpen(ws: ElysiaWS) {
  const clientId = ws.id || generateClientId()
  
  // Initialize client info
  ws.data = {
    id: clientId,
    roomCode: '',
    role: 'spectator',
    authenticated: false,
  }
  
  clients.set(clientId, ws)
  send(ws, { type: 'CONNECTED', payload: { clientId } })
}

export function handleClose(ws: ElysiaWS) {
  const info = ws.data
  if (!info) return
  
  // Remove from room clients
  if (info.roomCode) {
    const roomSet = roomClients.get(info.roomCode)
    if (roomSet) {
      roomSet.delete(info.id)
      if (roomSet.size === 0) {
        roomClients.delete(info.roomCode)
      }
    }
    
    // Update team connection status if player
    if (info.teamId) {
      const result = getTeamByToken(info.teamId)
      if (result) {
        result.team.connectedClients = Math.max(0, result.team.connectedClients - 1)
        result.team.isConnected = result.team.connectedClients > 0
      }
    }
    
    // Notify others in room
    if (info.teamId) {
      broadcastToRoom(info.roomCode, {
        type: 'TEAM_LEFT',
        payload: { teamId: info.teamId, regionId: '' }
      }, info.id)
    }
  }
  
  clients.delete(info.id)
}

export function handleMessage(ws: ElysiaWS, data: string) {
  const info = ws.data
  if (!info) return
  
  let message: ClientMessage
  try {
    message = JSON.parse(data)
  } catch {
    send(ws, { type: 'ERROR', payload: { code: 'INVALID_JSON', message: 'Invalid JSON' } })
    return
  }
  
  // Handle authentication first
  if (message.type === 'AUTHENTICATE') {
    handleAuthenticate(ws, message.payload)
    return
  }
  
  // All other messages require authentication
  if (!info.authenticated) {
    send(ws, { type: 'AUTH_FAILED', payload: { reason: 'Not authenticated' } })
    return
  }
  
  // Handle pong (keep-alive)
  if (message.type === 'PONG') return
  
  // Route to appropriate handler based on role
  if (info.role === 'host') {
    handleHostMessage(ws, message)
  } else if (info.role === 'player') {
    handlePlayerMessage(ws, message)
  }
}

function handleAuthenticate(
  ws: ElysiaWS,
  payload: { token: string; role: Role; teamId?: string }
) {
  const info = ws.data
  const { token, role } = payload
  
  if (role === 'host') {
    const room = getRoomByHostToken(token)
    if (!room) {
      send(ws, { type: 'AUTH_FAILED', payload: { reason: 'Invalid host token' } })
      return
    }
    
    info.roomCode = room.code
    info.role = 'host'
    info.authenticated = true
    addToRoom(info.id, room.code)
    
    send(ws, { type: 'AUTH_SUCCESS', payload: { role: 'host' } })
    send(ws, { type: 'ROOM_STATE', payload: getRoomState(room.code)! })
    
  } else if (role === 'player') {
    const result = getTeamByToken(token)
    if (!result) {
      send(ws, { type: 'AUTH_FAILED', payload: { reason: 'Invalid session token' } })
      return
    }
    
    info.roomCode = result.room.code
    info.role = 'player'
    info.teamId = result.team.id
    info.authenticated = true
    
    result.team.connectedClients++
    result.team.isConnected = true
    
    addToRoom(info.id, result.room.code)
    
    send(ws, { type: 'AUTH_SUCCESS', payload: { role: 'player' } })
    send(ws, { type: 'ROOM_STATE', payload: getRoomState(result.room.code)! })
    
    // Notify others
    broadcastToRoom(result.room.code, {
      type: 'TEAM_JOINED',
      payload: { team: result.team }
    }, info.id)
    
  } else {
    // Spectator - token is roomCode
    const room = getRoom(token)
    if (!room) {
      send(ws, { type: 'AUTH_FAILED', payload: { reason: 'Room not found' } })
      return
    }
    
    info.roomCode = room.code
    info.role = 'spectator'
    info.authenticated = true
    addToRoom(info.id, room.code)
    
    send(ws, { type: 'AUTH_SUCCESS', payload: { role: 'spectator' } })
    send(ws, { type: 'ROOM_STATE', payload: getRoomState(room.code)! })
  }
}

function handleHostMessage(ws: ElysiaWS, message: ClientMessage) {
  const info = ws.data
  
  switch (message.type) {
    case 'HOST_START_GAME':
      broadcastToRoom(info.roomCode, {
        type: 'PHASE_STARTED',
        payload: { phase: 'event', timeLimit: 15 }
      })
      break
    case 'HOST_PAUSE_GAME':
    case 'HOST_RESUME_GAME':
    case 'HOST_SKIP_PHASE':
    case 'HOST_EXTEND_TIME':
    case 'HOST_KICK_TEAM':
    case 'HOST_END_GAME':
      // Will be implemented with game engine
      break
  }
}

function handlePlayerMessage(ws: ElysiaWS, message: ClientMessage) {
  switch (message.type) {
    case 'PLACE_RESOURCE':
    case 'REMOVE_RESOURCE':
    case 'SUBMIT_TURN':
      // Will be implemented with game engine
      break
  }
}

// Utility functions
function addToRoom(clientId: string, roomCode: string) {
  if (!roomClients.has(roomCode)) {
    roomClients.set(roomCode, new Set())
  }
  roomClients.get(roomCode)!.add(clientId)
}

function send(ws: ElysiaWS, message: ServerMessage) {
  ws.send(JSON.stringify(message))
}

export function broadcastToRoom(
  roomCode: string,
  message: ServerMessage,
  excludeClientId?: string
) {
  const roomSet = roomClients.get(roomCode)
  if (!roomSet) return
  
  const data = JSON.stringify(message)
  for (const clientId of roomSet) {
    if (clientId !== excludeClientId) {
      const client = clients.get(clientId)
      if (client) client.send(data)
    }
  }
}

export function sendToTeam(roomCode: string, teamId: string, message: ServerMessage) {
  const roomSet = roomClients.get(roomCode)
  if (!roomSet) return
  
  const data = JSON.stringify(message)
  for (const clientId of roomSet) {
    const client = clients.get(clientId)
    if (client?.data?.teamId === teamId) {
      client.send(data)
    }
  }
}

// Ping all clients periodically
export function startPingInterval() {
  setInterval(() => {
    const message = JSON.stringify({ type: 'PING', payload: { serverTime: Date.now() } })
    for (const [, ws] of clients) {
      ws.send(message)
    }
  }, WS_PING_INTERVAL)
}
