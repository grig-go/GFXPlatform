"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "./utils";

function ResizablePanelGroup({
  className,
  direction,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  // Auto-detect RTL direction from document
  const [autoDirection, setAutoDirection] = React.useState<'ltr' | 'rtl'>('ltr');

  React.useEffect(() => {
    const dir = document.documentElement.getAttribute('dir') as 'ltr' | 'rtl';
    setAutoDirection(dir || 'ltr');

    // Listen for direction changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'dir') {
          const newDir = document.documentElement.getAttribute('dir') as 'ltr' | 'rtl';
          setAutoDirection(newDir || 'ltr');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Only apply autoDirection for horizontal panels, not vertical
  const effectiveDirection = direction === 'vertical' ? direction : autoDirection;

  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      direction={direction || 'horizontal'}
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        autoDirection === 'rtl' && direction !== 'vertical' && "flex-row-reverse",
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
