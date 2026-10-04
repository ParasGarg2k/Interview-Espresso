---
title: "I built my friend a private interview coach that runs in the browser"
published: false
tags: devchallenge, weekendchallenge, hf26challenge
---

> This is a submission for the
> [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01).

## What I Built

My friend **Aarav** is preparing for a **Frontend Engineer** role. He knows his
work, but he often freezes when someone asks for a clear, structured answer
without a script in front of him.

I built **Interview Espresso**, a focused practice app that turns a candidate's
background and a real job description into a six-question interview round. The
candidate writes answers in their own words, then a small open model gives
specific coaching about the evidence they used, what needs sharpening, and what
to practice next.

The important constraint is privacy: résumés and interview answers can contain
personal career history and employer details. The model runs inside a Web Worker
in the browser. There is no account, API key, application backend, analytics
script, or transcript database.

## Demo

**Video:** https://github.com/ParasGarg2k/Interview-Espresso/blob/main/demo-recording/submission.mp4

The shortest useful demo is:

1. Add a target role, candidate background, and a few job requirements.
2. Generate a tailored practice round.
3. Answer at least one question.
4. Generate a coaching card.
5. Show the real-user feedback capture.

## Code

**Repository:** https://github.com/ParasGarg2k/Interview-Espresso

Run it locally:

```bash
npm ci
npm run dev
```

## How I Built It

The UI uses React and Vite. Inference is isolated in a module Web Worker so
model loading and generation do not freeze the main interface.

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

The open core is **SmolLM2 360M Instruct**, loaded in quantized form with
Transformers.js and run through portable browser WASM. The model files are
cached after the first download, but candidate input and answers remain in React
state and disappear on refresh.

Small models do not always obey formatting instructions. Rather than hide that,
the app extracts valid questions and fills a short round with transparent,
role-aware backup prompts when needed. If the model cannot load at all, the UI
falls back gracefully instead of pretending AI ran successfully.

## Why Does Open Innovation Matter?

For this project, "open" changes what is possible rather than decorating the
stack.

- **Privacy:** interview content does not need to cross an application server.
- **Inspectability:** anyone can inspect the prompt, worker boundary, and exact model.
- **Replaceability:** the app is not coupled to one closed provider or pricing plan.
- **Resilience:** after the browser cache is warm, practice does not depend on an inference API being available.

The trade-off is honest too: a 360M-parameter model is compact enough for the
browser, but its coaching can be less nuanced than a large hosted model. I
designed the app around one narrow task, bounded inputs, and evidence-based
feedback instead of asking the model to be a general career oracle.

## What my friend said

- Usefulness rating: **4.5/5**
- Their words: **"This felt like a real practice run, not a generic AI chatbot. I liked that it pushed me to explain my work with examples and results."**
- What I changed after watching them use it: **I shortened the onboarding flow and made the answer prompts more specific so they could answer in a more natural, interview-like voice.**

## What I learned

The first model I tested technically worked, but generated an unusable question.
I replaced it with an instruction-tuned model and kept a deterministic fallback.
That was a useful reminder that a successful inference call is not the same as
a useful product.

I also learned to treat the write-up and user test as part of the build. The
most persuasive evidence is not a long feature list; it is one person completing
one useful practice round and telling me what should improve.

## My Agent Session

I used a Copilot-style coding session to iterate quickly on the UI flow,
troubleshoot model-loading timeouts, and tighten the fallback behavior. The final
product was reviewed for privacy, usability, and interview usefulness before
submission.

## Prize Categories

No partner category is claimed. Interview Espresso is entered for the overall
challenge because open-source AI is central to the product.
