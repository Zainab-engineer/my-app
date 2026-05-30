"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Brain, ChevronDown } from "lucide-react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorGroup,
  ModelSelectorItem,
} from "@/components/ai-elements/model-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODELS = [
  { id: "gpt-5-nano", name: "GPT 5 Nano", provider: "openai" as const },
  { id: "gpt-4o-mini", name: "GPT 4o Mini", provider: "openai" as const },
  { id: "gpt-20b", name: "GPT 20B", provider: "openai" as const },
  { id: "gpt-120b", name: "GPT 120B", provider: "openai" as const },
];

interface DocumentData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamContent, setStreamContent] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [mode, setMode] = useState("edit");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [reasoningLevel, setReasoningLevel] = useState("medium");
  const [reasoningText, setReasoningText] = useState("");
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const fetchDocument = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/documents/${params.id}`);
      const data = await res.json();
      setDoc(data);
    } catch (err) {
      console.error(err);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Click outside to minimize
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setMinimized(true);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keep expanded when text is selected
  useEffect(() => {
    if (selectedText) setMinimized(false);
  }, [selectedText]);

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    const docHtml = streamContent || doc?.content || "";
    let context = input;
    if (selectedText) {
      context = `[Full document HTML:\n"""\n${docHtml}\n"""\n\nSelected text from document:\n"""\n${selectedText}\n"""\n\n---\n\n${input}`;
    }

    setInput("");
    setSelectedText(null);
    setIsSending(true);
    setReasoningText("");
    setReasoningOpen(true);
    setMinimized(false);

    try {
      const res = await fetch(`/api/documents/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: context, mode, model: selectedModel.id, reasoningLevel }),
        credentials: 'same-origin',
      });

      if (!res.ok) return;

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let reasoningAccum = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'reasoning') {
              reasoningAccum = data.content;
              setReasoningText(data.content);
            } else if (data.type === 'text') {
              reasoningAccum += data.content;
              setReasoningText(reasoningAccum);
            } else if (data.type === 'document_content') {
              setStreamContent(data.content);
            } else if (data.type === 'done') {
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

  const hasOverlay = !!(selectedText || isSending || reasoningText);
  const expanded = hasOverlay && !minimized;

  return (
    <div className="h-screen w-full bg-white overflow-hidden font-sans relative">
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
          onBack={() => router.push("/documents")}
        />
      )}

      {/* Floating Chat Bar */}
      <div
        ref={barRef}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full pointer-events-none z-50"
        style={{ maxWidth: "648px" }}
      >
        <div
          className={cn(
            "bg-white border border-gray-300 shadow-lg pointer-events-auto transition-[border-radius] duration-200",
            expanded ? "rounded-lg" : "rounded-full"
          )}
        >
          {/* Reasoning / Response overlay */}
          {(isSending || reasoningText) && expanded && (
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 max-h-[40vh] overflow-y-auto">
              <button
                onClick={() => setReasoningOpen(!reasoningOpen)}
                className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors w-full cursor-pointer"
              >
                <Brain className="size-4 shrink-0" />
                {isSending && !reasoningText ? (
                  <Shimmer duration={1}>Thinking...</Shimmer>
                ) : (
                  <span className="text-xs font-medium">
                    {reasoningOpen ? "Hide reasoning" : `Show reasoning`}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 ml-auto transition-transform",
                    reasoningOpen && "rotate-180"
                  )}
                />
              </button>
              {reasoningOpen && reasoningText && (
                <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {reasoningText}
                </div>
              )}
            </div>
          )}

          {/* Selected text indicator */}
          {selectedText && !isSending && !reasoningText && (
            <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center justify-between">
              <span className="truncate mr-2">Selected: &ldquo;{selectedText.slice(0, 50)}&hellip;&rdquo;</span>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedText(null); }}
                className="text-blue-500 hover:text-blue-700 font-medium shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            {/* Model selector */}
            <ModelSelector open={modelOpen} onOpenChange={setModelOpen}>
              <ModelSelectorTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <img
                    alt={selectedModel.provider}
                    className="size-4 dark:invert"
                    src={`https://models.dev/logos/${selectedModel.provider}.svg`}
                  />
                </Button>
              </ModelSelectorTrigger>
              <ModelSelectorContent>
                <ModelSelectorInput placeholder="Search models..." />
                <ModelSelectorList>
                  <ModelSelectorGroup>
                    {MODELS.map((m) => (
                      <ModelSelectorItem
                        key={m.id}
                        onSelect={() => {
                          setSelectedModel(m);
                          setModelOpen(false);
                        }}
                      >
                        <img
                          alt={m.provider}
                          className="size-3 dark:invert"
                          src={`https://models.dev/logos/${m.provider}.svg`}
                        />
                        {m.name}
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                </ModelSelectorList>
              </ModelSelectorContent>
            </ModelSelector>

            {/* Mode selector */}
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-14 h-7 text-xs border-none bg-transparent font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-md shrink-0 [&>svg]:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ask">Ask</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>

            {/* Reasoning level */}
            <Select value={reasoningLevel} onValueChange={setReasoningLevel}>
              <SelectTrigger className="w-18 h-7 text-xs border-none bg-transparent font-medium text-muted-foreground hover:bg-accent hover:text-foreground rounded-md shrink-0 [&>svg]:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            {/* Text input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              onFocus={() => setMinimized(false)}
              placeholder={isSending ? "Waiting for response..." : "Ask AI to edit the document..."}
              disabled={isSending}
              className="flex-1 h-8 text-sm outline-none bg-transparent px-1 placeholder:text-muted-foreground/60"
            />

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={isSending || !input.trim()}
              className="w-8 h-8 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
