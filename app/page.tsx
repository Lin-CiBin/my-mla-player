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

const COVER = "/images/Joking_With_You.jpg";

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  src: string; 
}

const TRACKS: Track[] = [
  { id: 1, title: "德州之戀", artist: "My Little Airport", album: "跟你开玩笑", src: "/audio/texasLove.m4a" },
  { id: 2, title: "呕吐", artist: "My Little Airport", album: "跟你开玩笑", src: "/audio/puke.m4a" },
  { id: 3, title: "某夜後台", artist: "My Little Airport", album: "跟你开玩笑", src: "/audio/theNightBackstage.m4a" },
  { id: 4, title: "循環的夜", artist: "My Little Airport", album: "跟你开玩笑", src: "/audio/theRecurringNight.m4a" },
  { id: 5, title: "我不適合聚會", artist: "My Little Airport", album: "跟你开玩笑", src: "/audio/partyMisfit.m4a" },
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
  // 【新增】拖拽锁，防止 onTimeUpdate 与手动拖拽冲突
  const isDragging = useRef<boolean>(false); 
  const track: Track = TRACKS[idx];

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

  // 3. 核心计算：使用安全时长，防止除以 0
  const safeDur = dur > 0 ? dur : 100; // 如果还没加载出时长，默认给 100 保证可拖动
  const pct = (cur / safeDur) * 100;

  // 4. 音频事件处理
  const onTimeUpdate = () => {
    // 【关键】如果用户正在拖拽，绝不允许音频进度覆盖我们拖拽的进度！
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

  // 5. 进度跳转逻辑拆分：按下、拖动、松开
  const handleSeekStart = () => {
    isDragging.current = true;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCur(parseFloat(e.target.value)); // 拖动时只更新 UI，不碰硬件音频
  };

  const handleSeekEnd = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = cur; // 松手时，一次性把进度同步给硬件
    }
    // 延迟 50ms 解锁，防止底层 onTimeUpdate 刚好在这个微秒差里传回旧数据导致闪烁
    setTimeout(() => {
      isDragging.current = false;
    }, 50);
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

      {/* 音频标签 */}
      <audio 
        ref={audioRef}
        src={track.src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onLoadedMetadata} 
        onEnded={next}
        preload="metadata"
      />

      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:16,
        background:"linear-gradient(150deg,#1a0c06,#2c1508 45%,#180b04)", fontFamily:"'DM Sans',sans-serif" }}>

        <div style={{ position:"relative", width:"100%" }}>

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
                  NOW PLAYING · Half in Jest, Whole in Earnest · My Little Airport &nbsp;&nbsp;&nbsp;  NOW PLAYING · Half in Jest, Whole in Earnest · My Little Airport &nbsp;&nbsp;&nbsp;
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

              {/* 进度条：加入锁定机制 */}
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
                  onPointerDown={handleSeekStart} // 鼠标/手指按下上锁
                  onChange={handleSeekChange}     // 拖动时只改 UI
                  onPointerUp={handleSeekEnd}     // 鼠标/手指松开解锁并提交
                  onTouchStart={handleSeekStart}  // 兼容老设备
                  onTouchEnd={handleSeekEnd}      // 兼容老设备
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

              {/* <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:18 }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.25)", display:"flex", alignItems:"center" }}>
                  <Volume1 size={16} />
                </span>
                <div className="vol-container">
                  <div style={{ position:"absolute", left:0, right:0, height:2, borderRadius:9999, background:"rgba(255,255,255,.1)" }}>
                    <div style={{ height:"100%", width:vol + "%", borderRadius:9999, background:"rgba(255,255,255,.4)" }} />
                  </div>
                  <input type="range" className="vol" min={0} max={100} value={vol} onChange={(e) => setVol(+e.target.value)} />
                </div>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.25)", display:"flex", alignItems:"center" }}>
                  <Volume2 size={18} />
                </span>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}