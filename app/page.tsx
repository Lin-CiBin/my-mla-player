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

// --- 1. 歌手库配置 ---
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
    cover: "/my-mla-player/images/mla_cover.jpg",
    theme: "linear-gradient(150deg,#0d1a06,#152c08 45%,#0b1804)", // 绿色系主题
    tracks: [
      { id: 1, title: "九龍公園游泳池", artist: "My Little Airport", src: "/my-mla-player/audio/klp.m4a" },
      { id: 2, title: "介乎法國與旺角的詩意", artist: "My Little Airport", src: "/my-mla-player/audio/mla_song2.m4a" },
    ]
  }
};

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return mins + ":" + String(secs).padStart(2, "0");
}

// --- 2. 播放器核心组件 ---
function PlayerCore() {
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [idx, setIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [cur, setCur] = useState<number>(0);
  const [dur, setDur] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [queue, setQueue] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isDragging = useRef<boolean>(false);

  // ── 【逻辑 1：识别歌手并洗白 URL】 ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 强制从原生 URL 接口读取，最稳健
      const params = new URLSearchParams(window.location.search);
      const idFromUrl = params.get("id");
      
      // 如果 URL 有有效 id，则设为该歌手，否则默认为 tizzy-bac
      const finalId = (idFromUrl && LIBRARIES[idFromUrl]) ? idFromUrl : "tizzy-bac";
      setActiveId(finalId);

      // 洗白：1秒后抹除 ?id=...
      if (idFromUrl) {
        setTimeout(() => {
          window.history.replaceState({}, "", "/my-mla-player/");
        }, 1000);
      }
    }
  }, [searchParams]);

  // ── 【逻辑 2：响应式高度修正】 ──
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
  }, []);

  // 如果还没识别出 ID，先不渲染内容（防止闪烁）
  if (!activeId) return <div style={{ background: "#000", height: "100vh" }} />;

  const config = LIBRARIES[activeId];
  const track = config.tracks[idx];

  // ── 【逻辑 3：播放控制】 ──
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
    if (audioRef.current && !isDragging.current) setCur(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current?.duration) {
      const d = audioRef.current.duration;
      if (isFinite(d)) setDur(d);
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

  return (
    <div style={{
      minHeight: "calc(var(--vh, 1vh) * 100)",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      background: config.theme,
      fontFamily: "'DM Sans',sans-serif",
      overflow: "hidden",
      transition: "background 0.5s ease"
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
        .seek::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#f5a623; border:2px solid #1a0c05; }
        .btn-ctrl { border:none; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .1s; }
        .btn-ctrl:active { transform:scale(.94); }
      `}</style>

      <audio 
        ref={audioRef} 
        src={track.src} 
        onTimeUpdate={onTimeUpdate} 
        onLoadedMetadata={onLoadedMetadata} 
        onEnded={() => goTo((idx + 1) % config.tracks.length)} 
      />

      <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
        {/* 播放列表队列 */}
        {queue && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, borderRadius: 28, background: "rgba(10,5,2,.98)", border: "1px solid rgba(245,166,35,.15)", padding: 24, animation: "qslide .25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", color: "#f5a623", fontSize: 20, fontWeight: 900 }}>Queue</span>
              <button onClick={() => setQueue(false)} style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer" }}>✕</button>
            </div>
            {config.tracks.map((t: any, i: number) => (
              <button key={t.id} onClick={() => goTo(i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 10, borderRadius: 14, marginBottom: 8, background: i === idx ? "rgba(245,166,35,.12)" : "rgba(255,255,255,.04)", border: "none", textAlign: "left", cursor: "pointer" }}>
                <img src={config.cover} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: i === idx ? "#f5a623" : "#fff", fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{t.artist}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 播放器主卡片 */}
        <div style={{ borderRadius: 28, overflow: "hidden", background: "linear-gradient(160deg,#2c1708,#1a0c05 55%,#230f06)", border: "1px solid rgba(245,166,35,.1)", boxShadow: "0 48px 96px rgba(0,0,0,.65)" }}>
          <div style={{ position: "relative", aspectRatio: "1/1" }}>
            <img src={config.cover} key={activeId + idx} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fadeup .4s ease" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 45%,rgba(14,6,2,.98))" }} />
            
            {/* 跑马灯文字 */}
            <div style={{ position: "absolute", bottom: 52, width: "100%", background: "rgba(0,0,0,.65)", padding: "5px 0", borderTop: "1px solid rgba(245,166,35,.3)", borderBottom: "1px solid rgba(245,166,35,.3)", overflow: "hidden" }}>
              <div style={{ display: "inline-block", whiteSpace: "nowrap", animation: "marquee 14s linear infinite", color: "#f5a623", fontSize: 10, letterSpacing: "0.2em", fontWeight: 600 }}>
                NOW PLAYING · {track.title.toUpperCase()} · {track.artist.toUpperCase()} &nbsp;&nbsp;&nbsp; NOW PLAYING · {track.title.toUpperCase()} · {track.artist.toUpperCase()} &nbsp;&nbsp;&nbsp;
              </div>
            </div>

            {/* 黑胶圆盘 */}
            <div style={{ position: "absolute", bottom: -18, right: 20 }}>
              <div className={"vinyl" + (playing ? " on" : "")} style={{ width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle,#1a0e06 18%,#2e1a0e 20%,#1a0e06 52%)", border: "2px solid rgba(245,166,35,.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f5a623", boxShadow: "0 0 8px rgba(245,166,35,.7)" }} />
              </div>
            </div>
          </div>

          <div style={{ padding: "30px 24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 key={track.title} style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.1, animation: "fadeup .4s ease" }}>{track.title}</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", marginTop: 6 }}>{track.artist}</p>
              </div>
              <button onClick={() => setLiked(!liked)} className="btn-ctrl" style={{ width: 36, height: 36, background: liked ? "rgba(245,166,35,.2)" : "rgba(255,255,255,.07)", color: liked ? "#f5a623" : "rgba(255,255,255,.35)" }}>
                <Heart size={18} fill={liked ? "#f5a623" : "transparent"} strokeWidth={2} />
              </button>
            </div>

            {/* 动态波形 */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32, margin: "14px 0" }}>
              {Array.from({ length: 22 }, (_, i) => 5 + Math.abs(Math.sin(i * .75)) * 22).map((h, i) => (
                <div key={i} style={{ width: 3, height: h, borderRadius: 4, background: (i / 22) * 100 < pct ? "#f5a623" : "rgba(255,255,255,.2)", animation: playing ? `wavebar ${.5 + Math.abs(Math.sin(h)) * .5}s ease-in-out ${i * 0.04}s infinite alternate` : "none", transition: "background 0.3s" }} />
              ))}
            </div>

            {/* 进度条 */}
            <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 4 }}>
                <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg,#c8440a,#f5a623)", borderRadius: 4, transition: "width 0.1s linear" }} />
              </div>
              <input type="range" className="seek" min={0} max={safeDur} step={0.1} value={cur} onPointerDown={handleSeekStart} onChange={handleSeekChange} onPointerUp={handleSeekEnd} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 4 }}>
              <span>{fmt(cur)}</span><span>-{fmt(Math.max(0, dur - cur))}</span>
            </div>

            {/* 核心控制键 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={() => setQueue(true)} className="btn-ctrl" style={{ width: 38, height: 38, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,0.6)" }}><ListMusic size={18} /></button>
              <button onClick={() => goTo((idx - 1 + config.tracks.length) % config.tracks.length)} className="btn-ctrl" style={{ width: 44, height: 44, background: "rgba(255,255,255,.08)", color: "#fff" }}><SkipBack size={22} /></button>
              <button onClick={() => setPlaying(!playing)} className="btn-ctrl" style={{ width: 64, height: 64, background: "linear-gradient(135deg,#d85510,#f5a623)", color: "#fff", boxShadow: "0 8px 28px rgba(220,80,16,.5)" }}>
                {playing ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button onClick={() => goTo((idx + 1) % config.tracks.length)} className="btn-ctrl" style={{ width: 44, height: 44, background: "rgba(255,255,255,.08)", color: "#fff" }}><SkipForward size={22} /></button>
              <button className="btn-ctrl" style={{ width: 38, height: 38, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,0.6)" }}><Repeat size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 3. 入口导出 ---
export default function MusicPlayer() {
  return (
    <Suspense fallback={<div style={{ background: "#000", height: "100vh" }} />}>
      <PlayerCore />
    </Suspense>
  );
}