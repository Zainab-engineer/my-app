"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DocumentData {
  id: string;
  title: string;
  content: string;
  chatMessages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [streamContent, setStreamContent] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(40);
  const isDragging = useRef(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const prevDocRef = useRef<string>('');

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocument = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/documents/${params.id}`);
      const data = await res.json();
      setDoc(data);
      if (data.chatMessages?.length > 0) {
        setMessages(data.chatMessages);
      } else {
        setMessages([{
          role: "assistant",
          content: "Hello! I'm Consul, your document writing assistant. What would you like to write about?",
        }]);
      }
    } catch (err) {
      console.error(err);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    let context = input;
    if (selectedText) {
      context = `[Selected text from document:\n"""\n${selectedText}\n"""\n\n---\n\n${input}`;
    }

    const userMessage: ChatMessage = { role: "user", content: context };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedText(null);
    setIsSending(true);

    let fullText = "";

    try {
      const res = await fetch(`/api/documents/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: context }),
        credentials: 'same-origin',
      });

      if (!res.ok) return;

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              fullText += data.content;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') {
                  next[next.length - 1] = { ...last, content: fullText };
                }
                return next;
              });
            } else if (data.type === 'document_content') {
              setStreamContent(data.content);
            } else if (data.type === 'done') {
              setMessages(data.chatMessages || []);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleEditorSelection = useCallback((text: string) => {
    if (text.trim()) setSelectedText(text);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.min(Math.max(pct, 25), 60));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden font-sans">
      {/* Left Chat Side */}
      <div
        className="hidden md:flex flex-col bg-white border-r border-gray-200 shrink-0"
        style={{ width: `${leftWidth}%` }}
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-gray-200 flex items-center gap-3 bg-white shrink-0">
          <button
            onClick={() => router.push("/documents")}
            className="text-gray-500 hover:text-gray-700 transition cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-700 text-lg truncate">
            {doc?.title || 'Loading...'}
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <Message key={index} from={msg.role as "user" | "assistant"}>
                <MessageContent>{msg.content || (isSending && index === messages.length - 1 ? "..." : "")}</MessageContent>
              </Message>
            ))}
            <div ref={msgEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          {selectedText && (
            <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center justify-between">
              <span className="truncate mr-2">Selected: &ldquo;{selectedText.slice(0, 50)}&hellip;&rdquo;</span>
              <button
                onClick={() => setSelectedText(null)}
                className="text-blue-500 hover:text-blue-700 font-medium shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
          <div className="rounded-3xl border border-gray-300 overflow-hidden shadow-sm">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type your message..."
              className="w-full resize-none outline-none px-4 py-4 text-sm bg-transparent min-h-[90px]"
            />
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button
                onClick={sendMessage}
                disabled={isSending || !input.trim()}
                className="w-9 h-9 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="hidden md:block w-1.5 bg-transparent hover:bg-blue-300 active:bg-blue-400 cursor-col-resize shrink-0 transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Right Editor Side */}
      <div className="hidden md:flex flex-1 flex-col min-w-0 relative">
        <div className="flex-1 overflow-auto">
          {doc && (
            <SimpleEditor
              content={streamContent || doc.content}
              onUpdate={(html) => {
                fetch(`/api/documents/${params.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: html }),
                }).catch(() => {});
              }}
              onSelectionChange={handleEditorSelection}
            />
          )}
        </div>
      </div>
    </div>
  );
}
