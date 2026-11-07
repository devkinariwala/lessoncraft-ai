import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileText,
  FlaskConical,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Video,
  AlertCircle,
  ExternalLink,
  BookMarked,
} from "lucide-react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
type Source = {
  title: string;
  url: string;
  sourceType: "website" | "book" | "youtube";
  description?: string;
  author?: string;
};
type Section = {
  title: string;
  duration: number;
  content: string;
  examples: string[];
  activity?: string;
};
type Lesson = {
  title: string;
  objective: string;
  estimatedMinutes: number;
  audience?: string;
  prerequisites?: string[];
  outcomes: string[];
  sections: Section[];
  knowledgeCheck: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];
  takeaways: string[];
  sources: Source[];
};
type Issue = {
  severity: string;
  location: string;
  issue: string;
  recommendation: string;
};
type Report = {
  layer: string;
  status: string;
  score: number;
  summary: string;
  issues: Issue[];
  checkedAt: string;
};
async function request(path: string, body?: unknown, method = "POST") {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}
const samples = [
  {
    title: "HTTP Requests and Responses",
    objective:
      "Explain GET and POST methods and distinguish between 2xx, 4xx, and 5xx response status categories.",
  },
  {
    title: "SQL Joins",
    objective:
      "Explain INNER JOIN, LEFT JOIN and RIGHT JOIN and demonstrate how they combine records from multiple relational database tables.",
  },
];
export default function App() {
  const [title, setTitle] = useState(samples[0].title),
    [objective, setObjective] = useState(samples[0].objective),
    [lesson, setLesson] = useState<Lesson | null>(null),
    [warnings, setWarnings] = useState<string[]>([]),
    [researchQC, setResearchQC] = useState<Report | null>(null),
    [instructionalQC, setInstructionalQC] = useState<Report | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [savedId, setSavedId] = useState(""),
    [saved, setSaved] = useState<any[]>([]),
    [tab, setTab] = useState("lesson"),
    [editing, setEditing] = useState(false),
    [health, setHealth] = useState("checking");
  const total = useMemo(
    () =>
      lesson?.sections.reduce((n, s) => n + Number(s.duration || 0), 0) || 0,
    [lesson],
  );
  async function loadSaved() {
    try {
      setSaved(await request("/lessons", undefined, "GET"));
    } catch {}
  }
  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) =>
        setHealth(d.database === "connected" ? "connected" : "offline"),
      )
      .catch(() => setHealth("offline"));
    loadSaved();
  }, []);
  function fail(e: any) {
    setError(e.message || "Something went wrong.");
    setNotice("");
  }
  async function generate() {
    setError("");
    setNotice("");
    if (title.trim().length < 3 || objective.trim().length < 10) {
      setError(
        "Enter a lesson title (at least 3 characters) and a learning objective (at least 10 characters).",
      );
      return;
    }
    setBusy("generate");
    try {
      const d = await request("/lessons/generate", { title, objective });
      setLesson(d.lesson);
      setWarnings(d.warnings || []);
      setResearchQC(null);
      setInstructionalQC(null);
      setSavedId("");
      setTab("lesson");
      setEditing(false);
      setNotice(
        `Lesson generated with ${d.sourcesFound} research sources. Review it and run both QC checks.`,
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function runQC() {
    if (!lesson) return;
    setError("");
    setBusy("qc");
    try {
      const d = await request("/lessons/qc/all", { lesson });
      setResearchQC(d.researchQC);
      setInstructionalQC(d.instructionalQC);
      setTab("qc");
      setNotice("Both independent quality-control audits are complete.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function save() {
    if (!lesson) return;
    setError("");
    setBusy("save");
    try {
      const d = await request("/lessons/save", {
        id: savedId || undefined,
        lesson,
        warnings,
        researchQC,
        instructionalQC,
      });
      setSavedId(d.id);
      setNotice("Lesson and instructor edits saved successfully.");
      loadSaved();
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function openSaved(id: string) {
    setError("");
    setBusy("load");
    try {
      const d = await request(`/lessons/${id}`, undefined, "GET");
      setLesson(d.lesson);
      setTitle(d.title);
      setObjective(d.objective);
      setWarnings(d.researchWarnings || []);
      setResearchQC(d.researchQC || null);
      setInstructionalQC(d.instructionalQC || null);
      setSavedId(id);
      setTab("lesson");
      setEditing(true);
      setNotice("Saved lesson loaded.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function exportPDF() {
    if (!lesson) return;
    setError("");
    setBusy("export");
    try {
      const r = await fetch(`${API}/lessons/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson, researchQC, instructionalQC, warnings }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || "PDF export failed.");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("PDF export downloaded.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  function updateSection(i: number, key: keyof Section, value: any) {
    if (!lesson) return;
    const sections = [...lesson.sections];
    sections[i] = { ...sections[i], [key]: value };
    setLesson({ ...lesson, sections });
  }
  function updateArray(key: "outcomes" | "takeaways", value: string) {
    if (!lesson) return;
    setLesson({ ...lesson, [key]: value.split("\n").filter(Boolean) });
  }
  function applyRecommendation(report: Report, issue: Issue) {
    if (!lesson) return;
    const updated = { ...lesson };
    const idx = Number(issue.location.match(/section\s*(\d+)/i)?.[1]) - 1;
    if (idx >= 0 && idx < updated.sections.length) {
      updated.sections = [...updated.sections];
      updated.sections[idx] = {
        ...updated.sections[idx],
        content:
          updated.sections[idx].content +
          `\n\nInstructor note: ${issue.recommendation}`,
      };
      setLesson(updated);
      setNotice(
        "Recommendation appended as an instructor note. Review and edit it before publishing.",
      );
    } else
      setNotice(
        "Review this recommendation and apply the suggested change in the lesson editor.",
      );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BrainCircuit size={22} />
          </div>
          <div>
            <b>LessonCraft</b>
            <span>AI STUDIO</span>
          </div>
        </div>
        <div className="side-label">WORKSPACE</div>
        <button className="nav active">
          <Plus size={17} /> Create lesson
        </button>
        <button className="nav" onClick={() => setTab("library")}>
          <BookMarked size={17} /> Lesson library{" "}
          <span className="count">{saved.length}</span>
        </button>
        <div className="side-bottom">
          <div className="status-card">
            <div className="status-title">
              <span
                className={`dot ${health === "connected" ? "green" : "orange"}`}
              />{" "}
              Database {health}
            </div>
            <p>Your lessons are stored locally in MongoDB.</p>
          </div>
          <div className="user-chip">
            <div className="avatar">IC</div>
            <div>
              <b>Instructor workspace</b>
              <span>Lesson authoring</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="crumb">
              Workspace <ChevronRight size={13} />{" "}
              <b>
                {tab === "library"
                  ? "Lesson library"
                  : lesson
                    ? "Lesson editor"
                    : "New lesson"}
              </b>
            </div>
            <h1>
              {tab === "library" ? "Your lesson library" : "Create a lesson"}
            </h1>
          </div>
          <div className="top-actions">
            <span className="status-pill">
              <span
                className={`dot ${health === "connected" ? "green" : "orange"}`}
              />
              {health === "connected"
                ? "Database connected"
                : "Database offline"}
            </span>
            {lesson && (
              <button
                className="btn secondary"
                onClick={save}
                disabled={!!busy}
              >
                <Save size={15} /> Save
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="alert error">
            <AlertCircle size={17} />
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {notice && (
          <div className="alert success">
            <CheckCircle2 size={17} />
            {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {tab === "library" ? (
          <section className="library">
            <div className="section-heading">
              <div>
                <h2>Saved lessons</h2>
                <p>Continue editing a previously saved lesson.</p>
              </div>
              <button
                className="btn primary"
                onClick={() => {
                  setLesson(null);
                  setSavedId("");
                  setTab("lesson");
                }}
              >
                <Plus size={16} /> New lesson
              </button>
            </div>
            {saved.length === 0 ? (
              <div className="empty">
                <BookOpen size={32} />
                <h3>No saved lessons yet</h3>
                <p>Generate and save a lesson to see it here.</p>
              </div>
            ) : (
              <div className="saved-grid">
                {saved.map((row) => (
                  <article className="saved-card" key={row._id}>
                    <div className="saved-icon">
                      <FileText />
                    </div>
                    <h3>{row.title}</h3>
                    <p>{row.objective}</p>
                    <div className="saved-meta">
                      Updated{" "}
                      {new Date(
                        row.updatedAt || row.createdAt,
                      ).toLocaleDateString()}
                    </div>
                    <button
                      className="btn secondary full"
                      onClick={() => openSaved(row._id)}
                    >
                      Open lesson <ChevronRight size={15} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {!lesson ? (
              <div className="create-layout">
                <section className="form-card">
                  <div className="card-eyebrow">
                    <Sparkles size={15} /> AI LESSON GENERATOR
                  </div>
                  <h2>What will your learners discover?</h2>
                  <p className="muted">
                    Start with a clear title and learning objective. The
                    research agent will gather supporting resources before
                    generating your lesson.
                  </p>
                  <label>
                    Lesson title <span className="required">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. HTTP Requests and Responses"
                    maxLength={160}
                  />
                  <div className="field-foot">
                    <span>Give your lesson a specific, descriptive title.</span>
                    <span>{title.length}/160</span>
                  </div>
                  <label>
                    Learning objective <span className="required">*</span>
                  </label>
                  <textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    rows={4}
                    placeholder="By the end of this lesson, learners will be able to..."
                    maxLength={1000}
                  />
                  <div className="field-foot">
                    <span>Describe what learners should know or do.</span>
                    <span>{objective.length}/1000</span>
                  </div>
                  <div className="sample-block">
                    <div className="sample-heading">TRY A SAMPLE</div>
                    <div className="sample-buttons">
                      {samples.map((s, i) => (
                        <button
                          key={s.title}
                          className="sample-btn"
                          onClick={() => {
                            setTitle(s.title);
                            setObjective(s.objective);
                          }}
                        >
                          <span>{i === 0 ? "01" : "02"}</span>
                          {s.title}
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn primary generate"
                    disabled={!!busy}
                    onClick={generate}
                  >
                    {busy === "generate" ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}{" "}
                    {busy === "generate"
                      ? "Researching & generating…"
                      : "Generate 45-minute lesson"}
                    <ChevronRight size={17} />
                  </button>
                  <p className="fineprint">
                    <ShieldCheck size={13} /> Your content will be reviewed by
                    two independent QC layers.
                  </p>
                </section>
                <aside className="process-card">
                  <div className="process-top">
                    <div className="orb">
                      <BrainCircuit size={26} />
                    </div>
                    <span className="tag">HOW IT WORKS</span>
                  </div>
                  <h3>From research to classroom-ready</h3>
                  <p>
                    One guided workflow. Evidence-backed content. Two
                    independent quality checks.
                  </p>
                  <div className="process-step">
                    <div className="step-icon blue">
                      <Search size={17} />
                    </div>
                    <div>
                      <b>01 · Research</b>
                      <span>Websites, books and YouTube resources</span>
                    </div>
                  </div>
                  <div className="process-step">
                    <div className="step-icon purple">
                      <BookOpen size={17} />
                    </div>
                    <div>
                      <b>02 · Generate</b>
                      <span>Structured lesson built for 45 minutes</span>
                    </div>
                  </div>
                  <div className="process-step">
                    <div className="step-icon green">
                      <ShieldCheck size={17} />
                    </div>
                    <div>
                      <b>03 · Validate</b>
                      <span>Factual accuracy + instructional quality</span>
                    </div>
                  </div>
                  <div className="process-step">
                    <div className="step-icon amber">
                      <GraduationCap size={17} />
                    </div>
                    <div>
                      <b>04 · Finalize</b>
                      <span>Edit, save, preview and export</span>
                    </div>
                  </div>
                  <div className="time-note">
                    <Clock3 size={16} />
                    <div>
                      <b>45-minute learning experience</b>
                      <span>
                        Explanations, examples, activities and checks included.
                      </span>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="editor-layout">
                <div className="editor-main">
                  <div className="lesson-banner">
                    <div>
                      <div className="card-eyebrow">
                        <GraduationCap size={14} /> LESSON WORKSPACE
                      </div>
                      <h2>{lesson.title}</h2>
                      <p>{lesson.objective}</p>
                    </div>
                    <div className="duration-badge">
                      <Clock3 size={16} />
                      <b>{total} min</b>
                      <span>of 45 min</span>
                    </div>
                  </div>
                  <div className="tabs">
                    <button
                      className={tab === "lesson" ? "selected" : ""}
                      onClick={() => setTab("lesson")}
                    >
                      <BookOpen size={15} /> Lesson content
                    </button>
                    <button
                      className={tab === "qc" ? "selected" : ""}
                      onClick={() => setTab("qc")}
                    >
                      <ClipboardCheck size={15} /> QC reports{" "}
                      <span className="tab-count">
                        {(researchQC ? 1 : 0) + (instructionalQC ? 1 : 0)}/2
                      </span>
                    </button>
                    <button
                      className={tab === "preview" ? "selected" : ""}
                      onClick={() => setTab("preview")}
                    >
                      <FileText size={15} /> Preview
                    </button>
                  </div>
                  {tab === "lesson" && (
                    <div className="lesson-content">
                      <div className="lesson-toolbar">
                        <div>
                          <b>Lesson outline</b>
                          <span>
                            {lesson.sections.length} sections ·{" "}
                            {lesson.knowledgeCheck.length} knowledge checks
                          </span>
                        </div>
                        <button
                          className="text-btn"
                          onClick={() => setEditing(!editing)}
                        >
                          {editing ? "Done editing" : "Edit lesson"}
                        </button>
                      </div>
                      {lesson.outcomes?.length > 0 && (
                        <div className="outcomes">
                          <b>Learning outcomes</b>
                          {lesson.outcomes.map((o, i) => (
                            <div key={i}>
                              <CheckCircle2 size={14} />
                              {o}
                            </div>
                          ))}
                        </div>
                      )}
                      {lesson.sections.map((s, i) => (
                        <article className="lesson-section" key={i}>
                          <div className="section-number">
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div className="section-body">
                            <div className="section-title-row">
                              {editing ? (
                                <input
                                  value={s.title}
                                  onChange={(e) =>
                                    updateSection(i, "title", e.target.value)
                                  }
                                />
                              ) : (
                                <h3>{s.title}</h3>
                              )}
                              <span className="minutes">
                                <Clock3 size={13} />
                                {s.duration} min
                              </span>
                            </div>
                            {editing ? (
                              <>
                                <textarea
                                  value={s.content}
                                  rows={6}
                                  onChange={(e) =>
                                    updateSection(i, "content", e.target.value)
                                  }
                                />
                                <label>Examples (one per line)</label>
                                <textarea
                                  value={s.examples.join("\n")}
                                  rows={3}
                                  onChange={(e) =>
                                    updateSection(
                                      i,
                                      "examples",
                                      e.target.value.split("\n"),
                                    )
                                  }
                                />
                                <label>Activity</label>
                                <textarea
                                  value={s.activity || ""}
                                  rows={2}
                                  onChange={(e) =>
                                    updateSection(i, "activity", e.target.value)
                                  }
                                />
                              </>
                            ) : (
                              <>
                                <p className="section-copy">{s.content}</p>
                                {s.examples?.length > 0 && (
                                  <div className="example-box">
                                    <b>
                                      <FlaskConical size={14} /> Examples
                                    </b>
                                    {s.examples.map((x, j) => (
                                      <p key={j}>{x}</p>
                                    ))}
                                  </div>
                                )}
                                {s.activity && (
                                  <div className="activity-box">
                                    <b>Try it</b>
                                    <p>{s.activity}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </article>
                      ))}
                      <div className="edit-extra">
                        {editing && (
                          <>
                            <label>Learning outcomes (one per line)</label>
                            <textarea
                              value={lesson.outcomes.join("\n")}
                              onChange={(e) =>
                                updateArray("outcomes", e.target.value)
                              }
                            />
                            <label>Key takeaways (one per line)</label>
                            <textarea
                              value={lesson.takeaways.join("\n")}
                              onChange={(e) =>
                                updateArray("takeaways", e.target.value)
                              }
                            />
                          </>
                        )}
                      </div>
                      <div className="knowledge">
                        <div className="card-eyebrow">
                          <BrainCircuit size={14} /> CHECK YOUR UNDERSTANDING
                        </div>
                        <h3>Knowledge check</h3>
                        {lesson.knowledgeCheck.map((q, i) => (
                          <div className="question" key={i}>
                            <b>
                              {i + 1}. {q.question}
                            </b>
                            <ul>
                              {q.options.map((o, j) => (
                                <li key={j}>{o}</li>
                              ))}
                            </ul>
                            {editing && (
                              <p className="answer">
                                <b>Answer: {q.answer}</b> — {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="takeaways">
                        <h3>Key takeaways</h3>
                        {lesson.takeaways.map((x, i) => (
                          <div key={i}>
                            <CheckCircle2 size={14} />
                            {x}
                          </div>
                        ))}
                      </div>
                      <div className="references">
                        <h3>Research references</h3>
                        {lesson.sources.length === 0 && (
                          <p className="muted">
                            No external sources were returned. Configure
                            research API keys and retry.
                          </p>
                        )}
                        {lesson.sources.map((s, i) => (
                          <a
                            key={i}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="source-row"
                          >
                            <span className={`source-icon ${s.sourceType}`}>
                              {s.sourceType === "youtube" ? (
                                <Video size={15} />
                              ) : s.sourceType === "book" ? (
                                <BookOpen size={15} />
                              ) : (
                                <ExternalLink size={15} />
                              )}
                            </span>
                            <span>
                              <b>
                                [S{i + 1}] {s.title}
                              </b>
                              <small>
                                {s.sourceType}
                                {s.author ? ` · ${s.author}` : ""}
                              </small>
                            </span>
                            <ExternalLink size={14} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {tab === "qc" && (
                    <div className="qc-grid">
                      {!researchQC && !instructionalQC ? (
                        <div className="qc-empty">
                          <ShieldCheck size={34} />
                          <h3>Quality assurance is ready</h3>
                          <p>
                            Run both independent QC layers to evaluate research
                            accuracy and instructional quality.
                          </p>
                          <button
                            className="btn primary"
                            onClick={runQC}
                            disabled={!!busy}
                          >
                            {busy === "qc" ? (
                              <Loader2 className="spin" size={16} />
                            ) : (
                              <ShieldCheck size={16} />
                            )}{" "}
                            Run both QC layers
                          </button>
                        </div>
                      ) : (
                        <>
                          <QCPanel
                            report={researchQC}
                            title="Research & factual accuracy"
                            subtitle="QC Layer 1 · Evidence review"
                            icon={<Search size={18} />}
                            onApply={(i) =>
                              researchQC && applyRecommendation(researchQC, i)
                            }
                          />
                          <QCPanel
                            report={instructionalQC}
                            title="Instructional quality"
                            subtitle="QC Layer 2 · Learning design review"
                            icon={<GraduationCap size={18} />}
                            onApply={(i) =>
                              instructionalQC &&
                              applyRecommendation(instructionalQC, i)
                            }
                          />
                          <div className="qc-retry">
                            <button
                              className="btn secondary"
                              onClick={runQC}
                              disabled={!!busy}
                            >
                              <RefreshCw size={15} /> Re-run both audits
                            </button>
                            <span>
                              Each audit is independently generated from the
                              current lesson.
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {tab === "preview" && (
                    <div className="preview-paper">
                      <div className="preview-head">
                        <span>LESSON PREVIEW</span>
                        <h2>{lesson.title}</h2>
                        <p>{lesson.objective}</p>
                        <div className="preview-meta">
                          <span>
                            <Clock3 size={14} />
                            45 minutes
                          </span>
                          <span>
                            <BookOpen size={14} />
                            {lesson.sections.length} sections
                          </span>
                          <span>
                            <ExternalLink size={14} />
                            {lesson.sources.length} references
                          </span>
                        </div>
                      </div>
                      {lesson.sections.map((s, i) => (
                        <section key={i}>
                          <h3>
                            {i + 1}. {s.title} <small>{s.duration} min</small>
                          </h3>
                          <p>{s.content}</p>
                          {s.examples.map((x, j) => (
                            <blockquote key={j}>{x}</blockquote>
                          ))}
                        </section>
                      ))}
                      <h3>Knowledge check</h3>
                      {lesson.knowledgeCheck.map((q, i) => (
                        <p key={i}>
                          <b>
                            {i + 1}. {q.question}
                          </b>
                        </p>
                      ))}
                      <h3>References</h3>
                      {lesson.sources.map((s, i) => (
                        <p key={i}>
                          [S{i + 1}]{" "}
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.title}
                          </a>
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="bottom-actions">
                    <button
                      className="btn secondary"
                      onClick={save}
                      disabled={!!busy}
                    >
                      <Save size={15} />
                      {busy === "save" ? "Saving…" : "Save lesson"}
                    </button>
                    <button
                      className="btn secondary"
                      onClick={runQC}
                      disabled={!!busy}
                    >
                      <ShieldCheck size={15} />
                      {busy === "qc" ? "Auditing…" : "Run both QC layers"}
                    </button>
                    <button
                      className="btn primary"
                      onClick={exportPDF}
                      disabled={!!busy}
                    >
                      <Download size={15} />
                      {busy === "export"
                        ? "Preparing PDF…"
                        : "Export lesson & QC"}
                    </button>
                  </div>
                </div>
                <aside className="right-rail">
                  <div className="rail-card">
                    <div className="rail-heading">
                      <span>COMPLETION</span>
                      <span className="percent">
                        {Math.min(100, Math.round((total / 45) * 100))}%
                      </span>
                    </div>
                    <div className="progress">
                      <i
                        style={{
                          width: `${Math.min(100, (total / 45) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="rail-line">
                      <span>Lesson duration</span>
                      <b className={total === 45 ? "good" : ""}>
                        {total}/45 min
                      </b>
                    </div>
                    <div className="rail-line">
                      <span>Research sources</span>
                      <b>{lesson.sources.length}</b>
                    </div>
                    <div className="rail-line">
                      <span>QC reports</span>
                      <b>
                        {(researchQC ? 1 : 0) + (instructionalQC ? 1 : 0)}/2
                      </b>
                    </div>
                    {total !== 45 && (
                      <p className="warning-text">
                        Adjust section durations to total exactly 45 minutes.
                      </p>
                    )}
                  </div>
                  <div className="rail-card">
                    <div className="rail-card-title">
                      <ShieldCheck size={17} /> Quality checks
                    </div>
                    <div className="qc-mini">
                      <span
                        className={`mini-dot ${researchQC ? "green" : "gray"}`}
                      />
                      <div>
                        <b>Research accuracy</b>
                        <small>
                          {researchQC
                            ? `${researchQC.status} · ${researchQC.score}/100`
                            : "Not yet reviewed"}
                        </small>
                      </div>
                    </div>
                    <div className="qc-mini">
                      <span
                        className={`mini-dot ${instructionalQC ? "green" : "gray"}`}
                      />
                      <div>
                        <b>Instructional quality</b>
                        <small>
                          {instructionalQC
                            ? `${instructionalQC.status} · ${instructionalQC.score}/100`
                            : "Not yet reviewed"}
                        </small>
                      </div>
                    </div>
                    <button
                      className="text-btn full-text"
                      onClick={() => setTab("qc")}
                    >
                      View audit reports <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="rail-card">
                    <div className="rail-card-title">
                      <BookOpen size={17} /> Research coverage
                    </div>
                    {(["website", "book", "youtube"] as const).map((type) => (
                      <div className="rail-line" key={type}>
                        <span className="capitalize">
                          {type === "youtube" ? "YouTube" : type + "s"}
                        </span>
                        <b>
                          {
                            lesson.sources.filter((s) => s.sourceType === type)
                              .length
                          }
                        </b>
                      </div>
                    ))}
                    {warnings.map((w, i) => (
                      <p className="warning-text" key={i}>
                        {w}
                      </p>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
function QCPanel({
  report,
  title,
  subtitle,
  icon,
  onApply,
}: {
  report: Report | null;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onApply: (i: Issue) => void;
}) {
  return (
    <section className="qc-panel">
      <div className="qc-panel-head">
        <div className="qc-icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          <span>{subtitle}</span>
        </div>
      </div>
      {!report ? (
        <div className="not-run">Audit not run yet.</div>
      ) : (
        <>
          <div className="score-row">
            <div className="score">
              {report.score}
              <small>/100</small>
            </div>
            <div>
              <span className={`audit-status ${report.status.toLowerCase()}`}>
                {report.status.replace("_", " ")}
              </span>
              <p>{report.summary}</p>
            </div>
          </div>
          <div className="issue-head">
            Findings <span>{report.issues.length}</span>
          </div>
          {report.issues.length === 0 ? (
            <div className="no-issues">
              <CheckCircle2 size={17} /> No issues identified by this audit.
            </div>
          ) : (
            report.issues.map((issue, i) => (
              <div className="issue" key={i}>
                <div className="issue-top">
                  <span className={`severity ${issue.severity.toLowerCase()}`}>
                    {issue.severity}
                  </span>
                  <span>{issue.location}</span>
                </div>
                <p>{issue.issue}</p>
                <div className="recommendation">
                  <b>Suggested improvement</b>
                  <p>{issue.recommendation}</p>
                </div>
                <button className="text-btn" onClick={() => onApply(issue)}>
                  Apply as instructor note <ChevronRight size={13} />
                </button>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}
