# Interview Espresso

A private interview-practice app built for a friend who knows their work but
finds it difficult to turn that work into memorable interview answers.

Interview Espresso uses the open-weight
[SmolLM2 360M Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct)
model to create
role-specific questions and coach a practice transcript. Inference happens in a
Web Worker inside the browser with
[Transformers.js](https://huggingface.co/docs/transformers.js/). No account,
API key, or backend is required.

Built from scratch on October 5, 2026 for the
[Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01).

## What it does

1. Takes a target role, candidate background, job requirements, and practice goal.
2. Downloads and caches a quantized SmolLM2 360M Instruct model on the first run.
3. Generates six tailored interview questions locally.
4. Keeps the candidate's answers in React state only—nothing is uploaded or persisted.
5. Produces evidence-based coaching with strengths, improvements, and a next practice step.
6. Captures an optional real-user rating and quote for honest product feedback.

## Why open AI matters here

Interview materials often contain personal history, career plans, and details
about past employers. A browser-run open model lets the candidate practice
without sending that material to an application server. It also keeps the
inference layer inspectable and replaceable instead of tying the project to one
closed provider.

The first model download requires a network connection. After the model is
cached by the browser, inference can run locally. Browser cache eviction may
require a later download.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The first generated round downloads the
model files from Hugging Face; expect a longer wait than subsequent rounds.

## Quality checks

```bash
npm run lint
npm run build
npm audit
```

## Architecture

```text
Candidate input
     │
     ▼
React interface ──postMessage──▶ Web Worker
     │                              │
     │                              ▼
     │                    Transformers.js + SmolLM2
     │                              │
     ◀──────── generated text ──────┘
     │
     ▼
Practice transcript and coaching (memory only)
```

- `src/App.jsx` owns the interview flow and renders all model text safely through React.
- `src/aiClient.js` isolates worker messaging and request lifecycle handling.
- `src/model.worker.js` loads the model outside the main UI thread.
- Input lengths are bounded, and there are no HTML injection sinks or credential fields.
- A transparent deterministic question set appears if the model cannot load.

## Privacy and security

- No credentials are needed or accepted.
- No form or transcript data is written to browser storage.
- No analytics or third-party scripts are included.
- The only runtime network dependency is the model download from Hugging Face.
- A restrictive Content Security Policy limits scripts, workers, and network destinations.

Do not paste confidential employer information, personal identifiers, or
anything you do not have permission to use.

## Honest limitations

- SmolLM2 360M is intentionally compact and can produce generic or awkward text.
- Coaching is practice guidance, not a hiring prediction or professional career advice.
- The app does not evaluate voice delivery, pacing, or body language.
- The initial model download is large for a mobile connection.
- The fallback question set is not AI-generated and is clearly labeled in the UI.

## License and model attribution

Application code is available under the [MIT License](LICENSE).
SmolLM2 is distributed under Apache 2.0; its model card and limitations remain
authoritative. Transformers.js is distributed under Apache 2.0.
