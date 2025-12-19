/**
 * AddressContextMenu Component
 *
 * A reusable context menu wrapper that provides "See Address" and "Copy Address"
 * functionality for any addressable item in the app.
 */

import { useState, useCallback, type ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@emergent-platform/ui';
import { Copy, Check } from 'lucide-react';
import { buildElementAddress } from '@/lib/address';

interface AddressContextMenuProps {
  /** The address string to display/copy */
  address: string;
  /** Optional human-readable label for the address */
  label?: string;
  /** Child elements to wrap */
  children: ReactNode;
  /** Additional class name for the wrapper */
  className?: string;
  /** Whether to disable the context menu */
  disabled?: boolean;
}

export function AddressContextMenu({
  address,
  label,
  children,
  className,
  disabled = false,
}: AddressContextMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      console.log('[Address] Copied to clipboard:', address);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  }, [address]);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={className}>{children}</div>
      </ContextMenuTrigger>

      <ContextMenuContent className="bg-zinc-900 border-zinc-700 min-w-[160px] z-50">
        {/* Show address at the top */}
        <div className="px-2 py-1.5 border-b border-zinc-700 mb-1">
          {label && (
            <div className="text-[9px] text-zinc-500 uppercase tracking-wide mb-0.5">
              {label}
            </div>
          )}
          <code className="text-[10px] font-mono text-emerald-400 break-all">
            {address}
          </code>
        </div>
        <ContextMenuItem
          onClick={handleCopyAddress}
          className="text-xs text-zinc-200 hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-2 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-2 text-zinc-400" />
          )}
          Copy Address
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Inline address display with copy functionality
 * For use in panels where you want to show the address directly
 */
interface AddressDisplayProps {
  address: string;
  label?: string;
  className?: string;
}

export function AddressDisplay({ address, label, className }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      console.log('[Address] Copied:', address);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [address]);

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {label && (
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
          {label}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-colors group"
        title="Click to copy"
      >
        <code className="text-[10px] font-mono text-emerald-400/80 group-hover:text-emerald-400">
          {address}
        </code>
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3 text-zinc-500 group-hover:text-zinc-400" />
        )}
      </button>
    </div>
  );
}

/**
 * Small address badge that shows on hover
 * For use in lists or compact UI areas
 */
interface AddressBadgeProps {
  address: string;
  className?: string;
}

export function AddressBadge({ address, className }: AddressBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      console.log('[Address] Copied:', address);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [address]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400 hover:text-emerald-400 transition-colors ${className || ''}`}
      title={`Copy: ${address}`}
    >
      {copied ? (
        <Check className="w-2.5 h-2.5" />
      ) : (
        <Copy className="w-2.5 h-2.5" />
      )}
      <span className="max-w-[120px] truncate">{address}</span>
    </button>
  );
}

/**
 * AddressableProperty - wraps individual property controls with address context menu
 * Used inside PropertySections to give each sub-property its own addressable context menu
 *
 * Example: @Shape.content.glass.enabled for the "Frosted Glass" checkbox
 */
interface AddressablePropertyProps {
  /** Property path within the element (e.g., 'content.glass.enabled', 'content.gradient.enabled') */
  propertyPath: string;
  /** Human-readable label for the property */
  label: string;
  /** The element name - passed from parent or context */
  elementName: string;
  /** Child elements (the actual control) */
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

export function AddressableProperty({
  propertyPath,
  label,
  elementName,
  children,
  className,
}: AddressablePropertyProps) {
  // Build the full address from element name and property path
  const address = elementName ? buildElementAddress(elementName, propertyPath) : '';

  if (!address) {
    return <>{children}</>;
  }

  return (
    <AddressContextMenu address={address} label={label} className={className}>
      {children}
    </AddressContextMenu>
  );
}
