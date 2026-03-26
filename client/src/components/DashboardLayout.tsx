import { useState } from 'react';
import Navbar from './Navbar';
import RightSidebar from './RightSidebar';
import MainArea from './MainArea';

export default function DashboardLayout() {
  const [showAI, setShowAI] = useState(false);

  return (
    <div className="flex flex-col h-screen w-full bg-neutral-950 font-sans overflow-hidden">
      <Navbar />

      <div className="flex flex-row gap-4 px-2 py-2 w-full flex-1 overflow-hidden items-stretch">
        {/* Main content — hidden on mobile when AI panel is open */}
        <div className={`flex-1 flex-col justify-center min-w-0 ${showAI ? 'hidden' : 'flex'} lg:flex`}>
          <div className="h-full bg-neutral-900/90 rounded-2xl shadow-xl p-4 flex flex-col justify-center overflow-y-auto">
            <MainArea />
          </div>
        </div>

        {/* Right sidebar — always visible on lg+, toggled on mobile */}
        <div className={`flex-col shrink-0 h-full w-full lg:w-[360px] lg:max-w-[420px] ${showAI ? 'flex' : 'hidden'} lg:flex`}>
          <RightSidebar />
        </div>
      </div>

      {/* Mobile floating toggle button */}
      <button
        onClick={() => setShowAI((v) => !v)}
        className="lg:hidden fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-gradient-to-br from-violet-600 to-sky-500 text-white text-sm font-semibold px-4 py-3 rounded-full shadow-xl"
        aria-label="Toggle AI assistant"
      >
        {showAI ? (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Neura AI
          </>
        )}
      </button>
    </div>
  );
}
