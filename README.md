# SkillForge

A full-stack application for building AI-powered workflows and skills with a visual interface.

## Overview

SkillForge combines the power of Google's Gemini AI with an intuitive visual workflow builder. The application allows users to create, manage, and execute AI-driven tasks through a node-based interface, making complex AI interactions accessible and easy to orchestrate.

## Architecture

The project consists of two main components:

### Backend (Server)
- **Framework**: FastAPI with Python 3.13
- **AI Integration**: Google Gemini 2.5 Flash via Google GenAI SDK
- **Database**: Prisma ORM
- **Rate Limiting**: Token bucket algorithm with per-client IP-based limiting
- **Validation**: Pydantic for data validation

### Frontend
- **Framework**: Next.js 16 with React 19
- **Visual Editor**: React Flow (@xyflow/react) for node-based workflow creation
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Key Features

- **AI Chat Interface**: Interact with Gemini AI through a REST API
- **Visual Workflow Builder**: Create and manage AI-powered workflows using a drag-and-drop node interface
- **Rate Limiting**: Per-client rate limiting to ensure fair usage and prevent abuse
- **Modern Tech Stack**: Built with the latest versions of FastAPI, Next.js, and React

## Project Structure

```
SkillForge/
├── server/                 # FastAPI backend
│   ├── src/
│   │   └── server/
│   │       ├── main.py          # FastAPI application and routes
│   │       ├── config.py        # Configuration settings
│   │       ├── dependencies.py # Dependency injection
│   │       ├── exceptions.py   # Custom exceptions
│   │       └── rate_limiter.py # Token bucket rate limiter
│   ├── pyproject.toml       # Python project configuration
│   └── requirements.txt     # Python dependencies
│
└── frontend/               # Next.js frontend
    ├── src/
    │   └── app/
    │       ├── page.tsx         # Main page
    │       ├── layout.tsx      # Root layout
    │       └── globals.css     # Global styles
    ├── package.json         # Node.js dependencies
    └── next.config.ts      # Next.js configuration
```

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 20+
- uv (Python package manager)

### Backend Setup

```bash
cd server
uv sync
uv run server
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

- `GET /` - Health check endpoint
- `POST /chat` - Chat with Gemini AI (accepts prompt, returns AI response)

## Technology Stack

### Backend
- FastAPI - Modern, fast web framework for building APIs
- Google GenAI - SDK for interacting with Gemini AI models
- Prisma - Type-safe ORM for database access
- Pydantic - Data validation using Python type annotations
- Uvicorn - ASGI server for running FastAPI

### Frontend
- Next.js - React framework with server-side rendering
- React Flow - Library for building node-based editors and diagrams
- Tailwind CSS - Utility-first CSS framework
- TypeScript - Type-safe JavaScript

## License

[Add your license here]
