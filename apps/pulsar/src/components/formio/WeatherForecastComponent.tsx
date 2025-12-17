import { getWeatherLocations, getWeatherDailyForecast, WeatherLocation } from '../../services/supabase/weatherLocations';

export const createWeatherForecastComponent = (Formio: any) => {
  if (!Formio || !Formio.Components) {
    console.error('Formio not available');
    return null;
  }

  const Component = Formio.Components.components.component;

  class WeatherForecastComponent extends Component {
    constructor(component: any, options: any, data: any) {
      super(component, options, data);
      this.isLoading = false;
      this.isLoadingLocations = false;
      this.selectedLocation = null;
      this.forecastData = null;
      this.dataValue = null;
      this.pendingValue = null; // Store value to apply after locations load
      this.locationsLoaded = false;
      this.weatherLocations = []; // Store loaded locations
    }

    static schema(...extend: any[]) {
      return Component.schema({
        type: 'weatherForecast',
        label: 'Weather Forecast',
        key: 'weatherForecast',
        input: true,
        persistent: true,
        templateName: 'WEATHER',
        dayPrefix: 'DAY',
        highPrefix: 'HI',
        lowPrefix: 'LO',
        conditionPrefix: 'COND',
        numDays: 3
      }, ...extend);
    }

    static get builderInfo() {
      return {
        title: 'Weather Forecast',
        icon: 'cloud',
        group: 'custom',
        weight: 22,
        schema: WeatherForecastComponent.schema()
      };
    }

    static editForm() {
      return {
        components: [
          {
            type: 'tabs',
            key: 'tabs',
            components: [
              {
                label: 'Display',
                key: 'display',
                components: [
                  {
                    type: 'textfield',
                    key: 'label',
                    label: 'Label',
                    input: true
                  },
                  {
                    type: 'textfield',
                    key: 'key',
                    label: 'Property Name',
                    input: true
                  },
                  {
                    type: 'textarea',
                    key: 'description',
                    label: 'Description',
                    input: true
                  }
                ]
              },
              {
                label: 'Data',
                key: 'data',
                components: [
                  {
                    type: 'textfield',
                    key: 'templateName',
                    label: 'Template Name',
                    placeholder: 'e.g., WEATHER',
                    input: true,
                    weight: 10
                  },
                  {
                    type: 'select',
                    key: 'numDays',
                    label: 'Number of Days',
                    placeholder: '3',
                    defaultValue: 3,
                    input: true,
                    weight: 11,
                    data: {
                      values: [
                        { label: '1', value: 1 },
                        { label: '2', value: 2 },
                        { label: '3', value: 3 },
                        { label: '4', value: 4 },
                        { label: '5', value: 5 },
                        { label: '6', value: 6 },
                        { label: '7', value: 7 }
                      ]
                    }
                  },
                  {
                    type: 'textfield',
                    key: 'dayPrefix',
                    label: 'Day Prefix',
                    placeholder: 'DAY',
                    defaultValue: 'DAY',
                    description: 'Field name prefix for day (e.g., DAY0, DAY1, DAY2)',
                    input: true,
                    weight: 12
                  },
                  {
                    type: 'textfield',
                    key: 'highPrefix',
                    label: 'High Prefix',
                    placeholder: 'HI',
                    defaultValue: 'HI',
                    description: 'Field name prefix for high temperature (e.g., HI0, HI1, HI2)',
                    input: true,
                    weight: 13
                  },
                  {
                    type: 'textfield',
                    key: 'lowPrefix',
                    label: 'Low Prefix',
                    placeholder: 'LO',
                    defaultValue: 'LO',
                    description: 'Field name prefix for low temperature (e.g., LO0, LO1, LO2)',
                    input: true,
                    weight: 14
                  },
                  {
                    type: 'textfield',
                    key: 'conditionPrefix',
                    label: 'Condition Prefix',
                    placeholder: 'COND',
                    defaultValue: 'COND',
                    description: 'Field name prefix for weather condition (e.g., COND0, COND1, COND2)',
                    input: true,
                    weight: 15
                  }
                ]
              }
            ]
          }
        ]
      };
    }

    render() {
      const isBuilderMode = this.builderMode || this.options?.builder || this.options?.readOnly;

      this.selectId = `select-${this.id}`;
      this.resultsId = `results-${this.id}`;

      return super.render(this.renderTemplate('weatherForecast', {
        component: this.component,
        isBuilderMode: isBuilderMode,
        selectId: this.selectId,
        resultsId: this.resultsId
      }));
    }

    renderTemplate(name: string, ctx: any) {
      if (name === 'weatherForecast') {
        const { component, isBuilderMode, selectId, resultsId } = ctx;

        if (isBuilderMode) {
          const numDays = component.numDays || 3;
          return `
            <div class="formio-component formio-component-${component.type}">
              <label class="control-label">
                ${component.label || 'Weather Forecast'}
              </label>
              <div style="
                padding: 20px;
                background: var(--formio-bg-lighter);
                border: 2px dashed var(--formio-border);
                border-radius: 4px;
                text-align: center;
                color: var(--formio-text-muted);
              ">
                <i class="fa fa-cloud" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                <div>Weather Forecast Display</div>
                <small>Shows ${numDays}-day forecast for selected location</small>
              </div>
            </div>
          `;
        }

        return `
          <div class="formio-component formio-component-${component.type}">
            <label class="control-label">
              ${component.label || 'Weather Forecast'}
            </label>

            <div style="padding: 1rem; background: var(--formio-bg-light); border-radius: 0.25rem;">
              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">Select Location</label>
                <select
                  ref="${selectId}"
                  id="${selectId}"
                  class="form-control"
                  style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                >
                  <option value="">Choose a location...</option>
                </select>
              </div>

              <div
                ref="${resultsId}"
                id="${resultsId}"
                class="weather-forecast-results"
              ></div>
            </div>

            ${component.description ? `<small class="form-text text-muted">${component.description}</small>` : ''}
          </div>
        `;
      }

      return super.renderTemplate(name, ctx);
    }

    attach(element: HTMLElement) {
      const attached = super.attach(element);

      if (this.builderMode || this.options?.builder || this.options?.readOnly) {
        return attached;
      }

      const select = element.querySelector(`[ref="${this.selectId}"]`) as HTMLSelectElement;

      // Auto-load forecast when location is selected
      if (select) {
        select.addEventListener('change', () => {
          // Update the stored value when user selects a new location
          this.dataValue = select.value || null;
          this.updateValue(); // Notify Form.io of the change

          if (select.value) {
            this.loadForecast(element);
          } else {
            // Clear results when no location is selected
            const resultsContainer = element.querySelector(`[ref="${this.resultsId}"]`) as HTMLElement;
            if (resultsContainer) {
              resultsContainer.innerHTML = '';
            }
          }
        });
      }

      // Load locations (this will also apply pending value after loading)
      this.loadLocations(element);

      return attached;
    }

    async loadLocations(element: HTMLElement) {
      if (this.isLoadingLocations) {
        return;
      }

      this.isLoadingLocations = true;
      const select = element.querySelector(`[ref="${this.selectId}"]`) as HTMLSelectElement;

      try {
        const locations = await getWeatherLocations();
        this.weatherLocations = locations;
        this.locationsLoaded = true;

        // Populate select dropdown
        if (select) {
          // Clear existing options except the first placeholder
          while (select.options.length > 1) {
            select.remove(1);
          }

          locations.forEach((location: WeatherLocation) => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = `${location.custom_name || location.name}${location.admin1 ? ', ' + location.admin1 : ''}`;
            select.appendChild(option);
          });
        }

        // Apply any pending value that was set before locations loaded
        if (this.pendingValue) {
          await this.applyValue(this.pendingValue, element);
          this.pendingValue = null;
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      } finally {
        this.isLoadingLocations = false;
      }
    }

    // Helper method to apply a value to the component
    async applyValue(value: any, element?: HTMLElement) {
      this.dataValue = value;

      const el = element || this.element;
      if (!el || !value) return;

      const select = el.querySelector(`[ref="${this.selectId}"]`) as HTMLSelectElement;
      if (select && select.options.length > 1) {
        select.value = value;
        // Trigger forecast load
        this.loadForecast(el);
      }
    }

    async loadForecast(element: HTMLElement) {
      if (this.isLoading) {
        return;
      }

      this.isLoading = true;
      const resultsContainer = element.querySelector(`[ref="${this.resultsId}"]`) as HTMLElement;
      const select = element.querySelector(`[ref="${this.selectId}"]`) as HTMLSelectElement;

      if (!select || !select.value) {
        this.isLoading = false;
        return;
      }

      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="text-center" style="padding: 2rem; color: var(--formio-text-muted);">
            <i class="fa fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 0.5rem;">Loading forecast...</p>
          </div>
        `;
      }

      try {
        // Get selected location
        const locations = await getWeatherLocations();
        const location = locations.find((loc: WeatherLocation) => loc.id === select.value);

        if (!location) {
          throw new Error('Location not found');
        }

        this.selectedLocation = location;

        // Get number of days from component config (default to 3)
        const numDays = this.component.numDays || 3;

        // Fetch forecast from Supabase weather_daily_forecast table
        const forecasts = await getWeatherDailyForecast(location.id, numDays);

        if (forecasts.length === 0) {
          // Show message when no forecast data available
          if (resultsContainer) {
            resultsContainer.innerHTML = `
              <div style="margin-bottom: 1rem; font-weight: 600; font-size: 1.1rem; color: var(--formio-text);">
                ${this.escapeHtml(this.selectedLocation.custom_name || this.selectedLocation.name)}
              </div>
              <div style="color: var(--formio-text-muted); font-style: italic; padding: 1rem; background: var(--formio-bg-card); border: 1px solid var(--formio-border); border-radius: 0.25rem;">
                No forecast data available for this location
              </div>
            `;
          }
          return;
        }

        this.forecastData = {
          days: forecasts.map((forecast) => {
            // Handle both WeatherAPI (temp_max_f) and CSV (temp_max_value) column names
            const highTemp = forecast.temp_max_f ?? forecast.temp_max_value;
            const lowTemp = forecast.temp_min_f ?? forecast.temp_min_value;
            return {
              date: forecast.forecast_date,
              high: highTemp !== null ? Math.round(highTemp) : null,
              low: lowTemp !== null ? Math.round(lowTemp) : null,
              conditions: forecast.condition_text || forecast.summary || 'Unknown'
            };
          })
        };

        this.renderResults(resultsContainer);
      } catch (error) {
        console.error('Error loading forecast:', error);
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div class="alert alert-danger" style="padding: 0.75rem 1.25rem; margin-bottom: 1rem; border: 1px solid transparent; border-radius: 0.25rem; background-color: #f8d7da; border-color: #f5c6cb; color: #721c24;">
              <strong>Error:</strong> ${error instanceof Error ? error.message : 'Failed to load forecast'}
            </div>
          `;
        }
      } finally {
        this.isLoading = false;
      }
    }

    renderResults(container: HTMLElement) {
      if (!container || !this.forecastData || !this.selectedLocation) return;

      const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const locationHeader = `
        <div style="margin-bottom: 1rem; font-weight: 600; font-size: 1.1rem; color: var(--formio-text);">
          ${this.escapeHtml(this.selectedLocation.custom_name || this.selectedLocation.name)}
        </div>
      `;

      const forecastCards = this.forecastData.days.map((day: any) => {
        const date = new Date(day.date + 'T00:00:00'); // Add time to avoid timezone issues
        const dayAbbr = dayAbbreviations[date.getDay()];
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
          <div style="
            border: 1px solid var(--formio-border);
            border-radius: 0.25rem;
            padding: 1rem;
            background: var(--formio-bg-card);
          ">
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem; color: var(--formio-text-dark);">${dayAbbr}</div>
            <div style="color: var(--formio-text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">${formattedDate}</div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="font-size: 1.5rem; font-weight: 500; color: var(--formio-btn-primary);">
                ${day.high !== null ? day.high + '°F' : 'N/A'}
              </div>
              <div style="color: var(--formio-text-muted);">
                / ${day.low !== null ? day.low + '°F' : 'N/A'}
              </div>
            </div>
            <div style="margin-top: 0.5rem; color: var(--formio-text);">
              ${this.escapeHtml(day.conditions)}
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        ${locationHeader}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          ${forecastCards}
        </div>
      `;
    }

    escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    getValue() {
      // First check the select element for the current value
      if (this.element) {
        const select = this.element.querySelector(`[ref="${this.selectId}"]`) as HTMLSelectElement;
        if (select && select.value) {
          return select.value;
        }
      }
      // Fall back to stored value
      return this.dataValue || this.selectedLocation?.id || null;
    }

    // Return additional data that should be saved alongside the main value
    getAdditionalFields(): Record<string, string> | null {
      const key = this.component.key || 'weatherForecast';
      const locationId = this.getValue();

      if (!locationId) return null;

      // Look up from cached weatherLocations first (most reliable)
      if (this.weatherLocations && this.weatherLocations.length > 0) {
        const loc = this.weatherLocations.find((l: WeatherLocation) => l.id === locationId);
        if (loc) {
          return {
            [`__${key}_locationName`]: loc.custom_name || loc.name || ''
          };
        }
      }

      // Fall back to selectedLocation
      if (this.selectedLocation && this.selectedLocation.id === locationId) {
        return {
          [`__${key}_locationName`]: this.selectedLocation.custom_name || this.selectedLocation.name || ''
        };
      }

      // Fall back to select element text
      if (this.element) {
        const select = this.element.querySelector(`[ref="${this.selectId}"]`) as HTMLSelectElement;
        if (select && select.selectedIndex > 0) {
          const selectedOption = select.options[select.selectedIndex];
          if (selectedOption && selectedOption.value === locationId) {
            return {
              [`__${key}_locationName`]: selectedOption.text
            };
          }
        }
      }

      return null;
    }

    setValue(value: any, flags: any = {}) {
      // Store the value
      this.dataValue = value;

      // If locations haven't loaded yet, store the value for later
      if (!this.locationsLoaded) {
        this.pendingValue = value;
        return super.setValue(value, flags);
      }

      // Locations are loaded, apply the value immediately
      this.applyValue(value);

      return super.setValue(value, flags);
    }
  }

  return WeatherForecastComponent;
};

/**
 * Registers the weather forecast component with Form.io
 */
export const registerWeatherForecastComponent = () => {
  const Formio = (window as any).Formio;

  if (!Formio) {
    console.error('Formio not available for weather forecast component registration');
    return false;
  }

  if (Formio.Components.components.weatherForecast) {
    return true;
  }

  const WeatherForecastComponent = createWeatherForecastComponent(Formio);
  if (WeatherForecastComponent) {
    Formio.Components.addComponent('weatherForecast', WeatherForecastComponent);
    return true;
  }

  return false;
};
