from typing import Dict, List, Optional
from .rubric import RubricScore, rubric_to_percentage, percentage_to_rubric


def aggregate_concept_evidence(
    question_evaluations: List[Dict],
    questions: List[Dict]
) -> Dict[str, Dict]:
    """
    Aggregate evidence for each concept across all questions.

    Args:
        question_evaluations: List of question rubric evaluations
        questions: List of question objects with metadata

    Returns:
        Dictionary mapping concept names to aggregated evidence
    """
    concept_evidence = {}

    for eval_data in question_evaluations:
        question_id = eval_data.get("question_id")
        concept = eval_data.get("concept", "general")

        # Find the question metadata
        question = next((q for q in questions if q.get("id") == question_id), None)
        if not question:
            continue

        # Initialize concept evidence if not exists
        if concept not in concept_evidence:
            concept_evidence[concept] = {
                "rubric_scores": [],
                "overall_scores": [],
                "questions_tested": [],
                "strengths": [],
                "weaknesses": [],
                "correct_count": 0,
                "total_count": 0
            }

        # Add evaluation data
        concept_evidence[concept]["rubric_scores"].extend(eval_data.get("rubric_scores", []))
        concept_evidence[concept]["overall_scores"].append(eval_data.get("overall_score", 0))
        concept_evidence[concept]["questions_tested"].append(question_id)
        concept_evidence[concept]["strengths"].extend(eval_data.get("strengths", []))
        concept_evidence[concept]["weaknesses"].extend(eval_data.get("weaknesses", []))
        concept_evidence[concept]["total_count"] += 1
        if eval_data.get("is_correct", False):
            concept_evidence[concept]["correct_count"] += 1

    # Calculate aggregate scores for each concept
    for concept, data in concept_evidence.items():
        # Average overall score
        if data["overall_scores"]:
            data["average_score"] = sum(data["overall_scores"]) / len(data["overall_scores"])
        else:
            data["average_score"] = 0.0

        # Determine mastery level
        data["mastery_level"] = determine_mastery_level(data["average_score"])

        # Deduplicate strengths and weaknesses
        data["strengths"] = list(set(data["strengths"]))
        data["weaknesses"] = list(set(data["weaknesses"]))

    return concept_evidence


def determine_mastery_level(average_score: float) -> str:
    """
    Determine mastery level based on average rubric score.

    Args:
        average_score: Average rubric score (0.0-4.0)

    Returns:
        Mastery level string
    """
    if average_score >= 3.5:
        return "advanced"
    elif average_score >= 2.5:
        return "proficient"
    elif average_score >= 1.5:
        return "developing"
    else:
        return "emerging"


def calculate_overall_proficiency(
    concept_evidence: Dict[str, Dict],
    adaptive_path: Optional[List[Dict]] = None
) -> tuple:
    """
    Calculate overall proficiency level and confidence.

    Args:
        concept_evidence: Aggregated evidence per concept
        adaptive_path: Optional adaptive path for additional context

    Returns:
        Tuple of (proficiency_level, confidence_score)
    """
    if not concept_evidence:
        return "beginner", 0.0

    # Calculate average score across all concepts
    all_scores = [data["average_score"] for data in concept_evidence.values()]
    overall_average = sum(all_scores) / len(all_scores) if all_scores else 0.0

    # Convert to 0-1 scale for confidence
    confidence = rubric_to_percentage(overall_average) / 100.0

    # Determine proficiency level
    if overall_average >= 3.5:
        proficiency = "expert"
    elif overall_average >= 2.5:
        proficiency = "advanced"
    elif overall_average >= 1.5:
        proficiency = "intermediate"
    else:
        proficiency = "beginner"

    # Adjust based on adaptive path if available
    if adaptive_path and len(adaptive_path) >= 3:
        recent_difficulties = [p.get("difficulty") for p in adaptive_path[-3:]]
        if all(d == "expert" for d in recent_difficulties):
            proficiency = "expert"
        elif all(d == "advanced" for d in recent_difficulties):
            proficiency = "advanced"

    return proficiency, confidence


def calculate_assessment_coverage(
    declared_skills: List[str],
    questions: List[Dict]
) -> Dict:
    """
    Calculate coverage of concepts tested vs skills declared.

    Args:
        declared_skills: List of skills the user declared
        questions: List of question objects with concepts_tested

    Returns:
        Coverage information dictionary
    """
    # Extract all concepts tested
    concepts_tested = set()
    tested_by_difficulty = {}

    for q in questions:
        difficulty = q.get("difficulty", "unknown")
        concepts = q.get("concepts_tested", [])

        if difficulty not in tested_by_difficulty:
            tested_by_difficulty[difficulty] = []

        for concept in concepts:
            concepts_tested.add(concept)
            if concept not in tested_by_difficulty[difficulty]:
                tested_by_difficulty[difficulty].append(concept)

    # Calculate coverage
    declared_set = set(declared_skills)
    tested_set = concepts_tested

    if len(declared_set) > 0:
        coverage_percentage = (len(tested_set & declared_set) / len(declared_set)) * 100
    else:
        coverage_percentage = 0.0

    untested_concepts = list(declared_set - tested_set)

    return {
        "declared_skills": declared_skills,
        "concepts_tested": list(tested_set),
        "coverage_percentage": coverage_percentage,
        "untested_concepts": untested_concepts,
        "tested_by_difficulty": tested_by_difficulty
    }


def generate_competency_profile(
    concept_evidence: Dict[str, Dict],
    adaptive_path: Optional[List[Dict]] = None
) -> Dict:
    """
    Generate a comprehensive competency profile.

    Args:
        concept_evidence: Aggregated evidence per concept
        adaptive_path: Optional adaptive path for context

    Returns:
        Competency profile dictionary
    """
    proficiency, confidence = calculate_overall_proficiency(concept_evidence, adaptive_path)

    # Aggregate strengths and weaknesses across all concepts
    all_strengths = []
    all_weaknesses = []

    for data in concept_evidence.values():
        all_strengths.extend(data["strengths"])
        all_weaknesses.extend(data["weaknesses"])

    # Deduplicate
    all_strengths = list(set(all_strengths))
    all_weaknesses = list(set(all_weaknesses))

    # Generate recommended next steps
    recommended_steps = generate_next_steps(concept_evidence, proficiency)

    return {
        "overall_proficiency": proficiency,
        "overall_confidence": confidence,
        "concept_evidence": [
            {
                "concept": concept,
                "rubric_scores": data["rubric_scores"],
                "overall_score": data["average_score"],
                "questions_tested": data["questions_tested"],
                "strengths": data["strengths"],
                "weaknesses": data["weaknesses"],
                "mastery_level": data["mastery_level"]
            }
            for concept, data in concept_evidence.items()
        ],
        "strengths": all_strengths,
        "weaknesses": all_weaknesses,
        "recommended_next_steps": recommended_steps
    }


def generate_next_steps(
    concept_evidence: Dict[str, Dict],
    current_proficiency: str
) -> List[str]:
    """
    Generate recommended next steps based on competency evidence.

    Args:
        concept_evidence: Aggregated evidence per concept
        current_proficiency: Current overall proficiency level

    Returns:
        List of recommended next steps
    """
    steps = []

    # Identify concepts needing improvement
    weak_concepts = [
        concept for concept, data in concept_evidence.items()
        if data["average_score"] < 2.0
    ]

    if weak_concepts:
        steps.append(f"Focus on strengthening fundamentals in: {', '.join(weak_concepts)}")

    # Identify concepts ready for advancement
    strong_concepts = [
        concept for concept, data in concept_evidence.items()
        if data["average_score"] >= 3.0
    ]

    if strong_concepts:
        steps.append(f"Build advanced skills in: {', '.join(strong_concepts)}")

    # Proficiency-specific recommendations
    if current_proficiency == "beginner":
        steps.append("Practice with beginner-level scenarios to build confidence")
    elif current_proficiency == "intermediate":
        steps.append("Tackle intermediate-level projects to apply concepts")
    elif current_proficiency == "advanced":
        steps.append("Work on complex, real-world problems to deepen expertise")
    elif current_proficiency == "expert":
        steps.append("Mentor others and contribute to advanced technical discussions")

    return steps
