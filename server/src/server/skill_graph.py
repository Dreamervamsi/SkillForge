from typing import Dict, List, Optional, Set
from enum import Enum


class DifficultyLevel(Enum):
    """Difficulty levels for skills."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class SkillNode:
    """Represents a skill in the dependency graph."""
    
    def __init__(
        self,
        name: str,
        difficulty: str,
        estimated_learning_time_hours: float,
        concepts: List[str],
        prerequisites: List[str],
        resources: List[Dict[str, str]]
    ):
        self.name = name
        self.difficulty = difficulty
        self.estimated_learning_time_hours = estimated_learning_time_hours
        self.concepts = concepts
        self.prerequisites = prerequisites
        self.resources = resources
    
    def to_dict(self) -> Dict:
        """Convert skill node to dictionary."""
        return {
            "difficulty": self.difficulty,
            "estimated_learning_time_hours": self.estimated_learning_time_hours,
            "concepts": self.concepts,
            "prerequisites": self.prerequisites,
            "resources": self.resources
        }


class Goal:
    """Represents a learning goal with required and optional skills."""
    
    def __init__(self, name: str, required_skills: List[str], optional_skills: List[str]):
        self.name = name
        self.required_skills = required_skills
        self.optional_skills = optional_skills
    
    def to_dict(self) -> Dict:
        """Convert goal to dictionary."""
        return {
            "required_skills": self.required_skills,
            "optional_skills": self.optional_skills
        }


class SkillGraph:
    """Manages skill dependency graph for a domain."""
    
    def __init__(self, domain: str, skills: Dict[str, Dict], goals: Dict[str, Dict]):
        self.domain = domain
        self.skills: Dict[str, SkillNode] = {}
        self.goals: Dict[str, Goal] = {}
        
        # Parse skills
        for skill_name, skill_data in skills.items():
            self.skills[skill_name] = SkillNode(
                name=skill_name,
                difficulty=skill_data.get("difficulty", "beginner"),
                estimated_learning_time_hours=skill_data.get("estimated_learning_time_hours", 0),
                concepts=skill_data.get("concepts", []),
                prerequisites=skill_data.get("prerequisites", []),
                resources=skill_data.get("resources", [])
            )
        
        # Parse goals
        for goal_name, goal_data in goals.items():
            self.goals[goal_name] = Goal(
                name=goal_name,
                required_skills=goal_data.get("required_skills", []),
                optional_skills=goal_data.get("optional_skills", [])
            )
    
    def to_dict(self) -> Dict:
        """Convert skill graph to dictionary for storage."""
        return {
            "domain": self.domain,
            "skills": {name: node.to_dict() for name, node in self.skills.items()},
            "goals": {name: goal.to_dict() for name, goal in self.goals.items()}
        }
    
    @staticmethod
    def from_dict(data: Dict) -> 'SkillGraph':
        """Create skill graph from dictionary."""
        return SkillGraph(
            domain=data.get("domain", ""),
            skills=data.get("skills", {}),
            goals=data.get("goals", {})
        )
    
    def get_prerequisites(self, skill_name: str) -> List[str]:
        """Get direct prerequisites for a skill."""
        skill = self.skills.get(skill_name)
        return skill.prerequisites if skill else []
    
    def get_all_prerequisites(self, skill_name: str, visited: Optional[Set[str]] = None) -> List[str]:
        """Get all prerequisites recursively (transitive closure)."""
        if visited is None:
            visited = set()
        
        if skill_name in visited:
            return []
        
        visited.add(skill_name)
        skill = self.skills.get(skill_name)
        if not skill:
            return []
        
        all_prereqs = []
        for prereq in skill.prerequisites:
            all_prereqs.append(prereq)
            all_prereqs.extend(self.get_all_prerequisites(prereq, visited))
        
        return all_prereqs
    
    def validate_prerequisites(self, skill_name: str, mastered_skills: Set[str]) -> bool:
        """Check if user has mastered all prerequisites for a skill."""
        prereqs = self.get_all_prerequisites(skill_name)
        return all(prereq in mastered_skills for prereq in prereqs)
    
    def get_missing_prerequisites(self, skill_name: str, mastered_skills: Set[str]) -> List[str]:
        """Get list of missing prerequisites for a skill."""
        prereqs = self.get_all_prerequisites(skill_name)
        return [prereq for prereq in prereqs if prereq not in mastered_skills]
    
    def generate_learning_path(
        self,
        start_skill: str,
        end_skill: Optional[str] = None,
        mastered_skills: Optional[Set[str]] = None
    ) -> List[str]:
        """
        Generate a learning path from start_skill to end_skill (or all skills).
        Returns ordered list of skills to learn.
        """
        if mastered_skills is None:
            mastered_skills = set()
        
        if end_skill:
            # Generate path to specific skill
            target_prereqs = self.get_all_prerequisites(end_skill)
            target_prereqs.append(end_skill)
            
            # Filter out already mastered skills
            path = [skill for skill in target_prereqs if skill not in mastered_skills]
            
            # Sort by difficulty (beginner first)
            path.sort(key=lambda s: self._get_difficulty_order(self.skills[s].difficulty))
            
            return path
        else:
            # Generate path covering all skills in domain
            all_skills = list(self.skills.keys())
            path = [skill for skill in all_skills if skill not in mastered_skills]
            
            # Topological sort based on prerequisites
            path = self._topological_sort(path)
            
            return path
    
    def _topological_sort(self, skills: List[str]) -> List[str]:
        """Perform topological sort on skills based on prerequisites."""
        in_degree = {skill: 0 for skill in skills}
        adj_list = {skill: [] for skill in skills}
        
        for skill in skills:
            skill_node = self.skills.get(skill)
            if skill_node:
                for prereq in skill_node.prerequisites:
                    if prereq in skills:
                        adj_list[prereq].append(skill)
                        in_degree[skill] += 1
        
        # Queue of skills with no prerequisites
        queue = [skill for skill in skills if in_degree[skill] == 0]
        queue.sort(key=lambda s: self._get_difficulty_order(self.skills[s].difficulty))
        
        result = []
        while queue:
            # Get the easiest skill from queue
            queue.sort(key=lambda s: self._get_difficulty_order(self.skills[s].difficulty))
            current = queue.pop(0)
            result.append(current)
            
            for neighbor in adj_list[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        return result
    
    def _get_difficulty_order(self, difficulty: str) -> int:
        """Get numeric order for difficulty level."""
        order = {
            "beginner": 0,
            "intermediate": 1,
            "advanced": 2,
            "expert": 3
        }
        return order.get(difficulty, 0)
    
    def get_goal_requirements(self, goal_name: str) -> Dict:
        """Get required and optional skills for a goal."""
        goal = self.goals.get(goal_name)
        if goal:
            return {
                "required": goal.required_skills,
                "optional": goal.optional_skills
            }
        return {"required": [], "optional": []}
    
    def check_goal_completion(self, goal_name: str, mastered_skills: Set[str]) -> Dict:
        """
        Check if user has completed a goal.
        Returns completion status and missing skills.
        """
        goal = self.goals.get(goal_name)
        if not goal:
            return {"completed": False, "missing_required": [], "missing_optional": []}
        
        missing_required = [s for s in goal.required_skills if s not in mastered_skills]
        missing_optional = [s for s in goal.optional_skills if s not in mastered_skills]
        
        return {
            "completed": len(missing_required) == 0,
            "missing_required": missing_required,
            "missing_optional": missing_optional,
            "progress": len(goal.required_skills) - len(missing_required),
            "total_required": len(goal.required_skills)
        }
    
    def recommend_prerequisite_questions(
        self,
        current_skill: str,
        mastered_skills: Set[str],
        rubric_scores: Optional[Dict[str, float]] = None
    ) -> List[str]:
        """
        Recommend prerequisite skills to focus on based on performance.
        Returns ordered list of skills to practice.
        """
        missing_prereqs = self.get_missing_prerequisites(current_skill, mastered_skills)
        
        if not missing_prereqs:
            return []
        
        # Sort by difficulty (easiest first)
        missing_prereqs.sort(
            key=lambda s: self._get_difficulty_order(self.skills[s].difficulty)
        )
        
        # If rubric scores available, prioritize skills with lower scores
        if rubric_scores:
            missing_prereqs.sort(
                key=lambda s: rubric_scores.get(s, 0)
            )
        
        return missing_prereqs
    
    def get_skill_concepts(self, skill_name: str) -> List[str]:
        """Get concepts associated with a skill."""
        skill = self.skills.get(skill_name)
        return skill.concepts if skill else []
    
    def get_skill_resources(self, skill_name: str) -> List[Dict[str, str]]:
        """Get learning resources for a skill."""
        skill = self.skills.get(skill_name)
        return skill.resources if skill else []
