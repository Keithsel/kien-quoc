"""
KIẾN QUỐC KÝ - Monte Carlo Simulation
=====================================
Chạy: python main.py
Yêu cầu: pip install numpy scipy matplotlib pandas tqdm
"""

import random
import copy
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set
from collections import defaultdict
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
import pandas as pd
from tqdm import tqdm

# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================


class Team(Enum):
    A = "Thủ đô"
    B = "Duyên hải"
    C = "Cao nguyên"
    D = "Đồng bằng"
    E = "Đô thị mới"


class CellType(Enum):
    COMPETITIVE = "competitive"  # Cạnh tranh
    SYNERGY = "synergy"  # Cộng hưởng
    SHARED = "shared"  # Chia sẻ
    COOPERATION = "cooperation"  # Hợp tác 2+
    PROJECT = "project"  # Trung tâm


class TreatyType(Enum):
    COOPERATE = "cooperate"  # 🤝 Hợp tác
    CHALLENGE = "challenge"  # ⚔️ Thách thức
    SHARE = "share"  # 🎁 Chia sẻ
    ALLIANCE = "alliance"  # 🏛️ Liên minh


class Strategy(Enum):
    RANDOM = "random"
    AGGRESSIVE = "aggressive"
    COOPERATIVE = "cooperative"
    BALANCED = "balanced"
    SAFE = "safe"
    ADAPTIVE = "adaptive"
    PROJECT_FOCUSED = "project_focused"


# Nguồn lực khởi đầu mỗi đội
STARTING_RESOURCES = {
    Team.A: {"capital": 3, "labor": 2, "knowledge": 3},  # Tổng 8
    Team.B: {"capital": 4, "labor": 3, "knowledge": 1},  # Tổng 8
    Team.C: {"capital": 2, "labor": 4, "knowledge": 2},  # Tổng 8
    Team.D: {"capital": 2, "labor": 5, "knowledge": 1},  # Tổng 8
    Team.E: {"capital": 3, "labor": 1, "knowledge": 4},  # Tổng 8
}

# Nguồn lực nhận mỗi lượt
RESOURCES_PER_TURN = 6

# Chỉ số quốc gia khởi đầu
STARTING_INDICES = {
    "economy": 25,
    "society": 25,
    "culture": 20,
    "integration": 15,
    "environment": 20,
    "science": 15,
}

# Bản đồ: cell_id -> CellType
BOARD_CELLS = {
    "industry_1": CellType.COMPETITIVE,
    "industry_2": CellType.COMPETITIVE,
    "infrastructure_1": CellType.SYNERGY,
    "infrastructure_2": CellType.SYNERGY,
    "culture_1": CellType.SHARED,
    "culture_2": CellType.SHARED,
    "diplomacy_1": CellType.COOPERATION,
    "diplomacy_2": CellType.COOPERATION,
    "society_1": CellType.SYNERGY,
    "society_2": CellType.SYNERGY,
    "education_1": CellType.SHARED,
    "education_2": CellType.SHARED,
    "science": CellType.COMPETITIVE,
    "environment": CellType.SYNERGY,
    "center": CellType.PROJECT,
}

# Cell -> Chỉ số quốc gia ảnh hưởng
CELL_INDEX_MAPPING = {
    "industry_1": ["economy"],
    "industry_2": ["economy"],
    "infrastructure_1": ["economy", "society"],
    "infrastructure_2": ["economy", "society"],
    "culture_1": ["culture"],
    "culture_2": ["culture"],
    "diplomacy_1": ["integration"],
    "diplomacy_2": ["integration"],
    "society_1": ["society"],
    "society_2": ["society"],
    "education_1": ["society", "science"],
    "education_2": ["society", "science"],
    "science": ["science", "economy"],
    "environment": ["environment"],
    "center": [],
}

# Yêu cầu Dự án Trung tâm
PROJECT_REQUIREMENTS = {
    1: {"min_total": 12, "min_teams": 3, "special": None},
    2: {"min_total": 15, "min_teams": 1, "special": "need_knowledge_3"},
    3: {"min_total": 0, "min_teams": 4, "special": None},
    4: {"min_total": 10, "min_teams": 1, "special": "need_all_types"},
    5: {"min_total": 0, "min_teams": 1, "special": "need_knowledge_8"},
    6: {"min_total": 20, "min_teams": 5, "special": None},
}

# Thưởng Dự án
PROJECT_REWARDS = {
    1: {"points_per_team": 8, "index_change": {"society": 10}},
    2: {"points_per_team": 10, "index_change": {"economy": 8}},
    3: {"points_per_team": 6, "index_change": {"integration": 12}},
    4: {"points_per_team": 8, "index_change": {"culture": 10}},
    5: {"points_per_team": 12, "index_change": {"science": 10}},
    6: {"points_per_team": 0, "final_multiplier": 1.5},
}

# Phạt Dự án
PROJECT_PENALTIES = {
    1: {"index_change": {"society": -5}},
    2: {"index_change": {"economy": -5}},
    3: {"index_change": {"integration": -8}},
    4: {"index_change": {"culture": -5}},
    5: {"index_change": {"science": -8}},
    6: {"final_multiplier": 0.7},
}

# =============================================================================
# DATA CLASSES
# =============================================================================


@dataclass
class Resources:
    capital: int = 0
    labor: int = 0
    knowledge: int = 0

    def total(self) -> int:
        return self.capital + self.labor + self.knowledge

    def to_dict(self) -> Dict[str, int]:
        return {"capital": self.capital, "labor": self.labor, "knowledge": self.knowledge}

    def has_all_types(self) -> bool:
        return self.capital > 0 and self.labor > 0 and self.knowledge > 0

    @classmethod
    def from_dict(cls, d: Dict[str, int]) -> "Resources":
        return cls(capital=d.get("capital", 0), labor=d.get("labor", 0), knowledge=d.get("knowledge", 0))


@dataclass
class CellPlacement:
    cell_id: str
    resources: Resources


@dataclass
class Treaty:
    treaty_type: TreatyType
    sender: Team
    target: Team


@dataclass
class TreatyResult:
    treaty: Treaty
    accepted: bool
    score_changes: Dict[Team, int] = field(default_factory=dict)


@dataclass
class CellResult:
    cell_id: str
    placements: Dict[Team, int]  # Team -> total resources placed
    scores: Dict[Team, int]  # Team -> points earned
    success: bool = True  # For cooperation cells


@dataclass
class ProjectResult:
    turn: int
    success: bool
    contributions: Dict[Team, Dict]  # Team -> {total, knowledge, types}
    scores: Dict[Team, int]
    index_changes: Dict[str, int]
    final_multiplier: float = 1.0


@dataclass
class TurnDecision:
    placements: List[CellPlacement]
    treaty: Optional[Treaty] = None


@dataclass
class TurnResult:
    turn: int
    decisions: Dict[Team, TurnDecision]
    cell_results: Dict[str, CellResult]
    project_result: Optional[ProjectResult]
    treaty_results: List[TreatyResult]
    scores_this_turn: Dict[Team, int]
    national_indices: Dict[str, int]


@dataclass
class GameResult:
    winner: Optional[Team]
    reason: str  # "completed" or "national_index_zero"
    final_scores: Dict[Team, int]
    turn_ended: int
    history: List[TurnResult]
    failed_index: Optional[str] = None


# =============================================================================
# AGENTS
# =============================================================================


class BaseAgent:
    def __init__(self, team: Team, strategy: Strategy):
        self.team = team
        self.strategy = strategy
        self.treaties_remaining = {
            TreatyType.COOPERATE: 1,
            TreatyType.CHALLENGE: 1,
            TreatyType.SHARE: 1,
            TreatyType.ALLIANCE: 1,
        }

    def allocate_new_resources(self) -> Resources:
        """Phân bổ 6 nguồn lực mới vào 3 loại"""
        total = RESOURCES_PER_TURN
        capital = random.randint(0, total)
        labor = random.randint(0, total - capital)
        knowledge = total - capital - labor
        return Resources(capital=capital, labor=labor, knowledge=knowledge)

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        raise NotImplementedError

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        raise NotImplementedError

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        raise NotImplementedError

    def use_treaty(self, treaty_type: TreatyType):
        if self.treaties_remaining.get(treaty_type, 0) > 0:
            self.treaties_remaining[treaty_type] -= 1

    def has_treaty(self, treaty_type: TreatyType) -> bool:
        return self.treaties_remaining.get(treaty_type, 0) > 0

    def _distribute_resources_to_cells(
        self, resources: Resources, cell_weights: Dict[str, float]
    ) -> List[CellPlacement]:
        """Helper: Phân phối nguồn lực vào các ô theo trọng số"""
        placements = []
        total_weight = sum(cell_weights.values())
        if total_weight == 0:
            return placements

        total_resources = resources.total()
        resource_list = (
            ["capital"] * resources.capital + ["labor"] * resources.labor + ["knowledge"] * resources.knowledge
        )
        random.shuffle(resource_list)

        # Phân phối theo trọng số
        cells = list(cell_weights.keys())
        weights = [cell_weights[c] / total_weight for c in cells]

        cell_resources = {c: Resources() for c in cells}

        for res_type in resource_list:
            chosen_cell = random.choices(cells, weights=weights)[0]
            if res_type == "capital":
                cell_resources[chosen_cell].capital += 1
            elif res_type == "labor":
                cell_resources[chosen_cell].labor += 1
            else:
                cell_resources[chosen_cell].knowledge += 1

        for cell_id, res in cell_resources.items():
            if res.total() > 0:
                placements.append(CellPlacement(cell_id=cell_id, resources=res))

        return placements


class RandomAgent(BaseAgent):
    """Đặt nguồn lực hoàn toàn ngẫu nhiên"""

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        cells = list(BOARD_CELLS.keys())
        weights = {c: 1.0 for c in cells}
        return self._distribute_resources_to_cells(resources, weights)

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        if random.random() < 0.3:
            available_treaties = [t for t in TreatyType if self.has_treaty(t)]
            if available_treaties and other_teams:
                treaty_type = random.choice(available_treaties)
                target = random.choice(other_teams)
                self.use_treaty(treaty_type)
                return Treaty(treaty_type=treaty_type, sender=self.team, target=target)
        return None

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        return random.random() < 0.5


class AggressiveAgent(BaseAgent):
    """Tập trung vào ô Cạnh tranh"""

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        competitive_cells = [c for c, t in BOARD_CELLS.items() if t == CellType.COMPETITIVE]
        other_cells = [c for c, t in BOARD_CELLS.items() if t != CellType.COMPETITIVE]

        weights = {}
        for c in competitive_cells:
            weights[c] = 3.0  # Ưu tiên cao
        for c in other_cells:
            weights[c] = 0.5
        weights["center"] = 1.0  # Vẫn tham gia Dự án

        return self._distribute_resources_to_cells(resources, weights)

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        # Ưu tiên Thách thức
        if self.has_treaty(TreatyType.CHALLENGE) and other_teams and random.random() < 0.5:
            target = random.choice(other_teams)
            self.use_treaty(TreatyType.CHALLENGE)
            return Treaty(treaty_type=TreatyType.CHALLENGE, sender=self.team, target=target)
        return None

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        if treaty.treaty_type == TreatyType.CHALLENGE:
            return True  # Luôn nhận thách thức
        return random.random() < 0.3


class CooperativeAgent(BaseAgent):
    """Tập trung vào ô Cộng hưởng và Hợp tác"""

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        weights = {}
        for cell_id, cell_type in BOARD_CELLS.items():
            if cell_type == CellType.SYNERGY:
                weights[cell_id] = 3.0
            elif cell_type == CellType.COOPERATION:
                weights[cell_id] = 2.5
            elif cell_type == CellType.PROJECT:
                weights[cell_id] = 2.0
            elif cell_type == CellType.SHARED:
                weights[cell_id] = 1.5
            else:
                weights[cell_id] = 0.5

        return self._distribute_resources_to_cells(resources, weights)

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        # Ưu tiên Hợp tác và Liên minh
        if random.random() < 0.6 and other_teams:
            preferred = [TreatyType.COOPERATE, TreatyType.ALLIANCE, TreatyType.SHARE]
            available = [t for t in preferred if self.has_treaty(t)]
            if available:
                treaty_type = random.choice(available)
                target = random.choice(other_teams)
                self.use_treaty(treaty_type)
                return Treaty(treaty_type=treaty_type, sender=self.team, target=target)
        return None

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        if treaty.treaty_type in [TreatyType.COOPERATE, TreatyType.ALLIANCE, TreatyType.SHARE]:
            return True
        if treaty.treaty_type == TreatyType.CHALLENGE:
            return False
        return random.random() < 0.5


class BalancedAgent(BaseAgent):
    """Phân bổ đều, theo dõi chỉ số quốc gia"""

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        weights = {}

        # Tìm chỉ số thấp
        low_indices = [name for name, value in game_state.national_indices.items() if value < 15]

        for cell_id, cell_type in BOARD_CELLS.items():
            base_weight = 1.0

            # Tăng trọng số cho ô giúp chỉ số thấp
            affected_indices = CELL_INDEX_MAPPING.get(cell_id, [])
            for idx in affected_indices:
                if idx in low_indices:
                    base_weight += 1.5

            # Luôn tham gia Dự án
            if cell_type == CellType.PROJECT:
                base_weight = 2.0

            weights[cell_id] = base_weight

        return self._distribute_resources_to_cells(resources, weights)

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        if random.random() < 0.4 and other_teams:
            available = [t for t in TreatyType if self.has_treaty(t)]
            if available:
                treaty_type = random.choice(available)
                target = random.choice(other_teams)
                self.use_treaty(treaty_type)
                return Treaty(treaty_type=treaty_type, sender=self.team, target=target)
        return None

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        if treaty.treaty_type == TreatyType.CHALLENGE:
            return random.random() < 0.3
        return random.random() < 0.6


class SafeAgent(BaseAgent):
    """Tránh rủi ro, ưu tiên ô Chia sẻ"""

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        weights = {}
        for cell_id, cell_type in BOARD_CELLS.items():
            if cell_type == CellType.SHARED:
                weights[cell_id] = 3.0
            elif cell_type == CellType.SYNERGY:
                weights[cell_id] = 2.0
            elif cell_type == CellType.PROJECT:
                weights[cell_id] = 1.5
            elif cell_type == CellType.COMPETITIVE:
                weights[cell_id] = 0.3
            else:
                weights[cell_id] = 0.5

        return self._distribute_resources_to_cells(resources, weights)

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        # Chỉ gửi Share
        if self.has_treaty(TreatyType.SHARE) and random.random() < 0.3 and other_teams:
            target = random.choice(other_teams)
            self.use_treaty(TreatyType.SHARE)
            return Treaty(treaty_type=TreatyType.SHARE, sender=self.team, target=target)
        return None

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        if treaty.treaty_type == TreatyType.CHALLENGE:
            return False
        if treaty.treaty_type == TreatyType.SHARE:
            return True
        return random.random() < 0.4


class AdaptiveAgent(BaseAgent):
    """Thay đổi chiến thuật dựa trên tình huống"""

    def __init__(self, team: Team, strategy: Strategy = Strategy.ADAPTIVE):
        super().__init__(team, strategy)
        self.current_mode = "balanced"

    def _update_mode(self, game_state: "GameState"):
        my_score = game_state.scores.get(self.team, 0)
        all_scores = list(game_state.scores.values())
        if not all_scores:
            return

        avg_score = sum(all_scores) / len(all_scores)
        max_score = max(all_scores)

        # Kiểm tra chỉ số nguy hiểm
        danger = any(v < 10 for v in game_state.national_indices.values())

        turns_left = 6 - game_state.turn

        if danger:
            self.current_mode = "cooperative"
        elif my_score < avg_score * 0.8 and turns_left <= 2:
            self.current_mode = "aggressive"
        elif my_score >= max_score * 0.95 and turns_left <= 2:
            self.current_mode = "safe"
        else:
            self.current_mode = "balanced"

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        self._update_mode(game_state)

        if self.current_mode == "aggressive":
            return AggressiveAgent(self.team, Strategy.AGGRESSIVE).decide_placements(resources, game_state)
        elif self.current_mode == "cooperative":
            return CooperativeAgent(self.team, Strategy.COOPERATIVE).decide_placements(resources, game_state)
        elif self.current_mode == "safe":
            return SafeAgent(self.team, Strategy.SAFE).decide_placements(resources, game_state)
        else:
            return BalancedAgent(self.team, Strategy.BALANCED).decide_placements(resources, game_state)

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        self._update_mode(game_state)

        if self.current_mode == "aggressive":
            return AggressiveAgent(self.team, Strategy.AGGRESSIVE).decide_treaty(game_state, other_teams)
        elif self.current_mode == "cooperative":
            return CooperativeAgent(self.team, Strategy.COOPERATIVE).decide_treaty(game_state, other_teams)
        else:
            return BalancedAgent(self.team, Strategy.BALANCED).decide_treaty(game_state, other_teams)

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        if self.current_mode == "aggressive":
            return AggressiveAgent(self.team, Strategy.AGGRESSIVE).respond_treaty(treaty, game_state)
        elif self.current_mode == "cooperative":
            return CooperativeAgent(self.team, Strategy.COOPERATIVE).respond_treaty(treaty, game_state)
        elif self.current_mode == "safe":
            return SafeAgent(self.team, Strategy.SAFE).respond_treaty(treaty, game_state)
        else:
            return BalancedAgent(self.team, Strategy.BALANCED).respond_treaty(treaty, game_state)


class ProjectFocusedAgent(BaseAgent):
    """Ưu tiên Dự án Trung tâm"""

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        weights = {}
        for cell_id, cell_type in BOARD_CELLS.items():
            if cell_type == CellType.PROJECT:
                weights[cell_id] = 5.0  # Rất ưu tiên
            elif cell_type == CellType.SYNERGY:
                weights[cell_id] = 1.5
            else:
                weights[cell_id] = 1.0

        return self._distribute_resources_to_cells(resources, weights)

    def decide_treaty(self, game_state: "GameState", other_teams: List[Team]) -> Optional[Treaty]:
        # Ưu tiên Liên minh cho Dự án
        if self.has_treaty(TreatyType.ALLIANCE) and random.random() < 0.5 and other_teams:
            target = random.choice(other_teams)
            self.use_treaty(TreatyType.ALLIANCE)
            return Treaty(treaty_type=TreatyType.ALLIANCE, sender=self.team, target=target)
        return None

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        if treaty.treaty_type == TreatyType.ALLIANCE:
            return True
        return random.random() < 0.5


def create_agent(team: Team, strategy: Strategy) -> BaseAgent:
    """Factory function tạo agent"""
    if strategy == Strategy.RANDOM:
        return RandomAgent(team, strategy)
    elif strategy == Strategy.AGGRESSIVE:
        return AggressiveAgent(team, strategy)
    elif strategy == Strategy.COOPERATIVE:
        return CooperativeAgent(team, strategy)
    elif strategy == Strategy.BALANCED:
        return BalancedAgent(team, strategy)
    elif strategy == Strategy.SAFE:
        return SafeAgent(team, strategy)
    elif strategy == Strategy.ADAPTIVE:
        return AdaptiveAgent(team, strategy)
    elif strategy == Strategy.PROJECT_FOCUSED:
        return ProjectFocusedAgent(team, strategy)
    else:
        return RandomAgent(team, strategy)


# =============================================================================
# GAME STATE
# =============================================================================


@dataclass
class GameState:
    turn: int = 0
    scores: Dict[Team, int] = field(default_factory=lambda: {t: 0 for t in Team})
    national_indices: Dict[str, int] = field(default_factory=lambda: copy.deepcopy(STARTING_INDICES))
    history: List[TurnResult] = field(default_factory=list)
    alliances_this_turn: List[Tuple[Team, Team]] = field(default_factory=list)
    final_multiplier: float = 1.0


# =============================================================================
# GAME SIMULATOR
# =============================================================================


class GameSimulator:
    def __init__(self, agent_config: Dict[Strategy, int]):
        """
        agent_config: {Strategy.RANDOM: 2, Strategy.AGGRESSIVE: 1, ...}
        Tổng phải = 5
        """
        self.agents: Dict[Team, BaseAgent] = {}
        self.game_state = GameState()
        self._create_agents(agent_config)

    def _create_agents(self, agent_config: Dict[Strategy, int]):
        teams = list(Team)
        strategies = []
        for strategy, count in agent_config.items():
            strategies.extend([strategy] * count)

        random.shuffle(strategies)
        random.shuffle(teams)

        for i, team in enumerate(teams):
            strategy = strategies[i] if i < len(strategies) else Strategy.RANDOM
            self.agents[team] = create_agent(team, strategy)

    def run_single_game(self) -> GameResult:
        """Chạy 1 game hoàn chỉnh 6 lượt"""
        self.game_state = GameState()

        for turn in range(1, 7):
            self.game_state.turn = turn

            # Phase 1: Thu thập quyết định
            decisions = {}
            for team, agent in self.agents.items():
                resources = agent.allocate_new_resources()
                placements = agent.decide_placements(resources, self.game_state)

                other_teams = [t for t in Team if t != team]
                treaty = agent.decide_treaty(self.game_state, other_teams)

                decisions[team] = TurnDecision(placements=placements, treaty=treaty)

            # Phase 2: Xử lý Hiệp định
            treaty_results = self._process_treaties(decisions)

            # Phase 3: Tính điểm các ô
            cell_results = self._calculate_cell_scores(decisions)

            # Phase 4: Tính điểm Dự án Trung tâm
            project_result = self._calculate_project(decisions, turn)

            # Phase 5: Cập nhật điểm
            scores_this_turn = self._update_scores(cell_results, project_result, treaty_results)

            # Phase 6: Cập nhật chỉ số quốc gia
            self._update_national_indices(cell_results, project_result)

            # Lưu lịch sử
            turn_result = TurnResult(
                turn=turn,
                decisions=decisions,
                cell_results=cell_results,
                project_result=project_result,
                treaty_results=treaty_results,
                scores_this_turn=scores_this_turn,
                national_indices=copy.deepcopy(self.game_state.national_indices),
            )
            self.game_state.history.append(turn_result)

            # Phase 7: Kiểm tra điều kiện thua
            failed_index = self._check_game_over()
            if failed_index:
                return GameResult(
                    winner=None,
                    reason="national_index_zero",
                    final_scores=copy.deepcopy(self.game_state.scores),
                    turn_ended=turn,
                    history=self.game_state.history,
                    failed_index=failed_index,
                )

        # Game kết thúc bình thường
        final_scores = self._calculate_final_scores()
        winner = max(final_scores, key=final_scores.get)

        return GameResult(
            winner=winner, reason="completed", final_scores=final_scores, turn_ended=6, history=self.game_state.history
        )

    def _process_treaties(self, decisions: Dict[Team, TurnDecision]) -> List[TreatyResult]:
        """Xử lý tất cả Hiệp định"""
        results = []

        for team, decision in decisions.items():
            if decision.treaty:
                treaty = decision.treaty
                target_agent = self.agents[treaty.target]
                accepted = target_agent.respond_treaty(treaty, self.game_state)

                score_changes = {}
                if accepted:
                    score_changes = self._apply_treaty_accepted(treaty, decisions)
                else:
                    score_changes = self._apply_treaty_rejected(treaty)

                results.append(TreatyResult(treaty=treaty, accepted=accepted, score_changes=score_changes))

        return results

    def _apply_treaty_accepted(self, treaty: Treaty, decisions: Dict[Team, TurnDecision]) -> Dict[Team, int]:
        changes = {}

        if treaty.treaty_type == TreatyType.COOPERATE:
            sender_cells = {p.cell_id for p in decisions[treaty.sender].placements}
            target_cells = {p.cell_id for p in decisions[treaty.target].placements}
            if sender_cells & target_cells:
                changes[treaty.sender] = 5
                changes[treaty.target] = 5

        elif treaty.treaty_type == TreatyType.CHALLENGE:
            competitive_cells = [c for c, t in BOARD_CELLS.items() if t == CellType.COMPETITIVE]
            sender_total = sum(
                p.resources.total() for p in decisions[treaty.sender].placements if p.cell_id in competitive_cells
            )
            target_total = sum(
                p.resources.total() for p in decisions[treaty.target].placements if p.cell_id in competitive_cells
            )

            if sender_total > target_total:
                changes[treaty.sender] = sender_total
                changes[treaty.target] = -target_total // 2
            elif target_total > sender_total:
                changes[treaty.target] = target_total
                changes[treaty.sender] = -sender_total // 2

        elif treaty.treaty_type == TreatyType.SHARE:
            changes[treaty.sender] = 4

        elif treaty.treaty_type == TreatyType.ALLIANCE:
            self.game_state.alliances_this_turn.append((treaty.sender, treaty.target))

        return changes

    def _apply_treaty_rejected(self, treaty: Treaty) -> Dict[Team, int]:
        changes = {}

        if treaty.treaty_type == TreatyType.CHALLENGE:
            changes[treaty.target] = -3
        elif treaty.treaty_type == TreatyType.ALLIANCE:
            changes[treaty.sender] = -2

        return changes

    def _calculate_cell_scores(self, decisions: Dict[Team, TurnDecision]) -> Dict[str, CellResult]:
        """Tính điểm cho từng ô"""
        results = {}

        # Thu thập nguồn lực mỗi đội đặt vào mỗi ô
        cell_placements: Dict[str, Dict[Team, int]] = defaultdict(lambda: defaultdict(int))

        for team, decision in decisions.items():
            for placement in decision.placements:
                cell_placements[placement.cell_id][team] += placement.resources.total()

        # Tính điểm theo loại ô
        for cell_id, cell_type in BOARD_CELLS.items():
            placements = dict(cell_placements[cell_id])

            if cell_type == CellType.COMPETITIVE:
                result = self._calc_competitive(cell_id, placements)
            elif cell_type == CellType.SYNERGY:
                result = self._calc_synergy(cell_id, placements)
            elif cell_type == CellType.SHARED:
                result = self._calc_shared(cell_id, placements)
            elif cell_type == CellType.COOPERATION:
                result = self._calc_cooperation(cell_id, placements)
            else:  # PROJECT
                result = CellResult(cell_id=cell_id, placements=placements, scores={})

            results[cell_id] = result

        return results

    def _calc_competitive(self, cell_id: str, placements: Dict[Team, int]) -> CellResult:
        """Ô Cạnh tranh: Chỉ người cao nhất được điểm x2"""
        scores = {}

        if not placements:
            return CellResult(cell_id=cell_id, placements=placements, scores=scores)

        max_value = max(placements.values())
        winners = [t for t, v in placements.items() if v == max_value]
        total_in_cell = sum(placements.values())

        for team in placements:
            if team in winners:
                scores[team] = (total_in_cell * 2) // len(winners)
            else:
                scores[team] = 0

        return CellResult(cell_id=cell_id, placements=placements, scores=scores)

    def _calc_synergy(self, cell_id: str, placements: Dict[Team, int]) -> CellResult:
        """Ô Cộng hưởng: Hệ số tăng theo số đội"""
        scores = {}

        if not placements:
            return CellResult(cell_id=cell_id, placements=placements, scores=scores)

        num_teams = len(placements)
        total = sum(placements.values())
        multiplier = 1.0 + (num_teams - 1) * 0.2
        total_points = int(total * multiplier)

        for team, value in placements.items():
            scores[team] = int((value / total) * total_points) if total > 0 else 0

        return CellResult(cell_id=cell_id, placements=placements, scores=scores)

    def _calc_shared(self, cell_id: str, placements: Dict[Team, int]) -> CellResult:
        """Ô Chia sẻ: Đặt bao nhiêu được bấy nhiêu"""
        scores = {team: value for team, value in placements.items()}
        return CellResult(cell_id=cell_id, placements=placements, scores=scores)

    def _calc_cooperation(self, cell_id: str, placements: Dict[Team, int]) -> CellResult:
        """Ô Hợp tác 2+: Cần ≥2 đội mới có điểm"""
        if len(placements) < 2:
            scores = {t: 0 for t in placements}
            return CellResult(cell_id=cell_id, placements=placements, scores=scores, success=False)

        scores = {team: int(value * 2.5) for team, value in placements.items()}
        return CellResult(cell_id=cell_id, placements=placements, scores=scores, success=True)

    def _calculate_project(self, decisions: Dict[Team, TurnDecision], turn: int) -> ProjectResult:
        """Tính kết quả Dự án Trung tâm"""
        contributions = {}

        for team, decision in decisions.items():
            team_total = 0
            team_knowledge = 0
            team_types: Set[str] = set()

            for placement in decision.placements:
                if BOARD_CELLS.get(placement.cell_id) == CellType.PROJECT:
                    team_total += placement.resources.total()
                    team_knowledge += placement.resources.knowledge
                    if placement.resources.capital > 0:
                        team_types.add("capital")
                    if placement.resources.labor > 0:
                        team_types.add("labor")
                    if placement.resources.knowledge > 0:
                        team_types.add("knowledge")

            if team_total > 0:
                contributions[team] = {"total": team_total, "knowledge": team_knowledge, "types": team_types}

        # Kiểm tra điều kiện
        req = PROJECT_REQUIREMENTS[turn]
        total_all = sum(c["total"] for c in contributions.values())
        num_teams = len(contributions)
        total_knowledge = sum(c["knowledge"] for c in contributions.values())
        all_types: Set[str] = set()
        for c in contributions.values():
            all_types.update(c["types"])

        success = True

        if total_all < req["min_total"]:
            success = False
        if num_teams < req["min_teams"]:
            success = False
        if req["special"] == "need_knowledge_3" and total_knowledge < 3:
            success = False
        if req["special"] == "need_knowledge_8" and total_knowledge < 8:
            success = False
        if req["special"] == "need_all_types" and len(all_types) < 3:
            success = False

        # Tính điểm và thay đổi chỉ số
        if success:
            rewards = PROJECT_REWARDS[turn]
            scores = {team: rewards["points_per_team"] for team in contributions}
            index_changes = rewards.get("index_change", {})
            final_mult = rewards.get("final_multiplier", 1.0)
        else:
            penalties = PROJECT_PENALTIES[turn]
            scores = {}
            index_changes = penalties.get("index_change", {})
            final_mult = penalties.get("final_multiplier", 1.0)

        if final_mult != 1.0:
            self.game_state.final_multiplier = final_mult

        return ProjectResult(
            turn=turn,
            success=success,
            contributions=contributions,
            scores=scores,
            index_changes=index_changes,
            final_multiplier=final_mult,
        )

    def _update_scores(
        self, cell_results: Dict[str, CellResult], project_result: ProjectResult, treaty_results: List[TreatyResult]
    ) -> Dict[Team, int]:
        """Cập nhật điểm"""
        scores_this_turn = {team: 0 for team in Team}

        # Điểm từ ô
        for cell_result in cell_results.values():
            for team, points in cell_result.scores.items():
                scores_this_turn[team] += points

        # Điểm từ Dự án
        for team, points in project_result.scores.items():
            scores_this_turn[team] += points

        # Điểm từ Hiệp định
        for treaty_result in treaty_results:
            for team, points in treaty_result.score_changes.items():
                scores_this_turn[team] += points

        # Cộng vào tổng
        for team, points in scores_this_turn.items():
            self.game_state.scores[team] += points

        return scores_this_turn

    def _update_national_indices(self, cell_results: Dict[str, CellResult], project_result: ProjectResult):
        """Cập nhật chỉ số quốc gia"""
        index_changes = defaultdict(int)

        # Từ các ô
        for cell_id, cell_result in cell_results.items():
            total_in_cell = sum(cell_result.placements.values())
            affected_indices = CELL_INDEX_MAPPING.get(cell_id, [])
            for idx in affected_indices:
                index_changes[idx] += total_in_cell // 5

        # Từ Dự án
        for idx, change in project_result.index_changes.items():
            index_changes[idx] += change

        # Áp dụng
        for idx, change in index_changes.items():
            self.game_state.national_indices[idx] += change

        # Giảm tự nhiên mỗi lượt (entropy)
        for idx in self.game_state.national_indices:
            self.game_state.national_indices[idx] -= 1

    def _check_game_over(self) -> Optional[str]:
        """Kiểm tra có chỉ số nào về 0 không"""
        for idx, value in self.game_state.national_indices.items():
            if value <= 0:
                return idx
        return None

    def _calculate_final_scores(self) -> Dict[Team, int]:
        """Tính điểm cuối cùng"""
        final_scores = {}

        for team, score in self.game_state.scores.items():
            # Áp dụng hệ số từ Dự án lượt 6
            adjusted = int(score * self.game_state.final_multiplier)

            # Bonus cân bằng
            min_index = min(self.game_state.national_indices.values())
            if min_index >= 20:
                adjusted += 15
            elif min_index >= 15:
                adjusted += 10
            elif min_index >= 10:
                adjusted += 5

            final_scores[team] = adjusted

        return final_scores


# =============================================================================
# METRICS & ANALYSIS
# =============================================================================


@dataclass
class SimulationMetrics:
    total_games: int = 0
    games_completed: int = 0
    games_failed: int = 0

    wins_by_team: Dict[Team, int] = field(default_factory=lambda: {t: 0 for t in Team})
    wins_by_strategy: Dict[Strategy, int] = field(default_factory=lambda: {s: 0 for s in Strategy})

    avg_score_by_team: Dict[Team, float] = field(default_factory=dict)
    score_std_by_team: Dict[Team, float] = field(default_factory=dict)

    project_success_rate: Dict[int, float] = field(default_factory=dict)

    index_zero_frequency: Dict[str, int] = field(
        default_factory=lambda: {
            "economy": 0,
            "society": 0,
            "culture": 0,
            "integration": 0,
            "environment": 0,
            "science": 0,
        }
    )

    avg_final_indices: Dict[str, float] = field(default_factory=dict)

    score_distribution: List[int] = field(default_factory=list)
    turn_distribution: Dict[int, int] = field(default_factory=lambda: {i: 0 for i in range(1, 7)})


class MetricsCollector:
    def __init__(self):
        self.results: List[GameResult] = []
        self.agent_strategies: Dict[Team, Strategy] = {}

    def add_result(self, result: GameResult, agent_strategies: Dict[Team, Strategy]):
        self.results.append(result)
        self.agent_strategies = agent_strategies

    def compute_metrics(self) -> SimulationMetrics:
        metrics = SimulationMetrics()
        metrics.total_games = len(self.results)
        metrics.games_completed = sum(1 for r in self.results if r.reason == "completed")
        metrics.games_failed = sum(1 for r in self.results if r.reason == "national_index_zero")

        # Win rate by team
        for result in self.results:
            if result.winner:
                metrics.wins_by_team[result.winner] += 1

            # Turn distribution
            metrics.turn_distribution[result.turn_ended] += 1

            # Index zero frequency
            if result.failed_index:
                metrics.index_zero_frequency[result.failed_index] += 1

        # Score statistics by team
        scores_by_team: Dict[Team, List[int]] = {t: [] for t in Team}
        for result in self.results:
            for team, score in result.final_scores.items():
                scores_by_team[team].append(score)

        for team, scores in scores_by_team.items():
            if scores:
                metrics.avg_score_by_team[team] = np.mean(scores)
                metrics.score_std_by_team[team] = np.std(scores)

        # Project success rate
        project_success = {turn: 0 for turn in range(1, 7)}
        project_total = {turn: 0 for turn in range(1, 7)}

        for result in self.results:
            for turn_result in result.history:
                if turn_result.project_result:
                    project_total[turn_result.turn] += 1
                    if turn_result.project_result.success:
                        project_success[turn_result.turn] += 1

        for turn in range(1, 7):
            if project_total[turn] > 0:
                metrics.project_success_rate[turn] = project_success[turn] / project_total[turn]
            else:
                metrics.project_success_rate[turn] = 0.0

        # Average final indices (from completed games)
        index_sums = defaultdict(float)
        index_counts = defaultdict(int)

        for result in self.results:
            if result.history:
                final_indices = result.history[-1].national_indices
                for idx, value in final_indices.items():
                    index_sums[idx] += value
                    index_counts[idx] += 1

        for idx in STARTING_INDICES.keys():
            if index_counts[idx] > 0:
                metrics.avg_final_indices[idx] = index_sums[idx] / index_counts[idx]

        # Score distribution
        for result in self.results:
            if result.winner:
                metrics.score_distribution.append(result.final_scores[result.winner])

        return metrics


class BalanceAnalyzer:
    def __init__(self, metrics: SimulationMetrics):
        self.metrics = metrics

    def test_team_balance(self) -> Dict:
        """Chi-square test: Win rate có đều giữa các đội không?"""
        observed = [self.metrics.wins_by_team[t] for t in Team]
        total_wins = sum(observed)

        if total_wins == 0:
            return {
                "chi2": 0,
                "p_value": 1.0,
                "balanced": True,
                "interpretation": "Không có dữ liệu thắng",
                "win_rates": {},
            }

        expected = [total_wins / len(Team)] * len(Team)
        chi2, p_value = stats.chisquare(observed, expected)

        win_rates = {t: self.metrics.wins_by_team[t] / total_wins for t in Team}

        return {
            "chi2": chi2,
            "p_value": p_value,
            "balanced": p_value > 0.05,
            "interpretation": self._interpret_chi2(p_value),
            "win_rates": win_rates,
        }

    def test_early_end_rate(self) -> Dict:
        """Kiểm tra tỷ lệ game kết thúc sớm"""
        total = self.metrics.total_games
        failed = self.metrics.games_failed
        rate = failed / total if total > 0 else 0

        return {
            "early_end_rate": rate,
            "is_healthy": 0.05 <= rate <= 0.15,
            "recommendation": self._recommend_early_end(rate),
        }

    def test_project_balance(self) -> Dict:
        """Kiểm tra tỷ lệ thành công Dự án"""
        results = {}
        for turn, rate in self.metrics.project_success_rate.items():
            is_balanced = 0.3 <= rate <= 0.8
            results[turn] = {
                "success_rate": rate,
                "is_balanced": is_balanced,
                "recommendation": self._recommend_project(turn, rate),
            }
        return results

    def test_index_vulnerability(self) -> Dict:
        """Phân tích chỉ số nào hay về 0"""
        total_failures = sum(self.metrics.index_zero_frequency.values())
        if total_failures == 0:
            return {"message": "Không có game thất bại do chỉ số"}

        results = {}
        for idx, count in self.metrics.index_zero_frequency.items():
            rate = count / total_failures
            results[idx] = {
                "failure_rate": rate,
                "is_problematic": rate > 0.3,
                "recommendation": self._recommend_index(idx, rate),
            }
        return results

    def _interpret_chi2(self, p_value: float) -> str:
        if p_value > 0.1:
            return "✅ Game RẤT CÂN BẰNG giữa các đội"
        elif p_value > 0.05:
            return "✅ Game TƯƠNG ĐỐI CÂN BẰNG"
        elif p_value > 0.01:
            return "⚠️ Có sự MẤT CÂN BẰNG NHẸ, cần xem xét"
        else:
            return "❌ MẤT CÂN BẰNG NGHIÊM TRỌNG, cần điều chỉnh"

    def _recommend_early_end(self, rate: float) -> str:
        if rate < 0.05:
            return "Game quá dễ, giảm chỉ số khởi đầu hoặc tăng entropy"
        elif rate > 0.15:
            return "Game quá khó, tăng chỉ số khởi đầu hoặc giảm entropy"
        else:
            return "Tỷ lệ hợp lý"

    def _recommend_project(self, turn: int, rate: float) -> str:
        if rate < 0.3:
            return f"Dự án lượt {turn} quá khó, giảm yêu cầu"
        elif rate > 0.8:
            return f"Dự án lượt {turn} quá dễ, tăng yêu cầu"
        else:
            return "OK"

    def _recommend_index(self, idx: str, rate: float) -> str:
        if rate > 0.3:
            return f"Chỉ số {idx} hay thất bại, tăng khởi đầu hoặc buff ô liên quan"
        return "OK"

    def generate_report(self) -> str:
        """Tạo báo cáo đầy đủ"""
        report = []
        report.append("=" * 60)
        report.append("BÁO CÁO CÂN BẰNG GAME - KIẾN QUỐC KÝ")
        report.append("=" * 60)

        report.append(f"\nTổng số game: {self.metrics.total_games}")
        report.append(
            f"Game hoàn thành: {self.metrics.games_completed} ({self.metrics.games_completed / self.metrics.total_games * 100:.1f}%)"
        )
        report.append(
            f"Game thất bại sớm: {self.metrics.games_failed} ({self.metrics.games_failed / self.metrics.total_games * 100:.1f}%)"
        )

        # Team balance
        report.append("\n" + "-" * 40)
        report.append("1. CÂN BẰNG GIỮA CÁC ĐỘI")
        report.append("-" * 40)

        team_balance = self.test_team_balance()
        report.append(f"Chi-square: {team_balance['chi2']:.2f}")
        report.append(f"P-value: {team_balance['p_value']:.4f}")
        report.append(f"Kết luận: {team_balance['interpretation']}")
        report.append("\nTỷ lệ thắng:")
        for team in Team:
            rate = team_balance["win_rates"].get(team, 0)
            avg_score = self.metrics.avg_score_by_team.get(team, 0)
            std_score = self.metrics.score_std_by_team.get(team, 0)
            report.append(f"  {team.value}: {rate * 100:.1f}% | Điểm TB: {avg_score:.1f} ± {std_score:.1f}")

        # Early end rate
        report.append("\n" + "-" * 40)
        report.append("2. TỶ LỆ KẾT THÚC SỚM")
        report.append("-" * 40)

        early_end = self.test_early_end_rate()
        status = "✅" if early_end["is_healthy"] else "⚠️"
        report.append(f"{status} Tỷ lệ: {early_end['early_end_rate'] * 100:.1f}% (mục tiêu: 5-15%)")
        report.append(f"Khuyến nghị: {early_end['recommendation']}")

        # Project balance
        report.append("\n" + "-" * 40)
        report.append("3. TỶ LỆ THÀNH CÔNG DỰ ÁN TRUNG TÂM")
        report.append("-" * 40)

        project_balance = self.test_project_balance()
        for turn in range(1, 7):
            data = project_balance[turn]
            status = "✅" if data["is_balanced"] else "⚠️"
            report.append(f"  Lượt {turn}: {status} {data['success_rate'] * 100:.1f}% | {data['recommendation']}")

        # Index vulnerability
        report.append("\n" + "-" * 40)
        report.append("4. CHỈ SỐ DỄ THẤT BẠI")
        report.append("-" * 40)

        index_vuln = self.test_index_vulnerability()
        if "message" in index_vuln:
            report.append(index_vuln["message"])
        else:
            for idx, data in index_vuln.items():
                if data["failure_rate"] > 0:
                    status = "❌" if data["is_problematic"] else "✅"
                    report.append(f"  {idx}: {status} {data['failure_rate'] * 100:.1f}% | {data['recommendation']}")

        # Average final indices
        report.append("\n" + "-" * 40)
        report.append("5. CHỈ SỐ TRUNG BÌNH CUỐI GAME")
        report.append("-" * 40)

        for idx, avg in self.metrics.avg_final_indices.items():
            start = STARTING_INDICES[idx]
            change = avg - start
            arrow = "↑" if change > 0 else "↓" if change < 0 else "→"
            report.append(f"  {idx}: {avg:.1f} ({arrow} {abs(change):.1f} từ {start})")

        report.append("\n" + "=" * 60)
        report.append("KẾT LUẬN")
        report.append("=" * 60)

        issues = []
        if not team_balance["balanced"]:
            issues.append("- Mất cân bằng giữa các đội")
        if not early_end["is_healthy"]:
            issues.append("- Tỷ lệ kết thúc sớm không hợp lý")

        unbalanced_projects = [t for t, d in project_balance.items() if not d["is_balanced"]]
        if unbalanced_projects:
            issues.append(f"- Dự án lượt {unbalanced_projects} cần điều chỉnh")

        if "message" not in index_vuln:
            problem_indices = [i for i, d in index_vuln.items() if d["is_problematic"]]
            if problem_indices:
                issues.append(f"- Chỉ số {problem_indices} quá dễ thất bại")

        if issues:
            report.append("Các vấn đề cần điều chỉnh:")
            for issue in issues:
                report.append(issue)
        else:
            report.append("✅ GAME CÂN BẰNG TỐT!")

        return "\n".join(report)


# =============================================================================
# VISUALIZATION
# =============================================================================


def plot_results(metrics: SimulationMetrics, save_path: Optional[str] = None):
    """Vẽ biểu đồ kết quả"""
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    fig.suptitle("Kết quả Monte Carlo Simulation - Kiến Quốc Ký", fontsize=14)

    # 1. Win rate by team
    ax1 = axes[0, 0]
    teams = [t.value for t in Team]
    wins = [metrics.wins_by_team[t] for t in Team]
    total = sum(wins)
    win_rates = [w / total * 100 if total > 0 else 0 for w in wins]

    bars = ax1.bar(teams, win_rates, color=["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"])
    ax1.axhline(y=20, color="r", linestyle="--", label="Lý tưởng (20%)")
    ax1.set_ylabel("Tỷ lệ thắng (%)")
    ax1.set_title("Tỷ lệ thắng theo đội")
    ax1.legend()

    for bar, rate in zip(bars, win_rates):
        ax1.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.5,
            f"{rate:.1f}%",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    # 2. Average score by team
    ax2 = axes[0, 1]
    avg_scores = [metrics.avg_score_by_team.get(t, 0) for t in Team]
    std_scores = [metrics.score_std_by_team.get(t, 0) for t in Team]

    ax2.bar(
        teams,
        avg_scores,
        yerr=std_scores,
        color=["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6"],
        capsize=5,
        alpha=0.8,
    )
    ax2.set_ylabel("Điểm trung bình")
    ax2.set_title("Điểm trung bình theo đội")

    # 3. Project success rate
    ax3 = axes[0, 2]
    turns = list(range(1, 7))
    success_rates = [metrics.project_success_rate.get(t, 0) * 100 for t in turns]

    ax3.bar(turns, success_rates, color="#1abc9c")
    ax3.axhline(y=40, color="r", linestyle="--", alpha=0.5)
    ax3.axhline(y=70, color="r", linestyle="--", alpha=0.5)
    ax3.fill_between([0.5, 6.5], 40, 70, alpha=0.1, color="green", label="Vùng cân bằng")
    ax3.set_xlabel("Lượt")
    ax3.set_ylabel("Tỷ lệ thành công (%)")
    ax3.set_title("Tỷ lệ thành công Dự án Trung tâm")
    ax3.set_xticks(turns)
    ax3.legend()

    # 4. Turn distribution
    ax4 = axes[1, 0]
    turn_counts = [metrics.turn_distribution.get(t, 0) for t in range(1, 7)]

    ax4.bar(range(1, 7), turn_counts, color="#e67e22")
    ax4.set_xlabel("Lượt kết thúc")
    ax4.set_ylabel("Số game")
    ax4.set_title("Phân bố lượt kết thúc")
    ax4.set_xticks(range(1, 7))

    # 5. Index zero frequency
    ax5 = axes[1, 1]
    indices = list(metrics.index_zero_frequency.keys())
    failures = list(metrics.index_zero_frequency.values())

    if sum(failures) > 0:
        ax5.pie(
            failures,
            labels=indices,
            autopct="%1.1f%%",
            colors=["#e74c3c", "#3498db", "#f39c12", "#2ecc71", "#1abc9c", "#9b59b6"],
        )
        ax5.set_title("Tỷ lệ thất bại theo chỉ số")
    else:
        ax5.text(0.5, 0.5, "Không có game\nthất bại do chỉ số", ha="center", va="center", fontsize=12)
        ax5.set_title("Tỷ lệ thất bại theo chỉ số")

    # 6. Score distribution
    ax6 = axes[1, 2]
    if metrics.score_distribution:
        ax6.hist(metrics.score_distribution, bins=20, color="#8e44ad", edgecolor="white")
        ax6.axvline(
            x=np.mean(metrics.score_distribution),
            color="r",
            linestyle="--",
            label=f"TB: {np.mean(metrics.score_distribution):.1f}",
        )
        ax6.set_xlabel("Điểm người thắng")
        ax6.set_ylabel("Số game")
        ax6.set_title("Phân bố điểm người thắng")
        ax6.legend()
    else:
        ax6.text(0.5, 0.5, "Không có dữ liệu", ha="center", va="center")

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Đã lưu biểu đồ: {save_path}")
    else:
        plt.show()

    plt.close()


# =============================================================================
# MAIN RUNNER
# =============================================================================

# Cấu hình Agent
AGENT_DISTRIBUTIONS = {
    "all_random": {Strategy.RANDOM: 5},
    "mixed": {
        Strategy.RANDOM: 1,
        Strategy.AGGRESSIVE: 1,
        Strategy.COOPERATIVE: 1,
        Strategy.BALANCED: 1,
        Strategy.ADAPTIVE: 1,
    },
    "competitive_heavy": {
        Strategy.AGGRESSIVE: 2,
        Strategy.BALANCED: 1,
        Strategy.COOPERATIVE: 1,
        Strategy.SAFE: 1,
    },
    "cooperative_heavy": {
        Strategy.COOPERATIVE: 2,
        Strategy.BALANCED: 1,
        Strategy.AGGRESSIVE: 1,
        Strategy.ADAPTIVE: 1,
    },
    "all_adaptive": {Strategy.ADAPTIVE: 5},
    "all_balanced": {Strategy.BALANCED: 5},
}


def run_simulation(
    num_games: int = 1000, agent_config: str = "mixed", seed: Optional[int] = None, show_progress: bool = True
) -> Tuple[SimulationMetrics, BalanceAnalyzer]:
    """Chạy simulation"""

    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)

    config = AGENT_DISTRIBUTIONS.get(agent_config, AGENT_DISTRIBUTIONS["mixed"])
    collector = MetricsCollector()

    iterator = range(num_games)
    if show_progress:
        iterator = tqdm(iterator, desc=f"Running {agent_config}")

    for _ in iterator:
        simulator = GameSimulator(config)
        result = simulator.run_single_game()

        # Lưu strategy của mỗi đội
        agent_strategies = {team: agent.strategy for team, agent in simulator.agents.items()}
        collector.add_result(result, agent_strategies)

    metrics = collector.compute_metrics()
    analyzer = BalanceAnalyzer(metrics)

    return metrics, analyzer


def run_full_analysis(num_games: int = 1000, seed: int = 42):
    """Chạy phân tích đầy đủ với tất cả cấu hình"""

    print("=" * 60)
    print("KIẾN QUỐC KÝ - MONTE CARLO SIMULATION")
    print("=" * 60)
    print(f"Số game mỗi cấu hình: {num_games}")
    print(f"Random seed: {seed}")
    print("=" * 60)

    all_results = {}

    for config_name in AGENT_DISTRIBUTIONS.keys():
        print(f"\n>>> Đang chạy cấu hình: {config_name}")

        metrics, analyzer = run_simulation(num_games=num_games, agent_config=config_name, seed=seed, show_progress=True)

        all_results[config_name] = {"metrics": metrics, "analyzer": analyzer}

        # In báo cáo ngắn
        team_balance = analyzer.test_team_balance()
        early_end = analyzer.test_early_end_rate()

        print(f"  Kết quả:")
        print(f"    - Cân bằng đội: {'✅' if team_balance['balanced'] else '❌'} (p={team_balance['p_value']:.4f})")
        print(f"    - Tỷ lệ kết thúc sớm: {early_end['early_end_rate'] * 100:.1f}%")

    return all_results


def main():
    """Entry point chính"""
    import sys

    print("\n" + "=" * 60)
    print("KIẾN QUỐC KÝ - MONTE CARLO BALANCE TEST")
    print("=" * 60)

    # Cấu hình
    NUM_GAMES = 5000  # Tăng lên 10000 để có kết quả chính xác hơn
    SEED = 42
    CONFIG = "mixed"  # Thay đổi để test các cấu hình khác

    print(f"\nCấu hình:")
    print(f"  - Số game: {NUM_GAMES}")
    print(f"  - Agent config: {CONFIG}")
    print(f"  - Seed: {SEED}")

    # Chạy simulation
    print("\n" + "-" * 40)
    print("Đang chạy simulation...")
    print("-" * 40)

    metrics, analyzer = run_simulation(num_games=NUM_GAMES, agent_config=CONFIG, seed=SEED, show_progress=True)

    # In báo cáo
    print("\n")
    print(analyzer.generate_report())

    # Vẽ biểu đồ
    print("\n" + "-" * 40)
    print("Đang tạo biểu đồ...")
    print("-" * 40)

    try:
        plot_results(metrics, save_path="balance_report.png")
    except Exception as e:
        print(f"Không thể tạo biểu đồ: {e}")
        print("Bạn có thể cần cài đặt: pip install matplotlib")

    # Chạy tất cả cấu hình nếu có argument --full
    if len(sys.argv) > 1 and sys.argv[1] == "--full":
        print("\n" + "=" * 60)
        print("CHẠY PHÂN TÍCH ĐẦY ĐỦ TẤT CẢ CẤU HÌNH")
        print("=" * 60)

        all_results = run_full_analysis(num_games=NUM_GAMES, seed=SEED)

        # So sánh các cấu hình
        print("\n" + "=" * 60)
        print("SO SÁNH CÁC CẤU HÌNH")
        print("=" * 60)

        comparison_data = []
        for config_name, data in all_results.items():
            m = data["metrics"]
            a = data["analyzer"]
            tb = a.test_team_balance()
            ee = a.test_early_end_rate()

            comparison_data.append(
                {
                    "Config": config_name,
                    "Balanced": "✅" if tb["balanced"] else "❌",
                    "P-value": f"{tb['p_value']:.4f}",
                    "Early End %": f"{ee['early_end_rate'] * 100:.1f}%",
                    "Healthy": "✅" if ee["is_healthy"] else "❌",
                }
            )

        df = pd.DataFrame(comparison_data)
        print(df.to_string(index=False))

    print("\n" + "=" * 60)
    print("HOÀN THÀNH!")
    print("=" * 60)
    print("\nĐể chạy tất cả cấu hình: python main.py --full")
    print("Để thay đổi số game: chỉnh NUM_GAMES trong main()")


if __name__ == "__main__":
    main()
