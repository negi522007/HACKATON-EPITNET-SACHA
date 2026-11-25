# Sacha: AI showcase website generator

**1st place at the EPITNET 2026 Hackathon** (organized by Epitech Africa and ITNET Technologies).

Sacha turns a plain text description of a business into a ready-to-use showcase website, then deploys it automatically. A baker, a medical practice or a small shop describes what they need in a few sentences, and gets a live, responsive website in minutes.

## How it works

1. **Extraction**: the user's free text (and optional fields such as preferred colors) is turned into a structured JSON description of the business need. Primary provider: Groq, with Gemini as fallback.
2. **Art direction**: from that need (and an optional logo or inspiration image), the engine proposes 3 distinct creative variants. Primary provider: Gemini (multimodal), with Groq as fallback.
3. **Composition**: the chosen variant is assembled into a clean, responsive site using templates (Jinja2).
4. **Deployment**: the site is built and deployed automatically to Wayhost.

## Highlights

* Authentic, diverse websites that adapt their design to the business sector
* Technical choices optimized for minimal cost per generated site
* System prompts hardened against prompt injection
* Session-based orchestration so the platform can resume and track each generation

## Tech stack

* **AI engine**: Python, Groq API, Gemini API, Jinja2, Pydantic
* **Platform**: Next.js, TypeScript, Tailwind CSS, Prisma
* **Deployment**: automated pipeline to Wayhost

## Repository structure

```
engine/     Python generation engine (extraction, art direction, orchestrator)
Frontend/   Next.js web platform
```

## Run the engine locally

```bash
cd engine/site-generator-full
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your GEMINI_API_KEY and GROQ_API_KEY
python tests/test_orchestrator.py boulangerie
```

## My role

I was in charge of generating authentic and diverse showcase websites from client needs: extraction and art direction steps, prompt design (including protection against prompt injection) and cost-efficient technical choices.

## Author

Exaucé AGBODJALOU, [LinkedIn](https://www.linkedin.com/in/exauce-agbodjalou)
