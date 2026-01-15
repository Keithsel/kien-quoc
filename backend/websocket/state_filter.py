"""State filtering by role."""

from backend.room.schemas import ClientRole
from backend.websocket.manager import ConnectionInfo


def filter_game_state(message: dict, conn_info: ConnectionInfo) -> dict:
    """Filter game state based on client role."""

    if message.get('type') != 'GAME_STATE':
        return message

    if conn_info.role == ClientRole.HOST:
        # Host sees everything
        return message

    data = message.get('data', {})
    filtered_data = data.copy()

    if 'teams' in filtered_data:
        filtered_teams = []

        for team in filtered_data['teams']:
            filtered_team = team.copy()

            # Remove sensitive data
            filtered_team.pop('session_token', None)

            if conn_info.role == ClientRole.SPECTATOR:
                # Spectators can't see individual placements or resources
                filtered_team['placements'] = []
                filtered_team['resources'] = None

            elif conn_info.role == ClientRole.PLAYER:
                # Players can only see their own placements
                if team.get('id') != conn_info.team_id:
                    filtered_team['placements'] = []
                    filtered_team['resources'] = None

            filtered_teams.append(filtered_team)

        filtered_data['teams'] = filtered_teams

    # Remove host token
    filtered_data.pop('host_token', None)

    return {'type': 'GAME_STATE', 'data': filtered_data}
