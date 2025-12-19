import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Paperclip, Image as ImageIcon, Wand2, Sparkles, Loader2, Bot, User,
  AlertCircle, CheckCircle2, Code, ChevronDown, ChevronUp, Camera, X, FileText, Trash2, Mic, MicOff, Square, GripHorizontal, BookOpen, Zap, Database
} from 'lucide-react';
import { Button, Textarea, ScrollArea, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, cn } from '@emergent-platform/ui';
import { sendChatMessage, sendChatMessageStreaming, sendDocsChatMessage, QUICK_PROMPTS, isDrasticChange, AI_MODELS, getAIModel, getGeminiApiKey, getClaudeApiKey, isAIAvailableInCurrentEnv, type ChatMessage as AIChatMessage } from '@/lib/ai';
import { resolveGeneratePlaceholders, hasGeneratePlaceholders, replaceGenerateWithPlaceholder } from '@/lib/ai-prompts/tools/ai-image-generator';
import { useAuthStore } from '@/stores/authStore';
import { useDesignerStore } from '@/stores/designerStore';
import { useConfirm } from '@/hooks/useConfirm';
import type { AIContext, AIChanges, ChatAttachment } from '@emergent-platform/types';
import { sampleDataSources, type DataSourceConfig, extractFieldsFromData } from '@/data/sampleDataSources';

interface Attachment {
  id: string;
  type: 'image' | 'file' | 'screenshot';
  name: string;
  data: string; // base64 or data URL
  preview?: string;
}

// Progress phases for AI graphic creation
type CreationPhase =
  | 'idle'
  | 'thinking'      // AI is processing/thinking
  | 'designing'     // AI is designing the graphic structure
  | 'generating'    // AI is generating elements
  | 'parsing'       // Parsing the JSON response
  | 'images'        // Generating AI images for placeholders
  | 'applying'      // Applying elements to canvas
  | 'animating'     // Adding animations
  | 'done'
  | 'error';

interface CreationProgress {
  phase: CreationPhase;
  message: string;
  elementCount?: number;
  currentElement?: string;  // Name of element being processed
  totalElements?: number;   // Total elements to create
  processedElements?: number; // Elements processed so far
}

// Documentation context for docs mode - helps users learn about Nova GFX and Pulsar GFX
const DOCS_CONTEXT = `You are a helpful documentation assistant for Nova GFX and Pulsar GFX - professional broadcast graphics applications.

Nova GFX is a graphics designer for creating broadcast templates with:
- Elements: Text, Image, Shape, Video, Chart, Map, Countdown, Ticker, Table, Icon, SVG, Lottie animations
- Animation system with keyframes, easing, and animation phases (in, loop, out)
- Template layers for organizing graphics (lower-third, fullscreen, bug, ticker, etc.)
- AI-powered design assistance
- Real-time preview
- Data bindings for dynamic content

Pulsar GFX is a playout controller for:
- Managing channels and layers
- Creating and controlling playlists
- Live playout with keyboard shortcuts (F1-F4, Space, Arrow keys)
- Content editing and data binding
- Multi-channel output

Key concepts:
- Templates contain elements with animations
- Pages are instances of templates with custom content
- Playlists organize pages for sequential or timed playback
- Channels connect to video outputs/players
- Data bindings connect template fields to external data sources
- Layers organize templates by type (lower-third, fullscreen, bug, ticker)

Animation phases:
- "in" phase: How elements animate when graphic appears
- "loop" phase: Continuous animation while graphic is on screen
- "out" phase: How elements animate when graphic exits

Always provide helpful, accurate answers based on the documentation. If you're unsure about something, say so. Keep responses concise and practical.`

// Helper to extract human-readable description from AI response (removing JSON code blocks)
function extractDescription(content: string): { description: string; code: string | null; hasCode: boolean } {
  // Match complete code blocks first
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  
  // Also handle incomplete code blocks (truncated responses)
  const incompleteMatch = content.match(/```json\s*([\s\S]*)$/);
  
  if (jsonMatch) {
    // Complete code block found - remove it from description
    const description = content
      .replace(/```json\s*[\s\S]*?```/g, '') // Remove all complete blocks
      .replace(/```json\s*[\s\S]*$/g, '')    // Remove any trailing incomplete block
      .trim();
    
    return { description: description || 'Created graphics on canvas.', code: jsonMatch[1], hasCode: true };
  }
  
  if (incompleteMatch) {
    // Incomplete code block (response was truncated)
    const description = content
      .replace(/```json\s*[\s\S]*$/g, '')
      .trim();
    
    return { 
      description: description || 'Created graphics on canvas. (Response was truncated but elements should be applied.)', 
      code: incompleteMatch[1], 
      hasCode: true 
    };
  }
  
  return { description: content, code: null, hasCode: false };
}

/**
 * Expand dynamic_elements template into explicit elements
 * This allows AI to use a more efficient template format with data arrays
 * and we expand it into individual elements before processing
 */
function expandDynamicElements(changes: AIChanges): AIChanges {
  const dynamicElements = changes.dynamic_elements;
  if (!dynamicElements || !dynamicElements.data || !dynamicElements.elements) {
    return changes;
  }

  console.log('🔄 Expanding dynamic_elements template:', {
    dataRows: dynamicElements.data.length,
    templateElements: dynamicElements.elements.length,
  });

  const expandedElements: any[] = [...(changes.elements || [])];
  const expandedAnimations: any[] = [...(changes.animations || [])];

  // Simple helper to evaluate expressions - supports basic math only
  const evalExpression = (expr: string, rowData: Record<string, any>, rowIndex: number): any => {
    try {
      let processed = expr;
      // Replace data variables
      Object.keys(rowData).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        const val = rowData[key];
        // For strings, quote them; for numbers, use as-is
        processed = processed.replace(regex, typeof val === 'string' ? `"${val}"` : String(val));
      });
      // Replace @index
      processed = processed.replace(/\{\{@index\}\}/g, String(rowIndex));

      // Check for unsupported syntax before eval
      if (processed.includes('(') && !processed.match(/^\s*[\d\s+\-*/().]+\s*$/)) {
        // Contains function calls or complex syntax - try to extract first number
        const numMatch = processed.match(/(\d+)/);
        if (numMatch) {
          console.warn('Complex expression simplified to number:', expr, '→', numMatch[1]);
          return parseInt(numMatch[1], 10);
        }
        return null;
      }

      // Evaluate safely - only basic math at this point
      // eslint-disable-next-line no-new-func
      return new Function('return ' + processed)();
    } catch (e) {
      console.warn('Failed to evaluate expression:', expr, e);
      // Try to extract any number from the expression as fallback
      const numMatch = expr.match(/(\d+)/);
      return numMatch ? parseInt(numMatch[1], 10) : null;
    }
  };

  // Helper function to replace template variables (simple and robust)
  const replaceVariables = (obj: any, rowData: Record<string, any>, rowIndex: number): any => {
    if (typeof obj === 'string') {
      // Handle expression() syntax
      if (obj.startsWith('expression(') && obj.endsWith(')')) {
        const expr = obj.slice(11, -1);
        const result = evalExpression(expr, rowData, rowIndex);
        return result !== null ? result : obj;
      }
      // Simple variable replacement
      let result = obj;
      Object.keys(rowData).forEach((key) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(rowData[key]));
      });
      result = result.replace(/\{\{@index\}\}/g, String(rowIndex));
      return result;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => replaceVariables(item, rowData, rowIndex));
    }
    if (obj && typeof obj === 'object') {
      const newObj: Record<string, any> = {};
      Object.keys(obj).forEach((key) => {
        newObj[key] = replaceVariables(obj[key], rowData, rowIndex);
      });
      return newObj;
    }
    return obj;
  };

  // Process each data row - FLAT expansion (no groups)
  dynamicElements.data.forEach((rowData: Record<string, any>, rowIndex: number) => {
    // Process each element template
    dynamicElements.elements.forEach((elementTemplate: any) => {
      // Deep clone and expand the template
      const element = JSON.parse(JSON.stringify(elementTemplate));
      const expandedElement = replaceVariables(element, rowData, rowIndex);

      // Add row index for debugging
      expandedElement._rowIndex = rowIndex;

      // Validate numeric properties - skip element if position/size isn't valid
      if (typeof expandedElement.position_x !== 'number' ||
          typeof expandedElement.position_y !== 'number') {
        console.warn('Skipping element with invalid position:', expandedElement.name, {
          position_x: expandedElement.position_x,
          position_y: expandedElement.position_y,
        });
        return;
      }

      expandedElements.push(expandedElement);
    });
  });

  // Process dynamic animations if any
  if (dynamicElements.animations) {
    dynamicElements.data.forEach((rowData: Record<string, any>, rowIndex: number) => {
      dynamicElements.animations.forEach((animTemplate: any) => {
        // Skip pattern-based animations for now (they match by name pattern)
        if (animTemplate.element_name_pattern) {
          return;
        }

        const anim = JSON.parse(JSON.stringify(animTemplate));
        const expandedAnim = replaceVariables(anim, rowData, rowIndex);
        expandedAnimations.push(expandedAnim);
      });
    });
  }

  // Generate default animations for expanded elements that don't have any
  const animatedElementNames = new Set<string>();
  for (const anim of expandedAnimations) {
    if (anim?.element_name) {
      animatedElementNames.add(anim.element_name);
    }
  }

  const staticElementCount = changes.elements?.length || 0;
  const dynamicExpandedElements = expandedElements.slice(staticElementCount);
  let dynamicElementIndex = 0;

  for (const element of dynamicExpandedElements) {
    const elementName = element.name;
    if (!elementName || animatedElementNames.has(elementName)) {
      continue;
    }

    // Calculate staggered delay based on row index for coordinated appearance
    const rowIndex = element._rowIndex ?? dynamicElementIndex;
    const baseDelay = 600; // Start after static elements
    const rowDelay = rowIndex * 80; // Stagger by row
    const staggerDelay = Math.min(baseDelay + rowDelay, 1500); // Cap at 1.5s

    // Create default IN animation (fade + slide)
    expandedAnimations.push({
      element_name: elementName,
      phase: 'in',
      delay: staggerDelay,
      duration: 350,
      iterations: 1,
      easing: 'ease-out',
      keyframes: [
        { position: 0, properties: { opacity: 0, position_y: element.position_y + 20 } },
        { position: 100, properties: { opacity: 1, position_y: element.position_y } },
      ],
    });

    // Create default OUT animation (fade)
    expandedAnimations.push({
      element_name: elementName,
      phase: 'out',
      delay: 0,
      duration: 250,
      iterations: 1,
      easing: 'ease-in',
      keyframes: [
        { position: 0, properties: { opacity: 1 } },
        { position: 100, properties: { opacity: 0 } },
      ],
    });

    dynamicElementIndex++;
  }

  console.log('✅ Expanded dynamic_elements:', {
    originalElements: changes.elements?.length || 0,
    expandedElements: expandedElements.length,
    originalAnimations: changes.animations?.length || 0,
    expandedAnimations: expandedAnimations.length,
    dynamicElementsWithDefaultAnimations: dynamicElementIndex,
  });

  return {
    ...changes,
    elements: expandedElements,
    animations: expandedAnimations,
  };
}

// Component to render creation progress indicator
function CreationProgressIndicator({ progress }: { progress: CreationProgress }) {
  const phaseIcons: Record<CreationPhase, React.ReactNode> = {
    idle: null,
    thinking: <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />,
    designing: <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />,
    generating: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    parsing: <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
    images: <ImageIcon className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />,
    applying: <Wand2 className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />,
    animating: <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-bounce" />,
    done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  };

  const phaseColors: Record<CreationPhase, string> = {
    idle: '',
    thinking: 'text-violet-300',
    designing: 'text-cyan-300',
    generating: 'text-blue-300',
    parsing: 'text-amber-300',
    images: 'text-emerald-300',
    applying: 'text-fuchsia-300',
    animating: 'text-pink-300',
    done: 'text-emerald-300',
    error: 'text-red-300',
  };

  // Calculate progress percentage for applying phase
  const showProgressBar = progress.totalElements && progress.processedElements !== undefined;
  const progressPercent = showProgressBar
    ? Math.round((progress.processedElements! / progress.totalElements!) * 100)
    : 0;

  return (
    <div className="space-y-1">
      <div className={cn("flex items-center gap-2", phaseColors[progress.phase])}>
        {phaseIcons[progress.phase]}
        <span className="text-xs">{progress.message}</span>
        {progress.elementCount !== undefined && progress.phase === 'done' && (
          <span className="text-[10px] text-muted-foreground">
            ({progress.elementCount} element{progress.elementCount !== 1 ? 's' : ''})
          </span>
        )}
      </div>
      {/* Progress bar for applying phase */}
      {showProgressBar && progress.phase === 'applying' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {progress.processedElements}/{progress.totalElements}
          </span>
        </div>
      )}
      {/* Current element name */}
      {progress.currentElement && (
        <p className="text-[10px] text-muted-foreground truncate">
          → {progress.currentElement}
        </p>
      )}
    </div>
  );
}

// Component to render AI message with optional code toggle
function MessageContent({
  content,
  isCodeExpanded,
  onToggleCode,
  creationProgress
}: {
  content: string;
  isCodeExpanded: boolean;
  onToggleCode: () => void;
  creationProgress?: CreationProgress;
}) {
  const { description, code, hasCode } = extractDescription(content);

  // If we're in a creation phase (not idle and not done), show the progress indicator instead of content
  const isCreating = creationProgress &&
    creationProgress.phase !== 'idle' &&
    creationProgress.phase !== 'done' &&
    creationProgress.phase !== 'error';

  return (
    <div>
      {isCreating ? (
        <CreationProgressIndicator progress={creationProgress} />
      ) : creationProgress?.phase === 'done' ? (
        <div>
          <CreationProgressIndicator progress={creationProgress} />
          {description && description !== 'Done!' && (
            <p className="whitespace-pre-wrap mt-2 text-muted-foreground text-[11px]">{description}</p>
          )}
        </div>
      ) : (
        <p className="whitespace-pre-wrap">{description || 'Done!'}</p>
      )}

      {hasCode && !isCreating && (
        <div className="mt-2">
          <button
            onClick={onToggleCode}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Code className="w-3 h-3" />
            {isCodeExpanded ? 'Hide' : 'Show'} code
            {isCodeExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>

          {isCodeExpanded && code && (
            <pre className="mt-1.5 p-1.5 bg-muted dark:bg-black/30 rounded text-[9px] overflow-x-auto max-h-40 overflow-y-auto">
              <code className="text-violet-700 dark:text-violet-300">{code}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  const confirm = useConfirm();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCodeIds, setExpandedCodeIds] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isDocsMode, setIsDocsMode] = useState(false);
  const [isDataMode, setIsDataMode] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceConfig | null>(null);
  const [showQuickPrompts, setShowQuickPrompts] = useState(() => {
    const saved = localStorage.getItem('nova-chat-show-quick-prompts');
    return saved !== null ? saved === 'true' : true; // Default to showing
  });
  const [creationProgress, setCreationProgress] = useState<CreationProgress>({ phase: 'idle', message: '' });
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingAIChangesRef = useRef<{ changes: any; messageId: string } | null>(null); // Stores pending changes when user wants to skip images
  const skipImagesRef = useRef(false); // Flag to skip remaining image generation
  const imageGenAbortRef = useRef<AbortController | null>(null); // AbortController for image generation
  const [isSkippingImages, setIsSkippingImages] = useState(false); // UI state for skip button visibility
  const shouldRestartRecognition = useRef(false); // Track if we should auto-restart
  // Track last failed request for auto-retry on duplicate message
  const lastFailedRequestRef = useRef<{
    input: string;
    attachments: Attachment[];
    timestamp: number;
  } | null>(null);
  // Track auto-retry attempts for image requests (reset on success)
  const autoRetryCountRef = useRef(0);
  const MAX_AUTO_RETRIES = 1; // Auto-retry once for image requests
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseInputRef = useRef(''); // Track input before speech started
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resizable input area state
  const [inputAreaHeight, setInputAreaHeight] = useState(() => {
    const saved = localStorage.getItem('nova-chat-input-height');
    return saved ? parseInt(saved, 10) : 180;
  });
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const {
    project,
    currentTemplateId,
    templates,
    layers,
    elements,
    selectedElementIds,
    // Chat state from store
    chatMessages,
    isChatLoading,
    loadChatMessages,
    addChatMessage,
    updateChatMessageContent,
    markChangesApplied,
    clearChat,
  } = useDesignerStore();

  // Load chat history when project changes (only on initial load)
  const hasLoadedChatRef = useRef<string | null>(null);
  useEffect(() => {
    if (project?.id && hasLoadedChatRef.current !== project.id) {
      hasLoadedChatRef.current = project.id;
      loadChatMessages(project.id);
    }
  }, [project?.id, loadChatMessages]);

  // Handle drag to resize input area
  const handleResizeDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingResize(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = inputAreaHeight;
  }, [inputAreaHeight]);

  useEffect(() => {
    if (!isDraggingResize) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const minHeight = 120; // Minimum input area height
      const maxHeight = containerRect.height - 100; // Leave space for header

      // Calculate new height (dragging up increases height)
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, dragStartHeight.current + deltaY));

      setInputAreaHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDraggingResize(false);
      // Save to localStorage
      localStorage.setItem('nova-chat-input-height', inputAreaHeight.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingResize, inputAreaHeight]);

  const toggleCodeExpanded = (messageId: string) => {
    setExpandedCodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // Auto-scroll to bottom when new messages arrive or AI is loading
  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        // ScrollArea from Radix UI has a viewport element inside
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        const scrollElement = viewport || scrollRef.current;
        
        if (scrollElement) {
          // Scroll to bottom instantly (not smooth) for real-time updates
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    });
  }, []);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // Also scroll when AI is loading (for streaming responses)
  useEffect(() => {
    if (isChatLoading) {
      // Scroll periodically while loading to keep up with streaming
      const interval = setInterval(() => {
        scrollToBottom();
      }, 100); // Check every 100ms during loading
      
      return () => clearInterval(interval);
    }
  }, [isChatLoading, scrollToBottom]);

  // Initialize speech recognition
  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        // Show interim results immediately for real-time feedback
        if (currentInterim) {
          setInterimTranscript(currentInterim);
          // Update input with base + interim for live preview
          setInput(baseInputRef.current + currentInterim);
        }

        // When we get final transcript, update the base input
        if (finalTranscript) {
          baseInputRef.current = baseInputRef.current + finalTranscript;
          setInput(baseInputRef.current);
          setInterimTranscript('');
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        // Don't restart on actual errors (like "not-allowed" or "aborted")
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          // These are recoverable - will auto-restart via onend
          return;
        }
        shouldRestartRecognition.current = false;
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        // Auto-restart if user hasn't manually stopped
        if (shouldRestartRecognition.current) {
          try {
            recognition.start();
            return; // Don't update state, we're continuing
          } catch (err) {
            console.error('Failed to restart speech recognition:', err);
          }
        }

        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      shouldRestartRecognition.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      // User is manually stopping - don't auto-restart
      shouldRestartRecognition.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    } else {
      // Save current input as base before starting
      baseInputRef.current = input;
      setInterimTranscript('');

      // Focus the textarea so user can see text appearing
      textareaRef.current?.focus();

      // Enable auto-restart on silence
      shouldRestartRecognition.current = true;

      // Start recognition
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        shouldRestartRecognition.current = false;
      }
    }
  }, [isListening, input]);

  // Apply AI changes to the canvas
  const applyAIChanges = useCallback(async (changes: AIChanges, messageId: string) => {
    try {
      // Check for truncation warning and log it
      if (changes._truncationWarning) {
        console.warn('⚠️ AI Response Truncation:', changes._truncationWarning);
        // TODO: Could show a toast here if desired
      }

      // Expand dynamic_elements template if present (for standings, leaderboards, etc.)
      let expandedChanges = expandDynamicElements(changes);

      // Normalize: AI sends 'action' but code expects 'type'
      // Map 'action' to 'type' for consistency
      if (!expandedChanges.type && expandedChanges.action) {
        expandedChanges = { ...expandedChanges, type: expandedChanges.action };
      }

      // Resolve {{GENERATE:query}} placeholders in element content BEFORE applying
      if (expandedChanges.elements?.length) {
        const authState = useAuthStore.getState();
        const organizationId = authState.user?.organizationId;
        const userId = authState.user?.id;

        if (organizationId && userId) {
          // Find all GENERATE placeholders in element content
          const contentStrings: string[] = [];
          for (const el of expandedChanges.elements) {
            const contentStr = JSON.stringify(el.content || {});
            console.log(`🔍 Checking element "${el.name}" for GENERATE placeholders:`, contentStr.substring(0, 150));
            if (hasGeneratePlaceholders(contentStr)) {
              console.log(`✅ Element "${el.name}" HAS GENERATE placeholder`);
              contentStrings.push(contentStr);
            }
          }

          if (contentStrings.length > 0) {
            console.log(`🖼️ [ChatPanel] Found ${contentStrings.length} element(s) with GENERATE placeholders - will show progress`);

            // Store pending changes in case user wants to skip image generation
            pendingAIChangesRef.current = { changes: JSON.parse(JSON.stringify(expandedChanges)), messageId };
            skipImagesRef.current = false; // Reset skip flag
            setIsSkippingImages(false); // Reset UI state

            // Create AbortController for image generation
            imageGenAbortRef.current = new AbortController();
            const imageSignal = imageGenAbortRef.current.signal;

            // Resolve placeholders in all element content
            let imageIndex = 0;
            for (let i = 0; i < expandedChanges.elements.length; i++) {
              const el = expandedChanges.elements[i];
              const contentStr = JSON.stringify(el.content || {});
              if (hasGeneratePlaceholders(contentStr)) {
                // Check if user requested to skip images (via ref or abort signal)
                if (skipImagesRef.current || imageSignal.aborted) {
                  console.log(`⏭️ Skipping image generation for: ${el.name} - using placeholder`);
                  const placeholderContent = replaceGenerateWithPlaceholder(contentStr);
                  try {
                    const parsedContent = JSON.parse(placeholderContent);
                    if (parsedContent.type === 'shape' && parsedContent.texture?.url) {
                      parsedContent.texture.enabled = true;
                    }
                    expandedChanges.elements[i].content = parsedContent;
                  } catch (parseError) {
                    console.error(`❌ Failed to parse placeholder content for ${el.name}:`, parseError);
                  }
                  continue;
                }

                imageIndex++;
                // Show which element's image is being generated
                const elementLabel = el.name?.toLowerCase().includes('background')
                  ? 'background image'
                  : `image for "${el.name}"`;
                console.log(`🖼️ Setting progress: Generating ${elementLabel}... (${imageIndex}/${contentStrings.length})`);
                setCreationProgress({
                  phase: 'images',
                  message: `Generating ${elementLabel}...`,
                  currentElement: contentStrings.length > 1 ? `(${imageIndex}/${contentStrings.length})` : undefined
                });
                // Small delay to allow React to render the progress update
                await new Promise(resolve => setTimeout(resolve, 50));
                console.log(`🖼️ Resolving images for element: ${el.name}`);
                console.log(`🖼️ Content string to resolve:`, contentStr);

                // Pass abort signal to image generation
                const resolvedContent = await resolveGeneratePlaceholders(contentStr, organizationId, userId, imageSignal);
                console.log(`🖼️ Resolved content:`, resolvedContent.substring(0, 200));
                try {
                  const parsedContent = JSON.parse(resolvedContent);

                  // Ensure texture.enabled is true for shapes with texture URL
                  // This allows users to modify the texture in the properties panel
                  if (parsedContent.type === 'shape' && parsedContent.texture?.url) {
                    parsedContent.texture.enabled = true;
                    console.log(`✅ Enabled texture for shape: ${el.name}`);
                  }

                  expandedChanges.elements[i].content = parsedContent;
                  console.log(`✅ Resolved images for: ${el.name}`);
                } catch (parseError) {
                  console.error(`❌ Failed to parse resolved content for ${el.name}:`, parseError);
                }
              }
            }

            // Clear pending changes ref and abort controller after image processing is complete
            pendingAIChangesRef.current = null;
            imageGenAbortRef.current = null;
          }
        } else {
          console.warn('⚠️ Cannot generate images: no organization or user ID available');
        }
      }

      console.log('🎨 Applying AI changes:', { type: expandedChanges.type, layerType: expandedChanges.layerType, elementCount: expandedChanges.elements?.length || 0 });
      const store = useDesignerStore.getState();

      // Determine the target template based on AI's layer_type detection
      let templateId = store.currentTemplateId;
      let targetLayer = store.layers.find(l => l.id === store.templates.find(t => t.id === templateId)?.layer_id);

      // Check if current template is empty (no elements) - important for "replace" fallback
      const currentTemplateElements = templateId
        ? store.elements.filter(e => e.template_id === templateId)
        : [];
      const isCurrentTemplateEmpty = currentTemplateElements.length === 0;

      // For "replace" action with empty template, treat it like "create"
      // This handles the case where AI generates a "replace" payload but there's nothing to replace
      const shouldCreateNewTemplate = expandedChanges.type === 'create' ||
        (expandedChanges.type === 'replace' && isCurrentTemplateEmpty);

      // For CREATE actions (or REPLACE with empty template), create a NEW template in the appropriate layer
      if (shouldCreateNewTemplate) {
        console.log(`📋 Action: ${expandedChanges.type}, Template empty: ${isCurrentTemplateEmpty}, Creating new template`);
        // If AI specified a layer type, use that layer
        if (expandedChanges.layerType) {
          targetLayer = store.layers.find(l => l.layer_type === expandedChanges.layerType);
          console.log(`🔍 Looking for layer type "${expandedChanges.layerType}":`, targetLayer ? `Found: ${targetLayer.name}` : 'Not found');
        }
        
        // If no layer specified, try to infer from context or use current layer
        if (!targetLayer && templateId) {
          const currentTemplate = store.templates.find(t => t.id === templateId);
          if (currentTemplate) {
            targetLayer = store.layers.find(l => l.id === currentTemplate.layer_id);
            console.log(`📌 Using current template's layer: ${targetLayer?.name}`);
          }
        }
        
        // Fallback: use fullscreen layer if available
        if (!targetLayer) {
          targetLayer = store.layers.find(l => l.layer_type === 'fullscreen');
          console.log(`📌 Fallback to fullscreen layer: ${targetLayer ? targetLayer.name : 'Not found'}`);
        }
        
        // Fallback: use first available layer
        if (!targetLayer && store.layers.length > 0) {
          targetLayer = store.layers[0];
          console.log(`📌 Fallback to first layer: ${targetLayer.name}`);
        }
        
        if (targetLayer) {
          // Always create a NEW template for AI-created graphics
          const layerName = targetLayer.layer_type.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
          const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          templateId = store.addTemplate(targetLayer.id, `${layerName} Graphic ${timestamp}`);
          console.log(`✅ Created new template: ${templateId} in layer: ${targetLayer.name}`);

          // Expand the layer node in the outline panel so the new template is visible
          const currentExpanded = store.expandedNodes;
          if (!currentExpanded.has(targetLayer.id)) {
            store.toggleNode(targetLayer.id);
            console.log(`✅ Expanded layer node: ${targetLayer.id}`);
          }

          // Expand the template node so its elements are visible
          if (!currentExpanded.has(templateId)) {
            store.toggleNode(templateId);
            console.log(`✅ Expanded template node: ${templateId}`);
          }

          // Select the new template - use fresh state
          const freshStore = useDesignerStore.getState();
          freshStore.selectTemplate(templateId);
          console.log(`✅ Selected template: ${templateId}`);

          // Verify template was created and selected
          const verifyTemplateStore = useDesignerStore.getState();
          const createdTemplate = verifyTemplateStore.templates.find(t => t.id === templateId);
          if (!createdTemplate) {
            console.error('❌ Template was not created! ID:', templateId);
            useDesignerStore.getState().addChatMessage({
              role: 'assistant',
              content: '❌ Error: Failed to create template. Please try again.',
              error: true,
            });
            return;
          }
          console.log(`✅ Verified template exists:`, { id: createdTemplate.id, name: createdTemplate.name, enabled: createdTemplate.enabled });

          // Ensure template is enabled
          if (!createdTemplate.enabled) {
            verifyTemplateStore.setTemplates(verifyTemplateStore.templates.map(t =>
              t.id === templateId ? { ...t, enabled: true } : t
            ));
            console.log(`✅ Enabled template: ${templateId}`);
          }

          // If in data mode, set the data source on the newly created template
          if (isDataMode && selectedDataSource) {
            const dataStore = useDesignerStore.getState();
            await dataStore.setDataSource(
              selectedDataSource.id,
              selectedDataSource.name,
              selectedDataSource.data,
              selectedDataSource.displayField
            );
            console.log(`📊 Set data source "${selectedDataSource.name}" on new template`);
          }
        } else {
          console.error('❌ No layer available to create template in');
          useDesignerStore.getState().addChatMessage({
            role: 'assistant',
            content: '❌ Error: No layers available in the project. Please create a layer first.',
            error: true,
          });
          return;
        }
      } else {
        // For UPDATE/DELETE actions, ALWAYS prioritize the currently selected template
        // The layerType from AI is just a hint - user's current selection takes precedence
        if (templateId) {
          // User has a template selected - use it regardless of AI's layerType guess
          console.log(`[AI] Using currently selected template: ${templateId} for ${expandedChanges.action} action`);
        } else if (expandedChanges.layerType) {
          // No template selected, try to find one in the suggested layer
          targetLayer = store.layers.find(l => l.layer_type === expandedChanges.layerType);
          if (targetLayer) {
            const existingTemplate = store.templates.find(t => t.layer_id === targetLayer!.id);
            if (existingTemplate) {
              templateId = existingTemplate.id;
              store.selectTemplate(templateId);
            } else {
              // Template doesn't exist in this layer - give user a hint
              const layerName = expandedChanges.layerType.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
              useDesignerStore.getState().addChatMessage({
                role: 'assistant',
                content: `⚠️ No template found in the ${layerName} layer. Please select a template in that layer first, or I can create a new one.`,
                error: false,
              });
              return;
            }
          }
        } else {
          // Check if user is trying to edit elements that aren't in the current template
          const currentTemplate = store.templates.find(t => t.id === templateId);
          if (currentTemplate && expandedChanges.elements) {
            // If AI detected elements in a different layer, warn user
            const elementNames = expandedChanges.elements.map((e: any) => e.name || e.id).filter(Boolean);
            if (elementNames.length > 0) {
              const foundElements = store.elements.filter(e => 
                elementNames.some((name: string) => 
                  e.name.toLowerCase().includes(name.toLowerCase()) || e.id === name
                )
              );
              const elementsInOtherLayers = foundElements.filter(e => {
                const elementTemplate = store.templates.find(t => t.id === e.template_id);
                return elementTemplate && elementTemplate.layer_id !== currentTemplate.layer_id;
              });
              
              if (elementsInOtherLayers.length > 0) {
                const otherLayer = store.layers.find(l => 
                  store.templates.some(t => t.id === elementsInOtherLayers[0].template_id && t.layer_id === l.id)
                );
                if (otherLayer) {
                  const layerName = otherLayer.name;
                  useDesignerStore.getState().addChatMessage({
                    role: 'assistant',
                    content: `💡 Tip: The elements you're trying to edit are in the "${layerName}" layer. Please select a template in that layer from the outline panel, or I can help you find it.`,
                    error: false,
                  });
                  return;
                }
              }
            }
          }
        }
        
        // Fallback: if still no template, try to use current or first available
        if (!templateId && store.templates.length > 0) {
          templateId = store.templates[0].id;
          store.selectTemplate(templateId);
        }
      }
      
      if (!templateId) {
        console.warn('No template available to add elements to');
        return;
      }

      // Map element names to IDs for animation linking
      const elementNameToId: Record<string, string> = {};
      // Track newly created element IDs for auto-grouping
      const newlyCreatedElementIds: string[] = [];
      // Track failed elements for user feedback
      const failedElements: string[] = [];
      // Track validation hints
      const validationHints: Array<{ type: string; field: string; message: string; suggestion?: string }> =
        (expandedChanges as any).validationHints || [];

      if ((expandedChanges.type === 'create' || expandedChanges.type === 'update' || expandedChanges.type === 'replace') && expandedChanges.elements) {
        expandedChanges.elements.forEach((el: any, index: number) => {
          try {
            // Skip null/undefined elements
            if (!el || typeof el !== 'object') {
              console.warn(`Skipping invalid element at index ${index}`);
              failedElements.push(`Element ${index + 1}: Invalid data`);
              return;
            }
          // Variable to track if we found an element to update
          let existingElement: typeof store.elements[0] | undefined = undefined;

          // Check if this is an UPDATE or REPLACE to an existing element
          // Skip looking for existing elements if we're creating a new template (shouldCreateNewTemplate is true)
          // This handles the case where "replace" is used with an empty template - just create all elements
          if ((expandedChanges.type === 'update' || expandedChanges.type === 'replace') && !shouldCreateNewTemplate) {
            console.log('🔍 Looking for element to update/replace:', { id: el.id, name: el.name });
            console.log('📋 Available elements:', store.elements.map(e => ({ id: e.id, name: e.name })));

            // Try to find the existing element by ID first (supports both full UUID and 8-char prefix)
            existingElement = el.id
              ? store.elements.find(e =>
                  e.id === el.id || // Exact match
                  e.id.startsWith(el.id) || // Provided ID is prefix of full ID
                  el.id.startsWith(e.id.slice(0, 8)) // Provided ID matches 8-char prefix
                )
              : undefined;
            
            // Fallback 1: Try matching by exact name (case insensitive)
            if (!existingElement && el.name) {
              existingElement = store.elements.find(e => 
                e.name.toLowerCase() === el.name.toLowerCase()
              );
            }
            
            // Fallback 2: Look for partial name matches (e.g., "Background" matches "Glass Lower Third Background")
            if (!existingElement && el.name) {
              const searchTerms = el.name.toLowerCase().split(/\s+/);
              existingElement = store.elements.find(e => {
                const eName = e.name.toLowerCase();
                // Check if any search term is contained in element name
                return searchTerms.some((term: string) => eName.includes(term) && term.length > 3);
              });
            }
            
            // Fallback 3: If user said "background", look for any element with "background" in name
            if (!existingElement) {
              const searchName = (el.name || '').toLowerCase();
              if (searchName.includes('background')) {
                existingElement = store.elements.find(e => 
                  e.name.toLowerCase().includes('background') ||
                  e.element_type === 'shape'
                );
              }
            }
            
            if (existingElement) {
              // REPLACE action: Delete the old element first, then create the new one
              if (expandedChanges.type === 'replace') {
                console.log('🔄 REPLACE: Deleting old element:', existingElement.name, existingElement.id);
                // Store info about the element being replaced for positioning
                const replacedPosition = {
                  position_x: el.position_x ?? existingElement.position_x,
                  position_y: el.position_y ?? existingElement.position_y,
                  width: el.width ?? existingElement.width,
                  height: el.height ?? existingElement.height,
                  z_index: existingElement.z_index,
                };
                // Delete the old element
                store.deleteElements([existingElement.id]);
                // Mark that we need to create the new element with replaced position
                (el as any)._replacedPosition = replacedPosition;
                existingElement = undefined; // Force creation of new element
              } else {
                // UPDATE action: Update only the properties that were specified
                const updates: Partial<typeof existingElement> = {};

                if (el.name !== undefined && el.name !== 'Untitled') updates.name = el.name;
                if (el.position_x !== undefined) updates.position_x = el.position_x;
                if (el.position_y !== undefined) updates.position_y = el.position_y;
                if (el.width !== undefined) updates.width = el.width;
                if (el.height !== undefined) updates.height = el.height;
                if (el.rotation !== undefined) updates.rotation = el.rotation;
                if (el.opacity !== undefined) updates.opacity = el.opacity;
                if (el.styles !== undefined) {
                  // Merge styles instead of replacing - ensure both are objects
                  const existingStyles = existingElement.styles && typeof existingElement.styles === 'object'
                    ? existingElement.styles
                    : {};
                  const newStyles = el.styles && typeof el.styles === 'object' ? el.styles : {};
                  updates.styles = { ...existingStyles, ...newStyles };
                }
                if (el.content !== undefined) {
                  // Merge content instead of replacing - ensure both are objects
                  const existingContent = existingElement.content && typeof existingElement.content === 'object'
                    ? existingElement.content
                    : {};
                  const newContent = el.content && typeof el.content === 'object' ? el.content : {};
                  updates.content = { ...existingContent, ...newContent };
                }

                store.updateElement(existingElement.id, updates);
                elementNameToId[existingElement.name] = existingElement.id;
                console.log('✅ Updated existing element:', existingElement.name, 'with:', updates);
                return; // Skip creation
              }
            } else {
              console.log('⚠️ Could not find element to update/replace, will create new:', el.id || el.name);
            }
          }

          // CREATE a new element (if not updating, or if update/replace didn't find element, or after replace deleted old)
          if (expandedChanges.type === 'create' || expandedChanges.type === 'replace' || (expandedChanges.type === 'update' && !existingElement)) {
            // Process content based on element type
            let content: any = el.content;

            // Handle text elements - ensure proper content structure
            if (el.element_type === 'text') {
              const textContent = content?.text || content?.content || el.name || 'Text';
              content = {
                type: 'text',
                text: textContent,
              };
            }
            // Handle image elements
            else if (el.element_type === 'image') {
              content = {
                type: 'image',
                src: content?.src || content?.url || '',
              };
            }
            // Handle shape elements - sync fill and backgroundColor
            else if (el.element_type === 'shape' || content?.type === 'shape') {
              // Ensure content has proper structure
              if (!content || !content.type) {
                content = { type: 'shape', shape: 'rectangle' };
              }

              // Only set default fill if there's no gradient - gradients take precedence
              if (!content.gradient?.enabled) {
                // Determine the correct fill color:
                // 1. Use content.fill if it's a valid color (not transparent)
                // 2. Fall back to styles.backgroundColor if valid
                // 3. Default to blue
                let fillColor = '#3B82F6'; // Default
                if (content.fill && content.fill !== 'transparent') {
                  fillColor = content.fill;
                } else if (el.styles?.backgroundColor && el.styles.backgroundColor !== 'transparent') {
                  fillColor = el.styles.backgroundColor;
                }
                content.fill = fillColor;
              }

              // Sync styles.backgroundColor with content.fill to avoid conflicts
              // Remove transparent backgroundColor for shapes since they use content.fill
              if (el.styles) {
                if (el.styles.backgroundColor === 'transparent' || !el.styles.backgroundColor) {
                  delete el.styles.backgroundColor;
                }
              }

            }
            // Default content for other elements
            else if (!content || !content.type) {
              const bgColor = typeof el.styles?.backgroundColor === 'string' && el.styles.backgroundColor !== 'transparent'
                ? el.styles.backgroundColor
                : '#3B82F6';
              content = {
                type: 'shape',
                shape: 'rectangle',
                fill: bgColor,
              };
            }

            // Use replaced position if available (from replace action)
            const replacedPos = (el as any)._replacedPosition;
            const finalPosition = {
              position_x: el.position_x ?? replacedPos?.position_x ?? 100,
              position_y: el.position_y ?? replacedPos?.position_y ?? 100,
              width: el.width ?? replacedPos?.width ?? 200,
              height: el.height ?? replacedPos?.height ?? 100,
              z_index: replacedPos?.z_index ?? el._zIndex ?? index,
            };

            console.log(`➕ Adding element: ${el.name} (${el.element_type}) to template ${templateId}`, {
              position: { x: finalPosition.position_x, y: finalPosition.position_y },
              size: { w: finalPosition.width, h: finalPosition.height },
              content: content,
              isReplacement: !!replacedPos,
            });

            // Get fresh store reference for element creation
            const elementStore = useDesignerStore.getState();
            const elementId = elementStore.addElementFromData({
              template_id: templateId,
              name: el.name || 'AI Element',
              element_type: el.element_type || 'shape',
              position_x: finalPosition.position_x,
              position_y: finalPosition.position_y,
              width: finalPosition.width,
              height: finalPosition.height,
              rotation: el.rotation ?? 0,
              opacity: el.opacity ?? 1,
              scale_x: el.scale_x ?? 1,
              scale_y: el.scale_y ?? 1,
              z_index: finalPosition.z_index,
              styles: el.styles || {},
              content: content,
              visible: true, // Ensure elements are visible
            });

            // Verify element was actually added
            const verifyElementStore = useDesignerStore.getState();
            const addedElement = verifyElementStore.elements.find(e => e.id === elementId);
            if (addedElement) {
              console.log(`✅ Element verified in store: ${addedElement.name} (template: ${addedElement.template_id})`);
            } else {
              console.error(`❌ Element NOT found in store after adding! ID: ${elementId}`);
              failedElements.push(`${el.name || `Element ${index + 1}`}: Element not saved to store`);
            }

            // Track newly created elements for auto-grouping (only for 'create' action)
            if (expandedChanges.type === 'create' && addedElement) {
              newlyCreatedElementIds.push(elementId);
            }

            if (el.name && addedElement) {
              elementNameToId[el.name] = elementId;
            }

            // Create binding if element has binding configuration (data-driven design)
            // Note: el.binding is set by AI in data-driven mode, though it's not part of the Element type
            if (el.binding && addedElement) {
              const bindingStore = useDesignerStore.getState();
              const bindingField = el.binding.field;
              const bindingType = el.binding.type || 'text';
              const formatterOptions = el.binding.formatter_options || null;

              // Determine target property based on element type
              let targetProperty = 'content.text';
              if (addedElement.element_type === 'image') {
                targetProperty = 'content.src';
              }

              // Create the binding (pass templateId explicitly to ensure correct association)
              bindingStore.addBinding(
                elementId,
                bindingField, // binding_key (e.g., "State", "Votes1")
                targetProperty,
                bindingType as 'text' | 'number' | 'boolean' | 'image' | 'color',
                templateId // Explicitly pass templateId to avoid timing issues
              );

              // Update formatter options if provided
              if (formatterOptions) {
                const binding = bindingStore.bindings.find(b => b.element_id === elementId);
                if (binding) {
                  bindingStore.updateBinding(binding.id, { formatter_options: formatterOptions });
                }
              }

              console.log(`🔗 Created binding: ${el.name} → ${bindingField} (${bindingType})`);
            }
          }
          } catch (elementError) {
            // Catch per-element errors to allow other elements to be created
            console.error(`Error creating element ${el?.name || index}:`, elementError);
            failedElements.push(`${el?.name || `Element ${index + 1}`}: ${elementError instanceof Error ? elementError.message : 'Unknown error'}`);
          }
        });
      }

      // Show validation hints and failed elements to user
      if (validationHints.length > 0 || failedElements.length > 0) {
        let feedbackMessage = '';

        if (failedElements.length > 0) {
          feedbackMessage += `⚠️ **${failedElements.length} element(s) failed to create:**\n`;
          failedElements.forEach(f => feedbackMessage += `• ${f}\n`);
        }

        const warnings = validationHints.filter(h => h.type === 'warning' || h.type === 'error');
        if (warnings.length > 0 && warnings.length <= 5) {
          feedbackMessage += `\n📋 **Hints for better results:**\n`;
          warnings.slice(0, 5).forEach(h => {
            feedbackMessage += `• ${h.message}`;
            if (h.suggestion) feedbackMessage += ` — ${h.suggestion}`;
            feedbackMessage += '\n';
          });
        }

        if (feedbackMessage) {
          useDesignerStore.getState().addChatMessage({
            role: 'assistant',
            content: feedbackMessage.trim(),
            error: failedElements.length > 0,
          });
        }
      }

      // Automatically group newly created elements if there are 2 or more
      if (expandedChanges.type === 'create' && newlyCreatedElementIds.length >= 2) {
        // Use a small delay to ensure all elements are fully added to the store
        // and React has processed the state updates
        setTimeout(() => {
          const currentStore = useDesignerStore.getState();
          // Verify all elements exist and are in the same template before grouping
          const validIds = newlyCreatedElementIds.filter(id => {
            const element = currentStore.elements.find(e => e.id === id);
            return element && element.template_id === templateId && !element.parent_element_id;
          });
          if (validIds.length >= 2) {
            currentStore.groupElements(validIds);
          }
        }, 10);
      }

      // Now create animations if provided
      console.log('🎬 Processing animations:', expandedChanges.animations);
      if (expandedChanges.animations && Array.isArray(expandedChanges.animations) && expandedChanges.animations.length > 0) {
        console.log(`✅ Found ${expandedChanges.animations.length} animation(s) to process`);
        const currentStore = useDesignerStore.getState();
        const newAnimations = [...currentStore.animations];
        const newKeyframes = [...currentStore.keyframes];

        expandedChanges.animations.forEach((animData: any) => {
          // Skip invalid animation data
          if (!animData || typeof animData !== 'object') {
            console.warn('Invalid animation data, skipping');
            return;
          }

          // Find the element by name (exact match first, then partial/case-insensitive)
          let elementId = elementNameToId[animData.element_name] ||
            currentStore.elements.find(e => e.name === animData.element_name)?.id;

          // If not found, try partial/case-insensitive match
          if (!elementId) {
            const partialMatch = currentStore.elements.find(e => 
              e.name.toLowerCase() === animData.element_name.toLowerCase() ||
              e.name.includes(animData.element_name) ||
              animData.element_name.includes(e.name)
            );
            if (partialMatch) {
              elementId = partialMatch.id;
              console.log(`✅ Found partial match: "${partialMatch.name}" for animation target "${animData.element_name}"`);
            }
          }

          if (!elementId) {
            console.warn(`⚠️ Element not found for animation: "${animData.element_name}"`);
            console.warn('Available element names:', Object.keys(elementNameToId));
            console.warn('All elements in store:', currentStore.elements.map(e => e.name));
            return;
          }

          // Validate and sanitize animation properties
          const validPhases = ['in', 'loop', 'out'];
          const phase = validPhases.includes(animData.phase) ? animData.phase : 'in';
          const delay = typeof animData.delay === 'number' && !isNaN(animData.delay) && animData.delay >= 0
            ? animData.delay : 0;
          const duration = typeof animData.duration === 'number' && !isNaN(animData.duration) && animData.duration > 0
            ? animData.duration : 500;
          const easing = typeof animData.easing === 'string' && animData.easing.length > 0
            ? animData.easing : 'ease-out';

          const animId = crypto.randomUUID();
          const animation = {
            id: animId,
            template_id: templateId,
            element_id: elementId,
            phase: phase as 'in' | 'loop' | 'out',
            delay,
            duration,
            iterations: 1,
            direction: 'normal' as const,
            easing,
            preset_id: null,
            created_at: new Date().toISOString(),
          };
          newAnimations.push(animation);

          // Helper to generate keyframe name based on element name
          const elementNameForKf = animData.element_name || 'element';
          const cleanElementName = elementNameForKf
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 20);

          // Create keyframes from animation data
          if (animData.keyframes && Array.isArray(animData.keyframes) && animData.keyframes.length > 0) {
            animData.keyframes.forEach((kfData: any, kfIndex: number) => {
              // Skip invalid keyframe data
              if (!kfData || typeof kfData !== 'object') {
                console.warn('Invalid keyframe data, skipping');
                return;
              }

              // Extract properties from the nested 'properties' object if it exists,
              // otherwise treat the whole kfData as properties (minus position)
              let kfProperties: Record<string, any>;
              if (kfData.properties && typeof kfData.properties === 'object') {
                // AI sent nested properties structure
                kfProperties = { ...kfData.properties };
              } else {
                // AI sent flat structure (legacy support)
                kfProperties = {};
                if (kfData.opacity !== undefined && typeof kfData.opacity === 'number' && !isNaN(kfData.opacity)) {
                  kfProperties.opacity = Math.max(0, Math.min(1, kfData.opacity));
                }
                if (kfData.transform && typeof kfData.transform === 'string') {
                  kfProperties.transform = kfData.transform;
                }
                if (kfData.backgroundColor && typeof kfData.backgroundColor === 'string') {
                  kfProperties.backgroundColor = kfData.backgroundColor;
                }
                if (kfData.color && typeof kfData.color === 'string') {
                  kfProperties.color = kfData.color;
                }
              }

              // Validate position (0-100 from AI) and convert to absolute milliseconds
              let positionPercent = typeof kfData.position === 'number' ? kfData.position : 0;
              if (isNaN(positionPercent) || positionPercent < 0) positionPercent = 0;
              if (positionPercent > 100) positionPercent = 100;

              // Convert percentage to absolute milliseconds based on animation duration
              const positionMs = Math.round((positionPercent / 100) * duration);

              const keyframe = {
                id: crypto.randomUUID(),
                animation_id: animId,
                name: `${cleanElementName}_${phase}_key_${kfIndex + 1}`,
                position: positionMs,
                properties: kfProperties,
              };
              newKeyframes.push(keyframe);
            });
          } else {
            // Create default keyframes (fade in) - positions are in absolute milliseconds
            newKeyframes.push({
              id: crypto.randomUUID(),
              animation_id: animId,
              name: `${cleanElementName}_${phase}_key_1`,
              position: 0,  // Start of animation (0ms)
              properties: { opacity: 0 },
            });
            newKeyframes.push({
              id: crypto.randomUUID(),
              animation_id: animId,
              name: `${cleanElementName}_${phase}_key_2`,
              position: duration,  // End of animation (duration in ms)
              properties: { opacity: 1 },
            });
          }
        });

        // Check if any elements are missing "out" animations and auto-generate them
        const elementAnimationPhases = new Map<string, Set<string>>();
        newAnimations.forEach(anim => {
          const phases = elementAnimationPhases.get(anim.element_id) || new Set();
          phases.add(anim.phase);
          elementAnimationPhases.set(anim.element_id, phases);
        });

        // For each element with only "in" animation, create a matching "out" animation
        newlyCreatedElementIds.forEach(elementId => {
          const phases = elementAnimationPhases.get(elementId);
          if (phases && phases.has('in') && !phases.has('out')) {
            console.log(`⚠️ Element ${elementId} has "in" but no "out" animation. Auto-generating "out" animation.`);

            // Find the "in" animation and its keyframes to create a reverse
            const inAnim = newAnimations.find(a => a.element_id === elementId && a.phase === 'in');
            const inKeyframes = newKeyframes.filter(k => k.animation_id === inAnim?.id);

            if (inAnim && inKeyframes.length > 0) {
              const outAnimId = crypto.randomUUID();

              // Create out animation with faster duration
              newAnimations.push({
                id: outAnimId,
                template_id: templateId,
                element_id: elementId,
                phase: 'out',
                delay: 0,
                duration: Math.min(inAnim.duration, 400), // Slightly faster exit
                iterations: 1,
                direction: 'normal' as const,
                easing: 'ease-in',
                preset_id: null,
                created_at: new Date().toISOString(),
              });

              // Reverse the keyframes - out animation duration is different from in
              const outDuration = Math.min(inAnim.duration, 400); // Matches the duration above
              const reversedKeyframes = [...inKeyframes].sort((a, b) => b.position - a.position);
              // Get element name for keyframe naming
              const outElement = currentStore.elements.find(e => e.id === elementId);
              const outElementName = (outElement?.name || 'element')
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 20);
              reversedKeyframes.forEach((kf, index) => {
                newKeyframes.push({
                  id: crypto.randomUUID(),
                  animation_id: outAnimId,
                  name: `${outElementName}_out_key_${index + 1}`,
                  // Position in absolute milliseconds: start=0, end=outDuration
                  position: index === 0 ? 0 : outDuration,
                  properties: { ...kf.properties },
                });
              });
            }
          }
        });

        // Fix incomplete animations (truncation issue) - animations with only 1 keyframe at position 0
        // These leave elements in their "start" state (often off-screen or invisible)
        newAnimations.forEach(anim => {
          const animKfs = newKeyframes.filter(kf => kf.animation_id === anim.id);

          // If animation has only 1 keyframe at position 0, add a keyframe at the end (duration ms)
          if (animKfs.length === 1 && animKfs[0].position === 0) {
            const startKf = animKfs[0];
            console.log(`⚠️ Fixing incomplete animation ${anim.id} - adding end keyframe`);

            // Find the element to get its base position
            const element = currentStore.elements.find(e => e.id === anim.element_id);

            // Create end keyframe with "visible" state
            const endProperties: Record<string, any> = {};

            // For each property in start keyframe, set to visible/default state
            Object.keys(startKf.properties).forEach(prop => {
              const startVal = startKf.properties[prop];
              if (prop === 'opacity') {
                endProperties.opacity = 1; // Make visible
              } else if (prop === 'position_x') {
                // Use element's actual position_x as end state
                endProperties.position_x = element?.position_x ?? 100;
              } else if (prop === 'position_y') {
                // Use element's actual position_y as end state
                endProperties.position_y = element?.position_y ?? 100;
              } else if (prop === 'scale_x' || prop === 'scale_y') {
                endProperties[prop] = 1; // Full scale
              } else {
                // For other properties, keep the start value (no animation)
                endProperties[prop] = startVal;
              }
            });

            // Generate name for the end keyframe
            const fixElementName = (element?.name || 'element')
              .replace(/[^a-zA-Z0-9]/g, '_')
              .replace(/_+/g, '_')
              .substring(0, 20);

            newKeyframes.push({
              id: crypto.randomUUID(),
              animation_id: anim.id,
              name: `${fixElementName}_${anim.phase}_key_2`,
              position: anim.duration,  // End position in absolute milliseconds
              properties: endProperties,
            });
          }
        });

        currentStore.setAnimations(newAnimations);
        currentStore.setKeyframes(newKeyframes);
        console.log(`✅ Created ${newAnimations.length} animation(s) with ${newKeyframes.length} keyframe(s)`);
      } else if (expandedChanges.type === 'create' && newlyCreatedElementIds.length > 0) {
        // AUTO-GENERATE DEFAULT ANIMATIONS if AI didn't provide them
        console.warn('⚠️ No animations provided in AI response. Auto-generating default animations for all elements.');

        const currentStore = useDesignerStore.getState();
        const newAnimations = [...currentStore.animations];
        const newKeyframes = [...currentStore.keyframes];

        // Generate default in/out animations for each created element
        newlyCreatedElementIds.forEach((elementId, index) => {
          const element = currentStore.elements.find(e => e.id === elementId);
          if (!element) return;

          const baseDelay = index * 100; // Stagger animations

          // IN Animation (slide from left + fade)
          const inAnimId = crypto.randomUUID();
          newAnimations.push({
            id: inAnimId,
            template_id: templateId,
            element_id: elementId,
            phase: 'in',
            delay: baseDelay,
            duration: 500,
            iterations: 1,
            direction: 'normal' as const,
            easing: 'ease-out',
            preset_id: null,
            created_at: new Date().toISOString(),
          });

          // Helper to clean element name for keyframe naming
          const autoGenElementName = (element?.name || 'element')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 20);

          // IN Keyframes - position in absolute milliseconds
          const inDuration = 500; // Matches duration above
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: inAnimId,
            name: `${autoGenElementName}_in_key_1`,
            position: 0,
            properties: { opacity: 0, transform: 'translateX(-50px)' },
          });
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: inAnimId,
            name: `${autoGenElementName}_in_key_2`,
            position: inDuration,  // End of animation (500ms)
            properties: { opacity: 1, transform: 'translateX(0)' },
          });

          // OUT Animation (slide to left + fade)
          const outDuration = 400;
          const outAnimId = crypto.randomUUID();
          newAnimations.push({
            id: outAnimId,
            template_id: templateId,
            element_id: elementId,
            phase: 'out',
            delay: 0,
            duration: outDuration,
            iterations: 1,
            direction: 'normal' as const,
            easing: 'ease-in',
            preset_id: null,
            created_at: new Date().toISOString(),
          });

          // OUT Keyframes - position in absolute milliseconds
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: outAnimId,
            name: `${autoGenElementName}_out_key_1`,
            position: 0,
            properties: { opacity: 1, transform: 'translateX(0)' },
          });
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: outAnimId,
            name: `${autoGenElementName}_out_key_2`,
            position: outDuration,  // End of animation (400ms)
            properties: { opacity: 0, transform: 'translateX(-50px)' },
          });

          console.log(`✅ Auto-generated in/out animations for element: ${element.name}`);
        });

        currentStore.setAnimations(newAnimations);
        currentStore.setKeyframes(newKeyframes);
        console.log(`✅ Auto-created ${newlyCreatedElementIds.length * 2} animations (in + out for each element)`);
      }

      // Log summary before marking as applied
      console.log(`📊 Element creation summary: ${newlyCreatedElementIds.length} created, ${failedElements.length} failed`);

      markChangesApplied(messageId);
      console.log(`✅ Marked changes as applied for message: ${messageId}`);

      // Verify elements were added and show user feedback
      setTimeout(() => {
        const verifyStore = useDesignerStore.getState();
        const templateElements = verifyStore.elements.filter(e => e.template_id === templateId);
        const totalElements = verifyStore.elements.length;
        const currentTemplate = verifyStore.templates.find(t => t.id === templateId);

        console.log(`🔍 Final Verification:`);
        console.log(`   - Template ${templateId}: ${templateElements.length} elements`);
        console.log(`   - Template name: ${currentTemplate?.name || 'NOT FOUND'}`);
        console.log(`   - Template enabled: ${currentTemplate?.enabled}`);
        console.log(`   - Current template ID: ${verifyStore.currentTemplateId}`);
        console.log(`   - Total elements in store: ${totalElements}`);
        console.log(`   - Elements in this template:`, templateElements.map(e => ({ id: e.id, name: e.name, type: e.element_type })));

        if (templateElements.length === 0) {
          console.error('❌ CRITICAL: No elements found in template after creation!');
          console.log('   - All elements:', verifyStore.elements.map(e => ({ id: e.id, name: e.name, template_id: e.template_id })));
          // Show error message to user
          useDesignerStore.getState().addChatMessage({
            role: 'assistant',
            content: '⚠️ Elements were processed but none were added to the canvas. This may be due to a parsing error. Please try again with a simpler request.',
            error: true,
          });
        } else {
          // Elements exist - make sure template is selected and visible
          if (verifyStore.currentTemplateId !== templateId) {
            console.log(`📌 Auto-selecting template ${templateId} (was: ${verifyStore.currentTemplateId})`);
            verifyStore.selectTemplate(templateId);
          }

          // Switch outline panel to Layers tab so user can see the selected template
          window.dispatchEvent(new CustomEvent('outline-switch-tab', { detail: { tab: 'layers' } }));
          console.log(`📑 Switched outline to Layers tab`);

          // If there's a data source attached, switch to Data tab in bottom panel
          if (verifyStore.dataSourceId) {
            window.dispatchEvent(new CustomEvent('outline-switch-bottom-tab', { detail: { tab: 'data' } }));
            console.log(`📊 Switched bottom panel to Data tab`);
          }

          // Show success message with element count
          console.log(`✅ SUCCESS: Created ${templateElements.length} elements in template "${currentTemplate?.name}"`);

          // Play the in-animation to show the user what they created
          // Wait a moment for the UI to update, then play
          setTimeout(() => {
            const playStore = useDesignerStore.getState();
            // Set phase to 'in' and play the preview
            playStore.setPhase('in');
            playStore.playFullPreview();
            console.log(`▶️ Playing in-animation for new template`);
          }, 200);
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error applying AI changes:', error);
      // Show error to user
      useDesignerStore.getState().addChatMessage({
        role: 'assistant',
        content: `❌ Error applying changes: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        error: true,
      });
    }
  }, [markChangesApplied, isDataMode, selectedDataSource]);

  // Build AI context from current state
  const buildContext = (): AIContext => {
    const currentTemplate = templates.find((t) => t.id === currentTemplateId);
    const selectedElements = elements.filter((e) => selectedElementIds.includes(e.id));

    // Get the design system from the store
    const storeDesignSystem = useDesignerStore.getState().designSystem;

    // IMPORTANT: Only include elements belonging to the current template
    // This tells the AI what elements exist so it can UPDATE them instead of creating new ones
    const currentTemplateElements = currentTemplate
      ? elements.filter(e => e.template_id === currentTemplate.id)
      : [];

    // Include available layers for AI to know where to add graphics
    const availableLayers = layers.map(l => ({
      name: l.name,
      type: l.layer_type,
      hasTemplates: templates.some(t => t.layer_id === l.id),
    }));

    // Build data context if in data mode
    let dataContext: AIContext['dataContext'] = undefined;
    if (isDataMode && selectedDataSource) {
      // Extract schema from the first record
      const firstRecord = selectedDataSource.data[0] || {};
      const schema: Record<string, string> = {};

      // Get field info using extractFieldsFromData
      const fields = extractFieldsFromData(selectedDataSource.data);
      fields.forEach(field => {
        schema[field.path] = field.type;
      });

      dataContext = {
        dataSourceId: selectedDataSource.id,
        dataSourceName: selectedDataSource.name,
        schema,
        sampleData: firstRecord,
      };
    }

    return {
      project: project ? {
        name: project.name,
        canvasWidth: project.canvas_width,
        canvasHeight: project.canvas_height,
      } : { name: '', canvasWidth: 1920, canvasHeight: 1080 },
      designSystem: storeDesignSystem, // Use project's design system from store
      currentTemplate: currentTemplate ? {
        id: currentTemplate.id,
        name: currentTemplate.name,
        elements: currentTemplateElements, // Only elements in this template
        animations: [],
        bindings: [],
      } : null,
      selectedElements,
      availableLayers, // Added: let AI know what layers are available
      availablePresets: [],
      availableLibraries: ['anime.js', 'GSAP'],
      dataContext, // Include data context for data-driven design
      isInteractive: project?.interactive_enabled ?? false, // Include interactive mode flag
    };
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    console.log('📁 [ChatPanel] handleFileChange called, type:', type);
    const files = e.target.files;
    if (!files) {
      console.log('  - No files selected');
      return;
    }
    console.log('  - Files selected:', files.length);

    Array.from(files).forEach((file) => {
      console.log('  - Processing file:', file.name, 'size:', file.size, 'type:', file.type);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        console.log('  - File loaded, data URL length:', dataUrl?.length || 0);
        console.log('  - Data URL prefix:', dataUrl?.substring(0, 50));
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: type,
          name: file.name,
          data: dataUrl,
          preview: type === 'image' ? dataUrl : undefined,
        };
        console.log('  - Adding attachment:', attachment.id, attachment.name);
        setAttachments((prev) => {
          console.log('  - Previous attachments count:', prev.length);
          return [...prev, attachment];
        });
      };
      reader.onerror = (err) => {
        console.error('  - FileReader error:', err);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Capture canvas screenshot using html2canvas
  const captureCanvas = useCallback(async (fullCanvas: boolean = true) => {
    setIsCapturing(true);
    try {
      // Find the stage element
      const stageElement = document.querySelector('[data-stage="true"]') as HTMLElement;
      if (!stageElement) {
        console.error('Stage element not found');
        alert('Please select a template first to capture the canvas');
        return;
      }

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Capture the canvas
      const canvas = await html2canvas(stageElement, {
        backgroundColor: '#1a1a2e', // Match canvas background
        scale: 2, // Higher resolution
        useCORS: true, // Allow cross-origin images
        allowTaint: true,
        logging: false,
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        type: 'screenshot',
        name: `canvas-${fullCanvas ? 'full' : 'selection'}-${Date.now()}.png`,
        data: dataUrl,
        preview: dataUrl,
      };
      setAttachments((prev) => [...prev, attachment]);
      
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      // Fallback: add a text reference
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        type: 'screenshot',
        name: 'canvas-reference.txt',
        data: `[Canvas Reference: ${elements.length} elements on canvas]`,
      };
      setAttachments((prev) => [...prev, attachment]);
    } finally {
      setIsCapturing(false);
    }
  }, [elements.length]);

  // Check if AI is available - uses centralized check from ai.ts
  const aiAvailability = useMemo(() => isAIAvailableInCurrentEnv(), []);
  const isAIAvailable = aiAvailability.available;

  const handleSend = async () => {
    console.log('🚀 [ChatPanel] handleSend called');
    console.log('  - input:', input.trim() ? `"${input.trim().substring(0, 50)}..."` : '(empty)');
    console.log('  - attachments:', attachments.length);
    console.log('  - isLoading:', isLoading);

    // Allow sending if there's text OR attachments
    if ((!input.trim() && attachments.length === 0) || isLoading) {
      console.log('  - BLOCKED: no input and no attachments, or already loading');
      return;
    }

    console.log('🔍 [ChatPanel] Passed initial check, continuing...');

    // Stop speech recognition when sending
    if (isListening && recognitionRef.current) {
      shouldRestartRecognition.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    }

    // Check if AI is available
    console.log('🔍 [ChatPanel] Checking AI availability:', isAIAvailable);
    if (!isAIAvailable) {
      console.log('  - AI NOT available, reason:', aiAvailability.reason);
      await addChatMessage({
        role: 'assistant',
        content: `**AI Not Available**

${aiAvailability.reason || 'AI is not configured.'}

**Setup Instructions:**
1. Create a \`.env.local\` file in the project root
2. Add: \`VITE_GEMINI_API_KEY=your-key\` or \`VITE_CLAUDE_API_KEY=your-key\`
3. Get keys from: https://aistudio.google.com/ or https://console.anthropic.com/
4. Restart the development server

Alternatively, configure your API key in Settings (⚙️).`,
        error: true,
      });
      return;
    }
    console.log('  - AI is available, continuing...');

    // Check if this is a retry of a failed request (same message sent within 60 seconds)
    const isRetry = lastFailedRequestRef.current &&
      lastFailedRequestRef.current.input === input.trim() &&
      Date.now() - lastFailedRequestRef.current.timestamp < 60000;

    if (isRetry) {
      console.log('🔄 Detected retry of failed request - will use fresh connection');
      // Clear the failed request ref since we're retrying
      lastFailedRequestRef.current = null;
    }

    // Note: Template selection is NOT required - AI will determine the correct layer
    // and create/select templates as needed

    // Convert attachments to storage format
    const chatAttachments: ChatAttachment[] | undefined = attachments.length > 0
      ? attachments.map((a) => ({
          id: a.id,
          type: a.type,
          name: a.name,
          data: a.data,
          preview: a.preview,
        }))
      : undefined;

    // Store the current request details in case it fails (for retry detection)
    const currentRequestDetails = {
      input: input.trim(),
      attachments: [...attachments],
      timestamp: Date.now(),
    };

    // Only add user message if this is NOT a retry (to avoid duplicate messages)
    console.log('🔍 [ChatPanel] isRetry:', isRetry);
    if (!isRetry) {
      // Add user message to store (persists to DB)
      console.log('🔍 [ChatPanel] Adding user message to store...');
      await addChatMessage({
        role: 'user',
        content: input,
        attachments: chatAttachments,
      });
      console.log('🔍 [ChatPanel] User message added');
    } else {
      // For retries, show a status message
      console.log('🔄 Retrying previous request...');
    }

    const userInput = input;
    const userAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Create a fresh AbortController for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Build conversation history for AI
      const history: AIChatMessage[] = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Build the user message with images
      let fullMessage = userInput;
      const imageAttachments: { data: string; mimeType: string }[] = [];

      // Debug: Log user attachments
      console.log('🔍 [ChatPanel] userAttachments count:', userAttachments.length);
      userAttachments.forEach((a, i) => {
        console.log(`  Attachment ${i + 1}:`, {
          type: a.type,
          name: a.name,
          hasData: !!a.data,
          dataLength: a.data?.length || 0,
          dataPrefix: a.data?.substring(0, 50) || 'N/A',
        });
      });

      if (userAttachments.length > 0) {
        userAttachments.forEach((a) => {
          if ((a.type === 'image' || a.type === 'screenshot') && a.data) {
            // Extract base64 data and mime type
            const matches = a.data.match(/^data:([^;]+);base64,(.+)$/);
            console.log(`  Regex match for ${a.name}:`, !!matches, matches ? `mimeType=${matches[1]}` : 'no match');
            if (matches) {
              imageAttachments.push({
                mimeType: matches[1],
                data: matches[2], // Base64 data without prefix
              });
            }
          }
        });

        // Add text descriptions for context
        const attachmentDescriptions = userAttachments.map((a) => {
          if (a.type === 'screenshot') {
            return `[Screenshot of canvas attached - please analyze it]`;
          } else if (a.type === 'image') {
            return `[Image attached: ${a.name} - please analyze it]`;
          } else {
            return `[File attached: ${a.name}]`;
          }
        }).join('\n');
        fullMessage = `${attachmentDescriptions}\n\n${userInput}`;
      }

      // Debug: Log final image attachments array
      console.log('🔍 [ChatPanel] Final imageAttachments count:', imageAttachments.length);

      history.push({ role: 'user', content: fullMessage });

      // Documentation mode - simple Q&A about Nova/Pulsar GFX
      if (isDocsMode) {
        const responseText = await sendDocsChatMessage(history, DOCS_CONTEXT, abortControllerRef.current?.signal);

        // Add AI response to store (no changes to apply in docs mode)
        await addChatMessage({
          role: 'assistant',
          content: responseText,
        });

        // Clear failed request ref and reset auto-retry count on success
        lastFailedRequestRef.current = null;
        autoRetryCountRef.current = 0;
      } else {
        // Design mode - full AI assistant with canvas manipulation
        const context = buildContext();

        // Create a placeholder message for streaming
        const streamingMessage = await addChatMessage({
          role: 'assistant',
          content: '...',
          isSending: true,
        });

        if (!streamingMessage) {
          throw new Error('Failed to create streaming message');
        }

        setActiveMessageId(streamingMessage.id);

        // Track if we've started getting JSON code block
        let isGeneratingCode = false;
        let preCodeText = ''; // Text before the code block (AI's introduction/questions)
        let hasShownThinking = false;
        let lastElementCount = 0;

        // Show initial thinking state
        setCreationProgress({ phase: 'thinking', message: 'Thinking...' });

        // Debug: Log what we're sending to the AI
        console.log('🔍 [ChatPanel] Preparing to send to AI:');
        console.log('  - History messages:', history.length);
        console.log('  - Image attachments:', imageAttachments.length);
        if (imageAttachments.length > 0) {
          imageAttachments.forEach((img, i) => {
            console.log(`    Image ${i + 1}: mimeType=${img.mimeType}, data length=${img.data?.length || 0}`);
          });
        }
        console.log('  - AbortController active:', !!abortControllerRef.current);

        // Use streaming API for real-time progress
        const response = await sendChatMessageStreaming(
          history,
          context,
          (_chunk, fullText) => {
            // Check if we've hit a JSON code block
            const codeBlockStart = fullText.indexOf('```json');

            if (codeBlockStart !== -1) {
              // We have JSON - extract the text before it and show progress
              if (!isGeneratingCode) {
                isGeneratingCode = true;
                preCodeText = fullText.substring(0, codeBlockStart).trim();
                setCreationProgress({ phase: 'designing', message: 'Designing graphic layout...' });
              }

              // Extract JSON portion to count elements being generated
              const jsonStart = codeBlockStart + 7; // After ```json
              const jsonPortion = fullText.substring(jsonStart);

              // Count element objects in the JSON so far
              const elementMatches = jsonPortion.match(/"element_type"\s*:/g);
              const currentElementCount = elementMatches ? elementMatches.length : 0;

              // Update progress with element count
              if (currentElementCount > lastElementCount) {
                lastElementCount = currentElementCount;
                setCreationProgress({
                  phase: 'generating',
                  message: `Generating elements...`,
                  processedElements: currentElementCount,
                });
              } else if (currentElementCount > 0) {
                // Keep showing generating phase
                setCreationProgress({
                  phase: 'generating',
                  message: `Generating ${currentElementCount} element${currentElementCount !== 1 ? 's' : ''}...`,
                  processedElements: currentElementCount,
                });
              }

              // Show the AI's intro text + progress indicator
              const displayText = preCodeText
                ? `${preCodeText}\n\n⏳ Generating graphic...`
                : '⏳ Generating graphic...';
              useDesignerStore.getState().updateChatMessageContent(streamingMessage.id, displayText);
            } else {
              // No JSON yet - show the full text as-is (could be questions, clarifications, etc.)
              useDesignerStore.getState().updateChatMessageContent(streamingMessage.id, fullText + '▍');

              // If we have text, AI is responding (not just thinking)
              if (fullText.length > 10 && !hasShownThinking) {
                hasShownThinking = true;
                setCreationProgress({ phase: 'idle', message: '' });
              }
            }
          },
          undefined,
          imageAttachments,
          abortControllerRef.current?.signal,
          // Image generation progress callback
          (message, current, total) => {
            console.log(`🖼️ [ImageProgress] ${message} (${current}/${total})`);
            setCreationProgress({
              phase: 'images',
              message,
              currentElement: total > 1 ? `(${current}/${total})` : undefined,
            });
          }
        );

        // Show the response to user immediately
        useDesignerStore.getState().updateChatMessageContent(streamingMessage.id, response.message);
        setCreationProgress({ phase: 'idle', message: '' });
        setActiveMessageId(null);

        // Clear failed request ref and reset auto-retry count on success
        lastFailedRequestRef.current = null;
        autoRetryCountRef.current = 0;

        // Check if there are changes to apply - do this asynchronously
        const shouldAutoApply = response.changes && !isDrasticChange(response.changes);
        console.log('📋 AI response check:', { hasChanges: !!response.changes, shouldAutoApply, elementCount: response.changes?.elements?.length || 0 });

        if (shouldAutoApply && response.changes) {
          const totalElements = response.changes.elements?.length || 0;
          console.log('🚀 Auto-applying changes:', { totalElements, type: response.changes.type, layerType: response.changes.layerType });

          // Apply changes asynchronously so user sees response immediately
          requestAnimationFrame(async () => {
            setCreationProgress({
              phase: 'applying',
              message: `Applying ${totalElements} element${totalElements !== 1 ? 's' : ''}...`,
              totalElements,
              processedElements: totalElements,
            });

            // Apply the changes (async because it may need to generate images)
            console.log('⚡ Calling applyAIChanges...');
            markChangesApplied(streamingMessage.id);
            await applyAIChanges(response.changes!, streamingMessage.id);
            console.log('✅ applyAIChanges completed');

            // Reset data mode after creating graphic (to prevent accidental re-sends)
            if (isDataMode) {
              setIsDataMode(false);
              setSelectedDataSource(null);
              console.log('📊 Data mode deselected after creating graphic');
            }

            // Show completion briefly
            const doneText = totalElements > 0
              ? `✓ Created ${totalElements} element${totalElements !== 1 ? 's' : ''}`
              : '✓ Done!';
            setCreationProgress({ phase: 'done', message: doneText, elementCount: totalElements });

            // Clear progress after a moment
            setTimeout(() => {
              setCreationProgress({ phase: 'idle', message: '' });
            }, 1500);
          });
        }
      }
    } catch (error) {
      // Reset progress state on error
      setCreationProgress({ phase: 'error', message: 'An error occurred' });
      setActiveMessageId(null);

      // Check if this was a user-initiated abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat request was cancelled by user');
        await addChatMessage({
          role: 'assistant',
          content: 'Request cancelled.',
          error: false,
        });
        // Don't store cancelled requests for retry
      } else {
        console.error('Chat error:', error);

        // Add error message to store with more details
        const errorMessage = error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Unknown error occurred';

        // Check if it's a timeout error
        const isTimeout = errorMessage.includes('timed out') || errorMessage.includes('timeout') || errorMessage.includes('TimeoutError');

        // Check if request had images attached
        const hasImages = currentRequestDetails.attachments.some(a => a.type === 'image' || a.type === 'screenshot');

        // Auto-retry for image requests that timed out (once)
        if (isTimeout && hasImages && autoRetryCountRef.current < MAX_AUTO_RETRIES) {
          autoRetryCountRef.current++;
          console.log(`🔄 Auto-retrying image request (attempt ${autoRetryCountRef.current}/${MAX_AUTO_RETRIES})...`);

          // Store for manual retry detection (won't add duplicate user message)
          lastFailedRequestRef.current = currentRequestDetails;

          // Restore the input and attachments for retry
          setInput(currentRequestDetails.input);
          setAttachments(currentRequestDetails.attachments);

          // IMPORTANT: Reset isLoading BEFORE retry so handleSend isn't blocked
          setIsLoading(false);

          // Wait for cleanup then trigger retry with fresh connection
          setTimeout(() => {
            // Show reconnecting message
            setCreationProgress({ phase: 'thinking', message: 'Reconnecting...' });
            handleSend();
          }, 1500);
          return;
        }

        // Store the failed request details for retry detection
        // This allows users to simply send the same message again to retry
        lastFailedRequestRef.current = currentRequestDetails;
        console.log('💾 Stored failed request for potential retry');

        await addChatMessage({
          role: 'assistant',
          content: isTimeout
            ? hasImages
              ? `Request timed out after auto-retry. **Send the same message again to retry** with a fresh connection.`
              : `Request timed out. **Send the same message again to retry** with a fresh connection.`
            : `Sorry, I encountered an error: ${errorMessage}. Please check your API key configuration and try again.`,
          error: true,
        });

        // Reset auto-retry count when showing error (so next attempt gets fresh retries)
        autoRetryCountRef.current = 0;
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      // Reset progress after a delay so user sees the final state
      setTimeout(() => {
        setCreationProgress({ phase: 'idle', message: '' });
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Cancel on Escape while loading
    if (e.key === 'Escape' && isLoading) {
      e.preventDefault();
      handleCancel();
    }
  };

  // Cancel ongoing AI request
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Also abort any ongoing image generation
    if (imageGenAbortRef.current) {
      imageGenAbortRef.current.abort();
      imageGenAbortRef.current = null;
    }
  }, []);

  // Skip remaining image generation and use placeholder images
  const handleSkipImages = useCallback(() => {
    console.log('⏭️ User requested to skip image generation - using placeholders for remaining images');
    skipImagesRef.current = true;
    setIsSkippingImages(true);
    setCreationProgress({
      phase: 'images',
      message: 'Skipping images, using placeholders...',
    });

    // Abort any ongoing image generation
    if (imageGenAbortRef.current) {
      imageGenAbortRef.current.abort();
      console.log('⏭️ Aborted ongoing image generation');
    }
  }, []);

  // Handle paste for images from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        imageItems.push(items[i]);
      }
    }

    if (imageItems.length === 0) return;

    // Prevent default paste behavior for images
    e.preventDefault();

    imageItems.forEach((item) => {
      const file = item.getAsFile();
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'image',
          name: `pasted-image-${Date.now()}.png`,
          data: reader.result as string,
          preview: reader.result as string,
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleClearChat = async () => {
    const confirmed = await confirm({
      title: 'Clear Chat History',
      description: 'Are you sure you want to clear the chat history? This action cannot be undone.',
      confirmText: 'Clear',
      variant: 'destructive',
    });
    if (confirmed) {
      await clearChat();
    }
  };

  const quickActions = [
    { label: 'Add Animation', prompt: QUICK_PROMPTS.addAnimation },
    { label: 'Create L3', prompt: QUICK_PROMPTS.createLowerThird },
    { label: 'Score Bug', prompt: QUICK_PROMPTS.createScoreBug },
    { label: 'Chart', prompt: QUICK_PROMPTS.createBarChart },
    { label: 'Map', prompt: QUICK_PROMPTS.createMap },
    { label: 'Standings', prompt: QUICK_PROMPTS.createStandings },
    { label: 'Improve', prompt: QUICK_PROMPTS.improveDesign },
  ];

  return (
    <TooltipProvider delayDuration={300}>
    <div ref={containerRef} className="h-full w-full min-w-0 flex flex-col bg-card border-r border-border overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "h-5 w-5 rounded-lg flex items-center justify-center",
            isDocsMode
              ? "bg-gradient-to-br from-blue-500 to-blue-600"
              : isDataMode
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                : AI_MODELS[getAIModel()]?.provider === 'gemini'
                  ? "bg-gradient-to-br from-blue-500 to-cyan-400"
                  : "bg-gradient-to-br from-violet-500 to-fuchsia-400"
          )}>
            {isDocsMode ? (
              <BookOpen className="w-3 h-3 text-white" />
            ) : isDataMode ? (
              <Database className="w-3 h-3 text-white" />
            ) : (
              <Sparkles className="w-3 h-3 text-white" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-xs leading-tight">
              {isDocsMode ? 'Documentation Helper' : isDataMode ? 'Data-Driven Design' : 'AI Assistant'}
            </h2>
            <p className="text-[9px] text-muted-foreground leading-tight">
              {isDocsMode ? 'Ask about Nova/Pulsar GFX' : isDataMode ? selectedDataSource?.name : (AI_MODELS[getAIModel()]?.name || 'Unknown Model')}
            </p>
          </div>
        </div>
        {chatMessages.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={handleClearChat}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear chat history</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'file')}
        multiple
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'image')}
        multiple
      />

      {/* Chat History */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-2 space-y-2">
          {isChatLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center py-4">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2",
                isDocsMode
                  ? "bg-gradient-to-br from-blue-500/20 to-blue-600/20"
                  : "bg-gradient-to-br from-violet-500/20 to-fuchsia-400/20"
              )}>
                {isDocsMode ? (
                  <BookOpen className="w-5 h-5 text-blue-400" />
                ) : (
                  <Wand2 className="w-5 h-5 text-violet-400" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {isDocsMode
                  ? "Ask questions about Nova GFX or Pulsar GFX"
                  : "Describe what you want to create"}
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                {isDocsMode
                  ? '"How do I add animations to elements?"'
                  : '"Create a sports lower third with team colors"'}
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-1.5', msg.role === 'user' && 'flex-row-reverse')}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'user'
                      ? 'bg-violet-500'
                      : 'bg-gradient-to-br from-violet-500 to-fuchsia-400'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    'flex-1 rounded-lg p-2 text-xs',
                    msg.role === 'user'
                      ? 'bg-violet-500/20 text-violet-900 dark:text-violet-100'
                      : msg.error
                      ? 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {/* Attachments preview for user messages */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {msg.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-1 text-[10px] bg-violet-500/10 dark:bg-black/20 rounded px-1.5 py-0.5">
                          {att.type === 'image' || att.type === 'screenshot' ? (
                            att.preview ? (
                              <img src={att.preview} alt="" className="w-6 h-6 object-cover rounded" />
                            ) : (
                              <Camera className="w-2.5 h-2.5" />
                            )
                          ) : (
                            <FileText className="w-2.5 h-2.5" />
                          )}
                          <span className="truncate max-w-[60px]">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.error && (
                    <div className="flex items-center gap-1 text-red-400 text-[10px] mb-1.5">
                      <AlertCircle className="w-3 h-3" />
                      Error
                    </div>
                  )}
                  {msg.changesApplied && creationProgress.phase !== 'done' && (
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] mb-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Elements created on canvas
                    </div>
                  )}
                  {/* Render message content - hide code for non-dev users */}
                  {msg.role === 'assistant' ? (
                    <MessageContent
                      content={msg.content}
                      isCodeExpanded={expandedCodeIds.has(msg.id)}
                      onToggleCode={() => toggleCodeExpanded(msg.id)}
                      creationProgress={activeMessageId === msg.id ? creationProgress : undefined}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.changes_applied && !msg.changesApplied && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1.5 h-6 text-[10px]"
                      onClick={async () => await applyAIChanges(msg.changes_applied!, msg.id)}
                    >
                      Apply Changes
                    </Button>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-1.5">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {isLoading && creationProgress.phase === 'idle' && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Thinking...</span>
              <button
                onClick={handleCancel}
                className="text-[10px] text-muted-foreground/60 hover:text-red-400 transition-colors ml-1.5"
              >
                (Cancel)
              </button>
            </div>
          )}

          {/* Global progress indicator for image generation and applying phases */}
          {(creationProgress.phase === 'images' || creationProgress.phase === 'applying') && (
            <div className="flex items-center gap-2 text-xs py-2 px-3 bg-muted/50 rounded-lg border border-border">
              {creationProgress.phase === 'images' ? (
                <ImageIcon className="w-4 h-4 text-emerald-400 animate-pulse" />
              ) : (
                <Wand2 className="w-4 h-4 text-fuchsia-400 animate-pulse" />
              )}
              <span className="text-muted-foreground flex-1">
                {creationProgress.message}
                {creationProgress.currentElement && (
                  <span className="ml-1 text-muted-foreground/70">{creationProgress.currentElement}</span>
                )}
              </span>
              {/* Skip Images button - only show during image generation phase */}
              {creationProgress.phase === 'images' && !isSkippingImages && (
                <button
                  onClick={handleSkipImages}
                  className="text-[10px] text-muted-foreground/60 hover:text-amber-400 transition-colors whitespace-nowrap"
                  title="Use placeholder images instead of generating"
                >
                  (Skip Images)
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Draggable Resize Handle */}
      <div
        className={cn(
          "relative flex-shrink-0 h-2 cursor-ns-resize group border-t border-border",
          "hover:bg-violet-500/20 transition-colors",
          isDraggingResize && "bg-violet-500/30"
        )}
        onMouseDown={handleResizeDragStart}
      >
        <div className={cn(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center",
          "opacity-40 group-hover:opacity-100 transition-opacity",
          isDraggingResize && "opacity-100"
        )}>
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Resizable Input Area */}
      <div
        className="flex-shrink-0 overflow-hidden flex flex-col"
        style={{ height: inputAreaHeight }}
      >
        {/* Quick Actions - hide in docs mode or when toggled off */}
      {!isDocsMode && showQuickPrompts && (
        <div className="px-2 py-1.5 border-t border-border flex-shrink-0">
          <div className="flex flex-wrap gap-0.5">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                size="sm"
                className="text-[10px] h-6 px-1.5"
                onClick={() => {
                  setInput(action.prompt);
                }}
                disabled={isLoading}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-2 py-1.5 border-t border-border bg-muted/30 flex-shrink-0">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-0.5">
            <ImageIcon className="w-2.5 h-2.5" />
            {attachments.length} image{attachments.length > 1 ? 's' : ''} attached
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group"
              >
                {att.preview ? (
                  <img 
                    src={att.preview} 
                    alt={att.name} 
                    className="w-12 h-12 object-cover rounded-lg border border-border shadow-sm" 
                  />
                ) : att.type === 'screenshot' ? (
                  <div className="w-12 h-12 bg-muted rounded-lg border border-border flex items-center justify-center">
                    <Camera className="w-5 h-5 text-violet-400" />
                  </div>
                ) : att.type === 'image' ? (
                  <div className="w-12 h-12 bg-muted rounded-lg border border-border flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-lg border border-border flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-400" />
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2 border-t border-border flex-shrink-0">
        <div className="flex gap-1.5 mb-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Attach file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => imageInputRef.current?.click()}
                disabled={isLoading}
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Upload image</TooltipContent>
          </Tooltip>

          {/* Screen Capture Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={isLoading || isCapturing}
                  >
                    {isCapturing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Capture canvas</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => captureCanvas(true)}>
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Capture Full Canvas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => captureCanvas(false)}>
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Capture Selection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Voice Input Button */}
          {speechSupported && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isListening ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-6 w-6 transition-all",
                    isListening && "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  )}
                  onClick={toggleListening}
                  disabled={isLoading}
                >
                  {isListening ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isListening ? "Stop listening" : "Voice input"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Quick Prompts Toggle - only show when not in docs mode */}
          {!isDocsMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showQuickPrompts ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-6 w-6 transition-all",
                    showQuickPrompts && "bg-amber-500 hover:bg-amber-600 text-white"
                  )}
                  onClick={() => {
                    const newValue = !showQuickPrompts;
                    setShowQuickPrompts(newValue);
                    localStorage.setItem('nova-chat-show-quick-prompts', String(newValue));
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {showQuickPrompts ? "Hide quick prompts" : "Show quick prompts"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Data-Driven Design Mode Toggle */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isDataMode ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-6 w-6 transition-all",
                      isDataMode && "bg-emerald-500 hover:bg-emerald-600 text-white"
                    )}
                    disabled={isLoading}
                  >
                    <Database className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isDataMode ? `Using: ${selectedDataSource?.name || 'Data'}` : "Design from data"}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-64">
              {/* Clear selection option */}
              {isDataMode && (
                <DropdownMenuItem
                  onClick={() => {
                    setIsDataMode(false);
                    setSelectedDataSource(null);
                  }}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear data selection
                </DropdownMenuItem>
              )}
              {/* Group data sources by category */}
              {Array.from(new Set(sampleDataSources.map(ds => ds.category))).map(category => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {sampleDataSources.filter(ds => ds.category === category).map(ds => (
                    <DropdownMenuItem
                      key={ds.id}
                      onClick={() => {
                        setSelectedDataSource(ds);
                        setIsDataMode(true);
                        setIsDocsMode(false); // Turn off docs mode when data mode is on
                      }}
                      className={cn(
                        "text-xs",
                        selectedDataSource?.id === ds.id && "bg-emerald-500/10 text-emerald-600"
                      )}
                    >
                      <Database className="w-3.5 h-3.5 mr-2" />
                      {ds.name}
                      {selectedDataSource?.id === ds.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Documentation Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isDocsMode ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "h-6 w-6 transition-all",
                  isDocsMode && "bg-blue-500 hover:bg-blue-600 text-white"
                )}
                onClick={() => {
                  setIsDocsMode(!isDocsMode);
                  if (!isDocsMode) {
                    setIsDataMode(false); // Turn off data mode when docs mode is on
                    setSelectedDataSource(null);
                  }
                }}
                disabled={isLoading}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isDocsMode ? "Switch to Design mode" : "Documentation help"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex gap-1.5">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // If user types while listening, update base input
              if (!isListening) {
                baseInputRef.current = e.target.value;
              }
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isListening ? "Listening... speak now" : isDocsMode ? "Ask about Nova GFX or Pulsar GFX..." : isDataMode ? `Design a template for ${selectedDataSource?.name || 'this data'}...` : "Describe what you want... (paste images with Ctrl+V)"}
            className={cn(
              "min-h-[48px] max-h-[300px] bg-muted border-border resize-y text-xs transition-all",
              isListening && "border-red-500/50 bg-red-500/5"
            )}
            disabled={isLoading}
          />
          {isLoading ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleCancel}
                  size="icon"
                  variant="destructive"
                  className="h-[48px] w-9"
                >
                  <Square className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Cancel (Esc)</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  size="icon"
                  className="h-[48px] w-9 bg-gradient-to-br from-violet-500 to-fuchsia-400 hover:from-violet-600 hover:to-fuchsia-500"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Send message</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
