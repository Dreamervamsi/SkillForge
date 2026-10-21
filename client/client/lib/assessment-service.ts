import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api-config"

export interface Question {
  id: number
  question: string
  options: string[]
  difficulty?: string
  concepts_tested?: string[]
}

export interface AssessmentResponse {
  id: string
  goal: string
  selected_skills: string[]
  question_budget: number
  time_limit_minutes: number
  time_remaining_seconds: number | null
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED"
  questions: Question[]
  answers: Array<{ question_id: number; selected_option: string }>
  adaptive_mode: boolean
  current_difficulty?: string
  next_question_index?: number
  adaptive_path?: Array<{
    question_id: number
    difficulty: string
    is_correct: boolean
    reasoning_quality: number
    identified_gaps: string[]
  }>
}

export interface NextQuestionResponse {
  assessment_ended: boolean
  reason?: string
  question?: Question
  difficulty?: string
  question_index?: number
  final_difficulty?: string
  adaptive_path?: any[]
  competency_profile?: any
}

// Evaluation model output directly by Python backend
export interface BackendEvaluation {
  skill?: string
  proficiency?: "beginner" | "intermediate" | "advanced" | "expert" | string
  confidence?: number
  strengths?: string[]
  weaknesses?: string[]
  next_action?: string
  concept_summary?: Array<{
    concept: string
    mastery_level: string
    average_rubric_score: number
    evidence: string
  }>
  error?: string
}

export interface DetailedResultItem {
  question_id: number
  question?: string
  user_selected: string
  correct_answer?: string
  is_correct: boolean
  difficulty?: string
  concepts_tested?: string[]
  rubric_evaluation?: {
    question_id?: number
    concept?: string
    rubric_scores?: number[]
    overall_score?: number
    is_correct?: boolean
    reasoning_quality?: number
    identified_gaps?: string[]
    feedback?: string
    strengths?: string[]
    weaknesses?: string[]
  } | null
}

export interface ConceptCoverage {
  coverage_percentage: number
  tested_concepts: string[]
  untested_concepts: string[]
  tested_by_difficulty?: Record<string, string[]>
}

export interface CompetencyProfile {
  overall_proficiency: string
  overall_confidence: number
  concept_evidence?: Array<{
    concept: string
    rubric_scores: number[]
    overall_score: number
    questions_tested: number[]
    strengths: string[]
    weaknesses: string[]
    mastery_level: string
  }>
  strengths: string[]
  weaknesses: string[]
  recommended_next_steps: string[]
}

export interface AssessmentResultResponse {
  id: string
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | string
  score: {
    correct: number
    total: number
    percentage: number
  }
  detailed_results: DetailedResultItem[]
  evaluation: BackendEvaluation | null
  completed_at: string | null
  adaptive_mode?: boolean
  final_difficulty?: string
  adaptive_path?: Array<{
    question_id: number
    difficulty: string
    is_correct: boolean
    reasoning_quality: number
    identified_gaps: string[]
  }>
  overall_confidence?: number
  competency_evidence?: Record<string, any>
  concept_coverage?: ConceptCoverage
  competency_profile?: CompetencyProfile
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export async function fetchAssessmentSession(assessmentId: string): Promise<AssessmentResponse> {
  const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch assessment session")
  }
  return data
}

export async function fetchAssessmentResults(assessmentId: string): Promise<AssessmentResultResponse> {
  const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/results`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch assessment results")
  }
  return data
}

export async function fetchNextAdaptiveQuestion(
  assessmentId: string,
  previousAnswer?: { question_id: number; selected_option: string }
): Promise<NextQuestionResponse> {
  const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/next-question`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: previousAnswer ? JSON.stringify(previousAnswer) : undefined,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Failed to submit answer and load next question")
  }
  return data
}

export async function submitNonAdaptiveAnswers(
  assessmentId: string,
  answers: Array<{ question_id: number; selected_option: string }>,
  finalize = true
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/answers`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers, finalize }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Failed to submit assessment answers")
  }
  return data
}

export interface RoadmapSkillGap {
  skill_name: string
  gap_type: "missing" | "weak" | "needs_improvement" | string
  current_mastery: "none" | "emerging" | "developing" | "proficient" | "advanced" | string
  target_mastery: string
  priority: "high" | "medium" | "low" | string
}

export interface RoadmapStepResource {
  type?: string
  title?: string
  url?: string
}

export interface RoadmapStepExercise {
  title?: string
  description?: string
  problem_statement?: string
  starter_code?: string
  solution_code?: string
  test_cases?: Array<{ input: string; expected: string }>
  difficulty?: string
}

export interface RoadmapStep {
  skill_name: string
  order: number
  estimated_hours: number
  concepts: string[]
  resources: RoadmapStepResource[]
  exercise?: RoadmapStepExercise | null
  is_completed?: boolean
}

export interface RoadmapData {
  goal: string
  steps: RoadmapStep[]
  total_estimated_hours: number
  skill_gaps: RoadmapSkillGap[]
}

export async function fetchRoadmap(assessmentId: string, goalName?: string): Promise<RoadmapData> {
  const url = new URL(`${API_BASE_URL}/assessments/${assessmentId}/roadmap`)
  if (goalName) {
    url.searchParams.append("goal_name", goalName)
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getAuthHeaders(),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Failed to generate or fetch learning roadmap")
  }
  return data
}

export interface TaskSubmissionPayload {
  skill_name: string
  solution_text?: string
  repo_url?: string
  notes?: string
}

export interface TaskRubricCriterion {
  criterion: string
  score: number
  max_score: number
  comments: string
}

export interface TaskFeedback {
  passed: boolean
  score: number
  summary: string
  strengths: string[]
  improvements: string[]
  rubric_breakdown: TaskRubricCriterion[]
}

export interface TaskSubmissionResponse {
  assessment_id: string
  skill_name: string
  status: "COMPLETED" | "IN_PROGRESS"
  feedback: TaskFeedback
  submitted_at: string
}

export async function submitTaskSolution(
  assessmentId: string,
  payload: TaskSubmissionPayload
): Promise<TaskSubmissionResponse> {
  const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/tasks/submit`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || "Failed to submit task solution")
  }
  return data
}
