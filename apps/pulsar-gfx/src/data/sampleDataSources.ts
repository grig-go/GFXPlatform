/**
 * Sample data sources for data binding feature in Pulsar GFX
 * This provides sample data for templates with data bindings
 */

export interface DataSourceConfig {
  id: string;
  name: string;
  category: string;
  type: string;
  subCategory?: string;
  displayField: string; // Field to show in record dropdown (supports dot notation)
  data: Record<string, unknown>[];
}

// Elections - Presidential Results
const electionsPresidentData = [
  {
    "Title": "Alabama Presidential Election",
    "Votes2": 769391,
    "Votes1": 1457704,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Alabama",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 64.83,
    "Pct2": 34.22,
    "Reporting": 2021
  },
  {
    "Title": "Alaska Presidential Election",
    "Votes2": 140026,
    "Votes1": 184458,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Alaska",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 54.54,
    "Pct2": 41.41,
    "Reporting": 403
  },
  {
    "Title": "Arizona Presidential Election",
    "Votes2": 1582860,
    "Votes1": 1770242,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Arizona",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 52.23,
    "Pct2": 46.7,
    "Reporting": 1736
  },
  {
    "Title": "California Presidential Election",
    "Votes2": 6081697,
    "Votes1": 9276179,
    "Candidate2": "Donald Trump",
    "Candidate1": "Kamala Harris",
    "State": "California",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 58.48,
    "Pct2": 38.34,
    "Reporting": 24811
  },
  {
    "Title": "Florida Presidential Election",
    "Votes2": 4680890,
    "Votes1": 6109549,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Florida",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 56.1,
    "Pct2": 42.98,
    "Reporting": 5630
  },
  {
    "Title": "Georgia Presidential Election",
    "Votes2": 2548017,
    "Votes1": 2663117,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Georgia",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 50.73,
    "Pct2": 48.53,
    "Reporting": 2701
  },
  {
    "Title": "Michigan Presidential Election",
    "Votes2": 2724029,
    "Votes1": 2804647,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Michigan",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 49.74,
    "Pct2": 48.31,
    "Reporting": 4511
  },
  {
    "Title": "New York Presidential Election",
    "Votes2": 3548552,
    "Votes1": 4583210,
    "Candidate2": "Donald Trump",
    "Candidate1": "Kamala Harris",
    "State": "New York",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 56.36,
    "Pct2": 43.64,
    "Reporting": 13303
  },
  {
    "Title": "Pennsylvania Presidential Election",
    "Votes2": 3421247,
    "Votes1": 3542701,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Pennsylvania",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 50.38,
    "Pct2": 48.65,
    "Reporting": 9153
  },
  {
    "Title": "Texas Presidential Election",
    "Votes2": 4806474,
    "Votes1": 6375376,
    "Candidate2": "Kamala Harris",
    "Candidate1": "Donald Trump",
    "State": "Texas",
    "Winner1": true,
    "Winner2": false,
    "Pct1": 56.26,
    "Pct2": 42.41,
    "Reporting": 9885
  }
];

// Weather - Current Conditions
const weatherCurrentData = [
  {
    "location": {
      "name": "Atlantic City",
      "country": "United States of America",
      "state": "New Jersey"
    },
    "weather": {
      "temperature": {
        "value": 55,
        "unit": "°F",
        "valueAndUnit": "55°F"
      },
      "icon": "sunny"
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Beach Haven",
      "country": "United States of America",
      "state": "New Jersey"
    },
    "weather": {
      "temperature": {
        "value": 28.9,
        "unit": "°F",
        "valueAndUnit": "28.9°F"
      },
      "icon": "clear"
    },
    "lastUpdated": "2025-12-18 00:45"
  },
  {
    "location": {
      "name": "Boston",
      "country": "United States of America",
      "state": "Massachusetts"
    },
    "weather": {
      "temperature": {
        "value": 32.4,
        "unit": "°F",
        "valueAndUnit": "32.4°F"
      },
      "icon": "clear"
    },
    "lastUpdated": "2025-12-18 00:45"
  },
  {
    "location": {
      "name": "Bronx",
      "country": "United States of America",
      "state": "New York"
    },
    "weather": {
      "temperature": {
        "value": 54,
        "unit": "°F",
        "valueAndUnit": "54°F"
      },
      "icon": "sunny"
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Brooklyn",
      "country": "United States of America",
      "state": "New York"
    },
    "weather": {
      "temperature": {
        "value": 54,
        "unit": "°F",
        "valueAndUnit": "54°F"
      },
      "icon": "partly cloudy"
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Central Park",
      "country": "United States of America",
      "state": "New York"
    },
    "weather": {
      "temperature": {
        "value": 54,
        "unit": "°F",
        "valueAndUnit": "54°F"
      },
      "icon": "fair"
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Chicago",
      "country": "United States of America",
      "state": "Illinois"
    },
    "weather": {
      "temperature": {
        "value": 37.9,
        "unit": "°F",
        "valueAndUnit": "37.9°F"
      },
      "icon": "overcast"
    },
    "lastUpdated": "2025-12-17 23:45"
  },
  {
    "location": {
      "name": "Houston",
      "country": "United States of America",
      "state": "Texas"
    },
    "weather": {
      "temperature": {
        "value": 61.2,
        "unit": "°F",
        "valueAndUnit": "61.2°F"
      },
      "icon": "fog"
    },
    "lastUpdated": "2025-12-17 23:45"
  }
];

// Weather - Daily Forecast
const weatherDailyData = [
  {
    "location": {
      "name": "Atlantic City",
      "country": "United States of America",
      "state": "New Jersey"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20"],
          "temperatureMax": {
            "valueAndUnit": ["59°F", "48°F", "55°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["37°F", "37°F", "28°F"]
          },
          "icon": ["am showers", "sunny", "mostly sunny"],
          "precipitationProbability": [49, 0, 1]
        }
      ]
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Boston",
      "country": "United States of America",
      "state": "Massachusetts"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20", "2025-12-21", "2025-12-22", "2025-12-23", "2025-12-24"],
          "temperatureMax": {
            "valueAndUnit": ["43.9°F", "55.2°F", "31.1°F", "43.9°F", "29.8°F", "29.9°F", "37°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["26.1°F", "33.6°F", "24.3°F", "29.5°F", "23.5°F", "21.1°F", "28.3°F"]
          },
          "icon": ["sunny", "heavy rain", "sunny", "patchy rain nearby", "sunny", "partly cloudy ", "patchy moderate snow"],
          "precipitationProbability": [0, 0.86, 0, 0.86, 0, 0, 0.67]
        }
      ]
    },
    "lastUpdated": "2025-12-18 01:00"
  },
  {
    "location": {
      "name": "Bronx",
      "country": "United States of America",
      "state": "New York"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20"],
          "temperatureMax": {
            "valueAndUnit": ["63°F", "50°F", "55°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["34°F", "37°F", "27°F"]
          },
          "icon": ["am clouds/pm sun", "sunny", "mostly sunny"],
          "precipitationProbability": [24, 0, 0]
        }
      ]
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Brooklyn",
      "country": "United States of America",
      "state": "New York"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20"],
          "temperatureMax": {
            "valueAndUnit": ["63°F", "50°F", "54°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["36°F", "37°F", "27°F"]
          },
          "icon": ["am clouds/pm sun", "sunny", "mostly sunny/wind"],
          "precipitationProbability": [24, 0, 0]
        }
      ]
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Central Park",
      "country": "United States of America",
      "state": "New York"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20"],
          "temperatureMax": {
            "valueAndUnit": ["61°F", "48°F", "54°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["34°F", "36°F", "27°F"]
          },
          "icon": ["mostly sunny", "sunny", "mostly sunny/wind"],
          "precipitationProbability": [22, 0, 0]
        }
      ]
    },
    "lastUpdated": "2025-12-17T01:45:00.903+00:00"
  },
  {
    "location": {
      "name": "Chicago",
      "country": "United States of America",
      "state": "Illinois"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20", "2025-12-21", "2025-12-22", "2025-12-23", "2025-12-24"],
          "temperatureMax": {
            "valueAndUnit": ["47.3°F", "20.3°F", "35.2°F", "30.6°F", "33.8°F", "37.6°F", "37.1°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["28.4°F", "12°F", "21.7°F", "29.1°F", "28.5°F", "31.4°F", "33.7°F"]
          },
          "icon": ["moderate rain", "partly cloudy ", "overcast ", "light freezing rain", "heavy snow", "cloudy ", "patchy rain nearby"],
          "precipitationProbability": [0.88, 0, 0, 0.81, 0.72, 0, 0.85]
        }
      ]
    },
    "lastUpdated": "2025-12-18 00:00"
  },
  {
    "location": {
      "name": "Houston",
      "country": "United States of America",
      "state": "Texas"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20", "2025-12-21", "2025-12-22", "2025-12-23", "2025-12-24"],
          "temperatureMax": {
            "valueAndUnit": ["78.4°F", "71.1°F", "68.7°F", "79.9°F", "77.9°F", "78.3°F", "76.7°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["61.2°F", "51.4°F", "53.4°F", "66.1°F", "68.4°F", "65.9°F", "65.6°F"]
          },
          "icon": ["patchy rain nearby", "sunny", "overcast ", "patchy rain nearby", "patchy rain nearby", "partly cloudy ", "cloudy "],
          "precipitationProbability": [0.67, 0, 0, 0.8, 0.84, 0, 0]
        }
      ]
    },
    "lastUpdated": "2025-12-18 00:00"
  },
  {
    "location": {
      "name": "Newark",
      "country": "United States of America",
      "state": "New Jersey"
    },
    "weather": {
      "items": [
        {
          "date": ["2025-12-18", "2025-12-19", "2025-12-20"],
          "temperatureMax": {
            "valueAndUnit": ["64°F", "50°F", "55°F"]
          },
          "temperatureMin": {
            "valueAndUnit": ["34°F", "36°F", "25°F"]
          },
          "icon": ["am clouds/pm sun", "sunny", "mostly sunny"],
          "precipitationProbability": [24, 0, 0]
        }
      ]
    },
    "lastUpdated": "2025-12-17T01:45:00.905+00:00"
  }
];

// All available data sources
export const sampleDataSources: DataSourceConfig[] = [
  {
    id: 'elections-president-2024',
    name: 'Presidential Election Results 2024',
    category: 'Elections',
    type: 'Presidential',
    subCategory: '2024 Results',
    displayField: 'State',
    data: electionsPresidentData,
  },
  {
    id: 'weather-current',
    name: 'Current Weather Conditions',
    category: 'Weather',
    type: 'Current',
    displayField: 'location.name',
    data: weatherCurrentData,
  },
  {
    id: 'weather-daily',
    name: '5-Day Weather Forecast',
    category: 'Weather',
    type: 'Daily',
    displayField: 'location.name',
    data: weatherDailyData,
  },
];

// Helper to get nested value from object using dot notation and array index access
// Supports paths like "location.name", "forecast[0].day", "weather.temperature.value"
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Parse path to handle both dot notation and array indices
  // e.g., "forecast[0].day" becomes ["forecast", "0", "day"]
  const parts = path.split(/\.|\[|\]/).filter(Boolean);

  return parts.reduce((acc: unknown, part) => {
    if (acc === null || acc === undefined) return undefined;

    // Check if part is a numeric index
    const index = parseInt(part, 10);
    if (!isNaN(index) && Array.isArray(acc)) {
      return acc[index];
    }

    if (typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }

    return undefined;
  }, obj);
}

// Get unique categories
export function getCategories(): string[] {
  return [...new Set(sampleDataSources.map(ds => ds.category))];
}

// Get data sources for category
export function getDataSourcesForCategory(category: string): DataSourceConfig[] {
  return sampleDataSources.filter(ds => ds.category === category);
}

// Get data source by ID
export function getDataSourceById(id: string): DataSourceConfig | undefined {
  return sampleDataSources.find(ds => ds.id === id);
}

// Only exclude exact 'id' field names (case variations)
function shouldExcludeField(fieldName: string): boolean {
  const exactIdMatches = ['id', 'Id', 'ID', '_id'];
  return exactIdMatches.includes(fieldName);
}

// Extract field names from first record of data
// Dynamically handles any JSON structure including deeply nested objects and arrays
export function extractFieldsFromData(data: Record<string, unknown>[]): { path: string; type: string; sample: unknown }[] {
  if (!data || data.length === 0) return [];

  const fields: { path: string; type: string; sample: unknown }[] = [];
  const seenPaths = new Set<string>();

  function extractFields(obj: unknown, prefix = '', arrayDepth = 0, maxArrayItems = 3, maxArrayDepth = 3): void {
    if (obj === null || obj === undefined) return;

    // Prevent infinite recursion on deeply nested arrays
    if (arrayDepth > maxArrayDepth) return;

    if (Array.isArray(obj)) {
      // For arrays, extract fields from the first few items with indexed access
      const arrayLength = Math.min(obj.length, maxArrayItems);
      for (let i = 0; i < arrayLength; i++) {
        const item = obj[i];
        const indexedPath = `${prefix}[${i}]`;

        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          // Object inside array - extract its fields
          for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
            if (shouldExcludeField(key)) continue;

            const fieldPath = `${indexedPath}.${key}`;

            if (value !== null && typeof value === 'object') {
              // Recurse into nested objects/arrays
              extractFields(value, fieldPath, Array.isArray(value) ? arrayDepth + 1 : arrayDepth, maxArrayItems, maxArrayDepth);
            } else {
              // Primitive value
              if (!seenPaths.has(fieldPath)) {
                seenPaths.add(fieldPath);
                fields.push({
                  path: fieldPath,
                  type: value === null ? 'null' : typeof value,
                  sample: value,
                });
              }
            }
          }
        } else if (Array.isArray(item)) {
          // Array of arrays - recurse
          extractFields(item, indexedPath, arrayDepth + 1, maxArrayItems, maxArrayDepth);
        } else if (item !== null && typeof item !== 'object') {
          // Primitive array items (like string[] or number[])
          if (!seenPaths.has(indexedPath)) {
            seenPaths.add(indexedPath);
            fields.push({
              path: indexedPath,
              type: typeof item,
              sample: item,
            });
          }
        }
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (shouldExcludeField(key)) continue;

        const path = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object') {
          // Recurse into nested objects/arrays
          extractFields(value, path, Array.isArray(value) ? arrayDepth + 1 : arrayDepth, maxArrayItems, maxArrayDepth);
        } else {
          // Primitive value
          if (!seenPaths.has(path)) {
            seenPaths.add(path);
            fields.push({
              path,
              type: value === null ? 'null' : typeof value,
              sample: value,
            });
          }
        }
      }
    }
  }

  extractFields(data[0]);
  return fields;
}
