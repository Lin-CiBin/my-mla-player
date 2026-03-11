"use client";
import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// --- 1. 曲库配置 ---
const LIBRARIES: Record<string, any> = {
  "tizzy-bac": {
    cover: "/my-mla-player/images/Tell_Tale_Heart.jpg",
    theme: "linear-gradient(150deg,#1a0c06,#2c1508 45%,#180b04)",
    tracks: [
      { id: 1, title: "開放性骨折", artist: "Tizzy Bac", src: "/my-mla-player/audio/bone.m4a" },
      { id: 2, title: "保險推銷員之死", artist: "Tizzy Bac", src: "/my-mla-player/audio/deathOfASalesman.m4a" },
      { id: 3, title: "末日鋼琴手", artist: "Tizzy Bac", src: "/my-mla-player/audio/doomsdayPianist.m4a" },
      { id: 4, title: "崇高与滑稽", artist: "Tizzy Bac", src: "/my-mla-player/audio/sublimeAndComic.m4a" },
    ]
  },
  "mla": {
    cover: "/my-mla-player/images/Joking_With_You.jpg",
    theme: "linear-gradient(150deg,#1a0c06,#2c1508 45%,#180b04)",
    tracks: [
      { id: 1, title: "德州之戀", artist: "My Little Airport", album: "跟你开玩笑", src: "/my-mla-player/audio/texasLove.m4a" },
      { id: 2, title: "呕吐", artist: "My Little Airport", album: "跟你开玩笑", src: "/my-mla-player/audio/puke.m4a" },
      { id: 3, title: "某夜後台", artist: "My Little Airport", album: "跟你开玩笑", src: "/my-mla-player/audio/theNightBackstage.m4a" },
      { id: 4, title: "循環的夜", artist: "My Little Airport", album: "跟你开玩笑", src: "/my-mla-player/audio/theRecurringNight.m4a" },
      { id: 5, title: "我不適合聚會", artist: "My Little Airport", album: "跟你开玩笑", src: "/my-mla-player/audio/partyMisfit.m4a" },
    ]
  }
};

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return mins + ":" + String(secs).padStart(2, "0");
}

// 内部逻辑组件
function PlayerContent() {
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string>("tizzy-bac");
  
  const [idx, setIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [cur, setCur] = useState<number>(0);
  const [dur, setDur] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [queue, setQueue] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isDragging = useRef<boolean>(false);

  // --- URL识别与清洗 ---
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl && LIBRARIES[idFromUrl]) {
      setActiveId(idFromUrl);
    }
    
    // 清理 URL 参数 (洗白)
    if (idFromUrl && typeof window !== "undefined") {
      const timer = setTimeout(() => {
        window.history.replaceState({}, "", "/my-mla-player/");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const config = LIBRARIES[activeId] || LIBRARIES["tizzy-bac"];
  const tracks = config.tracks;
  const track = tracks[idx] || tracks[0];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, idx, activeId]);

  const safeDur = dur > 0 ? dur : 100;
  const pct = (cur / safeDur) * 100;

  const onTimeUpdate = () => {
    if (audioRef.current && !isDragging.current) {
      setCur(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setDur(audioRef.current.duration);
    }
  };

  const handleSeekStart = () => { isDragging.current = true; };
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => { setCur(parseFloat(e.target.value)); };
  const handleSeekEnd = () => {
    if (audioRef.current) audioRef.current.currentTime = cur;
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  function goTo(i: number): void {
    setIdx(i);
    setCur(0);
    setDur(0);
    setPlaying(true);
    setQueue(false);
  }

  const prev = (): void => goTo((idx - 1 + tracks.length) % tracks.length);
  const next = (): void => goTo((idx + 1) % tracks.length);

  return (
    <div style={{ 
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      background: config.theme, fontFamily: "'DM Sans',sans-serif" 
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=DM+Sans:wght@400;500&display=swap');
        .vinyl { animation:spin 3s linear infinite; animation-play-state:paused; }
        .vinyl.on { animation-play-state:running; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes wavebar { from{transform:scaleY(0.3)} to{transform:scaleY(1)} }
        @keyframes fadeup { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes qslide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        input[type=range].seek { -webkit-appearance:none; background:transparent; width:100%; height:20px; position:absolute; z-index:10; cursor:pointer; }
        .seek::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#f5a623; border:2px solid #1a0c05; box-shadow:0 0 10px rgba(245,166,35,.6); }
        .btn-ctrl { border:none; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform .1s, opacity .15s; }
        .btn-ctrl:hover { opacity:.85; transform:scale(1.06); }
        .btn-ctrl:active { transform:scale(.94); }
      `}</style>

      <audio 
        ref={audioRef} src={track.src} 
        onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} 
        onEnded={next} preload="metadata" 
      />

      <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
        {/* QUEUE */}
        {queue && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, borderRadius: 28, background: "rgba(10,5,2,.98)", border: "1px solid rgba(245,166,35,.15)", padding: 24, animation: "qslide .25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", color: "#f5a623", fontSize: 20, fontWeight: 900 }}>Queue</span>
              <button onClick={() => setQueue(false)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.1)", color: "#fff", cursor: "pointer" }}>✕</button>
            </div>
            {tracks.map((t: any, i: number) => (
              <button key={t.id} onClick={() => goTo(i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 10, borderRadius: 14, marginBottom: 8, cursor: "pointer", border: "none", background: i === idx ? "rgba(245,166,35,.12)" : "rgba(255,255,255,.04)" }}>
                <img src={config.cover} style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: i === idx ? "#f5a623" : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{t.artist}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* CARD */}
        <div style={{ borderRadius: 28, overflow: "hidden", background: "linear-gradient(160deg,#2c1708,#1a0c05 55%,#230f06)", border: "1px solid rgba(245,166,35,.1)", boxShadow: "0 48px 96px rgba(0,0,0,.65)" }}>
          <div style={{ position: "relative", aspectRatio: "1/1" }}>
            <img src={config.cover} key={activeId + idx} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fadeup .4s ease" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 45%,rgba(14,6,2,.98))" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, background: "rgba(0,0,0,.65)", padding: "5px 0", borderTop: "1px solid rgba(245,166,35,.3)", borderBottom: "1px solid rgba(245,166,35,.3)", overflow: "hidden" }}>
              <div style={{ display: "inline-block", whiteSpace: "nowrap", animation: "marquee 14s linear infinite", color: "#f5a623", fontSize: 10, letterSpacing: "0.2em", fontWeight: 600, textTransform: "uppercase" }}>
                NOW PLAYING · {track.title} · {track.artist} &nbsp;&nbsp;&nbsp; NOW PLAYING · {track.title} · {track.artist} &nbsp;&nbsp;&nbsp;
              </div>
            </div>
            <div style={{ position: "absolute", bottom: -18, right: 20 }}>
              <div className={"vinyl" + (playing ? " on" : "")} style={{ width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle,#1a0e06 18%,#2e1a0e 20%,#1a0e06 52%)", border: "2px solid rgba(245,166,35,.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f5a623" }} />
              </div>
            </div>
          </div>

          <div style={{ padding: "30px 24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 key={track.title} style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "#fff", animation: "fadeup .4s ease" }}>{track.title}</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", marginTop: 6 }}>{track.artist}</p>
              </div>
              <button onClick={() => setLiked(!liked)} className="btn-ctrl" style={{ width: 36, height: 36, background: liked ? "rgba(245,166,35,.2)" : "rgba(255,255,255,.07)", color: liked ? "#f5a623" : "rgba(255,255,255,.35)" }}>
                <Heart size={18} fill={liked ? "#f5a623" : "transparent"} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32, margin: "14px 0" }}>
              {Array.from({ length: 22 }, (_, i) => 5 + Math.abs(Math.sin(i * .75)) * 22).map((h, i) => (
                <div key={i} style={{ width: 3, height: h, borderRadius: 4, background: (i / 22) * 100 < pct ? "#f5a623" : "rgba(255,255,255,.2)", animation: playing ? `wavebar ${.5 + Math.abs(Math.sin(h)) * .5}s ease-in-out ${i * 0.04}s infinite alternate` : "none" }} />
              ))}
            </div>

            <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: 3, borderRadius: 4, background: "rgba(255,255,255,.12)" }}>
                <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#c8440a,#f5a623)", borderRadius: 4 }} />
              </div>
              <input type="range" className="seek" min={0} max={safeDur} step={0.1} value={cur} onPointerDown={handleSeekStart} onChange={handleSeekChange} onPointerUp={handleSeekEnd} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 4 }}>
              <span>{fmt(cur)}</span><span>-{fmt(Math.max(0, dur - cur))}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={() => setQueue(true)} className="btn-ctrl" style={{ width: 38, height: 38, background: "rgba(255,255,255,.07)", color: "#fff" }}><ListMusic size={18} /></button>
              <button onClick={prev} className="btn-ctrl" style={{ width: 44, height: 44, background: "rgba(255,255,255,.08)", color: "#fff" }}><SkipBack size={22} /></button>
              <button onClick={() => setPlaying(!playing)} className="btn-ctrl" style={{ width: 64, height: 64, background: "linear-gradient(135deg,#d85510,#f5a623)", color: "#fff", boxShadow: "0 8px 28px rgba(220,80,16,.5)" }}>
                {playing ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button onClick={next} className="btn-ctrl" style={{ width: 44, height: 44, background: "rgba(255,255,255,.08)", color: "#fff" }}><SkipForward size={22} /></button>
              <button className="btn-ctrl" style={{ width: 38, height: 38, background: "rgba(255,255,255,.07)", color: "#fff" }}><Repeat size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 根入口，处理静态导出兼容性
export default function MusicPlayer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <PlayerContent />
    </Suspense>
  );
}