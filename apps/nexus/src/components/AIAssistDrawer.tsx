import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { X, Sparkles, Send, CheckCircle2, AlertCircle } from "lucide-react";

interface AIAssistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIAssistDrawer({ isOpen, onClose }: AIAssistDrawerProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Hi! I can help you create, modify, or optimize workflows. Try something like:\n\n• \"Create a workflow that dims lights at 6 PM\"\n• \"Add a condition to check crowd density\"\n• \"Optimize the morning sequence for faster execution\""
    }
  ]);

  const handleSend = () => {
    if (!prompt.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I've analyzed your request. Here's what I can create:\n\n**Workflow: Evening Lighting Automation**\n- Trigger: Time = 18:00 (6 PM)\n- Condition: Ambient light < 300 lux\n- Action: Dim all lights to 40%\n\nWould you like me to add this to the canvas?"
      }]);
    }, 1000);

    setPrompt("");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="text-slate-900 dark:text-slate-100">AI Workflow Assistant</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`
                  max-w-[280px] rounded-lg px-4 py-2 whitespace-pre-wrap
                  ${message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  }
                `}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm text-slate-700 dark:text-slate-300">You</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPrompt("Create a morning lighting sequence")}
            >
              Morning Sequence
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPrompt("Optimize for energy savings")}
            >
              Optimize Energy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPrompt("Add emergency protocol")}
            >
              Emergency Mode
            </Button>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex gap-2">
            <Textarea
              placeholder="Describe the workflow you want to create or modify..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={3}
              className="resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={!prompt.trim()}
              className="h-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
