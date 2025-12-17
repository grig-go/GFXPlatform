import { useState } from "react";
import { Agent } from "../types/agents";
import { Feed } from "../types/feeds";
import { AgentWizard } from "./AgentWizard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  Pencil, 
  Copy, 
  Trash2, 
  ExternalLink,
  MoreVertical,
  Bot
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentsDashboardProps {
  agents: Agent[];
  feeds?: Feed[];
  onAddAgent: (agent: Agent) => void;
  onUpdateAgent: (agent: Agent) => void;
  onDeleteAgent: (agentId: string) => void;
  lastUpdated: string;
}

export function AgentsDashboard({
  agents,
  feeds = [],
  onAddAgent,
  onUpdateAgent,
  onDeleteAgent,
  lastUpdated
}: AgentsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);

  // Transform feeds to format expected by AgentWizard
  const availableFeeds = feeds.map(feed => ({
    id: feed.id,
    name: feed.name,
    category: feed.category
  }));

  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    return (
      agent.name.toLowerCase().includes(searchLower) ||
      (agent.url && agent.url.toLowerCase().includes(searchLower)) ||
      agent.format.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setWizardOpen(true);
  };

  const handleDuplicate = (agent: Agent) => {
    const duplicatedAgent: Agent = {
      ...agent,
      id: `agent-${Date.now()}`,
      name: `${agent.name} (Copy)`,
      created: new Date().toISOString(),
      runCount: 0
    };
    onAddAgent(duplicatedAgent);
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setEditingAgent(undefined);
  };

  const handleWizardSave = (agent: Agent) => {
    if (editingAgent) {
      onUpdateAgent(agent);
    } else {
      onAddAgent(agent);
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'PAUSED':
        return 'bg-yellow-500';
      case 'ERROR':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Bot className="w-6 h-6 text-purple-600" />
            Agents
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure and manage AI-powered data agents
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Agent
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAgents.length} of {agents.length} agents
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Agent URL</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cache</TableHead>
              <TableHead>Auth</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No agents found. Create your first agent to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => (
                <TableRow key={agent.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent.icon || '📡'}</span>
                      <span className="font-medium">{agent.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {agent.dataType ? (
                      <Badge variant="secondary">{agent.dataType}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-muted-foreground max-w-[300px] truncate block">
                        {agent.url || 'Not configured'}
                      </code>
                      {agent.url && (
                        <a 
                          href={agent.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{agent.format}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(agent.status)} text-white`}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{agent.cache}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{agent.auth}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(agent.created), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleEdit(agent)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleDuplicate(agent)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-destructive"
                        onClick={() => onDeleteAgent(agent.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Wizard Dialog */}
      <AgentWizard
        open={wizardOpen}
        onClose={handleWizardClose}
        onSave={handleWizardSave}
        editAgent={editingAgent}
        availableFeeds={availableFeeds}
      />
    </div>
  );
}
