import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { RefreshCw, ArrowLeft, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { JsonMappingConfig } from '../../../types/jsonMapping.types';
import { useMappingEngine } from '../hooks/useMappingEngine';

interface MappingPreviewProps {
  config: JsonMappingConfig;
  sampleData: Record<string, any>;
  onTest?: () => void;
  onPrevious: () => void;
}

export const MappingPreview: React.FC<MappingPreviewProps> = ({
  config,
  sampleData,
  onTest,
  onPrevious
}) => {
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const { generatePreview, validateMapping } = useMappingEngine(config, sampleData);

  useEffect(() => {
    generatePreviewData();
    validateConfiguration();
  }, [config]);

  const generatePreviewData = async () => {
    setIsLoading(true);
    try {
      const result = await generatePreview();
      setPreview(result);
    } catch (error) {
      console.error('Preview generation failed:', error);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const validateConfiguration = () => {
    const result = validateMapping();
    setValidationResult(result);
  };

  const getMappingStats = () => {
    const totalFields = config.outputTemplate.fields.length;
    const mappedFields = config.fieldMappings.length;
    const requiredFields = config.outputTemplate.fields.filter(f => f.required).length;
    const mappedRequired = config.outputTemplate.fields
      .filter(f => f.required)
      .filter(f => config.fieldMappings.some(m => m.targetPath === f.path))
      .length;

    return {
      totalFields,
      mappedFields,
      requiredFields,
      mappedRequired,
      completeness: Math.round((mappedFields / totalFields) * 100)
    };
  };

  const stats = getMappingStats();

  return (
    <div className="mapping-preview space-y-4">
      {/* Validation Status */}
      {validationResult && (
        <Alert className={validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
          {validationResult.valid ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription>
            {validationResult.valid ? (
              'Configuration is valid and ready to use!'
            ) : (
              <>
                <strong>Configuration Issues:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {validationResult.errors.map((error: string, i: number) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapping Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.mappedFields}/{stats.totalFields}</div>
              <div className="text-sm text-gray-600 mt-1">Fields Mapped</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.completeness}%</div>
              <div className="text-sm text-gray-600 mt-1">Completeness</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{stats.mappedRequired}/{stats.requiredFields}</div>
              <div className="text-sm text-gray-600 mt-1">Required Fields</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{config.transformations?.length || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Transformations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Output */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Output Preview</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={generatePreviewData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : preview ? (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm whitespace-pre-wrap break-words">
              {JSON.stringify(preview, null, 2)}
            </pre>
          ) : (
            <Alert>
              <AlertDescription>
                No preview available. Check your mapping configuration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={onPrevious}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        {onTest && (
          <Button
            onClick={onTest}
            disabled={!validationResult?.valid}
          >
            <Play className="w-4 h-4 mr-2" />
            Test Mapping
          </Button>
        )}
      </div>
    </div>
  );
};
