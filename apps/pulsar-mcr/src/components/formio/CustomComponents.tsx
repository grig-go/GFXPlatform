import React from 'react';
import { FORM_COMPONENT_TYPES } from './constants';
import { createSchoolClosingsComponent } from './SchoolClosingsComponent';
import { createWeatherCitiesComponent } from './WeatherCitiesComponent';
import { createWeatherForecastComponent } from './WeatherForecastComponent';
import { createElectionComponent } from './ElectionComponent';
import { createImageComponent } from './ImageComponent';

/**
 * Register custom Form.io components
 * This function registers our custom components with the Form.io system
 *
 * HMR Support: During development, components are forcefully re-registered to ensure
 * the latest component definitions are used. This prevents "unknown component" errors
 * when component code changes trigger HMR.
 */
export const registerCustomFormComponents = () => {
  if (!window.Formio) {
    console.warn('Form.io not available. Custom components not registered.');
    return;
  }

  // In development mode, force re-registration to support HMR
  const isDev = import.meta.env.DEV;

  // Register the script button component
  registerScriptButtonComponent();

  // Register other custom components as needed
  registerDataSourceComponent();
  registerRichTextComponent();
  registerSignaturePadComponent();

  // Register class-based components
  // Force re-registration in dev mode to prevent HMR issues
  if (isDev || !window.Formio.Components.components.schoolClosings) {
    const SchoolClosingsComponent = createSchoolClosingsComponent(window.Formio);
    if (SchoolClosingsComponent) {
      window.Formio.Components.addComponent('schoolClosings', SchoolClosingsComponent);
      console.log('✅ School Closings component registered');
    }
  }

  if (isDev || !window.Formio.Components.components.weatherCities) {
    const WeatherCitiesComponent = createWeatherCitiesComponent(window.Formio);
    if (WeatherCitiesComponent) {
      window.Formio.Components.addComponent('weatherCities', WeatherCitiesComponent);
      console.log('✅ Weather Cities component registered');
    }
  }

  if (isDev || !window.Formio.Components.components.weatherForecast) {
    const WeatherForecastComponent = createWeatherForecastComponent(window.Formio);
    if (WeatherForecastComponent) {
      window.Formio.Components.addComponent('weatherForecast', WeatherForecastComponent);
      console.log('✅ Weather Forecast component registered');
    }
  }

  if (isDev || !window.Formio.Components.components.election) {
    const ElectionComponent = createElectionComponent(window.Formio);
    if (ElectionComponent) {
      window.Formio.Components.addComponent('election', ElectionComponent);
      console.log('✅ Election component registered');
    }
  }

  // Register the image upload component with media library support
  if (isDev || !window.Formio.Components.components.image) {
    const ImageComponent = createImageComponent(window.Formio);
    if (ImageComponent) {
      window.Formio.Components.addComponent('image', ImageComponent);
      console.log('✅ Image Upload component registered');
    }
  }
};

/**
 * Registers the script button component with Form.io
 */
const registerScriptButtonComponent = () => {
  if (!window.Formio.Components.components.scriptButton) {
    window.Formio.Components.addComponent('scriptButton', {
      schema: {
        label: 'Script Editor',
        key: 'scriptEditor',
        type: FORM_COMPONENT_TYPES.CUSTOM.SCRIPT_BUTTON,
        input: false
      },
      build: function(element: any) {
        this.element = element;
        element.className = 'form-group';
        
        const button = document.createElement('button');
        button.className = `btn btn-${this.component.theme || 'primary'}`;
        button.innerHTML = `<i class="fa fa-code"></i> ${this.component.label || 'Edit Script'}`;
        button.addEventListener('click', this.openScriptEditor.bind(this));
        
        element.appendChild(button);
      },
      openScriptEditor: function() {
        if (window.scriptEditorCallback) {
          window.scriptEditorCallback({
            component: this.component,
            script: this.component.script || '',
            scriptType: this.component.scriptType || 'custom',
            targetField: this.component.targetField || '',
            title: this.component.label || 'Edit Script'
          });
        } else {
          console.warn(
            'Script editor callback not found. Make sure the ScriptingIntegration ' +
            'component is mounted before using script components.'
          );
        }
      },
      setValue: function() {
        // No value to set for this component
      }
    });
  }
};

/**
 * Registers a custom data source component with Form.io
 */
const registerDataSourceComponent = () => {
  window.Formio.Components.addComponent('dataSource', {
    schema: {
      label: 'Data Source',
      key: 'dataSource',
      type: 'dataSource',
      input: false,
      dataSourceId: '',
      refreshable: true
    },
    build: function(element: any) {
      this.element = element;
      element.className = 'form-group';
      
      const container = document.createElement('div');
      container.className = 'data-source-container';
      
      const header = document.createElement('div');
      header.className = 'data-source-header';
      
      const label = document.createElement('span');
      label.className = 'data-source-label';
      label.innerText = this.component.label || 'Data Source';
      
      const refreshButton = document.createElement('button');
      refreshButton.className = 'btn btn-sm btn-outline-secondary';
      refreshButton.innerHTML = '<i class="fa fa-refresh"></i>';
      refreshButton.title = 'Refresh Data';
      refreshButton.style.display = this.component.refreshable ? 'inline-block' : 'none';
      refreshButton.addEventListener('click', this.refreshData.bind(this));
      
      header.appendChild(label);
      header.appendChild(refreshButton);
      
      const content = document.createElement('div');
      content.className = 'data-source-content';
      content.innerHTML = '<div class="text-muted">Data source content will appear here</div>';
      
      container.appendChild(header);
      container.appendChild(content);
      element.appendChild(container);
      
      // Load initial data
      if (this.component.dataSourceId) {
        this.loadData();
      }
    },
    refreshData: function() {
      this.loadData(true);
    },
    loadData: function(refresh = false) {
      // This will be implemented by the React app
      console.log('Loading data for source ID:', this.component.dataSourceId, 'Refresh:', refresh);
    }
  });
};

/**
 * Registers a custom rich text editor component with Form.io
 */
const registerRichTextComponent = () => {
  window.Formio.Components.addComponent('richText', {
    schema: {
      label: 'Rich Text',
      key: 'richText',
      type: 'richText',
      input: true,
      defaultValue: '',
      wysiwyg: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{'list': 'ordered'}, {'list': 'bullet'}],
          [{'script': 'sub'}, {'script': 'super'}],
          [{'indent': '-1'}, {'indent': '+1'}],
          [{'size': ['small', false, 'large', 'huge']}],
          [{'header': [1, 2, 3, 4, 5, 6, false]}],
          [{'color': []}, {'background': []}],
          [{'font': []}],
          [{'align': []}],
          ['clean'],
          ['link', 'image']
        ]
      }
    },
    build: function(element: any) {
      this.element = element;
      element.className = 'form-group';
      
      // Create the label
      if (this.component.label) {
        const label = document.createElement('label');
        label.className = 'control-label';
        label.innerHTML = this.component.label;
        element.appendChild(label);
      }
      
      // Create the rich text container
      const inputContainer = document.createElement('div');
      inputContainer.className = 'rich-text-container';
      
      // Create the input element (textarea that will be replaced by the rich text editor)
      this.input = document.createElement('textarea');
      this.input.className = 'form-control';
      this.input.id = `${this.id}-richtext`;
      this.input.setAttribute('ref', 'input');
      
      // Set the initial value
      this.input.value = this.component.defaultValue || '';
      
      inputContainer.appendChild(this.input);
      element.appendChild(inputContainer);
      
      // Initialize the rich text editor after the element is in the DOM
      setTimeout(() => {
        this.initRichTextEditor();
      }, 0);
    },
    initRichTextEditor: function() {
      // This will be implemented by the React app when using a specific editor library
      console.log('Rich text editor should be initialized here');
    },
    setValue: function(value: any) {
      if (this.input) {
        this.input.value = value || '';
        
        // If the rich text editor is initialized, update its content
        if (this.editor) {
          this.editor.setContent(value || '');
        }
      }
    },
    getValue: function() {
      // If the rich text editor is initialized, get content from it
      if (this.editor) {
        return this.editor.getContent();
      }
      
      // Otherwise get value from the input element
      return this.input ? this.input.value : '';
    }
  });
};

/**
 * Registers a custom signature pad component with Form.io
 */
const registerSignaturePadComponent = () => {
  window.Formio.Components.addComponent('signaturePad', {
    schema: {
      label: 'Signature',
      key: 'signature',
      type: 'signaturePad',
      input: true,
      width: 400,
      height: 200,
      penColor: '#000000',
      backgroundColor: '#ffffff',
      minWidth: 0.5,
      maxWidth: 2.5
    },
    build: function(element: any) {
      this.element = element;
      element.className = 'form-group';
      
      // Create the label
      if (this.component.label) {
        const label = document.createElement('label');
        label.className = 'control-label';
        label.innerHTML = this.component.label;
        element.appendChild(label);
      }
      
      // Create the signature container
      const container = document.createElement('div');
      container.className = 'signature-pad-container';
      
      // Create the canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.component.width || 400;
      this.canvas.height = this.component.height || 200;
      this.canvas.className = 'signature-pad-canvas';
      
      // Create a hidden input to store the signature data
      this.input = document.createElement('input');
      this.input.type = 'hidden';
      this.input.setAttribute('ref', 'input');
      
      // Create clear button
      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className = 'btn btn-sm btn-secondary signature-pad-clear';
      clearButton.innerHTML = 'Clear';
      clearButton.addEventListener('click', this.clearSignature.bind(this));
      
      container.appendChild(this.canvas);
      container.appendChild(this.input);
      container.appendChild(clearButton);
      element.appendChild(container);
      
      // Initialize the signature pad after the element is in the DOM
      setTimeout(() => {
        this.initSignaturePad();
      }, 0);
    },
    initSignaturePad: function() {
      // This will be implemented by the React app
      console.log('Signature pad should be initialized here');
    },
    clearSignature: function() {
      // This will be implemented by the React app
      console.log('Signature pad should be cleared here');
      
      if (this.input) {
        this.input.value = '';
      }
    },
    setValue: function(value: any) {
      if (this.input) {
        this.input.value = value || '';
      }
      
      // If the signature pad is initialized, update it
      if (this.signaturePad && value) {
        // This will be implemented by the React app
        console.log('Signature pad should be updated with value:', value);
      }
    },
    getValue: function() {
      return this.input ? this.input.value : '';
    }
  });
};

/**
 * Custom Form.io component for displaying a React component within Form.io
 * This is a helper component to render React components in Form.io
 */
export const FormioReactWrapper: React.FC<{
  component: any;
  children: React.ReactNode;
}> = ({ component, children }) => {
  return (
    <div className="formio-react-component">
      {component.label && (
        <label className="control-label">
          {component.label}
          {component.validate?.required && <span className="field-required">*</span>}
        </label>
      )}
      <div className="formio-react-component-content">
        {children}
      </div>
    </div>
  );
};