import { toast } from "sonner"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
