#!/usr/bin/env python3
"""Test script to simulate a game session."""

import asyncio
import json

import httpx
import websockets

BASE_URL = 'http://localhost:8000'
WS_URL = 'ws://localhost:8000'
HOST_SECRET = 'kienquoc@FPT2026'


async def main():
    print('=== Kiến Quốc Ký Game Simulation ===\n')

    # 1. Create room
    print('1. Creating room...')
    async with httpx.AsyncClient() as client:
        resp = await client.post(f'{BASE_URL}/api/rooms', json={'host_name': 'Host'})
        room_data = resp.json()
        room_code = room_data['room_code']
        print(f'   Room created: {room_code}')

        # Get teams
        resp = await client.get(f'{BASE_URL}/api/rooms/{room_code}/teams')
        teams_data = resp.json()
        teams = teams_data['teams'][:3]  # Use first 3 teams
        print(f'   Teams: {[t["name"] for t in teams]}')

    # 2. Connect host
    print('\n2. Connecting host...')
    host_ws = await websockets.connect(f'{WS_URL}/ws/{room_code}')
    msg = await host_ws.recv()
    print(f'   {json.loads(msg)["type"]}')

    await host_ws.send(
        json.dumps({
            'type': 'AUTH',
            'role': 'host',
            'token': HOST_SECRET,
        })
    )
    msg = await host_ws.recv()
    print(f'   Host auth: {json.loads(msg)["type"]}')
    await host_ws.recv()  # GAME_STATE

    # 3. Connect 3 teams
    print('\n3. Connecting teams...')
    team_ws_list = []
    for team in teams:
        ws = await websockets.connect(f'{WS_URL}/ws/{room_code}')
        await ws.recv()  # CONNECTED
        await ws.send(
            json.dumps({
                'type': 'AUTH',
                'role': 'player',
                'team_id': team['id'],
                'token': team['session_token'],
            })
        )
        msg = await ws.recv()
        print(f'   {team["name"]}: {json.loads(msg)["type"]}')
        await ws.recv()  # GAME_STATE
        team_ws_list.append((team, ws))

    # 4. Host starts game
    print('\n4. Starting game...')
    await host_ws.send(json.dumps({'type': 'HOST_START'}))
    msg = await host_ws.recv()
    state = json.loads(msg)
    if state['type'] == 'GAME_STATE':
        gs = state['data']['game_state']
        print(f'   Turn {gs["current_turn"]}, Phase: {gs["current_phase"]}')
        print(f'   Event: {gs["current_event"]["name"]}')

    # Drain team messages
    for _, ws in team_ws_list:
        await ws.recv()

    # 5. Host skips to ACTION phase
    print('\n5. Skipping to ACTION phase...')
    await host_ws.send(json.dumps({'type': 'HOST_SKIP'}))
    msg = await host_ws.recv()
    state = json.loads(msg)
    if state['type'] == 'GAME_STATE':
        print(f'   Phase: {state["data"]["game_state"]["current_phase"]}')

    # Drain team messages
    for _, ws in team_ws_list:
        await ws.recv()

    # 6. Teams place resources
    print('\n6. Teams placing resources...')
    cells = ['cell-0-0', 'cell-0-1', 'cell-0-2']
    for i, (team, ws) in enumerate(team_ws_list):
        # Place on a cell
        await ws.send(
            json.dumps({
                'type': 'PLACE_RESOURCE',
                'cell_id': cells[i],
                'amount': 5,
            })
        )
        await asyncio.sleep(0.1)
        # Place on project
        await ws.send(
            json.dumps({
                'type': 'PLACE_RESOURCE',
                'cell_id': 'project-center',
                'amount': 7,
            })
        )
        print(f'   {team["name"]}: 5 on {cells[i]}, 7 on project')

    # Drain messages
    await asyncio.sleep(0.5)
    for _, ws in team_ws_list:
        try:
            while True:
                await asyncio.wait_for(ws.recv(), timeout=0.1)
        except asyncio.TimeoutError:
            pass

    # 7. Teams submit
    print('\n7. Teams submitting turns...')
    for team, ws in team_ws_list:
        await ws.send(json.dumps({'type': 'SUBMIT_TURN'}))
        print(f'   {team["name"]} submitted')

    # Wait for TURN_RESULT
    print('\n8. Waiting for turn result...')
    await asyncio.sleep(1)
    try:
        while True:
            msg = await asyncio.wait_for(host_ws.recv(), timeout=2)
            data = json.loads(msg)
            if data['type'] == 'TURN_RESULT':
                result = data['data']
                print(f'   Project success: {result["project_success"]}')
                print(f'   Team scores: {[(s["team_id"][:8], s["turn_score"]) for s in result["team_scores"]]}')
                break
            elif data['type'] == 'GAME_STATE':
                gs = data['data']['game_state']
                print(f'   Phase: {gs["current_phase"]}')
    except asyncio.TimeoutError:
        print('   Timeout waiting for result')

    # 9. Cleanup
    print('\n9. Ending game...')
    await host_ws.send(json.dumps({'type': 'HOST_END'}))
    try:
        msg = await asyncio.wait_for(host_ws.recv(), timeout=1)
        data = json.loads(msg)
        if data['type'] == 'GAME_OVER':
            print('   Game ended!')
            rankings = data['data']['final_rankings']
            for r in rankings[:3]:
                print(f'   #{r["rank"]} {r["team_name"]}: {r["score"]} pts')
    except asyncio.TimeoutError:
        pass

    # Close connections
    await host_ws.close()
    for _, ws in team_ws_list:
        await ws.close()

    print('\n=== Simulation Complete ===')


if __name__ == '__main__':
    asyncio.run(main())
