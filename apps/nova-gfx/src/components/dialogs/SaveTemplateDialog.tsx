import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@emergent-platform/ui';
import { Save, FolderOpen, RotateCcw } from 'lucide-react';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  onUpdateTemplate: () => void;
  onSaveAsNewProject: () => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  templateName,
  onUpdateTemplate,
  onSaveAsNewProject,
}: SaveTemplateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save Changes</AlertDialogTitle>
          <AlertDialogDescription>
            This project was created from the system template "{templateName}". How would you like to save your changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onUpdateTemplate();
              onOpenChange(false);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Update System Template</span>
              <span className="text-xs text-muted-foreground">
                Overwrite the original template with your changes
              </span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onSaveAsNewProject();
              onOpenChange(false);
            }}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Save as New Project</span>
              <span className="text-xs text-muted-foreground">
                Keep the template unchanged and save this as a separate project
              </span>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}



