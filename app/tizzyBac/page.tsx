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
import { useEffect, useRef, useState } from "react";

const COVER = "/my-mla-player/images/Tell_Tale_Heart.jpg";

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  src: string; 
}

const TRACKS: Track[] = [
  { id: 1, title: "開放性骨折", artist: "Tizzy Bac", album: "The Tell Tale Heart", src: "/my-mla-player/audio/bone.m4a" },
  { id: 2, title: "保險推銷員之死", artist: "Tizzy Bac", album: "The Tell Tale Heart", src: "/my-mla-player/audio/deathOfASalesman.m4a" },
  { id: 3, title: "末日鋼琴手", artist: "Tizzy Bac", album: "The Tell Tale Heart", src: "/my-mla-player/audio/doomsdayPianist.m4a" },
  { id: 4, title: "崇高与滑稽", artist: "Tizzy Bac", album: "The Tell Tale Heart", src: "/my-mla-player/audio/sublimeAndComic.m4a" },
];

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return mins + ":" + String(secs).padStart(2, "0");
}

export default function MusicPlayer() {
  const [idx, setIdx] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [cur, setCur] = useState<number>(0);
  const [dur, setDur] = useState<number>(0); 
  const [vol, setVol] = useState<number>(75);
  const [liked, setLiked] = useState<boolean>(false);
  const [queue, setQueue] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isDragging = useRef<boolean>(false); 
  const track: Track = TRACKS[idx];

  // ── 【核心逻辑：URL 洗白】 ──
  useEffect(() => {
    // 延迟极短的时间或直接执行，将地址栏修改为父级目录
    // 这样用户扫码进入 /tizzyBac/ 后，地址栏会立刻变成 /my-mla-player/
    if (typeof window !== "undefined") {
      const parentPath = window.location.pathname.replace(/\/tizzyBac\/?$/, "/");
      window.history.replaceState({}, "", parentPath);
    }
  }, []);

  // 为移动端修正 100vh
  useEffect(() => {
    const setVh = () => {
      if (typeof window === "undefined") return;
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);

  // 1. 播放/暂停控制
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => setPlaying(false));
      }
    } else {
      audio.pause();
    }
  }, [playing, idx]);

  // 2. 音量控制
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  }, [vol]);

  const safeDur = dur > 0 ? dur : 100; 
  const pct = (cur / safeDur) * 100;

  const onTimeUpdate = () => {
    if (audioRef.current && !isDragging.current) {
      setCur(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      const d = audioRef.current.duration;
      if (isFinite(d)) setDur(d);
    }
  };

  const handleSeekStart = () => { isDragging.current = true; };
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => { setCur(parseFloat(e.target.value)); };
  const handleSeekEnd = () => {
    if (audioRef.current) { audioRef.current.currentTime = cur; }
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  function goTo(i: number): void {
    setIdx(i);
    setCur(0);
    setDur(0); 
    setPlaying(true);
    setQueue(false);
  }

  const prev = (): void => goTo((idx - 1 + TRACKS.length) % TRACKS.length);
  const next = (): void => goTo((idx + 1) % TRACKS.length);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes wavebar { from{transform:scaleY(0.3)} to{transform:scaleY(1)} }
        @keyframes fadeup  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes qslide  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        
        .vinyl { animation:spin 3s linear infinite; animation-play-state:paused; }
        .vinyl.on { animation-play-state:running; }
        
        .seek-container { position:relative; height:20px; display:flex; align-items:center; cursor:pointer; width:100%; }
        input[type=range].seek { 
          -webkit-appearance:none; background:transparent; width:100%; height:100%; 
          position:absolute; z-index:10; margin:0; cursor:pointer;
        }
        .seek::-webkit-slider-thumb { 
          -webkit-appearance:none; width:14px; height:14px; border-radius:50%; 
          background:#f5a623; border:2px solid #1a0c05; box-shadow:0 0 10px rgba(245,166,35,.6); 
        }
        
        .vol-container { position:relative; flex:1; height:14px; display:flex; align-items:center; }
        input[type=range].vol { 
          -webkit-appearance:none; background:transparent; width:100%; height:100%; 
          position:absolute; z-index:10; margin:0; cursor:pointer;
        }
        .vol::-webkit-slider-thumb  { -webkit-appearance:none; width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,.8); }
        
        button { font-family:inherit; }
        .btn-ctrl { border:none; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform .1s, opacity .15s; }
        .btn-ctrl:hover { opacity:.85; transform:scale(1.06); }
        .btn-ctrl:active { transform:scale(.94); }
      `}</style>

      <audio 
        ref={audioRef}
        src={track.src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onLoadedMetadata} 
        onEnded={next}
        preload="metadata"
      />

      <div style={{
        minHeight:"calc(var(--vh, 1vh) * 100)",
        width:"100vw",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        padding:16,
        background:"linear-gradient(150deg,#1a0c06,#2c1508 45%,#180b04)",
        fontFamily:"'DM Sans',sans-serif",
        overflow:"hidden"
      }}>

        <div style={{
          position:"relative",
          width:"100%",
          height:"100%",
          display:"flex",
          alignItems:"center",
          justifyContent:"center"
        }}>

          {/* ── QUEUE ── */}
          {queue && (
            <div style={{ position:"absolute", inset:0, zIndex:20, borderRadius:28, overflow:"hidden",
              background:"rgba(10,5,2,.98)", border:"1px solid rgba(245,166,35,.15)",
              boxShadow:"0 40px 80px rgba(0,0,0,.9)", animation:"qslide .25s ease" }}>
              <div style={{ padding:24 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <span style={{ fontFamily:"'Playfair Display',serif", color:"#f5a623", fontSize:20, fontWeight:900 }}>Queue</span>
                  <button onClick={() => setQueue(false)} style={{
                    width:32, height:32, borderRadius:"50%", border:"none",
                    background:"rgba(255,255,255,.1)", color:"#fff", cursor:"pointer", fontSize:13 }}>✕</button>
                </div>
                {TRACKS.map((t: Track, i: number) => (
                  <button key={t.id} onClick={() => goTo(i)} style={{
                    display:"flex", alignItems:"center", gap:12, width:"100%", padding:"10px 12px",
                    borderRadius:14, marginBottom:8, cursor:"pointer", textAlign:"left", border:"none",
                    outline: i === idx ? "1px solid rgba(245,166,35,.4)" : "1px solid transparent",
                    background: i === idx ? "rgba(245,166,35,.12)" : "rgba(255,255,255,.04)" }}>
                    <img src={COVER} alt={t.title} style={{ width:42, height:42, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        color: i === idx ? "#f5a623" : "#fff" }}>{t.title}</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>{t.artist}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── CARD ── */}
          <div style={{ borderRadius:28, overflow:"hidden",
            background:"linear-gradient(160deg,#2c1708,#1a0c05 55%,#230f06)",
            border:"1px solid rgba(245,166,35,.1)",
            boxShadow:"0 48px 96px rgba(0,0,0,.65),inset 0 0 0 1px rgba(255,255,255,.04)" }}>

            <div style={{ position:"relative", aspectRatio:"1/1" }}>
              <img src={COVER} key={idx} alt={track.album}
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", animation:"fadeup .4s ease" }} />
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 45%,rgba(14,6,2,.98))" }} />
              
              <div style={{ position:"absolute", left:0, right:0, bottom:52, overflow:"hidden",
                background:"rgba(0,0,0,.65)", padding:"5px 0",
                borderTop:"1px solid rgba(245,166,35,.3)", borderBottom:"1px solid rgba(245,166,35,.3)" }}>
                <div style={{ display:"inline-block", whiteSpace:"nowrap", animation:"marquee 14s linear infinite",
                  color:"#f5a623", fontSize:10, letterSpacing:"0.2em", fontWeight:600, textTransform:"uppercase" }}>
                  NOW PLAYING · THE TELL TALE HEART · TIZZY BAC &nbsp;&nbsp;&nbsp; NOW PLAYING · THE TELL TALE HEART · TIZZY BAC &nbsp;&nbsp;&nbsp;
                </div>
              </div>

              <div style={{ position:"absolute", bottom:-18, right:20 }}>
                <div className={"vinyl" + (playing ? " on" : "")} style={{
                  width:60, height:60, borderRadius:"50%",
                  background:"radial-gradient(circle,#1a0e06 18%,#2e1a0e 20%,#1a0e06 52%)",
                  border:"2px solid rgba(245,166,35,.28)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ width:12, height:12, borderRadius:"50%", background:"#f5a623", boxShadow:"0 0 8px rgba(245,166,35,.7)" }} />
                </div>
              </div>
            </div>

            <div style={{ padding:"30px 24px 24px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                <div style={{ flex:1, minWidth:0, paddingRight:12 }}>
                  <h2 key={track.title} style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900,
                    color:"#fff", lineHeight:1.1, letterSpacing:"-0.5px", animation:"fadeup .4s ease" }}>{track.title}</h2>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,.42)", margin:"6px 0 0" }}>{track.artist}</p>
                </div>
                <button
                  onClick={() => setLiked(!liked)}
                  className="btn-ctrl"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 16,
                    background: liked ? "rgba(245,166,35,.2)" : "rgba(255,255,255,.07)",
                    color: liked ? "#f5a623" : "rgba(255,255,255,.35)",
                    boxShadow: liked ? "0 0 0 1px rgba(245,166,35,.4)" : "0 0 0 1px rgba(255,255,255,.1)",
                  }}
                >
                  <Heart
                    size={18}
                    fill={liked ? "#f5a623" : "transparent"}
                    strokeWidth={2}
                  />
                </button>
              </div>

              <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:32, margin:"14px 0" }}>
                {Array.from({ length: 22 }, (_, i) => 5 + Math.abs(Math.sin(i * .75)) * 22).map((h, i) => (
                  <div key={i} style={{
                    width:3, flexShrink:0, height:h, borderRadius:9999, transformOrigin:"bottom",
                    background: (i / 22) * 100 < pct ? "#f5a623" : "rgba(255,255,255,.2)",
                    animation: playing ? `wavebar ${.5 + Math.abs(Math.sin(h)) * .5}s ease-in-out ${i * 0.04}s infinite alternate` : "none",
                    transition:"background .3s" }} />
                ))}
              </div>

              <div className="seek-container">
                <div style={{ position:"absolute", left:0, right:0, height:3, borderRadius:9999, background:"rgba(255,255,255,.12)" }}>
                  <div style={{ height:"100%", width: pct + "%", borderRadius:9999,
                    background:"linear-gradient(90deg,#c8440a,#f5a623)", transition:"width 0.1s linear" }} />
                </div>
                <input type="range" className="seek"
                  min={0} 
                  max={safeDur} 
                  step={0.1} 
                  value={cur} 
                  onPointerDown={handleSeekStart} 
                  onChange={handleSeekChange} 
                  onPointerUp={handleSeekEnd} 
                  onTouchStart={handleSeekStart} 
                  onTouchEnd={handleSeekEnd} 
                />
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.32)", marginTop:4 }}>
                <span>{fmt(cur)}</span>
                <span>-{fmt(Math.max(0, dur - cur))}</span>
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:20 }}>
                <button
                  onClick={() => setQueue(true)}
                  className="btn-ctrl"
                  style={{ width:38, height:38, background:"rgba(255,255,255,.07)", color:"rgba(255,255,255,.45)" }}
                >
                  <ListMusic size={18} />
                </button>
                <button
                  onClick={prev}
                  className="btn-ctrl"
                  style={{ width:44, height:44, background:"rgba(255,255,255,.08)", color:"#fff" }}
                >
                  <SkipBack size={22} />
                </button>
                <button
                  onClick={() => setPlaying(!playing)}
                  className="btn-ctrl"
                  style={{
                    width:64, height:64, fontSize:24, color:"#fff",
                    background:"linear-gradient(135deg,#d85510,#f5a623)",
                    boxShadow:"0 8px 28px rgba(220,80,16,.5)"
                  }}
                >
                  {playing ? <Pause size={28} /> : <Play size={28} />}
                </button>
                <button
                  onClick={next}
                  className="btn-ctrl"
                  style={{ width:44, height:44, background:"rgba(255,255,255,.08)", color:"#fff" }}
                >
                  <SkipForward size={22} />
                </button>
                <button
                  className="btn-ctrl"
                  style={{ width:38, height:38, background:"rgba(255,255,255,.07)", color:"rgba(255,255,255,.45)" }}
                >
                  <Repeat size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}