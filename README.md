# LessonCraft AI

**Research-backed, AI-assisted lesson creation with two independent quality-control reviews.**

LessonCraft AI is a full-stack instructor workspace. Enter a lesson title and learning objective, gather supporting resources, generate a structured lesson designed for a 45-minute session, review two separate QC reports, edit and save the lesson, preview it, and export a PDF.

> **Project status:** This repository contains complete project implementation. External API availability, quotas, and MongoDB configuration affect runtime behaviour. AI-generated content and QC findings require instructor review; a model-generated PASS is not a guarantee of factual correctness.

## Features

- **Lesson generation:** accepts a lesson title and learning objective and generates structured lesson content with outcomes, prerequisites, explanations, examples, activities, a knowledge check, and takeaways.
- **45-minute design:** the generator requests 5–7 sections whose durations total exactly 45 minutes. The backend validates the total before returning the lesson.
- **Research sources:**
  - Websites through Tavily Search API (optional API key).
  - Books through Google Books API (no key configured by this implementation).
  - YouTube videos through YouTube Data API v3 (optional API key).
- **Gemini integration:** Google Gemini is used for lesson generation and both QC reviews.
- **Two separate QC layers:**
  1. Research and factual-accuracy review: unsupported claims, source relevance/credibility, gaps, contradictions, and misleading simplifications.
  2. Instructional-quality review: objective alignment, clarity, sequencing, examples, practical application, assessment, and timing.
- **Instructor workflow:** edit lesson content, save and reload lessons from MongoDB, view a preview, and export a PDF containing lesson content, references, warnings, and available QC reports.
- **API safeguards:** request validation with Zod, Helmet security headers, CORS configuration, and API rate limiting.

## Technology stack

| Layer               | Technologies                                             |
| ------------------- | -------------------------------------------------------- |
| Frontend            | React 18, TypeScript, Vite, lucide-react                 |
| Backend             | Node.js, Express, TypeScript                             |
| Database            | MongoDB, Mongoose                                        |
| AI                  | Google Gemini via `@google/genai`                        |
| Research            | Tavily Search API, Google Books API, YouTube Data API v3 |
| Validation / export | Zod, PDFKit                                              |

## Requirements

- Node.js 20 or later (recommended) and npm.
- MongoDB Community Server running locally, or a MongoDB Atlas connection string.
- A Google Gemini API key.
- Optional Tavily API key for website search.
- Optional YouTube Data API v3 key for video search.

Google Books lookup is attempted without a key. If an external research provider is unavailable, the research service records a warning and continues with the other available sources.

## Local setup

Run the commands from the repository root (the directory containing the root `package.json`).

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend environment

Copy `server/.env.example` to `server/.env` and fill in the values:

**Windows PowerShell**

```powershell
Copy-Item server/.env.example server/.env
```

**macOS / Linux**

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/lessoncraft
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
TAVILY_API_KEY=your_tavily_api_key
YOUTUBE_API_KEY=your_youtube_data_api_key
```

Notes:

- Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
- `GEMINI_API_KEY` is required for lesson generation and both QC audits.
- `TAVILY_API_KEY` and `YOUTUBE_API_KEY` are optional. Without them, the corresponding research providers are skipped and a warning is returned.
- Google Books is queried directly by the research service. If it cannot be reached, the lesson workflow can continue with other available sources.
- For MongoDB Atlas, use the connection string for a **database user**, not your Atlas website login. URL-encode special characters in the password and allow your client IP in Atlas Network Access.
- Never commit `server/.env` or paste API keys/passwords into source files.

### 3. Configure the frontend (if needed)

The frontend defaults to the Vite development server on port `5173` and uses `http://localhost:4000/api` as its API base URL. If your local setup requires an explicit Vite variable, create `client/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

### 4. Start MongoDB

Start your local MongoDB service, or confirm that your Atlas URI is reachable from your machine.

### 5. Start the application

From the project root:

```bash
npm run dev
```

Open the frontend at [http://localhost:5173](http://localhost:5173). The backend API runs at [http://localhost:4000](http://localhost:4000).

Health endpoint:

```text
GET http://localhost:4000/api/health
```

A healthy response includes `status: "ok"` and reports whether Mongoose is connected. Persistence features require a working MongoDB connection.

## Build and tests

Build both workspaces:

```bash
npm run build
```

Run the backend test suite:

```bash
npm test
```

The repository includes a manual acceptance checklist at [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md). Its cases are marked **Not run** until they have been executed in the configured environment. Do not interpret the checklist as evidence that every test has passed.

## Demonstration workflow

Use the following two scenarios to demonstrate the complete workflow.

### Test 1 — HTTP Requests and Responses

**Lesson title:** `HTTP Requests and Responses`

**Learning objective:** `Explain GET and POST methods and distinguish between 2xx, 4xx, and 5xx response status categories.`

1. Generate the lesson and inspect the research coverage and warnings.
2. Review the generated explanations, examples, activities, knowledge check, and references.
3. Run both QC layers and inspect their reports independently.
4. Make an instructor edit and save the lesson.
5. Open the preview and export the lesson and QC reports as a PDF.

### Test 2 — SQL Joins

**Lesson title:** `SQL Joins`

**Learning objective:** `Explain INNER JOIN, LEFT JOIN and RIGHT JOIN and demonstrate how they combine records from multiple relational database tables.`

Repeat the same workflow. Confirm that the generated section durations total 45 minutes and that the two QC reports are separate.

## API overview

All lesson endpoints are mounted under `/api/lessons`.

| Method | Endpoint                        | Purpose                                                    |
| ------ | ------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/health`                   | API and MongoDB connection status                          |
| POST   | `/api/lessons/research`         | Research sources and warnings                              |
| POST   | `/api/lessons/generate`         | Research and generate a lesson                             |
| POST   | `/api/lessons/qc/research`      | Run factual/research QC                                    |
| POST   | `/api/lessons/qc/instructional` | Run instructional QC                                       |
| POST   | `/api/lessons/qc/all`           | Run both independent QC audits                             |
| GET    | `/api/lessons`                  | List saved lessons                                         |
| GET    | `/api/lessons/:id`              | Retrieve a saved lesson                                    |
| POST   | `/api/lessons/save`             | Create or update a lesson                                  |
| DELETE | `/api/lessons/:id`              | Delete a saved lesson                                      |
| POST   | `/api/lessons/export`           | Export lesson, references, warnings, and QC reports as PDF |

## Project structure

```text
lessoncraft-ai/
├── client/
│   ├── src/                 # React application and styles
│   └── package.json
├── server/
│   ├── src/
│   │   ├── models/          # Mongoose lesson model
│   │   ├── routes/          # Research, generation, QC, save, export APIs
│   │   ├── services/        # Gemini and research integrations
│   │   └── index.ts         # Express server and health endpoint
│   ├── .env.example         # Backend environment template
│   └── package.json
├── docs/
│   └── TEST-REPORT.md       # Manual acceptance checklist
├── .env.example             # Environment variable reference
├── .gitignore
├── package.json
└── README.md
```

## Architecture and implementation notes

- **Research and generation are separate services.** Search results are represented as source records and passed to Gemini as research material. The lesson stores source references with the generated content.
- **The QC layers are independent.** Research/factual QC and instructional QC use different prompts and return separate reports. The combined endpoint runs them concurrently.
- **The 45-minute constraint is validated.** The generation service checks that section durations sum to exactly 45 before returning the lesson.
- **MongoDB stores instructor work.** The lesson library and save/load operations depend on a valid MongoDB connection.
- **External source coverage is not guaranteed.** Search APIs may return snippets and metadata rather than complete source text. A source appearing in the list does not mean the model has read the entire book, webpage, or video transcript.
- **AI QC is advisory.** Instructors should verify important technical claims against the linked primary sources and review all QC recommendations before finalizing a lesson.

## Current limitations / future work

- Add authentication, instructor accounts, and role-based access control before deploying for multiple users.
- Add persistent background jobs and per-stage progress tracking for long-running research/generation tasks.
- Add transcript retrieval and source-text extraction with claim-to-source evidence mapping.
- Add lesson version history, autosave, and edit-conflict handling.
- Add integration tests with mocked Gemini, Tavily, Google Books, YouTube, and MongoDB responses.
- Add deployment configuration and production hosting instructions for the frontend, backend, and database.

## Security

- Keep real credentials in local environment files or a secrets manager.
- `.env` files are excluded from Git by `.gitignore`; commit only the example templates.
- Rotate any credential that was accidentally committed or exposed. Removing it in a later commit does not remove it from Git history.
- Do not expose the Gemini or research API keys in frontend code. All provider calls in this implementation are made by the backend.

## License

No license has been added yet. Unless a license is included, the source is publicly viewable on GitHub but is not automatically granted an open-source reuse license. Add a license file if you intend to permit reuse or redistribution.
