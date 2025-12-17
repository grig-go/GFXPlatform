/**
 * Puppeteer Screenshot Capture Script for Pulsar User Guide
 *
 * This script captures screenshots of the Pulsar application for documentation.
 *
 * Prerequisites:
 * 1. The app must be running: npm run dev
 * 2. You need valid login credentials set as environment variables:
 *    - PULSAR_EMAIL
 *    - PULSAR_PASSWORD
 *
 * Usage:
 *   PULSAR_EMAIL=user@example.com PULSAR_PASSWORD=yourpass node scripts/capture-screenshots.js
 *
 * Or create a .env file with credentials and run:
 *   node scripts/capture-screenshots.js
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.PULSAR_URL || 'http://localhost:5173';
const EMAIL = process.env.PULSAR_EMAIL;
const PASSWORD = process.env.PULSAR_PASSWORD;
const OUTPUT_DIR = path.join(__dirname, '../docs/images');
const VIEWPORT = { width: 1920, height: 1080 };

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Screenshot definitions
const screenshots = [
  // Getting Started
  { name: 'login-screen', description: 'Login page', requiresAuth: false },
  { name: 'main-interface', description: 'Main interface after login', tab: 'channels' },
  { name: 'workspace-customization', description: 'Workspace with multiple panes', custom: 'splitLayout', resetAfter: true },

  // Channels
  { name: 'channels-page', description: 'Channels page', tab: 'channels' },
  { name: 'create-channel-dialog', description: 'Create channel dialog', tab: 'channels', action: 'openAddDialog' },
  { name: 'channel-context-menu', description: 'Channel context menu', tab: 'channels', action: 'rightClickFirst' },

  // Channel Schedules
  { name: 'channel-playlists-page', description: 'Channel Schedules page', tab: 'channel-playlists' },
  { name: 'create-playlist-dialog', description: 'Create playlist dialog', tab: 'channel-playlists', action: 'openAddDialog' },
  { name: 'bucket-selector', description: 'Bucket selector dialog', tab: 'channel-playlists', action: 'openBucketSelector' },
  { name: 'schedule-dialog', description: 'Schedule dialog', tab: 'channel-playlists', action: 'openScheduleDialog' },
  { name: 'playlist-management', description: 'Playlist management view', tab: 'channel-playlists' },

  // Content
  { name: 'content-page', description: 'Content page', tab: 'content' },
  { name: 'content-hierarchy', description: 'Content hierarchy tree', tab: 'content' },
  { name: 'create-folder-dialog', description: 'Create folder dialog', tab: 'content', action: 'openFolderDialog' },
  { name: 'create-bucket-dialog', description: 'Create bucket dialog', tab: 'content', action: 'openBucketDialog' },
  { name: 'create-item-form', description: 'Create item form', tab: 'content', action: 'openItemForm' },
  { name: 'content-grid-actions', description: 'Content grid with actions', tab: 'content' },

  // Templates
  { name: 'templates-page', description: 'Templates page', tab: 'templates' },
  { name: 'create-template-dialog', description: 'Create template dialog', tab: 'templates', action: 'openAddDialog' },
  { name: 'formio-builder', description: 'Form.io builder', tab: 'templates', action: 'openFormBuilder' },
  { name: 'template-carousel', description: 'Template carousel view', tab: 'templates' },
  { name: 'tab-fields-editor', description: 'Tab fields editor', tab: 'templates', action: 'openTabFields' },

  // Widgets
  { name: 'widgets-page', description: 'Widgets page', tab: 'widgets' },
  { name: 'widgets-overview', description: 'Widgets overview', tab: 'widgets' },
  { name: 'widget-wizard', description: 'Widget wizard', action: 'openWidgetWizard' },
  { name: 'widget-builder', description: 'Widget builder', tab: 'widget-builder' },
  { name: 'rcp-presets', description: 'RCP presets selection', tab: 'widget-builder' },

  // Virtual Set
  { name: 'virtual-set-page', description: 'Virtual Set page', tab: 'virtual-set' },
  { name: 'virtual-set-interface', description: 'Virtual set interface', tab: 'virtual-set' },
  { name: 'ai-image-generation', description: 'AI image generation', tab: 'virtual-set' },
  { name: 'set-elements', description: 'Set element controls', tab: 'virtual-set' },
  { name: 'unreal-connection', description: 'Unreal connection settings', tab: 'virtual-set' },

  // Integrations
  { name: 'integrations-page', description: 'Integrations page', tab: 'integrations' },
  { name: 'api-integration', description: 'API integration setup', tab: 'integrations', action: 'openAddDialog' },
  { name: 'database-connection', description: 'Database connection setup', tab: 'integrations' },
  { name: 'file-import', description: 'File import setup', tab: 'integrations' },
  { name: 'preset-integrations', description: 'Preset integrations', tab: 'integrations' },
  { name: 'sync-status', description: 'Sync status view', tab: 'integrations' },

  // Sponsors
  { name: 'sponsors-page', description: 'Sponsors page', tab: 'sponsor-scheduling' },
  { name: 'sponsor-schedule-dialog', description: 'Sponsor schedule dialog', tab: 'sponsor-scheduling', action: 'openAddDialog' },
  { name: 'time-rules', description: 'Time rules configuration', tab: 'sponsor-scheduling' },

  // Banners
  { name: 'banners-page', description: 'Banners page', tab: 'banner-scheduling' },
  { name: 'banner-schedule-dialog', description: 'Banner schedule dialog', tab: 'banner-scheduling', action: 'openAddDialog' },
  { name: 'banner-triggers', description: 'Banner triggers', tab: 'banner-scheduling' },

  // Wizards
  { name: 'data-wizard-overview', description: 'Data wizard overview', action: 'openDataWizard' },
  { name: 'data-wizard-sources', description: 'Data wizard source types', action: 'openDataWizard' },
  { name: 'field-mapping', description: 'Field mapping interface', action: 'openDataWizard' },
  { name: 'ticker-wizard', description: 'Ticker wizard', action: 'openTickerWizard' },
  { name: 'ticker-template-selection', description: 'Ticker template selection', action: 'openTickerWizard' },
  { name: 'ticker-data-mapping', description: 'Ticker data mapping', action: 'openTickerWizard' },
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to find element by text content
async function findByText(page, selector, text) {
  const elements = await page.$$(selector);
  for (const element of elements) {
    const textContent = await page.evaluate(el => el.textContent, element);
    if (textContent && textContent.includes(text)) {
      return element;
    }
  }
  return null;
}

// Helper to click element containing text
async function clickByText(page, selector, text) {
  const element = await findByText(page, selector, text);
  if (element) {
    await element.click();
    return true;
  }
  return false;
}

async function login(page) {
  console.log('Logging in...');

  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await delay(2000);

  // Check if already logged in (look for navbar)
  const navbar = await page.$('.bp5-navbar');
  if (navbar) {
    console.log('Already logged in');
    return true;
  }

  // Check if login form exists
  const loginForm = await page.$('input[type="email"], input[name="email"]');
  if (!loginForm) {
    console.log('No login form found - might be logged in');
    return true;
  }

  if (!EMAIL || !PASSWORD) {
    console.log('No credentials provided - capturing login screen only');
    return false;
  }

  // Fill in login form
  await page.type('input[type="email"], input[name="email"]', EMAIL);
  await page.type('input[type="password"], input[name="password"]', PASSWORD);

  // Click sign in button - try multiple selectors
  const signInButton = await page.$('button[type="submit"]');
  if (signInButton) {
    await signInButton.click();
    await delay(3000);
  } else {
    // Try to find by text
    const clicked = await clickByText(page, 'button', 'Sign In');
    if (clicked) {
      await delay(3000);
    }
  }

  console.log('Login complete');
  return true;
}

async function clickTab(page, tabId) {
  console.log(`Switching to tab: ${tabId}`);

  // Map tab IDs to menu item text
  const tabNames = {
    'channels': 'Channels',
    'channel-playlists': 'Channel Schedules',
    'content': 'Content',
    'templates': 'Templates',
    'widgets': 'Widgets',
    'widget-builder': 'Widget Builder',
    'virtual-set': 'Virtual Set',
    'integrations': 'Integrations',
    'sponsor-scheduling': 'Sponsors',
    'banner-scheduling': 'Banners',
  };

  const menuText = tabNames[tabId] || tabId;

  try {
    // Click Window menu button
    const windowButton = await findByText(page, 'button', 'Window');
    if (windowButton) {
      await windowButton.click();
      await delay(500);

      // Click the menu item
      const menuItem = await findByText(page, '.bp5-menu-item', menuText);
      if (menuItem) {
        await menuItem.click();
        await delay(1000);
        return true;
      }
    }
  } catch (e) {
    console.log(`Could not switch tab via menu: ${e.message}`);
  }

  // Fallback: try clicking tab directly in FlexLayout
  try {
    const tabButton = await findByText(page, '.flexlayout__tab_button', menuText);
    if (tabButton) {
      await tabButton.click();
      await delay(500);
      return true;
    }
  } catch (e) {
    console.log(`Could not click tab directly: ${e.message}`);
  }

  return false;
}

async function openDialog(page, action) {
  console.log(`Performing action: ${action}`);

  try {
    switch (action) {
      case 'openAddDialog': {
        // Look for add/create button with icon
        const addButton = await page.$('button[aria-label="Add"]');
        if (addButton) {
          await addButton.click();
          await delay(1000);
        } else {
          // Try finding button with plus icon
          const buttons = await page.$$('button');
          for (const btn of buttons) {
            const hasIcon = await page.evaluate(el => {
              return el.querySelector('.bp5-icon-add, .bp5-icon-plus, [data-icon="add"], [data-icon="plus"]') !== null;
            }, btn);
            if (hasIcon) {
              await btn.click();
              await delay(1000);
              break;
            }
          }
        }
        break;
      }

      case 'openTickerWizard': {
        const toolsButton = await findByText(page, 'button', 'Tools');
        if (toolsButton) {
          await toolsButton.click();
          await delay(500);
          const menuItem = await findByText(page, '.bp5-menu-item', 'Ticker Wizard');
          if (menuItem) {
            await menuItem.click();
            await delay(1000);
          }
        }
        break;
      }

      case 'openDataWizard': {
        const toolsButton = await findByText(page, 'button', 'Tools');
        if (toolsButton) {
          await toolsButton.click();
          await delay(500);
          const menuItem = await findByText(page, '.bp5-menu-item', 'Data Wizard');
          if (menuItem) {
            await menuItem.click();
            await delay(1000);
          }
        }
        break;
      }

      case 'openWidgetWizard': {
        const toolsButton = await findByText(page, 'button', 'Tools');
        if (toolsButton) {
          await toolsButton.click();
          await delay(500);
          const menuItem = await findByText(page, '.bp5-menu-item', 'Widget Wizard');
          if (menuItem) {
            await menuItem.click();
            await delay(1000);
          }
        }
        break;
      }

      case 'rightClickFirst': {
        // Right-click on first row in grid
        const firstRow = await page.$('.ag-row-first, .ag-row:first-child, .ag-row[row-index="0"]');
        if (firstRow) {
          await firstRow.click({ button: 'right' });
          await delay(500);
        }
        break;
      }

      case 'splitLayout': {
        // Use Window menu to change layout
        const windowButton = await findByText(page, 'button', 'Window');
        if (windowButton) {
          await windowButton.click();
          await delay(500);
          const menuItem = await findByText(page, '.bp5-menu-item', 'Tile Horizontally');
          if (menuItem) {
            await menuItem.click();
            await delay(1000);
          }
        }
        break;
      }

      case 'resetLayout': {
        // Reset to default layout
        const windowButton = await findByText(page, 'button', 'Window');
        if (windowButton) {
          await windowButton.click();
          await delay(500);
          const menuItem = await findByText(page, '.bp5-menu-item', 'Default (All in one)');
          if (menuItem) {
            await menuItem.click();
            await delay(1000);
          }
        }
        break;
      }

      default:
        console.log(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.log(`Action failed: ${e.message}`);
  }
}

async function captureScreenshot(page, screenshot, isLoggedIn) {
  const { name, tab, action, requiresAuth, custom, resetAfter } = screenshot;

  // Skip auth-required screenshots if not logged in
  if (requiresAuth !== false && !isLoggedIn) {
    console.log(`Skipping ${name} - requires authentication`);
    return;
  }

  console.log(`Capturing: ${name}`);

  try {
    // Switch to tab if specified
    if (tab && isLoggedIn) {
      await clickTab(page, tab);
      await delay(1500);
    }

    // Perform action if specified
    if (action) {
      await openDialog(page, action);
      await delay(1000);
    }

    // Handle custom scenarios
    if (custom) {
      await openDialog(page, custom);
      await delay(1000);
    }

    // Capture screenshot
    const filepath = path.join(OUTPUT_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`  Saved: ${filepath}`);

    // Close any open dialogs by pressing Escape
    await page.keyboard.press('Escape');
    await delay(500);

    // Reset layout if needed (e.g., after split layout screenshot)
    if (resetAfter) {
      console.log('  Resetting layout to default...');
      await openDialog(page, 'resetLayout');
      await delay(1000);
    }

  } catch (e) {
    console.log(`  Error capturing ${name}: ${e.message}`);
  }
}

async function main() {
  console.log('Starting Pulsar Screenshot Capture\n');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Target URL: ${BASE_URL}\n`);

  if (!EMAIL || !PASSWORD) {
    console.log('WARNING: No credentials provided. Set PULSAR_EMAIL and PULSAR_PASSWORD environment variables.');
    console.log('Only the login screen will be captured.\n');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();

  try {
    // Capture login screen first
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await delay(2000);

    const loginScreenshot = screenshots.find(s => s.name === 'login-screen');
    if (loginScreenshot) {
      await captureScreenshot(page, loginScreenshot, false);
    }

    // Attempt login
    const isLoggedIn = await login(page);

    if (isLoggedIn) {
      // Wait for app to load
      await delay(3000);

      // Capture remaining screenshots
      for (const screenshot of screenshots) {
        if (screenshot.name === 'login-screen') continue; // Already captured
        await captureScreenshot(page, screenshot, isLoggedIn);
      }
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }

  console.log('\nScreenshot capture complete!');
  console.log(`Images saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
