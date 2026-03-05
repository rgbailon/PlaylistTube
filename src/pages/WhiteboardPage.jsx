import { useState, useRef, useEffect } from 'react';

function WhiteboardPage() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  }, []);

  const saveState = () => {
    const canvas = canvasRef.current;
    const newState = canvas.toDataURL();
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastPos({ x, y });
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    setLastPos({ x, y });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#ff6b00', '#ffeb3b', 
    '#4caf50', '#2196f3', '#9c27b0', '#795548', '#607d8b'
  ];

  const tools = [
    { id: 'pen', icon: 'fa-pen', label: 'Pen' },
    { id: 'eraser', icon: 'fa-eraser', label: 'Eraser' },
  ];

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <div 
        className="flex items-center justify-between px-4 py-2"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <i className="fas fa-pen" style={{ color: 'var(--accent-color)' }}></i>
          Whiteboard
        </h2>
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                setColor(t.id === 'eraser' ? '#ffffff' : color);
              }}
              className="p-2 rounded-lg transition"
              style={{ 
                color: tool === t.id ? '#3b82f6' : 'var(--text-muted)',
                background: tool === t.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
              }}
              title={t.label}
            >
              <i className={`fas ${t.icon} text-sm`}></i>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              className={`w-5 h-5 rounded-full border-2 transition ${color === c ? 'border-blue-500 scale-110' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Size:</span>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-16"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg transition hover:bg-[var(--bg-hover)] disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
            title="Undo"
          >
            <i className="fas fa-undo text-sm"></i>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg transition hover:bg-[var(--bg-hover)] disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
            title="Redo"
          >
            <i className="fas fa-redo text-sm"></i>
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 rounded-lg transition hover:bg-red-50 text-red-500"
            title="Clear"
          >
            <i className="fas fa-trash text-sm"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="bg-white rounded-lg shadow-lg mx-auto" style={{ width: 'fit-content' }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}

export default WhiteboardPage;
