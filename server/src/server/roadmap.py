from typing import Dict, List, Optional, Set
from .skill_graph import SkillGraph


class SkillGap:
    """Represents a gap between current competency and goal requirements."""
    
    def __init__(
        self,
        skill_name: str,
        gap_type: str,  # "missing", "weak", "needs_improvement"
        current_mastery: str,  # "emerging", "developing", "proficient", "advanced"
        target_mastery: str,
        priority: str  # "high", "medium", "low"
    ):
        self.skill_name = skill_name
        self.gap_type = gap_type
        self.current_mastery = current_mastery
        self.target_mastery = target_mastery
        self.priority = priority
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "skill_name": self.skill_name,
            "gap_type": self.gap_type,
            "current_mastery": self.current_mastery,
            "target_mastery": self.target_mastery,
            "priority": self.priority
        }


class RoadmapStep:
    """Represents a single step in the learning roadmap."""
    
    def __init__(
        self,
        skill_name: str,
        order: int,
        estimated_hours: float,
        concepts: List[str],
        resources: List[Dict[str, str]],
        exercise: Optional[Dict] = None,
        is_completed: bool = False
    ):
        self.skill_name = skill_name
        self.order = order
        self.estimated_hours = estimated_hours
        self.concepts = concepts
        self.resources = resources
        self.exercise = exercise  # AI-generated personalized exercise
        self.is_completed = is_completed
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "skill_name": self.skill_name,
            "order": self.order,
            "estimated_hours": self.estimated_hours,
            "concepts": self.concepts,
            "resources": self.resources,
            "exercise": self.exercise,
            "is_completed": self.is_completed
        }


class Roadmap:
    """Represents a complete learning roadmap."""
    
    def __init__(
        self,
        goal: str,
        steps: List[RoadmapStep],
        total_estimated_hours: float,
        skill_gaps: List[SkillGap]
    ):
        self.goal = goal
        self.steps = steps
        self.total_estimated_hours = total_estimated_hours
        self.skill_gaps = skill_gaps
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "goal": self.goal,
            "steps": [step.to_dict() for step in self.steps],
            "total_estimated_hours": self.total_estimated_hours,
            "skill_gaps": [gap.to_dict() for gap in self.skill_gaps]
        }


class RoadmapGenerator:
    """Generates personalized learning roadmaps based on competency and goals."""
    
    def __init__(self, skill_graph: SkillGraph):
        self.skill_graph = skill_graph
    
    def compare_with_goal(
        self,
        competency_profile: Dict,
        goal_name: str
    ) -> List[SkillGap]:
        """
        Compare user's competency profile with goal requirements.
        Returns list of skill gaps.
        """
        goal_requirements = self.skill_graph.get_goal_requirements(goal_name)
        required_skills = goal_requirements.get("required", [])
        optional_skills = goal_requirements.get("optional", [])
        
        # Extract mastered skills from competency profile
        mastered_skills = set()
        skill_mastery = {}  # skill -> mastery level
        
        if "concept_evidence" in competency_profile:
            for evidence in competency_profile["concept_evidence"]:
                skill = evidence.get("concept", "")
                mastery = evidence.get("mastery_level", "emerging")
                if skill:
                    mastered_skills.add(skill)
                    skill_mastery[skill] = mastery
        
        skill_gaps = []
        
        # Check required skills
        for skill in required_skills:
            if skill not in mastered_skills:
                # Skill is completely missing
                skill_gaps.append(SkillGap(
                    skill_name=skill,
                    gap_type="missing",
                    current_mastery="none",
                    target_mastery="proficient",
                    priority="high"
                ))
            else:
                # Skill exists but check mastery level
                current = skill_mastery.get(skill, "emerging")
                if current in ["emerging", "developing"]:
                    skill_gaps.append(SkillGap(
                        skill_name=skill,
                        gap_type="weak",
                        current_mastery=current,
                        target_mastery="proficient",
                        priority="high"
                    ))
                elif current == "proficient":
                    skill_gaps.append(SkillGap(
                        skill_name=skill,
                        gap_type="needs_improvement",
                        current_mastery=current,
                        target_mastery="advanced",
                        priority="medium"
                    ))
        
        # Check optional skills (lower priority)
        for skill in optional_skills:
            if skill not in mastered_skills:
                skill_gaps.append(SkillGap(
                    skill_name=skill,
                    gap_type="missing",
                    current_mastery="none",
                    target_mastery="proficient",
                    priority="low"
                ))
            else:
                current = skill_mastery.get(skill, "emerging")
                if current in ["emerging", "developing"]:
                    skill_gaps.append(SkillGap(
                        skill_name=skill,
                        gap_type="weak",
                        current_mastery=current,
                        target_mastery="proficient",
                        priority="medium"
                    ))
        
        return skill_gaps
    
    def generate_learning_path(
        self,
        skill_gaps: List[SkillGap],
        mastered_skills: Set[str]
    ) -> List[str]:
        """
        Generate ordered learning path from skill gaps.
        Respects prerequisites and skips mastered skills.
        """
        # Get all skills that need to be learned
        skills_to_learn = [gap.skill_name for gap in skill_gaps]
        
        # For each skill, get all prerequisites
        all_needed_skills = set()
        for skill in skills_to_learn:
            all_needed_skills.add(skill)
            prereqs = self.skill_graph.get_all_prerequisites(skill)
            for prereq in prereqs:
                if prereq not in mastered_skills:
                    all_needed_skills.add(prereq)
        
        # Convert to list and sort using topological sort
        skill_list = list(all_needed_skills)
        ordered_skills = self.skill_graph._topological_sort(skill_list)
        
        # Filter to only include skills that are in gaps or their prerequisites
        final_path = [s for s in ordered_skills if s in all_needed_skills]
        
        return final_path
    
    def generate_roadmap(
        self,
        competency_profile: Dict,
        goal_name: str,
        exercises: Optional[Dict[str, Dict]] = None
    ) -> Roadmap:
        """
        Generate complete roadmap with steps and exercises.
        """
        # Identify skill gaps
        skill_gaps = self.compare_with_goal(competency_profile, goal_name)
        
        # Extract mastered skills
        mastered_skills = set()
        if "concept_evidence" in competency_profile:
            for evidence in competency_profile["concept_evidence"]:
                mastered_skills.add(evidence.get("concept", ""))
        
        # Generate ordered learning path
        learning_path = self.generate_learning_path(skill_gaps, mastered_skills)
        
        # Create roadmap steps
        steps = []
        total_hours = 0
        
        for order, skill_name in enumerate(learning_path, start=1):
            skill_node = self.skill_graph.skills.get(skill_name)
            if not skill_node:
                continue
            
            # Get exercise if provided
            exercise = exercises.get(skill_name) if exercises else None
            
            step = RoadmapStep(
                skill_name=skill_name,
                order=order,
                estimated_hours=skill_node.estimated_learning_time_hours,
                concepts=skill_node.concepts,
                resources=skill_node.resources,
                exercise=exercise
            )
            steps.append(step)
            total_hours += skill_node.estimated_learning_time_hours
        
        return Roadmap(
            goal=goal_name,
            steps=steps,
            total_estimated_hours=total_hours,
            skill_gaps=skill_gaps
        )
    
    def prioritize_gaps(self, skill_gaps: List[SkillGap]) -> List[SkillGap]:
        """
        Prioritize skill gaps based on type and dependencies.
        High priority gaps that are prerequisites for other skills come first.
        """
        # Sort by priority (high > medium > low)
        priority_order = {"high": 0, "medium": 1, "low": 2}
        
        def sort_key(gap: SkillGap):
            base_priority = priority_order.get(gap.priority, 2)
            
            # Boost priority if this skill is a prerequisite for other gaps
            is_prerequisite = any(
                gap.skill_name in self.skill_graph.get_prerequisites(other.skill_name)
                for other in skill_gaps
            )
            
            if is_prerequisite:
                base_priority -= 0.5
            
            return (base_priority, gap.skill_name)
        
        return sorted(skill_gaps, key=sort_key)
