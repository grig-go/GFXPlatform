import { getWeatherLocations, getWeatherCurrent, WeatherLocation } from '../../services/supabase/weatherLocations';

export const createWeatherCitiesComponent = (Formio: any) => {
  if (!Formio || !Formio.Components) {
    console.error('Formio not available');
    return null;
  }

  const Component = Formio.Components.components.component;

  class WeatherCitiesComponent extends Component {
    constructor(component: any, options: any, data: any) {
      super(component, options, data);
      this.isLoading = false;
      this.weatherLocations = [];
      this.selectedLocations = ['', '', ''];
      this.weatherData = new Map();
      this.pendingValue = null; // Store value to apply after locations load
      this.locationsLoaded = false;
    }

    static schema(...extend: any[]) {
      return Component.schema({
        type: 'weatherCities',
        label: 'Weather Cities',
        key: 'weatherCities',
        input: true,
        persistent: true,
        channelId: '',
        providerId: '',
        countryFilter: '',
        templateName: 'WEATHER_CITIES',
        field1: '01',
        field2: '02',
        field3: '03',
        format: '{{name}} {{temperature}}°F'
      }, ...extend);
    }

    static get builderInfo() {
      return {
        title: 'Weather Cities',
        icon: 'cloud',
        group: 'custom',
        weight: 20,
        schema: WeatherCitiesComponent.schema()
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
                    key: 'channelId',
                    label: 'Channel ID (Filter)',
                    placeholder: 'Leave empty for all channels',
                    input: true
                  },
                  {
                    type: 'textfield',
                    key: 'providerId',
                    label: 'Provider ID (Filter)',
                    placeholder: 'Leave empty for all providers',
                    input: true
                  },
                  {
                    type: 'textfield',
                    key: 'countryFilter',
                    label: 'Country Filter',
                    placeholder: 'e.g., US, CA',
                    input: true
                  },
                  {
                    type: 'textfield',
                    key: 'templateName',
                    label: 'Template Name',
                    placeholder: 'e.g., weather_cities',
                    input: true,
                    weight: 10
                  },
                  {
                    type: 'textfield',
                    key: 'field1',
                    label: 'City 1 Field',
                    placeholder: '01',
                    defaultValue: '01',
                    input: true,
                    weight: 11
                  },
                  {
                    type: 'textfield',
                    key: 'field2',
                    label: 'City 2 Field',
                    placeholder: '02',
                    defaultValue: '02',
                    input: true,
                    weight: 12
                  },
                  {
                    type: 'textfield',
                    key: 'field3',
                    label: 'City 3 Field',
                    placeholder: '03',
                    defaultValue: '03',
                    input: true,
                    weight: 13
                  },
                  {
                    type: 'textarea',
                    key: 'format',
                    label: 'Format',
                    placeholder: '{{name}} {{temperature}}°F',
                    description: 'Available variables: {{name}}, {{temperature}}, {{conditions}}, {{country}}, {{admin1}}',
                    input: true,
                    rows: 2,
                    weight: 20
                  }
                ]
              },
              {
                label: 'Validation',
                key: 'validation',
                components: [
                  {
                    type: 'checkbox',
                    key: 'validate.required',
                    label: 'Required',
                    input: true
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

      this.select1Id = `select1-${this.id}`;
      this.select2Id = `select2-${this.id}`;
      this.select3Id = `select3-${this.id}`;
      this.loadingId = `loading-${this.id}`;
      this.errorId = `error-${this.id}`;
      this.weatherDisplayId = `weather-${this.id}`;

      return super.render(this.renderTemplate('weatherCities', {
        component: this.component,
        isBuilderMode: isBuilderMode,
        select1Id: this.select1Id,
        select2Id: this.select2Id,
        select3Id: this.select3Id,
        loadingId: this.loadingId,
        errorId: this.errorId,
        weatherDisplayId: this.weatherDisplayId
      }));
    }

    renderTemplate(name: string, ctx: any) {
      if (name === 'weatherCities') {
        const { component, isBuilderMode, select1Id, select2Id, select3Id, loadingId, errorId, weatherDisplayId } = ctx;

        if (isBuilderMode) {
          return `
            <div class="formio-component formio-component-${component.type}">
              <label class="control-label">
                ${component.label || 'Weather Cities'}
                ${component.validate?.required ? '<span class="field-required">*</span>' : ''}
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
                <div>Weather Cities Selector</div>
                <small>3 city dropdowns with live weather</small>
              </div>
            </div>
          `;
        }

        return `
          <div class="formio-component formio-component-${component.type}">
            <label class="control-label">
              ${component.label || 'Weather Cities'}
              ${component.validate?.required ? '<span class="field-required">*</span>' : ''}
            </label>

            <div style="padding: 1rem; background: var(--formio-bg-light); border-radius: 0.25rem;">
              <div style="margin-bottom: 0.5rem;">
                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">City 1</label>
                <select
                  ref="${select1Id}"
                  id="${select1Id}"
                  class="form-control"
                  style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                >
                  <option value="">Select city...</option>
                </select>
              </div>

              <div style="margin-bottom: 0.5rem;">
                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">City 2</label>
                <select
                  ref="${select2Id}"
                  id="${select2Id}"
                  class="form-control"
                  style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                >
                  <option value="">Select city...</option>
                </select>
              </div>

              <div style="margin-bottom: 0.5rem;">
                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">City 3</label>
                <select
                  ref="${select3Id}"
                  id="${select3Id}"
                  class="form-control"
                  style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                >
                  <option value="">Select city...</option>
                </select>
              </div>

              <div
                ref="${loadingId}"
                id="${loadingId}"
                class="text-muted"
                style="padding: 0.5rem; display: none; color: var(--formio-text-muted);"
              >
                <i class="fa fa-spinner fa-spin"></i> Loading cities...
              </div>

              <div
                ref="${errorId}"
                id="${errorId}"
                class="alert alert-danger"
                style="padding: 0.75rem; margin-top: 0.5rem; display: none; background-color: #f8d7da; border-color: #f5c6cb; color: #721c24; border-radius: 0.25rem;"
              ></div>

              <div
                ref="${weatherDisplayId}"
                id="${weatherDisplayId}"
                class="weather-display"
                style="margin-top: 1rem;"
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

      const select1 = element.querySelector(`[ref="${this.select1Id}"]`) as HTMLSelectElement;
      const select2 = element.querySelector(`[ref="${this.select2Id}"]`) as HTMLSelectElement;
      const select3 = element.querySelector(`[ref="${this.select3Id}"]`) as HTMLSelectElement;

      if (select1) {
        select1.addEventListener('change', async () => {
          this.selectedLocations[0] = select1.value;
          await this.updateWeather(0, select1.value);
          this.updateValue();
        });
      }

      if (select2) {
        select2.addEventListener('change', async () => {
          this.selectedLocations[1] = select2.value;
          await this.updateWeather(1, select2.value);
          this.updateValue();
        });
      }

      if (select3) {
        select3.addEventListener('change', async () => {
          this.selectedLocations[2] = select3.value;
          await this.updateWeather(2, select3.value);
          this.updateValue();
        });
      }

      this.loadWeatherLocations(element);

      return attached;
    }

    async loadWeatherLocations(element: HTMLElement) {
      if (this.isLoading) {
        return;
      }

      this.isLoading = true;
      const loadingIndicator = element.querySelector(`[ref="${this.loadingId}"]`) as HTMLElement;
      const errorContainer = element.querySelector(`[ref="${this.errorId}"]`) as HTMLElement;

      if (loadingIndicator) loadingIndicator.style.display = 'block';
      if (errorContainer) errorContainer.style.display = 'none';

      try {
        const filters: any = {};

        if (this.component.channelId) {
          filters.channel_id = this.component.channelId;
        }

        if (this.component.providerId) {
          filters.provider_id = this.component.providerId;
        }

        if (this.component.countryFilter) {
          filters.country = this.component.countryFilter;
        }

        // Note: The edge function automatically filters for is_active = true
        // We don't need to add that filter here

        const cities = await getWeatherLocations(filters);
        this.weatherLocations = cities;
        this.locationsLoaded = true;

        this.populateAllDropdowns();

        // Apply any pending value that was set before locations loaded
        if (this.pendingValue) {
          await this.applyValue(this.pendingValue, element);
          this.pendingValue = null;
        }
      } catch (error) {
        console.error('Error loading weather cities:', error);
        if (errorContainer) {
          errorContainer.textContent = error instanceof Error ? error.message : 'Failed to load weather cities';
          errorContainer.style.display = 'block';
        }
      } finally {
        this.isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
      }
    }

    // Helper method to apply a value to the component
    async applyValue(value: any, element?: HTMLElement) {
      let parsedValue: string[] = [];

      // Handle different value formats
      if (!value) {
        parsedValue = [];
      } else if (Array.isArray(value)) {
        parsedValue = value;
      } else if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            parsedValue = parsed;
          }
        } catch (e) {
          parsedValue = [];
        }
      }

      // Pad array to 3 elements
      this.selectedLocations = [...parsedValue, '', '', ''].slice(0, 3);
      this.weatherData.clear();

      const el = element || this.element;
      if (!el) return;

      const select1 = el.querySelector(`[ref="${this.select1Id}"]`) as HTMLSelectElement;
      const select2 = el.querySelector(`[ref="${this.select2Id}"]`) as HTMLSelectElement;
      const select3 = el.querySelector(`[ref="${this.select3Id}"]`) as HTMLSelectElement;

      // Update dropdowns and load weather
      if (this.selectedLocations[0] && select1) {
        select1.value = this.selectedLocations[0];
        await this.updateWeather(0, this.selectedLocations[0]);
      }
      if (this.selectedLocations[1] && select2) {
        select2.value = this.selectedLocations[1];
        await this.updateWeather(1, this.selectedLocations[1]);
      }
      if (this.selectedLocations[2] && select3) {
        select3.value = this.selectedLocations[2];
        await this.updateWeather(2, this.selectedLocations[2]);
      }

      this.renderWeather();
    }

    populateAllDropdowns() {
      const select1 = this.element?.querySelector(`[ref="${this.select1Id}"]`) as HTMLSelectElement;
      const select2 = this.element?.querySelector(`[ref="${this.select2Id}"]`) as HTMLSelectElement;
      const select3 = this.element?.querySelector(`[ref="${this.select3Id}"]`) as HTMLSelectElement;

      if (select1) this.populateDropdown(select1, 0);
      if (select2) this.populateDropdown(select2, 1);
      if (select3) this.populateDropdown(select3, 2);
    }

    populateDropdown(select: HTMLSelectElement, index: number) {
      if (!select) {
        return;
      }

      const currentValue = this.selectedLocations[index];

      select.innerHTML = '<option value="">Select city...</option>';

      this.weatherLocations.forEach((location: WeatherLocation) => {
        const option = document.createElement('option');
        option.value = location.id;

        const displayName = location.custom_name || location.name;
        // Only show state (admin1), not country
        const additionalInfo = location.admin1 || '';

        option.textContent = additionalInfo
          ? `${displayName}, ${additionalInfo}`
          : displayName;

        option.dataset.locationData = JSON.stringify(location);

        if (location.id === currentValue) {
          option.selected = true;
        }

        select.appendChild(option);
      });
    }

    async updateWeather(index: number, locationId: string) {
      if (!locationId) {
        this.weatherData.delete(`location${index}`);
        this.renderWeather();
        return;
      }

      const location = this.weatherLocations.find((loc: WeatherLocation) => loc.id === locationId);
      if (!location) return;

      // Fetch current weather data from Supabase
      const weatherCurrent = await getWeatherCurrent(locationId);
      this.weatherData.set(`location${index}`, {
        location,
        weather: weatherCurrent ? {
          temperature: weatherCurrent.temperature_value,
          conditions: weatherCurrent.summary || 'Unknown'
        } : null
      });

      this.renderWeather();
    }

    renderWeather() {
      const container = this.element?.querySelector(`[ref="${this.weatherDisplayId}"]`) as HTMLElement;
      if (!container) return;

      const hasAnySelection = this.selectedLocations.some((id: string) => id !== '');

      if (!hasAnySelection) {
        container.innerHTML = '';
        return;
      }

      const cards = [];

      for (let i = 0; i < 3; i++) {
        const locationId = this.selectedLocations[i];
        if (!locationId) continue;

        const data = this.weatherData.get(`location${i}`);
        if (!data) continue;

        const { location, weather } = data;
        const displayName = location.custom_name || location.name;

        cards.push(`
          <div class="weather-location-card" style="
            border: 1px solid var(--formio-border);
            border-radius: 0.25rem;
            padding: 1rem;
            background: var(--formio-bg-card);
          ">
            <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 0.25rem; color: var(--formio-text-dark);">
              ${this.escapeHtml(displayName)}
            </div>
            <div style="color: var(--formio-text-muted); font-size: 0.9rem; margin-bottom: 0.5rem;">
              ${this.escapeHtml([location.admin1, location.country].filter(Boolean).join(', '))}
            </div>
            ${weather ? `
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="font-size: 1.5rem; font-weight: 500; color: var(--formio-btn-primary);">
                  ${weather.temperature !== null ? Math.round(weather.temperature) + '°F' : 'N/A'}
                </div>
                <div style="color: var(--formio-text);">
                  ${this.escapeHtml(weather.conditions)}
                </div>
              </div>
            ` : `
              <div style="color: var(--formio-text-muted); font-style: italic;">
                No weather data available
              </div>
            `}
          </div>
        `);
      }

      container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          ${cards.join('')}
        </div>
      `;
    }

    escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    updateValue() {
      this.triggerChange();
    }

    getValue() {
      // Return selected city IDs as JSON array
      // The edge function will use this to fetch fresh weather data
      const selectedIds = this.selectedLocations.filter((id: string) => id !== '');
      return JSON.stringify(selectedIds);
    }

    // Return additional data that should be saved alongside the main value
    getAdditionalFields(): Record<string, string> | null {
      const key = this.component.key || 'weatherCities';
      const selectedNames: string[] = [];

      // Get names for each selected location
      this.selectedLocations.forEach((locationId: string, index: number) => {
        if (locationId) {
          // First try to find in weatherLocations
          if (this.weatherLocations && this.weatherLocations.length > 0) {
            const location = this.weatherLocations.find((loc: any) => loc.id === locationId);
            if (location) {
              selectedNames.push(location.custom_name || location.name || '');
              return;
            }
          }

          // Fallback: get from select element text
          if (this.element) {
            const selectRefs = [this.select1Id, this.select2Id, this.select3Id];
            const select = this.element.querySelector(`[ref="${selectRefs[index]}"]`) as HTMLSelectElement;
            if (select && select.selectedIndex >= 0) {
              const selectedOption = select.options[select.selectedIndex];
              if (selectedOption && selectedOption.value === locationId) {
                selectedNames.push(selectedOption.text);
              }
            }
          }
        }
      });

      if (selectedNames.length === 0) return null;

      return {
        [`__${key}_locationNames`]: JSON.stringify(selectedNames)
      };
    }

    setValue(value: any, flags: any = {}) {
      // If locations haven't loaded yet, store the value for later
      if (!this.locationsLoaded) {
        this.pendingValue = value;
        return super.setValue(value, flags);
      }

      // Locations are loaded, apply the value immediately
      this.applyValue(value);

      if (!flags.noUpdateEvent) {
        this.triggerChange();
      }

      return super.setValue(value, flags);
    }
  }

  return WeatherCitiesComponent;
};

/**
 * Registers the weather cities component with Form.io
 */
export const registerWeatherCitiesComponent = () => {
  const Formio = (window as any).Formio;

  if (!Formio) {
    console.error('Formio not available for weather cities component registration');
    return false;
  }

  if (Formio.Components.components.weatherCities) {
    return true;
  }

  const WeatherCitiesComponent = createWeatherCitiesComponent(Formio);
  if (WeatherCitiesComponent) {
    Formio.Components.addComponent('weatherCities', WeatherCitiesComponent);
    return true;
  }

  return false;
};
