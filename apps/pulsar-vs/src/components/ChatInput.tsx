import { useState, useRef, useCallback, memo, useImperativeHandle, forwardRef } from "react";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Send, Mic, MicOff, Loader2, Sparkles } from "lucide-react";

interface ChatInputProps {
  placeholder: string;
  onSubmit: (value: string) => void;
  isLoading: boolean;
  onMicClick?: () => void;
  isRecording?: boolean;
  icon?: "send" | "sparkles";
  disabled?: boolean;
}

export interface ChatInputRef {
  setValue: (value: string) => void;
  clear: () => void;
  focus: () => void;
}

/**
 * Isolated chat input component that manages its own local state.
 * This prevents parent re-renders on every keystroke.
 *
 * Exposes ref methods for external control (speech recognition, clear):
 * - setValue(value): Set the input value
 * - clear(): Clear the input
 * - focus(): Focus the input
 */
export const ChatInput = memo(forwardRef<ChatInputRef, ChatInputProps>(function ChatInput({
  placeholder,
  onSubmit,
  isLoading,
  onMicClick,
  isRecording = false,
  icon = "send",
  disabled = false,
}, ref) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    setValue: (newValue: string) => setValue(newValue),
    clear: () => setValue(""),
    focus: () => inputRef.current?.focus(),
  }), []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !isLoading) {
      onSubmit(trimmed);
      setValue(""); // Clear after submit
    }
  }, [value, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const isDisabled = isLoading || !value.trim();

  return (
    <div className="relative flex-1">
      <Textarea
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-background pr-24 resize-none min-h-[44px]"
        rows={1}
        disabled={isLoading || disabled}
      />
      {onMicClick && (
        <Button
          size="icon"
          onClick={onMicClick}
          disabled={isLoading}
          variant={isRecording ? "default" : "ghost"}
          className={`absolute end-12 bottom-2 h-8 w-8 ${isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""}`}
        >
          {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </Button>
      )}
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={isDisabled}
        className="absolute end-2 bottom-2 h-8 w-8"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : icon === "sparkles" ? (
          <Sparkles className="size-4" />
        ) : (
          <Send className="size-4 rtl:-scale-x-100" />
        )}
      </Button>
    </div>
  );
}));
