import React, { useRef, useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import TvIcon from '@mui/icons-material/Tv';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import { Tooltip } from '@mui/material';

// Types for cell renderer props
interface NameCellRendererProps {
  value: string;
  data: any;
  node: any;
  context?: {
    onEditBucketFolder?: (data: any) => void;
    onEditBucket?: (data: any) => void;
    onEditItemFolder?: (data: any) => void;
    onEditItem?: (data: any, tabIndex?: number) => void;
  };
}

interface DurationCellRendererProps {
  value: any;
  data: any;
  node: any;
  context?: {
    onEditItem?: (data: any, tabIndex?: number) => void;
  };
}

// Shared hover edit button component
const HoverEditButton: React.FC<{
  isHovered: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  rightOffset?: number;
}> = ({ isHovered, isSelected, onClick, rightOffset = 0 }) => {
  if (!isHovered) return null;

  return (
    <span
      className="hover-edit-button"
      style={{
        cursor: 'pointer',
        padding: '4px 8px',
        display: 'inline-flex',
        alignItems: 'center',
        position: 'absolute',
        right: rightOffset,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
        boxShadow: isSelected ? '-4px 0 8px var(--ag-selected-row-background-color)' : '-4px 0 8px var(--ag-row-hover-color)'
      }}
      onClick={onClick}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <i className="fa fa-edit"></i>
    </span>
  );
};

// Custom hook for cell hover state
const useCellHover = (cellRef: React.RefObject<HTMLElement>) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const cellElement = cellRef.current?.closest('.ag-cell');
    if (cellElement) {
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      cellElement.addEventListener('mouseenter', handleMouseEnter);
      cellElement.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        cellElement.removeEventListener('mouseenter', handleMouseEnter);
        cellElement.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  return isHovered;
};

// Icon component for different node types - uses CSS variables for theme-aware colors
const NodeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'bucketFolder':
      return <CreateNewFolderIcon style={{ marginRight: '5px', color: 'var(--icon-primary)' }} />;
    case 'bucket':
      return <ShoppingBasketIcon style={{ marginRight: '5px', color: 'var(--icon-secondary)' }} />;
    case 'itemFolder':
      return <FolderIcon style={{ marginRight: '5px', color: 'var(--icon-warning)' }} />;
    case 'item':
      return <InsertDriveFileIcon style={{ marginRight: '5px', color: 'var(--icon-success)' }} />;
    default:
      return null;
  }
};

export const NameCellRenderer: React.FC<NameCellRendererProps> = ({
  value,
  data,
  node,
  context
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!context) return;

    if (data.type === 'bucketFolder' && context.onEditBucketFolder) {
      context.onEditBucketFolder(data);
    } else if (data.type === 'bucket' && context.onEditBucket) {
      context.onEditBucket(data);
    } else if (data.type === 'itemFolder' && context.onEditItemFolder) {
      context.onEditItemFolder(data);
    } else if (data.type === 'item' && context.onEditItem) {
      context.onEditItem(data, 0);
    }
  };

  // Always use displayName for items
  const displayText = data.type === 'item' ? data.displayName : value;

  return (
    <span
      ref={cellRef}
      style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingRight: isHovered ? '30px' : '0'
      }}>
        <NodeIcon type={data.type} />
        {displayText}
      </span>
      <HoverEditButton
        isHovered={isHovered}
        isSelected={isSelected}
        onClick={handleEditClick}
      />
    </span>
  );
};

export const DurationCellRenderer: React.FC<DurationCellRendererProps> = ({
  data,
  node,
  context
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  // Only show duration for items
  if (!data || data.type !== 'item') {
    return <span style={{ color: '#ccc' }}>—</span>;
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Open item edit dialog with Settings tab (index 2)
    if (context?.onEditItem) {
      context.onEditItem(data, 2);
    }
  };

  // Show duration value or "Default" if null
  const durationText = (data.duration !== null && data.duration !== undefined)
    ? `${data.duration}s`
    : null;

  return (
    <span
      ref={cellRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {durationText ? (
        <span>{durationText}</span>
      ) : (
        <span style={{ color: '#999', fontStyle: 'italic' }}>Default</span>
      )}
      <HoverEditButton
        isHovered={isHovered}
        isSelected={isSelected}
        onClick={handleEditClick}
      />
    </span>
  );
};

// Props for ChannelPlaylistsPage cell renderer
interface PlaylistNameCellRendererProps {
  value: string;
  data: any;
  node: any;
  context?: {
    onEditChannel?: (data: any) => void;
    onEditPlaylist?: (data: any) => void;
    onEditBucket?: (data: any) => void;
    onOpenBucket?: (data: any) => void;
  };
}

// Icon component for playlist tree node types - uses CSS variables for theme-aware colors
const PlaylistNodeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'channel':
      return <TvIcon style={{ marginRight: '5px', color: 'var(--icon-primary)' }} />;
    case 'playlist':
      return <PlaylistAddIcon style={{ marginRight: '5px', color: 'var(--icon-secondary)' }} />;
    case 'bucket':
      return <ShoppingBasketIcon style={{ marginRight: '5px', color: 'var(--icon-warning)' }} />;
    default:
      return null;
  }
};

export const PlaylistNameCellRenderer: React.FC<PlaylistNameCellRendererProps> = ({
  value,
  data,
  node,
  context
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!context) return;

    if (data.type === 'channel' && context.onEditChannel) {
      context.onEditChannel(data);
    } else if (data.type === 'playlist' && context.onEditPlaylist) {
      context.onEditPlaylist(data);
    } else if (data.type === 'bucket' && context.onEditBucket) {
      context.onEditBucket(data);
    }
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (context?.onOpenBucket && data.type === 'bucket') {
      context.onOpenBucket(data);
    }
  };

  const handleOpenFeed = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (data.type === 'channel') {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const feedUrl = `${supabaseUrl}/functions/v1/vizrt-ticker/${encodeURIComponent(data.name)}`;
      window.open(feedUrl, '_blank');
    }
  };

  // For buckets, show both Open and Edit buttons
  const isChannel = data.type === 'channel';
  const isBucket = data.type === 'bucket';
  const isPlaylist = data.type === 'playlist';
  const carouselName = data.carousel_name;

  return (
    <span
      ref={cellRef}
      style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}
    >
      <span style={{
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingRight: isHovered ? (isBucket || isChannel ? '60px' : '30px') : '0',
        gap: '8px'
      }}>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <PlaylistNodeIcon type={data.type} />
          {value}
        </span>
        {isPlaylist && carouselName && (
          <Chip
            label={carouselName}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
      </span>
      {isHovered && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
            boxShadow: isSelected ? '-4px 0 8px var(--ag-selected-row-background-color)' : '-4px 0 8px var(--ag-row-hover-color)'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span
            style={{
              color: 'var(--primary-blue)',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            onClick={handleEditClick}
          >
            <i className="fa fa-edit"></i>
          </span>
          {isBucket && (
            <span
              style={{
                color: 'var(--primary-blue)',
                cursor: 'pointer',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              onClick={handleOpenClick}
              title="Open in Content"
            >
              <OpenInNewIcon style={{ fontSize: '16px' }} />
            </span>
          )}
          {isChannel && (
            <Tooltip title="Open Vizrt Ticker Feed" arrow>
              <span
                style={{
                  color: 'var(--primary-blue)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                onClick={handleOpenFeed}
              >
                <RssFeedIcon style={{ fontSize: '16px' }} />
              </span>
            </Tooltip>
          )}
        </span>
      )}
    </span>
  );
};

// Props for TemplatesPage cell renderer
interface TemplateNameCellRendererProps {
  value: string;
  data: any;
  node: any;
  api: any;
  // onEdit comes from cellRendererParams
  onEdit?: (data: any, node: any, api: any) => void;
}

// Icon component for template tree node types - uses CSS variables for theme-aware colors
const TemplateNodeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'templateFolder':
      return <FolderIcon style={{ marginRight: '5px', color: 'var(--icon-warning)' }} />;
    case 'template':
      return <InsertDriveFileIcon style={{ marginRight: '5px', color: 'var(--icon-success)' }} />;
    default:
      return null;
  }
};

export const TemplateNameCellRenderer: React.FC<TemplateNameCellRendererProps> = ({
  value,
  data,
  node,
  api,
  onEdit
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onEdit) {
      onEdit(data, node, api);
    }
  };

  return (
    <span
      ref={cellRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%'
      }}
    >
      <TemplateNodeIcon type={data.type} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
      <span
        style={{
          color: '#1976d2',
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'inline-flex',
          alignItems: 'center',
          marginLeft: '4px',
          backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
          visibility: isHovered ? 'visible' : 'hidden'
        }}
        onClick={handleEditClick}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <i className="fa fa-edit"></i>
      </span>
    </span>
  );
};

// Props for ChannelsPage cell renderer
interface ChannelNameCellRendererProps {
  value: string;
  data: any;
  node: any;
  onEdit?: (data: any) => void;
}

// Cell renderer for Channels page - channel name with hover edit icon next to text
export const ChannelNameCellRenderer: React.FC<ChannelNameCellRendererProps> = ({
  value,
  data,
  node,
  onEdit
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onEdit) {
      onEdit(data);
    }
  };

  return (
    <span
      ref={cellRef}
      style={{ display: 'flex', alignItems: 'center', width: '100%' }}
    >
      <TvIcon style={{ marginRight: '5px', color: 'var(--icon-primary)' }} />
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {value}
      </span>
      {isHovered && (
        <span
          style={{
            color: 'var(--primary-blue)',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '4px',
            backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
          }}
          onClick={handleEditClick}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <i className="fa fa-edit"></i>
        </span>
      )}
    </span>
  );
};

// Props for MSE cell renderer
interface MSECellRendererProps {
  value: string;
  data: any;
  node: any;
  onEdit?: (data: any) => void;
}

// Props for Channel Type cell renderer
interface ChannelTypeCellRendererProps {
  value: string;
  data: any;
  node: any;
  onEdit?: (data: any) => void;
}

// Cell renderer for Channel Type column - shows chip with hover edit icon
export const ChannelTypeCellRenderer: React.FC<ChannelTypeCellRendererProps> = ({
  value,
  data,
  node,
  onEdit
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  if (!value) return null;

  const typeConfig: Record<string, { label: string; color: string }> = {
    'Unreal': { label: 'Unreal Engine', color: '#a78bfa' },
    'Vizrt': { label: 'Vizrt', color: '#60a5fa' },
    'Pixera': { label: 'Pixera', color: '#4ade80' },
    'Web': { label: 'Web', color: '#fb923c' }
  };

  const config = typeConfig[value] || { label: value, color: 'var(--text-secondary)' };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onEdit) {
      onEdit(data);
    }
  };

  return (
    <span
      ref={cellRef}
      style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}
    >
      <Chip
        label={config.label}
        size="small"
        variant="outlined"
        sx={{
          height: '22px',
          fontSize: '0.75rem',
          borderColor: config.color,
          color: config.color,
          '& .MuiChip-label': {
            px: 1
          }
        }}
      />
      {isHovered && (
        <span
          style={{
            color: 'var(--primary-blue)',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '4px',
            backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
          }}
          onClick={handleEditClick}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <i className="fa fa-edit"></i>
        </span>
      )}
    </span>
  );
};

// Cell renderer for MSE column - shows host:port with hover edit icon
export const MSECellRenderer: React.FC<MSECellRendererProps> = ({
  value,
  data,
  node,
  onEdit
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  // Only show for Vizrt channels
  if (data?.type !== 'Vizrt') {
    return <span style={{ color: '#ccc' }}>—</span>;
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onEdit) {
      onEdit(data);
    }
  };

  const port = data?.mse_port || 8595;
  const hasHost = !!value;

  return (
    <span
      ref={cellRef}
      style={{ display: 'flex', alignItems: 'center', width: '100%' }}
    >
      {hasHost ? (
        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {value}:{port}
        </span>
      ) : (
        <span style={{ color: '#999', fontStyle: 'italic' }}>Not configured</span>
      )}
      {isHovered && (
        <span
          style={{
            color: 'var(--primary-blue)',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '4px',
            backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
          }}
          onClick={handleEditClick}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <i className="fa fa-edit"></i>
        </span>
      )}
    </span>
  );
};

// Props for Carousel cell renderer
interface CarouselCellRendererProps {
  value: string | null | undefined;
  data: any;
  node: any;
  api: any;
}

// Carousel cell renderer for Templates page - shows chip with hover edit icon
export const CarouselCellRenderer: React.FC<CarouselCellRendererProps> = ({
  value,
  data,
  node,
  api
}) => {
  const cellRef = useRef<HTMLSpanElement>(null);
  const isHovered = useCellHover(cellRef);
  const isSelected = node?.isSelected?.() || false;

  // Only show for templates, not folders
  if (data?.type !== 'template') {
    return null;
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Start editing the cell
    if (api) {
      api.startEditingCell({
        rowIndex: node.rowIndex,
        colKey: 'carousel_name'
      });
    }
  };

  return (
    <span
      ref={cellRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {value ? (
        <Chip
          label={value}
          size="small"
          variant="outlined"
          sx={{
            maxWidth: 'calc(100% - 30px)',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }
          }}
        />
      ) : (
        <span style={{ color: '#999', fontStyle: 'italic' }}>—</span>
      )}
      <span
        style={{
          color: '#1976d2',
          cursor: 'pointer',
          padding: '4px 8px',
          display: 'inline-flex',
          alignItems: 'center',
          marginLeft: 'auto',
          backgroundColor: isSelected ? 'var(--ag-selected-row-background-color)' : 'var(--ag-row-hover-color)',
          visibility: isHovered ? 'visible' : 'hidden'
        }}
        onClick={handleEditClick}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <i className="fa fa-edit"></i>
      </span>
    </span>
  );
};