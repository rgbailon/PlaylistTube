import { useApp } from '../App';
import ExcalidrawBoard from '../components/ExcalidrawBoard';

function WhiteboardPage() {
  return (
    <div className="h-screen md:h-[calc(100vh-48px)] flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <ExcalidrawBoard />
    </div>
  );
}

export default WhiteboardPage;
