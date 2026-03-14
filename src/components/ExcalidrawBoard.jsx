import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

function ExcalidrawBoard() {
  const { theme } = useApp();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  useEffect(() => {
    console.log('ExcalidrawBoard mounted, theme:', theme);
  }, [theme]);

  const getTheme = () => {
    if (theme === 'light' || theme === 'sun') return 'light';
    return 'dark';
  };

  const getBackgroundColor = () => {
    if (theme === 'sun') return '#1a1a1a';
    if (theme === 'light') return '#ffffff';
    return '#1a1a1a';
  };

  return (
    <div className="excalidraw-wrapper" style={{ height: '100%', minHeight: '500px', background: getBackgroundColor() }}>
      <Excalidraw
        excalidrawAPI={setExcalidrawAPI}
        theme={getTheme()}
        viewBackgroundColor={getBackgroundColor()}
      />
    </div>
  );
}

export default ExcalidrawBoard;
