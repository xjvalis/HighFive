import { useState } from "react";
import { format } from "date-fns";
import { Share2, Download, Loader2, Copy, Check } from "lucide-react";
import { getCategoryStyle } from "@/lib/categories";

// Per-category gradient palettes [from, to, accent]
const CATEGORY_PALETTES = {
  Sport:        ["#064e3b", "#065f46", "#34d399"],
  "Board Games":["#4c1d95", "#5b21b6", "#a78bfa"],
  Hangout:      ["#92400e", "#b45309", "#fcd34d"],
  Culture:      ["#831843", "#9d174d", "#f9a8d4"],
  Movies:       ["#1e3a5f", "#1e40af", "#93c5fd"],
  Music:        ["#3b0764", "#6b21a8", "#e879f9"],
  Gaming:       ["#312e81", "#4338ca", "#818cf8"],
  Food:         ["#7c2d12", "#9a3412", "#fdba74"],
  Creative:     ["#881337", "#9f1239", "#fda4af"],
  Tech:         ["#0c4a6e", "#0369a1", "#7dd3fc"],
  Outdoors:     ["#14532d", "#166534", "#86efac"],
  Study:        ["#713f12", "#854d0e", "#fde047"],
  Wellness:     ["#134e4a", "#0f766e", "#5eead4"],
  Nightlife:    ["#1e1b4b", "#312e81", "#c4b5fd"],
  Other:        ["#374151", "#4b5563", "#9ca3af"],
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return Math.min(lines.length, 2);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generateShareCanvas(event) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");

    const cat = getCategoryStyle(event.category);
    const palette = CATEGORY_PALETTES[event.category] || CATEGORY_PALETTES.Other;
    const [c1, c2, accent] = palette;

    // ── Background gradient ──
    const bg = ctx.createLinearGradient(0, 0, 1200, 630);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 630);

    // ── Decorative blobs ──
    ctx.globalAlpha = 0.15;
    ctx.beginPath(); ctx.arc(1100, -60, 320, 0, Math.PI * 2);
    ctx.fillStyle = accent; ctx.fill();
    ctx.beginPath(); ctx.arc(-60, 700, 280, 0, Math.PI * 2);
    ctx.fillStyle = accent; ctx.fill();
    ctx.globalAlpha = 1;

    // ── Noise / texture overlay (subtle dot grid) ──
    ctx.globalAlpha = 0.04;
    for (let x = 0; x < 1200; x += 30) {
      for (let y = 0; y < 630; y += 30) {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ── White card panel ──
    ctx.fillStyle = "rgba(255,255,255,0.97)";
    roundRect(ctx, 60, 60, 780, 510, 28);
    ctx.fill();

    // ── Category pill ──
    ctx.fillStyle = accent + "28"; // semi-transparent accent
    roundRect(ctx, 100, 108, 200, 44, 22);
    ctx.fill();
    ctx.font = "600 20px Arial";
    ctx.fillStyle = accent === "#9ca3af" ? "#374151" : c1;
    ctx.fillText(`${cat.emoji}  ${event.category}`, 122, 136);

    // ── Title ──
    ctx.font = "bold 58px Arial";
    ctx.fillStyle = "#111827";
    wrapText(ctx, event.title, 100, 215, 720, 70);

    // ── Divider ──
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(100, 310, 700, 1.5);

    // ── Date row ──
    ctx.font = "500 30px Arial";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("📅", 100, 365);
    ctx.fillStyle = "#1f2937";
    ctx.fillText(format(new Date(event.date), "EEEE d. MMMM yyyy · HH:mm"), 148, 365);

    // ── Location row ──
    ctx.fillStyle = "#6b7280";
    ctx.fillText("📍", 100, 420);
    ctx.fillStyle = "#1f2937";
    const loc = (event.location || "").length > 52 ? event.location.slice(0, 52) + "…" : (event.location || "Místo neuvedeno");
    ctx.fillText(loc, 148, 420);

    // ── Participants row ──
    const count = event.participants?.length || 0;
    ctx.fillStyle = "#6b7280";
    ctx.fillText("👥", 100, 475);
    ctx.fillStyle = "#1f2937";
    ctx.fillText(`${count}${event.max_capacity ? `/${event.max_capacity}` : ""} účastníků`, 148, 475);

    // ── Right side: large emoji ──
    ctx.font = "180px Arial";
    ctx.textAlign = "center";
    ctx.fillText(cat.emoji, 960, 370);
    ctx.textAlign = "left";

    // ── Bottom strip: branding ──
    const strip = ctx.createLinearGradient(0, 540, 0, 630);
    strip.addColorStop(0, "rgba(0,0,0,0)");
    strip.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = strip;
    ctx.fillRect(0, 540, 1200, 90);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Arial";
    ctx.fillText("🙏  HighFive - najdi partu na cokoliv", 60, 600);

    // ── URL hint ──
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "18px Arial";
    ctx.textAlign = "right";
    ctx.fillText("highfive.app", 1140, 600);
    ctx.textAlign = "left";

    resolve(canvas.toDataURL("image/png"));
  });
}

export default function ShareEventButton({ event }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imgUrl, setImgUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const eventUrl = `${window.location.origin}/event/${event.id}`;
  const ogUrl = `${window.location.origin}/api/event-og?id=${event.id}`;
  const shareText = `🙌 ${event.title}\n📍 ${event.location || ""}\n📅 ${format(new Date(event.date), "d. M. yyyy · HH:mm")}\n\n${eventUrl}`;

  const handleOpen = async () => {
    setOpen(true);
    if (!imgUrl) {
      setGenerating(true);
      const url = await generateShareCanvas(event);
      setImgUrl(url);
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `${event.title.replace(/\s+/g, "-")}-highfive.png`;
    a.click();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SHARE_BTNS = [
    {
      label: "WhatsApp",
      emoji: "💬",
      bg: "bg-emerald-50 hover:bg-emerald-100",
      text: "text-emerald-700",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank"),
    },
    {
      label: "Facebook",
      emoji: "📘",
      bg: "bg-blue-50 hover:bg-blue-100",
      text: "text-blue-700",
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogUrl)}`, "_blank"),
    },
    {
      label: "X / Twitter",
      emoji: "🐦",
      bg: "bg-slate-50 hover:bg-slate-100",
      text: "text-slate-700",
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogUrl)}`, "_blank"),
    },
    {
      label: "Instagram",
      emoji: "📸",
      bg: "bg-pink-50 hover:bg-pink-100",
      text: "text-pink-700",
      action: downloadImage, // Instagram doesn't allow direct URL share — download card
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-xl"
      >
        <Share2 className="w-3.5 h-3.5" />
        Sdílet
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border/60 w-full max-w-md p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-grotesk font-semibold text-base">Sdílet událost</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
            </div>

            {/* OG Card preview */}
            <div className="rounded-2xl overflow-hidden bg-secondary mb-4 aspect-[1200/630] flex items-center justify-center shadow-md">
              {generating ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Generuji kartu…</span>
                </div>
              ) : imgUrl ? (
                <img src={imgUrl} alt="OG preview" className="w-full h-full object-cover" />
              ) : null}
            </div>

            {/* Share buttons grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {SHARE_BTNS.map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${btn.bg}`}
                >
                  <span className="text-xl">{btn.emoji}</span>
                  <span className={`text-[10px] font-medium ${btn.text}`}>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Copy + Download row */}
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Zkopírováno!" : "Kopírovat odkaz"}
              </button>
              <button
                onClick={downloadImage}
                disabled={!imgUrl}
                className="flex items-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" /> Stáhnout kartu
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center mt-3">
              💡 Pro Instagram Stories stáhni kartu a nahraj ji ručně
            </p>
          </div>
        </div>
      )}
    </div>
  );
}