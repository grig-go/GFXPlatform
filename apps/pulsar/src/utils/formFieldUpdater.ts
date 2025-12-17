// utils/formFieldUpdater.ts

interface FormComponent {
  current: {
    formio?: any;
    getComponents?: () => Array<{ key: string; setValue: (value: any) => boolean }>;
    formId?: string;
  } | null;
}

/**
 * Updates form fields with AI-generated content - specifically tailored for Form.io
 * @param {RefObject<any>} formComponentRef - Reference to the form component
 * @param {Record<string, any>} formData - Generated content from AI
 * @returns {boolean} - Success status
 */
export const updateFormFields = (
  formComponentRef: FormComponent, 
  formData: Record<string, any>
): boolean => {
  if (!formComponentRef || !formComponentRef.current) {
    console.error('Missing form component reference or form data');
    return false;
  }

  try {
    console.log('Original form data from AI:', formData);
    
    // Access the Form.io instance directly - the most reliable way
    const formio = formComponentRef.current.formio;
    if (!formio) {
      console.error('No Form.io instance found on form reference');
      return false;
    }
    
    console.log('Found Form.io instance:', formio);
    
    // First, create a mapping of different key formats to the incoming values
    const valueMap = new Map();
    
    // Process incoming data to handle all possible formats
    Object.entries(formData).forEach(([key, value]) => {
      // Store the original key-value pair
      valueMap.set(key, value);
      
      // For data[XX] format, also store the extracted key
      if (key.startsWith('data[') && key.endsWith(']')) {
        const extractedKey = key.substring(5, key.length - 1);
        valueMap.set(extractedKey, value);
        console.log(`Mapped data[XX] format: "${key}" → "${extractedKey}"`);
      }
      
      // For data.XX format, also store the extracted key
      if (key.startsWith('data.')) {
        const extractedKey = key.substring(5);
        valueMap.set(extractedKey, value);
        console.log(`Mapped data.XX format: "${key}" → "${extractedKey}"`);
      }
    });
    
    // Log all available components for debugging
    if (formio.components) {
      console.log('Available components:');
      formio.components.forEach((comp: any) => {
        if (comp && comp.key) {
          console.log(`- Component: ${comp.key}, Type: ${comp.type || 'unknown'}`);
        }
      });
    }
    
    // APPROACH 1: Use form setValue method if available
    if (typeof formio.setValue === 'function') {
      console.log('Using form setValue method');
      
      // Create a data object with the values
      const formValues: Record<string, any> = {};
      
      // Try different formats for field keys
      valueMap.forEach((value, key) => {
        formValues[key] = value;
      });
      
      try {
        // Set all values at once with form's setValue
        formio.setValue(formValues);
        console.log('Applied values using form setValue:', formValues);
        
        // Trigger form change
        if (typeof formio.triggerChange === 'function') {
          formio.triggerChange();
          console.log('Triggered form change');
        }
        
        return true;
      } catch (setValueError) {
        console.warn('Error using form setValue:', setValueError);
        // Fallback to other approaches
      }
    }
    
    // APPROACH 2: Update each component individually
    let componentsUpdated = 0;
    const componentPromises: Promise<any>[] = [];
    
    // Function to recursively find components
    const findAndUpdateComponents = (components: any[]) => {
      if (!components || !Array.isArray(components)) return;
      
      components.forEach((component) => {
        if (!component || !component.key) return;
        
        // Check if this component's key exists in our value map
        if (valueMap.has(component.key)) {
          const value = valueMap.get(component.key);
          console.log(`Setting value for component "${component.key}":`, value);
          
          // Use Promise to catch any async setValue operations
          const updatePromise = Promise.resolve().then(() => {
            try {
              if (typeof component.setValue === 'function') {
                component.setValue(value);
                componentsUpdated++;
                return true;
              }
            } catch (err) {
              console.warn(`Error setting value for "${component.key}":`, err);
            }
            return false;
          });
          
          componentPromises.push(updatePromise);
        }
        
        // Process child components recursively
        if (component.components && Array.isArray(component.components)) {
          findAndUpdateComponents(component.components);
        }
      });
    };
    
    // Start the recursive component update
    if (formio.components) {
      findAndUpdateComponents(formio.components);
    }
    
    // Wait for all component updates to complete
    Promise.all(componentPromises)
      .then(() => {
        console.log(`${componentsUpdated} components updated individually`);
        
        // Trigger form refresh
        if (typeof formio.triggerChange === 'function') {
          formio.triggerChange();
        }
        if (typeof formio.redraw === 'function') {
          formio.redraw();
        }
      })
      .catch(err => {
        console.error('Error updating components:', err);
      });
    
    // APPROACH 3: Direct data assignment - this works in many Form.io instances
    if (!formio.data) {
      formio.data = {};
    }
    
    let dataUpdated = false;
    valueMap.forEach((value, key) => {
      // Set on both the root level and data subobject if it exists
      formio.data[key] = value;
      
      // Also set in the data sub-object that Form.io sometimes uses
      if (!formio.data.data) {
        formio.data.data = {};
      }
      formio.data.data[key] = value;
      
      dataUpdated = true;
    });
    
    if (dataUpdated) {
      console.log('Updated form data directly:', formio.data);
      
      // Force a redraw after direct data assignment
      setTimeout(() => {
        if (typeof formio.triggerChange === 'function') {
          formio.triggerChange();
          console.log('Triggered change after direct data update');
        }
        if (typeof formio.redraw === 'function') {
          formio.redraw();
          console.log('Triggered redraw after direct data update');
        }
      }, 100);
      
      return true;
    }
    
    // If we've reached here, no methods worked
    console.error('Failed to update form fields using any method');
    return false;
  } catch (error) {
    console.error('Error updating form fields:', error);
    return false;
  }
};

/**
 * Extract form schema from FormIO component
 * @param {RefObject<any>} formComponentRef - Reference to the form component
 * @returns {any} - Form schema
 */
export const getFormSchema = (formComponentRef: FormComponent): any => {
  if (!formComponentRef || !formComponentRef.current) {
    console.error('Form reference not available for schema extraction');
    return null;
  }
  
  try {
    console.log('Getting form schema via ref');
    
    // Try to get schema from formio instance first
    if (formComponentRef.current.formio) {
      const formio = formComponentRef.current.formio;
      
      // Log the formio object structure to see what's available
      console.log('Form.io instance properties:', Object.keys(formio));
      
      // Try various properties where schema might be stored
      const schema = formio.form || formio.component || formio.schema;
      
      if (schema) {
        console.log('Schema extracted from formio instance');
        return schema;
      }
      
      // Extract component information directly from the components array
      if (formio.components && Array.isArray(formio.components)) {
        const components = formio.components.map((component: any) => {
          if (!component) return null;
          
          // Extract essential component properties
          return {
            key: component.key,
            label: component.label || component.key,
            type: component.type || 'unknown',
            input: !!component.input,
            validate: component.validate
          };
        }).filter(Boolean);
        
        if (components.length > 0) {
          console.log('Components extracted directly:', components.length);
          return { components };
        }
      }
    }
    
    // Fallback to DOM extraction as before
    const formId = formComponentRef.current.formId;
    if (!formId) {
      console.error('Form ID not available');
      return {};
    }
    
    console.log('Attempting to extract schema from DOM with formId:', formId);
    const formElement = document.getElementById(formId);
    if (!formElement) {
      console.error('Form element not found in DOM with ID:', formId);
      return {};
    }
    
    // Extract components from DOM
    const components: any[] = [];
    
    // Try data-component first (FormIO approach)
    const componentElements = formElement.querySelectorAll('[data-component]');
    if (componentElements.length > 0) {
      componentElements.forEach(element => {
        const key = element.getAttribute('data-key');
        const type = element.getAttribute('data-component');
        const label = element.querySelector('label')?.textContent;
        
        if (key) {
          components.push({
            key,
            label: label || key,
            type: type || 'textfield',
            input: true
          });
        }
      });
    } else {
      // Fallback to input elements
      const inputElements = formElement.querySelectorAll('input, textarea, select');
      inputElements.forEach(input => {
        const name = input.getAttribute('name');
        if (name) {
          let type = 'textfield';
          if (input.tagName.toLowerCase() === 'textarea') {
            type = 'textarea';
          } else if (input.tagName.toLowerCase() === 'select') {
            type = 'select';
          }
          
          components.push({
            key: name,
            label: input.getAttribute('placeholder') || name,
            type,
            input: true
          });
        }
      });
    }
    
    console.log('Extracted schema from DOM with', components.length, 'components');
    return { components };
  } catch (error) {
    console.error('Error extracting form schema:', error);
    return {};
  }
};

/**
 * Extract fields from form schema
 * @param {any} schema - Form schema object 
 * @returns {Array<{key: string, label: string, type: string, required: boolean}>} - Array of field information
 */
export const extractFormFields = (schema: any): Array<{
  key: string;
  label: string;
  type: string;
  required: boolean;
}> => {
  if (!schema) {
    console.warn('No schema provided for field extraction');
    return [];
  }
  
  const components = schema.components || [];
  if (components.length === 0) {
    console.warn('No components found in schema');
    return [];
  }
  
  const extractFields = (
    components: any[], 
    fields: Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
    }> = []
  ) => {
    components.forEach(component => {
      if (component.key && (component.input || component.type === 'textfield' || component.type === 'textarea')) {
        fields.push({
          key: component.key,
          label: component.label || component.key,
          type: component.type,
          required: component.validate?.required || false
        });
      }
      
      if (component.components) {
        extractFields(component.components, fields);
      }
    });
    return fields;
  };
  
  const fields = extractFields(components);
  console.log('Extracted', fields.length, 'fields from schema');
  return fields;
};