import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  sendMessage as sendChatMessage,
  getChatHistory,
  clearChatHistory,
} from '../lib/chatApi';

interface ChatMessage {
  role: 'user' | 'assistant' | 'error';
  content: string;
  createdAt: Date;
}

const SUGGESTIONS = [
  'Summarize my recent notes',
  'What did I save about React?',
  'Find action items from meetings',
  'Draft an email based on my docs',
];

const AssistantAvatar = () => (
  <div className="flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-neutral-900 border border-neutral-700 mt-1 shadow-sm overflow-hidden">
    <svg
      width="20"
      height="20"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="7" y="7" width="24" height="24" rx="6" fill="#18181b" stroke="#38bdf8" strokeWidth="2" />
      <rect x="13" y="13" width="12" height="12" rx="3" fill="#a78bfa" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="13" cy="13" r="2" fill="#38bdf8" />
      <circle cx="25" cy="13" r="2" fill="#38bdf8" />
      <circle cx="13" cy="25" r="2" fill="#38bdf8" />
      <circle cx="25" cy="25" r="2" fill="#38bdf8" />
      <rect x="18" y="18" width="2" height="2" rx="1" fill="#fff" />
      <path d="M19 7V11" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 27V31" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 19H11" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27 19H31" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

function RightSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [_conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    getChatHistory()
      .then(({ messages: history, conversationId: cid }) => {
        if (history && history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: new Date(m.createdAt),
            }))
          );
        }
        if (cid) setConversationId(cid);
      })
      .catch(() => {
        // silently ignore history load errors
      });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const savedInput = input;
    const userMessage: ChatMessage = {
      role: 'user',
      content: savedInput,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { reply, conversationId: cid } = await sendChatMessage(savedInput);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, createdAt: new Date() },
      ]);
      setConversationId(cid);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: message, createdAt: new Date() },
      ]);
      setInput(savedInput);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    await clearChatHistory();
    setMessages([]);
  };

  return (
    <aside className="w-full flex-1 flex flex-col bg-neutral-900 border border-neutral-800 rounded-none lg:rounded-3xl shadow-2xl overflow-hidden relative">
      {/* ── Background Elements ─────────────────────────────── */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col p-6 pb-2 relative z-10 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 shadow-md overflow-hidden">
              <svg
                width="24"
                height="24"
                viewBox="0 0 38 38"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="7" y="7" width="24" height="24" rx="6" fill="#18181b" stroke="#38bdf8" strokeWidth="2" />
                <rect x="13" y="13" width="12" height="12" rx="3" fill="#a78bfa" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="13" cy="13" r="2" fill="#38bdf8" />
                <circle cx="25" cy="13" r="2" fill="#38bdf8" />
                <circle cx="13" cy="25" r="2" fill="#38bdf8" />
                <circle cx="25" cy="25" r="2" fill="#38bdf8" />
                <rect x="18" y="18" width="2" height="2" rx="1" fill="#fff" />
                <path d="M19 7V11" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M19 27V31" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 19H11" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M27 19H31" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Neura AI
            </h2>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors duration-150 cursor-pointer"
            >
              Clear chat
            </button>
          )}
        </div>
        <p className="text-xs font-medium text-slate-400">
          Ask questions about your memories
        </p>
      </div>

      {/* ── Chat Messages Area ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4 relative z-10 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {/* Welcome message */}
        <div className="flex items-start gap-3">
          <AssistantAvatar />
          <div className="bg-neutral-800/80 border border-neutral-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-200 leading-relaxed">
              Hi! I'm your Neura assistant. I have access to all your saved
              text, links, and documents. What would you like to know?
            </p>
          </div>
        </div>

        {/* Suggestion chips — hidden once conversation starts */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-2 pl-10">
            {SUGGESTIONS.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setInput(suggestion)}
                className="text-xs font-medium text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-900/50 rounded-full px-3 py-1.5 transition-colors duration-150 cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Conversation messages */}
        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] bg-linear-to-br from-violet-500 to-sky-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          }

          if (msg.role === 'error') {
            return (
              <div key={i} className="flex items-start gap-3">
                <AssistantAvatar />
                <div className="max-w-[80%] bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          }

          // assistant
          return (
            <div key={i} className="flex items-start gap-3">
              <AssistantAvatar />
              <div className="max-w-[80%] bg-neutral-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <AssistantAvatar />
            <div className="bg-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Chat Input ──────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4 bg-neutral-950/60 backdrop-blur-md border-t border-neutral-800/60 relative z-10 shrink-0">
        <div className="flex items-end gap-2 bg-neutral-900 border border-neutral-700/80 focus-within:border-sky-500/70 rounded-2xl px-4 py-3 transition-colors duration-200">

          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
            placeholder="Message Neura AI..."
            className="flex-1 max-h-32 min-h-[24px] bg-transparent text-sm text-white placeholder:text-slate-500 outline-none resize-none leading-relaxed"
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            title="Send"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-sky-500 text-white shadow-md transition shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5M12 5l-6 6M12 5l6 6"
              />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-600">
            Neura AI can make mistakes. Verify important info.
          </span>
        </div>
      </div>
    </aside>
  );
}

export default RightSidebar;
