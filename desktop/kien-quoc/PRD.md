# Kiến Quốc - Product Requirements Document (PRD)

## Overview

**Kiến Quốc** (Build the Nation) is a turn-based strategy game where players manage regions to collectively build national prosperity. The game can be played offline (solo vs AI) or online (multiplayer with host control).

---

## Core Concepts

### Terminology

| Term          | Description                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Host**      | The game controller who manages turns, adds AI teams, and controls game flow (online only) |
| **Player**    | A team member who controls one region and allocates resources                              |
| **Spectator** | A viewer who watches the game without participating                                        |
| **Region**    | One of 5 geographic areas (Thủ đô, Duyên hải, Tây Nguyên, Đồng bằng, Miền Đông)            |
| **RP**        | Resource Points - used for project contributions                                           |
| **Turn**      | One game cycle consisting of 4 phases                                                      |
| **Project**   | Collective goal requiring RP from multiple teams                                           |

### Regions (5 total)

1. **Thủ đô** (Capital) - Red
2. **Duyên hải** (Coastal) - Cyan
3. **Tây Nguyên** (Highlands) - Green
4. **Đồng bằng** (Delta) - Amber
5. **Miền Đông** (Eastern) - Purple

---

## Game Modes

### Offline Mode

- Single player vs 4 AI opponents
- Player selects one region
- Game auto-saves progress
- Can continue or start new game

### Online Mode

Three roles:

1. **Host** (`/lobby?role=controller` → `/play?role=host`)
   - Creates/manages the game room
   - Adds AI teams to fill empty slots
   - Controls phase advancement
   - Can reset or continue games
2. **Player** (`/lobby?role=player` → `/play?role=player`)
   - Joins an available region
   - Allocates resources during action phase
   - Auto-navigates when host starts game

3. **Spectator** (`/lobby?role=spectator` → `/play?role=spectator`)
   - Watches game progress
   - Cannot interact with game state

---

## Game Phases (per Turn)

Each turn consists of 4 phases in order:

### 1. Event Phase

- Display current project requirements
- Show national indices status
- No player action required
- Host advances manually

### 2. Action Phase

- **Timed** (online: ~60 seconds)
- Players allocate RP to:
  - **Project cells** (contribute to collective goal)
  - **Region cells** (boost personal/national indices)
  - **Special cells** (synergy/competitive effects)
- Submit placements before timer expires
- AI teams auto-allocate

### 3. Resolution Phase

- Animate resource contributions
- Calculate project success/failure
- Show team contributions visually

### 4. Result Phase

- Display turn results
- Update national indices
- Award points to teams
- Check for game end conditions
- Show leaderboard changes

---

## Win/Lose Conditions

### Game Over (Loss)

- Any national index drops to 0
- Cannot maintain minimum thresholds

### Game End (Victory)

- Complete all 8 turns
- Winners determined by final points

---

## Board Layout

The game board is a 4x4 grid, the center is a merged 2x2 project cell, and the remaining 12 cells are region cells.

### Cell Types

- **Region Cell**: Directly affects regional indices
- **Project Cell**: Contributes RP toward current project
- **Synergy Cell**: Benefits multiple teams
- **Competitive Cell**: Bidding-based benefits

---

## Project System

Each turn has a project with:

- **Name**: Descriptive project title
- **minTotal**: Minimum combined RP required
- **minTeams**: Minimum number of contributing teams
- **Effects**: Index changes on success/failure

Projects scale based on active team count.

---

## National Indices (4 total)

1. **Kinh tế** (Economy) - Starting: 50
2. **An sinh** (Welfare) - Starting: 50
3. **Môi trường** (Environment) - Starting: 50
4. **Hội nhập** (Integration) - Starting: 50

Indices range from 0-100. Hitting 0 ends the game.

---

## Routing Structure

```
/                    → Mode selection (offline/online)
/region              → Offline region selection
/online              → Online role selection (host/player/spectator)
/lobby               → Online lobby (team management)
/play                → Game screen (all modes, all roles)
/spectator           → Spectator lobby (legacy, uses OnlineLobby)
```

### Query Parameters

- `mode`: `online` | `offline`
- `role`: `host` | `player` | `spectator`

---

## Technical Architecture

### State Management

- **GameFacade**: Unified API for all game operations
- **OfflineMode**: Local state management with SolidJS stores
- **OnlineMode**: Firebase Realtime Database synchronization
- **GameProvider**: React context for component access

### Data Flow

```
Firebase RTDB ←→ OnlineMode ←→ GameFacade ←→ GameProvider ←→ Components
                OfflineStore ←→ OfflineMode ←─┘
```

### Key Files

- `lib/core/GameFacade.ts` - Unified game API
- `lib/core/OnlineMode.ts` - Firebase sync
- `lib/core/OfflineMode.ts` - Local state
- `lib/game/context.tsx` - SolidJS context provider
- `config/events.ts` - Turn events and projects
- `config/board.ts` - Board layout configuration

---

## Firebase Schema

```
/game
  /status: 'lobby' | 'playing' | 'paused' | 'finished'
  /hostId: string
  /currentTurn: number
  /currentPhase: 'event' | 'action' | 'resolution' | 'result'
  /phaseEndTime: timestamp
  /teams/{regionId}
    /ownerId: string | 'bot' | null
    /connected: boolean
    /isAI: boolean
    /points: number
    /placements: Record<cellId, number>
    /submitted: boolean
  /nationalIndices: Record<indexId, number>
  /currentEvent: TurnEvent
  /project: { totalRP, teamCount, success }
  /lastTurnResult: TurnResult
  /gameOver: { reason, winners } | null
```
