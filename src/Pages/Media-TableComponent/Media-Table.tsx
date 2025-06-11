import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Media-Table.css';

export interface AudioFile {
  id: number;
  fileName: string;
  date: string;
  duration: string;
  agent: string;
  agentId: string;
  fileSize: string;
  format: string;
  sentiment?: string;
  transcription?: string;
}

const mockAudioFiles: AudioFile[] = [
  {
    id: 1,
    fileName: 'llamada_ventas_001.mp3',
    date: '2024-03-15 09:30',
    duration: '00:12:45',
    agent: 'Laura Gómez',
    agentId: 'laura_gomez',
    fileSize: '15.4 MB',
    format: 'MP3',
  },
  {
    id: 2,
    fileName: 'soporte_tecnico_045.mp3',
    date: '2024-03-15 11:15',
    duration: '00:08:22',
    agent: 'Carlos Mendoza',
    agentId: 'carlos_mendoza',
    fileSize: '8.7 MB',
    format: 'MP3',
  },
  {
    id: 3,
    fileName: 'reclamo_cliente_112.wav',
    date: '2024-03-15 14:00',
    duration: '00:23:18',
    agent: 'Ana Torres',
    agentId: 'ana_torres',
    fileSize: '42.1 MB',
    format: 'WAV',
    sentiment: 'negative',
    transcription: 'Cliente expresa insatisfacción con...',
  },
];

const MediaTable: React.FC = () => {
  const [audioFiles] = useState<AudioFile[]>(mockAudioFiles);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  const navigate = useNavigate();

  const uniqueAgents = useMemo(
    () => [...new Set(audioFiles.map(audio => audio.agent))],
    [audioFiles]
  );

  const filteredAudios = useMemo(() => {
    return audioFiles.filter(audio => {
      const matchesSearch = audio.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAgent = selectedAgent ? audio.agent === selectedAgent : true;
      return matchesSearch && matchesAgent;
    });
  }, [audioFiles, searchTerm, selectedAgent]);

  const downloadAudio = (audio: AudioFile) => {
    const blob = new Blob([`Archivo de prueba: ${audio.fileName}`], { type: 'audio/mpeg' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = audio.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const viewAudioDetails = (audio: AudioFile) => {
    // Ir a la ruta de detalle, pasando el audio por state
    navigate(`/transcriptionAudio/${audio.id}`, {
      state: { audioData: audio },
    });
  };

  return (
    <div className="media-bg">
      <div className="audio-container">
        <div className="filter-section">
          <div className="filter-group">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre de archivo..."
              autoComplete="off"
            />
          </div>
          <div className="filter-group">
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
            >
              <option value="">Todos los agentes</option>
              {uniqueAgents.map(agent => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="audio-table">
            <thead>
              <tr>
                <th>Nombre Archivo</th>
                <th>Fecha</th>
                <th>Duración</th>
                <th>Agente</th>
                <th>Tamaño</th>
                <th>Formato</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudios.map(audio => (
                <tr
                  key={audio.id}
                  onClick={() => viewAudioDetails(audio)}
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{audio.fileName}</td>
                  <td>
                    {new Date(audio.date).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td>{audio.duration}</td>
                  <td>{audio.agent}</td>
                  <td>{audio.fileSize}</td>
                  <td>{audio.format}</td>
                  <td>
                    <button
                      className="download-btn"
                      onClick={e => {
                        e.stopPropagation();
                        downloadAudio(audio);
                      }}
                      title="Descargar"
                    >
                      <i className="fas fa-download" /> Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAudios.length === 0 && (
          <div className="no-results">
            No se encontraron resultados para la búsqueda.
          </div>
        )}

        {/* Iconos de FontAwesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
      </div>
    </div>
  );
};

export default MediaTable;
