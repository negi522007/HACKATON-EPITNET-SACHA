# Site Generator — Extraction & Art Direction (Python)

This folder contains steps 1 and 2 of the website generation pipeline (EPITNET 2026 Hackathon), in Python — consistent with steps 3 and 4 (composition, critique) handled by the other pair, also in Python.

## Contents

- **Step 1 — Extraction** (`src/pipeline/step1_extraction.py`): free text + optional form fields → structured JSON of the need. Primary provider: Groq (fallback Gemini).
- **Step 2 — Art Direction** (`src/pipeline/step2_art_direction.py`): JSON of the need (+ optional image) → 3 distinct creative variants. Primary provider: Gemini (multimodal, fallback Groq in text-only mode).
- **Orchestrator** (`src/api/generate.py`): single entry point for the platform team — chains both steps, manages session persistence, prepares the handoff to step 3.

## Setup

1. Create a virtual environment (recommended) and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Create your `.env` file from `.env.example`, with your keys:
   ```
   GEMINI_API_KEY=your_gemini_key
   GROQ_API_KEY=your_groq_key
   ```

## Running the tests

From the project root:

```bash
# Extraction only
python tests/test_extraction.py boulangerie
python tests/test_extraction.py cabinet_medical

# Full pipeline (extraction → art direction)
python tests/test_art_direction.py boulangerie

# Orchestrator (the real entry point for the platform team)
python tests/test_orchestrator.py boulangerie
```

Each script saves its result in `tests/fixtures/*.output.json`, for inspection and comparison across test cases (checking that the design genuinely varies by sector).

## How the platform team (or step 3) should use this module

Never call `step1_extraction.py` or `step2_art_direction.py` directly — only use `src/api/generate.py`:

```python
from src.api.generate import start_generation, select_variant, get_session

# 1. When the user submits their need (+ optional image)
result = start_generation(
    user_input="I'm Marie, I run a bakery...",
    optional_fields={"preferred_colors": "terracotta"},
    image={"buffer": uploaded_file_bytes, "mime_type": "image/png"},  # optional
)
session_id = result["session_id"]
# → display the 3 result["variants"] to the user (dynamic preview)

# 2. When the user picks a variant
session = select_variant(session_id, result["variants"][0]["id"])
# → pass session_id to step 3 (composition), which will call get_session(session_id)
#   once session["status"] == "ready_for_composition"
```

## Adding a new test case

Create a file `tests/fixtures/my_case.json`:
```json
{
  "userInput": "Free-text description of the need...",
  "optionalFields": {
    "preferred_colors": "optional",
    "style_keywords": "optional"
  }
}
```
Then run `python tests/test_art_direction.py my_case`.

## Testing with an image (logo or inspiration)

In `tests/test_art_direction.py`, uncomment the block:
```python
image = {"buffer": Path("path/to/logo.png").read_bytes(), "mime_type": "image/png"}
generate_art_direction(business_need, image)
```

The image is validated (PNG/JPEG/WebP format, 4 MB max) by `src/services/image_utils.py` before being sent to the LLM — a minimal safety net; the main validation (UX, user-facing error messages) remains the platform team's responsibility.

## Security measures already in place

- Every prompt strictly delimits user input (`<user_input>`, `<business_need>`) and instructs the model to never treat it as instructions.
- The JSON produced at each step is strictly validated (`_validate_structure`) before being used by the rest of the pipeline.
- API keys must never be committed — make sure your `.env` is properly ignored (`.gitignore`).

## Integration documentation

- **`PLATFORM_README.md`** — for the platform team: data format to send, upload handling, dynamic preview, sending back the user's choice.
- **`INTEGRATION.md`** — for the step 3 team (composition): how to read a session, full data structure, logo handling.

## Next steps (out of scope for this folder)

- Step 3 (composition) and step 4 (critique) — handled by the other generation pair, in Python, hooking into `get_session(session_id)`.
- HTML/CSS component library (`src/components/`) that the `hero_variant` / `layout_style` values generated here will reference.