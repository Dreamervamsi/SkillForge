import json
from typing import Optional
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI, Depends, HTTPException, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from google.genai import types
from .dependencies import get_client, get_current_user
from .config import (
    system_instruction,
    evaluation_instruction,
    adaptive_question_instruction,
    adaptive_answer_evaluation_instruction,
    question_pool_generation_instruction,
    skill_graph_generation_instruction,
    personalized_exercise_generation_instruction,
    AssessmentCreate,
    AssessmentAnswersSubmit,
    UserRegister,
    UserLogin,
    Token,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
    AnswerEvaluation,
    AdaptiveAnswerSubmission,
    RubricDimensionScore,
    ConceptEvidence,
    QuestionRubricEvaluation,
    CompetencyProfile,
    AssessmentCoverage,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from .adaptive_engine import (
    DifficultyLevel,
    determine_next_difficulty,
    select_next_question,
    select_next_question_from_all_pools,
    should_end_assessment,
    update_adaptive_path,
    calculate_overall_confidence,
    get_initial_difficulty,
)
from .competency import (
    aggregate_concept_evidence,
    calculate_assessment_coverage,
    generate_competency_profile,
)
from .skill_graph import SkillGraph
from .roadmap import RoadmapGenerator
from .dependencies import check_rate_limit
from .exceptions import GeminiException
from .auth import get_password_hash, verify_password, create_access_token, create_refresh_token_with_expiry, active_access_tokens
from .database import get_prisma
from .cache import skill_graph_cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Application starting up")

    # Schedule periodic cache cleanup
    async def periodic_cache_cleanup():
        while True:
            await asyncio.sleep(3600)  # Run every hour
            skill_graph_cache.clear_expired()

    # Start background task
    cleanup_task = asyncio.create_task(periodic_cache_cleanup())

    yield

    # Shutdown
    print("Application shutting down")
    cleanup_task.cancel()

app = FastAPI(lifespan=lifespan)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def home():
    return {
        "status" :" success"
    }

@app.get('/me')
async def get_me(current_username: str = Depends(get_current_user)):
    prisma = await get_prisma()
    user = await prisma.user.find_unique(
        where={"username": current_username},
        include={"assessments": True}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    assessments_summary = []
    for a in user.assessments:
        assessments_summary.append({
            "id": a.id,
            "goal": a.goal,
            "status": a.status,
            "createdAt": a.createdAt.isoformat() if a.createdAt else None,
            "result": a.result,
        })
        
    return {
        "username": user.username,
        "email": user.email,
        "assessments": assessments_summary,
        "assessmentCount": len(user.assessments)
    }

@app.post('/register')
async def register(user: UserRegister, response: Response):
    try:
        print(f"DEBUG: Register attempt - username: {user.username}, email: {user.email}")
        prisma = await get_prisma()

        # Check if user already exists
        existing_user = await prisma.user.find_first(
            where={
                'OR': [
                    {'username': user.username},
                    {'email': user.email}
                ]
            }
        )
        if existing_user:
            print(f"DEBUG: User already exists - {existing_user.username}")
            raise HTTPException(status_code=400, detail="User already exists")

        # Validate password length (bcrypt has 72-byte limit)
        if len(user.password.encode('utf-8')) > 72:
            raise HTTPException(
                status_code=400,
                detail="Password is too long. Maximum length is 72 characters. Please use a shorter password."
            )

        # Hash the password
        print("DEBUG: Hashing password...")
        hashed_password = get_password_hash(user.password)
        print("DEBUG: Password hashed successfully")

        # Create user in database
        print("DEBUG: Creating user in database...")
        new_user = await prisma.user.create({
            'username': user.username,
            'email': user.email,
            'hashedPassword': hashed_password
        })
        print(f"DEBUG: User created with ID: {new_user.id}")

        # Generate access token
        print("DEBUG: Generating access token...")
        access_token = create_access_token(
            data={"sub": new_user.username, "user_id": new_user.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        print("DEBUG: Access token generated")

        # Generate refresh token
        print("DEBUG: Generating refresh token...")
        refresh_token, expires_at = create_refresh_token_with_expiry()
        print("DEBUG: Refresh token generated")

        # refresh token in database
        print("DEBUG: Storing refresh token in database...")
        await prisma.refreshtoken.create({
            'token': refresh_token,
            'userId': new_user.id,
            'expiresAt': expires_at
        })
        print("DEBUG: Refresh token stored")

        # access token in-memory
        active_access_tokens[access_token] = new_user.id

        # refresh token in HTTP-only cookie
        print("DEBUG: Setting cookie...")
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            path="/",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        )
        print("DEBUG: Cookie set")

        print("DEBUG: Registration successful")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "username": new_user.username,
            "email": new_user.email
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Registration failed - {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error at register route: {str(e)}")

@app.post('/login')
async def login(user: UserLogin, response: Response):
    # Validate password length (bcrypt has 72-byte limit)
    if len(user.password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password is too long. Maximum length is 72 characters."
        )

    prisma = await get_prisma()

    existing_user = await prisma.user.find_first(
        where={
            'OR': [
                {'username': user.username_or_email},
                {'email': user.username_or_email}
            ]
        }
    )
    if existing_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_password_from_db = existing_user.hashedPassword
    is_valid = verify_password(user.password, hashed_password_from_db)
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(
        data={"sub": existing_user.username, "user_id": existing_user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
        
    # Generate refresh token
    refresh_token, expires_at = create_refresh_token_with_expiry()
        
    # refresh token in database
    await prisma.refreshtoken.create({
        'token': refresh_token,
        'userId': existing_user.id,
        'expiresAt': expires_at
    })
    
    # access token in-memory
    active_access_tokens[access_token] = existing_user.id
    
    # refresh token in HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": existing_user.username,
        "email": existing_user.email
    }

@app.post('/logout')
async def logout(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}

@app.post('/refresh')
async def refresh(request: Request, response: Response):
    prisma = await get_prisma()
    
    print("DEBUG: All cookies:", request.cookies)
    refresh_token = request.cookies.get("refresh_token")
    print("DEBUG: refresh_token from cookie:", refresh_token)
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    
    token_record = await prisma.refreshtoken.find_unique(
        where={'token': refresh_token}
    )
    
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Check if refresh token has expired
    from datetime import datetime, timezone
    if token_record.expiresAt < datetime.now(timezone.utc):
        # Delete expired token
        await prisma.refreshtoken.delete(
            where={'token': refresh_token}
        )
        raise HTTPException(status_code=401, detail="Refresh token expired")
    
    # Get associated user
    user = await prisma.user.find_unique(
        where={'id': token_record.userId}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Generate new access token
    new_access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Generate new refresh token (token rotation)
    new_refresh_token, new_expires_at = create_refresh_token_with_expiry()
    
    # Delete old refresh token
    await prisma.refreshtoken.delete(
        where={'token': refresh_token}
    )
    
    # Store new refresh token in database
    await prisma.refreshtoken.create({
        'token': new_refresh_token,
        'userId': user.id,
        'expiresAt': new_expires_at
    })
    
    # Store new access token in-memory
    active_access_tokens[new_access_token] = user.id
    
    # Set new refresh token in HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

# --- Assessment Endpoints ---
def _extract_json_from_response(response_text: str) -> dict:
    """Extract JSON from Gemini response, handling markdown code blocks."""
    if not response_text:
        raise ValueError("Empty response from Gemini")

    response_text = response_text.strip()

    # Remove markdown code blocks if present
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    # Find JSON object boundaries
    start_idx = response_text.find('{')
    end_idx = response_text.rfind('}')

    if start_idx == -1 or end_idx == -1:
        raise ValueError("Could not find JSON object in response")

    json_text = response_text[start_idx:end_idx + 1]
    return json.loads(json_text)

def _check_answer_correct(user_selection: str, correct_answer: str) -> bool:
    """Check if user's answer is correct, handling both letter-only and full text formats."""
    user_selection = user_selection.strip()
    correct_answer = correct_answer.strip()

    # If user selected just a letter (e.g., "A"), check if it matches the first letter of correct answer
    if len(user_selection) == 1 and user_selection.isalpha():
        return user_selection.upper() == correct_answer[0].upper()
    else:
        # Otherwise do exact match
        return user_selection == correct_answer

def _sanitize_questions_for_client(questions: list) -> list:
    """Strip correct answers before returning questions to the user."""
    sanitized = []
    for q in questions:
        q_copy = dict(q)
        q_copy.pop("correct_answer", None)
        sanitized.append(q_copy)
    return sanitized

@app.post('/assessments', status_code=status.HTTP_201_CREATED)
async def create_assessment(
    data: AssessmentCreate,
    _=Depends(check_rate_limit),
    current_username: str = Depends(get_current_user)
):
    prisma = await get_prisma()
    user = await prisma.user.find_unique(where={"username": current_username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    skills_list = data.skills if isinstance(data.skills, list) else [s.strip() for s in data.skills.split(",") if s.strip()]
    skills_str = ", ".join(skills_list)
    budget = data.question_budget or 5
    adaptive_mode = data.adaptive_mode or False

    try:
        client = get_client()

        # Generate skill dependency graph for the domain
        skill_graph = None
        try:
            domain = skills_str if len(skills_list) == 1 else f"{skills_list[0]} and related technologies"
            goal = data.goal or 'General Skill Assessment'

            # Check cache first
            cached_graph = skill_graph_cache.get(domain, goal)
            if cached_graph:
                print("DEBUG: Using cached skill graph")
                skill_graph = SkillGraph.from_dict(cached_graph)
            else:
                # Generate new skill graph
                prompt_text = f"Domain: {domain}\nGoal: {goal}\nPlease generate a skill dependency graph."
                config = types.GenerateContentConfig(system_instruction=skill_graph_generation_instruction)

                print(f"DEBUG: Calling Gemini API for skill graph...")
                res = client.models.generate_content(
                    model='gemini-3.5-flash-lite',
                    contents=prompt_text,
                    config=config
                )
                print(f"DEBUG: Gemini response received. Length: {len(res.text) if res.text else 0}")
                print(f"DEBUG: Raw response (first 500 chars): {res.text[:500] if res.text else 'Empty response'}")

                # Try to extract JSON from response (handle markdown code blocks)
                response_text = res.text.strip()

                # Remove markdown code blocks if present
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()

                # Find JSON object boundaries
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}')

                if start_idx != -1 and end_idx != -1:
                    json_text = response_text[start_idx:end_idx + 1]
                    print(f"DEBUG: Extracted JSON: {json_text[:200]}...")
                    graph_data = json.loads(json_text)
                    skill_graph = SkillGraph.from_dict(graph_data)
                    print("DEBUG: Skill graph generated successfully")

                    # Cache the skill graph
                    skill_graph_cache.set(domain, goal, skill_graph)
                else:
                    print(f"ERROR: Could not find JSON object in response")
                    skill_graph = None
        except json.JSONDecodeError as json_error:
            print(f"ERROR: Failed to parse Gemini response as JSON: {str(json_error)}")
            print(f"ERROR: Raw response: {res.text if res else 'No response'}")
            skill_graph = None
        except Exception as graph_error:
            print(f"ERROR: Error generating skill graph: {str(graph_error)}")
            import traceback
            traceback.print_exc()
            skill_graph = None

        if adaptive_mode:
            # Adaptive mode: Generate question pool (2-3 questions per difficulty level)
            initial_difficulty = get_initial_difficulty(skills_list, data.goal)
            questions_per_difficulty = min(3, max(2, budget // 4))  # 2-3 questions per difficulty

            try:
                prompt_text = f"Goal: {data.goal or 'General Skill Assessment'}\nSkills: {skills_str}\nPlease generate {questions_per_difficulty} questions for EACH difficulty level (beginner, intermediate, advanced, expert)."
                config = types.GenerateContentConfig(system_instruction=question_pool_generation_instruction)

                res = client.models.generate_content(
                    model='gemini-3.5-flash-lite',
                    contents=prompt_text,
                    config=config
                )
                ai_data = _extract_json_from_response(res.text)
                question_pool = ai_data.get("question_pool", {})
            except Exception as pool_error:
                print("Error generating question pool, falling back to single question:", str(pool_error))
                question_pool = {}

            # Start with first beginner question
            beginner_questions = question_pool.get("beginner", [])
            if beginner_questions:
                first_question = beginner_questions[0]
                questions = [first_question]
            else:
                # Fallback: generate single question if pool generation fails
                try:
                    prompt_text = f"Goal: {data.goal or 'General Skill Assessment'}\nSkills: {skills_str}\nDifficulty: {initial_difficulty}\nPlease generate exactly 1 question."
                    config = types.GenerateContentConfig(system_instruction=adaptive_question_instruction)
                    res = client.models.generate_content(
                        model='gemini-3.5-flash-lite',
                        contents=prompt_text,
                        config=config
                    )
                    ai_data = _extract_json_from_response(res.text)
                    questions = [ai_data.get("question", {})]
                    question_pool = {}
                except Exception as single_error:
                    print("Error generating single question:", str(single_error))
                    raise HTTPException(status_code=500, detail="Failed to generate initial question")

            # Ensure question IDs exist
            for idx, q in enumerate(questions, start=1):
                if "id" not in q:
                    q["id"] = idx

            # Reassign IDs in pool to be unique
            next_id = 2
            for difficulty in question_pool:
                for q in question_pool[difficulty]:
                    if "id" not in q or q["id"] < next_id:
                        q["id"] = next_id
                        next_id += 1

            # Validate question pool structure
            if not question_pool or not any(question_pool.values()):
                # Fallback: if pool is empty, generate single question
                try:
                    prompt_text = f"Goal: {data.goal or 'General Skill Assessment'}\nSkills: {skills_str}\nDifficulty: {initial_difficulty}\nPlease generate exactly 1 question."
                    config = types.GenerateContentConfig(system_instruction=adaptive_question_instruction)
                    res = client.models.generate_content(
                        model='gemini-3.5-flash-lite',
                        contents=prompt_text,
                        config=config
                    )
                    ai_data = _extract_json_from_response(res.text)
                    questions = [ai_data.get("question", {})]
                    question_pool = {}
                    next_id = 2
                except Exception as validation_error:
                    print("Error generating fallback question:", str(validation_error))
                    # Use the already generated questions if pool validation fails
                    pass

            assessment = await prisma.assessment.create({
                "userId": user.id,
                "goal": data.goal,
                "selectedSkills": json.dumps(skills_list),
                "questionBudget": budget,
                "timeLimit": data.time_limit_minutes,
                "status": "CREATED",
                "questions": json.dumps(questions),
                "answers": json.dumps([]),
                "currentDifficulty": initial_difficulty,
                "questionPool": json.dumps(question_pool),
                "adaptivePath": json.dumps([]),
                "nextQuestionIndex": 1,
                "skillGraph": json.dumps(skill_graph.to_dict()) if skill_graph else None,
            })
        else:
            # Non-adaptive mode: Generate all questions at once (original behavior)
            prompt_text = f"Goal: {data.goal or 'General Skill Assessment'}\nSkills: {skills_str}\nPlease generate exactly {budget} questions."
            config = types.GenerateContentConfig(system_instruction=system_instruction)

            res = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=prompt_text,
                config=config
            )
            ai_data = _extract_json_from_response(res.text)
            questions = ai_data.get("questions", [])

            # Ensure question IDs exist
            for idx, q in enumerate(questions, start=1):
                if "id" not in q:
                    q["id"] = idx

            assessment = await prisma.assessment.create({
                "userId": user.id,
                "goal": data.goal,
                "selectedSkills": json.dumps(skills_list),
                "questionBudget": budget,
                "timeLimit": data.time_limit_minutes,
                "status": "CREATED",
                "questions": json.dumps(questions),
                "answers": json.dumps([]),
                "skillGraph": json.dumps(skill_graph.to_dict()) if skill_graph else None,
            })

        return {
            "id": assessment.id,
            "goal": assessment.goal,
            "selected_skills": skills_list,
            "question_budget": assessment.questionBudget,
            "time_limit_minutes": assessment.timeLimit,
            "status": assessment.status,
            "adaptive_mode": adaptive_mode,
            "current_difficulty": assessment.currentDifficulty if adaptive_mode else None,
            "questions": _sanitize_questions_for_client(questions),
            "created_at": assessment.createdAt
        }
    except GeminiException as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e.message}")
    except Exception as e:
        print("Error creating assessment:", str(e))
        raise HTTPException(status_code=500, detail="Failed to create assessment session")

@app.get('/assessments/{assessment_id}')
async def get_assessment(
    assessment_id: str,
    _=Depends(check_rate_limit),
    current_username: str = Depends(get_current_user)
):
    prisma = await get_prisma()
    user = await prisma.user.find_unique(where={"username": current_username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assessment = await prisma.assessment.find_unique(where={"id": assessment_id})
    if not assessment or assessment.userId != user.id:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    questions = json.loads(assessment.questions) if isinstance(assessment.questions, str) else assessment.questions
    answers = json.loads(assessment.answers) if isinstance(assessment.answers, str) else assessment.answers
    skills = json.loads(assessment.selectedSkills) if isinstance(assessment.selectedSkills, str) else assessment.selectedSkills

    # Calculate remaining time if time limit is set and assessment has started
    remaining_seconds = None
    if assessment.timeLimit and assessment.startedAt:
        elapsed = (datetime.now(timezone.utc) - assessment.startedAt).total_seconds()
        total_allowed = assessment.timeLimit * 60
        remaining_seconds = max(0, int(total_allowed - elapsed))
        if remaining_seconds == 0 and assessment.status in ["CREATED", "IN_PROGRESS"]:
            await prisma.assessment.update(
                where={"id": assessment_id},
                data={"status": "EXPIRED"}
            )
            assessment.status = "EXPIRED"

    response = {
        "id": assessment.id,
        "goal": assessment.goal,
        "selected_skills": skills,
        "question_budget": assessment.questionBudget,
        "time_limit_minutes": assessment.timeLimit,
        "time_remaining_seconds": remaining_seconds,
        "status": assessment.status,
        "questions": _sanitize_questions_for_client(questions),
        "answers": answers,
        "started_at": assessment.startedAt,
        "created_at": assessment.createdAt
    }

    # Add adaptive-specific information if it's an adaptive assessment
    if assessment.currentDifficulty:
        response["adaptive_mode"] = True
        response["current_difficulty"] = assessment.currentDifficulty
        response["next_question_index"] = assessment.nextQuestionIndex
        adaptive_path = json.loads(assessment.adaptivePath) if isinstance(assessment.adaptivePath, str) else (assessment.adaptivePath if assessment.adaptivePath else [])
        response["adaptive_path"] = adaptive_path
    else:
        response["adaptive_mode"] = False

    return response

@app.post('/assessments/{assessment_id}/roadmap')
async def generate_roadmap(
    assessment_id: str,
    goal_name: str,
    _=Depends(check_rate_limit),
    current_username: str = Depends(get_current_user)
):
    """
    Generate a personalized learning roadmap based on assessment results.
    Compares competency profile with goal requirements and creates ordered learning path.
    """
    prisma = await get_prisma()
    user = await prisma.user.find_unique(where={"username": current_username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assessment = await prisma.assessment.find_unique(where={"id": assessment_id})
    if not assessment or assessment.userId != user.id:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    if assessment.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Assessment must be completed before generating roadmap")

    # Load skill graph
    skill_graph = None
    if assessment.skillGraph:
        try:
            graph_data = json.loads(assessment.skillGraph) if isinstance(assessment.skillGraph, str) else assessment.skillGraph
            skill_graph = SkillGraph.from_dict(graph_data)
        except Exception as e:
            print("Error loading skill graph:", str(e))
    
    if not skill_graph:
        raise HTTPException(status_code=400, detail="Skill graph not available for this assessment")

    # Load competency profile
    competency_profile = None
    if assessment.competencyEvidence:
        try:
            competency_data = json.loads(assessment.competencyEvidence) if isinstance(assessment.competencyEvidence, str) else assessment.competencyEvidence
            competency_profile = competency_data
        except Exception as e:
            print("Error loading competency profile:", str(e))
    
    if not competency_profile:
        raise HTTPException(status_code=400, detail="Competency profile not available")

    # Generate roadmap
    roadmap_generator = RoadmapGenerator(skill_graph)
    roadmap = roadmap_generator.generate_roadmap(competency_profile, goal_name)

    # Generate personalized exercises for each step
    try:
        client = get_client()
        exercises = {}

        for step in roadmap.steps:
            # Get current mastery level for this skill
            current_mastery = "none"
            for gap in roadmap.skill_gaps:
                if gap.skill_name == step.skill_name:
                    current_mastery = gap.current_mastery
                    break

            # Get skill node details
            skill_node = skill_graph.skills.get(step.skill_name)
            if not skill_node:
                continue

            # Generate personalized exercises
            prompt_text = f"Skill: {step.skill_name}\n"
            prompt_text += f"Concepts: {', '.join(step.concepts)}\n"
            prompt_text += f"Current mastery: {current_mastery}\n"
            prompt_text += f"Prerequisites: {', '.join(skill_node.prerequisites)}\n"
            prompt_text += "Please generate personalized exercises."

            config = types.GenerateContentConfig(system_instruction=personalized_exercise_generation_instruction)
            res = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=prompt_text,
                config=config
            )
            exercise_data = _extract_json_from_response(res.text)
            exercises[step.skill_name] = exercise_data

        # Update roadmap with exercises
        for step in roadmap.steps:
            if step.skill_name in exercises:
                step.exercise = exercises[step.skill_name]

    except Exception as e:
        print("Error generating exercises:", str(e))
        # Return roadmap without exercises if generation fails

    return roadmap.to_dict()

@app.post('/assessments/{assessment_id}/next-question')
async def get_next_question(
    assessment_id: str,
    previous_answer: Optional[AdaptiveAnswerSubmission] = None,
    _=Depends(check_rate_limit),
    current_username: str = Depends(get_current_user)
):
    """
    Get the next question in an adaptive assessment.
    Evaluates the previous answer (if provided) and generates the next question.
    """
    prisma = await get_prisma()
    user = await prisma.user.find_unique(where={"username": current_username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assessment = await prisma.assessment.find_unique(where={"id": assessment_id})
    if not assessment or assessment.userId != user.id:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    if assessment.status in ["COMPLETED", "EXPIRED"]:
        raise HTTPException(status_code=400, detail=f"Cannot get next question for assessment with status {assessment.status}")

    # Check if this is an adaptive assessment
    if not assessment.currentDifficulty:
        raise HTTPException(status_code=400, detail="This endpoint is only for adaptive assessments")

    questions = json.loads(assessment.questions) if isinstance(assessment.questions, str) else assessment.questions
    answers = json.loads(assessment.answers) if isinstance(assessment.answers, str) else assessment.answers
    adaptive_path = json.loads(assessment.adaptivePath) if isinstance(assessment.adaptivePath, str) else (assessment.adaptivePath if assessment.adaptivePath else [])
    skills = json.loads(assessment.selectedSkills) if isinstance(assessment.selectedSkills, str) else assessment.selectedSkills
    question_pool = json.loads(assessment.questionPool) if isinstance(assessment.questionPool, str) else (assessment.questionPool if assessment.questionPool else {})

    current_difficulty = assessment.currentDifficulty
    next_question_index = assessment.nextQuestionIndex

    # Track used question IDs
    used_question_ids = {q["id"] for q in questions}

    # Evaluate previous answer if provided
    if previous_answer:
        try:
            client = get_client()
            q_map = {q["id"]: q for q in questions}
            q_obj = q_map.get(previous_answer.question_id)

            if not q_obj:
                raise HTTPException(status_code=404, detail="Question not found")

            is_correct = _check_answer_correct(previous_answer.selected_option, q_obj.get("correct_answer", ""))

            # Store the answer
            answers.append({
                "question_id": previous_answer.question_id,
                "selected_option": previous_answer.selected_option
            })

            # Use AI to evaluate the answer
            input_text = f"Goal: {assessment.goal or 'Assessment'}\nSkills: {', '.join(skills)}\n"
            input_text += f"Question: {q_obj.get('question', '')}\n"
            input_text += f"Options: {q_obj.get('options', [])}\n"
            input_text += f"User selected: {previous_answer.selected_option}\n"
            input_text += f"Correct answer: {q_obj.get('correct_answer', 'N/A')}\n"
            input_text += f"Difficulty: {q_obj.get('difficulty', 'unknown')}\n"
            input_text += f"Concepts tested: {q_obj.get('concepts_tested', [])}\n"

            config = types.GenerateContentConfig(system_instruction=adaptive_answer_evaluation_instruction)
            res = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=input_text,
                config=config
            )
            eval_result = _extract_json_from_response(res.text)

            # Store rubric evaluation
            rubric_scores = json.loads(assessment.rubricScores) if isinstance(assessment.rubricScores, str) else (assessment.rubricScores if assessment.rubricScores else [])
            rubric_evaluation = {
                "question_id": previous_answer.question_id,
                "concept": q_obj.get("concepts_tested", ["general"])[0] if q_obj.get("concepts_tested") else "general",
                "rubric_scores": eval_result.get("rubric_scores", []),
                "overall_score": eval_result.get("overall_rubric_score", 0),
                "is_correct": eval_result.get("is_correct", is_correct),
                "reasoning_quality": eval_result.get("reasoning_quality", 0.5),
                "identified_gaps": eval_result.get("identified_gaps", []),
                "feedback": eval_result.get("feedback", ""),
                "strengths": eval_result.get("strengths", []),
                "weaknesses": eval_result.get("weaknesses", [])
            }
            rubric_scores.append(rubric_evaluation)

            # Update adaptive path with rubric information
            adaptive_path = update_adaptive_path(
                adaptive_path,
                previous_answer.question_id,
                q_obj.get("difficulty", current_difficulty),
                eval_result.get("is_correct", is_correct),
                eval_result.get("reasoning_quality", 0.5),
                eval_result.get("identified_gaps", [])
            )

            # Determine next difficulty using rubric scores if available
            overall_rubric = eval_result.get("overall_rubric_score", 0)
            if overall_rubric >= 3.0 and eval_result.get("reasoning_quality", 0) >= 0.7:
                # Strong performance, increase difficulty
                next_difficulty = DifficultyLevel.get_next_higher(current_difficulty)
            elif overall_rubric < 2.0:
                # Weak performance, decrease difficulty
                next_difficulty = DifficultyLevel.get_next_lower(current_difficulty)
            else:
                # Maintain current difficulty
                next_difficulty = determine_next_difficulty(
                    current_difficulty,
                    eval_result.get("is_correct", is_correct),
                    eval_result.get("reasoning_quality", 0.5),
                    eval_result.get("identified_gaps", [])
                )
            current_difficulty = next_difficulty

            # Check if assessment should end
            should_end, end_reason = should_end_assessment(
                len(answers),
                assessment.questionBudget,
                adaptive_path,
                current_difficulty
            )

            if should_end:
                # Generate competency evidence and coverage
                competency_evidence = aggregate_concept_evidence(rubric_scores, questions)
                competency_profile = generate_competency_profile(competency_evidence, adaptive_path)
                coverage = calculate_assessment_coverage(skills, questions)

                # Update assessment to completed
                await prisma.assessment.update(
                    where={"id": assessment_id},
                    data={
                        "status": "COMPLETED",
                        "completedAt": datetime.now(timezone.utc),
                        "adaptivePath": json.dumps(adaptive_path),
                        "currentDifficulty": current_difficulty,
                        "answers": json.dumps(answers),
                        "rubricScores": json.dumps(rubric_scores),
                        "competencyEvidence": json.dumps(competency_evidence),
                        "conceptCoverage": json.dumps(coverage),
                    }
                )
                return {
                    "assessment_ended": True,
                    "reason": end_reason,
                    "final_difficulty": current_difficulty,
                    "adaptive_path": adaptive_path,
                    "competency_profile": competency_profile
                }

            # Update assessment with new state
            await prisma.assessment.update(
                where={"id": assessment_id},
                data={
                    "adaptivePath": json.dumps(adaptive_path),
                    "currentDifficulty": current_difficulty,
                    "answers": json.dumps(answers),
                    "rubricScores": json.dumps(rubric_scores),
                }
            )

        except Exception as e:
            print("Error evaluating answer:", str(e))
            # Continue with simple evaluation if AI fails
            q_map = {q["id"]: q for q in questions}
            q_obj = q_map.get(previous_answer.question_id)
            is_correct = _check_answer_correct(previous_answer.selected_option, q_obj.get("correct_answer", "")) if q_obj else False
            answers.append({
                "question_id": previous_answer.question_id,
                "selected_option": previous_answer.selected_option
            })

            # Create minimal rubric evaluation
            rubric_scores = json.loads(assessment.rubricScores) if isinstance(assessment.rubricScores, str) else (assessment.rubricScores if assessment.rubricScores else [])
            rubric_evaluation = {
                "question_id": previous_answer.question_id,
                "concept": q_obj.get("concepts_tested", ["general"])[0] if q_obj.get("concepts_tested") else "general",
                "rubric_scores": [],
                "overall_score": 2.0 if is_correct else 0.0,
                "is_correct": is_correct,
                "reasoning_quality": 0.5 if is_correct else 0.0,
                "identified_gaps": [],
                "feedback": "AI evaluation failed, using simple correctness check",
                "strengths": [],
                "weaknesses": []
            }
            rubric_scores.append(rubric_evaluation)

            adaptive_path = update_adaptive_path(
                adaptive_path,
                previous_answer.question_id,
                current_difficulty,
                is_correct,
                0.5 if is_correct else 0.0,
                []
            )

    # Check if we've reached the question budget
    if next_question_index > assessment.questionBudget:
        # Generate competency evidence if rubric scores exist
        rubric_scores = json.loads(assessment.rubricScores) if isinstance(assessment.rubricScores, str) else (assessment.rubricScores if assessment.rubricScores else [])
        competency_evidence = None
        competency_profile = None
        coverage = None

        if rubric_scores:
            competency_evidence = aggregate_concept_evidence(rubric_scores, questions)
            competency_profile = generate_competency_profile(competency_evidence, adaptive_path)
            coverage = calculate_assessment_coverage(skills, questions)

        await prisma.assessment.update(
            where={"id": assessment_id},
            data={
                "status": "COMPLETED",
                "completedAt": datetime.now(timezone.utc),
                "adaptivePath": json.dumps(adaptive_path),
                "answers": json.dumps(answers),
                "rubricScores": json.dumps(rubric_scores),
                "competencyEvidence": json.dumps(competency_evidence) if competency_evidence else None,
                "conceptCoverage": json.dumps(coverage) if coverage else None,
            }
        )
        return {
            "assessment_ended": True,
            "reason": "Reached question budget",
            "adaptive_path": adaptive_path,
            "competency_profile": competency_profile
        }

    # Generate next question
    try:
        new_question = None

        # First, try to select from question pool
        question_from_pool, needs_generation = select_next_question(
            question_pool,
            current_difficulty,
            used_question_ids,
            skills,
            assessment.goal,
            None
        )

        if question_from_pool and not needs_generation:
            # Use question from pool
            new_question = question_from_pool
            used_question_ids.add(new_question["id"])
        else:
            # Try to find from any difficulty pool
            fallback_question = select_next_question_from_all_pools(
                question_pool,
                current_difficulty,
                used_question_ids
            )

            if fallback_question:
                new_question = fallback_question
                used_question_ids.add(new_question["id"])
            else:
                # Pool exhausted, generate new question
                try:
                    client = get_client()
                    prompt_text = f"Goal: {assessment.goal or 'General Skill Assessment'}\nSkills: {', '.join(skills)}\nDifficulty: {current_difficulty}\nPlease generate exactly 1 question."
                    config = types.GenerateContentConfig(system_instruction=adaptive_question_instruction)

                    res = client.models.generate_content(
                        model='gemini-3.5-flash-lite',
                        contents=prompt_text,
                        config=config
                    )
                    ai_data = _extract_json_from_response(res.text)
                    new_question = ai_data.get("question", {})

                    # Assign new question ID
                    new_question["id"] = next_question_index
                except Exception as generation_error:
                    print("Error generating fallback question:", str(generation_error))
                    # If generation fails, end the assessment
                    await prisma.assessment.update(
                        where={"id": assessment_id},
                        data={
                            "status": "COMPLETED",
                            "completedAt": datetime.now(timezone.utc),
                            "adaptivePath": json.dumps(adaptive_path),
                            "answers": json.dumps(answers),
                        }
                    )
                    return {
                        "assessment_ended": True,
                        "reason": "Question pool exhausted and generation failed",
                        "adaptive_path": adaptive_path
                    }

        if not new_question:
            # No question available, end assessment
            await prisma.assessment.update(
                where={"id": assessment_id},
                data={
                    "status": "COMPLETED",
                    "completedAt": datetime.now(timezone.utc),
                    "adaptivePath": json.dumps(adaptive_path),
                    "answers": json.dumps(answers),
                }
            )
            return {
                "assessment_ended": True,
                "reason": "No questions available",
                "adaptive_path": adaptive_path
            }

        # Add to questions list
        questions.append(new_question)

        # Update assessment
        updated_assessment = await prisma.assessment.update(
            where={"id": assessment_id},
            data={
                "questions": json.dumps(questions),
                "nextQuestionIndex": next_question_index + 1,
                "adaptivePath": json.dumps(adaptive_path),
                "currentDifficulty": current_difficulty,
                "status": "IN_PROGRESS",
                "startedAt": assessment.startedAt or datetime.now(timezone.utc),
            }
        )

        return {
            "question": _sanitize_questions_for_client([new_question])[0],
            "difficulty": current_difficulty,
            "question_index": next_question_index,
            "assessment_ended": False
        }

    except HTTPException:
        raise
    except Exception as e:
        print("Error generating next question:", str(e))
        # End assessment gracefully on error
        rubric_scores = json.loads(assessment.rubricScores) if isinstance(assessment.rubricScores, str) else (assessment.rubricScores if assessment.rubricScores else [])
        competency_evidence = None
        competency_profile = None
        coverage = None

        if rubric_scores:
            competency_evidence = aggregate_concept_evidence(rubric_scores, questions)
            competency_profile = generate_competency_profile(competency_evidence, adaptive_path)
            coverage = calculate_assessment_coverage(skills, questions)

        await prisma.assessment.update(
            where={"id": assessment_id},
            data={
                "status": "COMPLETED",
                "completedAt": datetime.now(timezone.utc),
                "adaptivePath": json.dumps(adaptive_path),
                "answers": json.dumps(answers),
                "rubricScores": json.dumps(rubric_scores),
                "competencyEvidence": json.dumps(competency_evidence) if competency_evidence else None,
                "conceptCoverage": json.dumps(coverage) if coverage else None,
            }
        )
        return {
            "assessment_ended": True,
            "reason": "Error generating next question",
            "adaptive_path": adaptive_path,
            "competency_profile": competency_profile
        }

@app.post('/assessments/{assessment_id}/answers')
async def submit_answers(
    assessment_id: str,
    payload: AssessmentAnswersSubmit,
    _=Depends(check_rate_limit),
    current_username: str = Depends(get_current_user)
):
    prisma = await get_prisma()
    user = await prisma.user.find_unique(where={"username": current_username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assessment = await prisma.assessment.find_unique(where={"id": assessment_id})
    if not assessment or assessment.userId != user.id:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    if assessment.status in ["COMPLETED", "EXPIRED"]:
        raise HTTPException(status_code=400, detail=f"Cannot update answers for an assessment with status {assessment.status}")

    # For adaptive assessments, answers should be submitted via /next-question endpoint
    if assessment.currentDifficulty:
        raise HTTPException(
            status_code=400,
            detail="For adaptive assessments, please use the /assessments/{id}/next-question endpoint to submit answers and get the next question"
        )

    now = datetime.now(timezone.utc)
    started_at = assessment.startedAt or now
    questions = json.loads(assessment.questions) if isinstance(assessment.questions, str) else assessment.questions
    existing_answers = json.loads(assessment.answers) if isinstance(assessment.answers, str) else assessment.answers

    # Merge or add new submitted answers
    answers_dict = {a["question_id"]: a["selected_option"] for a in existing_answers}
    for sub in payload.answers:
        answers_dict[sub.question_id] = sub.selected_option

    updated_answers = [{"question_id": k, "selected_option": v} for k, v in answers_dict.items()]

    should_finalize = payload.finalize or len(updated_answers) >= assessment.questionBudget
    new_status = "COMPLETED" if should_finalize else "IN_PROGRESS"

    eval_result = None
    rubric_scores_list = []
    if should_finalize:
        # Run evaluation via Gemini for each answer to get rubric scores
        try:
            client = get_client()
            skills_val = json.loads(assessment.selectedSkills) if isinstance(assessment.selectedSkills, str) else assessment.selectedSkills
            skills_str = ", ".join(skills_val) if isinstance(skills_val, list) else str(skills_val)

            q_map = {q["id"]: q for q in questions}

            # Evaluate each answer individually for rubric scoring
            for ans in updated_answers:
                q_obj = q_map.get(ans["question_id"], {})
                is_correct = _check_answer_correct(ans["selected_option"], q_obj.get("correct_answer", ""))

                input_text = f"Goal: {assessment.goal or 'Assessment'}\nSkills: {skills_str}\n"
                input_text += f"Question: {q_obj.get('question', '')}\n"
                input_text += f"Options: {q_obj.get('options', [])}\n"
                input_text += f"User selected: {ans['selected_option']}\n"
                input_text += f"Correct answer: {q_obj.get('correct_answer', 'N/A')}\n"
                input_text += f"Difficulty: {q_obj.get('difficulty', 'unknown')}\n"
                input_text += f"Concepts tested: {q_obj.get('concepts_tested', [])}\n"

                config = types.GenerateContentConfig(system_instruction=adaptive_answer_evaluation_instruction)
                res = client.models.generate_content(
                    model='gemini-3.5-flash-lite',
                    contents=input_text,
                    config=config
                )
                rubric_eval = _extract_json_from_response(res.text)

                rubric_evaluation = {
                    "question_id": ans["question_id"],
                    "concept": q_obj.get("concepts_tested", ["general"])[0] if q_obj.get("concepts_tested") else "general",
                    "rubric_scores": rubric_eval.get("rubric_scores", []),
                    "overall_score": rubric_eval.get("overall_rubric_score", 0),
                    "is_correct": rubric_eval.get("is_correct", is_correct),
                    "reasoning_quality": rubric_eval.get("reasoning_quality", 0.5),
                    "identified_gaps": rubric_eval.get("identified_gaps", []),
                    "feedback": rubric_eval.get("feedback", ""),
                    "strengths": rubric_eval.get("strengths", []),
                    "weaknesses": rubric_eval.get("weaknesses", [])
                }
                rubric_scores_list.append(rubric_evaluation)

            # Generate overall evaluation
            input_text = f"Goal: {assessment.goal or 'Assessment'}\nSkills: {skills_str}\nQuestions and Answers:\n"
            for ans in updated_answers:
                q_obj = q_map.get(ans["question_id"], {})
                input_text += f"\nQ{ans['question_id']}: {q_obj.get('question', '')}\nOptions: {q_obj.get('options', [])}\nUser selected: {ans['selected_option']}\nCorrect answer: {q_obj.get('correct_answer', 'N/A')}\n"

            config = types.GenerateContentConfig(system_instruction=evaluation_instruction)
            res = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=input_text,
                config=config
            )
            eval_result = _extract_json_from_response(res.text)

            # Generate competency evidence
            competency_evidence = aggregate_concept_evidence(rubric_scores_list, questions)
            competency_profile = generate_competency_profile(competency_evidence, [])
            coverage = calculate_assessment_coverage(skills_val, questions)

        except Exception as e:
            print("Error evaluating assessment:", str(e))
            eval_result = {"error": "Evaluation could not be generated"}
            competency_evidence = None
            competency_profile = None
            coverage = None

    updated_assessment = await prisma.assessment.update(
        where={"id": assessment_id},
        data={
            "answers": json.dumps(updated_answers),
            "status": new_status,
            "startedAt": started_at,
            "completedAt": now if should_finalize else None,
            "result": json.dumps(eval_result) if eval_result else assessment.result,
            "rubricScores": json.dumps(rubric_scores_list) if rubric_scores_list else None,
            "competencyEvidence": json.dumps(competency_evidence) if competency_evidence else None,
            "conceptCoverage": json.dumps(coverage) if coverage else None,
        }
    )

    return {
        "id": updated_assessment.id,
        "status": updated_assessment.status,
        "submitted_answers_count": len(updated_answers),
        "total_questions": len(questions),
        "completed_at": updated_assessment.completedAt
    }

@app.get('/assessments/{assessment_id}/results')
async def get_assessment_results(
    assessment_id: str,
    _=Depends(check_rate_limit),
    current_username: str = Depends(get_current_user)
):
    prisma = await get_prisma()
    user = await prisma.user.find_unique(where={"username": current_username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assessment = await prisma.assessment.find_unique(where={"id": assessment_id})
    if not assessment or assessment.userId != user.id:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    if assessment.status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail=f"Results are only available for COMPLETED assessments. Current status: {assessment.status}"
        )

    questions = json.loads(assessment.questions) if isinstance(assessment.questions, str) else assessment.questions
    answers = json.loads(assessment.answers) if isinstance(assessment.answers, str) else assessment.answers
    eval_result = json.loads(assessment.result) if isinstance(assessment.result, str) else assessment.result
    adaptive_path = json.loads(assessment.adaptivePath) if isinstance(assessment.adaptivePath, str) else (assessment.adaptivePath if assessment.adaptivePath else [])
    rubric_scores = json.loads(assessment.rubricScores) if isinstance(assessment.rubricScores, str) else (assessment.rubricScores if assessment.rubricScores else [])
    competency_evidence = json.loads(assessment.competencyEvidence) if isinstance(assessment.competencyEvidence, str) else assessment.competencyEvidence
    concept_coverage = json.loads(assessment.conceptCoverage) if isinstance(assessment.conceptCoverage, str) else assessment.conceptCoverage

    # Score calculation
    q_map = {q["id"]: q for q in questions}
    rubric_map = {rs["question_id"]: rs for rs in rubric_scores} if rubric_scores else {}
    correct_count = 0
    detailed_results = []
    for ans in answers:
        q_obj = q_map.get(ans["question_id"], {})
        is_correct = _check_answer_correct(ans["selected_option"], q_obj.get("correct_answer", ""))
        if is_correct:
            correct_count += 1

        # Include rubric evaluation if available
        rubric_eval = rubric_map.get(ans["question_id"], {})

        detailed_results.append({
            "question_id": ans["question_id"],
            "question": q_obj.get("question"),
            "user_selected": ans["selected_option"],
            "correct_answer": q_obj.get("correct_answer"),
            "is_correct": is_correct,
            "difficulty": q_obj.get("difficulty"),
            "concepts_tested": q_obj.get("concepts_tested"),
            "rubric_evaluation": rubric_eval if rubric_eval else None
        })

    total = len(questions)
    score_pct = round((correct_count / total * 100), 2) if total > 0 else 0.0

    result = {
        "id": assessment.id,
        "status": assessment.status,
        "score": {
            "correct": correct_count,
            "total": total,
            "percentage": score_pct
        },
        "detailed_results": detailed_results,
        "evaluation": eval_result,
        "completed_at": assessment.completedAt
    }

    # Add adaptive-specific information if it's an adaptive assessment
    if assessment.currentDifficulty:
        result["adaptive_mode"] = True
        result["final_difficulty"] = assessment.currentDifficulty
        result["adaptive_path"] = adaptive_path
        result["overall_confidence"] = calculate_overall_confidence(adaptive_path)

        # Add competency evidence if available
        if competency_evidence:
            result["competency_evidence"] = competency_evidence

        # Add concept coverage if available
        if concept_coverage:
            result["concept_coverage"] = concept_coverage

        # Generate competency profile if not already stored
        if competency_evidence and not result.get("competency_profile"):
            competency_profile = generate_competency_profile(competency_evidence, adaptive_path)
            result["competency_profile"] = competency_profile
    else:
        result["adaptive_mode"] = False

    return result

@app.get('/admin/cache/stats')
async def get_cache_stats(current_username: str = Depends(get_current_user)):
    """Get cache statistics (admin endpoint)."""
    return skill_graph_cache.get_stats()

@app.post('/admin/cache/clear')
async def clear_cache(current_username: str = Depends(get_current_user)):
    """Clear the skill graph cache (admin endpoint)."""
    skill_graph_cache.clear()
    return {"message": "Cache cleared successfully"}

@app.post('/admin/cache/clear-expired')
async def clear_expired_cache(current_username: str = Depends(get_current_user)):
    """Clear expired cache entries (admin endpoint)."""
    removed = skill_graph_cache.clear_expired()
    return {"message": f"Cleared {removed} expired entries"}