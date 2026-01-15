"""
KIẾN QUỐC KÝ - Monte Carlo Simulation v7.3
- 8 lượt (1986-2007)
- RealisticAdaptive Agent
- Sự kiện thách thức thay entropy
- 5 đội, 16 ô bản đồ
- Tăng độ khó: chi phí duy trì, yêu cầu dự án cao hơn
"""

import random
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from enum import Enum
from collections import defaultdict
import scipy.stats as stats

# ============================================
# CẤU HÌNH GAME
# ============================================

SEED = 42
NUM_GAMES = 5000
NUM_TEAMS = 5
MAX_TURNS = 8
RESOURCES_PER_TURN = 14

# Chỉ số quốc gia khởi đầu (v7.3)
STARTING_INDICES = {
    "economy": 10,
    "society": 10,
    "culture": 10,
    "integration": 10,
    "environment": 10,
    "science": 10,
}

# Tên 5 đội (vùng kinh tế)
TEAM_NAMES = ["Thủ đô", "Duyên hải", "Tây Nguyên", "Đồng bằng", "Miền Đông"]

# ============================================
# SỰ KIỆN THÁCH THỨC - v7.3 (tăng độ khó)
# ============================================

# Chi phí duy trì mỗi lượt (tắt hoàn toàn trong v7.3)
MAINTENANCE_COST = {
    "economy": 1,
    "society": 1,
    "culture": 1,
    "integration": 1,
    "environment": 1,
    "science": 1,
}

TURN_EVENTS = {
    1: {
        "year": 1986,
        "name": "Khủng hoảng lạm phát 774%",
        "project": "Nghị quyết Khoán 10",
        "min_total": 20,
        "min_teams": 3,
        "success_reward": {"points": 8, "economy": 4, "society": 3},
        "failure_penalty": {"economy": -4, "society": -3},
    },
    2: {
        "year": 1987,
        "name": "Cấm vận quốc tế bóp nghẹt",
        "project": "Luật Đầu tư Nước ngoài",
        "min_total": 21,
        "min_teams": 3,
        "success_reward": {"points": 10, "integration": 5, "economy": 3},
        "failure_penalty": {"integration": -4, "economy": -3},
    },
    3: {
        "year": 1991,
        "name": "Liên Xô sụp đổ, viện trợ chấm dứt",
        "project": "Tự lực cánh sinh",
        "min_total": 22,
        "min_teams": 3,
        "success_reward": {"points": 12, "science": 4, "economy": 4},
        "failure_penalty": {"economy": -4, "science": -3},
    },
    4: {
        "year": 1993,
        "name": "Thiên tai lũ lụt miền Trung",
        "project": "Cứu trợ quốc gia",
        "min_total": 23,
        "min_teams": 3,
        "success_reward": {"points": 12, "environment": 5, "society": 3},
        "failure_penalty": {"environment": -4, "society": -3},
    },
    5: {
        "year": 1994,
        "name": "Áp lực mở cửa kinh tế",
        "project": "Mỹ dỡ bỏ cấm vận",
        "min_total": 24,
        "min_teams": 3,
        "success_reward": {"points": 14, "integration": 4, "economy": 4},
        "failure_penalty": {"integration": -4, "economy": -3},
    },
    6: {
        "year": 1995,
        "name": "Hội nhập khu vực",
        "project": "Gia nhập ASEAN",
        "min_total": 25,
        "min_teams": 3,
        "success_reward": {"points": 14, "integration": 5, "culture": 3},
        "failure_penalty": {"integration": -5, "culture": -4},
    },
    7: {
        "year": 2000,
        "name": "Cạnh tranh toàn cầu hóa",
        "project": "Hiệp định Thương mại Việt-Mỹ",
        "min_total": 26,
        "min_teams": 3,
        "success_reward": {"points": 16, "economy": 5, "science": 3},
        "failure_penalty": {"economy": -5, "science": -4},
    },
    8: {
        "year": 2007,
        "name": "Hội nhập sâu rộng",
        "project": "Gia nhập WTO",
        "min_total": 28,
        "min_teams": 4,
        "success_reward": {
            "points": 20,
            "economy": 3,
            "society": 3,
            "culture": 3,
            "integration": 3,
            "environment": 3,
            "science": 3,
        },
        "failure_penalty": {
            "economy": -5,
            "society": -5,
            "culture": -5,
            "integration": -5,
            "environment": -5,
            "science": -5,
        },
    },
}

# ============================================
# BẢN ĐỒ VÀ Ô
# ============================================


class CellType(Enum):
    COMPETITIVE = "competitive"
    SYNERGY = "synergy"
    SHARED = "shared"
    COOPERATION = "cooperation"
    PROJECT = "project"


# 16 ô trên bản đồ 4x4
BOARD_CELLS = {
    (0, 0): {"name": "Cửa khẩu Lạng Sơn", "type": CellType.COOPERATION, "indices": ["integration", "economy"]},
    (0, 1): {"name": "Đại học Bách khoa", "type": CellType.SYNERGY, "indices": ["science", "society"]},
    (0, 2): {"name": "Viện Hàn lâm", "type": CellType.SYNERGY, "indices": ["science", "culture"]},
    (0, 3): {"name": "Khu CN Việt Trì", "type": CellType.COMPETITIVE, "indices": ["economy", "environment"]},
    (1, 0): {"name": "Đồng bằng sông Hồng", "type": CellType.SHARED, "indices": ["society", "environment"]},
    (1, 1): {"name": "Dự án Quốc gia", "type": CellType.PROJECT, "indices": []},
    (1, 2): {"name": "Dự án Quốc gia", "type": CellType.PROJECT, "indices": []},
    (1, 3): {"name": "Cảng Đà Nẵng", "type": CellType.COMPETITIVE, "indices": ["economy", "integration"]},
    (2, 0): {"name": "Tây Nguyên", "type": CellType.SYNERGY, "indices": ["environment", "economy"]},
    (2, 1): {"name": "Dự án Quốc gia", "type": CellType.PROJECT, "indices": []},
    (2, 2): {"name": "Dự án Quốc gia", "type": CellType.PROJECT, "indices": []},
    (2, 3): {"name": "KCX Tân Thuận", "type": CellType.COMPETITIVE, "indices": ["economy", "science"]},
    (3, 0): {"name": "Đồng bằng Cửu Long", "type": CellType.SHARED, "indices": ["society", "economy"]},
    (3, 1): {"name": "Khu đô thị Thủ Đức", "type": CellType.SYNERGY, "indices": ["society", "science"]},
    (3, 2): {"name": "Trung tâm Tài chính", "type": CellType.COOPERATION, "indices": ["economy", "integration"]},
    (3, 3): {"name": "Cảng Sài Gòn", "type": CellType.COMPETITIVE, "indices": ["economy", "integration"]},
}

# Các ô dự án (4 ô giữa)
PROJECT_CELLS = [(1, 1), (1, 2), (2, 1), (2, 2)]

# Hệ số điểm theo loại ô
CELL_MULTIPLIERS = {
    CellType.COMPETITIVE: 1.5,
    CellType.SYNERGY: 1.8,
    CellType.SHARED: 1.5,
    CellType.COOPERATION: 2.5,
    CellType.PROJECT: 1.0,
}

# ============================================
# REALISTIC ADAPTIVE AGENT
# ============================================


@dataclass
class RealisticAdaptiveAgent:
    """Agent mô phỏng hành vi sinh viên thực"""

    team_id: int
    base_tendency: float = field(default_factory=lambda: random.uniform(0.3, 0.7))
    current_tendency: float = field(init=False)
    project_priority: float = 0.45  # Tăng từ 0.35 để dự án dễ thành công hơn
    survival_mode: bool = False

    def __post_init__(self):
        self.current_tendency = self.base_tendency

    def decide_allocation(
        self, turn: int, my_score: float, avg_score: float, national_indices: Dict[str, int], event: dict
    ) -> Dict[str, int]:
        """Quyết định phân bổ nguồn lực"""

        resources = RESOURCES_PER_TURN
        allocation = {"project": 0, "competitive": 0, "synergy": 0, "shared": 0, "cooperation": 0}

        # Kiểm tra survival mode - ngưỡng thấp hơn
        min_index = min(national_indices.values())
        if min_index <= 5:  # Giữ nguyên ngưỡng 5
            self.survival_mode = True
            self.project_priority = min(0.6, self.project_priority + 0.1)
        elif min_index >= 8:  # Giảm từ 10 xuống 8
            self.survival_mode = False
            self.project_priority = max(0.25, self.project_priority - 0.02)

        # Lượt 1-2: Khám phá (ngẫu nhiên nhưng vẫn đầu tư dự án)
        if turn <= 2:
            noise = random.uniform(-0.1, 0.1)
            project_pct = 0.3 + noise  # Tăng từ 0.2 lên 0.3
            remaining = 1.0 - project_pct

            competitive_pct = remaining * (1 - self.current_tendency) * random.uniform(0.8, 1.2)
            cooperative_pct = remaining * self.current_tendency * random.uniform(0.8, 1.2)

        # Lượt 3+: Phân hóa dựa trên kết quả
        else:
            # Điều chỉnh xu hướng dựa trên điểm
            if my_score < avg_score * 0.85:
                self.current_tendency = min(0.9, self.current_tendency + 0.1)
            elif my_score > avg_score * 1.15:
                self.current_tendency = max(0.2, self.current_tendency - 0.05)

            project_pct = self.project_priority
            remaining = 1.0 - project_pct

            competitive_pct = remaining * (1 - self.current_tendency)
            cooperative_pct = remaining * self.current_tendency

        # Phân bổ nguồn lực
        allocation["project"] = int(resources * project_pct)
        allocation["competitive"] = int(resources * competitive_pct * 0.5)
        allocation["synergy"] = int(resources * cooperative_pct * 0.4)
        allocation["shared"] = int(resources * cooperative_pct * 0.3)
        allocation["cooperation"] = int(resources * cooperative_pct * 0.3)

        # Đảm bảo tổng = resources
        total = sum(allocation.values())
        diff = resources - total
        if diff > 0:
            allocation["competitive"] += diff  # Thêm vào competitive thay vì project
        elif diff < 0:
            for key in ["shared", "cooperation", "synergy", "competitive"]:
                if allocation[key] >= abs(diff):
                    allocation[key] += diff
                    break

        return allocation

    def distribute_to_cells(self, allocation: Dict[str, int]) -> Dict[Tuple[int, int], int]:
        """Phân bổ nguồn lực vào các ô cụ thể"""
        cell_allocation = defaultdict(int)

        # Lấy danh sách ô theo loại
        cells_by_type = defaultdict(list)
        for pos, cell in BOARD_CELLS.items():
            cells_by_type[cell["type"]].append(pos)

        # Phân bổ vào project cells
        if allocation["project"] > 0:
            project_cells = cells_by_type[CellType.PROJECT]
            per_cell = allocation["project"] // len(project_cells)
            remainder = allocation["project"] % len(project_cells)
            for i, pos in enumerate(project_cells):
                cell_allocation[pos] = per_cell + (1 if i < remainder else 0)

        # Phân bổ vào competitive cells (chọn ngẫu nhiên 1-2 ô để tập trung)
        if allocation["competitive"] > 0:
            comp_cells = cells_by_type[CellType.COMPETITIVE]
            chosen = random.sample(comp_cells, min(2, len(comp_cells)))
            per_cell = allocation["competitive"] // len(chosen)
            remainder = allocation["competitive"] % len(chosen)
            for i, pos in enumerate(chosen):
                cell_allocation[pos] += per_cell + (1 if i < remainder else 0)

        # Phân bổ vào synergy cells
        if allocation["synergy"] > 0:
            syn_cells = cells_by_type[CellType.SYNERGY]
            chosen = random.sample(syn_cells, min(2, len(syn_cells)))
            per_cell = allocation["synergy"] // len(chosen)
            remainder = allocation["synergy"] % len(chosen)
            for i, pos in enumerate(chosen):
                cell_allocation[pos] += per_cell + (1 if i < remainder else 0)

        # Phân bổ vào shared cells
        if allocation["shared"] > 0:
            shared_cells = cells_by_type[CellType.SHARED]
            per_cell = allocation["shared"] // len(shared_cells)
            remainder = allocation["shared"] % len(shared_cells)
            for i, pos in enumerate(shared_cells):
                cell_allocation[pos] += per_cell + (1 if i < remainder else 0)

        # Phân bổ vào cooperation cells
        if allocation["cooperation"] > 0:
            coop_cells = cells_by_type[CellType.COOPERATION]
            per_cell = allocation["cooperation"] // len(coop_cells)
            remainder = allocation["cooperation"] % len(coop_cells)
            for i, pos in enumerate(coop_cells):
                cell_allocation[pos] += per_cell + (1 if i < remainder else 0)

        return dict(cell_allocation)


# ============================================
# GAME ENGINE
# ============================================


@dataclass
class GameState:
    """Trạng thái game"""

    national_indices: Dict[str, int] = field(default_factory=lambda: dict(STARTING_INDICES))
    team_scores: Dict[int, float] = field(default_factory=lambda: {i: 0.0 for i in range(NUM_TEAMS)})
    turn: int = 1
    game_over: bool = False
    early_end: bool = False
    winner: Optional[int] = None
    project_results: List[bool] = field(default_factory=list)
    survival_triggers: int = 0


def calculate_cell_scores(
    placements: Dict[int, Dict[Tuple[int, int], int]], cell_pos: Tuple[int, int]
) -> Dict[int, float]:
    """Tính điểm cho 1 ô dựa trên loại ô"""
    cell = BOARD_CELLS[cell_pos]
    cell_type = cell["type"]
    multiplier = CELL_MULTIPLIERS[cell_type]

    # Lấy nguồn lực của các đội tại ô này
    team_resources = {}
    for team_id, team_placements in placements.items():
        if cell_pos in team_placements and team_placements[cell_pos] > 0:
            team_resources[team_id] = team_placements[cell_pos]

    if not team_resources:
        return {}

    scores = {}
    total_resources = sum(team_resources.values())
    num_participants = len(team_resources)

    # Tránh chia cho 0
    if total_resources == 0:
        return {}

    if cell_type == CellType.COMPETITIVE:
        # Chỉ người thắng được điểm
        max_res = max(team_resources.values())
        winners = [t for t, r in team_resources.items() if r == max_res]
        for team_id in team_resources:
            if team_id in winners:
                scores[team_id] = (team_resources[team_id] * multiplier) / len(winners)
            else:
                scores[team_id] = 0

    elif cell_type == CellType.SYNERGY:
        # Hệ số cộng hưởng tăng theo số đội
        synergy_bonus = 1.0 + (num_participants - 1) * 0.25
        for team_id, res in team_resources.items():
            scores[team_id] = res * synergy_bonus * multiplier

    elif cell_type == CellType.SHARED:
        # Điểm = nguồn lực * hệ số
        for team_id, res in team_resources.items():
            scores[team_id] = res * multiplier

    elif cell_type == CellType.COOPERATION:
        # Cần >= 2 đội mới có điểm
        if num_participants >= 2:
            for team_id, res in team_resources.items():
                scores[team_id] = res * multiplier
        else:
            for team_id in team_resources:
                scores[team_id] = 0

    elif cell_type == CellType.PROJECT:
        # Xử lý riêng trong process_project
        for team_id in team_resources:
            scores[team_id] = 0

    return scores


def process_project(
    placements: Dict[int, Dict[Tuple[int, int], int]], turn: int, state: GameState
) -> Tuple[bool, List[int]]:
    """Xử lý dự án quốc gia"""
    event = TURN_EVENTS[turn]

    # Tính tổng nguồn lực vào dự án
    total_project_resources = 0
    participating_teams = []

    for team_id, team_placements in placements.items():
        team_project_resources = sum(team_placements.get(pos, 0) for pos in PROJECT_CELLS)
        if team_project_resources > 0:
            total_project_resources += team_project_resources
            participating_teams.append(team_id)

    # Kiểm tra điều kiện thành công
    success = total_project_resources >= event["min_total"] and len(participating_teams) >= event["min_teams"]

    return success, participating_teams


def apply_project_result(success: bool, participating_teams: List[int], turn: int, state: GameState):
    """Áp dụng kết quả dự án"""
    event = TURN_EVENTS[turn]

    if success:
        # Thưởng điểm cho các đội tham gia
        reward = event["success_reward"]
        for team_id in participating_teams:
            state.team_scores[team_id] += reward["points"]

        # Buff chỉ số quốc gia
        for index, value in reward.items():
            if index != "points" and index in state.national_indices:
                state.national_indices[index] += value
    else:
        # Áp dụng penalty từ sự kiện
        penalty = event["failure_penalty"]
        for index, value in penalty.items():
            if index in state.national_indices:
                state.national_indices[index] += value  # value là số âm


def update_indices_from_cells(placements: Dict[int, Dict[Tuple[int, int], int]], state: GameState):
    """Cập nhật chỉ số quốc gia từ hoạt động các ô"""
    index_boost = defaultdict(int)

    for team_id, team_placements in placements.items():
        for pos, resources in team_placements.items():
            if pos not in PROJECT_CELLS and resources > 0:
                cell = BOARD_CELLS[pos]
                for index in cell["indices"]:
                    index_boost[index] += resources // 8  # Mỗi 8 RP = +1 chỉ số

    for index, boost in index_boost.items():
        state.national_indices[index] += boost


def apply_maintenance_cost(state: GameState):
    """Áp dụng chi phí duy trì mỗi lượt"""
    for index, cost in MAINTENANCE_COST.items():
        state.national_indices[index] += cost  # cost là số âm


def check_game_over(state: GameState) -> bool:
    """Kiểm tra điều kiện thua"""
    for index, value in state.national_indices.items():
        if value <= 0:
            state.game_over = True
            state.early_end = True
            return True
    return False


def run_single_game(agents: List[RealisticAdaptiveAgent]) -> GameState:
    """Chạy 1 game hoàn chỉnh"""
    state = GameState()

    for turn in range(1, MAX_TURNS + 1):
        state.turn = turn
        event = TURN_EVENTS[turn]

        # ĐẦU LƯỢT: Áp dụng chi phí duy trì
        apply_maintenance_cost(state)

        # Kiểm tra game over sau chi phí duy trì
        if check_game_over(state):
            break

        # Tính điểm trung bình
        avg_score = sum(state.team_scores.values()) / NUM_TEAMS if sum(state.team_scores.values()) > 0 else 1

        # Các đội quyết định phân bổ
        all_placements = {}
        for agent in agents:
            allocation = agent.decide_allocation(
                turn=turn,
                my_score=state.team_scores[agent.team_id],
                avg_score=avg_score,
                national_indices=state.national_indices,
                event=event,
            )
            cell_placements = agent.distribute_to_cells(allocation)
            all_placements[agent.team_id] = cell_placements

            if agent.survival_mode:
                state.survival_triggers += 1

        # Xử lý dự án
        project_success, participating_teams = process_project(all_placements, turn, state)
        state.project_results.append(project_success)
        apply_project_result(project_success, participating_teams, turn, state)

        # Tính điểm từ các ô khác
        for pos in BOARD_CELLS:
            if pos not in PROJECT_CELLS:
                cell_scores = calculate_cell_scores(all_placements, pos)
                for team_id, score in cell_scores.items():
                    state.team_scores[team_id] += score

        # Cập nhật chỉ số từ hoạt động ô
        update_indices_from_cells(all_placements, state)

        # Kiểm tra game over cuối lượt
        if check_game_over(state):
            break

    # Xác định người thắng
    if not state.early_end:
        max_score = max(state.team_scores.values())
        winners = [t for t, s in state.team_scores.items() if s == max_score]
        state.winner = random.choice(winners)  # Nếu hòa, chọn ngẫu nhiên

    return state


# ============================================
# MONTE CARLO SIMULATION
# ============================================


def run_simulation(num_games: int = NUM_GAMES, config_name: str = "realistic_adaptive") -> Dict:
    """Chạy Monte Carlo simulation"""

    results = {
        "config": config_name,
        "total_games": num_games,
        "completed_games": 0,
        "early_end_games": 0,
        "wins_by_team": defaultdict(int),
        "scores_by_team": defaultdict(list),
        "project_success_by_turn": defaultdict(int),
        "final_indices": defaultdict(list),
        "survival_triggers": 0,
        "games_with_survival_mode": 0,
    }

    for game_idx in range(num_games):
        # Tạo agents với xu hướng ngẫu nhiên
        agents = [RealisticAdaptiveAgent(team_id=i) for i in range(NUM_TEAMS)]

        # Chạy game
        state = run_single_game(agents)

        # Thu thập kết quả
        if state.early_end:
            results["early_end_games"] += 1
        else:
            results["completed_games"] += 1
            if state.winner is not None:
                results["wins_by_team"][state.winner] += 1

        # Điểm theo đội
        for team_id, score in state.team_scores.items():
            results["scores_by_team"][team_id].append(score)

        # Kết quả dự án theo lượt
        for turn_idx, success in enumerate(state.project_results):
            if success:
                results["project_success_by_turn"][turn_idx + 1] += 1

        # Chỉ số cuối game
        for index, value in state.national_indices.items():
            results["final_indices"][index].append(value)

        # Survival mode
        if state.survival_triggers > 0:
            results["games_with_survival_mode"] += 1
            results["survival_triggers"] += state.survival_triggers

    return results


def analyze_results(results: Dict) -> Dict:
    """Phân tích kết quả Monte Carlo"""
    analysis = {}

    total = results["total_games"]
    completed = results["completed_games"]
    early_end = results["early_end_games"]

    # Tỷ lệ cơ bản
    analysis["completion_rate"] = completed / total * 100
    analysis["early_end_rate"] = early_end / total * 100

    # Chi-square test cho cân bằng đội
    if completed > 0:
        wins = [results["wins_by_team"].get(i, 0) for i in range(NUM_TEAMS)]
        expected = completed / NUM_TEAMS
        chi2, p_value = stats.chisquare(wins, [expected] * NUM_TEAMS)
        analysis["chi_square"] = chi2
        analysis["p_value"] = p_value
        analysis["balanced"] = p_value > 0.05
    else:
        analysis["chi_square"] = None
        analysis["p_value"] = None
        analysis["balanced"] = None

    # Tỷ lệ thắng theo đội
    analysis["win_rates"] = {}
    for team_id in range(NUM_TEAMS):
        wins = results["wins_by_team"].get(team_id, 0)
        rate = wins / completed * 100 if completed > 0 else 0
        analysis["win_rates"][TEAM_NAMES[team_id]] = rate

    # Điểm trung bình theo đội
    analysis["avg_scores"] = {}
    for team_id in range(NUM_TEAMS):
        scores = results["scores_by_team"][team_id]
        analysis["avg_scores"][TEAM_NAMES[team_id]] = {
            "mean": np.mean(scores),
            "std": np.std(scores),
        }

    # Tỷ lệ thành công dự án theo lượt
    analysis["project_success_rates"] = {}
    for turn in range(1, MAX_TURNS + 1):
        successes = results["project_success_by_turn"].get(turn, 0)
        rate = successes / total * 100
        analysis["project_success_rates"][turn] = rate

    # Chỉ số cuối game trung bình
    analysis["avg_final_indices"] = {}
    for index, values in results["final_indices"].items():
        analysis["avg_final_indices"][index] = {
            "mean": np.mean(values),
            "min": np.min(values),
            "max": np.max(values),
        }

    # Survival mode stats
    analysis["survival_mode_rate"] = results["games_with_survival_mode"] / total * 100
    analysis["avg_survival_triggers"] = (
        results["survival_triggers"] / results["games_with_survival_mode"]
        if results["games_with_survival_mode"] > 0
        else 0
    )

    return analysis


def print_report(analysis: Dict, config_name: str):
    """In báo cáo kết quả"""
    print("\n" + "=" * 60)
    print(f"KIẾN QUỐC KÝ - Monte Carlo v7.3 - {config_name}")
    print("=" * 60)

    print("\n📊 TỔNG QUAN")
    print(f"   Tỷ lệ hoàn thành: {analysis['completion_rate']:.1f}%")
    print(f"   Tỷ lệ kết thúc sớm: {analysis['early_end_rate']:.1f}% (mục tiêu: 5-20%)")

    print("\n⚖️ CÂN BẰNG GIỮA CÁC ĐỘI")
    if analysis["p_value"] is not None:
        print(f"   Chi-square: {analysis['chi_square']:.2f}")
        print(f"   P-value: {analysis['p_value']:.4f}")
        status = "✅ CÂN BẰNG" if analysis["balanced"] else "❌ KHÔNG CÂN BẰNG"
        print(f"   Kết luận: {status}")

    print("\n🏆 TỶ LỆ THẮNG THEO ĐỘI")
    for team, rate in analysis["win_rates"].items():
        print(f"   {team}: {rate:.1f}%")

    print("\n📈 ĐIỂM TRUNG BÌNH THEO ĐỘI")
    for team, stat_info in analysis["avg_scores"].items():
        print(f"   {team}: {stat_info['mean']:.1f} ± {stat_info['std']:.1f}")

    print("\n🎯 TỶ LỆ THÀNH CÔNG DỰ ÁN THEO LƯỢT (mục tiêu: 50-80%)")
    for turn, rate in analysis["project_success_rates"].items():
        event = TURN_EVENTS[turn]
        status = "✅" if 50 <= rate <= 80 else "⚠️"
        print(f"   Lượt {turn} ({event['year']} - {event['project']}): {rate:.1f}% {status}")

    print("\n🏛️ CHỈ SỐ QUỐC GIA CUỐI GAME")
    for index, stat_info in analysis["avg_final_indices"].items():
        start = STARTING_INDICES[index]
        change = stat_info["mean"] - start
        arrow = "↑" if change > 0 else "↓" if change < 0 else "→"
        print(f"   {index}: {stat_info['mean']:.1f} ({arrow}{abs(change):.1f} từ {start})")

    print("\n🆘 SURVIVAL MODE")
    print(f"   Tỷ lệ game có survival mode: {analysis['survival_mode_rate']:.1f}%")
    print(f"   Số lần kích hoạt TB: {analysis['avg_survival_triggers']:.1f}")

    print("\n" + "=" * 60)


# ============================================
# MAIN
# ============================================


def main():
    print("🎮 KIẾN QUỐC KÝ - Monte Carlo Simulation v7.3")
    print(f"   Cấu hình: {NUM_GAMES} games, {MAX_TURNS} lượt, {NUM_TEAMS} đội")
    print(f"   Seed: {SEED}")

    random.seed(SEED)
    np.random.seed(SEED)

    print("\n⏳ Đang chạy mô phỏng...")
    results = run_simulation(NUM_GAMES, "realistic_adaptive")

    print("📊 Đang phân tích kết quả...")
    analysis = analyze_results(results)

    print_report(analysis, "Realistic Adaptive")

    # Đánh giá tổng thể
    print("\n" + "=" * 60)
    print("📋 ĐÁNH GIÁ TỔNG THỂ")
    print("=" * 60)

    issues = []

    # Kiểm tra tỷ lệ kết thúc sớm
    if analysis["early_end_rate"] < 5:
        issues.append(f"❌ Tỷ lệ kết thúc sớm quá thấp ({analysis['early_end_rate']:.1f}%) - Game quá dễ")
    elif analysis["early_end_rate"] > 20:
        issues.append(f"❌ Tỷ lệ kết thúc sớm quá cao ({analysis['early_end_rate']:.1f}%) - Game quá khó")
    else:
        print(f"✅ Tỷ lệ kết thúc sớm OK ({analysis['early_end_rate']:.1f}%)")

    # Kiểm tra cân bằng
    if analysis["balanced"]:
        print(f"✅ Cân bằng giữa các đội (p={analysis['p_value']:.4f})")
    elif analysis["p_value"] is not None:
        issues.append(f"❌ Mất cân bằng giữa các đội (p={analysis['p_value']:.4f})")
    else:
        issues.append("❌ Không thể đánh giá cân bằng (không có game hoàn thành)")

    # Kiểm tra tỷ lệ dự án
    project_rates = list(analysis["project_success_rates"].values())
    avg_project_rate = np.mean(project_rates)
    if 50 <= avg_project_rate <= 80:
        print(f"✅ Tỷ lệ thành công dự án OK ({avg_project_rate:.1f}%)")
    else:
        issues.append(f"⚠️ Tỷ lệ thành công dự án cần điều chỉnh ({avg_project_rate:.1f}%)")

    # Kiểm tra survival mode
    if 20 <= analysis["survival_mode_rate"] <= 50:
        print(f"✅ Tỷ lệ survival mode hợp lý ({analysis['survival_mode_rate']:.1f}%)")
    elif analysis["survival_mode_rate"] < 20:
        issues.append(f"⚠️ Survival mode hiếm khi kích hoạt ({analysis['survival_mode_rate']:.1f}%)")
    else:
        issues.append(f"⚠️ Survival mode quá thường xuyên ({analysis['survival_mode_rate']:.1f}%)")

    if issues:
        print("\n🔧 CẦN ĐIỀU CHỈNH:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("\n🎉 GAME ĐÃ CÂN BẰNG - SẴN SÀNG SỬ DỤNG!")

    return analysis


if __name__ == "__main__":
    main()
