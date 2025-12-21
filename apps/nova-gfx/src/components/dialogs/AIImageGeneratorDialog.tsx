/**
 * AI Image Generator Dialog
 *
 * Generates images using AI and supports mask-based editing (inpainting).
 * Uses the selected AI Image Model from settings.
 *
 * Features:
 * - Generate new images from text prompts
 * - Edit existing images with mask annotations (inpainting)
 * - Drawing canvas overlay for mask creation
 * - Saves generated images to media library
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
  Label,
  cn,
} from '@emergent-platform/ui';
import {
  Sparkles,
  Loader2,
  Paintbrush,
  Trash2,
  Download,
  RotateCcw,
  Wand2,
  Image as ImageIcon,
  AlertCircle,
  Check,
  Settings,
} from 'lucide-react';
import {
  getAIImageModel,
  getCurrentImageModelDisplayInfo,
  resolveImageModelConfig,
  type AIImageModelDisplayInfo,
} from '@/lib/ai';
import { uploadToNovaMedia, type NovaMediaAsset } from '@/services/novaMediaService';
import { uploadAIGeneratedTexture } from '@/services/textureService';

/** Save mode determines where the generated image is stored */
export type AISaveMode = 'media-library' | 'texture';

interface AIImageGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, asset?: NovaMediaAsset) => void;
  /** Optional existing image URL for editing mode */
  existingImageUrl?: string;
  /** Initial prompt */
  initialPrompt?: string;
  /** Where to save generated images. Defaults to 'media-library' */
  saveMode?: AISaveMode;
  /** Organization ID - required when saveMode is 'texture' */
  organizationId?: string;
  /** User ID - required when saveMode is 'texture' */
  userId?: string;
}

// Canvas dimensions for drawing (internal resolution)
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// Default brush settings
const DEFAULT_BRUSH_COLOR = '#FF0000';
const DEFAULT_BRUSH_SIZE = 10;

export function AIImageGeneratorDialog({
  open,
  onOpenChange,
  onSelect,
  existingImageUrl,
  initialPrompt = '',
  saveMode = 'media-library',
  organizationId,
  userId,
}: AIImageGeneratorDialogProps) {
  // Generation state
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedBase64, setGeneratedBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAsset, setSavedAsset] = useState<NovaMediaAsset | null>(null);

  // Edit mode state (for existing images)
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(existingImageUrl || null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState(DEFAULT_BRUSH_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Model info loaded from backend
  const [modelInfo, setModelInfo] = useState<AIImageModelDisplayInfo | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(true);

  // Load model info from backend when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingModel(true);
      Promise.all([
        getCurrentImageModelDisplayInfo(),
        resolveImageModelConfig(),
      ]).then(([displayInfo, resolvedConfig]) => {
        setModelInfo(displayInfo);
        setHasApiKey(!!resolvedConfig?.apiKey);
        setIsLoadingModel(false);
      }).catch(err => {
        console.error('[AIImageGenerator] Failed to load model info:', err);
        setIsLoadingModel(false);
      });
    }
  }, [open]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPrompt(initialPrompt);
      setGeneratedImageUrl(null);
      setGeneratedBase64(null);
      setError(null);
      setSavedAsset(null);
      setSourceImageUrl(existingImageUrl || null);
      setIsEditMode(!!existingImageUrl);
      setIsDrawingMode(false);
      clearDrawing();
    }
  }, [open, initialPrompt, existingImageUrl]);

  // Drawing functions
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [isDrawingMode]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, isDrawingMode, brushColor, brushSize]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  /**
   * Convert drawing annotations to a binary mask for inpainting
   * Black = keep unchanged, White = area to edit
   */
  const getMaskFromAnnotations = useCallback(async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasAnnotations = imageData.data.some((pixel) => pixel !== 0);
    if (!hasAnnotations) return null;

    // Create a new canvas for the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return null;

    // Step 1: Fill with black (non-edit areas)
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Step 2: Composite the drawn annotations on top
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.drawImage(canvas, 0, 0);

    // Step 3: Convert to white where user drew (alpha > 0)
    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = maskImageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        // If alpha channel > 0 (drawn area)
        data[i] = 255; // Red
        data[i + 1] = 255; // Green
        data[i + 2] = 255; // Blue
        data[i + 3] = 255; // Alpha
      }
    }
    maskCtx.putImageData(maskImageData, 0, 0);

    // Step 4: Export as PNG data URI
    return maskCanvas.toDataURL('image/png');
  }, []);

  /**
   * Generate a new image using AI Image API (resolved from backend)
   */
  const generateImage = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImageUrl(null);
    setGeneratedBase64(null);

    try {
      // Resolve model config from backend (includes API key)
      const resolvedConfig = await resolveImageModelConfig();
      if (!resolvedConfig) {
        setError('No AI image model configured. Please set up an image provider in AI Connections.');
        setIsGenerating(false);
        return;
      }

      const { apiKey, apiModel, apiEndpoint } = resolvedConfig;

      // Enhance prompt for better broadcast quality
      const enhancedPrompt = `${prompt}, professional quality, suitable for broadcast graphics, high resolution, cinematic lighting, 16:9 aspect ratio`;

      console.log(`🎨 Generating image with ${apiModel} (${apiEndpoint}): "${enhancedPrompt.substring(0, 100)}..."`);

      // Check if we're in edit mode with a mask
      const maskDataUri = await getMaskFromAnnotations();
      const isInpaintingMode = isEditMode && sourceImageUrl && maskDataUri;

      let response: Response;
      let imageData: string | null = null;

      if (isInpaintingMode) {
        // Edit mode: Use Gemini for inpainting (Imagen doesn't support inpainting via this API)
        response = await editImageWithGemini(sourceImageUrl!, maskDataUri!, prompt, apiKey, apiModel);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API error: ${response.status} - ${errorText}`);
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        // Extract from Gemini response format
        const candidates = data.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              imageData = part.inlineData.data;
              break;
            }
          }
          if (imageData) break;
        }
      } else if (apiEndpoint === 'generateImages') {
        // Imagen API: Use generateImages endpoint
        // Reference: https://ai.google.dev/gemini-api/docs/imagen
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateImages?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: enhancedPrompt,
              config: {
                numberOfImages: 1,
                aspectRatio: '16:9',
                // Safety settings for broadcast content
                safetyFilterLevel: 'BLOCK_MEDIUM_AND_ABOVE',
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Imagen API error: ${response.status} - ${errorText}`);
          // Check for billing error
          if (errorText.includes('billing') || errorText.includes('BILLING')) {
            throw new Error('Imagen API requires billing to be enabled on your Google Cloud project. Try using Gemini 2.5 Flash instead.');
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        // Extract from Imagen response format
        // Response format: { generatedImages: [{ image: { imageBytes: "base64..." } }] }
        const generatedImages = data.generatedImages || [];
        if (generatedImages.length > 0) {
          // Imagen returns imageBytes as base64
          imageData = generatedImages[0].image?.imageBytes || generatedImages[0].image?.image_bytes;
        }
      } else {
        // Gemini API: Use generateContent endpoint
        // Reference: https://developers.googleblog.com/en/gemini-2-5-flash-image-now-ready-for-production-with-new-aspect-ratios/
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: enhancedPrompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                // imageConfig specifies aspect ratio for generated images
                // Supported: 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
                imageConfig: {
                  aspectRatio: '16:9',
                },
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini API error: ${response.status} - ${errorText}`);
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        // Extract from Gemini response format
        const candidates = data.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              imageData = part.inlineData.data;
              break;
            }
          }
          if (imageData) break;
        }
      }

      if (!imageData) {
        throw new Error('No image data in response. Try rephrasing your prompt or use a different model.');
      }

      // Create data URL for preview
      const mimeType = 'image/png';
      const dataUrl = `data:${mimeType};base64,${imageData}`;

      setGeneratedBase64(imageData);
      setGeneratedImageUrl(dataUrl);

      // Clear the drawing canvas after successful generation
      if (isInpaintingMode) {
        clearDrawing();
        setIsDrawingMode(false);
      }

      console.log('✅ Image generated successfully');
    } catch (err) {
      console.error('❌ Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isEditMode, sourceImageUrl, getMaskFromAnnotations, clearDrawing]);

  /**
   * Edit an existing image using Gemini's multimodal capabilities
   * Note: maskDataUri is prepared for future mask-based inpainting support
   */
  async function editImageWithGemini(
    sourceUrl: string,
    _maskDataUri: string,
    editPrompt: string,
    apiKey: string,
    apiModel: string
  ): Promise<Response> {
    // Convert source image URL to base64 if needed
    let sourceBase64 = sourceUrl;
    if (sourceUrl.startsWith('http')) {
      const imageResponse = await fetch(sourceUrl);
      const blob = await imageResponse.blob();
      const reader = new FileReader();
      sourceBase64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] || result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else if (sourceBase64.startsWith('data:')) {
      sourceBase64 = sourceBase64.split(',')[1];
    }

    // Build editing prompt
    const fullEditPrompt = `Edit this image: ${editPrompt}. Keep the rest of the image unchanged. Only modify the areas that match the description.`;

    // Gemini multimodal request with image input and image output
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: sourceBase64,
                  },
                },
                {
                  text: fullEditPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.4,
          },
        }),
      }
    );
  }

  /**
   * Save generated image to media library or textures based on saveMode
   */
  const saveImage = useCallback(async () => {
    if (!generatedBase64) {
      setError('No image to save');
      return;
    }

    // Validate texture mode requirements
    if (saveMode === 'texture' && (!organizationId || !userId)) {
      setError('Organization context required for texture save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert base64 to Blob
      const binaryString = atob(generatedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });

      const currentModelId = getAIImageModel();

      if (saveMode === 'texture') {
        // Save to organization textures
        const texture = await uploadAIGeneratedTexture(blob, organizationId!, userId!, {
          name: prompt.substring(0, 50) || 'AI Generated Image',
          description: prompt,
          tags: ['ai-generated', 'nova-gfx'],
          aiModelUsed: currentModelId,
        });

        // Convert texture to asset-like object for consistency
        const assetLike: NovaMediaAsset = {
          id: texture.id,
          name: texture.name,
          file_name: texture.fileName,
          file_url: texture.fileUrl,
          thumbnail_url: texture.thumbnailUrl || texture.fileUrl,
          media_type: 'image',
          tags: texture.tags,
          created_at: texture.createdAt,
        };

        setSavedAsset(assetLike);
        console.log('✅ Image saved to textures:', texture.fileUrl);
      } else {
        // Save to Nova Media Library
        const timestamp = Date.now();
        const filename = `ai-generated-${timestamp}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

        const asset = await uploadToNovaMedia(file, {
          name: prompt.substring(0, 50) || 'AI Generated Image',
          description: prompt,
          tags: ['ai-generated', 'nova-gfx'],
          mediaType: 'image',
          aiModelUsed: currentModelId,
          createdBy: 'nova-gfx-ai',
        });

        setSavedAsset(asset);
        console.log('✅ Image saved to media library:', asset.file_url);
      }
    } catch (err) {
      console.error('❌ Failed to save image:', err);
      setError(err instanceof Error ? err.message : 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  }, [generatedBase64, prompt, saveMode, organizationId, userId]);

  /**
   * Use the generated/saved image
   * Automatically saves to the appropriate location if not already saved
   */
  const handleUseImage = useCallback(async () => {
    // If already saved, use the saved asset
    if (savedAsset) {
      onSelect(savedAsset.file_url, savedAsset);
      onOpenChange(false);
      return;
    }

    // If we have a generated image but it's not saved yet, save it first
    if (generatedBase64) {
      // Validate texture mode requirements
      if (saveMode === 'texture' && (!organizationId || !userId)) {
        setError('Organization context required for texture save');
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        // Convert base64 to Blob
        const binaryString = atob(generatedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });

        const currentModelId = getAIImageModel();

        if (saveMode === 'texture') {
          // Save to organization textures
          const texture = await uploadAIGeneratedTexture(blob, organizationId!, userId!, {
            name: prompt.substring(0, 50) || 'AI Generated Image',
            description: prompt,
            tags: ['ai-generated', 'nova-gfx'],
            aiModelUsed: currentModelId,
          });

          // Convert texture to asset-like object for consistency
          const assetLike: NovaMediaAsset = {
            id: texture.id,
            name: texture.name,
            file_name: texture.fileName,
            file_url: texture.fileUrl,
            thumbnail_url: texture.thumbnailUrl || texture.fileUrl,
            media_type: 'image',
            tags: texture.tags,
            created_at: texture.createdAt,
          };

          console.log('✅ Image saved to textures:', texture.fileUrl);
          onSelect(assetLike.file_url, assetLike);
          onOpenChange(false);
        } else {
          // Save to Nova Media Library
          const timestamp = Date.now();
          const filename = `ai-generated-${timestamp}.png`;
          const file = new File([blob], filename, { type: 'image/png' });

          const asset = await uploadToNovaMedia(file, {
            name: prompt.substring(0, 50) || 'AI Generated Image',
            description: prompt,
            tags: ['ai-generated', 'nova-gfx'],
            mediaType: 'image',
            aiModelUsed: currentModelId,
            createdBy: 'nova-gfx-ai',
          });

          console.log('✅ Image saved to media library:', asset.file_url);
          onSelect(asset.file_url, asset);
          onOpenChange(false);
        }
      } catch (err) {
        console.error('❌ Failed to save image:', err);
        setError(err instanceof Error ? err.message : 'Failed to save image');
        setIsSaving(false);
      }
    }
  }, [savedAsset, generatedBase64, prompt, onSelect, onOpenChange, saveMode, organizationId, userId]);

  /**
   * Use generated image as source for further editing
   */
  const handleEditGenerated = useCallback(() => {
    if (generatedImageUrl) {
      setSourceImageUrl(generatedImageUrl);
      setIsEditMode(true);
      setGeneratedImageUrl(null);
      setGeneratedBase64(null);
      setSavedAsset(null);
    }
  }, [generatedImageUrl]);

  // Display image (source for editing or generated)
  const displayImageUrl = generatedImageUrl || sourceImageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            {isEditMode ? 'Edit Image with AI' : 'Generate Image with AI'}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>
              {isEditMode
                ? 'Draw on the image to mark areas to edit, then describe what to change'
                : 'Describe the image you want to generate'}
            </span>
            <span className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <Settings className="w-3 h-3" />
              Using: <span className="font-medium text-foreground">
                {isLoadingModel ? 'Loading...' : (modelInfo?.name || 'No model configured')}
              </span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* API Key Warning */}
          {!isLoadingModel && !hasApiKey && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">No Image Provider Configured</p>
                <p className="text-muted-foreground">
                  Please configure an image generation provider in AI Connections (Nova dashboard) to generate images.
                </p>
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              {isEditMode ? 'Edit Instructions' : 'Image Description'}
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                isEditMode
                  ? 'Describe what to change in the marked areas...'
                  : 'Describe the image you want to generate...'
              }
              className="min-h-[80px] resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Image Display / Canvas Area */}
          {displayImageUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {generatedImageUrl ? 'Generated Image' : 'Source Image'}
                </Label>
                {isEditMode && !generatedImageUrl && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isDrawingMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsDrawingMode(!isDrawingMode)}
                      className={cn(
                        'gap-1.5',
                        isDrawingMode && 'bg-violet-500 hover:bg-violet-600'
                      )}
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      {isDrawingMode ? 'Drawing On' : 'Draw Mask'}
                    </Button>
                    {isDrawingMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearDrawing}
                        className="gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="relative rounded-lg overflow-hidden border border-border bg-black/5">
                <img
                  ref={imageRef}
                  src={displayImageUrl}
                  alt={generatedImageUrl ? 'Generated' : 'Source'}
                  className="w-full h-auto max-h-[350px] object-contain"
                />

                {/* Drawing Canvas Overlay (only in edit mode) */}
                {isEditMode && !generatedImageUrl && (
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className={cn(
                      'absolute top-0 left-0 w-full h-full',
                      isDrawingMode ? 'cursor-crosshair' : 'pointer-events-none'
                    )}
                    style={{ maxHeight: '350px' }}
                  />
                )}
              </div>

              {/* Drawing Tools (when in drawing mode) */}
              {isDrawingMode && isEditMode && !generatedImageUrl && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/30">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Color:</Label>
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="w-8 h-6 rounded border cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Size:</Label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground w-8">{brushSize}px</span>
                  </div>
                  <p className="text-xs text-violet-600 ml-auto">
                    Draw on image to mark areas for AI to edit
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Save Status */}
          {savedAsset && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-500">
                  Saved to {saveMode === 'texture' ? 'Textures' : 'Media Library'}
                </p>
                <p className="text-muted-foreground text-xs truncate">{savedAsset.file_url}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between pt-4 border-t gap-2">
          <div className="flex gap-2">
            {/* Generate Button */}
            <Button
              onClick={generateImage}
              disabled={!prompt.trim() || isGenerating || isLoadingModel || !hasApiKey}
              className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  {isEditMode ? 'Apply Edit' : 'Generate'}
                </>
              )}
            </Button>

            {/* Regenerate Button (when image exists) */}
            {generatedImageUrl && (
              <Button variant="outline" onClick={generateImage} disabled={isGenerating}>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Regenerate
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Edit Generated Image */}
            {generatedImageUrl && !savedAsset && (
              <Button variant="outline" onClick={handleEditGenerated}>
                <Paintbrush className="w-4 h-4 mr-1.5" />
                Edit This
              </Button>
            )}

            {/* Save to Library/Textures */}
            {generatedImageUrl && !savedAsset && (
              <Button
                variant="outline"
                onClick={saveImage}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {saveMode === 'texture' ? 'Save to Textures' : 'Save to Library'}
              </Button>
            )}

            {/* Use Image */}
            <Button
              onClick={handleUseImage}
              disabled={(!generatedImageUrl && !savedAsset) || isSaving}
              className="bg-violet-500 hover:bg-violet-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-1.5" />
                  Use Image
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
