"""Game engine service."""

from datetime import datetime

from backend.config.board_config import (
    BOARD_CELLS,
    PROJECT_CELL_ID,
    PROJECT_CELLS,
    create_cell_id,
)
from backend.config.events_config import get_event_by_turn
from backend.config.game_config import game_config
from backend.game.schemas import (
    BoardCell,
    CellPlacement,
    GameOverResult,
    GameState,
    NationalIndices,
    ProjectStatus,
    TurnResult,
)
from backend.game.scoring import ScoringService
from backend.room.schemas import GamePhase, Placement, Room, RoomStatus


class GameService:
    """Game engine logic."""

    @staticmethod
    def start_game(room: Room) -> None:
        """Initialize game state."""
        connected_count = sum(1 for t in room.teams if t.is_connected)
        if connected_count < 3:
            raise ValueError('Need at least 3 connected teams to start')

        if room.status != RoomStatus.WAITING:
            raise ValueError('Game already started')

        # Create board
        board = []
        for pos, cell_config in BOARD_CELLS.items():
            if pos not in PROJECT_CELLS:
                board.append(
                    BoardCell(
                        id=create_cell_id(pos),
                        position=pos,
                        type=cell_config.type,
                        name=cell_config.name,
                        indices=cell_config.indices,
                        placements=[],
                    )
                )

        # Get first event
        first_event = get_event_by_turn(1)

        # Initialize game state
        room.game_state = GameState(
            current_turn=1,
            current_phase=GamePhase.EVENT,
            phase_start_time=datetime.now(),
            phase_time_limit=game_config.PHASE_EVENT_DURATION,
            national_indices=NationalIndices(**game_config.STARTING_INDICES),
            current_event=first_event,
            project_status=ProjectStatus(
                min_total=first_event.min_total,
                min_teams=first_event.min_teams,
            )
            if first_event
            else None,
            board=board,
        )

        room.status = RoomStatus.PLAYING

        # Reset teams
        for team in room.teams:
            team.resources = game_config.RESOURCES_PER_TURN
            team.placements = []
            team.has_submitted = False

    @staticmethod
    def place_resource(room: Room, team_id: str, cell_id: str, amount: int) -> None:
        """Place resources on a cell."""
        if not room.game_state:
            raise ValueError('Game not started')

        if room.game_state.current_phase != GamePhase.ACTION:
            raise ValueError('Can only place during action phase')

        team = next((t for t in room.teams if t.id == team_id), None)
        if not team:
            raise ValueError('Team not found')

        if team.has_submitted:
            raise ValueError('Already submitted')

        # Find current placement
        current_placement = next((p for p in team.placements if p.cell_id == cell_id), None)
        current_amount = current_placement.amount if current_placement else 0

        # Calculate change
        change = amount - current_amount

        if change > team.resources:
            raise ValueError('Not enough resources')

        if amount < 0:
            raise ValueError('Amount cannot be negative')

        # Update team resources and placements
        team.resources -= change

        if current_placement:
            if amount == 0:
                team.placements.remove(current_placement)
            else:
                current_placement.amount = amount
        elif amount > 0:
            team.placements.append(Placement(cell_id=cell_id, amount=amount))

        # Sync to board
        GameService._sync_placements_to_board(room)

    @staticmethod
    def _sync_placements_to_board(room: Room) -> None:
        """Sync team placements to board state."""
        if not room.game_state:
            return

        # Clear all cell placements
        for cell in room.game_state.board:
            cell.placements = []

        # Reset project status
        if room.game_state.project_status:
            room.game_state.project_status.total_contributed = 0
            room.game_state.project_status.contributing_teams = []

        # Add placements from teams
        for team in room.teams:
            for placement in team.placements:
                if placement.cell_id == PROJECT_CELL_ID:
                    # Project contribution
                    if room.game_state.project_status:
                        room.game_state.project_status.total_contributed += placement.amount
                        room.game_state.project_status.contributing_teams.append({
                            'team_id': team.id,
                            'amount': placement.amount,
                        })
                else:
                    # Regular cell
                    cell = next(
                        (c for c in room.game_state.board if c.id == placement.cell_id),
                        None,
                    )
                    if cell:
                        cell.placements.append(
                            CellPlacement(
                                team_id=team.id,
                                amount=placement.amount,
                            )
                        )

    @staticmethod
    def submit_turn(room: Room, team_id: str) -> None:
        """Mark team as submitted."""
        team = next((t for t in room.teams if t.id == team_id), None)
        if not team:
            raise ValueError('Team not found')

        team.has_submitted = True

    @staticmethod
    def all_teams_submitted(room: Room) -> bool:
        """Check if all connected teams have submitted."""
        return all(t.has_submitted for t in room.teams if t.is_connected)

    @staticmethod
    def advance_phase(room: Room) -> tuple[GamePhase, TurnResult | None]:
        """Advance to next phase, return new phase and optional result."""
        if not room.game_state:
            raise ValueError('Game not started')

        gs = room.game_state
        result = None

        if gs.current_phase == GamePhase.EVENT:
            gs.current_phase = GamePhase.ACTION
            gs.phase_time_limit = game_config.PHASE_ACTION_DURATION

        elif gs.current_phase == GamePhase.ACTION:
            gs.current_phase = GamePhase.RESOLUTION
            gs.phase_time_limit = game_config.PHASE_RESOLUTION_DURATION
            # Auto-submit for all
            for team in room.teams:
                team.has_submitted = True
            # Process scores
            result = GameService._process_turn(room)

        elif gs.current_phase == GamePhase.RESOLUTION:
            gs.current_phase = GamePhase.RESULT
            gs.phase_time_limit = game_config.PHASE_RESULT_DURATION

        elif gs.current_phase == GamePhase.RESULT:
            # Apply maintenance cost
            for key, cost in game_config.MAINTENANCE_COST.items():
                gs.national_indices.apply_changes({key: -cost})

            # Check game over
            if gs.national_indices.is_any_zero():
                room.status = RoomStatus.FINISHED
                return gs.current_phase, result

            # Check max turns
            if gs.current_turn >= game_config.MAX_TURNS:
                room.status = RoomStatus.FINISHED
                return gs.current_phase, result

            # Next turn
            gs.current_turn += 1
            gs.current_phase = GamePhase.EVENT
            gs.phase_time_limit = game_config.PHASE_EVENT_DURATION

            # Setup next event
            next_event = get_event_by_turn(gs.current_turn)
            gs.current_event = next_event
            gs.project_status = (
                ProjectStatus(
                    min_total=next_event.min_total,
                    min_teams=next_event.min_teams,
                )
                if next_event
                else None
            )

            # Reset teams
            for team in room.teams:
                team.resources = game_config.RESOURCES_PER_TURN
                team.placements = []
                team.has_submitted = False

            # Reset board
            for cell in gs.board:
                cell.placements = []

        gs.phase_start_time = datetime.now()
        gs.is_paused = False

        return gs.current_phase, result

    @staticmethod
    def _process_turn(room: Room) -> TurnResult:
        """Process all scores for current turn."""
        gs = room.game_state
        if not gs:
            raise ValueError('Game not started')

        cell_results = []
        team_turn_scores: dict[str, float] = {t.id: 0 for t in room.teams}

        # Score each cell
        for cell in gs.board:
            scores = ScoringService.calculate_cell_scores(cell)
            cell_results.append({
                'cell_id': cell.id,
                'team_scores': [{'team_id': k, 'points': v} for k, v in scores.items()],
            })
            for team_id, points in scores.items():
                team_turn_scores[team_id] += points

        # Process project
        project_contributions = []
        project_success = False
        index_changes = {}

        if gs.project_status and gs.current_event:
            project_result = ScoringService.calculate_project_result(
                gs.project_status.contributing_teams,
                gs.project_status.min_total,
                gs.project_status.min_teams,
            )

            project_success = project_result['success']
            gs.project_status.status = 'success' if project_success else 'failure'

            # Add project scores
            for team_id, points in project_result['team_scores'].items():
                team_turn_scores[team_id] += points

            # Project contributions
            for contrib in gs.project_status.contributing_teams:
                project_contributions.append({
                    'team_id': contrib['team_id'],
                    'amount': contrib['amount'],
                    'points': project_result['team_scores'].get(contrib['team_id'], 0),
                })

            # Apply index changes
            if project_success:
                reward = gs.current_event.success_reward.copy()
                reward.pop('points', None)
                index_changes = reward
            else:
                index_changes = gs.current_event.failure_penalty.copy()

            gs.national_indices.apply_changes(index_changes, game_config.INDEX_MAXIMUM)

        # Update team total scores
        team_scores = []
        for team in room.teams:
            turn_score = int(team_turn_scores.get(team.id, 0))

            # Add project points bonus if success
            if project_success and gs.current_event:
                bonus_points = gs.current_event.success_reward.get('points', 0)
                if gs.project_status and gs.project_status.contributing_teams:
                    contributed = any(
                        c['team_id'] == team.id and c['amount'] > 0 for c in gs.project_status.contributing_teams
                    )
                    if contributed:
                        turn_score += bonus_points // len([
                            c for c in gs.project_status.contributing_teams if c['amount'] > 0
                        ])

            team.score += turn_score
            team_scores.append({
                'team_id': team.id,
                'turn_score': turn_score,
                'total_score': team.score,
            })

        return TurnResult(
            turn=gs.current_turn,
            project_success=project_success,
            project_contributions=project_contributions,
            cell_results=cell_results,
            index_changes=index_changes,
            new_indices=gs.national_indices,
            team_scores=team_scores,
        )

    @staticmethod
    def get_game_over_result(room: Room) -> GameOverResult:
        """Generate game over result."""
        gs = room.game_state

        reason = 'completed'
        failed_index = None

        if gs and gs.national_indices.is_any_zero():
            reason = 'index_zero'
            failed_index = gs.national_indices.get_zero_index()

        # Sort teams by score
        sorted_teams = sorted(room.teams, key=lambda t: t.score, reverse=True)
        rankings = [
            {
                'rank': i + 1,
                'team_id': t.id,
                'team_name': t.name,
                'region': t.region.name,
                'score': t.score,
            }
            for i, t in enumerate(sorted_teams)
        ]

        return GameOverResult(
            reason=reason,
            failed_index=failed_index,
            final_rankings=rankings,
            total_turns_played=gs.current_turn if gs else 0,
            final_indices=gs.national_indices if gs else NationalIndices(),
        )

    @staticmethod
    def pause_game(room: Room) -> None:
        """Pause the game."""
        if room.game_state:
            room.game_state.is_paused = True
            room.status = RoomStatus.PAUSED

    @staticmethod
    def resume_game(room: Room) -> None:
        """Resume the game."""
        if room.game_state:
            room.game_state.is_paused = False
            room.game_state.phase_start_time = datetime.now()
            room.status = RoomStatus.PLAYING
