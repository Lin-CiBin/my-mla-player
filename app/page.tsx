"use client";
import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// --- 1. 曲库配置 ---
const LIBRARIES: Record<string, any> = {
  "tizzy-bac": {
    cover: "/my-mla-player/images/Tell_Tale_Heart.jpg",
    tracks: [
      { id: 1, title: "開放性骨折", artist: "Tizzy Bac", src: "/my-mla-player/audio/bone.m4a" },
      { id: 2, title: "保險推銷員之死", artist: "Tizzy Bac", src: "/my-mla-player/audio/deathOfASalesman.m4a" },
      { id: 3, title: "末日鋼琴手", artist: "Tizzy Bac", src: "/my-mla-player/audio/doomsdayPianist.m4a" },
      { id: 4, title: "崇高與滑稽", artist: "Tizzy Bac", src: "/my-mla-player/audio/sublimeAndComic.m4a" },
      { id: 5, title: "周日午後婦女的時間", artist: "Tizzy Bac", src: "/my-mla-player/audio/womenTime.m4a" },
      { id: 6, title: "忘記丟掉", artist: "Tizzy Bac", src: "/my-mla-player/audio/forgetThrow.m4a" },
      { id: 7, title: "Every Dogs has it's lawn", artist: "Tizzy Bac", src: "/my-mla-player/audio/dogsLawn.m4a" },
    ],
  },
  mla: {
    cover: "/my-mla-player/images/Joking_With_You.jpg",
    tracks: [
      { id: 1, title: "德州之戀", artist: "My Little Airport", album: "跟你開玩笑", src: "/my-mla-player/audio/texasLove.m4a" },
      { id: 2, title: "嘔吐", artist: "My Little Airport", album: "跟你開玩笑", src: "/my-mla-player/audio/puke.m4a" },
      { id: 3, title: "某夜後台", artist: "My Little Airport", album: "跟你開玩笑", src: "/my-mla-player/audio/thatNightBackstage.m4a" },
      { id: 4, title: "循環的夜", artist: "My Little Airport", album: "跟你開玩笑", src: "/my-mla-player/audio/theRecurringNight.m4a" },
      { id: 5, title: "我不適合聚會", artist: "My Little Airport", album: "跟你開玩笑", src: "/my-mla-player/audio/partyMisfit.m4a" },
    ],
  },
};

type PlayMode = "sequence" | "loopOne" | "shuffle";

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return mins + ":" + String(secs).padStart(2, "0");
}

function PlayerContent() {
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string>("tizzy-bac");
  const [idx, setIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [cur, setCur] = useState<number>(0);
  const [dur, setDur] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [queue, setQueue] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<PlayMode>("sequence");
  const [vData, setVData] = useState<number[]>(new Array(22).fill(5));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const config = LIBRARIES[activeId] || LIBRARIES["tizzy-bac"];
  const tracks = config.tracks;
  const track = tracks[idx] || tracks[0];

  // --- 1. 初始化频谱分析仪 ---
  const initAudioContext = () => {
    if (ctxRef.current || !audioRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const analyzer = ctx.createAnalyser();
    
    // 必须确保存储 source 引用，防止被垃圾回收
    const source = ctx.createMediaElementSource(audioRef.current);
    
    analyzer.fftSize = 64;
    source.connect(analyzer);
    analyzer.connect(ctx.destination);

    ctxRef.current = ctx;
    analyzerRef.current = analyzer;
    sourceRef.current = source;
  };

  // --- 2. 动画循环 ---
  useEffect(() => {
    const updateVisualizer = () => {
      if (playing && analyzerRef.current) {
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        const bars = Array.from(dataArray.slice(0, 22)).map(v => 5 + (v / 255) * 25);
        setVData(bars);
      } else if (!playing) {
        setVData(prev => prev.map(v => Math.max(5, v * 0.9))); // 停下时缓缓下沉
      }
      animationRef.current = requestAnimationFrame(updateVisualizer);
    };
    animationRef.current = requestAnimationFrame(updateVisualizer);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playing]);

  // --- 3. 核心播放控制 (处理无声问题的关键) ---
  const togglePlay = async () => {
    if (!audioRef.current) return;

    // 第一次点击时初始化并解锁 Context
    if (!ctxRef.current) {
      initAudioContext();
    }

    if (ctxRef.current?.state === "suspended") {
      await ctxRef.current.resume();
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch (err) {
        console.error("Playback failed:", err);
      }
    }
  };

  // --- 4. URL 与媒体控制 ---
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl && LIBRARIES[idFromUrl]) setActiveId(idFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        artwork: [{ src: config.cover, sizes: "512x512", type: "image/jpg" }]
      });
      navigator.mediaSession.setActionHandler("play", togglePlay);
      navigator.mediaSession.setActionHandler("pause", togglePlay);
      navigator.mediaSession.setActionHandler("previoustrack", prev);
      navigator.mediaSession.setActionHandler("nexttrack", next);
    }
  }, [track, idx]);

  const goTo = (i: number) => {
    setIdx(i);
    setCur(0);
    setQueue(false);
    // 切换歌曲后自动播放，需确保 Context 已恢复
    setTimeout(() => {
      if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
      audioRef.current?.play();
      setPlaying(true);
    }, 10);
  };

  const prev = () => goTo((idx - 1 + tracks.length) % tracks.length);
  const next = () => {
    const nextIdx = playMode === "shuffle" 
      ? Math.floor(Math.random() * tracks.length) 
      : (idx + 1) % tracks.length;
    goTo(nextIdx);
  };

  const handleEnded = () => {
    if (playMode === "loopOne" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      next();
    }
  };

  const pct = (cur / (dur || 100)) * 100;

  return (
    <div style={{ 
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", 
      padding: 16, overflow: "hidden", position: "relative", fontFamily: "'DM Sans',sans-serif",
      background: "#000"
    }}>
      {/* 动态毛玻璃背景 */}
      <div style={{
        position: "absolute", inset: -20, zIndex: 0,
        backgroundImage: `url(${config.cover})`, backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(60px) brightness(0.3)", transform: "scale(1.1)", transition: "background-image 0.8s ease"
      }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=DM+Sans:wght@400;500&display=swap');
        .vinyl { animation:spin 3s linear infinite; animation-play-state:paused; }
        .vinyl.on { animation-play-state:running; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes fadeup { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input[type=range].seek { -webkit-appearance:none; background:transparent; width:100%; height:20px; position:absolute; z-index:10; cursor:pointer; }
        .seek::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#f5a623; border:2px solid #1a0c05; box-shadow:0 0 10px rgba(245,166,35,.6); }
        .btn-ctrl { border:none; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; background:rgba(255,255,255,.08); color:#fff; }
        .btn-ctrl:hover { background:rgba(255,255,255,.15); transform:scale(1.06); }
        .btn-ctrl:active { transform:scale(.94); }
      `}</style>

      <audio 
        ref={audioRef} 
        src={track.src} 
        crossOrigin="anonymous"
        onTimeUpdate={() => !isDragging.current && setCur(audioRef.current?.currentTime || 0)} 
        onLoadedMetadata={() => setDur(audioRef.current?.duration || 0)} 
        onEnded={handleEnded} 
        preload="auto" 
      />

      <div style={{ position: "relative", width: "100%", maxWidth: 400, zIndex: 10 }}>
        {/* 播放列表 */}
        {queue && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, borderRadius: 28, background: "rgba(10,5,2,.98)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontFamily: "'Playfair Display',serif", color: "#f5a623", fontSize: 20, fontWeight: 900 }}>Queue</span>
              <button onClick={() => setQueue(false)} style={{ border: "none", background: "none", color: "#fff", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ maxHeight: "80%", overflowY: "auto" }}>
              {tracks.map((t: any, i: number) => (
                <button key={t.id} onClick={() => goTo(i)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 10, borderRadius: 14, marginBottom: 8, border: "none", background: i === idx ? "rgba(245,166,35,.15)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <img src={config.cover} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: i === idx ? "#f5a623" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{t.artist}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ borderRadius: 28, overflow: "hidden", background: "rgba(26,12,5,0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(245,166,35,.1)", boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
          {/* 封面区域 */}
          <div style={{ position: "relative", aspectRatio: "1/1" }}>
            <img src={config.cover} key={activeId + idx} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fadeup .5s ease" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,transparent 50%,rgba(14,6,2,0.95))" }} />
            
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, background: "rgba(0,0,0,.6)", padding: "6px 0", borderTop: "1px solid rgba(245,166,35,0.2)", overflow: "hidden" }}>
              <div style={{ display: "inline-block", whiteSpace: "nowrap", animation: "marquee 15s linear infinite", color: "#f5a623", fontSize: 10, letterSpacing: "0.15em" }}>
                LISTENING TO · {track.title} · {track.artist} &nbsp;&nbsp;&nbsp; LISTENING TO · {track.title} · {track.artist} &nbsp;&nbsp;&nbsp;
              </div>
            </div>

            <div style={{ position: "absolute", bottom: -18, right: 24 }}>
              <div className={"vinyl" + (playing ? " on" : "")} style={{ width: 64, height: 64, borderRadius: "50%", background: "radial-gradient(circle,#1a0e06 18%,#331a0a 20%,#1a0e06 52%)", border: "2px solid rgba(245,166,35,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#f5a623" }} />
              </div>
            </div>
          </div>

          <div style={{ padding: "32px 24px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 key={track.title} style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: "#fff", animation: "fadeup .4s ease", margin: 0 }}>{track.title}</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginTop: 6 }}>{track.artist}</p>
              </div>
              <button onClick={() => setLiked(!liked)} className="btn-ctrl" style={{ width: 38, height: 38, color: liked ? "#f5a623" : "rgba(255,255,255,0.3)" }}>
                <Heart size={20} fill={liked ? "#f5a623" : "transparent"} />
              </button>
            </div>

            {/* 频谱图 */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36, margin: "20px 0" }}>
              {vData.map((h, i) => (
                <div key={i} style={{ flex: 1, height: h, borderRadius: 4, background: (i / 22) * 100 < pct ? "#f5a623" : "rgba(255,255,255,0.15)", transition: "height 0.1s ease" }} />
              ))}
            </div>

            {/* 进度条 */}
            <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 0, right: 0, height: 3, borderRadius: 4, background: "rgba(255,255,255,.1)" }}>
                <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#d85510,#f5a623)", borderRadius: 4 }} />
              </div>
              <input type="range" className="seek" min={0} max={dur || 100} step={0.1} value={cur} 
                onPointerDown={() => isDragging.current = true} 
                onChange={(e) => setCur(parseFloat(e.target.value))} 
                onPointerUp={() => { if(audioRef.current) audioRef.current.currentTime = cur; isDragging.current = false; }} 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 4 }}>
              <span>{fmt(cur)}</span><span>-{fmt(Math.max(0, dur - cur))}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
              <button onClick={() => setQueue(true)} className="btn-ctrl" style={{ width: 40, height: 40 }}><ListMusic size={20} /></button>
              <button onClick={prev} className="btn-ctrl" style={{ width: 48, height: 48 }}><SkipBack size={24} fill="currentColor" /></button>
              
              <button onClick={togglePlay} className="btn-ctrl" style={{ width: 68, height: 68, background: "linear-gradient(135deg,#e85a12,#f5a623)", boxShadow: "0 10px 30px rgba(232,90,18,0.4)" }}>
                {playing ? <Pause size={32} fill="white" /> : <Play size={32} style={{ marginLeft: 4 }} fill="white" />}
              </button>

              <button onClick={next} className="btn-ctrl" style={{ width: 48, height: 48 }}><SkipForward size={24} fill="currentColor" /></button>
              
              <button onClick={() => {
                const modes: PlayMode[] = ["sequence", "loopOne", "shuffle"];
                setPlayMode(modes[(modes.indexOf(playMode) + 1) % 3]);
              }} className="btn-ctrl" style={{ width: 40, height: 40, color: playMode !== "sequence" ? "#f5a623" : "#fff" }}>
                {playMode === "sequence" && <Repeat size={20} />}
                {playMode === "loopOne" && <Repeat1 size={20} />}
                {playMode === "shuffle" && <Shuffle size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MusicPlayer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <PlayerContent />
    </Suspense>
  );
}