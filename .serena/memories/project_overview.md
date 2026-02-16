# Shared Todo List - Project Overview

## Purpose
The Wavezly Todo List is a comprehensive real-time collaborative task management platform built for a small insurance agency (Allstate). It combines:
- Task Management with full CRUD, subtasks, attachments, notes, recurrence
- Team Collaboration via real-time chat, DMs, message reactions, presence tracking
- Strategic Planning (owner-only goals dashboard)
- AI-Powered Workflows (smart parsing, transcription, email generation)
- Analytics (activity feed, dashboard with stats)
- Outlook Integration (email-to-task conversion add-in)

## Target Users
- **Derrick** (Owner/Admin): Has access to Strategic Goals dashboard
- **Sefra** (Team Member): Standard user access
- Small insurance agency team (2-10 people)

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **AI**: Anthropic Claude API (parsing, enhancement, email generation) + OpenAI Whisper (transcription)
- **Storage**: Supabase Storage (file attachments)
- **Animation**: Framer Motion
- **Drag & Drop**: @dnd-kit
- **Testing**: Playwright E2E tests, Vitest unit tests
- **Deployment**: Railway (Docker)

## Production URL
https://shared-todo-list-production.up.railway.app

## Brand Colors
- Primary blue: `#0033A0`
- Gold accent: `#D4A853`
