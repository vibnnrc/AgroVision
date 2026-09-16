import { type ChangeEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import type { CropAnalysisResult } from '@workspace/api-client-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
// @ts-ignore Anime.js ships a usable ESM runtime without types in this scaffold.
import anime from 'animejs/lib/anime.es.js';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CloudOff,
  CloudUpload,
  Droplets,
  Eye,
  Gauge,
  Headphones,
  History,
  ImagePlus,
  Leaf,
  LockKeyhole,
  MapPin,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  Radio,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sprout,
  TrendingDown,
  TrendingUp,
  Volume2,
  Wheat,
  X,
} from 'lucide-react';

const queryClient = new QueryClient();

type Language = 'hi' | 'en' | 'braj';
type ScanState = 'ready' | 'scanning' | 'result' | 'error';
type ImagePayload = {
  url: string;
  name: string;
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: { brightness: number; blurScore: number; sharpness: number };
};
type ScanRecord = {
  id: string;
  date: string;
  field: string;
  diagnosis: string;
  confidence: number;
  action: string;
};

const text = {
  hi: {
    nav: ['आज का खेत', 'फसल जांच', 'मेरे खेत', 'जांच इतिहास', 'इलाज गाइड', 'पैदावार अनुमान'],
    today: 'Today', scan: 'Scan', fields: 'Fields', history: 'History', guide: 'Guide', yield: 'Yield',
    date: 'शनिवार · 17 मई 2025', greeting: 'राम-राम, मोहन', offline: 'ऑफलाइन', aiActive: 'AI सक्रिय',
    companion: 'गांव में आपका अपना crop companion', hero1: 'खेत को', hero2: 'सुनिए।', hero3: 'समझिए।',
    heroDesc: 'AgriVision AI बीमारी दिखने से पहले संकेत पकड़ता है — और अगले सही कदम को आपकी भाषा में बोलता है।',
    startScan: 'अभी फसल जांचें', how: 'कैसे काम करता है', stats: ['कुल खेत', 'आज का संकेत', 'बचाई उपज'],
    statsDetail: ['3 खेत · 2 फसलें', 'गंगापुर में थोड़ा ध्यान दें', 'इस मौसम का अनुमान'],
    syncTitle: 'ऑफलाइन — AI अभी भी काम करता है', syncBody: '3 जांच और 1 इलाज योजना इस फोन में सुरक्षित है', syncedBody: 'आपका डेटा सुरक्षित है — आखिरी sync अभी हुआ',
    syncButton: 'नेट मिलने पर sync', syncing: 'जुड़ रहा है', synced: 'सिंक हुआ', localQueue: 'आखिरी sync · आज 08:42 · 1.8 MB local queue',
    scanLabel: '02 / FAST FIELD DECISION', scanTitle1: 'एक पत्ती से,', scanTitle2: 'पूरा फैसला।',
    scanIntro: 'किसान की भाषा में, खेत की रफ़्तार पर। नेटवर्क जाए तो भी AI यहीं है।',
    model: 'ON-DEVICE MODEL · V2.4', ready: 'पत्ती को फ्रेम में रखें', analyzing: 'पत्ती के संकेत देख रहे हैं', complete: 'जांच पूरी · सिर्फ फोन पर',
    noPhoto: 'अभी फोटो नहीं चुनी गई', photoReady: 'फोटो तैयार है', photoHint: 'पत्ती, तना या प्रभावित फल की साफ तस्वीर चुनें',
    choosePhoto: 'फोटो चुनें', camera: 'कैमरा / गैलरी', consent: 'मैं सहमत हूँ — जांच इस फोन पर ही होगी',
    analyze: 'जांच शुरू करें', running: 'जांच चल रही है…', rescan: 'फिर से जांचें',
    promiseTitle1: 'पहले भरोसा,', promiseTitle2: 'फिर इलाज।', promiseDesc: 'हर नतीजे के साथ confidence, संभावित नुकसान और कारण दिखेंगे — कोई काला डिब्बा नहीं।',
    privacy: 'तस्वीरें फोन से बाहर नहीं जातीं', verified: 'सलाह स्थानीय कृषि विशेषज्ञों से जांची हुई', voice: 'हिन्दी में सुनने का विकल्प',
    cost: 'खर्च', costDetail: 'डेटा या जांच शुल्क नहीं', time: 'समय', timeDetail: 'औसत स्थानीय जांच',
    resultTitle: 'गेहूँ का पीला रतुआ', resultSub: 'Yellow rust · Puccinia striiformis', confidence: 'भरोसा',
    resultImpact: 'बिना इलाज 12–18% तक कम उपज', resultDesc: 'शुरुआती संकेत मिले हैं। अभी कार्रवाई करने पर फसल को बचाने की अच्छी संभावना है।',
    listen: 'सुनें · हिन्दी', resultVerified: 'इलाज सलाह कृषि विज्ञान केंद्र, आगरा से सत्यापित',
     uncertainTitle: 'नतीजा पक्का नहीं है', uncertainSub: 'बेहतर तस्वीर लेकर फिर जांचें', modeVision: 'GEMINI VISION · IMAGE ANALYSIS', modeOffline: 'OFFLINE · PHOTO QUALITY CHECK', visibleEvidence: 'दिखे हुए संकेत', noYieldEstimate: 'उपज का असर अभी नहीं बताया जा सकता', noTreatment: 'इस नतीजे पर दवा का छिड़काव न करें।',
    fieldsLabel: '03 / YOUR LAND, YOUR SIGNALS', fieldsTitle: 'मेरे खेत', addField: 'खेत जोड़ें', newField: 'नया खेत तैयार है',
    fieldLatest: 'आखिरी जांच 2 घंटे पहले — अगली जांच कल सुबह करें', healthy: 'स्वस्थ', attention: 'ध्यान दें', pending: 'जांच बाकी',
    health: 'स्वास्थ्य संकेत', acres: 'एकड़', historyLabel: '04 / PATTERNS OVER TIME', historyTitle: 'जांच इतिहास', fullHistory: 'पूरा इतिहास देखें',
    guideLabel: '05 / VERIFIED TREATMENT PLAN', guideTitle: 'इलाज का रास्ता साफ़ है।', listenAll: 'पूरी सलाह सुनें',
    verifiedYear: 'AGRI-VERIFIED / 2024', guideAside1: 'इलाज सही हो,', guideAside2: 'तो खर्च भी सही।', medicine: 'दवा का अनुमान',
    tanks: '2.4 एकड़ के लिए', savedYield: 'उपज बचने की संभावना', yieldLabel: '06 / MAKE THE NEXT DECISION',
    yieldTitle1: 'आपकी मेहनत का', yieldTitle2: 'एक अनुमान।', areaPrompt: 'कितने एकड़ का अनुमान चाहिए?', afterTreatment: 'इलाज के बाद अनुमानित उपज',
    better: 'बिना इलाज से 14% बेहतर', normal: 'सामान्य', canSave: 'बचाई जा सकती है', localPrototype: 'local-first prototype',
    footer: 'किसानों के लिए, किसानों के साथ', language: 'भाषा',
  },
  en: {
    nav: ['Today’s fields', 'Crop scan', 'My fields', 'Scan history', 'Treatment guide', 'Yield estimate'],
    today: 'Today', scan: 'Scan', fields: 'Fields', history: 'History', guide: 'Guide', yield: 'Yield',
    date: 'SATURDAY · 17 MAY 2025', greeting: 'Hello, Mohan', offline: 'Offline', aiActive: 'AI active',
    companion: 'your village crop companion', hero1: 'Listen to', hero2: 'your fields.', hero3: 'understand them.',
    heroDesc: 'AgriVision AI catches early signals before disease spreads — then speaks the next right step in your language.',
    startScan: 'Scan a crop now', how: 'How it works', stats: ['Total fields', 'Today’s signal', 'Yield protected'],
    statsDetail: ['3 fields · 2 crops', 'Gangapur needs attention', 'This season’s estimate'],
    syncTitle: 'Offline — AI still works', syncBody: '3 scans and 1 treatment plan are safe on this phone', syncedBody: 'Your data is safe — last sync just finished',
    syncButton: 'Sync when online', syncing: 'Connecting', synced: 'Synced', localQueue: 'Last sync · today 08:42 · 1.8 MB local queue',
    scanLabel: '02 / FAST FIELD DECISION', scanTitle1: 'One leaf,', scanTitle2: 'a clear decision.',
    scanIntro: 'In a farmer’s language, at field speed. Even when the network goes, AI stays here.',
    model: 'ON-DEVICE MODEL · V2.4', ready: 'Place a leaf in the frame', analyzing: 'Reading leaf signals', complete: 'Scan complete · local only',
    noPhoto: 'No photo selected yet', photoReady: 'Photo ready', photoHint: 'Choose a clear photo of a leaf, stem, or affected fruit',
    choosePhoto: 'Choose a photo', camera: 'Camera / gallery', consent: 'I agree — this scan stays on this phone',
    analyze: 'Start scan', running: 'Scanning…', rescan: 'Scan again',
    promiseTitle1: 'Trust first,', promiseTitle2: 'treatment next.', promiseDesc: 'Every result shows confidence, possible loss, and the reason — no black box.',
    privacy: 'Photos never leave your phone', verified: 'Advice checked by local agricultural experts', voice: 'Listen to guidance in Hindi',
    cost: 'Cost', costDetail: 'No data or scan fee', time: 'Time', timeDetail: 'Average local scan',
    resultTitle: 'Wheat yellow rust', resultSub: 'Yellow rust · Puccinia striiformis', confidence: 'confidence',
    resultImpact: '12–18% lower yield without treatment', resultDesc: 'Early signals found. Acting now gives the crop a strong chance to recover.',
    listen: 'Listen · Hindi', resultVerified: 'Treatment advice verified by Krishi Vigyan Kendra, Agra',
     uncertainTitle: 'The result is uncertain', uncertainSub: 'Take a clearer photo and scan again', modeVision: 'GEMINI VISION · IMAGE ANALYSIS', modeOffline: 'OFFLINE · PHOTO QUALITY CHECK', visibleEvidence: 'Visible evidence', noYieldEstimate: 'Yield impact cannot be estimated yet', noTreatment: 'Do not spray based on this result.',
    fieldsLabel: '03 / YOUR LAND, YOUR SIGNALS', fieldsTitle: 'My fields', addField: 'Add a field', newField: 'New field is ready',
    fieldLatest: 'Last scan 2 hours ago — scan again tomorrow morning', healthy: 'Healthy', attention: 'Needs attention', pending: 'Scan needed',
    health: 'health signal', acres: 'acres', historyLabel: '04 / PATTERNS OVER TIME', historyTitle: 'Scan history', fullHistory: 'View full history',
    guideLabel: '05 / VERIFIED TREATMENT PLAN', guideTitle: 'A clear path to treatment.', listenAll: 'Listen to full guidance',
    verifiedYear: 'AGRI-VERIFIED / 2024', guideAside1: 'The right treatment', guideAside2: 'keeps costs right.', medicine: 'Medicine estimate',
    tanks: 'For 2.4 acres', savedYield: 'Possible yield protected', yieldLabel: '06 / MAKE THE NEXT DECISION',
    yieldTitle1: 'A clear estimate', yieldTitle2: 'for your effort.', areaPrompt: 'How many acres should we estimate?', afterTreatment: 'Estimated yield after treatment',
    better: '14% better than no treatment', normal: 'Normal', canSave: 'Can be saved', localPrototype: 'local-first prototype',
    footer: 'Built for farmers, with farmers', language: 'Language',
  },
} as const;

const fields = [
  { name: 'Gangapur wheat', local: 'Gangapur · W-03', acres: '2.4', health: 78, tone: 'ochre' as const },
  { name: 'Kachhua rice', local: 'Kachhua · R-01', acres: '1.8', health: 92, tone: 'green' as const },
  { name: 'Nagla vegetable plot', local: 'Nagla · V-02', acres: '0.7', health: 64, tone: 'coral' as const },
];

const treatmentSteps = {
  hi: [
    ['खेत के प्रभावित हिस्से को चिन्हित करें', 'पीली धारियों वाली पत्तियों को अलग देखें। संक्रमित पत्तियों को खेत में न छोड़ें।'],
    ['प्रोपिकोनाज़ोल 25% EC का छिड़काव', '1 मिली दवा को 1 लीटर पानी में मिलाएं। सुबह 7 बजे से पहले छिड़काव करें।'],
    ['7 दिन बाद फिर से जांच', 'नई पत्तियों पर पीली धारियां नज़र आएं तो दूसरा छिड़काव करें।'],
  ],
  en: [
    ['Mark the affected part of the field', 'Check leaves with yellow stripes separately. Do not leave infected leaves in the field.'],
    ['Spray Propiconazole 25% EC', 'Mix 1 ml of medicine with 1 litre of water. Spray before 7 in the morning.'],
    ['Scan again after 7 days', 'If yellow stripes appear on new leaves, repeat the spray.'],
  ],
} as const;

function copy(language: Language) {
  return language === 'en' ? text.en : text.hi;
}

function readImagePayload(file: File): Promise<ImagePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the photo.'));
    reader.onload = () => {
      const originalUrl = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          reject(new Error('This browser cannot inspect the photo.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let brightnessTotal = 0;
        let edgeTotal = 0;
        let edgeCount = 0;
        for (let y = 1; y < canvas.height; y += 2) {
          for (let x = 1; x < canvas.width; x += 2) {
            const offset = (y * canvas.width + x) * 4;
            const previous = (y * canvas.width + x - 1) * 4;
            const brightness = (pixels[offset] * 299 + pixels[offset + 1] * 587 + pixels[offset + 2] * 114) / 1000;
            const previousBrightness = (pixels[previous] * 299 + pixels[previous + 1] * 587 + pixels[previous + 2] * 114) / 1000;
            brightnessTotal += brightness;
            edgeTotal += Math.abs(brightness - previousBrightness);
            edgeCount += 1;
          }
        }
        const brightness = Math.round((brightnessTotal / Math.max(1, edgeCount)) * 10) / 10;
        const sharpness = Math.round((edgeTotal / Math.max(1, edgeCount)) * 10) / 10;
        const blurScore = Math.round(Math.min(100, sharpness * 4) * 10) / 10;
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          url: originalUrl,
          name: file.name,
          imageBase64: compressed.split(',')[1] ?? '',
          mimeType: 'image/jpeg',
          quality: { brightness, blurScore, sharpness },
        });
      };
      image.onerror = () => reject(new Error('This photo could not be decoded.'));
      image.src = originalUrl;
    };
    reader.readAsDataURL(file);
  });
}

function offlineResult(language: Language, quality?: ImagePayload['quality']): CropAnalysisResult {
  const c = copy(language);
  const isDark = Boolean(quality && quality.brightness < 35);
  const isBright = Boolean(quality && quality.brightness > 235);
  const isSoft = Boolean(quality && quality.blurScore < 4);
  return {
    status: 'uncertain',
    disease: null,
    commonName: null,
    scientificName: null,
    confidence: 0,
    severity: 'unknown',
    yieldImpact: { minPercent: 0, maxPercent: 0 },
    summary: isDark || isBright || isSoft ? `${c.uncertainTitle}. ${c.uncertainSub}.` : c.noTreatment,
    treatment: [c.noTreatment, c.photoHint],
    reasoning: `${c.visibleEvidence}: ${isDark ? 'photo is too dark' : isBright ? 'photo is overexposed' : isSoft ? 'photo lacks sharp detail' : 'a vision provider was not reachable'}.`,
    analysisMode: 'offline-quality-check',
  };
}

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function SmallLabel({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={cn('font-mono-app text-[10px] font-medium uppercase tracking-[.18em]', dark ? 'text-[#dce3a8]/65' : 'text-[#58725d]')}>{children}</span>;
}

function StatusDot({ color = 'bg-[#d8a735]' }: { color?: string }) {
  return <span className={cn('pulse-dot inline-block h-2 w-2 rounded-full', color)} aria-hidden="true" />;
}

function StatCard({ label, value, detail, icon: Icon, accent = 'green' }: { label: string; value: string; detail: string; icon: typeof Activity; accent?: 'green' | 'ochre' | 'coral' }) {
  const colors = { green: 'bg-[#dce9c6] text-[#256149]', ochre: 'bg-[#f2e0a9] text-[#795d19]', coral: 'bg-[#f4d4c9] text-[#9a4d3b]' };
  return <article className="rounded-[1.25rem] border hairline bg-[#f8f4e9] p-4 transition-transform hover:-translate-y-1"><div className="flex items-start justify-between gap-3"><div><SmallLabel>{label}</SmallLabel><p className="mt-2 font-display text-[2rem] leading-none text-[#234b39]">{value}</p></div><span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', colors[accent])}><Icon size={17} strokeWidth={1.8} /></span></div><p className="mt-4 text-xs leading-relaxed text-[#6c7661]">{detail}</p></article>;
}

function Orb({ language, scanState, imageUrl, fileName, onStart, consent, onConsentChange, onFileChange }: { language: Language; scanState: ScanState; imageUrl: string | null; fileName: string; onStart: () => void; consent: boolean; onConsentChange: (value: boolean) => void; onFileChange: (payload: ImagePayload) => void }) {
  const c = copy(language);
  const orbRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const progress = scanState === 'scanning' ? 68 : scanState === 'result' ? 100 : 0;
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    try {
      onFileChange(await readImagePayload(file));
    } catch {
      onFileChange({
        url: URL.createObjectURL(file),
        name: file.name,
        imageBase64: '',
        mimeType: 'image/jpeg',
        quality: { brightness: 0, blurScore: 0, sharpness: 0 },
      });
    }
  };

  useEffect(() => {
    if (!orbRef.current) return;
    anime({ targets: orbRef.current, scale: [0.84, 1], rotateZ: [-8, 0], opacity: [0, 1], duration: 1100, easing: 'easeOutElastic(1, .65)' });
  }, []);
  useEffect(() => {
    if (!orbRef.current) return;
    anime.remove(orbRef.current);
    if (scanState === 'scanning') anime({ targets: orbRef.current, rotateY: '1turn', duration: 2400, easing: 'easeInOutSine', loop: true });
    else anime({ targets: orbRef.current, rotateY: 0, duration: 600, easing: 'easeOutCubic' });
  }, [scanState]);
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!orbRef.current || scanState === 'scanning') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    anime({ targets: orbRef.current, rotateX: y * -18, rotateY: x * 20, duration: 400, easing: 'easeOutQuad' });
  };

  return <div className="relative flex min-h-[470px] items-center justify-center overflow-hidden rounded-[1.6rem] border border-[#456f57] bg-[#173f32] px-5 py-10 shadow-[12px_14px_0_#d6dd9b]" onPointerMove={pointerMove} onPointerLeave={() => orbRef.current && anime({ targets: orbRef.current, rotateX: 0, rotateY: 0, duration: 650, easing: 'easeOutElastic(1,.6)' })}>
    <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" data-testid="input-crop-photo" />
    <div className="absolute inset-6 rounded-[1.25rem] border border-[#dce3a8]/15" />
    <div className="absolute left-8 top-8 flex items-center gap-2"><StatusDot color="bg-[#dce3a8]" /><SmallLabel dark>{c.model}</SmallLabel></div>
    <div className="absolute right-8 top-8 font-mono-app text-[10px] text-[#dce3a8]/55">LAT 27.18° · LON 78.01°</div>
    <div className="scan-ring relative flex h-[250px] w-[250px] items-center justify-center rounded-full border border-[#dce3a8]/30" style={{ perspective: 900 }}>
      <div className="absolute h-[190px] w-[190px] rounded-full border border-[#dce3a8]/25" />
      <div ref={orbRef} className="orb relative flex h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-full bg-[#6b9b51] transition-colors" style={{ transform: 'rotateX(0deg) rotateY(0deg)' }}>
        {imageUrl ? <img src={imageUrl} alt={fileName || c.photoReady} className="absolute inset-0 h-full w-full object-cover" /> : <Leaf size={58} strokeWidth={1.05} className="float-slow text-[#e8eeae]" />}
        {scanState === 'scanning' && <span className="scan-beam absolute left-2 right-2 top-1/2 h-10 rounded-full border-y border-[#efc15b]/80 bg-[#efc15b]/20" />}
        {scanState === 'result' && <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#f1ae65] text-[#234b39]"><Check size={18} strokeWidth={3} /></span>}
      </div>
    </div>
    <div className="absolute bottom-7 left-8 right-8 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div><SmallLabel dark>{scanState === 'scanning' ? c.analyzing.toUpperCase() : scanState === 'result' ? c.complete.toUpperCase() : scanState === 'error' ? c.uncertainTitle.toUpperCase() : imageUrl ? c.photoReady.toUpperCase() : c.ready.toUpperCase()}</SmallLabel><p className="mt-2 max-w-[260px] text-xs leading-relaxed text-[#dce3a8]/70">{imageUrl ? fileName : c.photoHint}</p></div>
        <button onClick={() => fileRef.current?.click()} className="flex shrink-0 items-center gap-2 rounded-xl border border-[#dce3a8]/30 bg-[#234b39] px-3 py-2 text-[11px] font-bold text-[#f3efd8] hover:bg-[#345c44]" data-testid="button-upload-photo"><ImagePlus size={15} /> {c.choosePhoto}</button>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-[11px] text-[#dce3a8]/75"><input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} className="mt-0.5 accent-[#efc15b]" data-testid="checkbox-local-consent" /><span>{c.consent} <em className="not-italic opacity-60">(local only)</em></span></label>
      <button onClick={onStart} disabled={!consent || scanState === 'scanning'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#efc15b] px-4 py-3 text-sm font-bold text-[#173f32] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-start-scan">{scanState === 'scanning' ? <><Activity size={16} className="animate-pulse" /> {c.running}</> : scanState === 'result' ? <><RefreshCw size={16} /> {c.rescan}</> : <><ScanLine size={16} /> {c.analyze}</>}</button>
    </div>
    {scanState === 'scanning' && <div className="absolute bottom-1 left-0 h-1 bg-[#efc15b] transition-all duration-700" style={{ width: `${progress}%` }} />}
  </div>;
}

function ResultCard({ language, result, onSpeak }: { language: Language; result: CropAnalysisResult; onSpeak: () => void }) {
  const c = copy(language);
  const isUncertain = result.status === 'uncertain';
  const title = result.disease ?? c.uncertainTitle;
  const subtitle = result.commonName && result.scientificName ? `${result.commonName} · ${result.scientificName}` : c.uncertainSub;
  const impact = result.yieldImpact.maxPercent > 0 ? `${result.yieldImpact.minPercent}–${result.yieldImpact.maxPercent}% ${c.resultImpact}` : c.noYieldEstimate;
  return <article className="scan-result rounded-[1.25rem] border border-[#e3cda1] bg-[#f6e9c9] p-5 shadow-[5px_6px_0_#ddc998]"><div className="flex items-start justify-between gap-4"><div><SmallLabel>{result.analysisMode === 'gemini-vision' ? c.modeVision : c.modeOffline}</SmallLabel><h3 className="mt-2 font-display text-3xl text-[#234b39]">{title}</h3><p className="mt-1 text-xs text-[#6c7661]">{subtitle}</p></div><div className="rounded-xl bg-[#e9b760] px-3 py-2 text-right"><p className="font-mono-app text-xl font-medium text-[#234b39]">{Math.round(result.confidence * 100)}%</p><p className="text-[9px] uppercase text-[#234b39]/70">{c.confidence}</p></div></div><div className="my-5 h-px bg-[#d9c28d]" /><div className="grid gap-4 sm:grid-cols-[1fr_auto]"><div><div className="flex items-center gap-2 text-sm font-bold text-[#345c44]"><TrendingDown size={17} /> {impact}</div><p className="mt-2 max-w-[390px] text-xs leading-relaxed text-[#6c7661]">{result.summary}</p><p className="mt-3 rounded-lg bg-[#ead9ae]/70 p-3 text-xs leading-relaxed text-[#6c7661]"><strong>{c.visibleEvidence}:</strong> {result.reasoning}</p></div><button onClick={onSpeak} className="flex items-center justify-center gap-2 self-start rounded-xl border border-[#b69255] px-3 py-2 text-xs font-bold text-[#345c44] hover:bg-[#ead9ae]"><Volume2 size={15} /> {c.listen}</button></div><div className="mt-5 border-t border-[#d9c28d] pt-4 text-xs text-[#58725d]"><div className="flex items-center gap-2"><BadgeCheck size={16} className="text-[#256149]" /> {isUncertain ? c.noTreatment : result.treatment[0]}</div>{result.treatment.length > 1 && <ul className="mt-2 list-disc space-y-1 pl-5">{result.treatment.slice(1).map((step) => <li key={step}>{step}</li>)}</ul>}</div></article>;
}

function ScanSection({ language, onSpeak }: { language: Language; onSpeak: () => void }) {
  const c = copy(language);
  const [scanState, setScanState] = useState<ScanState>('ready');
  const [consent, setConsent] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [imagePayload, setImagePayload] = useState<ImagePayload | null>(null);
  const [result, setResult] = useState<CropAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startScan = async () => {
    if (!consent || !imagePayload?.imageBase64 || scanState === 'scanning') return;
    setScanState('scanning'); setError(null); setResult(null);
    try {
      const response = await fetch('/api/analyze-crop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: imagePayload.imageBase64, mimeType: imagePayload.mimeType, language, quality: imagePayload.quality }) });
      const payload = await response.json() as CropAnalysisResult | { message?: string };
      if (!response.ok || !('analysisMode' in payload)) throw new Error('message' in payload ? payload.message : 'The AI scan could not be completed.');
      setResult(payload); setScanState('result');
    } catch (scanError) { setError(scanError instanceof Error ? scanError.message : 'The AI scan could not be completed.'); setScanState('error'); }
  };
  return <section id="scan" className="scroll-mt-6 border-t border-[#d5d5b1] py-16"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SmallLabel>{c.scanLabel}</SmallLabel><h2 className="mt-2 max-w-[570px] font-display text-4xl leading-[.98] text-[#234b39] sm:text-5xl">{c.scanTitle1}<br /><span className="text-[#ad674d]">{c.scanTitle2}</span></h2></div><p className="max-w-[260px] text-sm leading-relaxed text-[#6c7661]">{c.scanIntro}</p></div><div className="grid gap-7 lg:grid-cols-[1.35fr_.8fr]"><Orb language={language} scanState={scanState} imageUrl={imageUrl} fileName={fileName} onStart={startScan} consent={consent} onConsentChange={setConsent} onFileChange={(payload) => { setImagePayload(payload); setImageUrl(payload.url); setFileName(payload.name); setResult(null); setError(null); setScanState('ready'); }} /><div className="flex flex-col gap-5">{scanState === 'result' && result ? <ResultCard language={language} result={result} onSpeak={onSpeak} /> : <div className="rounded-[1.25rem] border hairline bg-[#ece7d6] p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d9e5bf] text-[#256149]"><BrainCircuit size={22} /></div><h3 className="mt-5 font-display text-2xl text-[#234b39]">{c.promiseTitle1}<br />{c.promiseTitle2}</h3><p className="mt-3 text-sm leading-relaxed text-[#6c7661]">{error ?? c.promiseDesc}</p><div className="mt-6 space-y-3 text-xs text-[#58725d]"><div className="flex items-center gap-2"><LockKeyhole size={15} /> {c.privacy}</div><div className="flex items-center gap-2"><ShieldCheck size={15} /> {c.verified}</div><div className="flex items-center gap-2"><Headphones size={15} /> {c.voice}</div></div></div>}<div className="grid grid-cols-2 gap-4"><div className="rounded-[1.25rem] bg-[#c7d7a3] p-5"><SmallLabel>{c.cost}</SmallLabel><p className="mt-2 font-display text-3xl text-[#234b39]">₹0</p><p className="mt-1 text-xs text-[#58725d]">{c.costDetail}</p></div><div className="rounded-[1.25rem] bg-[#dce8cf] p-5"><SmallLabel>{c.time}</SmallLabel><p className="mt-2 font-display text-3xl text-[#234b39]">18s</p><p className="mt-1 text-xs text-[#58725d]">{c.timeDetail}</p></div></div></div></div></section>;
}

function FieldsSection({ language }: { language: Language }) {
  const c = copy(language);
  const [expanded, setExpanded] = useState(0);
  const [added, setAdded] = useState(false);
  return <section id="fields" className="scroll-mt-6 border-t border-[#d5d5b1] py-16"><div className="mb-8 flex items-end justify-between gap-4"><div><SmallLabel>{c.fieldsLabel}</SmallLabel><h2 className="mt-2 font-display text-4xl text-[#234b39]">{c.fieldsTitle}</h2></div><button onClick={() => setAdded(true)} className="flex items-center gap-2 rounded-xl border border-[#b7c5a2] px-3 py-2 text-xs font-bold text-[#345c44] hover:bg-[#e5ebd6]"><Plus size={15} /> {c.addField}</button></div><div className="grid gap-4 lg:grid-cols-3">{fields.map((field, index) => <button key={field.name} onClick={() => setExpanded(index)} className={cn('text-left rounded-[1.25rem] border p-5 transition-all hover:-translate-y-1', expanded === index ? 'border-[#79945e] bg-[#e5ebd3] shadow-[5px_6px_0_#c5d0a8]' : 'border-[#d7d5bd] bg-[#f8f4e9]')}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className={cn('h-3 w-3 rounded-full', field.tone === 'green' ? 'bg-[#6b9b51]' : field.tone === 'ochre' ? 'bg-[#d9a938]' : 'bg-[#c76c55]')} /><div><h3 className="font-bold text-[#234b39]">{field.name}</h3><p className="mt-0.5 text-[11px] text-[#74806a]">{field.local}</p></div></div><MoreHorizontal size={18} className="text-[#74806a]" /></div><div className="mt-7 flex items-end justify-between"><div><p className="font-display text-4xl text-[#234b39]">{field.health}<span className="font-sans text-sm text-[#74806a]"> / 100</span></p><p className="mt-1 text-[11px] text-[#74806a]">{c.health}</p></div><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', field.health > 85 ? 'bg-[#d5e6c0] text-[#3a684a]' : field.health > 70 ? 'bg-[#f0dfab] text-[#7b5b17]' : 'bg-[#f1d0c4] text-[#934b3a]')}>{field.health > 85 ? c.healthy : field.health > 70 ? c.attention : c.pending}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#d3d8bd]"><div className={cn('h-full rounded-full', field.tone === 'green' ? 'bg-[#6b9b51]' : field.tone === 'ochre' ? 'bg-[#d9a938]' : 'bg-[#c76c55]')} style={{ width: `${field.health}%` }} /></div><div className="mt-4 flex items-center justify-between text-xs text-[#74806a]"><span>{field.acres} {c.acres}</span><ChevronRight size={15} className={cn('transition-transform', expanded === index && 'translate-x-1 text-[#345c44]')} /></div></button>)}</div><div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-[#b9c9a4] bg-[#edf1df] px-5 py-4 text-sm text-[#58725d]"><MapPin size={18} className="text-[#6b9b51]" /><span>{added ? <><strong className="text-[#345c44]">{c.newField}</strong> · {language === 'en' ? 'Fill in a name and crop to add it to your list' : 'नाम और फसल भरकर इसे अपनी सूची में जोड़ें'}</> : <><strong className="text-[#345c44]">{fields[expanded].name}</strong> · {c.fieldLatest}</>}</span><ArrowRight size={16} className="ml-auto" /></div></section>;
}

function HistorySection({ language }: { language: Language }) {
  const c = copy(language);
  const history = language === 'en' ? [['17 May', 'Gangapur wheat', 'Yellow rust', 'Treat today'], ['14 May', 'Kachhua rice', 'Healthy leaf', 'Keep watching'], ['06 May', 'Nagla vegetable plot', 'Leaf spot', 'Treatment done']] : [['17 मई', 'गंगापुर गेहूँ', 'पीला रतुआ', 'आज इलाज करें'], ['14 मई', 'कछुआ धान', 'स्वस्थ पत्ती', 'निगरानी जारी'], ['06 मई', 'नगला सब्ज़ी बाड़ी', 'पत्ती धब्बा', 'इलाज पूरा']];
  return <section id="history" className="scroll-mt-6 border-t border-[#d5d5b1] py-16"><div className="mb-8"><SmallLabel>{c.historyLabel}</SmallLabel><h2 className="mt-2 font-display text-4xl text-[#234b39]">{c.historyTitle}</h2></div><div className="overflow-hidden rounded-[1.25rem] border hairline bg-[#f8f4e9]">{history.map((item, index) => <div key={item[0]} className={cn('grid gap-3 p-5 sm:grid-cols-[90px_1fr_130px_125px] sm:items-center', index !== history.length - 1 && 'border-b hairline')}><div><SmallLabel>{item[0]}</SmallLabel><p className="mt-1 text-xs text-[#74806a]">2025</p></div><div><p className="font-bold text-[#345c44]">{item[2]}</p><p className="mt-1 text-xs text-[#74806a]">{item[1]}</p></div><div className="flex items-center gap-2 text-xs text-[#58725d]"><span className="h-2 w-2 rounded-full bg-[#d9a938]" /> {c.confidence} {index === 0 ? '78%' : index === 1 ? '94%' : '71%'}</div><span className={cn('w-fit rounded-full px-2.5 py-1 text-[10px] font-bold', index === 1 ? 'bg-[#d5e6c0] text-[#3a684a]' : index === 0 ? 'bg-[#f1d0c4] text-[#934b3a]' : 'bg-[#f0dfab] text-[#7b5b17]')}>{item[3]}</span></div>)}</div><button onClick={() => document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' })} className="mt-4 flex items-center gap-2 text-xs font-bold text-[#3a684a] hover:text-[#234b39]">{c.fullHistory} <ArrowRight size={15} /></button></section>;
}

function GuideSection({ language, onSpeak }: { language: Language; onSpeak: () => void }) {
  const c = copy(language);
  const [done, setDone] = useState([true, false, false]);
  const steps = treatmentSteps[language === 'en' ? 'en' : 'hi'];
  const icons = [Eye, Droplets, CalendarDays];
  return <section id="guide" className="scroll-mt-6 border-t border-[#d5d5b1] py-16"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SmallLabel>{c.guideLabel}</SmallLabel><h2 className="mt-2 font-display text-4xl text-[#234b39]">{c.guideTitle}</h2></div><button onClick={onSpeak} className="flex w-fit items-center gap-2 rounded-xl bg-[#345c44] px-4 py-2.5 text-xs font-bold text-[#f5efdb] hover:bg-[#234b39]"><Volume2 size={15} /> {c.listenAll}</button></div><div className="grid gap-7 lg:grid-cols-[1fr_.7fr]"><div className="space-y-3">{steps.map((step, index) => { const Icon = icons[index]; return <button key={step[0]} onClick={() => setDone((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} className={cn('flex w-full items-start gap-4 rounded-[1.25rem] border p-5 text-left transition-colors', done[index] ? 'border-[#9ab27b] bg-[#e4edd4]' : 'border-[#d7d5bd] bg-[#f8f4e9]')}><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', done[index] ? 'bg-[#6b9b51] text-[#f5efdb]' : 'bg-[#e9dfbd] text-[#806526]')}>{done[index] ? <Check size={18} /> : <Icon size={18} />}</span><span><span className="flex items-center gap-2 font-bold text-[#345c44]">{step[0]}{done[index] && <span className="text-[10px] font-medium text-[#6b9b51]">{language === 'en' ? 'Done' : 'पूरा'}</span>}</span><span className="mt-1.5 block text-xs leading-relaxed text-[#74806a]">{step[1]}</span></span><ChevronDown size={16} className="ml-auto mt-1 shrink-0 text-[#74806a]" /></button>; })}</div><aside className="rounded-[1.25rem] bg-[#e6d3a8] p-6"><div className="flex items-center gap-2 text-[#7b5b17]"><BadgeCheck size={18} /><SmallLabel>{c.verifiedYear}</SmallLabel></div><h3 className="mt-7 font-display text-3xl leading-tight text-[#4c4a2a]">{c.guideAside1}<br />{c.guideAside2}</h3><div className="mt-7 space-y-4 border-t border-[#c8b681] pt-5 text-sm text-[#6f6035]"><div className="flex justify-between gap-4"><span>{c.medicine}</span><strong className="font-mono-app text-[#4c4a2a]">₹180–240</strong></div><div className="flex justify-between gap-4"><span>{c.tanks}</span><strong className="font-mono-app text-[#4c4a2a]">2 tanks</strong></div><div className="flex justify-between gap-4"><span>{c.savedYield}</span><strong className="font-mono-app text-[#4c4a2a]">+12–18%</strong></div></div></aside></div></section>;
}

function YieldSection({ language }: { language: Language }) {
  const c = copy(language);
  const [acres, setAcres] = useState(2.4);
  const base = Math.round(18.4 * acres * 10) / 10;
  const protectedYield = Math.round(base * 1.14 * 10) / 10;
  return <section id="yield" className="scroll-mt-6 border-t border-[#d5d5b1] py-16"><div className="mb-8"><SmallLabel>{c.yieldLabel}</SmallLabel><h2 className="mt-2 max-w-[530px] font-display text-4xl leading-[1.02] text-[#234b39]">{c.yieldTitle1}<br /><span className="text-[#ad674d]">{c.yieldTitle2}</span></h2></div><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-[1.25rem] bg-[#345c44] p-6 text-[#f3efd8]"><SmallLabel dark>GANGAPUR · WHEAT</SmallLabel><p className="mt-7 font-display text-6xl">{protectedYield}<span className="ml-2 text-xl text-[#dce3a8]/70">{language === 'en' ? 'qtl' : 'क्विंटल'}</span></p><p className="mt-2 text-xs text-[#dce3a8]/70">{c.afterTreatment}</p><div className="mt-8 flex items-center gap-2 text-xs text-[#dce3a8]/80"><TrendingUp size={16} className="text-[#efc15b]" /> {c.better}</div></div><div className="rounded-[1.25rem] border hairline bg-[#f8f4e9] p-6"><div className="flex items-center justify-between"><div><SmallLabel>{language === 'en' ? 'FIELD SIZE' : 'खेत का आकार'}</SmallLabel><p className="mt-1 text-sm text-[#74806a]">{c.areaPrompt}</p></div><span className="font-mono-app text-2xl text-[#345c44]">{acres.toFixed(1)} <span className="text-xs">{c.acres}</span></span></div><input type="range" min="0.5" max="5" step="0.1" value={acres} onChange={(event) => setAcres(Number(event.target.value))} className="mt-8 w-full accent-[#6b9b51]" /><div className="mt-2 flex justify-between font-mono-app text-[10px] text-[#9a9b82]"><span>0.5</span><span>5.0 {c.acres}</span></div><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#edf1df] p-4"><SmallLabel>{c.normal}</SmallLabel><p className="mt-2 font-display text-2xl text-[#58725d]">{base}</p><p className="text-[10px] text-[#74806a]">{language === 'en' ? 'quintals' : 'क्विंटल'}</p></div><div className="rounded-xl bg-[#e5d7af] p-4"><SmallLabel>{c.canSave}</SmallLabel><p className="mt-2 font-display text-2xl text-[#7b5b17]">+{(protectedYield - base).toFixed(1)}</p><p className="text-[10px] text-[#74806a]">{language === 'en' ? 'quintals' : 'क्विंटल'}</p></div></div></div></div></section>;
}

function SyncCard({ language }: { language: Language }) {
  const c = copy(language);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const sync = () => { setSyncing(true); window.setTimeout(() => { setSyncing(false); setSynced(true); }, 1300); };
  return <div className="rounded-[1.25rem] border border-[#b9c9a4] bg-[#e7edda] p-5"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#345c44] text-[#e8eeae]"><CloudOff size={19} /></span><div><p className="font-bold text-[#345c44]">{c.syncTitle}</p><p className="mt-1 text-xs text-[#74806a]">{synced ? c.syncedBody : c.syncBody}</p></div></div><button onClick={sync} disabled={syncing} className="flex items-center gap-2 rounded-lg border border-[#9ab27b] bg-[#f1f3e5] px-3 py-2 text-[11px] font-bold text-[#345c44] disabled:opacity-60">{syncing ? <RefreshCw size={14} className="animate-spin" /> : <CloudUpload size={14} />}{syncing ? c.syncing : synced ? c.synced : c.syncButton}</button></div><div className="mt-4 flex gap-1">{[1, 2, 3, 4, 5, 6, 7].map((item) => <span key={item} className={cn('h-1.5 flex-1 rounded-full', item < 5 ? 'bg-[#6b9b51]' : 'bg-[#c6d0b0]')} />)}</div><p className="mt-2 font-mono-app text-[9px] uppercase tracking-wider text-[#74806a]">{c.localQueue}</p></div>;
}

function navItems(language: Language) {
  const c = copy(language);
  return [
    { id: 'overview', label: c.nav[0], helper: c.today, icon: Gauge },
    { id: 'scan', label: c.nav[1], helper: c.scan, icon: ScanLine },
    { id: 'fields', label: c.nav[2], helper: c.fields, icon: Wheat },
    { id: 'history', label: c.nav[3], helper: c.history, icon: History },
    { id: 'guide', label: c.nav[4], helper: c.guide, icon: BookOpen },
    { id: 'yield', label: c.nav[5], helper: c.yield, icon: BarChart3 },
  ];
}

function Sidebar({ active, setActive, language, setLanguage }: { active: string; setActive: (id: string) => void; language: Language; setLanguage: (language: Language) => void }) {
  const c = copy(language);
  const items = navItems(language);
  const go = (id: string) => { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return <aside className="sticky top-0 hidden h-screen w-[255px] shrink-0 flex-col bg-[#173f32] px-5 py-6 text-[#f3efd8] lg:flex"><div className="flex items-center gap-3 px-2"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#efc15b] text-[#173f32]"><Sprout size={22} /></span><div><p className="font-bold tracking-tight">AgriVision <span className="text-[#efc15b]">AI</span></p><p className="font-mono-app text-[9px] tracking-widest text-[#dce3a8]/60">FIELD INTELLIGENCE</p></div></div><div className="mt-12 flex-1 space-y-1">{items.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => go(item.id)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors', active === item.id ? 'bg-[#345c44] text-[#f3efd8]' : 'text-[#dce3a8]/65 hover:bg-[#234b39] hover:text-[#f3efd8]')}><Icon size={17} strokeWidth={1.8} /><span className="flex-1 text-sm">{item.label}</span><span className="font-mono-app text-[9px] opacity-50">{item.helper}</span></button>; })}</div><div className="border-t border-[#dce3a8]/15 pt-5"><div className="mb-2 font-mono-app text-[9px] uppercase tracking-widest text-[#dce3a8]/40">{c.language}</div><div className="grid grid-cols-3 gap-1 rounded-xl bg-[#234b39] p-1"><button onClick={() => setLanguage('hi')} className={cn('rounded-lg px-1 py-2 text-[10px]', language === 'hi' ? 'bg-[#efc15b] font-bold text-[#173f32]' : 'text-[#dce3a8]/70')}>हिन्दी</button><button onClick={() => setLanguage('en')} className={cn('rounded-lg px-1 py-2 text-[10px]', language === 'en' ? 'bg-[#efc15b] font-bold text-[#173f32]' : 'text-[#dce3a8]/70')}>English</button><button onClick={() => setLanguage('braj')} className={cn('rounded-lg px-1 py-2 text-[10px]', language === 'braj' ? 'bg-[#efc15b] font-bold text-[#173f32]' : 'text-[#dce3a8]/70')}>ब्रज</button></div></div></aside>;
}

function MobileHeader({ onMenu, language, onLanguageChange }: { onMenu: () => void; language: Language; onLanguageChange: (language: Language) => void }) {
  const c = copy(language);
  return <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#d5d5b1] bg-[#f1efdf]/95 px-4 py-3 backdrop-blur lg:hidden"><button onClick={onMenu} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#345c44] text-[#f3efd8]" aria-label="Open menu"><Menu size={19} /></button><div className="flex items-center gap-2"><Sprout size={20} className="text-[#345c44]" /><span className="font-bold text-[#234b39]">AgriVision <span className="text-[#ad674d]">AI</span></span></div><div className="flex items-center gap-2"><select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)} className="rounded-lg border border-[#b7c5a2] bg-[#e7edda] px-2 py-1 text-[10px] font-bold text-[#345c44]" aria-label={c.language}><option value="hi">हिन्दी</option><option value="en">English</option><option value="braj">ब्रज</option></select><span className="hidden items-center gap-1.5 rounded-full bg-[#dce8cf] px-2.5 py-1 text-[10px] font-bold text-[#3a684a] sm:flex"><StatusDot color="bg-[#6b9b51]" /> {c.offline}</span></div></header>;
}

function Dashboard() {
  const [active, setActive] = useState('overview');
  const [language, setLanguage] = useState<Language>('hi');
  const [mobileMenu, setMobileMenu] = useState(false);
  const c = copy(language);
  const speak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(language === 'en' ? 'Yellow stripes on the leaves are an early sign of yellow rust. Treat the crop today.' : 'पीली धारियों वाली पत्तियां पीला रतुआ का संकेत हैं। आज इलाज करें।');
      utterance.lang = language === 'en' ? 'en-IN' : 'hi-IN';
      window.speechSynthesis.speak(utterance);
    }
  };
  useEffect(() => {
    const onScroll = () => { const found = navItems(language).slice().reverse().find((item) => { const node = document.getElementById(item.id); return node && node.getBoundingClientRect().top < 180; }); if (found) setActive(found.id); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [language]);
  useEffect(() => { anime({ targets: '.reveal', translateY: [18, 0], opacity: [0, 1], delay: anime.stagger(75), duration: 720, easing: 'easeOutCubic' }); }, []);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const items = navItems(language);
  return <div className="grain min-h-[100dvh] bg-[#f1efdf]">
    <div className={cn('fixed inset-0 z-50 bg-[#173f32]/80 transition-opacity lg:hidden', mobileMenu ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setMobileMenu(false)}><div className={cn('h-full w-[285px] bg-[#173f32] p-5 text-[#f3efd8] transition-transform', mobileMenu ? 'translate-x-0' : '-translate-x-full')} onClick={(event) => event.stopPropagation()}><div className="flex justify-between"><div className="flex items-center gap-2"><Sprout className="text-[#efc15b]" /><b>AgriVision AI</b></div><button onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18} /></button></div><div className="mt-10 space-y-1">{items.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setActive(item.id); setMobileMenu(false); window.setTimeout(() => scrollTo(item.id), 50); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#dce3a8]/80 hover:bg-[#345c44]"><Icon size={17} />{item.label}</button>; })}</div></div></div>
    <div className="flex min-h-[100dvh]"><Sidebar active={active} setActive={setActive} language={language} setLanguage={setLanguage} /><main className="min-w-0 flex-1"><MobileHeader onMenu={() => setMobileMenu(true)} language={language} onLanguageChange={setLanguage} /><div className="mx-auto max-w-[1340px] px-4 pb-20 sm:px-8 lg:px-12">
      <header className="reveal flex items-center justify-between py-5"><div><p className="font-mono-app text-[10px] uppercase tracking-[.18em] text-[#74806a]">{c.date}</p><h1 className="mt-1 text-sm font-bold text-[#345c44] sm:text-base">{c.greeting}</h1></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-[#c7d2b3] bg-[#e7edda] px-3 py-2 text-[11px] font-bold text-[#3a684a] sm:flex"><StatusDot color="bg-[#6b9b51]" /> {c.offline} <span className="font-normal text-[#74806a]">· {c.aiActive}</span></div><button onClick={() => scrollTo('history')} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#d5d5b1] bg-[#f8f4e9] text-[#58725d]" aria-label="Notifications"><Bell size={16} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#c76c55]" /></button><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ad674d] font-bold text-[#f5efdb]">M</div></div></header>
      <section id="overview" className="reveal scroll-mt-6 pb-12 pt-8"><div className="grid items-end gap-8 xl:grid-cols-[1fr_440px]"><div><div className="mb-5 flex items-center gap-2"><StatusDot color="bg-[#6b9b51]" /><SmallLabel>{c.companion}</SmallLabel></div><h2 className="max-w-[760px] font-display text-[3.5rem] leading-[.91] tracking-[-.03em] text-[#234b39] sm:text-[5.8rem]">{c.hero1}<br /><span className="text-[#ad674d]">{c.hero2}</span> <span className="text-[#345c44]">{c.hero3}</span></h2><p className="mt-7 max-w-[520px] text-base leading-relaxed text-[#6c7661]">{c.heroDesc}</p><div className="mt-8 flex flex-wrap items-center gap-3"><button onClick={() => scrollTo('scan')} className="flex items-center gap-2 rounded-xl bg-[#345c44] px-5 py-3 text-sm font-bold text-[#f5efdb] shadow-[4px_5px_0_#b7c38d] transition-transform hover:-translate-y-1"><ScanLine size={17} /> {c.startScan} <ArrowRight size={15} /></button><button onClick={() => scrollTo('guide')} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[#58725d] hover:bg-[#e4e8d5]"><Play size={14} fill="currentColor" /> {c.how}</button></div></div><div className="relative hidden h-[250px] xl:block"><div className="absolute right-10 top-2 h-[160px] w-[160px] rounded-[52%_48%_44%_56%] border-[18px] border-[#6b9b51] rotate-[-32deg]" /><div className="absolute right-[100px] top-[88px] h-[180px] w-[5px] rotate-[32deg] bg-[#345c44]" /><div className="absolute right-[2px] top-[43px] w-[230px] rotate-[-10deg] border-t border-dashed border-[#78955b]" /><span className="absolute right-0 top-0 rounded-full bg-[#efc15b] px-3 py-2 font-mono-app text-[10px] text-[#234b39]">signal / 04</span><span className="absolute bottom-3 right-[205px] rounded-full bg-[#e4d4b4] px-3 py-2 text-[10px] text-[#7b5b17]">soil → leaf → yield</span></div></div><div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3"><StatCard label={c.stats[0]} value="4.9 ac" detail={c.statsDetail[0]} icon={Wheat} /><StatCard label={c.stats[1]} value="78 / 100" detail={c.statsDetail[1]} icon={Activity} accent="ochre" /><StatCard label={c.stats[2]} value="+14%" detail={c.statsDetail[2]} icon={TrendingUp} accent="coral" /></div></section>
      <SyncCard language={language} /><ScanSection language={language} onSpeak={speak} /><FieldsSection language={language} /><HistorySection language={language} /><GuideSection language={language} onSpeak={speak} /><YieldSection language={language} />
      <footer className="border-t border-[#d5d5b1] py-10"><div className="flex flex-col justify-between gap-5 text-xs text-[#74806a] sm:flex-row"><div className="flex items-center gap-2 font-bold text-[#345c44]"><Sprout size={17} /> AgriVision AI <span className="font-normal text-[#9a9b82]">· {c.footer}</span></div><div className="flex items-center gap-4"><span className="flex items-center gap-1.5"><Radio size={13} /> {c.localPrototype}</span><span>v0.8.4</span></div></div></footer>
    </div></main></div>
  </div>;
}

function Router() {
  return <ErrorBoundary resetKey={useLocation()[0]}><Switch><Route path="/" component={Dashboard} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
