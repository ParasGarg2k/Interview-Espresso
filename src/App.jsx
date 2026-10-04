import { useMemo, useState } from 'react'
import { runOpenModel } from './aiClient'
import './App.css'

const EMPTY_PROFILE = {
  candidateName: '',
  role: '',
  company: '',
  background: '',
  jobDescription: '',
  goal: '',
}

function cleanQuestions(text, profile) {
  const parsed = text
    .split(/\n+/)
    .map((line) => line
      .replace(/^\s*(?:(?:[-*•]|\d+[.)])\s*|question(?:\s+\d+)?:\s*)/i, '')
      .trim())
    .filter((line) => line.endsWith('?') && line.length > 15)

  const fallback = [
    `Give me the two-minute version of your story and why it points toward this ${profile.role} role.`,
    `Tell me about a difficult problem you owned. What did you try, and what changed because of your work?`,
    `Which requirement in this job description is your strongest match, and what evidence would convince an interviewer?`,
    `Describe a time you had incomplete information or a tight constraint. How did you decide what to do next?`,
    `What constructive feedback changed the way you work?`,
    profile.company
      ? `Why ${profile.company}, and what would you want to learn in your first 90 days?`
      : `What are you looking for in your next team, and what would you want to learn in your first 90 days?`,
  ]

  return [...new Set([...parsed, ...fallback])].slice(0, 6)
}

function buildQuestionPrompt(profile) {
  return `Create six concise interview questions tailored to this candidate and role.
Mix motivation, behavior, role skills, and reflection.
Return only questions. Do not give suggested answers, coaching, or commentary.

Role: ${profile.role}
Company: ${profile.company || 'Not specified'}
Candidate background: ${profile.background}
Job description: ${profile.jobDescription}
Practice goal: ${profile.goal || 'Build confidence and answer with concrete evidence'}`
}

function buildFeedbackPrompt(profile, questions, answers) {
  const transcript = questions
    .map((question, index) => `Question ${index + 1}: ${question}\nAnswer: ${answers[index] || '(skipped)'}`)
    .join('\n\n')

  return `You are a kind, specific interview coach. Review this practice transcript for a ${profile.role} interview.
Use only evidence in the answers. Do not invent achievements.
Write three short sections with these exact headings:
STRENGTHS: two specific things that worked.
SHARPEN: two precise improvements, including where more context, action, or result is needed.
NEXT REP: one rewritten answer outline using the STAR structure and one follow-up question to practice.

${transcript}`
}

function progressLabel(progress) {
  if (!progress) return 'Preparing the open model…'
  if (progress.status === 'progress' && Number.isFinite(progress.progress)) {
    return `Downloading model · ${Math.round(progress.progress)}%`
  }
  if (progress.status === 'ready') return 'Open model ready'
  return 'Loading the open model in your browser…'
}

function App() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [stage, setStage] = useState('setup')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [draftAnswer, setDraftAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [modelProgress, setModelProgress] = useState(null)
  const [modelState, setModelState] = useState('idle')
  const [notice, setNotice] = useState('')
  const [friendRating, setFriendRating] = useState(0)
  const [friendQuote, setFriendQuote] = useState('')

  const answeredCount = useMemo(
    () => answers.filter((answer) => answer?.trim()).length,
    [answers],
  )

  function updateProfile(event) {
    const { name, value } = event.target
    setProfile((current) => ({ ...current, [name]: value }))
  }

  async function generateInterview(event) {
    event.preventDefault()
    setNotice('')
    setModelState('loading')
    setModelProgress(null)

    try {
      await navigator.storage?.persist?.()
      const text = await runOpenModel(buildQuestionPrompt(profile), {
        maxNewTokens: 190,
        onProgress: setModelProgress,
      })
      const nextQuestions = cleanQuestions(text, profile)
      setQuestions(nextQuestions)
      setAnswers(Array(nextQuestions.length).fill(''))
      setModelState('ready')
      setStage('practice')
    } catch (error) {
      const fallbackQuestions = cleanQuestions('', profile)
      setQuestions(fallbackQuestions)
      setAnswers(Array(fallbackQuestions.length).fill(''))
      setModelState('fallback')
      setNotice(`The open model did not load, so a transparent backup set is shown. ${error.message}`)
      setStage('practice')
    }
  }

  function saveAnswer() {
    setAnswers((current) => {
      const next = [...current]
      next[currentQuestion] = draftAnswer.trim()
      return next
    })

    if (currentQuestion < questions.length - 1) {
      const nextIndex = currentQuestion + 1
      setCurrentQuestion(nextIndex)
      setDraftAnswer(answers[nextIndex] || '')
    }
  }

  function goToQuestion(index) {
    setAnswers((current) => {
      const next = [...current]
      next[currentQuestion] = draftAnswer.trim()
      return next
    })
    setCurrentQuestion(index)
    setDraftAnswer(answers[index] || '')
  }

  async function generateFeedback() {
    const finalAnswers = [...answers]
    finalAnswers[currentQuestion] = draftAnswer.trim()
    setAnswers(finalAnswers)
    setModelState('thinking')
    setNotice('')

    try {
      const text = await runOpenModel(
        buildFeedbackPrompt(profile, questions, finalAnswers),
        { maxNewTokens: 280, onProgress: setModelProgress },
      )
      setFeedback(text)
      setModelState('ready')
      setStage('results')
    } catch (error) {
      setModelState('fallback')
      setNotice(`Coaching could not be generated. Your private transcript is still available. ${error.message}`)
    }
  }

  async function copyFriendNotes() {
    const summary = `Interview Espresso friend test
Role: ${profile.role}
Rating: ${friendRating || 'Not rated'}/5
Feedback: ${friendQuote || 'No note added'}
Questions practiced: ${answeredCount}/${questions.length}`

    await navigator.clipboard.writeText(summary)
    setNotice('Friend-test notes copied. Paste them into your challenge write-up.')
  }

  function resetSession() {
    setStage('setup')
    setQuestions([])
    setAnswers([])
    setCurrentQuestion(0)
    setDraftAnswer('')
    setFeedback('')
    setModelState('idle')
    setModelProgress(null)
    setNotice('')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Interview Espresso home">
          <span className="brand-mark" aria-hidden="true">IE</span>
          <span>Interview Espresso</span>
        </a>
        <div className="privacy-pill"><span aria-hidden="true">●</span> Private by design</div>
      </header>

      <main>
        {stage === 'setup' && (
          <section className="setup-grid">
            <div className="hero-copy">
              <p className="eyebrow">A focused practice round for someone you care about</p>
              <h1>Walk into the interview with a story worth remembering.</h1>
              <p className="hero-lede">
                Tailored questions and candid coaching from an open model that runs
                inside your browser. No account. No API key. No résumé sent to a server.
              </p>
              <div className="trust-row" aria-label="Product principles">
                <span>Open model</span>
                <span>Local inference</span>
                <span>Zero data storage</span>
              </div>
              <aside className="friend-note">
                <span className="quote-mark" aria-hidden="true">“</span>
                <p>
                  Built for the friend who knows their work, but freezes when
                  someone says: “Tell me about yourself.”
                </p>
              </aside>
            </div>

            <form className="profile-card" onSubmit={generateInterview}>
              <div className="card-heading">
                <span className="step-label">01 · Set the scene</span>
                <h2>Make the practice feel real</h2>
                <p>Only the role and background are required. Keep private details out.</p>
              </div>

              <div className="field-row">
                <label>
                  Friend’s first name <span>Optional</span>
                  <input
                    name="candidateName"
                    value={profile.candidateName}
                    onChange={updateProfile}
                    maxLength="40"
                    placeholder="Aarav"
                    autoComplete="off"
                  />
                </label>
                <label>
                  Target role
                  <input
                    name="role"
                    value={profile.role}
                    onChange={updateProfile}
                    maxLength="80"
                    placeholder="Frontend engineer"
                    required
                  />
                </label>
              </div>

              <label>
                Company <span>Optional</span>
                <input
                  name="company"
                  value={profile.company}
                  onChange={updateProfile}
                  maxLength="80"
                  placeholder="A specific company or team"
                />
              </label>

              <label>
                Their background
                <textarea
                  name="background"
                  value={profile.background}
                  onChange={updateProfile}
                  maxLength="1000"
                  rows="4"
                  placeholder="2 years building React apps, led an accessibility cleanup, enjoys design systems…"
                  required
                />
                <small>{profile.background.length}/1000</small>
              </label>

              <label>
                Job description or key requirements
                <textarea
                  name="jobDescription"
                  value={profile.jobDescription}
                  onChange={updateProfile}
                  maxLength="2500"
                  rows="5"
                  placeholder="Paste the most important responsibilities and requirements."
                  required
                />
                <small>{profile.jobDescription.length}/2500</small>
              </label>

              <label>
                What should this practice improve? <span>Optional</span>
                <input
                  name="goal"
                  value={profile.goal}
                  onChange={updateProfile}
                  maxLength="200"
                  placeholder="Answering behavioral questions with concrete results"
                />
              </label>

              <button className="primary-button" type="submit" disabled={modelState === 'loading'}>
                {modelState === 'loading' ? progressLabel(modelProgress) : 'Brew a practice round'}
                <span aria-hidden="true">→</span>
              </button>
              <p className="model-note">
                First run downloads SmolLM2 360M Instruct from Hugging Face and caches it in
                this browser. Your form text stays on this device.
              </p>
            </form>
          </section>
        )}

        {stage === 'practice' && (
          <section className="practice-layout">
            <aside className="session-sidebar">
              <button className="text-button" type="button" onClick={resetSession}>← New session</button>
              <p className="eyebrow">Practice round</p>
              <h2>{profile.role}</h2>
              <p>{profile.company || 'Open interview practice'}</p>
              <div className="question-nav" aria-label="Interview questions">
                {questions.map((question, index) => (
                  <button
                    type="button"
                    className={index === currentQuestion ? 'active' : ''}
                    onClick={() => goToQuestion(index)}
                    key={question}
                    aria-label={`Go to question ${index + 1}`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span className={answers[index]?.trim() ? 'answered-dot' : 'empty-dot'} />
                  </button>
                ))}
              </div>
              <div className="local-badge">
                <span aria-hidden="true">●</span>
                {modelState === 'fallback' ? 'Backup questions' : 'Generated locally'}
              </div>
            </aside>

            <div className="practice-card">
              <div className="question-meta">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>{draftAnswer.length}/1800</span>
              </div>
              <h1>{questions[currentQuestion]}</h1>
              <p className="answer-hint">
                Try context → your action → the result → what you learned. Specific beats polished.
              </p>
              <textarea
                className="answer-box"
                value={draftAnswer}
                onChange={(event) => setDraftAnswer(event.target.value)}
                maxLength="1800"
                rows="10"
                placeholder="Write the answer as you would say it. Short notes are fine…"
                autoFocus
              />
              <div className="practice-actions">
                <button className="secondary-button" type="button" onClick={saveAnswer}>
                  {currentQuestion === questions.length - 1 ? 'Save answer' : 'Save & next'}
                </button>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={generateFeedback}
                  disabled={answeredCount === 0 && !draftAnswer.trim() || modelState === 'thinking'}
                >
                  {modelState === 'thinking' ? 'Reading your answers…' : 'Coach this round'}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              {notice && <p className="notice" role="status">{notice}</p>}
            </div>
          </section>
        )}

        {stage === 'results' && (
          <section className="results-layout">
            <div className="results-main">
              <button className="text-button" type="button" onClick={() => setStage('practice')}>
                ← Back to answers
              </button>
              <p className="eyebrow">Your coaching card</p>
              <h1>A stronger next rep starts here.</h1>
              <div className="feedback-card">
                <div className="feedback-header">
                  <span className="brand-mark" aria-hidden="true">AI</span>
                  <div>
                    <strong>Local open-model coach</strong>
                    <p>Based only on this practice transcript</p>
                  </div>
                </div>
                <div className="feedback-text">{feedback}</div>
              </div>
              <button className="secondary-button" type="button" onClick={resetSession}>
                Start another round
              </button>
            </div>

            <aside className="friend-test-card">
              <span className="step-label">Real-user check</span>
              <h2>Hand it to your friend</h2>
              <p>
                Ask them to complete one round. Capture what genuinely helped and
                what felt awkward—both make the project and its story stronger.
              </p>
              <fieldset>
                <legend>How useful was it?</legend>
                <div className="rating-row">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      type="button"
                      className={friendRating === rating ? 'selected' : ''}
                      onClick={() => setFriendRating(rating)}
                      key={rating}
                      aria-label={`${rating} out of 5`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>
                What did they say?
                <textarea
                  value={friendQuote}
                  onChange={(event) => setFriendQuote(event.target.value)}
                  maxLength="500"
                  rows="5"
                  placeholder="Use their real words. Don’t invent a quote."
                />
              </label>
              <button
                className="primary-button compact"
                type="button"
                onClick={copyFriendNotes}
                disabled={!friendRating && !friendQuote.trim()}
              >
                Copy test notes
              </button>
              {notice && <p className="notice" role="status">{notice}</p>}
            </aside>
          </section>
        )}
      </main>

      <footer>
        <p>Runs with SmolLM2 360M Instruct · Apache 2.0 · No credentials required</p>
        <p>Built for the Hacktoberfest Weekend Challenge 2026</p>
      </footer>
    </div>
  )
}

export default App
