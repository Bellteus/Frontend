import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import './Transcription.css';

interface AudioAnalysis {
  sentimentScore: number;
  keywords: string[];
  talkRatio: number;
  silencePercentage: number;
  emotionDetection: string;
}

interface AudioData {
  id: number | string;
  agentName: string;
  agentId: string;
  duration: string;
  date: string;
  transcription?: string;
}

const TranscriptionAudio: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Obtenemos los datos del audio desde el state de react-router
  const audioData = (location.state?.audioData || {}) as AudioData;

  const [analysisData, setAnalysisData] = useState<AudioAnalysis>({
    sentimentScore: 78,
    keywords: ['soporte', 'respuesta', 'llamada'],
    talkRatio: 65,
    silencePercentage: 12,
    emotionDetection: 'Neutral'
  });

  useEffect(() => {
    // Simula carga asíncrona de análisis
    setTimeout(() => {
      setAnalysisData({
        sentimentScore: Math.floor(65 + Math.random() * 30),
        keywords: ['servicio', 'llamada', 'respuesta', 'soporte', 'cliente'].sort(() => 0.5 - Math.random()).slice(0, 3),
        talkRatio: Math.floor(60 + Math.random() * 20),
        silencePercentage: 10 + Math.floor(Math.random() * 15),
        emotionDetection: ['Neutral', 'Positivo', 'Negativo'][Math.floor(Math.random() * 3)]
      });
    }, 800);
  }, []);

  // Formatea fecha a formato largo en español
  function formatFecha(fechaStr: string | undefined) {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div className="transcription-container">
      <div className="header-section">
        <h1>
          <span role="img" aria-label="llamada" style={{ fontSize: 26, marginRight: 10 }}>📞</span>
          Análisis de Llamada #{audioData?.id}
        </h1>
        <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>

      {/* Grid solo para metadatos y análisis */}
      <div className="top-grid">
        <div className="metadata-card">
          <h2>Metadatos</h2>
          <div className="info-item">
            <label>Agente:</label>
            <span>{audioData?.agentName} <span className="agent-id">({audioData?.agentId})</span></span>
          </div>
          <div className="info-item">
            <label>Duración:</label>
            <span>{audioData?.duration}</span>
          </div>
          <div className="info-item">
            <label>Fecha:</label>
            <span>{formatFecha(audioData?.date)}</span>
          </div>
        </div>
        <div className="analysis-card">
          <h2>Análisis Automático</h2>
          <div className="analysis-metrics">
            <div className="metric">
              <div className="metric-value highlight">{analysisData.sentimentScore}%</div>
              <div className="metric-label">Sentimiento Positivo</div>
            </div>
            <div className="metric">
              <div className="metric-value">{analysisData.talkRatio}%</div>
              <div className="metric-label">Tiempo de Habla</div>
            </div>
            <div className="metric">
              <div className="metric-value">{analysisData.emotionDetection}</div>
              <div className="metric-label">Emoción Detectada</div>
            </div>
          </div>
        </div>
      </div>

      {/* Estas tarjetas ocupan el ancho completo */}
      <div className="transcription-card">
        <h2>Transcripción</h2>
        <div className="transcription-content">
          {audioData?.transcription || <span className="loading">Cargando transcripción...</span>}
        </div>
      </div>

      <div className="keywords-card">
        <h2>Palabras Clave</h2>
        <div className="keywords-list">
          {analysisData.keywords.map((kw, idx) => (
            <span className="keyword-tag" key={idx}>{kw}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionAudio;
