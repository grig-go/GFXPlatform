import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import {
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  ChevronLeft,
  Play,
  Bot,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useProject } from './ProjectContext';
import {
  Project,
  CreateProjectParams,
  PROJECT_COLORS,
  PROJECT_ICONS,
  getColorClass,
  AIFieldAlias,
  AIInstructions
} from '../types/project';

interface ProjectManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ViewMode = 'list' | 'create' | 'edit';

export function ProjectManagementModal({ open, onOpenChange }: ProjectManagementModalProps) {
  const { 
    projects, 
    activeProject,
    createProject, 
    updateProject, 
    deleteProject,
    setActiveProject,
    isLoading 
  } = useProject();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('blue');
  const [formIcon, setFormIcon] = useState('📁');
  const [formProjectType, setFormProjectType] = useState('VirtualSet');
  const [formAiInstructions, setFormAiInstructions] = useState<AIInstructions>({
    enabled: true,
    aliases: [],
    custom_instructions: ''
  });
  const [showAiSection, setShowAiSection] = useState(false);

  // Default AI instructions for Airport projects
  const getDefaultAirportAiInstructions = (): AIInstructions => ({
    enabled: true,
    aliases: [
      {
        alias: 'Top',
        field: 'ElementTop',
        options: {
          'Hawk': 'hawk',
          'Flower': 'flower',
          'Stadium': 'stadium'
        }
      },
      {
        alias: 'Background',
        field: 'environment_background',
        options: {
          'Desert': 'desert',
          'Marble': 'marble'
        }
      },
      {
        alias: 'Pattern',
        field: 'BaseTop',
        options: {
          'Gold': 'gold',
          'Metal': 'metal',
          'Dark': 'dark'
        }
      }
    ],
    custom_instructions: `When updating scene configuration:
- Only update the specific field mentioned, not all fields
- Only update ALL fields when the user explicitly says "all"
- "Top" refers to ElementTop (options: Hawk, Flower, Stadium)
- "Background" refers to environment_background (options: Desert, Marble)
- "Pattern" or "Patern" refers to BaseTop (options: Gold, Metal, Dark)`
  });

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor('blue');
    setFormIcon('📁');
    setFormProjectType('VirtualSet');
    setFormAiInstructions({ enabled: true, aliases: [], custom_instructions: '' });
    setShowAiSection(false);
    setEditingProject(null);
  };

  const handleCreate = () => {
    resetForm();
    setViewMode('create');
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormColor(project.color);
    setFormIcon(project.icon);
    setFormProjectType(project.settings?.project_type || 'VirtualSet');
    setFormAiInstructions(project.settings?.ai_instructions || { enabled: true, aliases: [], custom_instructions: '' });
    setShowAiSection(!!project.settings?.ai_instructions?.enabled);
    setViewMode('edit');
  };

  const handleBack = () => {
    setViewMode('list');
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const settings = {
        ...(editingProject?.settings || {}),
        project_type: formProjectType,
        ai_instructions: formAiInstructions
      };

      if (viewMode === 'create') {
        const params: CreateProjectParams = {
          name: formName,
          description: formDescription || undefined,
          color: formColor,
          icon: formIcon,
          settings
        };
        await createProject(params);
      } else if (viewMode === 'edit' && editingProject) {
        await updateProject({
          id: editingProject.id,
          name: formName,
          description: formDescription || undefined,
          color: formColor,
          icon: formIcon,
          settings
        });
      }

      handleBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    setIsSubmitting(true);
    try {
      await deleteProject(projectId);
      setDeleteConfirmId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (projectId: string) => {
    await setActiveProject(projectId);
  };

  const renderListView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">
            Manage your virtual set projects
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="size-4 mr-2" />
          New Project
        </Button>
      </div>

      <Separator />

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="size-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first project to organize your virtual set configurations
          </p>
          <Button onClick={handleCreate}>
            <Plus className="size-4 mr-2" />
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {projects.map(project => (
            <Card 
              key={project.id}
              className={`transition-all duration-200 hover:shadow-md ${
                project.is_active ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-2xl">{project.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{project.name}</h3>
                        {project.is_active && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!project.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleActivate(project.id)}
                        title="Set as active"
                        className="h-8 w-8"
                      >
                        <Play className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(project)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    {deleteConfirmId === project.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(project.id)}
                          disabled={isSubmitting}
                          className="h-8 w-8"
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(null)}
                          className="h-8 w-8"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(project.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderFormView = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ChevronLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">
            {viewMode === 'create' ? 'New Project' : 'Edit Project'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'create' 
              ? 'Create a new project to organize your work'
              : `Editing "${editingProject?.name}"`
            }
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        <div className="space-y-2">
          <Label htmlFor="project-name">Name *</Label>
          <Input
            id="project-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="My Virtual Set Project"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Describe this project..."
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1 p-2 border rounded-lg max-h-24 overflow-y-auto">
              {PROJECT_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormIcon(icon)}
                  className={`p-1.5 rounded text-lg hover:bg-gray-100 transition-colors ${
                    formIcon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-1 p-2 border rounded-lg">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormColor(color.value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${color.class} ${
                    formColor === color.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                  }`}
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Type */}
        <div className="space-y-2">
          <Label>Project Type</Label>
          <div className="flex gap-2">
            {['VirtualSet', 'Airport'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setFormProjectType(type);
                  // Auto-apply default AI instructions for Airport
                  if (type === 'Airport' && !formAiInstructions.custom_instructions) {
                    setFormAiInstructions(getDefaultAirportAiInstructions());
                    setShowAiSection(true);
                  }
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all border ${
                  formProjectType === type
                    ? 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-500 ring-offset-1'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* AI Instructions Section */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAiSection(!showAiSection)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-blue-600" />
              <span className="font-medium text-sm">AI Instructions</span>
              {formAiInstructions.enabled && formAiInstructions.custom_instructions && (
                <Badge variant="secondary" className="text-xs">Configured</Badge>
              )}
            </div>
            {showAiSection ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showAiSection && (
            <div className="p-3 space-y-3 border-t">
              <p className="text-xs text-muted-foreground">
                Configure how the AI understands your commands when editing scene configurations.
              </p>

              {formProjectType === 'Airport' && !formAiInstructions.custom_instructions && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormAiInstructions(getDefaultAirportAiInstructions())}
                  className="w-full"
                >
                  <Bot className="size-4 mr-2" />
                  Load Airport Defaults
                </Button>
              )}

              {/* Aliases Display */}
              {formAiInstructions.aliases && formAiInstructions.aliases.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Field Aliases</Label>
                  <div className="space-y-1">
                    {formAiInstructions.aliases.map((alias, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded">
                        <span className="font-medium text-blue-600">"{alias.alias}"</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-700">{alias.field}</span>
                        {alias.options && (
                          <span className="text-gray-400 ml-auto">
                            ({Object.keys(alias.options).join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label htmlFor="ai-instructions" className="text-xs">Custom Instructions</Label>
                <Textarea
                  id="ai-instructions"
                  value={formAiInstructions.custom_instructions || ''}
                  onChange={(e) => setFormAiInstructions({
                    ...formAiInstructions,
                    custom_instructions: e.target.value
                  })}
                  placeholder="Enter custom instructions for the AI..."
                  rows={4}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !formName.trim()}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              {viewMode === 'create' ? 'Creating...' : 'Saving...'}
            </>
          ) : (
            <>
              <Check className="size-4 mr-2" />
              {viewMode === 'create' ? 'Create Project' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogTitle className="sr-only">Project Management</DialogTitle>
        <DialogDescription className="sr-only">
          Create, edit, and manage your virtual set projects
        </DialogDescription>
        
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderListView()}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {renderFormView()}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}