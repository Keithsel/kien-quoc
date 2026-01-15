"""
KIẾN QUỐC KÝ - MONTE CARLO BALANCE TEST v5.0 (FINAL)
=====================================================
Mục tiêu:
- Tỷ lệ kết thúc sớm: 5-20%
- Tỷ lệ thành công dự án: 40-70%
- Cân bằng giữa các đội (p-value > 0.05)

Điều chỉnh từ v4.0:
- ENTROPY_PER_TURN: 2 → 3
- Giảm chỉ số khởi đầu thêm
- Tăng yêu cầu dự án
- Cân bằng lại các strategy agents
"""

import random
import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict
import matplotlib.pyplot as plt
from scipy import stats
from tqdm import tqdm
import warnings

warnings.filterwarnings("ignore")

# ============================================================
# ENUMS VÀ HẰNG SỐ
# ============================================================


class Team(Enum):
    A = "Thủ đô"
    B = "Duyên hải"
    C = "Cao nguyên"
    D = "Đồng bằng"
    E = "Đô thị mới"


class CellType(Enum):
    COMPETITIVE = "competitive"
    SYNERGY = "synergy"
    SHARED = "shared"
    COOPERATION = "cooperation"
    PROJECT = "project"


class TreatyType(Enum):
    COOPERATION = "Hợp tác"
    CHALLENGE = "Thách thức"
    SHARE = "Chia sẻ"
    ALLIANCE = "Liên minh"


class Strategy(Enum):
    RANDOM = "random"
    AGGRESSIVE = "aggressive"
    COOPERATIVE = "cooperative"
    BALANCED = "balanced"
    SAFE = "safe"
    ADAPTIVE = "adaptive"
    PROJECT_FOCUSED = "project_focused"


# ============================================================
# THÔNG SỐ CÂN BẰNG v5.0 - FINAL
# ============================================================

# Nguồn lực khởi đầu (GIỐNG NHAU cho tất cả đội)
STARTING_RESOURCES = {
    Team.A: {"capital": 3, "labor": 3, "knowledge": 2},
    Team.B: {"capital": 3, "labor": 3, "knowledge": 2},
    Team.C: {"capital": 3, "labor": 3, "knowledge": 2},
    Team.D: {"capital": 3, "labor": 3, "knowledge": 2},
    Team.E: {"capital": 3, "labor": 3, "knowledge": 2},
}

RESOURCES_PER_TURN = 6

# === v5.0: Giảm chỉ số khởi đầu thêm ===
STARTING_INDICES = {
    "economy": 15,
    "society": 15,
    "culture": 12,
    "integration": 10,
    "environment": 12,
    "science": 12,
}

# === v5.0: Tăng entropy ===
ENTROPY_PER_TURN = 3

# Bản đồ 4x4
BOARD_CELLS = {
    (0, 0): {"name": "Cửa khẩu Bắc", "type": CellType.COOPERATION},
    (0, 1): {"name": "Khu CN Biên giới", "type": CellType.COMPETITIVE},
    (0, 2): {"name": "Vùng Văn hóa", "type": CellType.SYNERGY},
    (0, 3): {"name": "Cảng biển", "type": CellType.COMPETITIVE},
    (1, 0): {"name": "Nông thôn", "type": CellType.SHARED},
    (1, 1): {"name": "Dự án 1", "type": CellType.PROJECT},
    (1, 2): {"name": "Dự án 2", "type": CellType.PROJECT},
    (1, 3): {"name": "Khu Đô thị", "type": CellType.SYNERGY},
    (2, 0): {"name": "Vùng Sinh thái", "type": CellType.SYNERGY},
    (2, 1): {"name": "Dự án 3", "type": CellType.PROJECT},
    (2, 2): {"name": "Dự án 4", "type": CellType.PROJECT},
    (2, 3): {"name": "Trung tâm KH", "type": CellType.COMPETITIVE},
    (3, 0): {"name": "Đồng bằng", "type": CellType.SHARED},
    (3, 1): {"name": "Khu Giáo dục", "type": CellType.SYNERGY},
    (3, 2): {"name": "Hub Công nghệ", "type": CellType.COOPERATION},
    (3, 3): {"name": "Cảng Quốc tế", "type": CellType.COMPETITIVE},
}

# === v5.0: Tăng buff từ các ô để bù entropy ===
CELL_INDEX_MAPPING = {
    "Cửa khẩu Bắc": ["integration", "economy"],
    "Khu CN Biên giới": ["economy"],
    "Vùng Văn hóa": ["culture", "society"],
    "Cảng biển": ["economy", "integration"],
    "Nông thôn": ["society", "environment"],
    "Khu Đô thị": ["economy", "society"],
    "Vùng Sinh thái": ["environment", "culture"],
    "Trung tâm KH": ["science", "economy"],
    "Đồng bằng": ["society", "environment"],
    "Khu Giáo dục": ["science", "culture"],
    "Hub Công nghệ": ["science", "integration"],
    "Cảng Quốc tế": ["integration", "economy"],
    "Dự án 1": ["economy", "society"],
    "Dự án 2": ["culture", "environment"],
    "Dự án 3": ["environment", "science"],
    "Dự án 4": ["science", "integration"],
}

# === v5.0: Tăng yêu cầu dự án ===
PROJECT_REQUIREMENTS = {
    1: {"min_total": 10, "min_teams": 3, "special": None},
    2: {"min_total": 12, "min_teams": 3, "special": "need_knowledge"},
    3: {"min_total": 15, "min_teams": 3, "special": None},
    4: {"min_total": 18, "min_teams": 4, "special": None},
    5: {"min_total": 20, "min_teams": 4, "special": "need_all_types"},
    6: {"min_total": 22, "min_teams": 4, "special": None},
}

# === v5.0: Tăng thưởng dự án để bù entropy ===
PROJECT_REWARDS = {
    1: {"points_per_team": 8, "index_change": {"economy": 3, "society": 2}},
    2: {"points_per_team": 10, "index_change": {"culture": 3, "science": 2}},
    3: {"points_per_team": 12, "index_change": {"integration": 3, "environment": 3}},
    4: {"points_per_team": 14, "index_change": {"science": 4, "economy": 2}},
    5: {"points_per_team": 16, "index_change": {"society": 3, "culture": 3, "science": 3}},
    6: {
        "points_per_team": 20,
        "index_change": {"economy": 3, "society": 3, "culture": 3, "integration": 3, "environment": 3, "science": 3},
    },
}

# === v5.0: Tăng phạt dự án ===
PROJECT_PENALTIES = {
    1: {"index_change": {"economy": -3}, "final_multiplier": 1.0},
    2: {"index_change": {"culture": -3}, "final_multiplier": 1.0},
    3: {"index_change": {"environment": -3}, "final_multiplier": 0.95},
    4: {"index_change": {"science": -3}, "final_multiplier": 0.95},
    5: {"index_change": {"society": -3, "culture": -2}, "final_multiplier": 0.9},
    6: {"index_change": {"economy": -3, "society": -3}, "final_multiplier": 0.85},
}

CELL_SCORE_MULTIPLIERS = {
    CellType.COMPETITIVE: 2.0,
    CellType.SYNERGY: 1.5,
    CellType.SHARED: 1.5,
    CellType.COOPERATION: 2.5,
    CellType.PROJECT: 1.0,
}

# === v5.0: Giảm divisor để tăng buff từ ô ===
INDEX_CHANGE_DIVISOR = 6

# ============================================================
# DATA CLASSES
# ============================================================


@dataclass
class Resources:
    capital: int = 0
    labor: int = 0
    knowledge: int = 0

    def total(self) -> int:
        return self.capital + self.labor + self.knowledge

    def as_dict(self) -> Dict[str, int]:
        return {"capital": self.capital, "labor": self.labor, "knowledge": self.knowledge}

    def has_all_types(self) -> bool:
        return self.capital > 0 and self.labor > 0 and self.knowledge > 0


@dataclass
class CellPlacement:
    cell_pos: Tuple[int, int]
    resources: Resources


@dataclass
class Treaty:
    treaty_type: TreatyType
    sender: Team
    target: Team
    cell_pos: Optional[Tuple[int, int]] = None


@dataclass
class TreatyResult:
    treaty: Treaty
    accepted: bool
    sender_points: int = 0
    target_points: int = 0


@dataclass
class CellResult:
    cell_pos: Tuple[int, int]
    cell_name: str
    cell_type: CellType
    placements: Dict[Team, Resources]
    scores: Dict[Team, float]
    index_changes: Dict[str, int]


@dataclass
class ProjectResult:
    turn: int
    success: bool
    participants: List[Team]
    total_resources: int
    rewards: Optional[Dict] = None
    penalties: Optional[Dict] = None


@dataclass
class TurnDecision:
    placements: List[CellPlacement]
    treaty_to_send: Optional[Treaty] = None
    treaty_responses: Dict[int, bool] = field(default_factory=dict)


@dataclass
class TurnResult:
    turn: int
    cell_results: List[CellResult]
    project_result: Optional[ProjectResult]
    treaty_results: List[TreatyResult]
    scores_after: Dict[Team, float]
    indices_after: Dict[str, int]
    game_over: bool = False
    failed_index: Optional[str] = None


@dataclass
class GameResult:
    turns_played: int
    final_scores: Dict[Team, float]
    winner: Optional[Team]
    early_termination: bool
    failed_index: Optional[str]
    turn_history: List[TurnResult]
    project_successes: List[bool]


# ============================================================
# AGENTS (AI STRATEGIES) - v5.0 CÂN BẰNG
# ============================================================


class BaseAgent:
    def __init__(self, team: Team):
        self.team = team
        self.strategy = Strategy.RANDOM

    def allocate_new_resources(self, current: Resources, to_allocate: int) -> Resources:
        allocation = {"capital": 0, "labor": 0, "knowledge": 0}
        for _ in range(to_allocate):
            choice = random.choice(["capital", "labor", "knowledge"])
            allocation[choice] += 1
        return Resources(
            capital=current.capital + allocation["capital"],
            labor=current.labor + allocation["labor"],
            knowledge=current.knowledge + allocation["knowledge"],
        )

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        raise NotImplementedError

    def decide_treaty(self, game_state: "GameState") -> Optional[Treaty]:
        return None

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        return random.choice([True, False])


class RandomAgent(BaseAgent):
    def __init__(self, team: Team):
        super().__init__(team)
        self.strategy = Strategy.RANDOM

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        placements = []
        available = resources.as_dict()
        cells = list(BOARD_CELLS.keys())

        total = sum(available.values())
        if total > 0:
            num_cells = random.randint(2, min(4, len(cells)))
            chosen_cells = random.sample(cells, num_cells)

            for res_type, amount in available.items():
                if amount > 0:
                    per_cell = amount // len(chosen_cells)
                    remainder = amount % len(chosen_cells)
                    for i, cell in enumerate(chosen_cells):
                        res_amount = per_cell + (1 if i < remainder else 0)
                        if res_amount > 0:
                            res = Resources()
                            setattr(res, res_type, res_amount)
                            placements.append(CellPlacement(cell, res))

        return placements


class AggressiveAgent(BaseAgent):
    def __init__(self, team: Team):
        super().__init__(team)
        self.strategy = Strategy.AGGRESSIVE

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        placements = []
        available = resources.as_dict()

        competitive_cells = [pos for pos, info in BOARD_CELLS.items() if info["type"] == CellType.COMPETITIVE]

        # === v5.0: Aggressive vẫn đóng góp một phần cho project ===
        project_cells = [pos for pos, info in BOARD_CELLS.items() if info["type"] == CellType.PROJECT]

        total = sum(available.values())

        # 70% cho competitive, 30% cho project
        comp_amount = int(total * 0.7)
        proj_amount = total - comp_amount

        if competitive_cells and comp_amount > 0:
            targets = random.sample(competitive_cells, min(2, len(competitive_cells)))
            per_target = comp_amount // len(targets)

            used = {"capital": 0, "labor": 0, "knowledge": 0}
            for i, target in enumerate(targets):
                res = Resources()
                for res_type in ["capital", "labor", "knowledge"]:
                    take = min(available[res_type] - used[res_type], per_target // 3 + 1)
                    setattr(res, res_type, take)
                    used[res_type] += take
                if res.total() > 0:
                    placements.append(CellPlacement(target, res))

        # Phần còn lại cho project
        if project_cells:
            target_proj = random.choice(project_cells)
            remaining = {k: available[k] - sum(getattr(p.resources, k, 0) for p in placements) for k in available}
            proj_res = Resources(**{k: max(0, v) for k, v in remaining.items()})
            if proj_res.total() > 0:
                placements.append(CellPlacement(target_proj, proj_res))

        return placements

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        return random.random() < 0.4


class CooperativeAgent(BaseAgent):
    def __init__(self, team: Team):
        super().__init__(team)
        self.strategy = Strategy.COOPERATIVE

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        placements = []
        available = resources.as_dict()

        preferred_cells = [
            pos
            for pos, info in BOARD_CELLS.items()
            if info["type"] in [CellType.SYNERGY, CellType.COOPERATION, CellType.PROJECT]
        ]

        if not preferred_cells:
            preferred_cells = list(BOARD_CELLS.keys())

        cells_to_use = random.sample(preferred_cells, min(4, len(preferred_cells)))

        for res_type, amount in available.items():
            if amount > 0:
                per_cell = amount // len(cells_to_use)
                remainder = amount % len(cells_to_use)
                for i, cell in enumerate(cells_to_use):
                    res_amount = per_cell + (1 if i < remainder else 0)
                    if res_amount > 0:
                        res = Resources()
                        setattr(res, res_type, res_amount)
                        placements.append(CellPlacement(cell, res))

        return placements

    def respond_treaty(self, treaty: Treaty, game_state: "GameState") -> bool:
        return random.random() < 0.7


class BalancedAgent(BaseAgent):
    def __init__(self, team: Team):
        super().__init__(team)
        self.strategy = Strategy.BALANCED

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        placements = []
        available = resources.as_dict()

        indices = game_state.national_indices
        sorted_indices = sorted(indices.items(), key=lambda x: x[1])
        low_indices = [k for k, v in sorted_indices[:2]]

        priority_cells = []
        for pos, info in BOARD_CELLS.items():
            cell_name = info["name"]
            if cell_name in CELL_INDEX_MAPPING:
                for idx in CELL_INDEX_MAPPING[cell_name]:
                    if idx in low_indices:
                        priority_cells.append(pos)
                        break

        project_cells = [pos for pos, info in BOARD_CELLS.items() if info["type"] == CellType.PROJECT]
        priority_cells.extend(project_cells)

        if not priority_cells:
            priority_cells = list(BOARD_CELLS.keys())

        priority_cells = list(set(priority_cells))
        cells_to_use = random.sample(priority_cells, min(4, len(priority_cells)))

        for res_type, amount in available.items():
            if amount > 0 and cells_to_use:
                per_cell = amount // len(cells_to_use)
                remainder = amount % len(cells_to_use)
                for i, cell in enumerate(cells_to_use):
                    res_amount = per_cell + (1 if i < remainder else 0)
                    if res_amount > 0:
                        res = Resources()
                        setattr(res, res_type, res_amount)
                        placements.append(CellPlacement(cell, res))

        return placements


class SafeAgent(BaseAgent):
    def __init__(self, team: Team):
        super().__init__(team)
        self.strategy = Strategy.SAFE

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        placements = []
        available = resources.as_dict()

        safe_cells = [
            pos
            for pos, info in BOARD_CELLS.items()
            if info["type"] in [CellType.SHARED, CellType.SYNERGY, CellType.PROJECT]
        ]

        if not safe_cells:
            safe_cells = list(BOARD_CELLS.keys())

        cells_to_use = random.sample(safe_cells, min(4, len(safe_cells)))

        for res_type, amount in available.items():
            if amount > 0 and cells_to_use:
                per_cell = amount // len(cells_to_use)
                remainder = amount % len(cells_to_use)
                for i, cell in enumerate(cells_to_use):
                    res_amount = per_cell + (1 if i < remainder else 0)
                    if res_amount > 0:
                        res = Resources()
                        setattr(res, res_type, res_amount)
                        placements.append(CellPlacement(cell, res))

        return placements


class AdaptiveAgent(BaseAgent):
    def __init__(self, team: Team):
        super().__init__(team)
        self.strategy = Strategy.ADAPTIVE
        self.sub_strategy = Strategy.BALANCED

    def update_strategy(self, game_state: "GameState"):
        my_score = game_state.scores.get(self.team, 0)
        avg_score = sum(game_state.scores.values()) / len(game_state.scores) if game_state.scores else 0

        danger_indices = [k for k, v in game_state.national_indices.items() if v < 6]

        if danger_indices:
            self.sub_strategy = Strategy.SAFE
        elif my_score < avg_score * 0.8:
            self.sub_strategy = Strategy.AGGRESSIVE
        elif my_score > avg_score * 1.2:
            self.sub_strategy = Strategy.COOPERATIVE
        else:
            self.sub_strategy = Strategy.BALANCED

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        self.update_strategy(game_state)
        sub_agent = create_agent(self.team, self.sub_strategy)
        return sub_agent.decide_placements(resources, game_state)


class ProjectFocusedAgent(BaseAgent):
    def __init__(self, team: Team):
        super().__init__(team)
        self.strategy = Strategy.PROJECT_FOCUSED

    def decide_placements(self, resources: Resources, game_state: "GameState") -> List[CellPlacement]:
        placements = []
        available = resources.as_dict()

        project_cells = [pos for pos, info in BOARD_CELLS.items() if info["type"] == CellType.PROJECT]
        other_cells = [pos for pos, info in BOARD_CELLS.items() if info["type"] != CellType.PROJECT]

        # === v5.0: Giảm tỷ lệ project xuống 40% ===
        total = sum(available.values())
        project_amount = int(total * 0.4)

        if project_cells and project_amount > 0:
            target_projects = random.sample(project_cells, min(2, len(project_cells)))
            per_proj = project_amount // len(target_projects)

            used = {"capital": 0, "labor": 0, "knowledge": 0}
            for target in target_projects:
                res = Resources()
                for res_type in ["capital", "labor", "knowledge"]:
                    take = min(available[res_type] - used[res_type], per_proj // 3 + 1)
                    setattr(res, res_type, take)
                    used[res_type] += take
                if res.total() > 0:
                    placements.append(CellPlacement(target, res))

        # Phần còn lại cho các ô khác
        if other_cells:
            remaining = {k: available[k] - sum(getattr(p.resources, k, 0) for p in placements) for k in available}
            targets = random.sample(other_cells, min(3, len(other_cells)))

            for res_type, amount in remaining.items():
                if amount > 0:
                    per_cell = amount // len(targets)
                    remainder = amount % len(targets)
                    for i, cell in enumerate(targets):
                        res_amount = per_cell + (1 if i < remainder else 0)
                        if res_amount > 0:
                            res = Resources()
                            setattr(res, res_type, res_amount)
                            placements.append(CellPlacement(cell, res))

        return placements


def create_agent(team: Team, strategy: Strategy) -> BaseAgent:
    agents = {
        Strategy.RANDOM: RandomAgent,
        Strategy.AGGRESSIVE: AggressiveAgent,
        Strategy.COOPERATIVE: CooperativeAgent,
        Strategy.BALANCED: BalancedAgent,
        Strategy.SAFE: SafeAgent,
        Strategy.ADAPTIVE: AdaptiveAgent,
        Strategy.PROJECT_FOCUSED: ProjectFocusedAgent,
    }
    return agents.get(strategy, RandomAgent)(team)


# ============================================================
# GAME STATE VÀ SIMULATION ENGINE
# ============================================================


class GameState:
    def __init__(self):
        self.turn = 0
        self.scores: Dict[Team, float] = {team: 0 for team in Team}
        self.national_indices: Dict[str, int] = STARTING_INDICES.copy()
        self.team_resources: Dict[Team, Resources] = {team: Resources(**STARTING_RESOURCES[team]) for team in Team}
        self.history: List[TurnResult] = []
        self.project_successes: List[bool] = []

    def is_game_over(self) -> Tuple[bool, Optional[str]]:
        for index_name, value in self.national_indices.items():
            if value <= 0:
                return True, index_name
        return False, None


class GameSimulator:
    def __init__(self, agents: Dict[Team, BaseAgent]):
        self.agents = agents
        self.state = GameState()

    def simulate_turn(self) -> TurnResult:
        self.state.turn += 1
        turn = self.state.turn

        for team in Team:
            current = self.state.team_resources[team]
            new_resources = self.agents[team].allocate_new_resources(current, RESOURCES_PER_TURN)
            self.state.team_resources[team] = new_resources

        all_placements: Dict[Team, List[CellPlacement]] = {}
        for team in Team:
            resources = self.state.team_resources[team]
            placements = self.agents[team].decide_placements(resources, self.state)
            all_placements[team] = placements

        treaty_results = []
        cell_results = self._calculate_cell_scores(all_placements)
        project_result = self._process_project(turn, all_placements)
        self.state.project_successes.append(project_result.success if project_result else False)

        self._update_scores_and_indices(cell_results, project_result)
        self._apply_entropy()

        for team in Team:
            self.state.team_resources[team] = Resources(**STARTING_RESOURCES[team])

        game_over, failed_index = self.state.is_game_over()

        result = TurnResult(
            turn=turn,
            cell_results=cell_results,
            project_result=project_result,
            treaty_results=treaty_results,
            scores_after=self.state.scores.copy(),
            indices_after=self.state.national_indices.copy(),
            game_over=game_over,
            failed_index=failed_index,
        )

        self.state.history.append(result)
        return result

    def _calculate_cell_scores(self, all_placements: Dict[Team, List[CellPlacement]]) -> List[CellResult]:
        cell_resources: Dict[Tuple[int, int], Dict[Team, Resources]] = defaultdict(lambda: defaultdict(Resources))

        for team, placements in all_placements.items():
            for placement in placements:
                pos = placement.cell_pos
                current = cell_resources[pos][team]
                cell_resources[pos][team] = Resources(
                    capital=current.capital + placement.resources.capital,
                    labor=current.labor + placement.resources.labor,
                    knowledge=current.knowledge + placement.resources.knowledge,
                )

        results = []
        for pos, team_resources in cell_resources.items():
            if pos not in BOARD_CELLS:
                continue

            cell_info = BOARD_CELLS[pos]
            cell_type = cell_info["type"]
            cell_name = cell_info["name"]

            if cell_type == CellType.PROJECT:
                continue

            scores = self._calculate_cell_type_scores(cell_type, team_resources)

            index_changes = {}
            if cell_name in CELL_INDEX_MAPPING:
                total_resources = sum(r.total() for r in team_resources.values())
                for index_name in CELL_INDEX_MAPPING[cell_name]:
                    index_changes[index_name] = total_resources // INDEX_CHANGE_DIVISOR

            results.append(
                CellResult(
                    cell_pos=pos,
                    cell_name=cell_name,
                    cell_type=cell_type,
                    placements=dict(team_resources),
                    scores=scores,
                    index_changes=index_changes,
                )
            )

        return results

    def _calculate_cell_type_scores(
        self, cell_type: CellType, team_resources: Dict[Team, Resources]
    ) -> Dict[Team, float]:
        scores = {team: 0.0 for team in Team}
        multiplier = CELL_SCORE_MULTIPLIERS.get(cell_type, 1.0)

        if cell_type == CellType.COMPETITIVE:
            totals = {team: res.total() for team, res in team_resources.items()}
            if totals:
                max_total = max(totals.values())
                winners = [team for team, total in totals.items() if total == max_total]
                if winners and max_total > 0:
                    points = max_total * multiplier / len(winners)
                    for winner in winners:
                        scores[winner] = points

        elif cell_type == CellType.SYNERGY:
            participating_teams = [team for team, res in team_resources.items() if res.total() > 0]
            num_teams = len(participating_teams)
            if num_teams > 0:
                synergy_multiplier = 1.0 + (num_teams - 1) * 0.2
                total_resources = sum(res.total() for res in team_resources.values())
                for team in participating_teams:
                    contribution = team_resources[team].total()
                    scores[team] = (contribution / total_resources) * total_resources * synergy_multiplier * multiplier

        elif cell_type == CellType.SHARED:
            for team, res in team_resources.items():
                scores[team] = res.total() * multiplier

        elif cell_type == CellType.COOPERATION:
            participating_teams = [team for team, res in team_resources.items() if res.total() > 0]
            if len(participating_teams) >= 2:
                for team in participating_teams:
                    scores[team] = team_resources[team].total() * multiplier

        return scores

    def _process_project(self, turn: int, all_placements: Dict[Team, List[CellPlacement]]) -> Optional[ProjectResult]:
        if turn not in PROJECT_REQUIREMENTS:
            return None

        requirements = PROJECT_REQUIREMENTS[turn]
        project_cells = [pos for pos, info in BOARD_CELLS.items() if info["type"] == CellType.PROJECT]

        project_resources: Dict[Team, Resources] = defaultdict(Resources)
        for team, placements in all_placements.items():
            for placement in placements:
                if placement.cell_pos in project_cells:
                    current = project_resources[team]
                    project_resources[team] = Resources(
                        capital=current.capital + placement.resources.capital,
                        labor=current.labor + placement.resources.labor,
                        knowledge=current.knowledge + placement.resources.knowledge,
                    )

        participants = [team for team, res in project_resources.items() if res.total() > 0]
        total_resources = sum(res.total() for res in project_resources.values())

        success = True
        if total_resources < requirements["min_total"]:
            success = False
        if len(participants) < requirements["min_teams"]:
            success = False

        if success and requirements.get("special"):
            special = requirements["special"]
            if special == "need_knowledge":
                total_knowledge = sum(res.knowledge for res in project_resources.values())
                if total_knowledge < 4:
                    success = False
            elif special == "need_all_types":
                total_res = Resources()
                for res in project_resources.values():
                    total_res.capital += res.capital
                    total_res.labor += res.labor
                    total_res.knowledge += res.knowledge
                if not (total_res.capital >= 3 and total_res.labor >= 3 and total_res.knowledge >= 3):
                    success = False

        return ProjectResult(
            turn=turn,
            success=success,
            participants=participants,
            total_resources=total_resources,
            rewards=PROJECT_REWARDS.get(turn) if success else None,
            penalties=PROJECT_PENALTIES.get(turn) if not success else None,
        )

    def _update_scores_and_indices(self, cell_results: List[CellResult], project_result: Optional[ProjectResult]):
        for cell_result in cell_results:
            for team, score in cell_result.scores.items():
                self.state.scores[team] += score

            for index_name, change in cell_result.index_changes.items():
                if index_name in self.state.national_indices:
                    self.state.national_indices[index_name] += change

        if project_result:
            if project_result.success and project_result.rewards:
                for team in project_result.participants:
                    self.state.scores[team] += project_result.rewards["points_per_team"]

                for index_name, change in project_result.rewards["index_change"].items():
                    if index_name in self.state.national_indices:
                        self.state.national_indices[index_name] += change

            elif not project_result.success and project_result.penalties:
                for index_name, change in project_result.penalties["index_change"].items():
                    if index_name in self.state.national_indices:
                        self.state.national_indices[index_name] += change

    def _apply_entropy(self):
        for index_name in self.state.national_indices:
            self.state.national_indices[index_name] -= ENTROPY_PER_TURN

    def run_game(self, max_turns: int = 6) -> GameResult:
        for _ in range(max_turns):
            result = self.simulate_turn()
            if result.game_over:
                break

        final_scores = self.state.scores
        winner = max(final_scores, key=final_scores.get) if final_scores else None
        early_termination = self.state.turn < max_turns
        failed_index = None
        if early_termination and self.state.history:
            failed_index = self.state.history[-1].failed_index

        return GameResult(
            turns_played=self.state.turn,
            final_scores=final_scores,
            winner=winner,
            early_termination=early_termination,
            failed_index=failed_index,
            turn_history=self.state.history,
            project_successes=self.state.project_successes,
        )


# ============================================================
# METRICS COLLECTION VÀ ANALYSIS
# ============================================================


@dataclass
class SimulationMetrics:
    total_games: int = 0
    completed_games: int = 0
    early_terminations: int = 0
    wins_by_team: Dict[Team, int] = field(default_factory=lambda: {team: 0 for team in Team})
    scores_by_team: Dict[Team, List[float]] = field(default_factory=lambda: {team: [] for team in Team})
    project_successes: Dict[int, int] = field(default_factory=lambda: {i: 0 for i in range(1, 7)})
    project_attempts: Dict[int, int] = field(default_factory=lambda: {i: 0 for i in range(1, 7)})
    failed_indices: Dict[str, int] = field(default_factory=dict)
    game_lengths: List[int] = field(default_factory=list)
    final_indices: Dict[str, List[int]] = field(default_factory=lambda: {k: [] for k in STARTING_INDICES})
    wins_by_strategy: Dict[Strategy, int] = field(default_factory=lambda: {s: 0 for s in Strategy})
    games_by_strategy: Dict[Strategy, int] = field(default_factory=lambda: {s: 0 for s in Strategy})


class MetricsCollector:
    def __init__(self):
        self.metrics = SimulationMetrics()

    def record_game(self, result: GameResult, agents: Dict[Team, BaseAgent]):
        self.metrics.total_games += 1
        self.metrics.game_lengths.append(result.turns_played)

        if result.early_termination:
            self.metrics.early_terminations += 1
            if result.failed_index:
                self.metrics.failed_indices[result.failed_index] = (
                    self.metrics.failed_indices.get(result.failed_index, 0) + 1
                )
        else:
            self.metrics.completed_games += 1

        if result.winner:
            self.metrics.wins_by_team[result.winner] += 1
            winner_strategy = agents[result.winner].strategy
            self.metrics.wins_by_strategy[winner_strategy] += 1

        for team, score in result.final_scores.items():
            self.metrics.scores_by_team[team].append(score)

        for team, agent in agents.items():
            self.metrics.games_by_strategy[agent.strategy] += 1

        for i, success in enumerate(result.project_successes, 1):
            self.metrics.project_attempts[i] += 1
            if success:
                self.metrics.project_successes[i] += 1

        if result.turn_history:
            final_indices = result.turn_history[-1].indices_after
            for index_name, value in final_indices.items():
                self.metrics.final_indices[index_name].append(value)

    def get_metrics(self) -> SimulationMetrics:
        return self.metrics


class BalanceAnalyzer:
    def __init__(self, metrics: SimulationMetrics):
        self.metrics = metrics

    def analyze_team_balance(self) -> Dict:
        wins = list(self.metrics.wins_by_team.values())
        if sum(wins) == 0:
            return {"chi_square": 0, "p_value": 1.0, "balanced": True}

        expected = sum(wins) / len(wins)
        chi_square, p_value = stats.chisquare(wins)

        return {
            "chi_square": chi_square,
            "p_value": p_value,
            "balanced": p_value > 0.05,
            "win_rates": {team.value: wins[i] / max(1, self.metrics.total_games) * 100 for i, team in enumerate(Team)},
        }

    def analyze_early_termination(self) -> Dict:
        rate = self.metrics.early_terminations / max(1, self.metrics.total_games) * 100
        return {"rate": rate, "target_min": 5, "target_max": 20, "healthy": 5 <= rate <= 20}

    def analyze_projects(self) -> Dict:
        success_rates = {}
        for turn in range(1, 7):
            attempts = self.metrics.project_attempts.get(turn, 0)
            successes = self.metrics.project_successes.get(turn, 0)
            rate = successes / max(1, attempts) * 100
            success_rates[turn] = {"rate": rate, "target_min": 40, "target_max": 70, "healthy": 40 <= rate <= 70}
        return success_rates

    def analyze_failed_indices(self) -> Dict:
        total_failures = sum(self.metrics.failed_indices.values())
        if total_failures == 0:
            return {"no_failures": True}

        rates = {}
        for index_name, count in self.metrics.failed_indices.items():
            rate = count / max(1, total_failures) * 100
            rates[index_name] = {"rate": rate, "problematic": rate > 30}
        return rates

    def analyze_final_indices(self) -> Dict:
        results = {}
        for index_name, values in self.metrics.final_indices.items():
            if values:
                avg = np.mean(values)
                start = STARTING_INDICES[index_name]
                results[index_name] = {"average": avg, "start": start, "change": avg - start}
        return results

    def generate_report(self) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("BÁO CÁO CÂN BẰNG GAME - KIẾN QUỐC KÝ v5.0")
        lines.append("=" * 60)

        lines.append(f"\nTổng số game: {self.metrics.total_games}")
        lines.append(
            f"Game hoàn thành: {self.metrics.completed_games} ({self.metrics.completed_games / max(1, self.metrics.total_games) * 100:.1f}%)"
        )
        lines.append(
            f"Game thất bại sớm: {self.metrics.early_terminations} ({self.metrics.early_terminations / max(1, self.metrics.total_games) * 100:.1f}%)"
        )

        lines.append("\n" + "-" * 40)
        lines.append("1) CÂN BẰNG GIỮA CÁC ĐỘI")
        team_balance = self.analyze_team_balance()
        lines.append(f"   Chi-square: {team_balance['chi_square']:.2f}")
        lines.append(f"   P-value: {team_balance['p_value']:.4f}")
        balance_status = "✅ Game TƯƠNG ĐỐI CÂN BẰNG" if team_balance["balanced"] else "❌ Game KHÔNG CÂN BẰNG"
        lines.append(f"   Kết luận: {balance_status}")
        lines.append("\n   Tỷ lệ thắng (Điểm TB):")
        for team in Team:
            scores = self.metrics.scores_by_team[team]
            win_rate = self.metrics.wins_by_team[team] / max(1, self.metrics.total_games) * 100
            avg_score = np.mean(scores) if scores else 0
            std_score = np.std(scores) if scores else 0
            lines.append(f"   • {team.value}: {win_rate:.1f}% | Điểm TB: {avg_score:.1f} ± {std_score:.1f}")

        lines.append("\n" + "-" * 40)
        lines.append("2) TỶ LỆ KẾT THÚC SỚM")
        early = self.analyze_early_termination()
        lines.append(f"   Tỷ lệ: {early['rate']:.1f}% (mục tiêu {early['target_min']}-{early['target_max']}%)")
        if early["healthy"]:
            lines.append("   ✅ Tỷ lệ kết thúc sớm phù hợp")
        elif early["rate"] > early["target_max"]:
            lines.append("   ❌ Game quá khó, giảm entropy hoặc tăng chỉ số khởi đầu")
        else:
            lines.append("   ⚠️ Game quá dễ, tăng entropy hoặc giảm chỉ số khởi đầu")

        lines.append("\n" + "-" * 40)
        lines.append("3) TỶ LỆ THÀNH CÔNG DỰ ÁN TRUNG TÂM")
        projects = self.analyze_projects()
        problem_turns = []
        for turn, data in projects.items():
            status = "✅ OK" if data["healthy"] else "❌ Cần điều chỉnh"
            lines.append(f"   Lượt {turn}: {data['rate']:.1f}% | {status}")
            if not data["healthy"]:
                problem_turns.append(turn)

        lines.append("\n" + "-" * 40)
        lines.append("4) CHỈ SỐ DỄ THẤT BẠI")
        failed = self.analyze_failed_indices()
        if failed.get("no_failures"):
            lines.append("   ✅ Không có game thất bại do chỉ số")
        else:
            for index_name, data in failed.items():
                status = "❌ Cần buff" if data["problematic"] else "OK"
                lines.append(f"   {index_name}: {data['rate']:.1f}% | {status}")

        lines.append("\n" + "-" * 40)
        lines.append("5) CHỈ SỐ TRUNG BÌNH CUỐI GAME")
        final = self.analyze_final_indices()
        for index_name, data in final.items():
            change_str = f"↓{abs(data['change']):.1f}" if data["change"] < 0 else f"↑{data['change']:.1f}"
            lines.append(f"   {index_name}: {data['average']:.1f} ({change_str} từ {data['start']})")

        lines.append("\n" + "=" * 60)
        lines.append("KẾT LUẬN:")
        issues = []
        if not early["healthy"]:
            if early["rate"] > early["target_max"]:
                issues.append("Tỷ lệ kết thúc sớm quá cao")
            else:
                issues.append("Tỷ lệ kết thúc sớm quá thấp")
        if problem_turns:
            issues.append(f"Dự án lượt {problem_turns} cần điều chỉnh")
        problematic_indices = [k for k, v in failed.items() if k != "no_failures" and v.get("problematic")]
        if problematic_indices:
            issues.append(f"Chỉ số {problematic_indices} quá dễ thất bại")

        if issues:
            lines.append("   Các vấn đề cần điều chỉnh:")
            for issue in issues:
                lines.append(f"   • {issue}")
        else:
            lines.append("   ✅ Game đã cân bằng tốt!")

        lines.append("=" * 60)

        return "\n".join(lines)


# ============================================================
# VISUALIZATION
# ============================================================


def plot_results(metrics: SimulationMetrics, save_path: Optional[str] = None):
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    fig.suptitle("KIẾN QUỐC KÝ - Balance Analysis v5.0", fontsize=14, fontweight="bold")

    ax1 = axes[0, 0]
    teams = [t.value for t in Team]
    wins = [metrics.wins_by_team[t] for t in Team]
    total = max(1, sum(wins))
    win_rates = [w / total * 100 for w in wins]
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
    ax1.bar(teams, win_rates, color=colors)
    ax1.axhline(y=20, color="green", linestyle="--", alpha=0.7, label="Mục tiêu (20%)")
    ax1.set_title("Tỷ lệ thắng theo đội")
    ax1.set_ylabel("Tỷ lệ (%)")
    ax1.legend()

    ax2 = axes[0, 1]
    score_data = [metrics.scores_by_team[t] for t in Team]
    if any(len(s) > 0 for s in score_data):
        ax2.boxplot(score_data, labels=teams)
    ax2.set_title("Phân bố điểm số")
    ax2.set_ylabel("Điểm")

    ax3 = axes[0, 2]
    turns = list(range(1, 7))
    success_rates = []
    for t in turns:
        attempts = metrics.project_attempts.get(t, 0)
        successes = metrics.project_successes.get(t, 0)
        rate = successes / max(1, attempts) * 100
        success_rates.append(rate)
    ax3.bar(turns, success_rates, color="#45B7D1")
    ax3.axhline(y=40, color="red", linestyle="--", alpha=0.7, label="Min (40%)")
    ax3.axhline(y=70, color="green", linestyle="--", alpha=0.7, label="Max (70%)")
    ax3.set_title("Tỷ lệ thành công dự án")
    ax3.set_xlabel("Lượt")
    ax3.set_ylabel("Tỷ lệ (%)")
    ax3.legend()

    ax4 = axes[1, 0]
    if metrics.game_lengths:
        ax4.hist(metrics.game_lengths, bins=range(1, 8), color="#96CEB4", edgecolor="black", alpha=0.7)
    ax4.set_title("Phân bố độ dài game")
    ax4.set_xlabel("Số lượt")
    ax4.set_ylabel("Số game")

    ax5 = axes[1, 1]
    if metrics.failed_indices:
        indices = list(metrics.failed_indices.keys())
        counts = list(metrics.failed_indices.values())
        ax5.barh(indices, counts, color="#FF6B6B")
    ax5.set_title("Chỉ số gây thất bại")
    ax5.set_xlabel("Số lần")

    ax6 = axes[1, 2]
    index_names = list(STARTING_INDICES.keys())
    start_values = list(STARTING_INDICES.values())
    final_values = [np.mean(metrics.final_indices[k]) if metrics.final_indices[k] else 0 for k in index_names]

    x = np.arange(len(index_names))
    width = 0.35
    ax6.bar(x - width / 2, start_values, width, label="Khởi đầu", color="#4ECDC4")
    ax6.bar(x + width / 2, final_values, width, label="Cuối game", color="#45B7D1")
    ax6.set_title("Chỉ số quốc gia")
    ax6.set_xticks(x)
    ax6.set_xticklabels(index_names, rotation=45, ha="right")
    ax6.legend()

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"\nĐã lưu biểu đồ: {save_path}")

    plt.close()


# ============================================================
# AGENT CONFIGURATIONS
# ============================================================

AGENT_DISTRIBUTIONS = {
    "all_random": {team: Strategy.RANDOM for team in Team},
    "mixed": {
        Team.A: Strategy.BALANCED,
        Team.B: Strategy.AGGRESSIVE,
        Team.C: Strategy.COOPERATIVE,
        Team.D: Strategy.SAFE,
        Team.E: Strategy.ADAPTIVE,
    },
    "competitive_heavy": {
        Team.A: Strategy.AGGRESSIVE,
        Team.B: Strategy.AGGRESSIVE,
        Team.C: Strategy.BALANCED,
        Team.D: Strategy.AGGRESSIVE,
        Team.E: Strategy.COOPERATIVE,
    },
    "cooperative_heavy": {
        Team.A: Strategy.COOPERATIVE,
        Team.B: Strategy.COOPERATIVE,
        Team.C: Strategy.BALANCED,
        Team.D: Strategy.COOPERATIVE,
        Team.E: Strategy.SAFE,
    },
    "all_adaptive": {team: Strategy.ADAPTIVE for team in Team},
    "all_balanced": {team: Strategy.BALANCED for team in Team},
    "project_focused": {
        Team.A: Strategy.PROJECT_FOCUSED,
        Team.B: Strategy.PROJECT_FOCUSED,
        Team.C: Strategy.BALANCED,
        Team.D: Strategy.PROJECT_FOCUSED,
        Team.E: Strategy.COOPERATIVE,
    },
}

# ============================================================
# MAIN SIMULATION
# ============================================================


def run_monte_carlo(num_games: int = 5000, agent_config: str = "mixed", seed: int = 42) -> Dict:
    random.seed(seed)
    np.random.seed(seed)

    print(f"\nKIẾN QUỐC KÝ - MONTE CARLO BALANCE TEST v5.0")
    print(f"=" * 50)
    print(f"Cấu hình: Số game = {num_games}; Agent config = {agent_config}; Seed = {seed}")

    strategy_dist = AGENT_DISTRIBUTIONS.get(agent_config, AGENT_DISTRIBUTIONS["mixed"])
    collector = MetricsCollector()

    print(f"\nĐang chạy simulation...")
    for _ in tqdm(range(num_games), desc=f"Running {agent_config}"):
        agents = {team: create_agent(team, strategy) for team, strategy in strategy_dist.items()}
        simulator = GameSimulator(agents)
        result = simulator.run_game(max_turns=6)
        collector.record_game(result, agents)

    analyzer = BalanceAnalyzer(collector.get_metrics())
    report = analyzer.generate_report()
    print(report)

    return {"metrics": collector.get_metrics(), "analyzer": analyzer, "report": report}


def run_full_analysis(num_games: int = 5000, seed: int = 42):
    results = {}

    print("\n" + "=" * 60)
    print("KIẾN QUỐC KÝ - MONTE CARLO SIMULATION v5.0")
    print("=" * 60)
    print(f"Số game mỗi cấu hình: {num_games}")
    print(f"Random seed: {seed}")

    for config_name in AGENT_DISTRIBUTIONS.keys():
        result = run_monte_carlo(num_games, config_name, seed)
        results[config_name] = result

    print("\n" + "=" * 60)
    print("SO SÁNH CÁC CẤU HÌNH")
    print("=" * 60)
    print(f"{'Config':<20} {'Balanced':<10} {'P-value':<10} {'Early End':<12} {'Healthy':<10}")
    print("-" * 62)

    for config_name, result in results.items():
        analyzer = result["analyzer"]
        team_balance = analyzer.analyze_team_balance()
        early = analyzer.analyze_early_termination()

        balanced_str = "✅" if team_balance["balanced"] else "❌"
        healthy_str = "✅" if early["healthy"] else "❌"

        print(
            f"{config_name:<20} {balanced_str:<10} {team_balance['p_value']:<10.4f} {early['rate']:<12.1f}% {healthy_str:<10}"
        )

    return results


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import sys

    NUM_GAMES = 5000
    SEED = 42
    CONFIG = "mixed"

    if len(sys.argv) > 1:
        if sys.argv[1] == "--full":
            results = run_full_analysis(NUM_GAMES, SEED)
        else:
            CONFIG = sys.argv[1]
            result = run_monte_carlo(NUM_GAMES, CONFIG, SEED)
            print("\nĐang tạo biểu đồ...")
            plot_results(result["metrics"], save_path="balance_report_v5.png")
    else:
        result = run_monte_carlo(NUM_GAMES, CONFIG, SEED)
        print("\nĐang tạo biểu đồ...")
        plot_results(result["metrics"], save_path="balance_report_v5.png")

    print("\nHOÀN THÀNH!")
