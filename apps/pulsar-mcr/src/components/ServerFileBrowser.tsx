// src/components/ServerFileBrowser.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Classes,
  Button,
  Tree,
  Intent,
  Spinner,
  Callout,
  Icon,
  Tag,
  NonIdealState,
  Toaster
} from '@blueprintjs/core';
import { supabase } from '../lib/supabase';

const FILE_SERVER_URL = import.meta.env.VITE_FILE_SERVER_URL || 'http://localhost:8001';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  extension?: string;
}

interface ServerFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string, content?: string, metadata?: any) => void;
  allowedExtensions?: string[];
  initialPath?: string;
}

const toaster = Toaster.create({
  position: 'top',
});

export const ServerFileBrowser: React.FC<ServerFileBrowserProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  initialPath = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [filePreview, setFilePreview] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['Root']);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('ServerFileBrowser - isOpen changed:', isOpen);
    if (isOpen) {
      console.log('Dialog should be visible now');
      // Load directory when dialog opens
      loadDirectory(currentPath);
    }
  }, [isOpen]);

  // Load directory contents
  const loadDirectory = async (path: string = '') => {
    console.log('Loading directory:', path);
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    setFilePreview(null);

    try {
      const response = await fetch(FILE_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', relativePath: path })
      });

      const data = await response.json();
      const error = data.error;

      console.log('Directory load response:', data, error);

      if (error) {
        throw error;
      }

      if (data?.success) {
        setEntries(data.entries || []);
        setCurrentPath(path);
        
        // Update breadcrumbs
        if (path) {
          setBreadcrumbs(['Root', ...path.split('/')]);
        } else {
          setBreadcrumbs(['Root']);
        }
      } else {
        throw new Error(data?.error || 'Failed to load directory');
      }
    } catch (err: any) {
      console.error('Error loading directory:', err);
      const errorMessage = err?.message || 'Failed to load directory';
      setError(errorMessage);
      
      // Show toast for edge function not found
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        toaster.show({
          message: 'File browser edge function not deployed. Run: supabase functions deploy file-browser',
          intent: Intent.DANGER,
          timeout: 0,
          icon: 'error'
        });
      } else {
        toaster.show({
          message: `Error: ${errorMessage}`,
          intent: Intent.DANGER,
          icon: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load file preview
  const loadFilePreview = async (file: FileEntry) => {
    console.log('Loading file preview:', file);
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('file-browser', {
        body: {
          action: 'read',
          relativePath: file.path
        }
      });

      if (error) throw error;

      if (data?.success) {
        setFilePreview({
          content: data.content,
          metadata: data.metadata,
          size: data.size,
          modified: data.modified
        });
      } else {
        throw new Error(data?.error || 'Failed to read file');
      }
    } catch (err: any) {
      console.error('Error reading file:', err);
      setError(err?.message || 'Failed to read file');
      toaster.show({
        message: `Error: ${err?.message}`,
        intent: Intent.DANGER,
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle directory navigation
  const handleDirectoryClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      loadDirectory(entry.path);
    } else {
      setSelectedFile(entry);
      loadFilePreview(entry);
    }
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      loadDirectory('');
    } else {
      const newPath = breadcrumbs.slice(1, index + 1).join('/');
      loadDirectory(newPath);
    }
  };

  // Handle file selection
  const handleSelectFile = () => {
    if (selectedFile && filePreview) {
      console.log('Selecting file:', selectedFile.path);
      onSelectFile(
        selectedFile.path,
        filePreview.content,
        filePreview.metadata
      );
      onClose();
    }
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Convert entries to tree nodes
  const convertToTreeNodes = (entries: FileEntry[]): any[] => {
    return entries.map(entry => ({
      id: entry.path,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon
            icon={entry.type === 'directory' ? 'folder-close' : 'document'}
            color={entry.type === 'directory' ? '#FFA500' : '#4A90E2'}
          />
          <span>{entry.name}</span>
          {entry.extension && (
            <Tag minimal intent={Intent.PRIMARY}>
              .{entry.extension}
            </Tag>
          )}
          {entry.size !== undefined && (
            <span style={{ color: '#999', fontSize: '0.9em' }}>
              {formatSize(entry.size)}
            </span>
          )}
        </div>
      ),
      isExpanded: false,
      hasCaret: false,
      nodeData: entry
    }));
  };

  // Render the dialog
  console.log('Rendering ServerFileBrowser, isOpen:', isOpen);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Browse Server Files"
      className="server-file-browser-dialog"
      style={{ 
        width: '900px',
        maxWidth: '90vw',
        height: '600px',
        maxHeight: '80vh'
      }}
    >
      <div className={Classes.DIALOG_BODY} style={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: 'calc(100% - 60px)',
        padding: '20px'
      }}>
        {/* Breadcrumb navigation */}
        <div style={{ 
          marginBottom: '15px', 
          padding: '8px 12px', 
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0
        }}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Icon icon="chevron-right" size={12} />}
              <Button
                minimal
                small
                onClick={() => handleBreadcrumbClick(index)}
                intent={index === breadcrumbs.length - 1 ? Intent.PRIMARY : Intent.NONE}
              >
                {crumb}
              </Button>
            </React.Fragment>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <Callout intent={Intent.DANGER} style={{ marginBottom: '15px' }}>
            <strong>Error:</strong> {error}
            {error.includes('not found') && (
              <div style={{ marginTop: '10px' }}>
                <strong>Solution:</strong>
                <pre style={{ marginTop: '5px' }}>
                  supabase functions deploy file-browser
                </pre>
              </div>
            )}
          </Callout>
        )}

        {/* Main content area */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* File tree */}
          <div style={{ 
            flex: '1', 
            overflowY: 'auto', 
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '15px',
            backgroundColor: '#fff'
          }}>
            {loading && !entries.length ? (
              <NonIdealState
                icon={<Spinner />}
                title="Loading..."
                description="Fetching directory contents"
              />
            ) : entries.length === 0 ? (
              <NonIdealState
                icon="folder-open"
                title="Empty Directory"
                description="No files or folders found in this directory"
              />
            ) : (
              <Tree
                contents={convertToTreeNodes(entries)}
                onNodeClick={(node) => handleDirectoryClick(node.nodeData as FileEntry)}
                onNodeDoubleClick={(node) => {
                  const entry = node.nodeData as FileEntry;
                  if (entry.type === 'file') {
                    handleSelectFile();
                  }
                }}
              />
            )}
          </div>

          {/* File preview panel */}
          {selectedFile && (
            <div style={{ 
              width: '400px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '15px',
              backgroundColor: '#fff',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px' }}>File Details</h3>
              
              <div style={{ marginBottom: '15px', fontSize: '14px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Name:</strong> {selectedFile.name}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Path:</strong> <code>{selectedFile.path}</code>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Size:</strong> {formatSize(selectedFile.size)}
                </div>
                {selectedFile.modified && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Modified:</strong> {new Date(selectedFile.modified).toLocaleString()}
                  </div>
                )}
              </div>

              {loading ? (
                <NonIdealState
                  icon={<Spinner size={20} />}
                  title="Loading preview..."
                />
              ) : filePreview?.metadata ? (
                <div>
                  {/* CSV/TSV Metadata */}
                  {filePreview.metadata.delimiter && (
                    <div style={{ marginBottom: '15px' }}>
                      <Tag intent={Intent.SUCCESS}>
                        {filePreview.metadata.extension?.toUpperCase()}
                      </Tag>
                      {' '}
                      <Tag minimal>
                        {filePreview.metadata.columnCount} columns
                      </Tag>
                      {' '}
                      <Tag minimal>
                        {filePreview.metadata.lineCount} lines
                      </Tag>
                    </div>
                  )}

                  {/* Headers */}
                  {filePreview.metadata.headers && (
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Headers:</strong>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '5px',
                        marginTop: '8px'
                      }}>
                        {filePreview.metadata.headers.map((header: string, idx: number) => (
                          <Tag key={idx} minimal>
                            {header}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content preview */}
                  {filePreview.metadata.preview && (
                    <div>
                      <strong>Preview:</strong>
                      <pre style={{ 
                        backgroundColor: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        maxHeight: '200px',
                        overflow: 'auto',
                        marginTop: '8px'
                      }}>
                        {filePreview.metadata.preview.slice(0, 5).join('\n')}
                      </pre>
                    </div>
                  )}

                  {/* JSON metadata */}
                  {filePreview.metadata.isArray !== undefined && (
                    <div>
                      <Tag intent={Intent.SUCCESS}>JSON</Tag>
                      {filePreview.metadata.isArray && (
                        <Tag minimal>{filePreview.metadata.recordCount} records</Tag>
                      )}
                      {filePreview.metadata.sampleKeys && (
                        <div style={{ marginTop: '8px' }}>
                          <strong>Keys:</strong> {filePreview.metadata.sampleKeys.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            intent={Intent.PRIMARY} 
            onClick={handleSelectFile}
            disabled={!selectedFile || selectedFile.type !== 'file' || !filePreview}
          >
            Select File
          </Button>
        </div>
      </div>
    </Dialog>
  );
};