import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Divider,
  SelectChangeEvent,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface Channel {
  id: string;
  name: string;
  type: string;
  active?: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'channel' | 'playlist' | 'bucket';
  content_id?: string;
  children?: TreeNode[];
}

interface Bucket {
  id: string;
  name: string;
}

interface BucketMapping {
  originalBucketName: string;
  originalContentId: string;
  newBucketName: string | null;
  newContentId: string | null;
}

interface PasteChannelDialogProps {
  open: boolean;
  onClose: () => void;
  onPaste: (targetChannelId: string, targetChannelName: string, bucketMappings: BucketMapping[] | null) => void;
  copiedChannelName: string;
  copiedNode: TreeNode | null;
  availableChannels: Channel[];
  existingChannelIds: string[];
  allBuckets: Bucket[];
}

export const PasteChannelDialog: React.FC<PasteChannelDialogProps> = ({
  open,
  onClose,
  onPaste,
  copiedChannelName,
  copiedNode,
  availableChannels,
  existingChannelIds,
  allBuckets
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [retargetBuckets, setRetargetBuckets] = useState<boolean>(true);

  // Filter out channels that are already in the playlist (except inactive ones might be ok)
  const filteredChannels = useMemo(() => {
    return availableChannels.filter(
      channel => channel.active !== false && !existingChannelIds.includes(channel.id)
    );
  }, [availableChannels, existingChannelIds]);

  // Get selected channel name
  const selectedChannel = useMemo(() => {
    return availableChannels.find(ch => ch.id === selectedChannelId);
  }, [availableChannels, selectedChannelId]);

  // Calculate bucket mappings based on channel prefix swap
  const bucketMappings = useMemo((): BucketMapping[] => {
    if (!copiedNode || !selectedChannel || !retargetBuckets) {
      return [];
    }

    // Collect all buckets from the copied node tree
    const collectBucketsFromTree = (node: TreeNode): { name: string; contentId: string }[] => {
      const buckets: { name: string; contentId: string }[] = [];

      const traverse = (n: TreeNode) => {
        if (n.type === 'bucket' && n.content_id) {
          // Find the bucket name from allBuckets using content_id
          const bucket = allBuckets.find((b: Bucket) => b.id === n.content_id);
          if (bucket) {
            buckets.push({ name: bucket.name, contentId: n.content_id });
          }
        }
        if (n.children) {
          n.children.forEach(traverse);
        }
      };

      traverse(node);
      return buckets;
    };

    const bucketsInTree = collectBucketsFromTree(copiedNode);
    const sourcePrefix = copiedChannelName.toLowerCase();

    return bucketsInTree.map(({ name: bucketName, contentId }) => {
      // Check if bucket name starts with the source channel name (case insensitive)
      if (bucketName.toLowerCase().startsWith(sourcePrefix)) {
        // Extract the suffix after the channel name
        const suffix = bucketName.substring(copiedChannelName.length);

        // Build the new bucket name with the target channel prefix
        const newBucketName = selectedChannel.name + suffix;

        // Find a matching bucket in allBuckets (case insensitive)
        const matchingBucket = allBuckets.find(
          b => b.name.toLowerCase() === newBucketName.toLowerCase()
        );

        return {
          originalBucketName: bucketName,
          originalContentId: contentId,
          newBucketName: matchingBucket ? matchingBucket.name : newBucketName,
          newContentId: matchingBucket ? matchingBucket.id : null
        };
      }

      // Bucket doesn't match the source channel prefix - keep as is
      return {
        originalBucketName: bucketName,
        originalContentId: contentId,
        newBucketName: null,
        newContentId: null
      };
    });
  }, [copiedNode, selectedChannel, retargetBuckets, copiedChannelName, allBuckets]);

  // Count how many buckets will be retargeted
  const retargetedCount = bucketMappings.filter(m => m.newContentId !== null).length;
  const notFoundCount = bucketMappings.filter(m => m.newBucketName !== null && m.newContentId === null).length;
  const unchangedCount = bucketMappings.filter(m => m.newBucketName === null).length;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedChannelId('');
      setRetargetBuckets(true);
    }
  }, [open]);

  const handleChannelSelect = (event: SelectChangeEvent) => {
    setSelectedChannelId(event.target.value);
  };

  const handlePaste = () => {
    if (!selectedChannel) return;

    // Pass bucket mappings only if retargeting is enabled
    const mappings = retargetBuckets ? bucketMappings : null;
    onPaste(selectedChannelId, selectedChannel.name, mappings);
    onClose();
  };

  const getChannelTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'Unreal': 'Unreal Engine',
      'Vizrt': 'Vizrt',
      'Pixera': 'Pixera',
      'Web': 'Web'
    };
    return types[type] || type;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="paste-channel-dialog-title"
    >
      <DialogTitle id="paste-channel-dialog-title">
        Paste Channel: {copiedChannelName}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Select a target channel to paste the copied channel's playlists and buckets into.
          </Typography>

          <FormControl fullWidth required>
            <InputLabel id="channel-label">Target Channel</InputLabel>
            <Select
              labelId="channel-label"
              value={selectedChannelId}
              label="Target Channel"
              onChange={handleChannelSelect}
            >
              {filteredChannels.length === 0 ? (
                <MenuItem disabled>
                  <Typography color="text.secondary">No available channels</Typography>
                </MenuItem>
              ) : (
                [...filteredChannels].sort((a, b) => a.name.localeCompare(b.name)).map((channel) => (
                  <MenuItem key={channel.id} value={channel.id}>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{channel.name}</span>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                        {getChannelTypeLabel(channel.type)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {filteredChannels.length === 0 && (
            <Alert severity="warning">
              All available channels have already been added to the playlist.
              Please create a new channel first.
            </Alert>
          )}

          <Divider />

          <FormControlLabel
            control={
              <Checkbox
                checked={retargetBuckets}
                onChange={(e) => setRetargetBuckets(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">
                  Auto-retarget buckets to new channel
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Automatically swap bucket references from "{copiedChannelName}" to the target channel
                </Typography>
              </Box>
            }
          />

          {retargetBuckets && selectedChannel && bucketMappings.length > 0 && (
            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SwapHorizIcon fontSize="small" />
                Bucket Retargeting Preview
              </Typography>

              {retargetedCount > 0 && (
                <Alert severity="success" sx={{ mb: 1 }}>
                  {retargetedCount} bucket(s) will be retargeted
                </Alert>
              )}

              {notFoundCount > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {notFoundCount} bucket(s) not found - will keep original
                </Alert>
              )}

              {unchangedCount > 0 && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  {unchangedCount} bucket(s) don't match prefix - unchanged
                </Alert>
              )}

              <List dense sx={{ mt: 1 }}>
                {bucketMappings.map((mapping, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={
                        mapping.newContentId ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                              {mapping.originalBucketName}
                            </Typography>
                            <SwapHorizIcon fontSize="small" color="success" />
                            <Typography variant="body2" color="success.main">
                              {mapping.newBucketName}
                            </Typography>
                          </Box>
                        ) : mapping.newBucketName ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {mapping.originalBucketName}
                            </Typography>
                            <Typography variant="caption" color="warning.main">
                              (target "{mapping.newBucketName}" not found)
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {mapping.originalBucketName} (no prefix match)
                          </Typography>
                        )
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {retargetBuckets && selectedChannel && bucketMappings.length === 0 && (
            <Alert severity="info">
              No buckets found in the copied channel structure.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handlePaste}
          variant="contained"
          color="primary"
          disabled={!selectedChannelId}
        >
          Paste Channel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
