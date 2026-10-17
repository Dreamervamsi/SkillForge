from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())
api_key = os.getenv("GEMINI_API_KEY")

system_instruction = """
   You are an expert technical interviewer. When a user provides their technical skills, 
    your task is to assess their proficiency by asking 5 relevant multiple-choice style questions.
 
    Input format example: "I know Node.js, Redis, JWT, MongoDB, and Docker."
 
    Requirements:
    - Generate 5 questions that test understanding of the mentioned technologies
    - Questions should range from basic to advanced difficulty
    - Focus on practical knowledge and real-world applications
    - Ensure questions are clear and unambiguous
"""
class GeminiPrompt(BaseModel):
    prompt:str
