from typing import Dict, List
from enum import Enum


class RubricDimension(Enum):
    """Dimensions for rubric-based evaluation."""
    CONCEPT_UNDERSTANDING = "concept_understanding"
    PRACTICAL_APPLICATION = "practical_application"
    PROBLEM_SOLVING = "problem_solving"
    CODE_QUALITY = "code_quality"  # Optional, for coding questions


class RubricScore(Enum):
    """5-point rubric scale (0-4)."""
    NO_EVIDENCE = 0
    EMERGING = 1
    DEVELOPING = 2
    PROFICIENT = 3
    ADVANCED = 4


RUBRIC_DESCRIPTIONS = {
    RubricDimension.CONCEPT_UNDERSTANDING: {
        RubricScore.NO_EVIDENCE: "No understanding demonstrated",
        RubricScore.EMERGING: "Basic familiarity with terminology, but limited understanding",
        RubricScore.DEVELOPING: "Understands core concepts but struggles with nuances",
        RubricScore.PROFICIENT: "Solid understanding with ability to explain concepts clearly",
        RubricScore.ADVANCED: "Deep understanding with ability to connect concepts and teach others"
    },
    RubricDimension.PRACTICAL_APPLICATION: {
        RubricScore.NO_EVIDENCE: "Cannot apply concepts in practice",
        RubricScore.EMERGING: "Can apply in simple, guided scenarios",
        RubricScore.DEVELOPING: "Can apply independently in standard scenarios",
        RubricScore.PROFICIENT: "Can apply effectively in varied scenarios",
        RubricScore.ADVANCED: "Can apply creatively in complex, novel scenarios"
    },
    RubricDimension.PROBLEM_SOLVING: {
        RubricScore.NO_EVIDENCE: "Unable to solve problems",
        RubricScore.EMERGING: "Can solve with significant guidance",
        RubricScore.DEVELOPING: "Can solve standard problems independently",
        RubricScore.PROFICIENT: "Can solve complex problems with systematic approach",
        RubricScore.ADVANCED: "Can design solutions for novel, ambiguous problems"
    },
    RubricDimension.CODE_QUALITY: {
        RubricScore.NO_EVIDENCE: "Code does not run or is completely incorrect",
        RubricScore.EMERGING: "Code runs but has major issues (bugs, inefficiencies)",
        RubricScore.DEVELOPING: "Code works but lacks structure and best practices",
        RubricScore.PROFICIENT: "Code is clean, follows best practices, and is maintainable",
        RubricScore.ADVANCED: "Code is elegant, optimized, well-documented, and production-ready"
    }
}


def get_rubric_description(dimension: RubricDimension, score: RubricScore) -> str:
    return RUBRIC_DESCRIPTIONS.get(dimension, {}).get(score, "Unknown")


def calculate_rubric_average(scores: Dict[str, int]) -> float:
    if not scores:
        return 0.0
    return sum(scores.values()) / len(scores)


def rubric_to_percentage(score: float) -> float:
    return (score / 4.0) * 100.0


def percentage_to_rubric(percentage: float) -> float:
    return (percentage / 100.0) * 4.0
