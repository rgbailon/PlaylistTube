import { useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

function ExcalidrawBoard() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  return (
    <div className="excalidraw-wrapper w-full h-full min-h-[300px] md:min-h-0" style={{ background: '#ffffff' }}>
      <Excalidraw
        excalidrawAPI={setExcalidrawAPI}
        theme="light"
        viewBackgroundColor="#ffffff"
      />
    </div>
  );
}

export default ExcalidrawBoard;
