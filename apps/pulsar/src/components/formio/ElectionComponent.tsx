// @ts-nocheck - fetchTemplates used in custom data source strings
import { fetchElectionData, fetchElections, fetchTemplates, transformRaceForDisplay, ElectionRace, ElectionCandidate, Election, ElectionDataResult, Template } from '../../services/electionData';

export const createElectionComponent = (Formio: any) => {
  if (!Formio || !Formio.Components) {
    console.error('Formio not available');
    return null;
  }

  const Component = Formio.Components.components.component;

  class ElectionComponent extends Component {
    constructor(component: any, options: any, data: any) {
      super(component, options, data);
      this.isLoading = false;
      this.races = [];
      this.regions = [];
      this.elections = [];
      this.dataValue = null;
      this.pendingValue = null; // Store value to apply after elections load
      this.electionsLoaded = false;
    }

    static schema(...extend: any[]) {
      return Component.schema({
        type: 'election',
        label: 'Election',
        key: 'election',
        input: true,
        persistent: true,
        electionId: null,
        regionId: '',
        showParty: false,
        showIncumbentStar: false,
        showZeroVotes: false,
        showEstimatedIn: true,
        headerItems: [],
        footerItems: [],
        presidentialTemplate: '',
        raceTemplate: 'VOTE_{numCandidates}HEADS',
        proposalTemplate: 'VOTE_PUBLIC_QUESTION',
        partyMaterialPrefix: 'MATERIAL*ONLINE_2019/N12/MASTER_CONTROL/ELECTIONS/'
      }, ...extend);
    }

    static get builderInfo() {
      return {
        title: 'Election',
        icon: 'check-square',
        group: 'custom',
        weight: 23,
        schema: ElectionComponent.schema()
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
                    type: 'select',
                    key: 'electionId',
                    label: 'Election',
                    placeholder: 'Select an election',
                    input: true,
                    dataSrc: 'custom',
                    data: {
                      custom: `
return (async () => {
  try {
    const module = await import('/src/services/electionData.ts');
    const { fetchElections } = module;
    const elections = await fetchElections();
    return elections.map(e => ({
      label: \`\${e.name} (\${e.year})\`,
      value: e.id
    }));
  } catch (error) {
    console.error('❌ Error loading elections:', error);
    return [];
  }
})();
`
                    },
                    weight: 0
                  },
                  {
                    type: 'textfield',
                    key: 'regionId',
                    label: 'State Code',
                    placeholder: 'e.g., PA, CA',
                    input: true,
                    weight: 1
                  },
                  {
                    type: 'editgrid',
                    key: 'headerItems',
                    label: 'Header Items',
                    tooltip: 'Templates to appear before the race elements',
                    input: true,
                    weight: 2,
                    addAnother: 'Add Template',
                    saveRow: 'Done',
                    removeRow: 'Remove',
                    openWhenEmpty: true,
                    modal: false,
                    customClass: 'election-template-grid',
                    components: [
                      {
                        type: 'select',
                        key: 'template',
                        label: '',
                        hideLabel: true,
                        placeholder: 'Select a template',
                        input: true,
                        dataSrc: 'custom',
                        data: {
                          custom: `
return (async () => {
  try {
    const module = await import('/src/lib/supabase.ts');
    const { supabase } = module;
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching templates:', error);
      return [];
    }
    return (data || []).map(t => ({ label: t.name, value: t.name }));
  } catch (error) {
    console.error('❌ Error loading templates:', error);
    return [];
  }
})();
`
                        },
                        searchEnabled: true
                      }
                    ]
                  },
                  {
                    type: 'editgrid',
                    key: 'footerItems',
                    label: 'Footer Items',
                    tooltip: 'Templates to appear after the race elements',
                    input: true,
                    weight: 3,
                    addAnother: 'Add Template',
                    saveRow: 'Done',
                    removeRow: 'Remove',
                    openWhenEmpty: true,
                    modal: false,
                    customClass: 'election-template-grid',
                    components: [
                      {
                        type: 'select',
                        key: 'template',
                        label: '',
                        hideLabel: true,
                        placeholder: 'Select a template',
                        input: true,
                        dataSrc: 'custom',
                        data: {
                          custom: `
return (async () => {
  try {
    const module = await import('/src/lib/supabase.ts');
    const { supabase } = module;
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching templates:', error);
      return [];
    }
    return (data || []).map(t => ({ label: t.name, value: t.name }));
  } catch (error) {
    console.error('❌ Error loading templates:', error);
    return [];
  }
})();
`
                        },
                        searchEnabled: true
                      }
                    ]
                  },
                  {
                    type: 'textfield',
                    key: 'presidentialTemplate',
                    label: 'Presidential National Template',
                    placeholder: 'e.g., VOTE_PRESIDENTIAL',
                    description: 'Template for presidential races (priority_level=10). Always shows exactly 2 candidates: Democrat first, Republican second.',
                    input: true,
                    defaultValue: '',
                    weight: 4
                  },
                  {
                    type: 'textfield',
                    key: 'raceTemplate',
                    label: 'Race Template',
                    placeholder: 'e.g., VOTE_{numCandidates}HEADS',
                    description: 'Template for race elements. Use {numCandidates} for candidate count. Example: VOTE_{numCandidates}HEADS produces VOTE_2HEADS, VOTE_3HEADS, etc.',
                    input: true,
                    defaultValue: 'VOTE_{numCandidates}HEADS',
                    weight: 5
                  },
                  {
                    type: 'textfield',
                    key: 'proposalTemplate',
                    label: 'Proposal Template',
                    placeholder: 'e.g., VOTE_PUBLIC_QUESTION',
                    description: 'Template for ballot proposals/questions. Use {numCandidates} if needed.',
                    input: true,
                    defaultValue: 'VOTE_PUBLIC_QUESTION',
                    weight: 6
                  },
                  {
                    type: 'textfield',
                    key: 'partyMaterialPrefix',
                    label: 'Party Material Prefix',
                    placeholder: 'MATERIAL*ONLINE_2019/N12/MASTER_CONTROL/ELECTIONS/',
                    description: 'Prefix for party color material paths',
                    input: true,
                    defaultValue: 'MATERIAL*ONLINE_2019/N12/MASTER_CONTROL/ELECTIONS/',
                    weight: 7
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

      this.electionSelectId = `election-${this.id}`;
      this.regionInputId = `region-${this.id}`;
      this.showPartyId = `showParty-${this.id}`;
      this.showIncumbentStarId = `showIncumbentStar-${this.id}`;
      this.showZeroVotesId = `showZeroVotes-${this.id}`;
      this.showEstimatedInId = `showEstimatedIn-${this.id}`;
      this.previewBtnId = `preview-${this.id}`;
      this.resultsId = `results-${this.id}`;

      return super.render(this.renderTemplate('election', {
        component: this.component,
        isBuilderMode: isBuilderMode,
        electionSelectId: this.electionSelectId,
        regionInputId: this.regionInputId,
        showPartyId: this.showPartyId,
        showIncumbentStarId: this.showIncumbentStarId,
        showZeroVotesId: this.showZeroVotesId,
        showEstimatedInId: this.showEstimatedInId,
        previewBtnId: this.previewBtnId,
        resultsId: this.resultsId
      }));
    }

    renderTemplate(name: string, ctx: any) {
      if (name === 'election') {
        const { component, isBuilderMode, electionSelectId, regionInputId, showPartyId, showIncumbentStarId, showZeroVotesId, showEstimatedInId, previewBtnId, resultsId } = ctx;

        if (isBuilderMode) {
          return `
            <div class="formio-component formio-component-${component.type}">
              <label class="control-label">
                ${component.label || 'Election'}
              </label>
              <div style="
                padding: 20px;
                background: var(--formio-bg-lighter);
                border: 2px dashed var(--formio-border);
                border-radius: 4px;
                text-align: center;
                color: var(--formio-text-muted);
              ">
                <i class="fa fa-check-square" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                <div>Election Display</div>
                <small>Shows election races and results data</small>
              </div>
            </div>
          `;
        }

        return `
          <div class="formio-component formio-component-${component.type}">
            <label class="control-label">
              ${component.label || 'Election'}
            </label>

            <div style="padding: 1rem; background: var(--formio-bg-light); border-radius: 0.25rem;">
              <div style="margin-bottom: 0.5rem;">
                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">Election</label>
                <select
                  ref="${electionSelectId}"
                  id="${electionSelectId}"
                  class="form-control"
                  style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                >
                  <option value="">Loading elections...</option>
                </select>
              </div>

              <div style="margin-bottom: 0.75rem;">
                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; color: var(--formio-text-dark);">State Code</label>
                <input
                  ref="${regionInputId}"
                  id="${regionInputId}"
                  type="text"
                  class="form-control"
                  placeholder="Optional state filter (e.g., PA, CA)"
                  value="${component.defaultRegionId || ''}"
                  style="width: 100%; padding: 0.375rem 0.75rem; border: 1px solid var(--formio-border-input); border-radius: 0.25rem; background: var(--formio-bg-card); color: var(--formio-text-dark);"
                />
              </div>

              <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: var(--formio-bg-card); border-radius: 0.25rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--formio-text-dark);">Display Options</label>
                <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
                  <label style="display: flex; align-items: center; cursor: pointer; color: var(--formio-text-dark);">
                    <input
                      ref="${showPartyId}"
                      id="${showPartyId}"
                      type="checkbox"
                      ${component.showParty ? 'checked' : ''}
                      style="margin-right: 0.5rem;"
                    />
                    Show Party
                  </label>
                  <label style="display: flex; align-items: center; cursor: pointer; color: var(--formio-text-dark);">
                    <input
                      ref="${showIncumbentStarId}"
                      id="${showIncumbentStarId}"
                      type="checkbox"
                      ${component.showIncumbentStar ? 'checked' : ''}
                      style="margin-right: 0.5rem;"
                    />
                    Show Incumbent Star
                  </label>
                  <label style="display: flex; align-items: center; cursor: pointer; color: var(--formio-text-dark);">
                    <input
                      ref="${showZeroVotesId}"
                      id="${showZeroVotesId}"
                      type="checkbox"
                      ${component.showZeroVotes ? 'checked' : ''}
                      style="margin-right: 0.5rem;"
                    />
                    Show Zero Votes
                  </label>
                  <label style="display: flex; align-items: center; cursor: pointer; color: var(--formio-text-dark);">
                    <input
                      ref="${showEstimatedInId}"
                      id="${showEstimatedInId}"
                      type="checkbox"
                      ${component.showEstimatedIn ? 'checked' : ''}
                      style="margin-right: 0.5rem;"
                    />
                    Show % Reporting
                  </label>
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
                class="election-results"
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

      const electionSelect = element.querySelector(`[ref="${this.electionSelectId}"]`) as HTMLSelectElement;
      const previewBtn = element.querySelector(`[ref="${this.previewBtnId}"]`) as HTMLButtonElement;
      const regionInput = element.querySelector(`[ref="${this.regionInputId}"]`) as HTMLInputElement;
      const showPartyCheckbox = element.querySelector(`[ref="${this.showPartyId}"]`) as HTMLInputElement;
      const showIncumbentStarCheckbox = element.querySelector(`[ref="${this.showIncumbentStarId}"]`) as HTMLInputElement;
      const showZeroVotesCheckbox = element.querySelector(`[ref="${this.showZeroVotesId}"]`) as HTMLInputElement;
      const showEstimatedInCheckbox = element.querySelector(`[ref="${this.showEstimatedInId}"]`) as HTMLInputElement;

      // Store element references for cleanup in detach()
      this._electionSelect = electionSelect;
      this._regionInput = regionInput;
      this._showPartyCheckbox = showPartyCheckbox;
      this._showIncumbentStarCheckbox = showIncumbentStarCheckbox;
      this._showZeroVotesCheckbox = showZeroVotesCheckbox;
      this._showEstimatedInCheckbox = showEstimatedInCheckbox;
      this._previewBtn = previewBtn;

      // Load elections first, then apply any pending values
      this.loadElections(electionSelect).then(() => {
        this.electionsLoaded = true;

        // Apply any pending value that was set before elections loaded
        if (this.pendingValue) {
          console.log('Applying pending value after elections loaded:', this.pendingValue);
          this.applyValue(this.pendingValue);
          this.pendingValue = null;
        }
      });

      // Create bound event handlers and store references for cleanup
      this._handleUpdateValue = () => {
        this.component.electionId = electionSelect?.value || null;
        this.component.regionId = regionInput?.value?.trim() || '';
        this.updateValue();
      };

      this._handlePreviewClick = () => {
        this._handleUpdateValue();
        this.loadElectionRaces(element);
      };

      this._handleMouseEnter = function(this: HTMLButtonElement) {
        this.style.backgroundColor = 'var(--formio-btn-primary-hover)';
      };

      this._handleMouseLeave = function(this: HTMLButtonElement) {
        this.style.backgroundColor = 'var(--formio-btn-primary)';
      };

      if (electionSelect) {
        // Create a handler that updates value and loads races
        this._handleElectionChange = () => {
          this._handleUpdateValue();
          this.loadElectionRaces(element);
        };
        electionSelect.addEventListener('change', this._handleElectionChange);
      }

      if (regionInput) {
        regionInput.addEventListener('change', this._handleUpdateValue);
        regionInput.addEventListener('blur', this._handleUpdateValue);
      }

      // Create handler for checkboxes that updates component settings
      this._handleCheckboxChange = () => {
        if (showPartyCheckbox) {
          this.component.showParty = showPartyCheckbox.checked;
        }
        if (showIncumbentStarCheckbox) {
          this.component.showIncumbentStar = showIncumbentStarCheckbox.checked;
        }
        if (showZeroVotesCheckbox) {
          this.component.showZeroVotes = showZeroVotesCheckbox.checked;
        }
        if (showEstimatedInCheckbox) {
          this.component.showEstimatedIn = showEstimatedInCheckbox.checked;
        }
        // Reload the display with new settings
        this.loadElectionRaces(element);
      };

      if (showPartyCheckbox) {
        showPartyCheckbox.addEventListener('change', this._handleCheckboxChange);
      }
      if (showIncumbentStarCheckbox) {
        showIncumbentStarCheckbox.addEventListener('change', this._handleCheckboxChange);
      }
      if (showZeroVotesCheckbox) {
        showZeroVotesCheckbox.addEventListener('change', this._handleCheckboxChange);
      }
      if (showEstimatedInCheckbox) {
        showEstimatedInCheckbox.addEventListener('change', this._handleCheckboxChange);
      }

      if (previewBtn) {
        previewBtn.addEventListener('click', this._handlePreviewClick);
        previewBtn.addEventListener('mouseenter', this._handleMouseEnter);
        previewBtn.addEventListener('mouseleave', this._handleMouseLeave);

        // Don't auto-load - wait for election selection
        // this.loadElectionRaces(element);
      }

      // Initialize value from inputs
      this._handleUpdateValue();

      return attached;
    }

    detach() {
      // Remove event listeners to prevent memory leaks
      if (this._electionSelect) {
        this._electionSelect.removeEventListener('change', this._handleElectionChange);
      }

      if (this._regionInput) {
        this._regionInput.removeEventListener('change', this._handleUpdateValue);
        this._regionInput.removeEventListener('blur', this._handleUpdateValue);
      }

      if (this._showPartyCheckbox) {
        this._showPartyCheckbox.removeEventListener('change', this._handleCheckboxChange);
      }

      if (this._showIncumbentStarCheckbox) {
        this._showIncumbentStarCheckbox.removeEventListener('change', this._handleCheckboxChange);
      }

      if (this._showZeroVotesCheckbox) {
        this._showZeroVotesCheckbox.removeEventListener('change', this._handleCheckboxChange);
      }

      if (this._showEstimatedInCheckbox) {
        this._showEstimatedInCheckbox.removeEventListener('change', this._handleCheckboxChange);
      }

      if (this._previewBtn) {
        this._previewBtn.removeEventListener('click', this._handlePreviewClick);
        this._previewBtn.removeEventListener('mouseenter', this._handleMouseEnter);
        this._previewBtn.removeEventListener('mouseleave', this._handleMouseLeave);
      }

      // Clear references
      this._electionSelect = null;
      this._regionInput = null;
      this._showPartyCheckbox = null;
      this._showIncumbentStarCheckbox = null;
      this._showZeroVotesCheckbox = null;
      this._showEstimatedInCheckbox = null;
      this._previewBtn = null;
      this._handleUpdateValue = null;
      this._handleElectionChange = null;
      this._handleCheckboxChange = null;
      this._handlePreviewClick = null;
      this._handleMouseEnter = null;
      this._handleMouseLeave = null;

      return super.detach();
    }

    async loadElections(selectElement: HTMLSelectElement) {
      if (!selectElement) return;

      try {
        const elections = await fetchElections();
        this.elections = elections;

        // Populate dropdown
        selectElement.innerHTML = '';

        if (elections.length === 0) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No elections available';
          selectElement.appendChild(option);
          return;
        }

        // Add elections to dropdown
        elections.forEach((election: Election) => {
          const option = document.createElement('option');
          option.value = election.id;  // Use election ID instead of year
          option.textContent = `${election.name} (${election.year})`;
          selectElement.appendChild(option);
        });

        // Restore saved election ID if it exists
        if (this.component?.electionId) {
          selectElement.value = this.component.electionId;
        } else if (elections.length > 0) {
          // Select the first (latest) election by default
          selectElement.value = elections[0].id;
          // Update component with the default selection
          this._handleUpdateValue?.();
        }
      } catch (error) {
        console.error('Error loading elections:', error);
        selectElement.innerHTML = '<option value="">Error loading elections</option>';
      }
    }

    // Helper method to apply a value to the component
    applyValue(value: any) {
      if (!value) return;

      try {
        let parsedValue = value;
        if (typeof value === 'string') {
          parsedValue = JSON.parse(value);
        }

        // Restore all values to component properties
        if (parsedValue.electionId !== undefined) this.component.electionId = parsedValue.electionId;
        if (parsedValue.regionId !== undefined) this.component.regionId = parsedValue.regionId;
        if (parsedValue.showParty !== undefined) this.component.showParty = parsedValue.showParty;
        if (parsedValue.showIncumbentStar !== undefined) this.component.showIncumbentStar = parsedValue.showIncumbentStar;
        if (parsedValue.showZeroVotes !== undefined) this.component.showZeroVotes = parsedValue.showZeroVotes;
        if (parsedValue.showEstimatedIn !== undefined) this.component.showEstimatedIn = parsedValue.showEstimatedIn;
        if (parsedValue.headerItems !== undefined) this.component.headerItems = parsedValue.headerItems;
        if (parsedValue.footerItems !== undefined) this.component.footerItems = parsedValue.footerItems;
        if (parsedValue.presidentialTemplate !== undefined) this.component.presidentialTemplate = parsedValue.presidentialTemplate;
        if (parsedValue.raceTemplate !== undefined) this.component.raceTemplate = parsedValue.raceTemplate;
        if (parsedValue.proposalTemplate !== undefined) this.component.proposalTemplate = parsedValue.proposalTemplate;
        if (parsedValue.partyMaterialPrefix !== undefined) this.component.partyMaterialPrefix = parsedValue.partyMaterialPrefix;
      } catch (error) {
        console.error('Error parsing election component value:', error);
        return;
      }

      // Update the input fields if the component is attached
      if (!this.element) return;

      const electionSelect = this.element.querySelector(`[ref="${this.electionSelectId}"]`) as HTMLSelectElement;
      const regionInput = this.element.querySelector(`[ref="${this.regionInputId}"]`) as HTMLInputElement;
      const showPartyCheckbox = this.element.querySelector(`[ref="${this.showPartyId}"]`) as HTMLInputElement;
      const showIncumbentStarCheckbox = this.element.querySelector(`[ref="${this.showIncumbentStarId}"]`) as HTMLInputElement;
      const showZeroVotesCheckbox = this.element.querySelector(`[ref="${this.showZeroVotesId}"]`) as HTMLInputElement;
      const showEstimatedInCheckbox = this.element.querySelector(`[ref="${this.showEstimatedInId}"]`) as HTMLInputElement;

      if (electionSelect && this.component.electionId) {
        electionSelect.value = this.component.electionId;
      }
      if (regionInput && this.component.regionId) {
        regionInput.value = this.component.regionId;
      }
      if (showPartyCheckbox) {
        showPartyCheckbox.checked = this.component.showParty || false;
      }
      if (showIncumbentStarCheckbox) {
        showIncumbentStarCheckbox.checked = this.component.showIncumbentStar || false;
      }
      if (showZeroVotesCheckbox) {
        showZeroVotesCheckbox.checked = this.component.showZeroVotes || false;
      }
      if (showEstimatedInCheckbox) {
        showEstimatedInCheckbox.checked = this.component.showEstimatedIn !== false;
      }
    }

    async loadElectionRaces(element: HTMLElement) {
      if (this.isLoading) {
        return;
      }

      this.isLoading = true;
      const resultsContainer = element.querySelector(`[ref="${this.resultsId}"]`) as HTMLElement;
      const electionSelect = element.querySelector(`[ref="${this.electionSelectId}"]`) as HTMLSelectElement;
      const regionInput = element.querySelector(`[ref="${this.regionInputId}"]`) as HTMLInputElement;

      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="text-center" style="padding: 2rem; color: var(--formio-text-muted);">
            <i class="fa fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top: 0.5rem;">Loading election data...</p>
          </div>
        `;
      }

      try {
        // Build filters from input fields
        const filters: any = {};

        // Get selected election ID
        if (electionSelect && electionSelect.value) {
          filters.electionId = electionSelect.value;
          console.log('🔍 Selected election ID:', filters.electionId);
        } else {
          console.log('⚠️ No election selected');
        }

        // Region input is now treated as "state"
        if (regionInput && regionInput.value.trim()) {
          filters.state = regionInput.value.trim();
          console.log('🔍 State filter:', filters.state);
        }

        console.log('📋 Calling fetchElectionData with filters:', filters);

        // Load election races
        const result = await fetchElectionData(Object.keys(filters).length > 0 ? filters : undefined);

        // Transform races to handle override fields and sort by priority then alphabetically
        const races = result.races
          .map(race => transformRaceForDisplay(race))
          .sort((a, b) => {
            const priorityA = a.priority_level || 0;
            const priorityB = b.priority_level || 0;

            // Sort by priority_level descending (higher priority first)
            if (priorityB !== priorityA) {
              return priorityB - priorityA;
            }

            // Then sort alphabetically by title
            return a.title.localeCompare(b.title);
          });
        this.races = races;

        this.renderResults(resultsContainer, races, result.totalCount);
      } catch (error) {
        console.error('Error loading election races:', error);
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div class="alert alert-danger" style="padding: 0.75rem 1.25rem; margin-bottom: 1rem; border: 1px solid transparent; border-radius: 0.25rem; background-color: #f8d7da; border-color: #f5c6cb; color: #721c24;">
              <strong>Error:</strong> ${error instanceof Error ? error.message : 'Failed to load election data'}
            </div>
          `;
        }
      } finally {
        this.isLoading = false;
      }
    }

    renderResults(container: HTMLElement, races: ElectionRace[], totalCount: number) {
      if (!container) return;

      if (races.length === 0) {
        container.innerHTML = `
          <div class="text-center" style="padding: 2rem; color: var(--formio-text-muted); background: var(--formio-bg-light); border-radius: 0.25rem;">
            <i class="fa fa-inbox fa-2x" style="margin-bottom: 0.5rem;"></i>
            <p>No election races found for the specified criteria.</p>
          </div>
        `;
        return;
      }

      const showingMessage = totalCount > races.length
        ? ` (showing first ${races.length} of ${totalCount})`
        : '';

      const countHeader = `
        <div style="margin-bottom: 1rem; font-weight: 500; color: var(--formio-text);">
          Found ${totalCount} race${totalCount !== 1 ? 's' : ''}${showingMessage}
        </div>
      `;

      const raceRows = races.map((race) => {
        const candidates = race.candidates || [];
        const showParty = this.component.showParty;
        const showIncumbentStar = this.component.showIncumbentStar;
        const showZeroVotes = this.component.showZeroVotes;
        const showEstimatedIn = this.component.showEstimatedIn;

        const filteredCandidates = showZeroVotes
          ? candidates
          : candidates.filter(c => c.votes > 0);

        // Sort candidates by votes (descending) and get top 2 for condensed view
        const sortedCandidates = [...filteredCandidates].sort((a, b) => b.votes - a.votes);
        const topCandidates = sortedCandidates.slice(0, 2);

        const candidatesSummary = topCandidates.map((candidate: ElectionCandidate) => {
          const winnerIcon = candidate.winner ? '✓' : '';
          const incumbentStar = showIncumbentStar && candidate.incumbent ? '★' : '';
          const party = showParty && candidate.party ? ` (${this.escapeHtml(candidate.party)})` : '';

          return `<span style="color: ${candidate.winner ? '#28a745' : 'var(--formio-text)'}; font-weight: ${candidate.winner ? '600' : '400'};">${winnerIcon} ${this.escapeHtml(candidate.name)}${incumbentStar}${party}: ${candidate.votes.toLocaleString()} (${candidate.percentage?.toFixed(1) || 0}%)</span>`;
        }).join(' <span style="color: var(--formio-border);">|</span> ');

        const moreCount = sortedCandidates.length - 2;
        const moreText = moreCount > 0 ? ` <span style="color: var(--formio-text-muted); font-size: 0.85rem;">+${moreCount} more</span>` : '';

        return `
          <div style="
            border: 1px solid var(--formio-border);
            border-radius: 0.25rem;
            padding: 0.5rem 0.75rem;
            background: var(--formio-bg-card);
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.9rem;
          ">
            <div style="flex: 0 0 auto; min-width: 200px; max-width: 300px;">
              <div style="font-weight: 600; color: var(--formio-text-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${this.escapeHtml(race.title || 'Unknown Race')}
              </div>
              ${showEstimatedIn && race.reportingPercentage !== null ? `
                <div style="font-size: 0.75rem; color: var(--formio-text-muted);">
                  ${race.reportingPercentage?.toFixed(0) || 0}% reporting
                </div>
              ` : ''}
            </div>
            <div style="flex: 1; overflow: hidden;">
              ${candidatesSummary}${moreText}
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = countHeader + raceRows;
    }

    escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    getValue() {
      // Return all component values as JSON string for proper serialization
      const value = {
        electionId: this.component.electionId || null,
        regionId: this.component.regionId || '',
        showParty: this.component.showParty || false,
        showIncumbentStar: this.component.showIncumbentStar || false,
        showZeroVotes: this.component.showZeroVotes || false,
        showEstimatedIn: this.component.showEstimatedIn !== false,
        headerItems: this.component.headerItems || [],
        footerItems: this.component.footerItems || [],
        presidentialTemplate: this.component.presidentialTemplate || '',
        raceTemplate: this.component.raceTemplate || 'VOTE_{numCandidates}HEADS',
        proposalTemplate: this.component.proposalTemplate || 'VOTE_PUBLIC_QUESTION',
        partyMaterialPrefix: this.component.partyMaterialPrefix || 'MATERIAL*ONLINE_2019/N12/MASTER_CONTROL/ELECTIONS/'
      };
      return JSON.stringify(value);
    }

    // Return additional data that should be saved alongside the main value
    getAdditionalFields(): Record<string, string> | null {
      const key = this.component.key || 'election';

      // Get the election name from the stored electionId
      if (this.component.electionId && this.elections.length > 0) {
        const selectedElection = this.elections.find((e: Election) => e.id === this.component.electionId);
        if (selectedElection) {
          return {
            [`__${key}_electionName`]: selectedElection.name
          };
        }
      }

      return null;
    }

    setValue(value: any, flags: any = {}) {
      console.log('Election setValue called with:', value, 'electionsLoaded:', this.electionsLoaded);

      // If elections haven't loaded yet, store the value for later
      if (!this.electionsLoaded) {
        console.log('Elections not loaded yet, storing pending value');
        this.pendingValue = value;
        return super.setValue(value, flags);
      }

      // Elections are loaded, apply the value immediately
      this.applyValue(value);

      return super.setValue(value, flags);
    }
  }

  return ElectionComponent;
};

/**
 * Registers the election component with Form.io
 */
export const registerElectionComponent = () => {
  const Formio = (window as any).Formio;

  if (!Formio) {
    console.error('Formio not available for election component registration');
    return false;
  }

  if (Formio.Components.components.election) {
    return true;
  }

  const ElectionComponent = createElectionComponent(Formio);
  if (ElectionComponent) {
    Formio.Components.addComponent('election', ElectionComponent);
    return true;
  }

  return false;
};
