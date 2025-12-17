import React, { useCallback, useState, useRef, useEffect } from 'react';
import { supabase, startSessionMonitor, sessionReady } from './lib/supabase';
import { Layout, Model, TabNode, Actions, DockLocation, IJsonModel } from 'flexlayout-react';
import { Button, ButtonGroup, Navbar, Alignment, Menu, MenuItem, MenuDivider, Popover, Position, Spinner } from '@blueprintjs/core';
import { StylesProvider } from '@mui/styles';
import TvIcon from '@mui/icons-material/Tv';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import DescriptionIcon from '@mui/icons-material/Description';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import BuildIcon from '@mui/icons-material/Build';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CampaignIcon from '@mui/icons-material/Campaign';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import WidgetsIcon from '@mui/icons-material/Widgets';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BoltIcon from '@mui/icons-material/Bolt';
import LogoutIcon from '@mui/icons-material/Logout';
import InfoIcon from '@mui/icons-material/Info';
import BugReportIcon from '@mui/icons-material/BugReport';
import AppsIcon from '@mui/icons-material/Apps';
import WindowIcon from '@mui/icons-material/Window';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import { TemplatesProvider } from './contexts/TemplatesContext';
import { CrossGridDragProvider } from './contexts/CrossGridDragContext';
import { GridStateProvider, useGridState } from './contexts/GridStateContext';
import ChannelsPage from './pages/ChannelsPage';
import ChannelPlaylistsPage from './pages/ChannelPlaylistsPage';
import ContentPage from './pages/ContentPage';
import TemplatesPage from './pages/TemplatesPage';
import IntegrationsPage from './pages/IntegrationsPage';
import WidgetWindowPage from './pages/WidgetWindowPage';
import WidgetBuilderPage from './pages/WidgetBuilderPage';
import ProductionWidgetPage from './pages/ProductionWidgetPage';
import VirtualSetPage from './pages/VirtualSetPage';
import SponsorSchedulingPage from './pages/SponsorSchedulingPage';
import BannerSchedulingPage from './pages/BannerSchedulingPage';
import UserGuidePage from './pages/UserGuidePage';
import LiveViewPage from './pages/LiveViewPage';
import HelpIcon from '@mui/icons-material/Help';
import AuthCallback from './components/AuthCallback';
import { useAuth } from './contexts/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import { ProtectedRoute } from './components/auth';
import { useTheme } from './hooks/useTheme';
import { TickerWizard } from './components/TickerWizard';
import { DataWizard } from './components/DataWizard';
import { WidgetWizard } from './components/WidgetWizard';
import AIImageGenSettingsComponent from './components/AIImageGenSettings';

// ----------------------------------------------------------------
// Initial layout (used at startup)
// ----------------------------------------------------------------
const initialLayoutJson: IJsonModel = {
  global: {
    tabEnableFloat: false,
    tabSetEnableMaximize: true,
    tabEnableRename: false,
    tabSetTabStripHeight: 52
  },
  borders: [],
  // Start with a single tabset that has preset tabs.
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        tabLocation: 'top',
        weight: 100,
        children: [
          {
            type: 'tab',
            id: 'channels',
            name: 'Channels',
            component: 'channels',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'channel-playlists',
            name: 'Channel Schedules',
            component: 'channel-playlists',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'content',
            name: 'Content',
            component: 'content',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'templates',
            name: 'Templates',
            component: 'templates',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'widgets',
            name: 'Widgets',
            component: 'widgets',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'widget-builder',
            name: 'Widget Builder',
            component: 'widget-builder',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'virtual-set',
            name: 'Virtual Set',
            component: 'virtual-set',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'integrations',
            name: 'Integrations',
            component: 'integrations',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'sponsor-scheduling',
            name: 'Sponsors',
            component: 'sponsor-scheduling',
            enableClose: true
          },
          {
            type: 'tab',
            id: 'banner-scheduling',
            name: 'Banners',
            component: 'banner-scheduling',
            enableClose: true
          }
        ]
      }
    ]
  }
};

// ----------------------------------------------------------------
// Layout type definition
// ----------------------------------------------------------------
type LayoutType = 'default' | 'vertical' | 'horizontal' | 'twoRowGrid' | 'threeRowGrid';

// ----------------------------------------------------------------
// Helper: Build a new layout JSON given a list of tabs and a layout type.
// ----------------------------------------------------------------
const createLayoutJson = (layoutType: LayoutType, tabs: any[]): IJsonModel => {
  const global = initialLayoutJson.global;
  const borders = initialLayoutJson.borders;
  let layout: any;

  switch (layoutType) {
    case 'default':
      // All tabs in a single tabset.
      layout = {
        type: 'row',
        weight: 100,
        children: [
          {
            type: 'tabset',
            tabLocation: 'top',
            weight: 100,
            children: tabs
          }
        ]
      };
      break;

    case 'vertical':
      // Each tab gets its own tabset arranged in a column.
      layout = {
        type: 'column',
        weight: 100,
        children: [
          {
            type: 'row' as const,
            weigth: 100,
            children: tabs.map(tab => ({
              type: 'tabset' as const,
              tabLocation: 'top',
              weight: 100 / tabs.length,
              tabStripHeight: 52,
              children: [tab]
            }))
          }
        ]
      };
      break;

    case 'horizontal':
      // Each tab gets its own tabset arranged in a row.
      layout = {
        type: 'row',
        weight: 100,
        children: tabs.map(tab => ({
          type: 'tabset',
          tabLocation: 'top',
          weight: 100 / tabs.length,
          tabStripHeight: 52,
          children: [tab]
        }))
      };
      break;

    case 'twoRowGrid': {
      // Split the tabs into two groups (rows)
      const half = Math.ceil(tabs.length / 2);
      const row1 = tabs.slice(0, half);
      const row2 = tabs.slice(half);
      layout = {
        type: 'column',
        weight: 100,
        children: [
          {
            type: 'row',
            weigth: 50,
            children: row1.map(tab => ({
              type: 'tabset',
              tabLocation: 'top',
              weight: 100 / row1.length,
              tabStripHeight: 52,
              children: [tab]
            }))
          },
          {
            type: 'row',
            weigth: 50,
            children: row2.map(tab => ({
              type: 'tabset',
              tabLocation: 'top',
              weight: 100 / row2.length,
              tabStripHeight: 52,
              children: [tab]
            }))
          }
        ]
      };
      break;
    }

    case 'threeRowGrid': {
      // Split the tabs into three groups (rows)
      const rowSize = Math.ceil(tabs.length / 3);
      const row1 = tabs.slice(0, rowSize);
      const row2 = tabs.slice(rowSize, rowSize * 2);
      const row3 = tabs.slice(rowSize * 2);
      layout = {
        type: 'column',
        weight: 100,
        children: [
          {
            type: 'row',
            weight: 33.33,
            children: row1.map(tab => ({
              type: 'tabset',
              tabLocation: 'top',
              weight: 100 / row1.length,
              tabStripHeight: 52,
              children: [tab]
            }))
          },
          {
            type: 'row',
            weight: 33.33,
            children: row2.map(tab => ({
              type: 'tabset',
              tabLocation: 'top',
              weight: 100 / (row2.length || 1),
              tabStripHeight: 52,
              children: [tab]
            }))
          },
          {
            type: 'row',
            weight: 33.33,
            children: row3.map(tab => ({
              type: 'tabset',
              tabLocation: 'top',
              weight: 100 / (row3.length || 1),
              tabStripHeight: 52,
              children: [tab]
            }))
          }
        ]
      };
      break;
    }

    default:
      layout = {
        type: 'row',
        weight: 100,
        children: [
          {
            type: 'tabset',
            tabLocation: 'top',
            weight: 100,
            tabStripHeight: 52,
            children: tabs
          }
        ]
      };
  }
  return { global, borders, layout };
};

// ----------------------------------------------------------------
// Grid State Persistence Component
// Handles loading and saving grid expand/collapse and column state to user_layouts
// ----------------------------------------------------------------
const GridStatePersistence: React.FC<{ userId: string }> = ({ userId }) => {
  const { loadGridStates, getAllGridStates, isDirty, clearDirty, isLoaded } = useGridState();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // Load grid states on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadStates = async () => {
      try {
        const { data } = await supabase
          .from('user_layouts')
          .select('layout_data')
          .eq('user_id', userId)
          .eq('layout_name', 'main')
          .maybeSingle();

        if (data?.layout_data?.gridStates) {
          const savedStates = data.layout_data.gridStates;
          console.log('Loading grid states:', savedStates);

          // Handle both old format (just expanded rows) and new format (expanded + columns)
          if (savedStates.expandedRows || savedStates.columnStates) {
            // New format with separate expandedRows and columnStates
            loadGridStates(savedStates);
          } else {
            // Old format - gridStates was just the expanded rows object
            loadGridStates({ expandedRows: savedStates });
          }
        } else {
          // No grid states saved yet, mark as loaded with empty state
          loadGridStates({});
        }
      } catch (error) {
        console.error('Failed to load grid states:', error);
        loadGridStates({});
      }
    };

    loadStates();
  }, [userId, loadGridStates]);

  // Auto-save grid states when they change
  useEffect(() => {
    if (!isDirty || !isLoaded) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // First get the current layout data
        const { data: currentData } = await supabase
          .from('user_layouts')
          .select('layout_data')
          .eq('user_id', userId)
          .eq('layout_name', 'main')
          .maybeSingle();

        const gridStates = getAllGridStates();
        const updatedLayoutData = {
          ...(currentData?.layout_data || {}),
          gridStates,
        };

        await supabase
          .from('user_layouts')
          .upsert({
            user_id: userId,
            layout_name: 'main',
            layout_data: updatedLayoutData,
          }, { onConflict: 'user_id,layout_name' });

        console.log('Grid states auto-saved:', gridStates);
        clearDirty();
      } catch (error) {
        console.error('Failed to auto-save grid states:', error);
      }
    }, 1000); // Save after 1 second of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, isLoaded, userId, getAllGridStates, clearDirty]);

  return null; // This component doesn't render anything
};

// ----------------------------------------------------------------
// App Component
// ----------------------------------------------------------------
const App: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperuser } = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const [model, setModel] = useState<Model | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [isTickerWizardOpen, setIsTickerWizardOpen] = useState(false);
  const [isDataWizardOpen, setIsDataWizardOpen] = useState(false);
  const [isWidgetWizardOpen, setIsWidgetWizardOpen] = useState(false);
  const [isAIImageGenOpen, setIsAIImageGenOpen] = useState(false);
  const [apps, setApps] = useState<Array<{ id: string; name: string; app_url: string; app_key: string }>>([]);
  const templatesRef = useRef<any>(null);
  const widgetsRef = useRef<any>(null);
  const widgetBuilderRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // FIX: AG-Grid v34 drag ghost Y position workaround
  // The ghost wrapper's top position gets stuck at 0 due to a positioning bug
  // This workaround manually positions the wrapper to follow the mouse
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const ghost = document.querySelector('.ag-dnd-ghost');
      if (ghost && ghost instanceof HTMLElement) {
        const wrapper = ghost.parentElement as HTMLElement;
        if (wrapper && wrapper.style.position === 'absolute') {
          // Calculate position relative to viewport (wrapper is appended to body)
          const ghostHeight = ghost.offsetHeight;
          const top = e.clientY - ghostHeight / 2;
          const left = e.clientX - 10;

          // Apply position directly, bypassing AG-Grid's calculation
          wrapper.style.top = `${Math.max(0, top)}px`;
          wrapper.style.left = `${Math.max(0, left)}px`;
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  // Fetch apps from database
  useEffect(() => {
    const fetchApps = async () => {
      const { data, error } = await supabase.rpc('list_active_applications');
      if (!error && data) {
        setApps(data);
      } else if (error) {
        console.error('Failed to fetch applications:', error);
      }
    };
    fetchApps();
  }, []);

  useEffect(() => {
    if (!user?.auth_user_id) {
      setModel(Model.fromJson(initialLayoutJson));
      setLayoutLoading(false);
      return;
    }

    // Start session monitoring when user is authenticated
    startSessionMonitor();

    const loadLayout = async () => {
      try {
        console.log('Loading layout for user:', user.auth_user_id);

        // Wait for session to be properly initialized from cookie
        await sessionReady;

        // Check auth state first
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Auth session:', session);
        console.log('Session user ID:', session?.user?.id);

        // Try the query - use auth_user_id to match RLS policy (auth.uid())
        const { data, error } = await supabase
          .from('user_layouts')
          .select('layout_data')
          .eq('user_id', user.auth_user_id)
          .eq('layout_name', 'main')
          .maybeSingle();

        console.log('Query result:', { data, error });

        if (data?.layout_data) {
          setModel(Model.fromJson(data.layout_data));
        } else {
          console.log('No layout found, using default');
          setModel(Model.fromJson(initialLayoutJson));
        }
      } catch (error) {
        console.error('Failed to load layout:', error);
        setModel(Model.fromJson(initialLayoutJson));
      } finally {
        setLayoutLoading(false);
      }
    };
    loadLayout();
  }, [user?.auth_user_id]);
  
  // Auto-save layout changes with debouncing
  const onModelChange = useCallback((newModel: Model) => {
    setModel(newModel);

    // Debounce the save operation to avoid excessive database calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!user?.auth_user_id) return;

      try {
        // Ensure session is ready before saving
        await sessionReady;

        const layoutData = newModel.toJson();
        // Use auth_user_id to match RLS policy (auth.uid())
        const { error } = await supabase
          .from('user_layouts')
          .upsert({
            user_id: user.auth_user_id,
            layout_name: 'main',
            layout_data: layoutData
          }, { onConflict: 'user_id,layout_name' });

        if (error) {
          console.error('Layout save error:', error);
        } else {
          console.log('Layout auto-saved');
        }
      } catch (error) {
        console.error('Failed to auto-save layout:', error);
      }
    }, 1000); // Save after 1 second of inactivity
  }, [user?.auth_user_id]);
  
  const focusOrOpenTab = useCallback((tabId: string) => {
    if (!model) return;
    const tabNode = model.getNodeById(tabId) as TabNode;
    if (tabNode) {
      model.doAction(Actions.selectTab(tabNode.getId()));
    } else {
      reopenTab(tabId);
    }
  }, [model]);

  // Listen for focusContentTab events (e.g., from ChannelPlaylistsPage when opening a bucket)
  useEffect(() => {
    const handleFocusContentTab = () => {
      focusOrOpenTab('content');
    };

    window.addEventListener('focusContentTab', handleFocusContentTab);
    return () => window.removeEventListener('focusContentTab', handleFocusContentTab);
  }, [focusOrOpenTab]);

  const handleWidgetSelect = useCallback((widgetId: string) => {
    console.log('App: Widget selected:', widgetId);
    
    if (!model) {
      console.error('App: Model is not initialized yet');
      return;
    }
    
    // Find the widget builder tab
    let widgetBuilderTabNode: TabNode | null = null;
    let widgetBuilderParent: any = null;
    
    model.visitNodes((node) => {
      if (node.getType() === 'tab' && node.getId() === 'widget-builder') {
        widgetBuilderTabNode = node as TabNode;
        widgetBuilderParent = node.getParent();
      }
    });
    
    if (widgetBuilderTabNode) {
      console.log('App: Found widget builder tab');
      
      // Check if it's already docked on the right (not in the main tabset)
      const isInMainTabset = widgetBuilderParent && widgetBuilderParent.getId() === 'root';
      
      if (isInMainTabset) {
        console.log('App: Widget builder is in main tabset, docking to right...');
        
        // Dock it to the right using the same logic as Widget Wizard
        setTimeout(() => {
          if (model) {
            try {
              // Find the root row (parent of main tabset)
              let rootRow: any = null;
              model.visitNodes((node) => {
                if (node.getType() === 'row' && node.getChildren().length > 0) {
                  const firstChild = node.getChildren()[0];
                  if (firstChild.getType() === 'tabset' && firstChild.getId() === 'root') {
                    rootRow = node;
                  }
                }
              });

              if (rootRow) {
                // Create a new tabset on the right side
                const rightTabsetConfig: any = {
                  type: 'tabset',
                  tabLocation: 'top',
                  weight: 50,
                  children: []
                };

                // Add the widget-builder tab to the right tabset
                const widgetBuilderConfig = {
                  type: 'tab',
                  id: 'widget-builder',
                  name: 'Widget Builder',
                  component: 'widget-builder',
                  enableClose: true
                };

                rightTabsetConfig.children.push(widgetBuilderConfig);

                // Add the right tabset to the root row
                const rightTabsetIdNode = model.doAction(Actions.addNode(rightTabsetConfig, rootRow.getId(), DockLocation.RIGHT, -1));
                const rightTabsetId = typeof rightTabsetIdNode === 'string' ? rightTabsetIdNode : (rightTabsetIdNode as any)?.getId?.();

                // Delete the original widget-builder tab from the main tabset
                model.doAction(Actions.deleteTab('widget-builder'));

                // Try to set equal weights
                try {
                  const mainTabsetId = 'root';
                  model.doAction(Actions.updateNodeAttributes(mainTabsetId, { weight: 50 } as any));

                  if (rightTabsetId) {
                    model.doAction(Actions.updateNodeAttributes(rightTabsetId as string, { weight: 50 } as any));
                  }
                } catch (e) {
                  // Silently handle weight update failures
                }

                // Focus both tabs: Widgets on the left, Widget Builder on the right
                setTimeout(() => {
                  // Focus the Widgets tab on the left (main tabset)
                  model.doAction(Actions.selectTab('widgets'));
                  
                  // Then focus the Widget Builder tab on the right
                  setTimeout(() => {
                    model.doAction(Actions.selectTab('widget-builder'));
                    if (widgetBuilderRef.current?.openWidgetInBuilder) {
                      console.log('App: Calling widgetBuilderRef.openWidgetInBuilder...');
                      widgetBuilderRef.current.openWidgetInBuilder(widgetId);
                    }
                  }, 50);
                }, 100);
              } else {
                // Fallback: just focus the existing tab
                model.doAction(Actions.selectTab('widget-builder'));
                if (widgetBuilderRef.current?.openWidgetInBuilder) {
                  widgetBuilderRef.current.openWidgetInBuilder(widgetId);
                }
              }
            } catch (error) {
              console.error('Error docking widget builder:', error);
              // Fallback: just focus the existing tab
              model.doAction(Actions.selectTab('widget-builder'));
              if (widgetBuilderRef.current?.openWidgetInBuilder) {
                widgetBuilderRef.current.openWidgetInBuilder(widgetId);
              }
            }
          }
        }, 100);
      } else {
        console.log('App: Widget builder already docked on right, focusing...');
        // Widget builder is already docked on the right, just focus it
        model.doAction(Actions.selectTab('widget-builder'));
        
        // Open the widget in the builder
        if (widgetBuilderRef.current?.openWidgetInBuilder) {
          console.log('App: Calling widgetBuilderRef.openWidgetInBuilder...');
          setTimeout(() => {
            widgetBuilderRef.current.openWidgetInBuilder(widgetId);
          }, 100);
        } else {
          console.error('App: widgetBuilderRef.current.openWidgetInBuilder is not available');
        }
      }
    } else {
      console.error('App: Widget builder tab not found');
    }
  }, [model]);

  const handleProductionWidgetOpen = useCallback(async (widgetId: string) => {
    console.log('App: Opening production widget:', widgetId);
    
    if (!model) {
      console.error('App: Model is not initialized yet');
      return;
    }

    // Create a unique tab ID for each production widget instance
    const tabId = `production-widget-${widgetId}`;
    
    // Check if this production widget is already open
    let existingTab: TabNode | null = null;
    model.visitNodes((node) => {
      if (node.getType() === 'tab' && node.getId() === tabId) {
        existingTab = node as TabNode;
      }
    });

    if (existingTab) {
      // Just focus the existing tab
      console.log('App: Production widget already open, focusing tab:', tabId);
      model.doAction(Actions.selectTab(tabId));
    } else {
      // Fetch widget name from database
      let widgetName = 'Widget';
      try {
        const { data, error } = await supabase
          .from('content')
          .select('name')
          .eq('id', widgetId)
          .single();
        
        if (!error && data) {
          widgetName = data.name;
        }
      } catch (err) {
        console.error('Failed to fetch widget name:', err);
      }

      // Create a new tab in the main tabset for the production widget
      console.log('App: Creating new production widget tab:', tabId);
      
      // Find the first tabset (the main one)
      let mainTabsetId: string | null = null;
      model.visitNodes((node) => {
        if (node.getType() === 'tabset' && !mainTabsetId) {
          mainTabsetId = node.getId();
          console.log('App: Found main tabset with ID:', mainTabsetId);
        }
      });

      if (mainTabsetId) {
        const tabConfig = {
          type: 'tab',
          id: tabId,
          name: widgetName,
          component: 'production-widget',
          config: { widgetId }, // Store widgetId in config
          enableClose: true
        };

        // Add to the main tabset
        console.log('App: Adding production widget to tabset:', mainTabsetId);
        model.doAction(Actions.addNode(tabConfig, mainTabsetId, DockLocation.CENTER, -1));
        
        // Focus the new tab
        setTimeout(() => {
          console.log('App: Selecting production widget tab:', tabId);
          model.doAction(Actions.selectTab(tabId));
        }, 50);
      } else {
        console.error('App: Could not find any tabset');
      }
    }
  }, [model]);

  // The factory returns the component for a given tab.
  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent();
    switch (component) {
      case 'channels':
        return <ChannelsPage />;
      case 'channel-playlists':
        return <ChannelPlaylistsPage />;
      case 'content':
        return <ContentPage />;
      case 'templates':
        return <TemplatesPage ref={templatesRef} />;
      case 'widgets':
        return <WidgetWindowPage ref={widgetsRef} onWidgetSelect={handleWidgetSelect} onProductionWidgetOpen={handleProductionWidgetOpen} />;
      case 'widget-builder':
        return <WidgetBuilderPage ref={widgetBuilderRef} />;
      case 'production-widget':
        // Get widgetId from tab config and pass it as prop
        const config = node.getConfig();
        const widgetId = config?.widgetId;
        // Use a key to force re-render when widgetId changes
        return <ProductionWidgetPage key={widgetId} widgetId={widgetId} />;
      case 'virtual-set':
        return <VirtualSetPage />;
      case 'integrations':
        return <IntegrationsPage />;
      case 'sponsor-scheduling':
        return <SponsorSchedulingPage />;
      case 'banner-scheduling':
        return <BannerSchedulingPage />;
      case 'user-guide':
        return <UserGuidePage />;
      case 'live-view':
        return <LiveViewPage />;
      default:
        return <div>Tab not found</div>;
    }
  }, [handleWidgetSelect]);


  // Dynamic tab configurations for tabs not in initial layout
  const dynamicTabConfigs: Record<string, any> = {
    'user-guide': {
      type: 'tab',
      id: 'user-guide',
      name: 'User Guide',
      component: 'user-guide',
      enableClose: true
    },
    'live-view': {
      type: 'tab',
      id: 'live-view',
      name: 'Live View',
      component: 'live-view',
      enableClose: true
    }
  };

  // Reopen a closed tab using its original configuration.
  const reopenTab = useCallback((tabId: string)  => {
    if (!model) return;

    // Check if tab already exists
    let exists = false;
    model.visitNodes((node) => {
      if (node.getType() === 'tab' && node.getId() === tabId) {
        exists = true;
        model.doAction(Actions.selectTab(node.getId()));
      }
    });
    if (exists) return;

    // Retrieve the tab config from initial layout or dynamic configs
    let tabConfig = (initialLayoutJson.layout.children[0] as any).children.find(
      (tab: any) => tab.id === tabId
    );

    // If not in initial layout, check dynamic configs
    if (!tabConfig && dynamicTabConfigs[tabId]) {
      tabConfig = dynamicTabConfigs[tabId];
    }

    if (tabConfig) {
      // Find a valid target tabset (here we use the first one found).
      let targetTabsetId: string | null = null;
      model.visitNodes((node) => {
        if (!targetTabsetId && node.getType() === 'tabset') {
          targetTabsetId = node.getId();
        }
      });
      if (!targetTabsetId) {
        console.error('No valid tabset found to reopen the tab.');
        return;
      }

      model.doAction(Actions.addNode(tabConfig, targetTabsetId, DockLocation.CENTER, -1));

      // Focus the newly added tab
      setTimeout(() => {
        model.doAction(Actions.selectTab(tabId));
      }, 50);
    }
  }, [model]);


  // Change the layout by rebuilding the model from the dynamically generated JSON.
  const changeLayout = useCallback((layoutType: LayoutType) => {
    if (!model) return;
    // Gather all current tabs (ensuring unique IDs).
    const tabs: any[] = [];
    const seenIds = new Set<string>();
    model.visitNodes((node) => {
      if (node.getType() === 'tab' && !seenIds.has(node.getId())) {
        seenIds.add(node.getId());
        const tabNode = node as TabNode;
        tabs.push({
          type: 'tab',
          id: tabNode.getId(),
          name: tabNode.getName(),
          component: tabNode.getComponent(),
          enableClose: true
        });
      }
    });

    // Create the new layout JSON.
    const newLayout = createLayoutJson(layoutType, tabs);

    // Replace the current model.
    setModel(Model.fromJson(newLayout));
  }, [model]);


  // Removed unused _handleTickerWizardComplete function

  const handleWidgetWizardComplete = useCallback((widgetId?: string, _widgetName?: string) => {
    console.log("Widget wizard complete - refreshing widgets and opening builder");
    if (!model) return;

    // Find the widgets tab node
    let widgetsTabNode: TabNode | null = null;

    model.visitNodes((node) => {
      if (node.getType() === 'tab' && node.getId() === 'widgets') {
        widgetsTabNode = node as TabNode;
      }
    });
  
    // Handle widget builder docking
    if (widgetsTabNode) {
      // Focus the widgets tab first
      model.doAction(Actions.selectTab('widgets'));
      
      // Refresh widgets
      if (widgetsRef.current?.refreshWidgets) {
        widgetsRef.current.refreshWidgets();
      }
      
      // Use the existing FlexLayout-React drag-and-drop system
      // First, ensure the Widget Builder tab exists using the existing logic
      focusOrOpenTab('widget-builder');
      
      // Then automatically dock it to the right side using the built-in system
      setTimeout(() => {
        // Find the Widget Builder tab
        let widgetBuilderTabNode: TabNode | null = null;
        let mainTabset: TabNode | null = null;
        
        model.visitNodes((node) => {
          if (node.getType() === 'tab' && node.getId() === 'widget-builder') {
            widgetBuilderTabNode = node as TabNode;
          }
          if (node.getType() === 'tabset') {
            mainTabset = node as TabNode;
          }
        });
        
        if (widgetBuilderTabNode && mainTabset) {
          // Get the parent of the main tabset (should be the root row)
          const rootRow = (mainTabset as any).getParent?.();
          if (rootRow) {
            // Move the existing widget-builder tab to the RIGHT of the root row (mimic manual drag)
            try {
              const mainTabsetId = (mainTabset as any).getId?.() || (mainTabset as TabNode).getId();
              // If it's already not in the main tabset, skip moving
              const currentParent = (widgetBuilderTabNode as any).getParent?.();
              if (!currentParent || currentParent.getId() === mainTabsetId) {
                model.doAction(
                  Actions.moveNode((widgetBuilderTabNode as TabNode).getId(), rootRow.getId(), DockLocation.RIGHT, -1)
                );
              }

              // Re-fetch the widget-builder node to get its new parent (right tabset)
              const refreshedWidgetBuilder = model.getNodeById('widget-builder') as TabNode;
              const rightTabset = (refreshedWidgetBuilder as any).getParent?.();
              const rightTabsetId = rightTabset?.getId?.();

              // Explicitly set both tabset weights to 50/50
              try {
                model.doAction(Actions.updateNodeAttributes(mainTabsetId, { weight: 50 } as any));
                if (rightTabsetId) {
                  model.doAction(Actions.updateNodeAttributes(rightTabsetId, { weight: 50 } as any));
                }
              } catch (e) {
                // Silently handle weight update failures
              }

              // Focus both tabs: Widgets on the left, Widget Builder on the right
              setTimeout(() => {
                // Focus the Widgets tab on the left (main tabset)
                model.doAction(Actions.selectTab('widgets'));
                
                // Then focus the Widget Builder tab on the right
                setTimeout(() => {
                  model.doAction(Actions.selectTab('widget-builder'));
                  if (widgetBuilderRef.current?.openWidgetInBuilder && widgetId) {
                    widgetBuilderRef.current.openWidgetInBuilder(widgetId, true); // true = isNewWidget
                  }
                }, 50);
              }, 100);
            } catch (error) {
              model.doAction(Actions.selectTab('widget-builder'));
              if (widgetBuilderRef.current?.openWidgetInBuilder && widgetId) {
                widgetBuilderRef.current.openWidgetInBuilder(widgetId, true); // true = isNewWidget
              }
            }
          }
        }
      }, 100);
    }
  }, [model]);

  // Removed unused _resetLayout function

  // Handle auth callback (before ProtectedRoute check)
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Show loading spinner while layout is loading (auth loading is handled by ProtectedRoute)
  if (layoutLoading && user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1c2127'
      }}>
        <Spinner />
      </div>
    );
  }

  return (
    <ProtectedRoute>
    <StylesProvider injectFirst>
      <GridStateProvider>
        {user && <GridStatePersistence userId={user.id} />}
        <TemplatesProvider>
          <CrossGridDragProvider>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Navbar>
            <Navbar.Group align={Alignment.LEFT}>
              <Navbar.Heading>
                <img 
                  src="/assets/EMERGENT_Black_Alpha.png" 
                  alt="Emergent Nova"
                  className="navbar-logo"
                />
              </Navbar.Heading>
              
              {/* Pink gradient P icon */}
              <div className="navbar-project-icon">
                <span className="navbar-project-icon-text">P</span>
              </div>
              
              <span className="navbar-project-name">Pulsar</span>
            </Navbar.Group>
            
            <Navbar.Group align={Alignment.RIGHT}>
              <ButtonGroup minimal={true}>
                <Popover
                  content={
                    <Menu>
                      {apps.length > 0 ? (
                        apps.map(app => (
                          <MenuItem
                            key={app.id}
                            text={app.name}
                            onClick={() => window.open(app.app_url, '_blank')}
                          />
                        ))
                      ) : (
                        <MenuItem text="No apps available" disabled />
                      )}
                    </Menu>
                  }
                  position={Position.BOTTOM_LEFT}
                >
                  <Button text="Apps" icon={<AppsIcon style={{ width: 16, height: 16 }} />} />
                </Popover>
                <Popover
                  content={
                    <Menu>
                      <MenuItem
                        icon={<AccessTimeIcon style={{ width: 16, height: 16 }} />}
                        text="Ticker Wizard"
                        onClick={() => setIsTickerWizardOpen(true)}
                      />
                      <MenuItem
                        icon={<StorageIcon style={{ width: 16, height: 16 }} />}
                        text="Data Wizard"
                        onClick={() => setIsDataWizardOpen(true)}
                      />
                      <MenuItem
                        icon={<WidgetsIcon style={{ width: 16, height: 16 }} />}
                        text="Widget Wizard"
                        onClick={() => setIsWidgetWizardOpen(true)}
                      />
                    </Menu>
                  }
                  position={Position.BOTTOM_LEFT}
                >
                  <Button text="Tools" icon={<BuildIcon style={{ width: 16, height: 16 }} />} />
                </Popover>
                <Popover
                  content={
                    <Menu>
                      <MenuItem
                        icon={<PlaylistPlayIcon style={{ width: 16, height: 16 }} />}
                        text="MCR"
                      >
                        <MenuItem
                          icon={<TvIcon style={{ width: 16, height: 16 }} />}
                          text="Channels"
                          onClick={() => focusOrOpenTab('channels')}
                        />
                        <MenuItem
                          icon={<PlaylistPlayIcon style={{ width: 16, height: 16 }} />}
                          text="Channel Schedules"
                          onClick={() => focusOrOpenTab('channel-playlists')}
                        />
                        <MenuItem
                          icon={<ShoppingBasketIcon style={{ width: 16, height: 16 }} />}
                          text="Content"
                          onClick={() => focusOrOpenTab('content')}
                        />
                        <MenuItem
                          icon={<DescriptionIcon style={{ width: 16, height: 16 }} />}
                          text="Templates"
                          onClick={() => focusOrOpenTab('templates')}
                        />
                        <MenuItem
                          icon={<IntegrationInstructionsIcon style={{ width: 16, height: 16 }} />}
                          text="Integrations"
                          onClick={() => focusOrOpenTab('integrations')}
                        />
                        <MenuItem
                          icon={<LiveTvIcon style={{ width: 16, height: 16 }} />}
                          text="Live View"
                          onClick={() => focusOrOpenTab('live-view')}
                        />
                      </MenuItem>
                      <MenuItem
                        icon={<CampaignIcon style={{ width: 16, height: 16 }} />}
                        text="Sponsors"
                      >
                        <MenuItem
                          icon={<CampaignIcon style={{ width: 16, height: 16 }} />}
                          text="Sponsors"
                          onClick={() => focusOrOpenTab('sponsor-scheduling')}
                        />
                        <MenuItem
                          icon={<ViewCarouselIcon style={{ width: 16, height: 16 }} />}
                          text="Banners"
                          onClick={() => focusOrOpenTab('banner-scheduling')}
                        />
                      </MenuItem>
                      <MenuItem
                        icon={<ViewInArIcon style={{ width: 16, height: 16 }} />}
                        text="Virtual Studio"
                      >
                        <MenuItem
                          icon={<WidgetsIcon style={{ width: 16, height: 16 }} />}
                          text="Widgets"
                          onClick={() => focusOrOpenTab('widgets')}
                        />
                        <MenuItem
                          icon={<BuildIcon style={{ width: 16, height: 16 }} />}
                          text="Widget Builder"
                          onClick={() => focusOrOpenTab('widget-builder')}
                        />
                        <MenuItem
                          icon={<ViewInArIcon style={{ width: 16, height: 16 }} />}
                          text="Virtual Set"
                          onClick={() => focusOrOpenTab('virtual-set')}
                        />
                      </MenuItem>
                      <MenuDivider />
                      <MenuItem text="Default (All in one)" onClick={() => changeLayout('default')} />
                      <MenuItem text="Tile Horizontally" onClick={() => changeLayout('horizontal')} />
                      <MenuItem text="Tile Vertically" onClick={() => changeLayout('vertical')} />
                    </Menu>
                  }
                  position={Position.BOTTOM_LEFT}
                >
                  <Button text="Window" icon={<WindowIcon style={{ width: 16, height: 16 }} />} />
                </Popover>
                <Popover
                  content={
                    <Menu>
                      {/* User info section */}
                      {user && (
                        <>
                          <MenuItem
                            icon={<PersonIcon style={{ width: 16, height: 16 }} />}
                            text={user.email}
                            labelElement={
                              <span style={{ fontSize: '11px', opacity: 0.7 }}>
                                {isSuperuser ? 'Superuser' : isAdmin ? 'Admin' : 'User'}
                              </span>
                            }
                            disabled
                          />
                          <MenuDivider />
                        </>
                      )}
                      <MenuItem icon={<SettingsIcon style={{ width: 16, height: 16 }} />} text="Preferences" disabled />
                      <MenuItem
                        icon={theme === 'dark' ? <LightModeIcon style={{ width: 16, height: 16 }} /> : <DarkModeIcon style={{ width: 16, height: 16 }} />}
                        text={`Dark Mode (${theme === 'dark' ? 'On' : 'Off'})`}
                        onClick={toggleTheme}
                      />
                      <MenuDivider />
                      <MenuItem icon={<PersonIcon style={{ width: 16, height: 16 }} />} text="Account Settings" disabled />
                      {/* Admin-only menu items */}
                      {(isAdmin || isSuperuser) && (
                        <>
                          <MenuItem icon={<GroupIcon style={{ width: 16, height: 16 }} />} text="Users and Groups" disabled />
                          <MenuItem icon={<DashboardIcon style={{ width: 16, height: 16 }} />} text="Dashboard Preferences" disabled />
                          <MenuItem icon={<BoltIcon style={{ width: 16, height: 16 }} />} text="AI Connectors" disabled />
                        </>
                      )}
                      <MenuDivider />
                      <MenuItem icon={<LogoutIcon style={{ width: 16, height: 16 }} />} text="Sign Out" onClick={signOut} />
                    </Menu>
                  }
                  position={Position.BOTTOM_RIGHT}
                >
                  <Button text="Settings" icon={<SettingsIcon style={{ width: 16, height: 16 }} />} />
                </Popover>
                <Popover
                  content={
                    <Menu>
                      <MenuItem
                        icon={<HelpIcon style={{ width: 16, height: 16 }} />}
                        text="User Guide"
                        onClick={() => focusOrOpenTab('user-guide')}
                      />
                      <MenuDivider />
                      <MenuItem icon={<InfoIcon style={{ width: 16, height: 16 }} />} text="About Pulsar" disabled />
                      <MenuItem icon={<BugReportIcon style={{ width: 16, height: 16 }} />} text="Report an Issue" disabled />
                    </Menu>
                  }
                  position={Position.BOTTOM_RIGHT}
                >
                  <Button text="Help" icon={<HelpIcon style={{ width: 16, height: 16 }} />} />
                </Popover>
              </ButtonGroup>
            </Navbar.Group>
            
          </Navbar>
          <TickerWizard isOpen={isTickerWizardOpen} onClose={() => setIsTickerWizardOpen(false)} />
          <DataWizard isOpen={isDataWizardOpen} onClose={() => setIsDataWizardOpen(false)} />
          <WidgetWizard isOpen={isWidgetWizardOpen} onClose={() => setIsWidgetWizardOpen(false)} onComplete={handleWidgetWizardComplete} />
          <AIImageGenSettingsComponent isOpen={isAIImageGenOpen} onClose={() => setIsAIImageGenOpen(false)} />
          <div style={{ flex: 1, position: 'relative' }}>
            {model && <Layout model={model} factory={factory} onModelChange={onModelChange} />}
          </div>
        </div>
          </CrossGridDragProvider>
        </TemplatesProvider>
      </GridStateProvider>
    </StylesProvider>
    </ProtectedRoute>
  );
};

export default App;