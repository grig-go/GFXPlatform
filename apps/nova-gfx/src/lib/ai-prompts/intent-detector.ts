/**
 * Intent Detection for Dynamic Prompt Building
 *
 * Analyzes user messages to determine:
 * - What type of graphic they want to create
 * - Whether it's sports-related (to include team logo tools)
 * - Whether they're updating vs creating
 * - What element types they might need
 */

import type { AIContext } from '@emergent-platform/types';

export interface UserIntent {
  // Action type
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isAsking: boolean; // Just asking a question, not making changes

  // Content type detection
  isSportsRelated: boolean;
  isWeatherRelated: boolean;
  isNewsRelated: boolean;
  isFinanceRelated: boolean;

  // What they need
  needsStyling: boolean;
  needsAnimation: boolean;
  needsData: boolean; // Charts, tables, tickers
  needsInteractive: boolean; // Interactive scripting, buttons, navigation

  // Element types mentioned or implied
  mentionedElementTypes: string[];
  suggestedElementTypes: string[];

  // Graphic type detection
  graphicType: 'lower-third' | 'score-bug' | 'fullscreen' | 'ticker' | 'weather' | 'chart' | 'generic' | null;

  // Sports specifics
  sportsLeague: 'nfl' | 'nba' | 'mlb' | 'nhl' | 'soccer' | 'college' | null;
  sportsTeams: string[];
}

// Keywords for detection
const SPORTS_KEYWORDS = [
  'sports', 'score', 'scoreboard', 'score bug', 'game', 'match', 'team',
  'football', 'basketball', 'baseball', 'hockey', 'soccer',
  'nfl', 'nba', 'mlb', 'nhl', 'mls', 'ncaa', 'college',
  'touchdown', 'goal', 'home run', 'point', 'quarter', 'inning', 'period',
  'player', 'athlete', 'vs', 'versus', 'matchup',
];

const WEATHER_KEYWORDS = [
  'weather', 'forecast', 'temperature', 'temp', 'sunny', 'cloudy', 'rain',
  'snow', 'storm', 'humidity', 'wind', 'celsius', 'fahrenheit', 'degrees',
  'high', 'low', 'precipitation', 'uv', 'pollen',
];

const NEWS_KEYWORDS = [
  'news', 'breaking', 'headline', 'alert', 'live', 'update', 'reporter',
  'anchor', 'correspondent', 'interview', 'story', 'coverage',
];

const FINANCE_KEYWORDS = [
  'stock', 'market', 'finance', 'trading', 'price', 'ticker', 'nasdaq',
  'dow', 's&p', 'crypto', 'bitcoin', 'earnings', 'revenue',
];

const INTERACTIVE_KEYWORDS = [
  'interactive', 'button', 'click', 'clickable', 'hover', 'navigation',
  'navigate', 'switch', 'toggle', 'select', 'selector', 'tab', 'tabs',
  'menu', 'dropdown', 'carousel', 'slider', 'expandable', 'collapsible',
  'accordion', 'modal', 'popup', 'dialog', 'touch', 'gesture', 'drag', 'drop',
  'script', 'scripting', 'event', 'action', 'trigger', 'state', 'dynamic',
  'address', '@', 'binding', 'data-driven',
];

const CREATE_KEYWORDS = [
  'create', 'make', 'build', 'design', 'add', 'new', 'generate',
];

const UPDATE_KEYWORDS = [
  'update', 'change', 'modify', 'edit', 'improve', 'enhance', 'better',
  'fix', 'adjust', 'tweak', 'refine', 'move', 'resize', 'recolor',
];

const DELETE_KEYWORDS = [
  'delete', 'remove', 'clear', 'get rid of', 'erase',
];

const ELEMENT_TYPE_KEYWORDS: Record<string, string[]> = {
  'text': ['text', 'label', 'title', 'name', 'headline', 'caption', 'font'],
  'shape': ['shape', 'rectangle', 'box', 'background', 'container', 'card', 'panel'],
  'image': ['image', 'photo', 'picture', 'logo', 'img'],
  'icon': ['icon', 'symbol', 'emoji'],
  'chart': ['chart', 'graph', 'bar chart', 'pie chart', 'line chart', 'data visualization'],
  'table': ['table', 'grid', 'standings', 'stats', 'statistics', 'leaderboard'],
  'map': ['map', 'location', 'geography', 'city', 'region'],
  'video': ['video', 'clip', 'footage', 'youtube', 'vimeo'],
  'ticker': ['ticker', 'crawl', 'scroll', 'scrolling text', 'news ticker'],
  'countdown': ['countdown', 'timer', 'clock', 'time'],
  'topic-badge': ['badge', 'topic', 'category', 'tag'],
  'line': ['line', 'divider', 'separator', 'arrow'],
  'svg': ['svg', 'vector', 'pattern'],
};

const GRAPHIC_TYPE_KEYWORDS: Record<string, string[]> = {
  'lower-third': ['lower third', 'l3', 'lower-third', 'name tag', 'name plate', 'super', 'chyron'],
  'score-bug': ['score bug', 'score', 'scoreboard', 'scorebug', 'game score'],
  'fullscreen': ['fullscreen', 'full screen', 'full-screen', 'slate', 'bumper'],
  'ticker': ['ticker', 'crawl', 'news crawl', 'scroll'],
  'weather': ['weather', 'forecast', 'weather map'],
  'chart': ['chart', 'graph', 'data', 'visualization'],
};

const NFL_TEAMS = [
  'cardinals', 'falcons', 'ravens', 'bills', 'panthers', 'bears', 'bengals',
  'browns', 'cowboys', 'broncos', 'lions', 'packers', 'texans', 'colts',
  'jaguars', 'chiefs', 'raiders', 'chargers', 'rams', 'dolphins', 'vikings',
  'patriots', 'saints', 'giants', 'jets', 'eagles', 'steelers', '49ers',
  'seahawks', 'buccaneers', 'titans', 'commanders', 'washington', 'arizona',
  'atlanta', 'baltimore', 'buffalo', 'carolina', 'chicago', 'cincinnati',
  'cleveland', 'dallas', 'denver', 'detroit', 'green bay', 'houston',
  'indianapolis', 'jacksonville', 'kansas city', 'las vegas', 'los angeles',
  'miami', 'minnesota', 'new england', 'new orleans', 'new york', 'philadelphia',
  'pittsburgh', 'san francisco', 'seattle', 'tampa bay', 'tennessee',
];

const NBA_TEAMS = [
  'hawks', 'celtics', 'nets', 'hornets', 'bulls', 'cavaliers', 'mavericks',
  'nuggets', 'pistons', 'warriors', 'rockets', 'pacers', 'clippers', 'lakers',
  'grizzlies', 'heat', 'bucks', 'timberwolves', 'pelicans', 'knicks', 'thunder',
  'magic', '76ers', 'sixers', 'suns', 'trail blazers', 'blazers', 'kings',
  'spurs', 'raptors', 'jazz', 'wizards',
];

const MLB_TEAMS = [
  'diamondbacks', 'braves', 'orioles', 'red sox', 'cubs', 'white sox', 'reds',
  'guardians', 'rockies', 'tigers', 'astros', 'royals', 'angels', 'dodgers',
  'marlins', 'brewers', 'twins', 'mets', 'yankees', 'athletics', 'phillies',
  'pirates', 'padres', 'giants', 'mariners', 'cardinals', 'rays', 'rangers',
  'blue jays', 'nationals',
];

const NHL_TEAMS = [
  'ducks', 'bruins', 'sabres', 'flames', 'hurricanes', 'blackhawks', 'avalanche',
  'blue jackets', 'stars', 'red wings', 'oilers', 'panthers', 'kings', 'wild',
  'canadiens', 'predators', 'devils', 'islanders', 'rangers', 'senators',
  'flyers', 'penguins', 'sharks', 'kraken', 'blues', 'lightning', 'maple leafs',
  'canucks', 'golden knights', 'capitals', 'jets',
];

/**
 * Detect user intent from their message
 */
export function detectIntent(message: string, context: AIContext): UserIntent {
  const lowerMessage = message.toLowerCase();

  // Detect action type
  const isCreating = CREATE_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const isUpdating = UPDATE_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const isDeleting = DELETE_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const isAsking = lowerMessage.includes('?') ||
    lowerMessage.startsWith('how') ||
    lowerMessage.startsWith('what') ||
    lowerMessage.startsWith('can you');

  // Detect content type
  const isSportsRelated = SPORTS_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const isWeatherRelated = WEATHER_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const isNewsRelated = NEWS_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const isFinanceRelated = FINANCE_KEYWORDS.some(kw => lowerMessage.includes(kw));

  // Detect needs
  const needsStyling = isCreating ||
    ['style', 'color', 'gradient', 'glass', 'shadow', 'design', 'look', 'appearance'].some(kw => lowerMessage.includes(kw));
  const needsAnimation = isCreating ||
    ['animate', 'animation', 'motion', 'transition', 'fade', 'slide', 'entrance', 'exit'].some(kw => lowerMessage.includes(kw));
  const needsData = ['data', 'chart', 'table', 'stats', 'statistics', 'numbers'].some(kw => lowerMessage.includes(kw));
  const needsInteractive = context.isInteractive ||
    INTERACTIVE_KEYWORDS.some(kw => lowerMessage.includes(kw));

  // Detect element types
  const mentionedElementTypes: string[] = [];
  for (const [type, keywords] of Object.entries(ELEMENT_TYPE_KEYWORDS)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      mentionedElementTypes.push(type);
    }
  }

  // Suggest element types based on context
  const suggestedElementTypes: string[] = [];
  if (isSportsRelated && !mentionedElementTypes.includes('image')) {
    suggestedElementTypes.push('image'); // For team logos
  }
  if (isWeatherRelated) {
    if (!mentionedElementTypes.includes('map')) suggestedElementTypes.push('map');
    if (!mentionedElementTypes.includes('icon')) suggestedElementTypes.push('icon');
  }
  if (isFinanceRelated && !mentionedElementTypes.includes('ticker')) {
    suggestedElementTypes.push('ticker');
  }

  // Detect graphic type
  let graphicType: UserIntent['graphicType'] = null;
  for (const [type, keywords] of Object.entries(GRAPHIC_TYPE_KEYWORDS)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      graphicType = type as UserIntent['graphicType'];
      break;
    }
  }

  // Detect sports league
  let sportsLeague: UserIntent['sportsLeague'] = null;
  if (isSportsRelated) {
    if (lowerMessage.includes('nfl') || lowerMessage.includes('football') ||
        NFL_TEAMS.some(t => lowerMessage.includes(t))) {
      sportsLeague = 'nfl';
    } else if (lowerMessage.includes('nba') || lowerMessage.includes('basketball') ||
        NBA_TEAMS.some(t => lowerMessage.includes(t))) {
      sportsLeague = 'nba';
    } else if (lowerMessage.includes('mlb') || lowerMessage.includes('baseball') ||
        MLB_TEAMS.some(t => lowerMessage.includes(t))) {
      sportsLeague = 'mlb';
    } else if (lowerMessage.includes('nhl') || lowerMessage.includes('hockey') ||
        NHL_TEAMS.some(t => lowerMessage.includes(t))) {
      sportsLeague = 'nhl';
    } else if (lowerMessage.includes('soccer') || lowerMessage.includes('mls') ||
        lowerMessage.includes('premier league') || lowerMessage.includes('la liga')) {
      sportsLeague = 'soccer';
    } else if (lowerMessage.includes('college') || lowerMessage.includes('ncaa')) {
      sportsLeague = 'college';
    }
  }

  // Extract team names mentioned
  const sportsTeams: string[] = [];
  const allTeams = [...NFL_TEAMS, ...NBA_TEAMS, ...MLB_TEAMS, ...NHL_TEAMS];
  for (const team of allTeams) {
    if (lowerMessage.includes(team)) {
      sportsTeams.push(team);
    }
  }

  return {
    isCreating: isCreating || (!isUpdating && !isDeleting && !isAsking),
    isUpdating,
    isDeleting,
    isAsking,
    isSportsRelated,
    isWeatherRelated,
    isNewsRelated,
    isFinanceRelated,
    needsStyling,
    needsAnimation,
    needsData,
    needsInteractive,
    mentionedElementTypes,
    suggestedElementTypes,
    graphicType,
    sportsLeague,
    sportsTeams,
  };
}
