import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../App';

function WhiteboardPage() {
  const { theme } = useApp();
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
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(40);
  const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 });
  const [wireframeType, setWireframeType] = useState(null);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const savedCanvasRef = useRef(null);

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

  const getGridBackground = () => {
    if (!showGrid) return 'none';
    const color = theme === 'light' || theme === 'sun' ? '#bbbbbb' : '#333333';
    return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
  };

  const getGridBackgroundSize = () => {
    return showGrid ? `${gridSize}px ${gridSize}px` : 'auto';
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    const newState = canvas.toDataURL();
    savedCanvasRef.current = newState;
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
    setShapeStart(coords);
    setIsDrawing(true);
    
    if (['rectangle', 'circle', 'line', 'arrow', 'text'].includes(tool) || wireframeType) {
      tempImage.current = canvasRef.current.getContext('2d').getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCoords(e);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (['rectangle', 'circle', 'line', 'arrow', 'text'].includes(tool)) {
      ctx.putImageData(tempImage.current, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSize;
      
      if (tool === 'rectangle') {
        ctx.strokeRect(shapeStart.x, shapeStart.y, coords.x - shapeStart.x, coords.y - shapeStart.y);
      } else if (tool === 'circle') {
        const radiusX = Math.abs(coords.x - shapeStart.x) / 2;
        const radiusY = Math.abs(coords.y - shapeStart.y) / 2;
        const centerX = shapeStart.x + (coords.x - shapeStart.x) / 2;
        const centerY = shapeStart.y + (coords.y - shapeStart.y) / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.moveTo(shapeStart.x, shapeStart.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (tool === 'arrow') {
        const headlen = 15;
        const dx = coords.x - shapeStart.x;
        const dy = coords.y - shapeStart.y;
        const angle = Math.atan2(dy, dx);
        ctx.moveTo(shapeStart.x, shapeStart.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x - headlen * Math.cos(angle - Math.PI / 6), coords.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x - headlen * Math.cos(angle + Math.PI / 6), coords.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (tool === 'text') {
        const text = prompt('Enter text:', '');
        if (text) {
          ctx.font = `${brushSize * 4}px Arial`;
          ctx.fillText(text, shapeStart.x, shapeStart.y);
        }
      }
    } else if (wireframeType) {
      ctx.putImageData(tempImage.current, 0, 0);
      const wf = wireframes.find(w => w.id === wireframeType);
      if (wf) {
        const width = coords.x - shapeStart.x || wf.width;
        const height = coords.y - shapeStart.y || wf.height;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(shapeStart.x, shapeStart.y, width, height);
        
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(shapeStart.x + 2, shapeStart.y + 2, width - 4, height - 4);
        
        if (wf.id === 'button') {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(shapeStart.x, shapeStart.y + height/2 - 8, width, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Button', shapeStart.x + width/2, shapeStart.y + height/2 + 4);
        } else if (wf.id === 'input') {
          ctx.strokeStyle = '#d1d5db';
          ctx.strokeRect(shapeStart.x, shapeStart.y, width, height);
          ctx.fillStyle = '#9ca3af';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText('Input field...', shapeStart.x + 8, shapeStart.y + height/2 + 4);
        } else if (wf.id === 'header') {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(shapeStart.x, shapeStart.y, width, 15);
          ctx.fillStyle = '#1f2937';
          ctx.font = '14px Arial';
          ctx.textAlign = 'left';
          ctx.fillText('Header', shapeStart.x + 10, shapeStart.y + 35);
        } else if (wf.id === 'navbar') {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(shapeStart.x, shapeStart.y, width, height);
          ctx.strokeRect(shapeStart.x, shapeStart.y, width, height);
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#6b7280';
            ctx.fillRect(shapeStart.x + 20 + i * 80, shapeStart.y + 18, 40, 4);
          }
        } else if (wf.id === 'card') {
          ctx.strokeRect(shapeStart.x, shapeStart.y, width, height);
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(shapeStart.x + 10, shapeStart.y + 10, width - 20, height * 0.5);
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText('Title', shapeStart.x + 10, shapeStart.y + height * 0.7);
          ctx.fillStyle = '#6b7280';
          ctx.font = '10px Arial';
          ctx.fillText('Description...', shapeStart.x + 10, shapeStart.y + height * 0.85);
        } else if (wf.id === 'footer') {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(shapeStart.x, shapeStart.y, width, height);
          ctx.strokeRect(shapeStart.x, shapeStart.y, width, height);
          ctx.fillStyle = '#6b7280';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Footer content', shapeStart.x + width/2, shapeStart.y + height/2);
        }
      }
    }
    
    setLastPos(coords);
  };

  const tempImage = useRef(null);

  const stopDrawing = (e) => {
    if (isDrawing) {
      tempImage.current = null;
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
    { id: 'text', icon: 'fa-font', label: 'Text' },
    { id: 'arrow', icon: 'fa-long-arrow-alt-right', label: 'Arrow' },
    { id: 'rectangle', icon: 'fa-square', label: 'Rectangle' },
    { id: 'circle', icon: 'fa-circle', label: 'Circle' },
    { id: 'line', icon: 'fa-minus', label: 'Line' },
    { id: 'grid', icon: 'fa-th', label: 'Grid', isToggle: true },
  ];

  const wireframes = [
    { id: 'button', label: 'Button', icon: 'fa-stop', width: 120, height: 40 },
    { id: 'input', label: 'Input', icon: 'fa-square', width: 200, height: 36 },
    { id: 'header', label: 'Header', icon: 'fa-heading', width: 400, height: 60 },
    { id: 'navbar', label: 'Nav', icon: 'fa-bars', width: 300, height: 50 },
    { id: 'card', label: 'Card', icon: 'fa-id-card', width: 200, height: 150 },
    { id: 'footer', icon: 'fa-footer', label: 'Footer', width: 400, height: 80 },
  ];

  return (
    <div className="h-screen md:h-[calc(100vh-48px)] flex flex-col" style={{ background: 'var(--bg-main)' }}>
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
          {tools.filter(t => !t.isToggle).map((t) => (
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
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{ background: showGrid ? 'var(--accent-color)' : 'var(--bg-hover)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
                style={{ 
                  background: 'white',
                  transform: showGrid ? 'translateX(20px)' : 'translateX(0)'
                }}
              />
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Grid</span>
          </div>
          <select
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="ml-2 px-2 py-1 rounded text-xs border"
            style={{ 
              background: 'var(--bg-card)', 
              color: 'var(--text-main)', 
              borderColor: 'var(--border-color)',
              display: showGrid ? 'inline-block' : 'none'
            }}
          >
            <option value={20}>20px</option>
            <option value={40}>40px</option>
            <option value={60}>60px</option>
            <option value={80}>80px</option>
            <option value={100}>100px</option>
          </select>
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

        <div className="flex items-center gap-1 overflow-x-auto">
          <div className="relative">
            <button
              onClick={() => setShowShapesDropdown(!showShapesDropdown)}
              className="px-2 py-1 rounded-lg text-xs transition whitespace-nowrap flex items-center gap-1"
              style={{ 
                color: wireframeType ? 'white' : 'var(--text-muted)',
                background: wireframeType ? '#3b82f6' : 'var(--bg-hover)'
              }}
              title="Shapes"
            >
              <i className="fas fa-shapes mr-1"></i>
              Shapes
              <i className={`fas ${showShapesDropdown ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
            </button>
            {showShapesDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowShapesDropdown(false)} />
                <div 
                  className="absolute left-0 top-full mt-1 z-50 rounded-lg shadow-lg overflow-hidden min-w-[140px]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                >
                  {wireframes.map((wf) => (
                    <button
                      key={wf.id}
                      onClick={() => {
                        setWireframeType(wf.id);
                        setShowShapesDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-xs text-left transition flex items-center gap-2"
                      style={{ 
                        color: wireframeType === wf.id ? '#3b82f6' : 'var(--text-main)',
                        background: wireframeType === wf.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                      }}
                    >
                      <i className={`fas ${wf.icon} w-4`}></i>
                      {wf.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.download = 'whiteboard.png';
              link.href = canvasRef.current.toDataURL();
              link.click();
            }}
            className="p-2 rounded-lg transition hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
            title="Download"
          >
            <i className="fas fa-download text-sm"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2" ref={containerRef}>
        <div className="bg-white rounded-lg shadow-lg mx-auto relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
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
            style={{
              backgroundImage: getGridBackground(),
              backgroundSize: getGridBackgroundSize(),
              backgroundPosition: '0 0'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default WhiteboardPage;
