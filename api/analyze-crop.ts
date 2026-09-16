type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };
declare const process: { env: Record<string, string | undefined> };
declare function fetch(input: string, init: { method: string; headers: Record<string, string>; body: string }): Promise<{ ok: boolean; json: () => Promise<unknown> }>;

type Diagnosis = {
  status: 'reliable' | 'uncertain';
  disease: string | null;
  commonName: string | null;
  scientificName: string | null;
  confidence: number;
  severity: 'healthy' | 'low' | 'moderate' | 'high' | 'unknown';
  yieldImpact: { minPercent: number; maxPercent: number };
  summary: string;
  treatment: string[];
  reasoning: string;
  analysisMode: 'gemini-vision' | 'offline-quality-check';
};

const fallback: Diagnosis = {
  status: 'uncertain', disease: null, commonName: null, scientificName: null,
  confidence: 0, severity: 'unknown', yieldImpact: { minPercent: 0, maxPercent: 0 },
  summary: 'The image could not be assessed reliably. Take a sharper, closer photo of one leaf in daylight.',
  treatment: ['Do not spray based on this scan.', 'Retake the photo with the leaf filling most of the frame.'],
  reasoning: 'The vision provider did not return a usable assessment.', analysisMode: 'offline-quality-check',
};

function clamp(value: unknown, min: number, max: number, fallbackValue: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallbackValue;
}

function normalize(value: unknown): Diagnosis {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const yieldImpact = raw.yieldImpact && typeof raw.yieldImpact === 'object' ? raw.yieldImpact as Record<string, unknown> : {};
  const confidence = clamp(raw.confidence, 0, 1, 0);
  const disease = typeof raw.disease === 'string' && raw.disease.trim() ? raw.disease.trim() : null;
  const treatment = Array.isArray(raw.treatment) ? raw.treatment.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 5) : [];
  return {
    status: confidence >= 0.6 && disease ? 'reliable' : 'uncertain',
    disease,
    commonName: typeof raw.commonName === 'string' ? raw.commonName.trim() || null : null,
    scientificName: typeof raw.scientificName === 'string' ? raw.scientificName.trim() || null : null,
    confidence,
    severity: ['healthy', 'low', 'moderate', 'high', 'unknown'].includes(String(raw.severity)) ? raw.severity as Diagnosis['severity'] : 'unknown',
    yieldImpact: { minPercent: Math.round(clamp(yieldImpact.minPercent, 0, 100, 0)), maxPercent: Math.round(clamp(yieldImpact.maxPercent, 0, 100, 0)) },
    summary: typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : fallback.summary,
    treatment: treatment.length ? treatment : fallback.treatment,
    reasoning: typeof raw.reasoning === 'string' && raw.reasoning.trim() ? raw.reasoning.trim() : fallback.reasoning,
    analysisMode: 'gemini-vision',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
  const body = req.body as Record<string, unknown> | undefined;
  const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';
  const mimeType = body?.mimeType === 'image/png' || body?.mimeType === 'image/webp' ? body.mimeType : 'image/jpeg';
  const language = body?.language === 'en' ? 'clear, plain English' : body?.language === 'braj' ? 'simple Braj-flavored Hindi' : 'farmer-friendly Hindi';
  if (imageBase64.length < 100) return res.status(400).json({ message: 'Send a valid leaf image.' });
  if (imageBase64.length > 8_000_000) return res.status(413).json({ message: 'Image is too large. Choose a photo under 6 MB.' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ message: 'Vision provider is not configured. Add GEMINI_API_KEY in Vercel project settings.' });

  const prompt = [`You are a cautious crop-health assistant for small-scale farmers. Analyze the supplied crop image, not the filename.`, `Return ONLY one valid JSON object with keys: status, disease, commonName, scientificName, confidence, severity, yieldImpact, summary, treatment, reasoning.`, `confidence must be 0 to 1; severity must be healthy, low, moderate, high, or unknown; yieldImpact must contain minPercent and maxPercent.`, `If this is not a clear leaf/crop image or evidence is weak, use disease null, confidence 0, severity unknown, and photo-taking guidance. Never invent pesticide dosage. Do not claim laboratory certainty; cite visible evidence. Respond in ${language}.`].join('\n');
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 4096 } }),
    });
    if (!upstream.ok) return res.status(502).json({ message: 'The vision provider could not complete this scan.' });
    const payload = await upstream.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
    if (!text) return res.json(fallback);
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
    return res.json(normalize(parsed));
  } catch {
    return res.status(502).json({ message: 'The vision provider is temporarily unavailable.' });
  }
}
