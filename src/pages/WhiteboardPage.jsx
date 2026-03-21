import ExcalidrawBoard from '../components/ExcalidrawBoard';

function WhiteboardPage() {
  return (
    <div className="h-[calc(100vh-48px)] w-full flex flex-col" style={{ background: '#ffffff' }}>
      <ExcalidrawBoard />
    </div>
  );
}

export default WhiteboardPage;
