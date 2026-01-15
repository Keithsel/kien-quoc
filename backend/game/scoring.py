"""Scoring calculations."""

from backend.config.scoring_config import CellType, scoring_config
from backend.game.schemas import BoardCell, CellPlacement


class ScoringService:
    """Calculate scores for cells and projects."""

    @staticmethod
    def calculate_cell_scores(cell: BoardCell) -> dict[str, float]:
        """Calculate scores for a single cell."""
        placements = [p for p in cell.placements if p.amount > 0]

        if not placements:
            return {}

        multiplier = scoring_config.CELL_MULTIPLIERS.get(cell.type, 1.0)

        if cell.type == CellType.COMPETITIVE:
            return ScoringService._score_competitive(placements, multiplier)
        elif cell.type == CellType.SYNERGY:
            return ScoringService._score_synergy(placements, multiplier)
        elif cell.type == CellType.SHARED:
            return ScoringService._score_shared(placements, multiplier)
        elif cell.type == CellType.COOPERATION:
            return ScoringService._score_cooperation(placements, multiplier)

        return {}

    @staticmethod
    def _score_competitive(placements: list[CellPlacement], multiplier: float) -> dict[str, float]:
        """Winner takes all (split if tie)."""
        scores = {}
        max_amount = max(p.amount for p in placements)
        winners = [p for p in placements if p.amount == max_amount]
        total_pool = max_amount * multiplier
        prize_per_winner = total_pool / len(winners)

        for p in placements:
            scores[p.team_id] = prize_per_winner if p.amount == max_amount else 0

        return scores

    @staticmethod
    def _score_synergy(placements: list[CellPlacement], multiplier: float) -> dict[str, float]:
        """Everyone gets multiplied score."""
        scores = {}
        for p in placements:
            scores[p.team_id] = p.amount * multiplier
        return scores

    @staticmethod
    def _score_shared(placements: list[CellPlacement], multiplier: float) -> dict[str, float]:
        """Split proportionally."""
        scores = {}
        total = sum(p.amount for p in placements)
        total_pool = total * multiplier

        for p in placements:
            scores[p.team_id] = (p.amount / total) * total_pool if total > 0 else 0

        return scores

    @staticmethod
    def _score_cooperation(placements: list[CellPlacement], multiplier: float) -> dict[str, float]:
        """Only score if >= min teams participate."""
        scores = {}
        min_teams = scoring_config.COOPERATION_MIN_TEAMS

        if len(placements) < min_teams:
            for p in placements:
                scores[p.team_id] = 0
        else:
            for p in placements:
                scores[p.team_id] = p.amount * multiplier

        return scores

    @staticmethod
    def calculate_project_result(
        contributions: list[dict],  # [{team_id, amount}]
        min_total: int,
        min_teams: int,
    ) -> dict:
        """Calculate project success and scores."""
        total = sum(c['amount'] for c in contributions)
        num_teams = len([c for c in contributions if c['amount'] > 0])

        success = total >= min_total and num_teams >= min_teams

        team_scores = {}
        bonus_per_rp = scoring_config.PROJECT_SUCCESS_BONUS_PER_RP

        if success:
            for c in contributions:
                team_scores[c['team_id']] = c['amount'] * bonus_per_rp
        else:
            for c in contributions:
                team_scores[c['team_id']] = 0

        return {
            'success': success,
            'total_contributed': total,
            'teams_contributed': num_teams,
            'team_scores': team_scores,
        }
