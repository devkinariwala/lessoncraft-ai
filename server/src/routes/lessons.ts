import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { LessonModel } from "../models/LessonModel.js";
import { researchTopic } from "../services/research.js";
import {
  generateLesson,
  runInstructionalQC,
  runResearchQC,
} from "../services/ai.js";
import type { Lesson } from "../types.js";
const router = Router();
const inputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  objective: z.string().trim().min(10).max(1000),
});
router.post("/research", async (req, res, next) => {
  try {
    const input = inputSchema.parse(req.body);
    const result = await researchTopic(input.title, input.objective);
    res.json(result);
  } catch (e) {
    next(e);
  }
});
router.post("/generate", async (req, res, next) => {
  try {
    const input = inputSchema.parse(req.body);
    const research = await researchTopic(input.title, input.objective);
    const lesson = await generateLesson(
      input.title,
      input.objective,
      research.sources,
    );
    res.json({
      lesson,
      warnings: research.warnings,
      sourcesFound: research.sources.length,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/qc/research", async (req, res, next) => {
  try {
    const lesson = req.body.lesson as Lesson;
    if (!lesson?.sections?.length)
      return res.status(400).json({ error: "A generated lesson is required." });
    res.json({ report: await runResearchQC(lesson) });
  } catch (e) {
    next(e);
  }
});
router.post("/qc/instructional", async (req, res, next) => {
  try {
    const lesson = req.body.lesson as Lesson;
    if (!lesson?.sections?.length)
      return res.status(400).json({ error: "A generated lesson is required." });
    res.json({ report: await runInstructionalQC(lesson) });
  } catch (e) {
    next(e);
  }
});
router.post("/qc/all", async (req, res, next) => {
  try {
    const lesson = req.body.lesson as Lesson;
    if (!lesson?.sections?.length)
      return res.status(400).json({ error: "A generated lesson is required." });
    const [researchQC, instructionalQC] = await Promise.all([
      runResearchQC(lesson),
      runInstructionalQC(lesson),
    ]);
    res.json({ researchQC, instructionalQC });
  } catch (e) {
    next(e);
  }
});
router.get("/", async (_req, res, next) => {
  try {
    const rows = await LessonModel.find()
      .sort({ updatedAt: -1 })
      .select("title objective createdAt updatedAt researchQC instructionalQC");
    res.json(rows);
  } catch (e) {
    next(e);
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    const row = await LessonModel.findById(req.params.id);
    if (!row) return res.status(404).json({ error: "Lesson not found." });
    res.json(row);
  } catch (e) {
    next(e);
  }
});
router.post("/save", async (req, res, next) => {
  try {
    const body = req.body;
    if (!body.lesson || !body.lesson.title || !body.lesson.objective)
      return res
        .status(400)
        .json({ error: "Lesson title, objective and content are required." });
    const doc = body.id
      ? await LessonModel.findByIdAndUpdate(
          body.id,
          {
            title: body.lesson.title,
            objective: body.lesson.objective,
            lesson: body.lesson,
            researchWarnings: body.warnings || [],
            researchQC: body.researchQC,
            instructionalQC: body.instructionalQC,
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
      : await LessonModel.create({
          title: body.lesson.title,
          objective: body.lesson.objective,
          lesson: body.lesson,
          researchWarnings: body.warnings || [],
          researchQC: body.researchQC,
          instructionalQC: body.instructionalQC,
        });
    if (!doc) {
      return res.status(404).json({
        error: "Lesson not found",
      });
    }
    res.json({ id: doc.id, updatedAt: doc.updatedAt });
  } catch (e) {
    next(e);
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    await LessonModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});
router.post("/export", async (req, res, next) => {
  try {
    const {
      lesson,
      researchQC,
      instructionalQC,
      warnings = [],
    } = req.body as {
      lesson: Lesson;
      researchQC?: any;
      instructionalQC?: any;
      warnings?: string[];
    };
    if (!lesson?.sections?.length)
      return res.status(400).json({ error: "Lesson content is required." });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="lessoncraft-lesson.pdf"',
    );
    const doc = new PDFDocument({ margin: 48, bufferPages: true });
    doc.pipe(res);
    doc.fontSize(22).text(lesson.title);
    doc
      .moveDown(0.5)
      .fontSize(11)
      .text(`Learning objective: ${lesson.objective}`);
    doc.text(`Estimated duration: ${lesson.estimatedMinutes} minutes`);
    doc.moveDown();
    doc.fontSize(16).text("Learning outcomes");
    (lesson.outcomes || []).forEach((x) => doc.fontSize(10).text(`• ${x}`));
    for (const section of lesson.sections) {
      doc
        .addPage()
        .fontSize(16)
        .text(`${section.title} (${section.duration} min)`);
      doc.moveDown(0.5).fontSize(10).text(section.content);
      (section.examples || []).forEach((x, i) => {
        doc.moveDown(0.3).text(`Example ${i + 1}: ${x}`);
      });
      if (section.activity)
        doc.moveDown(0.5).text(`Activity: ${section.activity}`);
    }
    doc.addPage().fontSize(16).text("Knowledge check");
    (lesson.knowledgeCheck || []).forEach((q, i) => {
      doc
        .moveDown()
        .fontSize(11)
        .text(`${i + 1}. ${q.question}`);
      q.options.forEach((o) => doc.fontSize(9).text(`   ${o}`));
      doc.fontSize(9).text(`Answer: ${q.answer}. ${q.explanation}`);
    });
    doc.moveDown().fontSize(15).text("Key takeaways");
    (lesson.takeaways || []).forEach((x) => doc.fontSize(10).text(`• ${x}`));
    doc.addPage().fontSize(16).text("References");
    (lesson.sources || []).forEach((s, i) => {
      doc
        .moveDown(0.5)
        .fontSize(10)
        .text(`[S${i + 1}] ${s.title} (${s.sourceType})`);
      doc
        .fontSize(9)
        .fillColor("blue")
        .text(s.url, { link: s.url, underline: true });
      doc.fillColor("black");
    });
    if (warnings.length) {
      doc.moveDown().fontSize(12).text("Research warnings");
      warnings.forEach((w) => doc.fontSize(9).text(`• ${w}`));
    }
    for (const [name, report] of [
      ["QC Layer 1: Research & factual accuracy", researchQC],
      ["QC Layer 2: Instructional quality", instructionalQC],
    ] as const) {
      doc.addPage().fontSize(15).text(name);
      if (!report) {
        doc.fontSize(10).text("Not run.");
        continue;
      }
      doc
        .moveDown()
        .fontSize(10)
        .text(`Status: ${report.status} | Score: ${report.score}/100`);
      doc.text(report.summary || "");
      (report.issues || []).forEach((issue: any, i: number) => {
        doc
          .moveDown(0.5)
          .text(`${i + 1}. ${issue.severity} — ${issue.location}`);
        doc.text(issue.issue);
        doc.text(`Recommendation: ${issue.recommendation}`);
      });
    }
    doc.end();
  } catch (e) {
    next(e);
  }
});
export default router;
