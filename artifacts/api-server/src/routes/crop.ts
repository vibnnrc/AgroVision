import { Router, type IRouter } from "express";
import { AnalyzeCropBody, AnalyzeCropResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const languageInstructions = {
  hi: "Respond with farmer-friendly Hindi. Keep disease names in English in parentheses when useful.",
  en: "Respond in clear, plain English for a small-scale farmer.",
  braj: "Respond in simple Braj-flavored Hindi, keeping crop and disease names understandable.",
} as const;

const fallbackResult = {
  status: "uncertain",
  disease: null,
  commonName: null,
  scientificName: null,
  confidence: 0,
  severity: "unknown",
  yieldImpact: { minPercent: 0, maxPercent: 0 },
  summary: "The image could not be assessed reliably. Take a sharper, closer photo of one leaf in daylight.",
  treatment: ["Do not spray based on this scan.", "Retake the photo with the leaf filling most of the frame."],
  reasoning: "The vision provider did not return a usable assessment.",
  analysisMode: "offline-quality-check",
} as const;

function stripCodeFence(value: string) {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function normalizeResult(value: unknown, mode: "gemini-vision" | "offline-quality-check") {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawYield = raw.yieldImpact && typeof raw.yieldImpact === "object"
    ? raw.yieldImpact as Record<string, unknown>
    : {};
  const confidence = clamp(raw.confidence, 0, 1, 0);
  const disease = typeof raw.disease === "string" && raw.disease.trim() ? raw.disease.trim() : null;
  const treatment = Array.isArray(raw.treatment)
    ? raw.treatment.filter((step): step is string => typeof step === "string" && step.trim().length > 0).slice(0, 5)
    : [];
  const candidate = {
    status: confidence >= 0.6 && disease ? "reliable" : "uncertain",
    disease,
    commonName: typeof raw.commonName === "string" ? raw.commonName.trim() || null : null,
    scientificName: typeof raw.scientificName === "string" ? raw.scientificName.trim() || null : null,
    confidence,
    severity: ["healthy", "low", "moderate", "high", "unknown"].includes(String(raw.severity))
      ? raw.severity
      : "unknown",
    yieldImpact: {
      minPercent: Math.round(clamp(rawYield.minPercent, 0, 100, 0)),
      maxPercent: Math.round(clamp(rawYield.maxPercent, 0, 100, 0)),
    },
    summary: typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim()
      : fallbackResult.summary,
    treatment: treatment.length ? treatment : fallbackResult.treatment,
    reasoning: typeof raw.reasoning === "string" && raw.reasoning.trim()
      ? raw.reasoning.trim()
      : fallbackResult.reasoning,
    analysisMode: mode,
  };

  const parsed = AnalyzeCropResponse.safeParse(candidate);
  return parsed.success ? parsed.data : { ...fallbackResult, analysisMode: mode };
}

router.post("/crop/analyze", async (req, res) => {
  const parsedBody = AnalyzeCropBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ message: "Send an image, mime type, and language." });
    return;
  }

  const { imageBase64, mimeType, language, quality } = parsedBody.data;
  if (imageBase64.length > 8_000_000) {
    res.status(400).json({ message: "Image is too large. Choose a photo under 6 MB." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ message: "Vision provider is not configured." });
    return;
  }

  const prompt = [
    "You are a cautious crop-health assistant for small-scale farmers in Uttar Pradesh.",
    "Analyze the supplied crop image, not the filename or prompt.",
    "Return ONLY one valid JSON object with these keys:",
    "status, disease, commonName, scientificName, confidence, severity, yieldImpact, summary, treatment, reasoning.",
    "confidence must be a number from 0 to 1. yieldImpact must contain minPercent and maxPercent.",
    "severity must be one of healthy, low, moderate, high, unknown.",
    "If the image is not a clear leaf/crop image, or the evidence is weak, use disease null, confidence 0, severity unknown, and give photo-taking guidance.",
    "Never invent a pesticide dosage. If a chemical recommendation is not certain, say to confirm with a local agriculture officer.",
    "Do not claim laboratory certainty. Mention visible evidence in reasoning.",
    languageInstructions[language],
    `Image quality signals from the browser: brightness=${quality?.brightness ?? "unknown"}, blurScore=${quality?.blurScore ?? "unknown"}, sharpness=${quality?.sharpness ?? "unknown"}.`,
  ].join("\n");

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      res.status(502).json({ message: "The vision provider could not complete this scan." });
      return;
    }

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const modelText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!modelText) {
      res.json(normalizeResult(fallbackResult, "offline-quality-check"));
      return;
    }

    let modelJson: unknown;
    try {
      modelJson = JSON.parse(stripCodeFence(modelText));
    } catch {
      res.json(normalizeResult(fallbackResult, "offline-quality-check"));
      return;
    }

    res.json(normalizeResult(modelJson, "gemini-vision"));
  } catch {
    res.status(502).json({ message: "The vision provider is temporarily unavailable." });
  }
});

export default router;