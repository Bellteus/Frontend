import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CallRecord2 } from "../types/CallRecord";
import { AudioService, JoinService } from "../services/Service";


/* ===== Tipos ===== */
type DiarSeg = { speaker?: string; rol?: string; text?: string; start?: number; end?: number };
type NormAnalysis = {
  puntaje_global?: number | null;
  resumen?: string;
  observaciones?: string;
  fortalezas?: string[];
  oportunidades?: string[];
  evidencias?: string[];
  sentimiento_inicio?: string | null;
  sentimiento_fin?: string | null;
  sentimiento_global?: string | null;
  caso_resuelto?: boolean | string | null;
  complejidad?: string | null;
  score?: number | null;
  seguimiento?: { requiere?: string | boolean; razon?: string | null } | null;
  protocolo?: { saludo?: string; validacion?: string; empatia?: string; cierre?: string } | null;
  transcripcion?: string;
};
type FullCall = {
  id: number;
  cdr: CallRecord2 & {
    ani?: string;
    dnis?: string;
    calltype?: string;
    wrapup_time?: number | null;
    total_hold_time?: number | null;
    number_of_holds?: number | null;
    organization?: string | null;
    pais?: string | null;
  };
  analysis: NormAnalysis;
  diarization: {
    segments?: DiarSeg[]; // cuando llega con timestamps
    turnos?: DiarSeg[];   // cuando llega solo (rol/speaker/texto)
  };
};

/* ===== Paleta (azules + 1 verde) ===== */
const PAL = {
  indigo: "#4f46e5",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  green: "#22c55e",
};

/* ===== Utils ===== */
const fmtDT = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");
const hms = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

function normalizeAnalysis(raw: any, diarDerivedTranscript?: string): NormAnalysis {
  if (!raw) return { fortalezas: [], oportunidades: [], evidencias: [] };
  const senti = raw.analisis_sentimiento_cliente || {};

  return {
    puntaje_global: raw.puntaje_global ?? raw.performance_score ?? null,
    resumen: raw.resumen ?? raw.resumen_conciso ?? "",
    observaciones: raw.observaciones ?? raw.observaciones_llm ?? "",
    fortalezas: raw.fortalezas ?? [],
    oportunidades: raw.oportunidades_mejora ?? [],
    evidencias: raw.evidencias_textuales ?? [],
    sentimiento_inicio: raw.sentimiento_inicio ?? senti.inicio ?? null,
    sentimiento_fin: raw.sentimiento_fin ?? senti.fin ?? null,
    sentimiento_global: senti.global ?? null,
    caso_resuelto: raw.caso_resuelto ?? null,
    complejidad: raw.complejidad_caso ?? null,
    score: raw.performance_score ?? null,
    seguimiento: raw.seguimiento ?? null,
    protocolo: raw.cumplimiento_protocolo ?? null,
    // si no llega transcripción, generamos una desde turnos (si existen)
    transcripcion: raw.transcripcion ?? diarDerivedTranscript ?? "",
  };
}

/* ===== Waveform (peaks simples) ===== */
function usePeaks(url: string | null, bars = 1600) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    let off = false;
    async function run() {
      if (!url) return setPeaks(null);
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const audio = await ctx.decodeAudioData(buf);
        const a = audio.getChannelData(0);
        const b = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
        const block = Math.max(1, Math.floor(a.length / bars));
        const out: number[] = [];
        for (let i = 0; i < bars; i++) {
          const from = i * block, to = Math.min(a.length, from + block);
          let max = 0;
          for (let j = from; j < to; j++) max = Math.max(max, Math.abs(a[j]), b ? Math.abs(b[j]) : 0);
          out.push(max);
        }
        if (!off) setPeaks(out);
      } catch {
        if (!off) setPeaks(null);
      }
    }
    run();
    return () => { off = true; };
  }, [url, bars]);
  return peaks;
}

/* ===== Vista ===== */
const ReporteriaID: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [data, setData] = useState<FullCall | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"resumen" | "analisis" |"segmentos">("resumen");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const peaks = usePeaks(audioUrl, 2000);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [rate, setRate] = useState(1);

  /* fetch */
  useEffect(() => {
    let alive = true;
    async function run() {
      if (!id) return;
      setLoading(true);
      try {
        const raw = await JoinService.getCallFullById(Number(id));

        // —— Derivar transcripción desde diarization.turnos, si existen
        const turnos: DiarSeg[] | null = Array.isArray(raw?.diarization?.turnos)
          ? raw.diarization.turnos
          : null;
        const transcriptFromTurns = turnos
          ? turnos.map((t: any) =>
              `${t.rol ? `[${t.rol}] ` : ""}${t.speaker ? `${t.speaker}: ` : ""}${t.texto || t.text || ""}`
            ).join("\n")
          : "";

        // —— Normalizar análisis
        const analysis = normalizeAnalysis(raw?.analysis, transcriptFromTurns);

        // —— Normalizar diarización:
        const segments: DiarSeg[] | undefined = Array.isArray(raw?.diarization?.segments)
          ? raw.diarization.segments
          : undefined;
        const turns: DiarSeg[] | undefined = turnos
          ? turnos.map((t: any) => ({ speaker: t.speaker, rol: t.rol, text: t.texto || t.text }))
          : undefined;

        const shaped: FullCall = {
          id: Number(raw?.id ?? id),
          cdr: raw?.cdr || ({} as any),
          analysis,
          diarization: { segments, turnos: turns },
        };

        if (!alive) return;
        setData(shaped);

        // —— Audio
        try {
          const callId = shaped.cdr?.id_llamada ?? shaped.id;
          const blob = await AudioService.streamAudio(Number(callId));
          if (!alive) return;
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        } catch {
          if (alive) setAudioUrl(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
      // revocar URL si quedó
    };
  }, [id]);

  /* audio events */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onLoaded = () => {
      setDuration(el.duration || 0);
      el.playbackRate = rate;
    };
    const onTime = () => setCurrent(el.currentTime || 0);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
    };
  }, [audioUrl, rate]);

  /* waveform simple */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement as HTMLElement;
    const W = Math.max(600, parent.clientWidth);
    const H = 220;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // línea central
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    const step = W / peaks.length;
    const mid = H / 2;
    ctx.fillStyle = PAL.indigo;
    for (let i = 0; i < peaks.length; i++) {
      const v = Math.min(1, peaks[i]);
      const h = Math.max(1, v * (H / 2 - 8));
      const x = Math.floor(i * step);
      ctx.fillRect(x, mid - h, Math.max(1, step - 1), h * 2);
    }
  }, [peaks]);

  const progressPct = useMemo(
    () => (duration ? Math.min(100, (current / duration) * 100) : 0),
    [current, duration]
  );

  // Preferimos segments si existen; si no, turnos
  const diarSegments = data?.diarization?.segments ?? [];
  const diarTurnos = data?.diarization?.turnos ?? [];
  const hasTimedSegments = !!(diarSegments && diarSegments.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] p-6">
        <div className="h-28 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse" />
        <div className="mt-4 h-[440px] bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] p-6 grid place-items-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <h2 className="text-lg font-bold text-slate-800">No se encontró la llamada.</h2>
          <button onClick={() => nav(-1)} className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white">
            Volver
          </button>
        </div>
      </div>
    );
  }

  const A = data.analysis;
  const C = data.cdr || ({} as any);
  const dur =
    typeof C.duration === "number"
      ? C.duration
      : C.starttime && C.endtime
      ? (new Date(C.endtime).getTime() - new Date(C.starttime).getTime()) / 1000
      : 0;
  const score = A.puntaje_global ?? A.score ?? null;

  const countSegmentos = hasTimedSegments ? diarSegments.length : diarTurnos.length;

  return (
    <div className="min-h-screen bg-[#f6f7fb] ">
      {/* Barra fija */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 ">
        <div className="w-full px-6 2xl:px-10 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav(-1)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50">
              ← Volver
            </button>
            <div className="text-[#1f2a56] text-lg md:text-xl font-extrabold">Llamada #{data.id}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => audioRef.current?.play()} className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">▶ Reproducir</button>
            <button onClick={() => audioRef.current?.pause()} className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300">⏸ Pausa</button>
            <button onClick={() => AudioService.openInNewTab(Number(C.id_llamada || data.id))} className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50">Abrir audio</button>
            <button onClick={() => AudioService.download(Number(C.id_llamada || data.id), `audio_${C.id_llamada || data.id}.wav`)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50">Descargar</button>
          </div>
        </div>
      </div>

      {/* Contenido ancho completo */}
      <div className="w-full px-6 2xl:px-10 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-12 gap-4">
          {/* Agente */}
          <div className="col-span-12 xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="text-xs text-slate-500">Agente</div>
            <div className="text-lg font-semibold text-slate-800">{C.agent_name || C.empleado_nombre || "—"}</div>
            <div className="text-[12px] text-slate-500 mt-1">{C.organization || "—"}</div>
            <div className="grid grid-cols-6 gap-3 mt-3 text-sm">
              <Info title="País" value={C.pais || "—"} />
              <Info title="ANI" value={C.ani || "—"} />
              <Info title="DNIS" value={C.dnis || "—"} />
              <Info title="Inicio" value={fmtDT(C.starttime)} colSpan={2} />
              <Info title="Fin" value={fmtDT(C.endtime)} colSpan={2} />
            </div>
          </div>

          {/* Tiempo / tipo / hold */}
          <div className="col-span-12 xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="grid grid-cols-4 gap-4">
              <Stat title="Duración" big={hms(dur)} />
              <Stat title="Tipo" big={C.calltype || "—"} />
              <Stat title="Wrap-up" big={`${C.wrapup_time ?? 0}s`} />
              <Stat title="Hold total" big={`${C.total_hold_time ?? 0}s`} />
            </div>
          </div>

          {/* Sentimientos + score */}
          <div className="col-span-12 xl:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="grid grid-cols-3 gap-4 items-center">
              <BadgeStat title="Sent. inicio" value={A.sentimiento_inicio} />
              <BadgeStat title="Sent. fin" value={A.sentimiento_fin} />
              <BadgeStat title="Sent. global" value={A.sentimiento_global} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                <div className="text-[11px] text-slate-500">Resuelto</div>
                <div className="text-lg font-semibold">{String(A.caso_resuelto ?? "—")}</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                <div className="text-[11px] text-slate-500">Puntaje global</div>
                <div className="text-2xl font-extrabold text-indigo-700">{score != null ? score : "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Player + waveform */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{hms(current)}</span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-sm text-slate-600">{hms(duration)}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-600">Velocidad</label>
              <select
                value={rate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRate(v);
                  if (audioRef.current) audioRef.current.playbackRate = v;
                }}
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm"
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 relative select-none">
            <canvas ref={canvasRef} className="w-full h-[220px] block" />
            <div className="absolute inset-x-4 bottom-4 h-[8px] bg-white/70 rounded-full">
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: PAL.blue }} />
            </div>
          </div>

          {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" controls />}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 px-4">
            <div className="flex flex-wrap gap-2">
              {[
                ["resumen", `Resumen`],
                ["analisis", `Análisis`],
                ["segmentos", `Segmentos`],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] ${
                    tab === k ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {label}
                  {k === "segmentos" && countSegmentos ? (
                    <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                      {countSegmentos}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {tab === "resumen" && (
              <div className="space-y-6">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 xl:col-span-6">
                    <Section title="Resumen">
                      <p className="text-sm text-slate-800">{A.resumen || "—"}</p>
                    </Section>
                  </div>
                  <div className="col-span-12 xl:col-span-6">
                    <Section title="Observaciones">
                      <p className="text-sm text-slate-800">{A.observaciones || "—"}</p>
                    </Section>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-4">
                    <Section title="Fortalezas"><Chips items={A.fortalezas} color={PAL.green} /></Section>
                  </div>
                  <div className="col-span-12 lg:col-span-4">
                    <Section title="Oportunidades"><Chips items={A.oportunidades} color={PAL.indigo} /></Section>
                  </div>
                  <div className="col-span-12 lg:col-span-4">
                    <Section title="Evidencias"><Chips items={A.evidencias} color={PAL.sky} /></Section>
                  </div>
                </div>
              </div>
            )}

            {tab === "analisis" && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-5">
                  <Section title="Cumplimiento de Protocolo">
                    <div className="grid grid-cols-2 gap-3">
                      <Proto label="Saludo" value={A.protocolo?.saludo} />
                      <Proto label="Validación" value={A.protocolo?.validacion} />
                      <Proto label="Empatía" value={A.protocolo?.empatia} />
                      <Proto label="Cierre" value={A.protocolo?.cierre} />
                    </div>
                  </Section>
                </div>
                <div className="col-span-12 lg:col-span-4">
                  <Section title="Seguimiento">
                    <div className="text-sm">
                      <div className="mb-2"><span className="text-slate-500 mr-1">Requiere:</span><b>{A.seguimiento?.requiere != null ? String(A.seguimiento.requiere) : "—"}</b></div>
                      <div><span className="text-slate-500 mr-1">Razón:</span><b>{A.seguimiento?.razon || "—"}</b></div>
                    </div>
                  </Section>
                </div>
                <div className="col-span-12 lg:col-span-3">
                  <Section title="Indicadores">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Mini title="Complejidad" value={A.complejidad ?? "—"} />
                      <Mini title="Puntaje" value={score != null ? String(score) : "—"} />
                      <Mini title="Resuelto" value={String(A.caso_resuelto ?? "—")} />
                      <Mini title="Sent. global" value={A.sentimiento_global ?? "—"} />
                    </div>
                  </Section>
                </div>
              </div>
            )}
            {tab === "segmentos" && (
              hasTimedSegments ? (
                <Section title="Segmentos (con tiempo)">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-slate-600 bg-slate-50">
                          <th className="px-3 py-2">Orador</th>
                          <th className="px-3 py-2">Inicio</th>
                          <th className="px-3 py-2">Fin</th>
                          <th className="px-3 py-2">Ir</th>
                          <th className="px-3 py-2">Texto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diarSegments.map((s, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-3 py-2">{s.speaker || "SPEAKER"}</td>
                            <td className="px-3 py-2">{hms(s.start ?? 0)}</td>
                            <td className="px-3 py-2">{hms(s.end ?? 0)}</td>
                            <td className="px-3 py-2">
                              <button
                                className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                                onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, s.start ?? 0); }}
                              >
                                ▶
                              </button>
                            </td>
                            <td className="px-3 py-2">{s.text || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              ) : (
                <Section title="Conversación">
                  <div className="space-y-3">
                    {diarTurnos.length ? (
                      diarTurnos.map((t, i) => {
                        const isAgent = (t.rol || "").toLowerCase().includes("agente");
                        return (
                          <div key={i} className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
                            <div
                              className="max-w-[75%] px-3 py-2 rounded-2xl border"
                              style={{
                                background: (isAgent ? PAL.indigo : PAL.sky) + "12",
                                borderColor: (isAgent ? PAL.indigo : PAL.sky) + "55",
                              }}
                            >
                              <div className="text-[11px] text-slate-500 mb-0.5">
                                {(t.rol ? `${t.rol} · ` : "") + (t.speaker || "")}
                              </div>
                              <div className="text-sm text-slate-800">{t.text || "—"}</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-slate-600">No hay turnos de conversación.</div>
                    )}
                  </div>
                </Section>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===== Subcomponentes ===== */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="text-sm font-semibold text-slate-800 mb-2">{title}</div>
    {children}
  </div>
);

const Info: React.FC<{ title: string; value: React.ReactNode; colSpan?: number }> = ({ title, value, colSpan }) => (
  <div className={`col-span-${colSpan || 1}`}>
    <div className="text-[11px] text-slate-500">{title}</div>
    <div className="font-medium">{value}</div>
  </div>
);

const Stat: React.FC<{ title: string; big: React.ReactNode }> = ({ title, big }) => (
  <div>
    <div className="text-xs text-slate-500">{title}</div>
    <div className="text-2xl font-bold text-indigo-600">{big}</div>
  </div>
);

const BadgeStat: React.FC<{ title: string; value?: string | null }> = ({ title, value }) => (
  <div className="text-center">
    <div className="text-xs text-slate-500">{title}</div>
    <div className="mt-1 inline-block text-xs px-2 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-slate-900">
      {value || "—"}
    </div>
  </div>
);

const Chips: React.FC<{ items?: string[]; color: string }> = ({ items, color }) =>
  items?.length ? (
    <div className="flex flex-wrap gap-2">
      {items.map((t, i) => (
        <span key={i} className="inline-block text-xs px-2.5 py-1 rounded-full border"
          style={{ background: color + "1A", borderColor: color + "66", color: "#0f172a" }}>
          {t}
        </span>
      ))}
    </div>
  ) : (
    <div className="text-sm text-slate-600">—</div>
  );

const Proto: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  const v = (value || "").toLowerCase();
  const [bg, br] =
    v === "sí" || v === "si"
      ? ["#22c55e1A", "#22c55e80"]
      : v === "parcial"
      ? [PAL.sky + "1A", PAL.sky + "80"]
      : ["#e2e8f01A", "#cbd5e180"];
  return (
    <div className="flex items-center justify-between bg-white border rounded-xl px-3 py-2"
      style={{ borderColor: br }}>
      <span className="text-slate-700">{label}</span>
      <span className="text-xs px-2 py-1 rounded-full border" style={{ background: bg, borderColor: br }}>
        {value ?? "—"}
      </span>
    </div>
  );
};

const Mini: React.FC<{ title: string; value: React.ReactNode }> = ({ title, value }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-3">
    <div className="text-[11px] text-slate-500">{title}</div>
    <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
  </div>
);

export default ReporteriaID;
