export interface TransformDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

// AI transformation is always available for any type
const AI_TRANSFORM: TransformDefinition = {
  id: 'ai-transform',
  name: 'AI Transform',
  description: 'Use Claude AI to intelligently transform data',
  icon: 'predictive-analysis',
  category: 'advanced'
};

export const TRANSFORMATIONS: Record<string, Record<string, TransformDefinition[]>> = {
  string: {
    string: [
      { id: 'direct', name: 'Direct Copy', description: 'Copy value as-is', icon: 'arrow-right', category: 'basic' },
      { id: 'uppercase', name: 'Uppercase', description: 'Convert to uppercase', icon: 'font', category: 'text' },
      { id: 'lowercase', name: 'Lowercase', description: 'Convert to lowercase', icon: 'font', category: 'text' },
      { id: 'capitalize', name: 'Capitalize', description: 'Capitalize first letter', icon: 'font', category: 'text' },
      { id: 'trim', name: 'Trim', description: 'Remove whitespace', icon: 'clean', category: 'text' },
      { id: 'substring', name: 'Substring', description: 'Extract part of text', icon: 'cut', category: 'text' },
      { id: 'replace', name: 'Find & Replace', description: 'Replace text', icon: 'search-text', category: 'text' },
      { id: 'regex-extract', name: 'Regex Extract', description: 'Extract using regex', icon: 'filter', category: 'advanced' },
      { id: 'string-format', name: 'Format Template', description: 'Use template string', icon: 'code-block', category: 'advanced' }
    ],
    number: [
      { id: 'parse-number', name: 'Parse as Number', description: 'Convert to number', icon: 'numerical', category: 'conversion' },
      { id: 'length', name: 'String Length', description: 'Get text length', icon: 'horizontal-bar-chart', category: 'analysis' }
    ],
    boolean: [
      { id: 'is-empty', name: 'Is Empty?', description: 'Check if empty', icon: 'help', category: 'validation' },
      { id: 'contains', name: 'Contains?', description: 'Check for text', icon: 'search', category: 'validation' }
    ],
    array: [
      { id: 'split', name: 'Split Text', description: 'Split into array', icon: 'split-columns', category: 'conversion' }
    ]
  },
  number: {
    number: [
      { id: 'direct', name: 'Direct Copy', description: 'Copy value as-is', icon: 'arrow-right', category: 'basic' },
      { id: 'round', name: 'Round', description: 'Round to decimal places', icon: 'numerical', category: 'math' },
      { id: 'floor', name: 'Floor', description: 'Round down', icon: 'arrow-down', category: 'math' },
      { id: 'ceil', name: 'Ceiling', description: 'Round up', icon: 'arrow-up', category: 'math' },
      { id: 'abs', name: 'Absolute', description: 'Remove negative', icon: 'plus', category: 'math' },
      { id: 'math-operation', name: 'Math Operation', description: 'Apply calculation', icon: 'calculator', category: 'math' }
    ],
    string: [
      { id: 'to-string', name: 'To String', description: 'Convert to text', icon: 'font', category: 'conversion' },
      { id: 'format-number', name: 'Format Number', description: 'Format with locale', icon: 'numerical', category: 'formatting' },
      { id: 'currency', name: 'Currency', description: 'Format as currency', icon: 'dollar', category: 'formatting' }
    ],
    boolean: [
      { id: 'is-positive', name: 'Is Positive?', description: 'Check if > 0', icon: 'chevron-right', category: 'validation' },
      { id: 'is-zero', name: 'Is Zero?', description: 'Check if = 0', icon: 'equals', category: 'validation' }
    ]
  },
  date: {
    date: [
      { id: 'direct', name: 'Direct Copy', description: 'Copy value as-is', icon: 'arrow-right', category: 'basic' },
      { id: 'date-format', name: 'Format Date', description: 'Change date format', icon: 'calendar', category: 'formatting' }
    ],
    string: [
      { id: 'date-format', name: 'Format Date', description: 'Format as string', icon: 'calendar', category: 'formatting' },
      { id: 'relative-time', name: 'Relative Time', description: 'e.g., "2 days ago"', icon: 'time', category: 'formatting' }
    ],
    number: [
      { id: 'timestamp', name: 'Timestamp', description: 'Unix timestamp', icon: 'time', category: 'conversion' },
      { id: 'day-of-week', name: 'Day of Week', description: 'Get day number', icon: 'calendar', category: 'extraction' },
      { id: 'month', name: 'Month', description: 'Get month number', icon: 'calendar', category: 'extraction' },
      { id: 'year', name: 'Year', description: 'Get year', icon: 'calendar', category: 'extraction' }
    ]
  },
  boolean: {
    boolean: [
      { id: 'direct', name: 'Direct Copy', description: 'Copy value as-is', icon: 'arrow-right', category: 'basic' },
      { id: 'invert', name: 'Invert', description: 'Flip true/false', icon: 'swap-horizontal', category: 'logic' }
    ],
    string: [
      { id: 'to-string', name: 'To String', description: 'Convert to text', icon: 'font', category: 'conversion' },
      { id: 'yes-no', name: 'Yes/No', description: 'Convert to Yes/No', icon: 'font', category: 'formatting' },
      { id: 'custom-boolean', name: 'Custom Format', description: 'Custom true/false text', icon: 'font', category: 'formatting' }
    ],
    number: [
      { id: 'to-number', name: 'To Number', description: '1 or 0', icon: 'numerical', category: 'conversion' }
    ]
  },
  array: {
    string: [
      { id: 'join', name: 'Join', description: 'Join array items', icon: 'join', category: 'conversion' },
      { id: 'first', name: 'First Item', description: 'Get first item', icon: 'arrow-top-left', category: 'selection' },
      { id: 'last', name: 'Last Item', description: 'Get last item', icon: 'arrow-bottom-right', category: 'selection' }
    ],
    number: [
      { id: 'count', name: 'Count', description: 'Count items', icon: 'numerical', category: 'aggregation' },
      { id: 'sum', name: 'Sum', description: 'Sum all values', icon: 'plus', category: 'aggregation' },
      { id: 'average', name: 'Average', description: 'Calculate mean', icon: 'timeline-line-chart', category: 'aggregation' },
      { id: 'min', name: 'Minimum', description: 'Find minimum', icon: 'arrow-down', category: 'aggregation' },
      { id: 'max', name: 'Maximum', description: 'Find maximum', icon: 'arrow-up', category: 'aggregation' }
    ],
    array: [
      { id: 'direct', name: 'Direct Copy', description: 'Copy array as-is', icon: 'arrow-right', category: 'basic' },
      { id: 'filter', name: 'Filter', description: 'Filter items', icon: 'filter', category: 'manipulation' },
      { id: 'map', name: 'Map', description: 'Transform items', icon: 'exchange', category: 'manipulation' },
      { id: 'sort', name: 'Sort', description: 'Sort items', icon: 'sort', category: 'manipulation' },
      { id: 'unique', name: 'Unique', description: 'Remove duplicates', icon: 'group-objects', category: 'manipulation' }
    ],
    object: [
      { id: 'custom-aggregate', name: 'Custom Aggregate', description: 'Advanced array aggregation with custom logic', icon: 'code-block', category: 'advanced' }
    ]
  }
};

export function getAvailableTransformations(
  sourceType: string,
  targetType: string
): TransformDefinition[] {
  // Get type-specific transformations
  const typeSpecific = TRANSFORMATIONS[sourceType]?.[targetType] || [];

  // Always include AI transformation as the first advanced option
  const allTransforms = [...typeSpecific];

  // Add AI transform if not already present
  if (!allTransforms.find(t => t.id === 'ai-transform')) {
    // Insert AI transform at the beginning of advanced transformations
    const advancedIndex = allTransforms.findIndex(t => t.category === 'advanced');
    if (advancedIndex >= 0) {
      allTransforms.splice(advancedIndex, 0, AI_TRANSFORM);
    } else {
      allTransforms.push(AI_TRANSFORM);
    }
  }

  return allTransforms;
}
