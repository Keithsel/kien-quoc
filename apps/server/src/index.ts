import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { roomRoutes } from './routes/room.routes'
import { 
  handleOpen, 
  handleClose, 
  handleMessage, 
  startPingInterval 
} from './services/websocket.service'

const PORT = process.env.PORT || 3000

const app = new Elysia()
  .use(cors({
    origin: true,
    credentials: true,
  }))
  .get('/', () => ({ message: 'Kiến Quốc Ký API', version: '1.0.0' }))
  .get('/health', () => ({ status: 'ok', timestamp: Date.now() }))
  .use(roomRoutes)
  .ws('/ws', {
    open: (ws) => handleOpen(ws as any),
    close: (ws) => handleClose(ws as any),
    message: (ws, data) => handleMessage(ws as any, String(data)),
  })
  .listen(PORT)

// Start ping interval for keep-alive
startPingInterval()

console.log(`🎮 Kiến Quốc Ký server running at http://${app.server?.hostname}:${app.server?.port}`)
console.log(`🔌 WebSocket available at ws://${app.server?.hostname}:${app.server?.port}/ws`)

