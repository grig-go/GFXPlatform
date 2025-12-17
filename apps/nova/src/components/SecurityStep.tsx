import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Eye, EyeOff, Plus, Trash2, Key, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useToast } from './ui/use-toast';
import { CurlCommandGenerator } from './CurlCommandGenerator';
import type { Agent, AgentCacheType } from '../types/agents';
import { isDevelopment, SKIP_AUTH_IN_DEV, DEV_USER_ID } from '../utils/constants';

interface SecurityStepProps {
  formData: Partial<Agent>;
  setFormData: (data: Partial<Agent>) => void;
  agentId?: string;
}

export interface SecurityStepRef {
  syncAuthToFormData: () => { requiresAuth: boolean; auth: string; authConfig: any };
  cleanupDraft: () => Promise<void>;
}

interface APIKey {
  id: string;
  key: string;
  name?: string;
  active: boolean;
  created_at: string;
}

interface BasicAuthUser {
  id: string;
  username: string;
  password: string;
}

export const SecurityStep = forwardRef<SecurityStepRef, SecurityStepProps>(({
  formData,
  setFormData,
  agentId
}, ref) => {
  const { toast } = useToast();
  const [authEnabled, setAuthEnabled] = useState(formData.requiresAuth || false);
  const [authType, setAuthType] = useState<'api-key' | 'bearer' | 'basic' | 'oauth2' | 'custom'>(
    (formData.auth as any) || 'api-key'
  );

  // API Key state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [apiKeyHeaderName, setApiKeyHeaderName] = useState(
    formData.authConfig?.header_name || 'X-API-Key'
  );
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

  // Bearer Token state
  const [bearerTokens, setBearerTokens] = useState(
    formData.authConfig?.allowed_tokens?.join('\n') || ''
  );

  // Basic Auth state
  const [basicAuthUsers, setBasicAuthUsers] = useState<BasicAuthUser[]>(
    formData.authConfig?.users || []
  );
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Test Authentication state
  const [testToken, setTestToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Auto-save state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Track if component is initialized to prevent sync loop
  const isInitializedRef = useRef(false);

  // Store latest auth settings in ref (updated synchronously, not in useEffect)
  const authSettingsRef = useRef({
    authEnabled,
    authType,
    apiKeys,
    bearerTokens,
    basicAuthUsers,
    apiKeyHeaderName
  });

  // Update ref synchronously whenever state changes (before any renders)
  authSettingsRef.current = {
    authEnabled,
    authType,
    apiKeys,
    bearerTokens,
    basicAuthUsers,
    apiKeyHeaderName
  };

  // Initialize authentication data from formData (only on mount or when editing)
  useEffect(() => {
    if (formData.authConfig && !isInitializedRef.current) {
      if (authType === 'api-key' && formData.authConfig.keys) {
        setApiKeys(formData.authConfig.keys); // Use 'keys' to match nova-old structure
      }
      if (authType === 'bearer' && formData.authConfig.allowed_tokens) {
        setBearerTokens(formData.authConfig.allowed_tokens.join('\n'));
      }
      if (authType === 'basic' && formData.authConfig.users) {
        setBasicAuthUsers(formData.authConfig.users);
      }
      isInitializedRef.current = true;
    }
  }, [formData.authConfig, authType]);

  // Sync auth settings to parent immediately when they change (like nova-old)
  useEffect(() => {
    // Skip sync on first render
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    const authConfig = authEnabled ? (() => {
      switch (authType) {
        case 'api-key':
          return {
            header_name: apiKeyHeaderName,
            keys: apiKeys
          };
        case 'bearer':
          return {
            allowed_tokens: bearerTokens.split('\n').filter((t: string) => t.trim())
          };
        case 'basic':
          return {
            users: basicAuthUsers
          };
        default:
          return {};
      }
    })() : undefined;

    setFormData(prev => ({
      ...prev,
      requiresAuth: authEnabled,
      auth: authEnabled ? authType : 'none',
      authConfig
    }));
  }, [authEnabled, authType, apiKeys, bearerTokens, basicAuthUsers, apiKeyHeaderName]);

  // Auto-save draft for testing (DISABLED - causes duplicate issues)
  useEffect(() => {
    return; // Disabled to prevent draft conflicts with save
    if (!authEnabled) return;

    const saveDraft = async () => {
      setSaving(true);
      try {
        const draftData = {
          slug: formData.slug || `draft-${Date.now()}`,
          name: formData.name || 'Draft Agent',
          description: formData.description || 'Draft for authentication testing',
          output_format: 'json' as const,
          auth_config: {
            required: authEnabled,
            type: authType,
            config: getAuthConfig()
          },
          active: true,  // Must be active for testing
          schema_config: {
            type: 'custom',
            schema: {},
            mapping: []
          },
          transform_config: { transformations: [] },
          relationship_config: { relationships: [] },
          cache_config: { enabled: false, ttl: 300 },
          rate_limit_config: { enabled: false, requests_per_minute: 60 }
        };

        if (draftId) {
          // Update existing draft
          const { error } = await supabase
            .from('api_endpoints')
            .update(draftData)
            .eq('id', draftId);

          if (error) throw error;
        } else {
          // Check if a draft already exists for this slug and user
          let userId = DEV_USER_ID;

          if (!isDevelopment || !SKIP_AUTH_IN_DEV) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              throw new Error('Not authenticated');
            }
            userId = user.id;
          }

          const { data: existingDraft } = await supabase
            .from('api_endpoints')
            .select('id')
            .eq('slug', formData.slug)
            .eq('user_id', userId)
            .eq('is_draft', true)
            .maybeSingle();

          if (existingDraft) {
            // Update existing draft
            const { error } = await supabase
              .from('api_endpoints')
              .update(draftData)
              .eq('id', existingDraft.id);

            if (error) throw error;
            setDraftId(existingDraft.id);
          } else {
            // Create new draft
            const { data, error } = await supabase
              .from('api_endpoints')
              .insert({
                ...draftData,
                user_id: userId,
                is_draft: true
              })
              .select()
              .single();

            if (error) throw error;
            if (data) setDraftId(data.id);
          }
        }

        setLastSaved(new Date());
      } catch (error: any) {
        console.error('Failed to save draft:', error);
      } finally {
        setSaving(false);
      }
    };

    // Debounce auto-save
    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [authEnabled, authType, apiKeys, bearerTokens, basicAuthUsers, apiKeyHeaderName, draftId, formData.slug, formData.name]);

  // Cleanup draft on unmount
  useEffect(() => {
    return () => {
      if (draftId) {
        supabase
          .from('api_endpoints')
          .delete()
          .eq('id', draftId)
          .then(() => console.log('Draft cleaned up'));
      }
    };
  }, [draftId]);

  const getAuthConfig = () => {
    switch (authType) {
      case 'api-key':
        return {
          header_name: apiKeyHeaderName,
          keys: apiKeys // Use 'keys' to match nova-old structure
        };
      case 'bearer':
        return {
          allowed_tokens: bearerTokens.split('\n').filter(t => t.trim())
        };
      case 'basic':
        return {
          users: basicAuthUsers
        };
      default:
        return {};
    }
  };

  // Expose method to sync auth settings to parent (for "Save" button)
  useImperativeHandle(ref, () => ({
    syncAuthToFormData: () => {
      // Use the ref to get the latest auth settings
      const authSettings = authSettingsRef.current;

      // For Basic Auth, auto-add pending username/password if they exist
      let finalBasicAuthUsers = authSettings.basicAuthUsers;
      if (authSettings.authType === 'basic' && newUsername && newPassword) {
        const newUser: BasicAuthUser = {
          id: `user-${Date.now()}`,
          username: newUsername,
          password: newPassword
        };
        finalBasicAuthUsers = [...authSettings.basicAuthUsers, newUser];

        // Update the state so it shows in the UI (async)
        setBasicAuthUsers(finalBasicAuthUsers);

        // Update the ref immediately (sync) so the save uses the correct data
        authSettingsRef.current.basicAuthUsers = finalBasicAuthUsers;

        // Clear the input fields
        setNewUsername('');
        setNewPassword('');
      }

      const authConfig = authSettings.authEnabled ? (() => {
        switch (authSettings.authType) {
          case 'api-key':
            return {
              header_name: authSettings.apiKeyHeaderName,
              keys: authSettings.apiKeys
            };
          case 'bearer':
            return {
              allowed_tokens: authSettings.bearerTokens.split('\n').filter((t: string) => t.trim())
            };
          case 'basic':
            return {
              users: finalBasicAuthUsers
            };
          default:
            return {};
        }
      })() : undefined;

      // Still update formData for backward compatibility
      setFormData(prev => ({
        ...prev,  // IMPORTANT: Preserve all existing formData fields
        requiresAuth: authSettings.authEnabled,
        auth: authSettings.authEnabled ? authSettings.authType : 'none',
        authConfig
      }));

      // Return the auth data synchronously so handleSave can use it immediately
      return {
        requiresAuth: authSettings.authEnabled,
        auth: authSettings.authEnabled ? authSettings.authType : 'none',
        authConfig
      };
    },
    cleanupDraft: async () => {
      // Delete the draft from database before saving the real agent
      if (draftId) {
        await supabase
          .from('api_endpoints')
          .delete()
          .eq('id', draftId);
        setDraftId(null); // Clear the draft ID
        console.log('Draft cleaned up before save');
      }
    }
  }));

  // Generate a random API key
  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  // Add new API key
  const addApiKey = () => {
    const newKey: APIKey = {
      id: `key-${Date.now()}`,
      key: generateApiKey(),
      name: `API Key ${apiKeys.length + 1}`,
      active: true,
      created_at: new Date().toISOString()
    };
    setApiKeys([...apiKeys, newKey]);
    toast({
      title: 'API Key Generated',
      description: 'A new API key has been generated'
    });
  };

  // Remove API key
  const removeApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  // Toggle API key active status
  const toggleApiKeyActive = (id: string) => {
    setApiKeys(apiKeys.map(k =>
      k.id === id ? { ...k, active: !k.active } : k
    ));
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKeys({ ...showApiKeys, [id]: !showApiKeys[id] });
  };

  // Add basic auth user
  const addBasicAuthUser = () => {
    if (!newUsername || !newPassword) {
      toast({
        title: 'Missing credentials',
        description: 'Please provide both username and password',
        variant: 'destructive'
      });
      return;
    }

    const newUser: BasicAuthUser = {
      id: `user-${Date.now()}`,
      username: newUsername,
      password: newPassword
    };

    setBasicAuthUsers([...basicAuthUsers, newUser]);
    setNewUsername('');
    setNewPassword('');
    toast({
      title: 'User Added',
      description: 'New user credentials have been added'
    });
  };

  // Remove basic auth user
  const removeBasicAuthUser = (id: string) => {
    setBasicAuthUsers(basicAuthUsers.filter(u => u.id !== id));
  };

  // Test authentication
  const testAuthentication = async () => {
    if (!testToken) {
      toast({
        title: 'Missing token',
        description: 'Please provide a token to test',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Simulate authentication validation
      let isValid = false;

      switch (authType) {
        case 'api-key':
          isValid = apiKeys.some(k => k.key === testToken && k.active);
          break;
        case 'bearer':
          const tokens = bearerTokens.split('\n').filter(t => t.trim());
          isValid = tokens.includes(testToken);
          break;
        case 'basic':
          const [username, password] = testToken.split(':');
          isValid = basicAuthUsers.some(
            u => u.username === username && u.password === password
          );
          break;
      }

      setTestResult({
        success: isValid,
        message: isValid
          ? 'Authentication successful!'
          : 'Authentication failed: Invalid credentials'
      });

      toast({
        title: isValid ? 'Authentication Successful' : 'Authentication Failed',
        description: isValid
          ? 'The provided credentials are valid'
          : 'The provided credentials are invalid',
        variant: isValid ? 'default' : 'destructive'
      });

    } catch (error: any) {
      console.error('Test authentication error:', error);
      setTestResult({
        success: false,
        message: `Test failed: ${error.message}`
      });
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="auth-enabled"
          checked={authEnabled}
          onCheckedChange={setAuthEnabled}
        />
        <div className="space-y-0.5">
          <Label htmlFor="auth-enabled" className="text-base font-medium cursor-pointer">
            Enable Authentication
          </Label>
          <p className="text-sm text-muted-foreground">
            Require authentication to access this agent
          </p>
        </div>
      </div>

      {authEnabled && (
        <>
          {/* Auto-save indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Ready to test (saved {lastSaved.toLocaleTimeString()})</span>
              </>
            ) : null}
          </div>

          {/* Authentication Type Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">Authentication Type</Label>
            <RadioGroup value={authType} onValueChange={(value: any) => setAuthType(value)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="api-key" id="api-key" className="border-2 border-gray-700" />
                  <Label htmlFor="api-key" className="cursor-pointer font-normal">
                    API Key - Simple key-based authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bearer" id="bearer" className="border-2 border-gray-700" />
                  <Label htmlFor="bearer" className="cursor-pointer font-normal">
                    Bearer Token - Token-based authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="basic" id="basic" className="border-2 border-gray-700" />
                  <Label htmlFor="basic" className="cursor-pointer font-normal">
                    Basic Auth - Username and password authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oauth2" id="oauth2" className="border-2 border-gray-700" />
                  <Label htmlFor="oauth2" className="cursor-pointer font-normal">
                    OAuth 2.0 - OAuth 2.0 authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" className="border-2 border-gray-700" />
                  <Label htmlFor="custom" className="cursor-pointer font-normal">
                    Custom - Custom authentication method
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* API Key Configuration */}
          {authType === 'api-key' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Key Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="header-name">Header Name</Label>
                  <Input
                    id="header-name"
                    value={apiKeyHeaderName}
                    onChange={(e) => setApiKeyHeaderName(e.target.value)}
                    placeholder="X-API-Key"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The HTTP header name where the API key will be sent
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>API Keys</Label>
                    <Button size="sm" onClick={addApiKey}>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Key
                    </Button>
                  </div>

                  {apiKeys.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No API keys configured. Generate at least one key to enable authentication.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((apiKey) => (
                        <Card key={apiKey.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={apiKey.active}
                              onCheckedChange={() => toggleApiKeyActive(apiKey.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showApiKeys[apiKey.id] ? 'text' : 'password'}
                                  value={apiKey.key}
                                  readOnly
                                  className="font-mono text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleApiKeyVisibility(apiKey.id)}
                                >
                                  {showApiKeys[apiKey.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(apiKey.key);
                                    toast({
                                      title: 'Copied!',
                                      description: 'API key copied to clipboard'
                                    });
                                  }}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeApiKey(apiKey.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {apiKey.active ? 'Active' : 'Inactive'} • Created {new Date(apiKey.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bearer Token Configuration */}
          {authType === 'bearer' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bearer Token Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bearer-tokens">Allowed Tokens</Label>
                  <Textarea
                    id="bearer-tokens"
                    value={bearerTokens}
                    onChange={(e) => setBearerTokens(e.target.value)}
                    placeholder="Enter one token per line&#10;token1&#10;token2&#10;token3"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter one bearer token per line. Only these tokens will be accepted.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Auth Configuration */}
          {authType === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Auth Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Add User Credentials</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button onClick={addBasicAuthUser}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {basicAuthUsers.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No users configured. Add at least one username/password pair.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    <Label>Configured Users</Label>
                    {basicAuthUsers.map((user) => (
                      <Card key={user.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-xs text-muted-foreground">
                              Password: {user.password.replace(/./g, '•')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBasicAuthUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* OAuth2 Configuration */}
          {authType === 'oauth2' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OAuth 2.0 Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    OAuth 2.0 configuration will be available in a future update.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Custom Authentication Configuration */}
          {authType === 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Authentication Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Custom authentication configuration will be available in a future update.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Test Authentication */}
          {authType !== 'oauth2' && authType !== 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-token">
                    {authType === 'api-key' && 'API Key'}
                    {authType === 'bearer' && 'Bearer Token'}
                    {authType === 'basic' && 'Username:Password'}
                  </Label>
                  <Input
                    id="test-token"
                    type={authType === 'basic' ? 'text' : 'password'}
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    placeholder={
                      authType === 'api-key' ? 'Enter API key to test' :
                      authType === 'bearer' ? 'Enter bearer token to test' :
                      'Enter username:password'
                    }
                  />
                </div>

                <Button
                  onClick={testAuthentication}
                  disabled={!testToken || testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Test Authentication
                    </>
                  )}
                </Button>

                {testResult && (
                  <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertTitle className={testResult.success ? 'text-green-900' : 'text-red-900'}>
                      {testResult.success ? 'Authentication Successful' : 'Authentication Failed'}
                    </AlertTitle>
                    <AlertDescription className={testResult.success ? 'text-green-900' : 'text-red-900'}>
                      <pre className="mt-2 text-xs overflow-auto">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Curl Command Generator */}
          {formData.slug && (
            <CurlCommandGenerator
              endpoint={{
                slug: formData.slug,
                authentication: {
                  required: authEnabled,
                  type: authType,
                  config: getAuthConfig()
                }
              }}
            />
          )}
        </>
      )}

      {/* Cache Duration */}
      <div>
        <Label htmlFor="cache">Cache Duration</Label>
        <Select
          value={formData.cache || '15M'}
          onValueChange={(value: AgentCacheType) => setFormData({ ...formData, cache: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OFF">Off</SelectItem>
            <SelectItem value="5M">5 minutes</SelectItem>
            <SelectItem value="15M">15 minutes</SelectItem>
            <SelectItem value="30M">30 minutes</SelectItem>
            <SelectItem value="1H">1 hour</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Security Note */}
      <Alert className="bg-blue-50 border-blue-200">
        <Key className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Security Note</AlertTitle>
        <AlertDescription className="text-blue-900">
          {authEnabled
            ? 'Authentication is enabled. Only requests with valid credentials will be able to access this agent.'
            : 'This agent will be publicly accessible without authentication. Enable authentication to protect sensitive data.'}
        </AlertDescription>
      </Alert>
    </div>
  );
});

SecurityStep.displayName = 'SecurityStep';

export default SecurityStep;
