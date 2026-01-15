import { Elysia, t } from 'elysia'
import { 
  createRoom, 
  getRoom, 
  getRegionAvailability, 
  joinRoom, 
  kickTeam,
  getRoomState,
  validateHostToken 
} from '../services/room.service'
import { MIN_TEAMS } from '@kien-quoc/shared'

export const roomRoutes = new Elysia({ prefix: '/api/room' })
  .post('/create', ({ body }) => {
    const result = createRoom(body.hostName)
    return result
  }, {
    body: t.Object({
      hostName: t.String({ minLength: 1, maxLength: 50 })
    })
  })
  
  .get('/:roomCode/regions', ({ params }) => {
    const regions = getRegionAvailability(params.roomCode)
    if (regions.length === 0) {
      return { error: 'Room not found' }
    }
    return { regions }
  }, {
    params: t.Object({
      roomCode: t.String({ minLength: 6, maxLength: 6 })
    })
  })
  
  .post('/join', ({ body }) => {
    const result = joinRoom(body.roomCode, body.teamName, body.regionId)
    if (!result.success) {
      return { error: result.error }
    }
    return { teamId: result.teamId, sessionToken: result.sessionToken }
  }, {
    body: t.Object({
      roomCode: t.String({ minLength: 6, maxLength: 6 }),
      teamName: t.String({ minLength: 1, maxLength: 50 }),
      regionId: t.String()
    })
  })
  
  .get('/:roomCode', ({ params }) => {
    const state = getRoomState(params.roomCode)
    if (!state) {
      return { error: 'Room not found' }
    }
    return state
  }, {
    params: t.Object({
      roomCode: t.String({ minLength: 6, maxLength: 6 })
    })
  })
  
  .post('/kick', ({ body }) => {
    if (!validateHostToken(body.roomCode, body.hostToken)) {
      return { error: 'Unauthorized' }
    }
    const success = kickTeam(body.roomCode, body.teamId)
    return { success }
  }, {
    body: t.Object({
      roomCode: t.String(),
      teamId: t.String(),
      hostToken: t.String()
    })
  })
  
  .post('/start', ({ body }) => {
    if (!validateHostToken(body.roomCode, body.hostToken)) {
      return { error: 'Unauthorized' }
    }
    
    const room = getRoom(body.roomCode)
    if (!room) {
      return { error: 'Room not found' }
    }
    
    if (room.teams.size < MIN_TEAMS) {
      return { error: `Need at least ${MIN_TEAMS} teams to start` }
    }
    
    // Game start will be handled by game service
    return { success: true, message: 'Game starting...' }
  }, {
    body: t.Object({
      roomCode: t.String(),
      hostToken: t.String()
    })
  })
