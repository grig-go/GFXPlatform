import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Race, getFieldValue } from "../types/election";
import { currentElectionYear } from '../utils/constants';
import { supabase } from "../utils/supabase/client";
import { 
  Search, 
  Filter,
  Database,
  Sparkles,
  LoaderIcon,
  Bug
} from "lucide-react";

interface ElectionFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedRaceType: string;
  onRaceTypeChange: (type: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  onClearFilters: () => void;
  states: string[];
  races: Race[];
  resultCount: number;
  lastUpdated: string;
  onShowSyntheticRaces: (syntheticRaces: any[]) => void; // Callback to pass synthetic races to parent
  showingSyntheticRaces: boolean; // Whether synthetic races are currently being displayed
  onHideSyntheticRaces: () => void; // Callback to hide synthetic races
  onDebugPayload: () => void; // Callback to show debug data
  isLoadingDebugData: boolean; // Loading state for debug data
}

interface GenerationResults {
  scenario: string;
  confidence: number;
  recordsGenerated: number;
  keyShifts: string;
}

export function ElectionFilters({
  searchTerm,
  onSearchChange,
  selectedRaceType,
  onRaceTypeChange,
  selectedStatus,
  onStatusChange,
  selectedState,
  onStateChange,
  selectedYear,
  onYearChange,
  onClearFilters,
  states,
  races,
  resultCount,
  lastUpdated,
  onShowSyntheticRaces,
  showingSyntheticRaces,
  onHideSyntheticRaces,
  onDebugPayload,
  isLoadingDebugData
}: ElectionFiltersProps) {
  
  // Synthetic data generation state
  const [syntheticDialogOpen, setSyntheticDialogOpen] = useState(false);
  const [baseDataset, setBaseDataset] = useState(String(currentElectionYear));
  const [selectedRace, setSelectedRace] = useState("");
  const [scenarioPrompt, setScenarioPrompt] = useState("");
  const [randomness, setRandomness] = useState([0.5]);
  const [regionFocus, setRegionFocus] = useState("swing-states");
  const [outputSize, setOutputSize] = useState([2000]);
  const [modelConfidence, setModelConfidence] = useState([0.8]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<GenerationResults | null>(null);
  
  const clearFilters = () => {
    onSearchChange("");
    onRaceTypeChange("all");
    onStatusChange("all");
    onStateChange("all");
    //onYearChange(String(currentElectionYear));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate generation process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock results based on input
    const mockResults: GenerationResults = {
      scenario: scenarioPrompt || "3% increase in independent turnout in swing states",
      confidence: modelConfidence[0],
      recordsGenerated: Math.floor(outputSize[0] * (0.8 + Math.random() * 0.4)),
      keyShifts: "Pennsylvania +2.4%, Michigan +1.8%, Georgia +1.2%"
    };
    
    setGenerationResults(mockResults);
    setIsGenerating(false);
  };

  const handleSaveDataset = () => {
    // This would trigger adding a new year dataset
    // For now, we'll just close the dialog
    setSyntheticDialogOpen(false);
    setGenerationResults(null);
    setScenarioPrompt("");
    setBaseDataset(String(currentElectionYear));
    setSelectedRace("");
    // In a real implementation, this would call a prop function to add the new dataset
  };

  const handleCancelGeneration = () => {
    setSyntheticDialogOpen(false);
    setGenerationResults(null);
    setScenarioPrompt("");
    setIsGenerating(false);
    setBaseDataset(String(currentElectionYear));
    setSelectedRace("");
  };

  // Fetch synthetic races from database
  const handleFetchSyntheticRaces = async () => {
    try {
      setIsGenerating(true);
      
      // First, get the list of all synthetic race IDs
      const { data: raceList, error: listError } = await supabase.rpc('e_list_synthetic_races');
      
      console.log("Synthetic race list:", raceList);
      
      if (listError) {
        console.error("Error fetching synthetic race list:", listError);
        return;
      }
      
      if (!raceList || !Array.isArray(raceList) || raceList.length === 0) {
        console.log("No synthetic races found");
        onShowSyntheticRaces([]);
        return;
      }
      
      // Fetch full details for each synthetic race
      const fullRaces = await Promise.all(
        raceList.map(async (race: any) => {
          const raceId = race.synthetic_race_id || race.id;
          const { data, error } = await supabase.rpc("e_get_synthetic_race_full", {
            p_synthetic_race_id: raceId,
          });
          
          if (error) {
            console.error(`Error fetching full details for race ${raceId}:`, error);
            return null;
          }
          
          console.log("FULL SYNTHETIC RACE (raw RPC response):", data);
          // RPC returns an array, extract the first element which is the race object
          const raceData = Array.isArray(data) && data.length > 0 ? data[0] : data;
          console.log("EXTRACTED RACE DATA:", raceData);
          return raceData;
        })
      );
      
      // Filter out any null results from errors
      const validRaces = fullRaces.filter(race => race !== null);
      
      console.log("All full synthetic races:", validRaces);
      
      // Pass synthetic races to parent component for display
      onShowSyntheticRaces(validRaces);
    } catch (err) {
      console.error("Error fetching synthetic races:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset selected race when base dataset changes
  useEffect(() => {
    setSelectedRace("");
  }, [baseDataset]);

  // Get statistics
  const totalRaces = races.length;
  const calledRaces = races.filter(race => getFieldValue(race.status) === 'CALLED').length;
  const projectedRaces = races.filter(race => getFieldValue(race.status) === 'PROJECTED').length;

  const years: Array<{ key: string; label: string }> = [
    { key: '2024', label: '2024' },
    { key: '2022', label: '2022' },
    { key: '2020', label: '2020' },
    { key: '2018', label: '2018' },
    { key: '2016', label: '2016' },
    { key: '2014', label: '2014' },
    { key: '2012', label: '2012' }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        {/* Statistics Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <span className="text-sm">
              <span className="font-semibold">{totalRaces}</span> races
            </span>
            <span className="text-sm">
              <span className="font-semibold">{calledRaces}</span> called
            </span>
            <span className="text-sm">
              <span className="font-semibold">{projectedRaces}</span> projected
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </div>

        {/* Election Year Data Sets */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={showingSyntheticRaces ? "default" : "outline"}
            size="sm"
            onClick={handleFetchSyntheticRaces}
            className="gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <LoaderIcon className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Synthetic Data
              </>
            )}
          </Button>
          {years.map((year) => (
            <Button
              key={year.key}
              variant={selectedYear === year.key && !showingSyntheticRaces ? "default" : "outline"}
              size="sm"
              onClick={() => {
                onHideSyntheticRaces();
                onYearChange(year.key);
              }}
            >
              {year.label}
            </Button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search races or candidates..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedRaceType} onValueChange={onRaceTypeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Race Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Race Types</SelectItem>
              <SelectItem value="PRESIDENTIAL">Presidential</SelectItem>
              <SelectItem value="SENATE">Senate</SelectItem>
              <SelectItem value="HOUSE">House</SelectItem>
              <SelectItem value="GOVERNOR">Governor</SelectItem>
              <SelectItem value="LOCAL">Local</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedState} onValueChange={onStateChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="NOT_CALLED">Not Called</SelectItem>
              <SelectItem value="PROJECTED">Projected</SelectItem>
              <SelectItem value="CALLED">Called</SelectItem>
              <SelectItem value="RECOUNT">Recount</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear
          </Button>

          {showingSyntheticRaces && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDebugPayload}
              className="gap-2"
              disabled={isLoadingDebugData}
            >
              {isLoadingDebugData ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Bug className="w-4 h-4" />
                  Debug Payload
                </>
              )}
            </Button>
          )}
        </div>

        {/* Active Filters */}
        {(searchTerm || selectedRaceType !== "all" || selectedState !== "all" || selectedStatus !== "all" || selectedYear !== String(currentElectionYear)) && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchTerm}
                <button
                  onClick={() => onSearchChange("")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedRaceType !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Type: {selectedRaceType}
                <button
                  onClick={() => onRaceTypeChange("all")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedState !== "all" && (
              <Badge variant="secondary" className="gap-1">
                State: {selectedState}
                <button
                  onClick={() => onStateChange("all")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedStatus !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Status: {selectedStatus.replace('_', ' ')}
                <button
                  onClick={() => onStatusChange("all")}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
            {selectedYear !== String(currentElectionYear) && (
              <Badge variant="secondary" className="gap-1">
                Year: {selectedYear}
                <button
                  onClick={() => onYearChange(String(currentElectionYear))}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results Count */}
        {(searchTerm || selectedRaceType !== "all" || selectedState !== "all" || selectedStatus !== "all" || selectedYear !== String(currentElectionYear)) && (
          <div className="text-sm text-muted-foreground mt-2">
            {resultCount} race{resultCount !== 1 ? 's' : ''} found
          </div>
        )}
      </CardContent>

      {/* Synthetic Data Generation Dialog */}
      <Dialog open={syntheticDialogOpen} onOpenChange={setSyntheticDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Synthetic Election Data
            </DialogTitle>
            <DialogDescription>
              Create simulated election data based on your scenario parameters and generation settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!generationResults ? (
              <>
                {/* A. Base Dataset */}
                <div className="space-y-2">
                  <Label>📊 Base Dataset</Label>
                  <Select value={baseDataset} onValueChange={setBaseDataset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.key} value={year.key}>
                          {year.label} U.S. Elections
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Race Selection */}
                <div className="space-y-2">
                  <Label>Race (Optional)</Label>
                  <Select value={selectedRace} onValueChange={setSelectedRace}>
                    <SelectTrigger>
                      <SelectValue placeholder="All races in dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All races in dataset</SelectItem>
                      {races.slice(0, 20).map((race) => {
                        const raceTitle = getFieldValue(race.title);
                        const raceType = getFieldValue(race.raceType);
                        const state = race.state;
                        return (
                          <SelectItem key={race.id} value={race.id}>
                            {state} - {raceType}: {raceTitle}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* B. Scenario Prompt */}
                <div className="space-y-2">
                  <Label>Scenario Prompt</Label>
                  <Textarea
                    placeholder="Simulate a 3% increase in independent voter turnout in swing states"
                    value={scenarioPrompt}
                    onChange={(e) => setScenarioPrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* C. Generation Settings */}
                <div className="space-y-4">
                  <Label>Generation Settings (Optional)</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Randomness: {randomness[0].toFixed(1)}</Label>
                      <Slider
                        value={randomness}
                        onValueChange={setRandomness}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Region Focus</Label>
                      <Select value={regionFocus} onValueChange={setRegionFocus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="swing-states">Swing States</SelectItem>
                          <SelectItem value="all-states">All States</SelectItem>
                          <SelectItem value="urban">Urban Areas</SelectItem>
                          <SelectItem value="rural">Rural Areas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Output Size: {outputSize[0]} records</Label>
                      <Slider
                        value={outputSize}
                        onValueChange={setOutputSize}
                        max={5000}
                        min={500}
                        step={100}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Model Confidence: {modelConfidence[0].toFixed(2)}</Label>
                      <Slider
                        value={modelConfidence}
                        onValueChange={setModelConfidence}
                        max={1}
                        min={0.5}
                        step={0.01}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* D. Generate Button */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelGeneration}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <LoaderIcon className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              /* Results Display */
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 dark:text-green-100 mb-3">Generation Complete</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Scenario:</strong> {generationResults.scenario}</p>
                    <p><strong>Model confidence:</strong> {generationResults.confidence.toFixed(2)}</p>
                    <p><strong>Generated:</strong> {generationResults.recordsGenerated.toLocaleString()} synthetic records</p>
                    <p><strong>Key shifts detected:</strong> {generationResults.keyShifts}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelGeneration}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveDataset}
                    className="gap-2"
                  >
                    <Database className="w-4 h-4" />
                    Save Dataset
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}