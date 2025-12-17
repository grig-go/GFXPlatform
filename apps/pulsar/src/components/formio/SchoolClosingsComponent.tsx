import { getSchoolClosings, SchoolClosing } from '../../services/supabase/schoolClosings';

export const createSchoolClosingsComponent = (Formio: any) => {
  if (!Formio || !Formio.Components) {
    console.error('Formio not available');
    return null;
  }

  const Component = Formio.Components.components.component;

  class SchoolClosingsComponent extends Component {
    constructor(component: any, options: any, data: any) {
      super(component, options, data);
      this.isLoading = false;
      this.schoolClosings = [];
      this.dataValue = null;
    }

    static schema(...extend: any[]) {
      return Component.schema({
        type: 'schoolClosings',
        label: 'School Closings',
        key: 'schoolClosings',
        input: true,
        persistent: true,
        passthrough: false,
        defaultRegionId: '',
        defaultZoneId: '',
        templateName: 'SCHOOL_CLOSING',
        field1: '01',
        field2: '02',
        format1: '{{organization}}',
        format2: '{{status}}'
      }, ...extend);
    }

    static get builderInfo() {
      return {
        title: 'School Closings',
        icon: 'building',
        group: 'custom',
        weight: 21,
        schema: SchoolClosingsComponent.schema()
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
                    key: 'defaultRegionId',
                    label: 'Default Region ID',
                    placeholder: 'Optional default region filter',
                    input: true,
                    weight: 5
                  },
                  {
                    type: 'textfield',
                    key: 'defaultZoneId',
                    label: 'Default Zone ID',
                    placeholder: 'Optional default zone filter',
                    input: true,
                    weight: 6
                  },
                  {
                    type: 'textfield',
                    key: 'templateName',
                    label: 'Template Name',
                    placeholder: 'e.g., school_closing',
                    input: true,
                    weight: 10
                  },
                  {
                    type: 'textfield',
                    key: 'field1',
                    label: 'Organization Field',
                    placeholder: '01',
                    defaultValue: '01',
                    input: true,
                    weight: 11
                  },
                  {
                    type: 'textfield',
                    key: 'field2',
                    label: 'Status Field',
                    placeholder: '02',
                    defaultValue: '02',
                    input: true,
                    weight: 12
                  },
                  {
                    type: 'textarea',
                    key: 'format1',
                    label: 'Organization Format',
                    placeholder: '{{organization}}',
                    description: 'Available variables: {{organization}}, {{status}}, {{region}}, {{zone}}, {{city}}, {{county}}, {{state}}, {{statusDay}}',
                    input: true,
                    rows: 2,
                    weight: 20
                  },
                  {
                    type: 'textarea',
                    key: 'format2',
                    label: 'Status Format',
                    placeholder: '{{status}}',
                    description: 'Available variables: {{organization}}, {{status}}, {{region}}, {{zone}}, {{city}}, {{county}}, {{state}}, {{statusDay}}',
                    input: true,
                    rows: 2,
                    weight: 21
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

      this.regionInputId = `region-${this.id}`;
      this.zoneInputId = `zone-${this.id}`;
      this.passthroughCheckboxId = `passthrough-${this.id}`;
      this.previewBtnId = `preview-${this.id}`;
      this.resultsId = `results-${this.id}`;

      return super.render(this.renderTemplate('schoolClosings', {
        component: this.component,
        isBuilderMode: isBuilderMode,
        regionInputId: this.regionInputId,
        zoneInputId: this.zoneInputId,
        passthroughCheckboxId: this.passthroughCheckboxId,
        previewBtnId: this.previewBtnId,
        resultsId: this.resultsId
      }));
    }

    renderTemplate(name: string, ctx: any) {
      if (name === 'schoolClosings') {
        const { component, isBuilderMode, regionInputId, zoneInputId, passthroughCheckboxId, previewBtnId, resultsId } = ctx;

        if (isBuilderMode) {
          return `
            <div class="formio-component formio-component-${component.type}">
              <label class="control-label">
                ${component.label || 'School Closings'}
              </label>
              <div style="
                padding: 20px;
                background: var(--formio-bg-lighter);
                border: 2px dashed var(--formio-border);
                border-radius: 4px;
                text-align: center;
                color: var(--formio-text-muted);
              ">
                <i class="fa fa-school" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                <div>School Closings Display</div>
                <small>Shows filterable school closings data</small>
              </div>
            </div>
          `;
        }

        return `
          <div class="formio-component formio-component-${component.type}">
            <label class="control-label">
              ${component.label || 'School Closings'}
            </label>

            <div style="padding: 1rem; background: var(--formio-bg-light); border-radius: 0.25rem;">
              <div style="margin-bottom: 1rem;">
                <label style="display: flex; align-items: center; cursor: pointer; font-weight: 500; color: var(--formio-text-dark);">
                  <input
                    ref="${passthroughCheckboxId}"
                    id="${passthroughCheckboxId}"
                    type="checkbox"
                    style="margin-right: 0.5rem; width: 16px; height: 16px;"
                  />
                  Passthrough Mode
                </label>
                <small style="color: var(--formio-text-muted); display: block; margin-top: 0.25rem;">
                  When enabled, region and zone IDs will be read from ticker request URL parameters instead.
                </small>
              </div>

              <div ref="filterInputs" id="filterInputs-${component.key}">
                <div style="margin-bottom: 0.5rem;">
                  <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">Region ID</label>
                  <input
                    ref="${regionInputId}"
                    id="${regionInputId}"
                    type="text"
                    class="form-control"
                    placeholder="Optional region filter"
                    value="${component.defaultRegionId || ''}"
                    style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                  />
                </div>

                <div style="margin-bottom: 0.5rem;">
                  <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">Zone ID</label>
                  <input
                    ref="${zoneInputId}"
                    id="${zoneInputId}"
                    type="text"
                    class="form-control"
                    placeholder="Optional zone filter"
                    value="${component.defaultZoneId || ''}"
                    style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                  />
                </div>
              </div>

              <button
                ref="${previewBtnId}"
                id="${previewBtnId}"
                type="button"
                class="btn btn-primary"
                style="padding: 0.375rem 0.75rem; background-color: var(--formio-btn-primary); color: white; border: none; border-radius: 0.25rem; cursor: pointer; margin-bottom: 1rem;"
              >
                <i class="fa fa-refresh"></i> Refresh
              </button>

              <div
                ref="${resultsId}"
                id="${resultsId}"
                class="school-closings-results"
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

      const previewBtn = element.querySelector(`[ref="${this.previewBtnId}"]`) as HTMLButtonElement;
      const regionInput = element.querySelector(`[ref="${this.regionInputId}"]`) as HTMLInputElement;
      const zoneInput = element.querySelector(`[ref="${this.zoneInputId}"]`) as HTMLInputElement;
      const passthroughCheckbox = element.querySelector(`[ref="${this.passthroughCheckboxId}"]`) as HTMLInputElement;
      const filterInputsContainer = element.querySelector(`[ref="filterInputs"]`) as HTMLElement;

      // Store element references for cleanup in detach()
      this._regionInput = regionInput;
      this._zoneInput = zoneInput;
      this._previewBtn = previewBtn;
      this._passthroughCheckbox = passthroughCheckbox;
      this._filterInputsContainer = filterInputsContainer;

      // Helper to update filter inputs visibility
      const updateFilterInputsVisibility = () => {
        if (filterInputsContainer) {
          const isPassthrough = passthroughCheckbox?.checked || false;
          filterInputsContainer.style.display = isPassthrough ? 'none' : 'block';
        }
      };

      // Restore saved values if they exist
      if (this.dataValue) {
        if (passthroughCheckbox && this.dataValue.passthrough) {
          passthroughCheckbox.checked = true;
        }
        if (regionInput && this.dataValue.regionId) {
          regionInput.value = this.dataValue.regionId;
        }
        if (zoneInput && this.dataValue.zoneId) {
          zoneInput.value = this.dataValue.zoneId;
        }
      }

      // Set initial visibility
      updateFilterInputsVisibility();

      // Create bound event handlers and store references for cleanup
      this._handleUpdateValue = () => {
        const isPassthrough = passthroughCheckbox?.checked || false;
        if (isPassthrough) {
          // In passthrough mode, store the passthrough flag but no region/zone
          this.dataValue = { passthrough: true };
        } else {
          this.dataValue = {
            regionId: regionInput?.value?.trim() || '',
            zoneId: zoneInput?.value?.trim() || ''
          };
        }
        this.updateValue();
      };

      this._handlePassthroughChange = () => {
        updateFilterInputsVisibility();
        this._handleUpdateValue();
      };

      this._handlePreviewClick = () => {
        this._handleUpdateValue();
        this.loadSchoolClosings(element);
      };

      this._handleMouseEnter = function(this: HTMLButtonElement) {
        this.style.backgroundColor = 'var(--formio-btn-primary-hover)';
      };

      this._handleMouseLeave = function(this: HTMLButtonElement) {
        this.style.backgroundColor = 'var(--formio-btn-primary)';
      };

      // Bind passthrough checkbox event
      if (passthroughCheckbox) {
        passthroughCheckbox.addEventListener('change', this._handlePassthroughChange);
      }

      // Bind input events
      if (regionInput) {
        regionInput.addEventListener('change', this._handleUpdateValue);
        regionInput.addEventListener('blur', this._handleUpdateValue);
      }

      if (zoneInput) {
        zoneInput.addEventListener('change', this._handleUpdateValue);
        zoneInput.addEventListener('blur', this._handleUpdateValue);
      }

      if (previewBtn) {
        previewBtn.addEventListener('click', this._handlePreviewClick);
        previewBtn.addEventListener('mouseenter', this._handleMouseEnter);
        previewBtn.addEventListener('mouseleave', this._handleMouseLeave);

        // Auto-load school closings on attach
        this.loadSchoolClosings(element);
      }

      // Initialize value from inputs
      this._handleUpdateValue();

      return attached;
    }

    detach() {
      // Remove event listeners to prevent memory leaks
      if (this._regionInput) {
        this._regionInput.removeEventListener('change', this._handleUpdateValue);
        this._regionInput.removeEventListener('blur', this._handleUpdateValue);
      }

      if (this._zoneInput) {
        this._zoneInput.removeEventListener('change', this._handleUpdateValue);
        this._zoneInput.removeEventListener('blur', this._handleUpdateValue);
      }

      if (this._passthroughCheckbox) {
        this._passthroughCheckbox.removeEventListener('change', this._handlePassthroughChange);
      }

      if (this._previewBtn) {
        this._previewBtn.removeEventListener('click', this._handlePreviewClick);
        this._previewBtn.removeEventListener('mouseenter', this._handleMouseEnter);
        this._previewBtn.removeEventListener('mouseleave', this._handleMouseLeave);
      }

      // Clear references
      this._regionInput = null;
      this._zoneInput = null;
      this._passthroughCheckbox = null;
      this._filterInputsContainer = null;
      this._previewBtn = null;
      this._handleUpdateValue = null;
      this._handlePassthroughChange = null;
      this._handlePreviewClick = null;
      this._handleMouseEnter = null;
      this._handleMouseLeave = null;

      return super.detach();
    }

    async loadSchoolClosings(element: HTMLElement) {
      if (this.isLoading) {
        return;
      }

      this.isLoading = true;
      const resultsContainer = element.querySelector(`[ref="${this.resultsId}"]`) as HTMLElement;
      const regionInput = element.querySelector(`[ref="${this.regionInputId}"]`) as HTMLInputElement;
      const zoneInput = element.querySelector(`[ref="${this.zoneInputId}"]`) as HTMLInputElement;

      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="text-center" style="padding: 2rem; color: var(--formio-text-muted);">
            <i class="fa fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 0.5rem;">Loading school closings...</p>
          </div>
        `;
      }

      try {
        // Build filters from input fields
        const filters: any = {};

        if (regionInput && regionInput.value.trim()) {
          filters.region_id = regionInput.value.trim();
        }

        if (zoneInput && zoneInput.value.trim()) {
          filters.zone_id = zoneInput.value.trim();
        }

        // Load school closings with filters
        const closings = await getSchoolClosings(Object.keys(filters).length > 0 ? filters : undefined);
        this.schoolClosings = closings;

        this.renderResults(resultsContainer, closings);
      } catch (error) {
        console.error('Error loading school closings:', error);
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div class="alert alert-danger" style="padding: 0.75rem 1.25rem; margin-bottom: 1rem; border: 1px solid transparent; border-radius: 0.25rem; background-color: #f8d7da; border-color: #f5c6cb; color: #721c24;">
              <strong>Error:</strong> ${error instanceof Error ? error.message : 'Failed to load school closings'}
            </div>
          `;
        }
      } finally {
        this.isLoading = false;
      }
    }

    renderResults(container: HTMLElement, closings: SchoolClosing[]) {
      if (!container) return;

      if (closings.length === 0) {
        container.innerHTML = `
          <div class="text-center" style="padding: 2rem; color: var(--formio-text-muted); background: var(--formio-bg-light); border-radius: 0.25rem;">
            <i class="fa fa-inbox fa-2x" style="margin-bottom: 0.5rem;"></i>
            <p>No school closings found for the specified criteria.</p>
          </div>
        `;
        return;
      }

      const countHeader = `
        <div style="margin-bottom: 1rem; font-weight: 500; color: var(--formio-text);">
          Found ${closings.length} school closing${closings.length !== 1 ? 's' : ''}
        </div>
      `;

      const table = `
        <div style="overflow-x: auto;">
          <table class="table table-striped table-bordered" style="width: 100%; margin-bottom: 1rem; border-collapse: collapse;">
            <thead style="background-color: var(--formio-bg-light);">
              <tr>
                <th style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">Organization</th>
                <th style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">Region</th>
                <th style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">Status Day</th>
                <th style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">Status</th>
                <th style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">Location</th>
              </tr>
            </thead>
            <tbody>
              ${closings.map((closing, index) => {
                const location = [closing.city, closing.county_name, closing.state]
                  .filter(Boolean)
                  .join(', ');

                return `
                  <tr style="background-color: ${index % 2 === 0 ? 'var(--formio-bg-card)' : 'var(--formio-bg-light)'};">
                    <td style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">${this.escapeHtml(closing.organization_name || 'N/A')}</td>
                    <td style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">${this.escapeHtml(closing.region_name || closing.region_id || 'N/A')}</td>
                    <td style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">${this.escapeHtml(closing.status_day || 'N/A')}</td>
                    <td style="padding: 0.75rem; border: 1px solid var(--formio-border);">
                      <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; background-color: #ffc107; color: #000; font-size: 0.875rem; font-weight: 500;">
                        ${this.escapeHtml(closing.status_description || 'Closed')}
                      </span>
                    </td>
                    <td style="padding: 0.75rem; border: 1px solid var(--formio-border); color: var(--formio-text-dark);">${this.escapeHtml(location || 'N/A')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      container.innerHTML = countHeader + table;
    }

    escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    getValue() {
      // Return the data value as a JSON string for storage
      // Supports both passthrough mode and region/zone filters
      if (this.dataValue && (this.dataValue.passthrough || this.dataValue.regionId || this.dataValue.zoneId)) {
        return JSON.stringify(this.dataValue);
      }
      return null;
    }

    setValue(value: any, flags: any = {}) {
      // Parse the stored value (JSON string with passthrough or regionId/zoneId)
      if (value) {
        try {
          if (typeof value === 'string') {
            this.dataValue = JSON.parse(value);
          } else if (typeof value === 'object') {
            this.dataValue = value;
          }
        } catch {
          // If parsing fails, treat as legacy value or ignore
          this.dataValue = null;
        }
      } else {
        this.dataValue = null;
      }

      // If the component is already attached, update the form fields
      if (this.element && this.dataValue) {
        const passthroughCheckbox = this.element.querySelector(`[ref="${this.passthroughCheckboxId}"]`) as HTMLInputElement;
        const regionInput = this.element.querySelector(`[ref="${this.regionInputId}"]`) as HTMLInputElement;
        const zoneInput = this.element.querySelector(`[ref="${this.zoneInputId}"]`) as HTMLInputElement;
        const filterInputsContainer = this.element.querySelector(`[ref="filterInputs"]`) as HTMLElement;

        if (passthroughCheckbox) {
          passthroughCheckbox.checked = this.dataValue.passthrough || false;
        }
        if (filterInputsContainer) {
          filterInputsContainer.style.display = this.dataValue.passthrough ? 'none' : 'block';
        }
        if (regionInput && this.dataValue.regionId) {
          regionInput.value = this.dataValue.regionId;
        }
        if (zoneInput && this.dataValue.zoneId) {
          zoneInput.value = this.dataValue.zoneId;
        }
      }

      return super.setValue(value, flags);
    }
  }

  return SchoolClosingsComponent;
};

/**
 * Registers the school closings component with Form.io
 */
export const registerSchoolClosingsComponent = () => {
  const Formio = (window as any).Formio;

  if (!Formio) {
    console.error('Formio not available for school closings component registration');
    return false;
  }

  if (Formio.Components.components.schoolClosings) {
    return true;
  }

  const SchoolClosingsComponent = createSchoolClosingsComponent(Formio);
  if (SchoolClosingsComponent) {
    Formio.Components.addComponent('schoolClosings', SchoolClosingsComponent);
    return true;
  }

  return false;
};
