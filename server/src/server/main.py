import json
from fastapi import FastAPI, Depends, HTTPException, Response
from google.genai import types
from .dependencies import get_client, get_current_user
from .config import system_instruction, evaluation_instruction, GeminiPrompt, EvaluationRequest, UserRegister, UserLogin, Token, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from .dependencies import check_rate_limit
from .exceptions import GeminiException
from .auth import get_password_hash, verify_password, create_access_token, create_refresh_token_with_expiry, active_access_tokens
from .database import get_prisma
from datetime import timedelta

app = FastAPI()

@app.get('/')
def home():
    return {
        "status" :" success"
    }

@app.post('/register')
async def register(user: UserRegister, response: Response):
    """
    Register a new user with JWT authentication.
    - Stores user in database
    - Checks if user already exists
    - Generates access token (stored in-memory)
    - Generates refresh token (stored in HTTP-only cookie)
    """
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
    
    # Generate refresh token with expiry
    refresh_token, expires_at = create_refresh_token_with_expiry()
    
    # Store refresh token in database
    await prisma.refreshtoken.create({
        'token': refresh_token,
        'userId': new_user.id,
        'expiresAt': expires_at
    })
    
    # Store access token in-memory
    active_access_tokens[access_token] = new_user.id
    
    # Set refresh token in HTTP-only cookie
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

@app.post('/login')
async def login(user: UserLogin):
    """
    Login a user and return a JWT token.
    Note: This is a boilerplate. In production, you should:
    - Retrieve user from database
    - Verify the hashed password
    - Handle invalid credentials
    """
    # TODO: Retrieve user from database and verify password
    # For now, just generate a token
    
    # Verify password (mock - in production, compare with database)
    # is_valid = verify_password(user.password, hashed_password_from_db)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=30)
    )
    
    return Token(access_token=access_token, token_type="bearer")

@app.get('/protected')
async def protected_route(current_user: str = Depends(get_current_user)):
    """
    Example of a protected route that requires authentication.
    """
    return {
        "message": f"Hello {current_user}, you have access to this protected route"
    }

@app.post('/chat')
def chat(prompt:GeminiPrompt,_=Depends(check_rate_limit), current_user: str = Depends(get_current_user)):
    try:
        client = get_client()
        
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
        )

        res = client.models.generate_content(
            model = 'gemini-2.5-flash',
            contents = prompt.prompt,
            config = config
        )
        response_data = json.loads(res.text)
        return {
            "skills": response_data['skills'],
            "questions" : response_data['questions']
        }
    except GeminiException as e:
        return {
            "message" : e.message,
            "status" : e.status_code
        }
    except Exception as e:
        print(str(e))
        return {
            "message": "Internal error"
        }

@app.post('/evaluate')        
async def evaluate(request: EvaluationRequest,_=Depends(check_rate_limit), current_user: str = Depends(get_current_user)):
    try:
        client = get_client()
        
        input_text = f"""
            Skills: {request.skills}
 
            Questions and Answers:
        """
        for i, (question, answer) in enumerate(zip(request.questions, request.answers)):
            input_text += f"""
                Q{i+1}: {question['question']}
                Options: {question['options']}
                User selected: {answer.selected_option}
            """
        
        config = types.GenerateContentConfig(
            system_instruction=evaluation_instruction,
        )
 
        res = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=input_text,
            config=config
        )
 
        evaluation_data = json.loads(res.text)
        return evaluation_data
    except GeminiException as e:
        return {
            "message": e.message,
            "status": e.status_code
        }