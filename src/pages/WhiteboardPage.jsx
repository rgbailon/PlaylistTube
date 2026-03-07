import { useState, useRef, useEffect, useCallback } from 'react';

function WhiteboardPage() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 600 });

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.min(rect.width - 20, 1200);
    const height = width * 0.5;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

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

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCoords(e);
    setLastPos(coords);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    setLastPos(coords);
  };

  const stopDrawing = (e) => {
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
    <div className="h-[calc(100vh-48px)] md:h-[calc(100vh-48px)] flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between px-2 sm:px-4 py-2 gap-2 overflow-x-auto"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2 whitespace-nowrap" style={{ color: 'var(--text-main)' }}>
          <i className="fas fa-pen" style={{ color: 'var(--accent-color)' }}></i>
          Whiteboard
        </h2>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Tool:</span>
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

        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex-shrink-0 transition ${color === c ? 'border-blue-500 scale-110' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Size:</span>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-16 sm:w-20"
          />
          <span className="text-xs w-5" style={{ color: 'var(--text-muted)' }}>{brushSize}</span>
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

      <div className="flex-1 overflow-auto p-2" ref={containerRef}>
        <div className="bg-white rounded-lg shadow-lg mx-auto" style={{ width: 'fit-content', maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair touch-none"
          />
        </div>
      </div>
    </div>
  );
}

export default WhiteboardPage;
