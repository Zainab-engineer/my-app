"use client";

import { useState } from "react";

export default function GeminiArabicLayout() {
  const [view, setView] = useState<"chat" | "docs">("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "أهلاً بك! أنا Gemini Docs، يمكنني مساعدتك في كتابة المستندات وتلخيص النصوص.",
    },
  ]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
    };

    const botMessage = {
      role: "assistant",
      content: `لقد قلت: ${input}`,
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
  };

  return (
    <div className="h-screen w-full flex bg-[#f5f5f5] overflow-hidden font-sans">
      {/* Left Chat Side */}
      <div className="w-full md:w-[38%] bg-[#f1f3f4] border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <button className="text-gray-500 text-xl">☰</button>
            <h1 className="font-semibold text-gray-700 text-lg">Gemini</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("chat")}
              className={`px-4 py-1.5 rounded-full text-sm transition ${
                view === "chat"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Chat
            </button>

            <button
              onClick={() => setView("docs")}
              className={`px-4 py-1.5 rounded-full text-sm transition ${
                view === "docs"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              Documents
            </button>
          </div>
        </div>

        {/* Chat / Docs Panel */}
        <div className="flex-1 overflow-auto p-4">
          {view === "chat" ? (
            <div className="space-y-5">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-7 shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white text-gray-700 rounded-bl-md border border-gray-200"
                    }`}
                    dir="rtl"
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-gray-700 text-sm leading-7 mb-5" dir="rtl">
                ابدأ الآن بإنشاء مستند جديد باستخدام Gemini لمساعدتك في
                الكتابة وتنسيق الأفكار.
              </p>

              <div className="space-y-3">
                <button className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-right hover:bg-gray-50 transition shadow-sm">
                  <div className="flex items-center gap-3" dir="rtl">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                      📄
                    </div>

                    <div>
                      <h2 className="font-medium text-gray-800">
                        مستند جديد
                      </h2>
                      <p className="text-sm text-gray-500">
                        اضغط للبدء بالكتابة
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-[#f1f3f4]">
          <div className="bg-white rounded-3xl border border-gray-300 overflow-hidden shadow-sm">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب أي شيء هنا"
              className="w-full resize-none outline-none px-4 py-4 text-sm bg-transparent min-h-[90px]"
              dir="rtl"
            />

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button className="text-gray-400 text-lg">+</button>

              <button
                onClick={sendMessage}
                className="w-9 h-9 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition flex items-center justify-center"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Editor Side */}
      <div className="hidden md:flex flex-1 bg-white flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-5">
          <div className="flex items-center gap-4 text-gray-500 text-sm">
            <button>📄</button>
            <button>{`</>`}</button>
            <button>Paragraph</button>
            <button className="font-bold">B</button>
            <button className="italic">I</button>
            <button>≡</button>
          </div>

          <button className="bg-blue-500 text-white px-5 py-2 rounded-full text-sm hover:bg-blue-600 transition">
            Create
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 relative bg-white">
          <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-2xl shadow-lg flex flex-col overflow-hidden">
            <button className="w-14 h-14 hover:bg-gray-50 transition text-gray-500">
              ✎
            </button>
            <button className="w-14 h-14 hover:bg-gray-50 transition text-gray-500 border-t border-gray-100">
              📝
            </button>
            <button className="w-14 h-14 hover:bg-gray-50 transition text-gray-500 border-t border-gray-100">
              📄
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}