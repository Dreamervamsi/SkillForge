import json
from fastapi import FastAPI
from google.genai import types
from .dependencies import get_client
from .config import system_instruction, evaluation_instruction, GeminiPrompt, EvaluationRequest
from .dependencies import check_rate_limit
from .exceptions import GeminiException
from fastapi import Depends

app = FastAPI()

@app.get('/')
def home():
    return {
        "status" :" success"
    }

@app.post('/chat')
def chat(prompt:GeminiPrompt,_=Depends(check_rate_limit)):
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
async def evaluate(request: EvaluationRequest,_=Depends(check_rate_limit)):
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
 
        return {
            "evaluation": res.text
        }
    except GeminiException as e:
        return {
            "message": e.message,
            "status": e.status_code
        }