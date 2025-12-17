/**
 * Constants for Form.io components
 */

// Form.io component types organized by category
export const FORM_COMPONENT_TYPES = {
  // Basic components
  BASIC: {
    TEXTFIELD: 'textfield',
    TEXTAREA: 'textarea',
    NUMBER: 'number',
    PASSWORD: 'password',
    CHECKBOX: 'checkbox',
    SELECT: 'select',
    RADIO: 'radio',
    BUTTON: 'button',
    EMAIL: 'email',
    URL: 'url',
    PHONE_NUMBER: 'phoneNumber',
    TAGS: 'tags',
    ADDRESS: 'address'
  },
  
  // Advanced components
  ADVANCED: {
    DATETIME: 'datetime',
    DAY: 'day',
    TIME: 'time',
    CURRENCY: 'currency',
    SIGNATURE: 'signature',
    SURVEY: 'survey',
    FILE: 'file',
    CONTENT: 'content',
    HTML: 'htmlelement',
    HIDDEN: 'hidden'
  },
  
  // Layout components
  LAYOUT: {
    CONTAINER: 'container',
    COLUMNS: 'columns',
    FIELDSET: 'fieldset',
    PANEL: 'panel',
    TABLE: 'table',
    TABS: 'tabs',
    WELL: 'well'
  },
  
  // Data components
  DATA: {
    DATAGRID: 'datagrid',
    EDITGRID: 'editgrid',
    DATEMAP: 'datemap',
    TREE: 'tree'
  },
  
  // Premium components
  PREMIUM: {
    RECAPTCHA: 'recaptcha',
    RESOURCE: 'resource',
    FORM: 'form',
    WIZARD: 'wizard'
  },
  
  // Custom components
  CUSTOM: {
    SCRIPT_BUTTON: 'scriptButton',
    SCHOOL_CLOSINGS: 'schoolClosings',
    WEATHER_LOCATIONS: 'weatherLocations'
  }
};

// Validation types for Form.io components
export const VALIDATION_TYPES = {
  REQUIRED: 'required',
  PATTERN: 'pattern',
  MINLENGTH: 'minLength',
  MAXLENGTH: 'maxLength',
  MIN: 'min',
  MAX: 'max',
  CUSTOM: 'custom',
  JSON: 'json',
  MULTIPLE: 'multiple',
  UNIQUE: 'unique',
  MINWORDS: 'minWords',
  MAXWORDS: 'maxWords'
};

// Script types for Form.io components
export const SCRIPT_TYPES = {
  VALIDATION: 'validation',
  CALCULATION: 'calculation',
  CONDITIONAL: 'conditional',
  LOGIC: 'logic',
  CUSTOM: 'custom'
};

// Data source types for Form.io components
export const DATA_SOURCE_TYPES = {
  VALUES: 'values',
  JSON: 'json',
  URL: 'url',
  RESOURCE: 'resource',
  CUSTOM: 'custom'
};

// Form.io API endpoints
export const FORMIO_API = {
  SUBMIT: '/submit',
  FORM: '/form',
  DATA: '/data',
  DATASOURCE: '/datasource'
};

// Default Form.io form display types
export const FORM_DISPLAY_TYPES = {
  FORM: 'form',
  WIZARD: 'wizard',
  PDF: 'pdf'
};

// Default Form.io submission states
export const SUBMISSION_STATES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Authentication types for data sources
export const AUTH_TYPES = {
  NONE: 'none',
  BASIC: 'basic',
  BEARER: 'bearer',
  OAUTH: 'oauth',
  CUSTOM: 'custom'
};

// HTTP methods for data sources
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
};