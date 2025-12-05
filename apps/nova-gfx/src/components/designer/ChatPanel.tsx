import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Paperclip, Image as ImageIcon, Wand2, Sparkles, Loader2, Bot, User,
  AlertCircle, CheckCircle2, Code, ChevronDown, ChevronUp, Camera, X, FileText, Trash2, Mic, MicOff, Square, GripHorizontal
} from 'lucide-react';
import { Button, Textarea, ScrollArea, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from '@emergent-platform/ui';
import { sendChatMessage, QUICK_PROMPTS, isDrasticChange, AI_MODELS, getAIModel, type ChatMessage as AIChatMessage } from '@/lib/ai';
import { useDesignerStore } from '@/stores/designerStore';
import { useConfirm } from '@/hooks/useConfirm';
import type { AIContext, AIChanges, ChatAttachment } from '@emergent-platform/types';

interface Attachment {
  id: string;
  type: 'image' | 'file' | 'screenshot';
  name: string;
  data: string; // base64 or data URL
  preview?: string;
}

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

// Component to render AI message with optional code toggle
function MessageContent({ 
  content, 
  isCodeExpanded, 
  onToggleCode 
}: { 
  content: string;
  isCodeExpanded: boolean;
  onToggleCode: () => void;
}) {
  const { description, code, hasCode } = extractDescription(content);
  
  return (
    <div>
      <p className="whitespace-pre-wrap">{description || 'Done!'}</p>
      
      {hasCode && (
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
            <pre className="mt-1.5 p-1.5 bg-black/30 rounded text-[9px] overflow-x-auto max-h-40 overflow-y-auto">
              <code className="text-violet-300">{code}</code>
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
    markChangesApplied,
    clearChat,
  } = useDesignerStore();

  // Load chat history when project changes
  useEffect(() => {
    if (project?.id) {
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
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        // Finalize with whatever we have
        if (interimTranscript) {
          baseInputRef.current = baseInputRef.current + interimTranscript;
          setInput(baseInputRef.current);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [interimTranscript]);

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    } else {
      // Save current input as base before starting
      baseInputRef.current = input;
      setInterimTranscript('');
      
      // Focus the textarea so user can see text appearing
      textareaRef.current?.focus();
      
      // Start recognition
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, input]);

  // Apply AI changes to the canvas
  const applyAIChanges = useCallback((changes: AIChanges, messageId: string) => {
    try {
      console.log('🎨 Applying AI changes:', { type: changes.type, layerType: changes.layerType, elementCount: changes.elements?.length || 0 });
      const store = useDesignerStore.getState();
      
      // Determine the target template based on AI's layer_type detection
      let templateId = store.currentTemplateId;
      let targetLayer = store.layers.find(l => l.id === store.templates.find(t => t.id === templateId)?.layer_id);
      
      // For CREATE actions, always create a NEW template in the appropriate layer
      if (changes.type === 'create') {
        // If AI specified a layer type, use that layer
        if (changes.layerType) {
          targetLayer = store.layers.find(l => l.layer_type === changes.layerType);
          console.log(`🔍 Looking for layer type "${changes.layerType}":`, targetLayer ? `Found: ${targetLayer.name}` : 'Not found');
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
          
          // Select the new template
          store.selectTemplate(templateId);
          console.log(`✅ Selected template: ${templateId}`);
          
          // Ensure template is enabled
          const newTemplate = store.templates.find(t => t.id === templateId);
          if (newTemplate && !newTemplate.enabled) {
            store.setTemplates(store.templates.map(t => 
              t.id === templateId ? { ...t, enabled: true } : t
            ));
            console.log(`✅ Enabled template: ${templateId}`);
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
        // For UPDATE/DELETE actions, use current template or find by layer
        if (changes.layerType) {
          targetLayer = store.layers.find(l => l.layer_type === changes.layerType);
          if (targetLayer) {
            const existingTemplate = store.templates.find(t => t.layer_id === targetLayer!.id);
            if (existingTemplate) {
              templateId = existingTemplate.id;
              store.selectTemplate(templateId);
            } else {
              // Template doesn't exist in this layer - give user a hint
              const layerName = changes.layerType.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
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
          if (currentTemplate && changes.elements) {
            // If AI detected elements in a different layer, warn user
            const elementNames = changes.elements.map((e: any) => e.name || e.id).filter(Boolean);
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
        (changes as any).validationHints || [];

      if ((changes.type === 'create' || changes.type === 'update') && changes.elements) {
        changes.elements.forEach((el: any, index: number) => {
          try {
            // Skip null/undefined elements
            if (!el || typeof el !== 'object') {
              console.warn(`Skipping invalid element at index ${index}`);
              failedElements.push(`Element ${index + 1}: Invalid data`);
              return;
            }
          // Variable to track if we found an element to update
          let existingElement: typeof store.elements[0] | undefined = undefined;
          
          // Check if this is an UPDATE to an existing element
          if (changes.type === 'update') {
            console.log('🔍 Looking for element to update:', { id: el.id, name: el.name });
            console.log('📋 Available elements:', store.elements.map(e => ({ id: e.id, name: e.name })));
            
            // Try to find the existing element by ID first, then by name
            existingElement = el.id 
              ? store.elements.find(e => e.id === el.id)
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
              // Update only the properties that were specified
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
            } else {
              console.log('⚠️ Could not find element to update, will create new:', el.id || el.name);
            }
          }
          
          // CREATE a new element (if not updating, or if update didn't find element)
          if (changes.type === 'create' || (changes.type === 'update' && !existingElement)) {
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
            // Default shape content
            else if (!content || !content.type) {
              const bgColor = typeof el.styles?.backgroundColor === 'string' 
                ? el.styles.backgroundColor 
                : '#3B82F6';
              content = { 
                type: 'shape', 
                shape: 'rectangle', 
                fill: bgColor,
              };
            }

            console.log(`➕ Adding element: ${el.name} (${el.element_type}) to template ${templateId}`);
            const elementId = store.addElementFromData({
              template_id: templateId,
              name: el.name || 'AI Element',
              element_type: el.element_type || 'shape',
              position_x: el.position_x ?? 100,
              position_y: el.position_y ?? 100,
              width: el.width ?? 200,
              height: el.height ?? 100,
              rotation: el.rotation ?? 0,
              opacity: el.opacity ?? 1,
              scale_x: el.scale_x ?? 1,
              scale_y: el.scale_y ?? 1,
              z_index: el._zIndex ?? index,
              styles: el.styles || {},
              content: content,
              visible: true, // Ensure elements are visible
            });
            
            // Track newly created elements for auto-grouping (only for 'create' action)
            if (changes.type === 'create') {
              newlyCreatedElementIds.push(elementId);
            }
            
            if (el.name) {
              elementNameToId[el.name] = elementId;
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
      if (changes.type === 'create' && newlyCreatedElementIds.length >= 2) {
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
      console.log('🎬 Processing animations:', changes.animations);
      if (changes.animations && Array.isArray(changes.animations) && changes.animations.length > 0) {
        console.log(`✅ Found ${changes.animations.length} animation(s) to process`);
        const currentStore = useDesignerStore.getState();
        const newAnimations = [...currentStore.animations];
        const newKeyframes = [...currentStore.keyframes];

        changes.animations.forEach((animData: any) => {
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

          // Create keyframes from animation data
          if (animData.keyframes && Array.isArray(animData.keyframes) && animData.keyframes.length > 0) {
            animData.keyframes.forEach((kfData: any) => {
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

              // Validate position (0-100)
              let position = typeof kfData.position === 'number' ? kfData.position : 0;
              if (isNaN(position) || position < 0) position = 0;
              if (position > 100) position = 100;

              const keyframe = {
                id: crypto.randomUUID(),
                animation_id: animId,
                position,
                properties: kfProperties,
              };
              newKeyframes.push(keyframe);
            });
          } else {
            // Create default keyframes (fade in)
            newKeyframes.push({
              id: crypto.randomUUID(),
              animation_id: animId,
              position: 0,
              properties: { opacity: 0 },
            });
            newKeyframes.push({
              id: crypto.randomUUID(),
              animation_id: animId,
              position: 100,
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

              // Reverse the keyframes (swap 0 and 100 positions)
              const reversedKeyframes = [...inKeyframes].sort((a, b) => b.position - a.position);
              reversedKeyframes.forEach((kf, index) => {
                newKeyframes.push({
                  id: crypto.randomUUID(),
                  animation_id: outAnimId,
                  position: index === 0 ? 0 : 100,
                  properties: { ...kf.properties },
                });
              });
            }
          }
        });

        currentStore.setAnimations(newAnimations);
        currentStore.setKeyframes(newKeyframes);
        console.log(`✅ Created ${newAnimations.length} animation(s) with ${newKeyframes.length} keyframe(s)`);
      } else if (changes.type === 'create' && newlyCreatedElementIds.length > 0) {
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

          // IN Keyframes
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: inAnimId,
            position: 0,
            properties: { opacity: 0, transform: 'translateX(-50px)' },
          });
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: inAnimId,
            position: 100,
            properties: { opacity: 1, transform: 'translateX(0)' },
          });

          // OUT Animation (slide to left + fade)
          const outAnimId = crypto.randomUUID();
          newAnimations.push({
            id: outAnimId,
            template_id: templateId,
            element_id: elementId,
            phase: 'out',
            delay: 0,
            duration: 400,
            iterations: 1,
            direction: 'normal' as const,
            easing: 'ease-in',
            preset_id: null,
            created_at: new Date().toISOString(),
          });

          // OUT Keyframes
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: outAnimId,
            position: 0,
            properties: { opacity: 1, transform: 'translateX(0)' },
          });
          newKeyframes.push({
            id: crypto.randomUUID(),
            animation_id: outAnimId,
            position: 100,
            properties: { opacity: 0, transform: 'translateX(-50px)' },
          });

          console.log(`✅ Auto-generated in/out animations for element: ${element.name}`);
        });

        currentStore.setAnimations(newAnimations);
        currentStore.setKeyframes(newKeyframes);
        console.log(`✅ Auto-created ${newlyCreatedElementIds.length * 2} animations (in + out for each element)`);
      }

      markChangesApplied(messageId);
      console.log(`✅ Successfully applied ${changes.elements?.length || 0} elements to template ${templateId}`);
      
      // Verify elements were added
      setTimeout(() => {
        const verifyStore = useDesignerStore.getState();
        const templateElements = verifyStore.elements.filter(e => e.template_id === templateId);
        console.log(`🔍 Verification: Template ${templateId} now has ${templateElements.length} elements`);
        if (templateElements.length === 0) {
          console.warn('⚠️ Warning: No elements found in template after creation');
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
  }, [markChangesApplied]);

  // Build AI context from current state
  const buildContext = (): AIContext => {
    const currentTemplate = templates.find((t) => t.id === currentTemplateId);
    const selectedElements = elements.filter((e) => selectedElementIds.includes(e.id));
    
    // Get the design system from the store
    const storeDesignSystem = useDesignerStore.getState().designSystem;
    
    // Include available layers for AI to know where to add graphics
    const availableLayers = layers.map(l => ({
      name: l.name,
      type: l.layer_type,
      hasTemplates: templates.some(t => t.layer_id === l.id),
    }));

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
        elements,
        animations: [],
        bindings: [],
      } : null,
      selectedElements,
      availableLayers, // Added: let AI know what layers are available
      availablePresets: [],
      availableLibraries: ['anime.js', 'GSAP'],
    };
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: type,
          name: file.name,
          data: reader.result as string,
          preview: type === 'image' ? reader.result as string : undefined,
        };
        setAttachments((prev) => [...prev, attachment]);
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

  // Check if API key is configured (memoized to avoid recalculating)
  const hasApiKey = useMemo(() => {
    return !!import.meta.env.VITE_CLAUDE_API_KEY;
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Check if API key is configured
    if (!hasApiKey) {
      await addChatMessage({
        role: 'assistant',
        content: `**Claude API Key Not Configured**

To use the AI chat feature, you need to set up your Claude API key:

1. Create a \`.env\` file in the project root
2. Add: \`VITE_CLAUDE_API_KEY=your-api-key-here\`
3. Get your API key from: https://console.anthropic.com/
4. Restart the development server

Alternatively, check your project settings (⚙️) to configure the API key.`,
        error: true,
      });
      return;
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

    // Add user message to store (persists to DB)
    await addChatMessage({
      role: 'user',
      content: input,
      attachments: chatAttachments,
    });
    
    const userInput = input;
    const userAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsLoading(true);
    
    // Create AbortController for this request
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
      
      if (userAttachments.length > 0) {
        userAttachments.forEach((a) => {
          if ((a.type === 'image' || a.type === 'screenshot') && a.data) {
            // Extract base64 data and mime type
            const matches = a.data.match(/^data:([^;]+);base64,(.+)$/);
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
      
      history.push({ role: 'user', content: fullMessage });

      const context = buildContext();
      const response = await sendChatMessage(history, context, undefined, imageAttachments, abortControllerRef.current?.signal);

      // Determine if changes should be auto-applied
      const shouldAutoApply = response.changes && !isDrasticChange(response.changes);

      // Add AI response to store (persists to DB)
      const aiMessage = await addChatMessage({
        role: 'assistant',
        content: response.message,
        changes_applied: response.changes || null,
        changesApplied: shouldAutoApply, // Mark as applied if auto-applying
      });

      // Auto-apply changes if they're not drastic
      if (shouldAutoApply && aiMessage) {
        applyAIChanges(response.changes!, aiMessage.id);
      }
    } catch (error) {
      // Check if this was a user-initiated abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat request was cancelled by user');
        await addChatMessage({
          role: 'assistant',
          content: 'Request cancelled.',
          error: false,
        });
      } else {
        console.error('Chat error:', error);
        // Add error message to store with more details
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string'
          ? error
          : 'Unknown error occurred';
        
        await addChatMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. Please check your API key configuration and try again.`,
          error: true,
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
    { label: 'Improve', prompt: QUICK_PROMPTS.improveDesign },
  ];

  return (
    <div ref={containerRef} className="h-full w-full min-w-0 flex flex-col bg-card border-r border-border overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "h-5 w-5 rounded-lg flex items-center justify-center",
            AI_MODELS[getAIModel()]?.provider === 'gemini' 
              ? "bg-gradient-to-br from-blue-500 to-cyan-400"
              : "bg-gradient-to-br from-violet-500 to-fuchsia-400"
          )}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-xs leading-tight">AI Assistant</h2>
            <p className="text-[9px] text-muted-foreground leading-tight">
              {AI_MODELS[getAIModel()]?.name || 'Unknown Model'}
            </p>
          </div>
        </div>
        {chatMessages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={handleClearChat}
            title="Clear chat history"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
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
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-400/20 flex items-center justify-center mx-auto mb-2">
                <Wand2 className="w-5 h-5 text-violet-400" />
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Describe what you want to create
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                "Create a sports lower third with team colors"
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
                      ? 'bg-violet-500/20 text-violet-100'
                      : msg.error
                      ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {/* Attachments preview for user messages */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {msg.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-1 text-[10px] bg-black/20 rounded px-1.5 py-0.5">
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
                  {msg.changesApplied && (
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] mb-1.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Elements created on canvas
                    </div>
                  )}
                  {msg.isSending && (
                    <div className="flex items-center gap-1 text-blue-400 text-[10px] mb-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending...
                    </div>
                  )}
                  {/* Render message content - hide code for non-dev users */}
                  {msg.role === 'assistant' ? (
                    <MessageContent 
                      content={msg.content} 
                      isCodeExpanded={expandedCodeIds.has(msg.id)}
                      onToggleCode={() => toggleCodeExpanded(msg.id)}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.changes_applied && !msg.changesApplied && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1.5 h-6 text-[10px]"
                      onClick={() => applyAIChanges(msg.changes_applied!, msg.id)}
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

          {isLoading && (
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
        {/* Quick Actions */}
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            title="Upload image"
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading}
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </Button>
          
          {/* Screen Capture Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                title="Capture canvas"
                disabled={isLoading || isCapturing}
              >
                {isCapturing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
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
            <Button 
              variant={isListening ? "default" : "ghost"}
              size="icon" 
              className={cn(
                "h-6 w-6 transition-all",
                isListening && "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              )}
              title={isListening ? "Stop listening" : "Voice input"}
              onClick={toggleListening}
              disabled={isLoading}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
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
            placeholder={isListening ? "Listening... speak now" : "Describe what you want... (paste images with Ctrl+V)"}
            className={cn(
              "min-h-[48px] max-h-[96px] bg-muted border-border resize-none text-xs transition-all",
              isListening && "border-red-500/50 bg-red-500/5"
            )}
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              onClick={handleCancel}
              size="icon"
              variant="destructive"
              className="h-[48px] w-9"
              title="Cancel request (Esc)"
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
              className="h-[48px] w-9 bg-gradient-to-br from-violet-500 to-fuchsia-400 hover:from-violet-600 hover:to-fuchsia-500"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
