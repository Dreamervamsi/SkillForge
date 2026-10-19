import json
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException, Response, Request, status
from google.genai import types
from .dependencies import get_client, get_current_user
from .config import (
    system_instruction,
    evaluation_instruction,
    AssessmentCreate,
    AssessmentAnswersSubmit,
    UserRegister,
    UserLogin,
    Token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from .dependencies import check_rate_limit
from .exceptions import GeminiException
from .auth import get_password_hash, verify_password, create_access_token, create_refresh_token_with_expiry, active_access_tokens
from .database import get_prisma

app = FastAPI()

@app.get('/')
def home():
    return {
        "status" :" success"
    }

@app.post('/register')
async def register(user: UserRegister, response: Response):
    try:
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
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Hash the password
        hashed_password = get_password_hash(user.password)
        
        # Create user in database
        new_user = await prisma.user.create({
            'username': user.username,
            'email': user.email,
            'hashedPassword': hashed_password
        })
        
        # Generate access token
        access_token = create_access_token(
            data={"sub": new_user.username, "user_id": new_user.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        # Generate refresh token
        refresh_token, expires_at = create_refresh_token_with_expiry()
        
        # refresh token in database
        await prisma.refreshtoken.create({
            'token': refresh_token,
            'userId': new_user.id,
            'expiresAt': expires_at
        })
        
        # access token in-memory
        active_access_tokens[access_token] = new_user.id
        
        # refresh token in HTTP-only cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "username": new_user.username,
            "email": new_user.email
        }
    except Exception as e:
        print(str(e))
        return {
            "status":"Failure",
            "Message": "Internal error at register route"
        }

@app.post('/login')
async def login(user: UserLogin, response: Response):
    prisma = await get_prisma()
        
    existing_user = await prisma.user.find_first(
        where={
            'email': user.email
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
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": existing_user.username,
        "email": existing_user.email
    }

@app.post('/refresh')
async def refresh(request: Request, response: Response):
    prisma = await get_prisma()
    
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token not found")
    
    token_record = await prisma.refreshtoken.find_unique(
        where={'token': refresh_token}
    )
    
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Check if refresh token has expired
    from datetime import datetime
    if token_record.expiresAt < datetime.utcnow():
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
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

# --- Assessment Endpoints ---
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

    try:
        client = get_client()
        prompt_text = f"Goal: {data.goal or 'General Skill Assessment'}\nSkills: {skills_str}\nPlease generate exactly {budget} questions."
        config = types.GenerateContentConfig(system_instruction=system_instruction)

        res = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_text,
            config=config
        )
        ai_data = json.loads(res.text)
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
        })

        return {
            "id": assessment.id,
            "goal": assessment.goal,
            "selected_skills": skills_list,
            "question_budget": assessment.questionBudget,
            "time_limit_minutes": assessment.timeLimit,
            "status": assessment.status,
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

    return {
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
    if should_finalize:
        # Run evaluation via Gemini
        try:
            client = get_client()
            skills_val = json.loads(assessment.selectedSkills) if isinstance(assessment.selectedSkills, str) else assessment.selectedSkills
            skills_str = ", ".join(skills_val) if isinstance(skills_val, list) else str(skills_val)

            q_map = {q["id"]: q for q in questions}
            input_text = f"Goal: {assessment.goal or 'Assessment'}\nSkills: {skills_str}\nQuestions and Answers:\n"
            for ans in updated_answers:
                q_obj = q_map.get(ans["question_id"], {})
                input_text += f"\nQ{ans['question_id']}: {q_obj.get('question', '')}\nOptions: {q_obj.get('options', [])}\nUser selected: {ans['selected_option']}\nCorrect answer: {q_obj.get('correct_answer', 'N/A')}\n"

            config = types.GenerateContentConfig(system_instruction=evaluation_instruction)
            res = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=input_text,
                config=config
            )
            eval_result = json.loads(res.text)
        except Exception as e:
            print("Error evaluating assessment:", str(e))
            eval_result = {"error": "Evaluation could not be generated"}

    updated_assessment = await prisma.assessment.update(
        where={"id": assessment_id},
        data={
            "answers": json.dumps(updated_answers),
            "status": new_status,
            "startedAt": started_at,
            "completedAt": now if should_finalize else None,
            "result": json.dumps(eval_result) if eval_result else assessment.result
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

    # Score calculation
    q_map = {q["id"]: q for q in questions}
    correct_count = 0
    detailed_results = []
    for ans in answers:
        q_obj = q_map.get(ans["question_id"], {})
        is_correct = (ans["selected_option"] == q_obj.get("correct_answer"))
        if is_correct:
            correct_count += 1
        detailed_results.append({
            "question_id": ans["question_id"],
            "question": q_obj.get("question"),
            "user_selected": ans["selected_option"],
            "correct_answer": q_obj.get("correct_answer"),
            "is_correct": is_correct
        })

    total = len(questions)
    score_pct = round((correct_count / total * 100), 2) if total > 0 else 0.0

    return {
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