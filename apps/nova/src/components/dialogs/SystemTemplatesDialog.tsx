import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  Download,
  Upload,
  MoreHorizontal,
  Trash2,
  Copy,
  FileJson,
  Layers,
  FolderOpen,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  getSystemTemplates,
  saveSystemTemplates,
  deleteSystemTemplate,
  exportSystemTemplatesToJSON,
  importSystemTemplatesFromJSON,
  exportTemplateToJSON,
} from '../../services/systemTemplateService';
import type { StarterProject } from '../../types/starterProject';

interface SystemTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemTemplatesDialog({ open, onOpenChange }: SystemTemplatesDialogProps) {
  const [templates, setTemplates] = useState<StarterProject[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      setTemplates(getSystemTemplates());
    }
  }, [open]);

  // Refresh templates
  const refreshTemplates = () => {
    setTemplates(getSystemTemplates());
  };

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Export all templates
  const handleExportAll = () => {
    const json = exportSystemTemplatesToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nova-system-templates.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Templates exported successfully');
  };

  // Export single template
  const handleExportTemplate = (slug: string) => {
    const json = exportTemplateToJSON(slug);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-template.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('success', 'Template exported successfully');
    }
  };

  // Import templates
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const result = importSystemTemplatesFromJSON(json);

      if (result.success) {
        refreshTemplates();
        showNotification('success', `Imported ${result.count} template(s) successfully`);
      } else {
        showNotification('error', result.error || 'Import failed');
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete template
  const handleDelete = (slug: string) => {
    deleteSystemTemplate(slug);
    refreshTemplates();
    setShowDeleteConfirm(null);
    showNotification('success', 'Template deleted');
  };

  // Duplicate template
  const handleDuplicate = (template: StarterProject) => {
    const newTemplate: StarterProject = {
      ...template,
      name: `${template.name} (Copy)`,
      slug: `${template.slug}-copy-${Date.now()}`,
    };

    const currentTemplates = getSystemTemplates();
    saveSystemTemplates([...currentTemplates, newTemplate]);
    refreshTemplates();
    showNotification('success', 'Template duplicated');
  };

  // Count templates in a starter project
  const countTemplates = (starter: StarterProject) => {
    return starter.layers.reduce((acc, layer) => acc + layer.templates.length, 0);
  };

  // Open template in Nova GFX
  const handleOpenInNovaGfx = (template: StarterProject) => {
    const novaGfxPort = import.meta.env.VITE_NOVA_GFX_PORT || 3003;
    window.open(
      `http://localhost:${novaGfxPort}/new?template=${template.slug}`,
      '_blank'
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              System Templates
            </DialogTitle>
            <DialogDescription>
              Manage starter templates. Changes are saved to your browser and persist across sessions.
            </DialogDescription>
          </DialogHeader>

          {/* Notification */}
          {notification && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              notification.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {notification.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {notification.message}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAll}>
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Templates List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.slug}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:border-violet-500/30 transition-colors cursor-pointer group"
                  onClick={() => handleOpenInNovaGfx(template)}
                >
                  {/* Preview */}
                  <div
                    className="w-20 h-14 rounded-md flex-shrink-0 overflow-hidden"
                    style={{
                      background: template.style === 'glass'
                        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
                        : template.style === 'flat'
                        ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)'
                        : template.style === 'sports'
                        ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)'
                        : 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)',
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className={`w-6 h-6 ${
                        template.style === 'flat' ? 'text-slate-400' : 'text-white/50'
                      }`} />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{template.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        template.style === 'glass'
                          ? 'bg-violet-500/20 text-violet-400'
                          : template.style === 'flat'
                          ? 'bg-blue-500/20 text-blue-400'
                          : template.style === 'sports'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {template.style}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {template.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{template.layers.length} layers</span>
                      <span>-</span>
                      <span>{countTemplates(template)} templates</span>
                      <span>-</span>
                      <span>{template.canvas_width}x{template.canvas_height}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleOpenInNovaGfx(template)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in Nova GFX
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExportTemplate(template.slug)}>
                        <FileJson className="w-4 h-4 mr-2" />
                        Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowDeleteConfirm(template.slug)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No system templates</p>
                  <p className="text-sm mt-2">Import templates to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
