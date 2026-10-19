from typing import Dict, List, Optional, Tuple
from enum import Enum

class DifficultyLevel(Enum):
    """Difficulty levels for adaptive assessments."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

    @classmethod
    def get_next_higher(cls, current: str) -> str:
        """Get the next higher difficulty level."""
        levels = [cls.BEGINNER.value, cls.INTERMEDIATE.value, cls.ADVANCED.value, cls.EXPERT.value]
        try:
            idx = levels.index(current)
            if idx < len(levels) - 1:
                return levels[idx + 1]
        except ValueError:
            pass
        return current

    @classmethod
    def get_next_lower(cls, current: str) -> str:
        """Get the next lower difficulty level."""
        levels = [cls.BEGINNER.value, cls.INTERMEDIATE.value, cls.ADVANCED.value, cls.EXPERT.value]
        try:
            idx = levels.index(current)
            if idx > 0:
                return levels[idx - 1]
        except ValueError:
            pass
        return current


def determine_next_difficulty(
    current_difficulty: str,
    is_correct: bool,
    reasoning_quality: float,
    identified_gaps: List[str]
) -> str:
    # Correct answer with strong reasoning → increase difficulty
    if is_correct and reasoning_quality >= 0.7:
        return DifficultyLevel.get_next_higher(current_difficulty)

    # Correct answer but weak reasoning (likely guess) → maintain difficulty
    if is_correct and reasoning_quality < 0.7:
        return current_difficulty

    # Incorrect answer with significant gaps → decrease difficulty
    if not is_correct and len(identified_gaps) > 0:
        # If already at beginner, stay at beginner
        if current_difficulty == DifficultyLevel.BEGINNER.value:
            return current_difficulty
        return DifficultyLevel.get_next_lower(current_difficulty)

    # Incorrect answer but no specific gaps → maintain difficulty
    return current_difficulty


def select_next_question(
    question_pool: Optional[Dict],
    current_difficulty: str,
    used_question_ids: set,
    skills: List[str],
    goal: Optional[str],
    previous_answer_evaluation: Optional[Dict]
) -> Tuple[Optional[Dict], bool]:
    # If no question pool exists, need to generate
    if not question_pool:
        return None, True

    # Try to get an unused question from the pool for current difficulty
    difficulty_questions = question_pool.get(current_difficulty, [])

    for question in difficulty_questions:
        if question.get("id") not in used_question_ids:
            return question, False

    # No unused question in pool for current difficulty, need to generate
    return None, True


def select_next_question_from_all_pools(
    question_pool: Optional[Dict],
    current_difficulty: str,
    used_question_ids: set
) -> Optional[Dict]:
    """
    Try to find a question from any difficulty level if current difficulty pool is exhausted.

    Args:
        question_pool: Dictionary of questions organized by difficulty
        current_difficulty: Current difficulty level
        used_question_ids: Set of question IDs already used

    Returns:
        Question dict or None if no questions available
    """
    if not question_pool:
        return None

    # Try to find a question from adjacent difficulty levels
    difficulty_order = [current_difficulty]

    # Add adjacent difficulties
    if current_difficulty != DifficultyLevel.BEGINNER.value:
        difficulty_order.append(DifficultyLevel.get_next_lower(current_difficulty))
    if current_difficulty != DifficultyLevel.EXPERT.value:
        difficulty_order.append(DifficultyLevel.get_next_higher(current_difficulty))

    # Try all difficulty levels in order
    for difficulty in difficulty_order:
        difficulty_questions = question_pool.get(difficulty, [])
        for question in difficulty_questions:
            if question.get("id") not in used_question_ids:
                return question

    return None


def should_end_assessment(
    question_count: int,
    question_budget: int,
    adaptive_path: Optional[List[Dict]],
    current_difficulty: str,
    confidence_convergence_threshold: float = 0.85
) -> Tuple[bool, Optional[str]]:
    """
    Determine if the assessment should end based on various criteria.

    Args:
        question_count: Number of questions asked so far
        question_budget: Maximum number of questions allowed
        adaptive_path: History of question attempts and evaluations
        current_difficulty: Current difficulty level
        confidence_convergence_threshold: Threshold for confidence convergence

    Returns:
        Tuple of (should_end, reason)
        - should_end: Boolean indicating if assessment should end
        - reason: Optional string explaining why
    """
    # End if reached question budget
    if question_count >= question_budget:
        return True, "Reached question budget"

    # End if adaptive path shows consistent high performance at expert level
    if adaptive_path and len(adaptive_path) >= 3:
        recent_performances = adaptive_path[-3:]
        expert_performances = [
            p for p in recent_performances
            if p.get("difficulty") == DifficultyLevel.EXPERT.value
            and p.get("is_correct", False)
            and p.get("reasoning_quality", 0) >= confidence_convergence_threshold
        ]

        if len(expert_performances) >= 2:
            return True, "Consistent expert-level performance"

    # End if adaptive path shows consistent low performance at beginner level
    if adaptive_path and len(adaptive_path) >= 3:
        recent_performances = adaptive_path[-3:]
        beginner_performances = [
            p for p in recent_performances
            if p.get("difficulty") == DifficultyLevel.BEGINNER.value
            and not p.get("is_correct", True)
        ]

        if len(beginner_performances) >= 2:
            return True, "Consistent difficulty at beginner level"

    # Continue assessment
    return False, None


def update_adaptive_path(
    adaptive_path: Optional[List[Dict]],
    question_id: int,
    difficulty: str,
    is_correct: bool,
    reasoning_quality: float,
    identified_gaps: List[str]
) -> List[Dict]:
    """
    Update the adaptive path with the latest question attempt.

    Args:
        adaptive_path: Existing adaptive path or None
        question_id: ID of the question
        difficulty: Difficulty level of the question
        is_correct: Whether the answer was correct
        reasoning_quality: Quality of reasoning
        identified_gaps: Knowledge gaps identified

    Returns:
        Updated adaptive path as a list of dictionaries
    """
    if adaptive_path is None:
        adaptive_path = []

    path_entry = {
        "question_id": question_id,
        "difficulty": difficulty,
        "is_correct": is_correct,
        "reasoning_quality": reasoning_quality,
        "identified_gaps": identified_gaps
    }

    adaptive_path.append(path_entry)
    return adaptive_path


def calculate_overall_confidence(adaptive_path: List[Dict]) -> float:
    """
    Calculate overall confidence score based on adaptive path.

    Args:
        adaptive_path: History of question attempts

    Returns:
        Overall confidence score (0.0 to 1.0)
    """
    if not adaptive_path:
        return 0.0

    total_reasoning_quality = sum(p.get("reasoning_quality", 0) for p in adaptive_path)
    correct_count = sum(1 for p in adaptive_path if p.get("is_correct", False))

    # Weight correctness and reasoning quality equally
    correctness_score = correct_count / len(adaptive_path)
    reasoning_score = total_reasoning_quality / len(adaptive_path)

    return (correctness_score + reasoning_score) / 2


def get_initial_difficulty(skills: List[str], goal: Optional[str]) -> str:
    """
    Determine the initial difficulty level based on skills and goal.

    Args:
        skills: List of skills being assessed
        goal: Assessment goal

    Returns:
        Initial difficulty level (beginner by default)
    """
    # For now, start at beginner for all assessments
    # This could be enhanced with skill-specific logic in the future
    return DifficultyLevel.BEGINNER.value
