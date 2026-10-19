from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any, Union
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())
api_key = os.getenv("GEMINI_API_KEY")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# System instructions
system_instruction = """
You are an expert technical interviewer. When a user provides their technical skills and goal, 
your task is to assess their proficiency by asking relevant multiple-choice questions matching the requested question count budget.

Requirements:
- Generate questions that test understanding of the mentioned technologies and goal
- Questions should range from basic to advanced difficulty
- Focus on practical knowledge and real-world applications
- Ensure questions are clear and unambiguous
- Questions must be scenario-based rather than simple "what is" or definition questions.

Response format: Provide the response as a valid JSON object with the following structure:
{
  "skills": ["Extracted", "Skills"],
  "questions":[
    {
      "id": 1,
      "question": "Your scenario-based question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A"
    }
  ]
}

Each question must have an integer `id` starting from 1, exactly 4 options, and one correct answer clearly indicated.
Return ONLY the JSON object, no additional text or explanation.
"""

evaluation_instruction = """
You are an expert technical interviewer and skills assessor. Your task is to evaluate a candidate's answers to technical interview questions and provide a detailed, evidence-based assessment.

Input:
- User's declared goal and skills
- Scenario-based multiple-choice questions with rubric evaluations
- User's selected answers for each question
- Individual question rubric scores and evidence

Your evaluation should:
1. Assess the user's overall proficiency level (beginner, intermediate, advanced, expert)
2. Calculate a confidence score (0.0 to 1.0) based on correctness and rubric scores
3. Identify specific strengths based on correct answers and high rubric scores
4. Identify specific weaknesses based on incorrect answers and low rubric scores
5. Provide evidence-based recommendations for improvement
6. Summarize evidence per concept/skill

Response format: Provide the response as a valid JSON object with the following structure:
{
  "skill": "Primary skill being assessed",
  "proficiency": "beginner|intermediate|advanced|expert",
  "confidence": 0.72,
  "strengths": ["specific topic 1", "specific topic 2"],
  "weaknesses": ["specific topic 1", "specific topic 2"],
  "next_action": "Specific actionable recommendation",
  "concept_summary": [
    {
      "concept": "concept_name",
      "mastery_level": "emerging|developing|proficient|advanced",
      "average_rubric_score": 2.5,
      "evidence": "Brief summary of evidence for this concept"
    }
  ]
}

Focus on specific technical concepts and practical scenarios in strengths/weaknesses, not generic statements.
Use the rubric scores provided in the input to inform your evaluation.
Return ONLY the JSON object, no additional text or explanation.
"""

adaptive_question_instruction = """
You are an expert technical interviewer specializing in adaptive assessments. Your task is to generate a single multiple-choice question at a specific difficulty level based on the user's skills and previous performance.

Input:
- User's declared goal and skills
- Target difficulty level: beginner, intermediate, advanced, or expert
- (Optional) Previous answer context: what the user got right/wrong, gaps identified

Requirements:
- Generate exactly ONE question matching the specified difficulty level
- If previous answer context is provided and incorrect, consider asking about prerequisite concepts
- Questions must be scenario-based, not simple definitions
- Ensure the question tests practical knowledge and real-world applications
- Include metadata about what concepts the question tests

Difficulty guidelines:
- Beginner: Basic concepts, straightforward scenarios, single-step problem solving
- Intermediate: Multi-step scenarios, requires connecting concepts, practical applications
- Advanced: Complex scenarios, edge cases, system design considerations, trade-offs
- Expert: Nuanced scenarios, deep architectural understanding, optimization challenges

Response format: Provide the response as a valid JSON object with the following structure:
{
  "question": {
    "id": 1,
    "question": "Your scenario-based question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "difficulty": "beginner|intermediate|advanced|expert",
    "concepts_tested": ["concept1", "concept2"],
    "prerequisite_concepts": ["optional prerequisite concept if relevant"]
  }
}

Each question must have an integer `id`, exactly 4 options, one correct answer, and metadata fields.
Return ONLY the JSON object, no additional text or explanation.
"""

adaptive_answer_evaluation_instruction = """
You are an expert technical interviewer and adaptive assessment engine. Your task is to evaluate a single answer using a rubric-based system and determine the next appropriate difficulty level.

Input:
- User's declared goal and skills
- The question asked (with difficulty and concepts tested)
- User's selected answer
- The correct answer

Your evaluation should:
1. Determine if the answer is correct
2. Assess reasoning quality (even if correct, was it a guess or genuine understanding?)
3. Evaluate using a 5-point rubric scale (0-4) across multiple dimensions
4. Identify specific knowledge gaps if incorrect
5. Recommend the next difficulty level based on performance
6. Suggest what concepts to focus on next

Rubric Dimensions (0-4 scale):
- concept_understanding: Depth of understanding of the core concept
- practical_application: Ability to apply the concept in practical scenarios
- problem_solving: Ability to solve problems using the concept
- code_quality: (if applicable) Code structure, best practices, maintainability

Rubric Scale:
0 = No evidence
1 = Emerging (basic familiarity)
2 = Developing (understands core but struggles with nuances)
3 = Proficient (solid understanding, can explain clearly)
4 = Advanced (deep understanding, can connect concepts and teach others)

Evaluation logic:
- Correct answer with strong reasoning (≥0.7) and rubric scores ≥3 → recommend increasing difficulty
- Correct answer but weak reasoning or low rubric scores → maintain current difficulty
- Incorrect answer on advanced question → decrease difficulty, focus on prerequisites
- Incorrect answer on beginner question → maintain beginner, focus on fundamentals
- Partial understanding → maintain difficulty, target specific gaps

Response format: Provide the response as a valid JSON object with the following structure:
{
  "is_correct": true,
  "reasoning_quality": 0.85,
  "rubric_scores": [
    {"dimension": "concept_understanding", "score": 3, "description": "Solid understanding with ability to explain concepts clearly"},
    {"dimension": "practical_application", "score": 2, "description": "Can apply independently in standard scenarios"},
    {"dimension": "problem_solving", "score": 3, "description": "Can solve complex problems with systematic approach"}
  ],
  "overall_rubric_score": 2.67,
  "identified_gaps": ["specific gap if any"],
  "suggested_next_difficulty": "intermediate",
  "next_concepts_to_test": ["concept1", "concept2"],
  "feedback": "Brief feedback on the answer (1-2 sentences)",
  "strengths": ["specific strength demonstrated"],
  "weaknesses": ["specific weakness identified"]
}

- reasoning_quality: 0.0 to 1.0 scale based on how confident the user seems in their understanding
- overall_rubric_score: Average of all rubric dimension scores (0.0-4.0)
- suggested_next_difficulty: "beginner", "intermediate", "advanced", or "expert"
- next_concepts_to_test: Array of concepts to focus on in the next question

Return ONLY the JSON object, no additional text or explanation.
"""

question_pool_generation_instruction = """
You are an expert technical interviewer specializing in adaptive assessments. Your task is to generate a pool of questions at different difficulty levels for efficient adaptive testing.

Input:
- User's declared goal and skills
- Number of questions to generate per difficulty level (typically 2-3)

Requirements:
- Generate questions for ALL difficulty levels: beginner, intermediate, advanced, expert
- Each difficulty level should have the specified number of questions
- Questions must be scenario-based, not simple definitions
- Include metadata for each question (difficulty, concepts tested, prerequisites)
- Ensure questions within a difficulty level test different concepts where possible

Difficulty guidelines:
- Beginner: Basic concepts, straightforward scenarios, single-step problem solving
- Intermediate: Multi-step scenarios, requires connecting concepts, practical applications
- Advanced: Complex scenarios, edge cases, system design considerations, trade-offs
- Expert: Nuanced scenarios, deep architectural understanding, optimization challenges

Response format: Provide the response as a valid JSON object with the following structure:
{
  "question_pool": {
    "beginner": [
      {
        "id": 1,
        "question": "Your scenario-based question text here",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "difficulty": "beginner",
        "concepts_tested": ["concept1", "concept2"],
        "prerequisite_concepts": []
      }
    ],
    "intermediate": [...],
    "advanced": [...],
    "expert": [...]
  }
}

Each question must have an integer `id`, exactly 4 options, one correct answer, and metadata fields.
IDs should be unique across all questions in the pool.
Return ONLY the JSON object, no additional text or explanation.
"""

skill_graph_generation_instruction = """
You are an expert technical curriculum designer. Your task is to generate a skill dependency graph for a given domain/technology.

Input:
- Domain/technology name (e.g., "React Frontend Development", "Python Data Science", "Node.js Backend Engineering")
- User's specific goal (optional, e.g., "Build scalable APIs", "Create machine learning models")

Requirements:
- Identify 8-15 key skills for the domain at a high level (not too granular)
- Each skill should have clear prerequisites that form a logical learning progression
- Skills should range from beginner to expert difficulty
- Include 3-5 key concepts for each skill
- Estimate realistic learning time in hours
- Provide at least 1-2 learning resources (documentation, tutorials) for each skill
- Define 2-3 common goals with required and optional skills

Skill structure guidelines:
- Keep skills at a high level (e.g., "JavaScript Async" not "Promises, async/await, callbacks")
- Prerequisites should form a DAG (no circular dependencies)
- Earlier skills should be prerequisites for more advanced skills
- Example progression: Basic → Intermediate → Advanced → Expert

Difficulty guidelines:
- Beginner: Foundational concepts, 4-8 hours
- Intermediate: Practical application, 8-16 hours
- Advanced: Complex scenarios, 16-24 hours
- Expert: Deep mastery, 24+ hours

Response format: Provide the response as a valid JSON object with the following structure:
{
  "domain": "Domain Name",
  "skills": {
    "Skill Name": {
      "difficulty": "beginner|intermediate|advanced|expert",
      "estimated_learning_time_hours": 8,
      "concepts": ["concept1", "concept2", "concept3"],
      "prerequisites": ["prerequisite_skill_name"],
      "resources": [
        {"title": "Resource Title", "url": "https://example.com"}
      ]
    }
  },
  "goals": {
    "Goal Name": {
      "required_skills": ["skill1", "skill2", "skill3"],
      "optional_skills": ["skill4", "skill5"]
    }
  }
}

Ensure:
- All prerequisite skills exist in the skills object
- No circular dependencies
- At least one skill has no prerequisites (entry point)
- Goals reference skills that exist in the skills object
Return ONLY the JSON object, no additional text or explanation.
"""

personalized_exercise_generation_instruction = """
You are an expert technical educator and curriculum designer. Your task is to generate personalized learning exercises for specific skills based on a learner's current competency level.

Input:
- Skill name and description
- Key concepts covered by the skill
- Learner's current mastery level (emerging, developing, proficient, advanced, or none)
- Learner's identified weaknesses (if any)
- Prerequisite skills already mastered (if any)

Requirements:
- Generate 2-3 practical exercises that progressively build understanding
- Exercises should be hands-on and scenario-based, not theoretical
- Adapt difficulty based on learner's current mastery level
- For "emerging" or "none" level: Start with foundational exercises
- For "developing" level: Focus on bridging gaps to proficiency
- For "proficient" level: Provide advanced challenges
- Include clear step-by-step instructions
- Provide expected outcomes or solutions
- Suggest resources for further learning if needed

Exercise types:
- Coding challenges (for programming skills)
- System design scenarios (for architecture skills)
- Debugging exercises (for troubleshooting skills)
- Implementation tasks (for framework/library skills)
- Analysis problems (for conceptual skills)

Response format: Provide the response as a valid JSON object with the following structure:
{
  "skill_name": "Skill Name",
  "current_mastery": "emerging|developing|proficient|advanced|none",
  "exercises": [
    {
      "title": "Exercise Title",
      "description": "Brief description of what the exercise teaches",
      "difficulty": "beginner|intermediate|advanced",
      "estimated_time_minutes": 30,
      "instructions": [
        "Step 1: Do this",
        "Step 2: Do that",
        "Step 3: Complete the task"
      ],
      "expected_outcome": "What the learner should achieve",
      "hints": ["Optional hint 1", "Optional hint 2"],
      "solution_outline": "High-level approach to solving the exercise",
      "concepts_practiced": ["concept1", "concept2"]
    }
  ],
  "learning_tips": [
    "Specific tip for this skill based on mastery level",
    "Another tip addressing common pitfalls"
  ],
  "recommended_resources": [
    {"title": "Resource Title", "url": "https://example.com", "reason": "Why this resource helps"}
  ]
}

Ensure:
- Exercises are practical and immediately applicable
- Instructions are clear and actionable
- Difficulty matches learner's current level
- Concepts practiced align with the skill's key concepts
- Learning tips address specific weaknesses or common challenges
Return ONLY the JSON object, no additional text or explanation.
"""

class AssessmentCreate(BaseModel):
    goal: Optional[str] = None
    skills: Union[List[str], str]
    question_budget: Optional[int] = 5
    time_limit_minutes: Optional[int] = 12
    adaptive_mode: Optional[bool] = False  # Enable adaptive question engine

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: str

class AssessmentAnswersSubmit(BaseModel):
    answers: List[AnswerSubmission]
    finalize: Optional[bool] = False

class GeminiPrompt(BaseModel):
    prompt:str

class UserAnswer(BaseModel):
    question: str
    selected_option: str

class EvaluationRequest(BaseModel):
    skills: str
    questions: list[dict]
    answers: list[UserAnswer]

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Adaptive Engine Models
class QuestionGenerationRequest(BaseModel):
    difficulty: str  # "beginner", "intermediate", "advanced", "expert"
    skills: List[str]
    goal: Optional[str] = None
    previous_answer: Optional[dict] = None  # context from previous interaction

class QuestionMetadata(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: str
    difficulty: str
    concepts_tested: List[str]
    prerequisite_concepts: Optional[List[str]] = None

class QuestionGenerationResponse(BaseModel):
    question: QuestionMetadata

class AnswerEvaluation(BaseModel):
    is_correct: bool
    reasoning_quality: float  # 0.0-1.0
    identified_gaps: List[str]
    suggested_next_difficulty: str
    next_concepts_to_test: List[str]
    feedback: str

class AdaptiveAnswerSubmission(BaseModel):
    question_id: int
    selected_option: str

# Competency Evidence Models
class RubricDimensionScore(BaseModel):
    """Individual rubric dimension score."""
    dimension: str  # "concept_understanding", "practical_application", "problem_solving", "code_quality"
    score: int  # 0-4 scale
    description: str  # Human-readable description

class ConceptEvidence(BaseModel):
    """Evidence for a specific concept."""
    concept: str
    rubric_scores: List[RubricDimensionScore]
    overall_score: float  # 0.0-4.0 average
    questions_tested: List[int]  # Question IDs that tested this concept
    strengths: List[str]
    weaknesses: List[str]
    mastery_level: str  # "emerging", "developing", "proficient", "advanced"

class QuestionRubricEvaluation(BaseModel):
    """Rubric evaluation for a single question."""
    question_id: int
    concept: str
    rubric_scores: List[RubricDimensionScore]
    overall_score: float  # 0.0-4.0
    is_correct: bool
    reasoning_quality: float  # 0.0-1.0
    identified_gaps: List[str]
    feedback: str

class CompetencyProfile(BaseModel):
    """Aggregate competency profile across all concepts."""
    overall_proficiency: str  # "beginner", "intermediate", "advanced", "expert"
    overall_confidence: float  # 0.0-1.0
    concept_evidence: List[ConceptEvidence]
    strengths: List[str]
    weaknesses: List[str]
    recommended_next_steps: List[str]

class AssessmentCoverage(BaseModel):
    """Coverage of concepts tested vs skills declared."""
    declared_skills: List[str]
    concepts_tested: List[str]
    coverage_percentage: float  # 0.0-100.0
    untested_concepts: List[str]
    tested_by_difficulty: Dict[str, List[str]]  # beginner: [concepts], intermediate: [concepts], etc.