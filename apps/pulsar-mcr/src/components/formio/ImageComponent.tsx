import { supabase } from '../../lib/supabase';
import type { MediaAsset } from '../../types/sponsor';

const uploadingComponents = new Set<string>();

// Global callback for opening the media selector from FormIO components
// This will be set by the MediaSelectorBridge React component
let openMediaSelectorCallback: ((componentId: string, allowedTypes: string[], onSelect: (media: MediaAsset) => void) => void) | null = null;

export const setMediaSelectorCallback = (callback: typeof openMediaSelectorCallback) => {
  openMediaSelectorCallback = callback;
};

export const getMediaSelectorCallback = () => openMediaSelectorCallback;

export const createImageComponent = (Formio: any) => {
  if (!Formio || !Formio.Components) {
    console.error('Formio not available');
    return null;
  }

  const Component = Formio.Components.components.component;
  
  class ImageUploadComponent extends Component {
    constructor(component: any, options: any, data: any) {
      super(component, options, data);
      
      // Initialize state
      this.uploadedFiles = [];
      this._dataValue = null;
      this._isUpdating = false; // Add flag to prevent circular updates
      this.isUploading = false; 
      this._cachedFilename = null;
    }

    init() {
      super.init();


      // Check ALL keys in data, including _filename
      if (this.data) {
              for (const _key in this.data) {
        }
      }

      // Try direct bracket notation
      let existingValue = null;
      let existingFilename = null;
      
      if (this.data && this.data[this.key] !== undefined) {
        existingValue = this.data[this.key];
        
        // Check for corresponding _filename field
        const filenameKey = `__${this.key}_filename`;
        if (this.data[filenameKey] !== undefined) {
          existingFilename = this.data[filenameKey];
        }
      }
      
      // Try with lowercase key
      if (!existingValue && this.data && this.data[this.key.toLowerCase()] !== undefined) {
        existingValue = this.data[this.key.toLowerCase()];
        
        const filenameKey = `__${this.key.toLowerCase()}_filename`;
        if (this.data[filenameKey] !== undefined) {
          existingFilename = this.data[filenameKey];
        }
      }
      
      // Try iterating with for...in
      if (!existingValue && this.data) {
        for (const key in this.data) {
          if (key.toLowerCase() === this.key.toLowerCase()) {
            existingValue = this.data[key];
            const filenameKey = `__${key}_filename`;
            if (this.data[filenameKey] !== undefined) {
              existingFilename = this.data[filenameKey];
              this._cachedFilename = existingFilename; // CACHE IT
            }
            break;
          }
        }
      }
      
      
      if (existingValue) {
        if (typeof existingValue === 'string') {
          // Extract filename from URL if no separate filename field exists
          const urlParts = existingValue.split('/');
          const fallbackFilename = urlParts[urlParts.length - 1] || 'Existing Image';
          
          this.uploadedFiles = [{ 
            url: existingValue, 
            name: existingFilename || fallbackFilename, // Use _filename if available
            path: existingValue 
          }];
          this._dataValue = {
            url: existingValue,
            name: existingFilename || fallbackFilename,
            path: existingValue
          };

        } else if (Array.isArray(existingValue)) {
          this.uploadedFiles = existingValue;
          this._dataValue = existingValue;
        } else if (typeof existingValue === 'object') {
          this.uploadedFiles = [existingValue];
          this._dataValue = existingValue;
        }
      } else {
        this._dataValue = this.component.multiple ? [] : null;
      }
      
      return this;
    }

    static schema(...extend: any[]) {
      return Component.schema({
        type: 'image',
        label: 'Image Upload',
        key: 'image',
        input: true,
        persistent: true,
        tableView: false,
        multiple: false,
        storage: 'supabase',
        fileMaxSize: '10MB',
        filePattern: '*.jpg,*.jpeg,*.png,*.gif,*.webp',
        supabaseBucket: 'images',
        supabaseFolder: 'uploads',
        defaultValue: null
      }, ...extend);
    }

    static get builderInfo() {
      return {
        title: 'Image Upload',
        icon: 'photo',
        group: 'basic',
        weight: 10,
        schema: ImageUploadComponent.schema()
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
                  },
                  {
                    type: 'checkbox',
                    key: 'multiple',
                    label: 'Multiple Files',
                    input: true
                  }
                ]
              },
              {
                label: 'File',
                key: 'file',
                components: [
                  {
                    type: 'textfield',
                    key: 'filePattern',
                    label: 'File Pattern',
                    placeholder: '*.jpg,*.jpeg,*.png',
                    input: true
                  },
                  {
                    type: 'textfield',
                    key: 'fileMaxSize',
                    label: 'Max File Size',
                    placeholder: '10MB',
                    input: true
                  }
                ]
              },
              {
                label: 'Storage',
                key: 'storage',
                components: [
                  {
                    type: 'textfield',
                    key: 'supabaseBucket',
                    label: 'Storage Bucket',
                    placeholder: 'images',
                    input: true
                  },
                  {
                    type: 'textfield',
                    key: 'supabaseFolder',
                    label: 'Upload Folder',
                    placeholder: 'uploads',
                    input: true
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
      
      this.dropZoneId = `dropzone-${this.id}`;
      this.fileInputId = `file-${this.id}`;
      
      return super.render(this.renderTemplate('image', {
        component: this.component,
        uploadedFiles: this.uploadedFiles,
        isBuilderMode: isBuilderMode,
        dropZoneId: this.dropZoneId,
        fileInputId: this.fileInputId
      }));
    }

    renderTemplate(name: string, ctx: any) {
      if (name === 'image') {
        const { component, uploadedFiles, isBuilderMode, dropZoneId, fileInputId } = ctx;
        
        if (isBuilderMode) {
          return `
            <div class="formio-component formio-component-${component.type}">
              <label class="control-label">
                ${component.label || 'Image Upload'}
                ${component.validate?.required ? '<span class="field-required"></span>' : ''}
              </label>
              <div style="
                padding: 40px;
                background: var(--formio-bg-lighter);
                border: 2px dashed var(--formio-border);
                border-radius: 4px;
                text-align: center;
                color: var(--formio-text-muted);
              ">
                <i class="fa fa-image" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                <div>Image Upload Component</div>
                <small>${component.multiple ? 'Multiple files' : 'Single file'}</small>
              </div>
            </div>
          `;
        }
        
        return `
          <div class="formio-component formio-component-${component.type}">
            <label class="control-label">
              ${component.label || 'Image Upload'}
              ${component.validate?.required ? '<span class="field-required"></span>' : ''}
            </label>

            <input
              type="file"
              ref="${fileInputId}"
              id="${fileInputId}"
              accept="${component.filePattern || 'image/*'}"
              ${component.multiple ? 'multiple' : ''}
              style="display: none;"
            />

            <div
              ref="${dropZoneId}"
              class="image-drop-zone"
              style="
                padding: 30px;
                background: var(--formio-bg-light);
                border: 2px dashed var(--formio-border);
                border-radius: 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
              "
            >
              <i class="fa fa-cloud-upload" style="font-size: 36px; color: var(--formio-text-muted); margin-bottom: 10px; display: block;"></i>
              <div style="color: var(--formio-text); font-weight: 500; margin-bottom: 5px;">
                Drop image here or click to browse
              </div>
              <div style="color: var(--formio-text-muted); font-size: 14px;">
                ${component.fileMaxSize ? `Max size: ${component.fileMaxSize}` : ''}
                ${component.filePattern ? ` • ${component.filePattern}` : ''}
              </div>
            </div>

            <!-- Browse Media Library Button -->
            <div style="margin-top: 10px; text-align: center;">
              <span style="color: var(--formio-text-muted); font-size: 13px; margin: 0 10px;">or</span>
            </div>
            <button
              type="button"
              ref="browseLibraryBtn"
              class="btn btn-outline-primary btn-block"
              style="
                width: 100%;
                padding: 10px 16px;
                margin-top: 8px;
                border: 1px solid var(--formio-btn-primary);
                border-radius: 6px;
                background: var(--formio-bg-card);
                color: var(--formio-btn-primary);
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              "
            >
              <i class="fa fa-folder-open"></i>
              Browse Media Library
            </button>

            <!-- Uploaded files display -->
            <div class="uploaded-files" ref="uploadedFiles" style="margin-top: 15px;">
              ${uploadedFiles.map((file: any, index: number) => `
                <div class="uploaded-file" style="
                  display: flex;
                  align-items: center;
                  padding: 10px;
                  background: var(--formio-bg-card);
                  border: 1px solid var(--formio-border);
                  border-radius: 4px;
                  margin-bottom: 10px;
                " data-index="${index}">
                  ${file.url ? `
                    <a
                      href="${file.url}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="
                        display: block;
                        cursor: pointer;
                        margin-right: 15px;
                        transition: opacity 0.2s;
                      "
                      onmouseover="this.style.opacity='0.7'"
                      onmouseout="this.style.opacity='1'"
                      title="Click to view full size"
                    >
                      <img src="${file.url}" style="
                        width: 60px;
                        height: 60px;
                        object-fit: cover;
                        border-radius: 4px;
                        border: 2px solid var(--formio-border);
                      " />
                    </a>
                  ` : ''}
                  <div style="flex: 1; min-width: 0;">
                    <div style="
                      font-weight: 500;
                      margin-bottom: 4px;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                      color: var(--formio-text-dark);
                    " title="${file.name || 'Image'}">
                      ${file.name || 'Image'}
                    </div>
                    ${file.size ? `
                      <div style="color: var(--formio-text-muted); font-size: 14px;">
                        ${this.formatFileSize(file.size)}
                      </div>
                    ` : ''}
                    ${file.url ? `
                      <a
                        href="${file.url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                          color: var(--formio-btn-primary);
                          font-size: 12px;
                          text-decoration: none;
                        "
                        onmouseover="this.style.textDecoration='underline'"
                        onmouseout="this.style.textDecoration='none'"
                      >
                        Open in new tab ↗
                      </a>
                    ` : ''}
                  </div>
                  <button
                    type="button"
                    class="btn btn-sm btn-danger remove-file"
                    data-index="${index}"
                    style="margin-left: 10px;"
                  >
                    <i class="fa fa-times"></i>
                  </button>
                </div>
              `).join('')}
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

      const dropZone = element.querySelector(`[ref="${this.dropZoneId}"]`) as HTMLElement;
      const fileInput = element.querySelector(`[ref="${this.fileInputId}"]`) as HTMLInputElement;
      const browseLibraryBtn = element.querySelector('[ref="browseLibraryBtn"]') as HTMLButtonElement;

      if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => {
          fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.style.borderColor = 'var(--formio-btn-primary)';
          dropZone.style.backgroundColor = 'var(--primary-blue-bg)';
        });

        dropZone.addEventListener('dragleave', (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.style.borderColor = 'var(--formio-border)';
          dropZone.style.backgroundColor = 'var(--formio-bg-light)';
        });

        dropZone.addEventListener('drop', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          dropZone.style.borderColor = 'var(--formio-border)';
          dropZone.style.backgroundColor = 'var(--formio-bg-light)';

          const files = Array.from(e.dataTransfer?.files || []);
          await this.handleFiles(files);
        });

        fileInput.addEventListener('change', async (e) => {
          const files = Array.from((e.target as HTMLInputElement).files || []);
          await this.handleFiles(files);
        });
      }

      // Attach browse library button handler
      if (browseLibraryBtn) {
        browseLibraryBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openMediaLibrary();
        });

        // Add hover effects
        browseLibraryBtn.addEventListener('mouseenter', () => {
          browseLibraryBtn.style.background = 'var(--formio-btn-primary)';
          browseLibraryBtn.style.color = 'white';
        });
        browseLibraryBtn.addEventListener('mouseleave', () => {
          browseLibraryBtn.style.background = 'var(--formio-bg-card)';
          browseLibraryBtn.style.color = 'var(--formio-btn-primary)';
        });
      }

      const removeButtons = element.querySelectorAll('.remove-file');
      removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt((e.currentTarget as HTMLElement).dataset.index || '0');
          this.removeFile(index);
        });
      });

      return attached;
    }

    async handleFiles(files: File[]) {
      if (!files.length) return;
      
      // Register as uploading
      uploadingComponents.add(this.id);
      this.isUploading = true;
      
      // Validate files
      const maxSize = this.parseFileSize(this.component.fileMaxSize || '10MB');
      const validFiles = files.filter(file => {
        if (file.size > maxSize) {
          alert(`File ${file.name} is too large. Max size: ${this.component.fileMaxSize}`);
          return false;
        }
        return true;
      });
      
      // Upload files
      for (const file of validFiles) {
        try {
          const uploadedFile = await this.uploadToSupabase(file);
          
          if (this.component.multiple) {
            this.uploadedFiles.push(uploadedFile);
          } else {
            this.uploadedFiles = [uploadedFile];
          }
        } catch (error) {
          console.error('Upload failed:', error);
          alert(`Failed to upload ${file.name}`);
        }
      }
      
      // Unregister and update
      uploadingComponents.delete(this.id);
      this.isUploading = false;
      
      this.updateValue();
      this.redraw();
    }

    checkValidity(data: any, dirty: any, rowData: any) {
      if (this.isUploading) {
        return {
          valid: false,
          message: 'Please wait for image upload to complete'
        };
      }
      return super.checkValidity(data, dirty, rowData);
    }

    async uploadToSupabase(file: File) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = file.name.split('.').pop();
      const bucket = this.component.supabaseBucket || 'images';
      const folder = this.component.supabaseFolder || 'uploads';
      const path = `${folder}/${timestamp}-${randomStr}.${ext}`;


      const { error } = await supabase
        .storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(path);

      return {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        path: path,
        bucket: bucket
      };
    }

    removeFile(index: number) {
      this.uploadedFiles.splice(index, 1);
      this.updateValue();
      this.redraw();
    }

    openMediaLibrary() {
      const callback = openMediaSelectorCallback;
      if (!callback) {
        console.warn('Media selector callback not set. Make sure MediaSelectorBridge is mounted.');
        alert('Media library is not available. Please ensure it is configured.');
        return;
      }

      // Determine allowed types based on file pattern
      const allowedTypes: string[] = ['image'];
      const pattern = this.component.filePattern || '';
      if (pattern.includes('video') || pattern.includes('mp4') || pattern.includes('webm')) {
        allowedTypes.push('video');
      }

      callback(this.id, allowedTypes, (media: MediaAsset) => {
        this.handleMediaSelect(media);
      });
    }

    handleMediaSelect(media: MediaAsset) {
      const uploadedFile = {
        url: media.file_url,
        name: media.name,
        size: media.file_size,
        type: media.media_type,
        path: media.file_url,
        source: 'library',
        mediaId: media.id
      };

      if (this.component.multiple) {
        this.uploadedFiles.push(uploadedFile);
      } else {
        this.uploadedFiles = [uploadedFile];
      }

      this.updateValue();
      this.redraw();
    }

    getValue() {

      if (!this._dataValue) {
        return this.component.multiple ? [] : '';
      }

      // Return just URLs for Vizrt compatibility
      if (this.component.multiple) {
        const result = Array.isArray(this._dataValue)
          ? this._dataValue.map(f => f.url || f)
          : [];
        return result;
      } else {
        const result = this._dataValue?.url || this._dataValue || '';
        return result;
      }
    }

    // Return additional data that should be saved alongside the main value
    // This allows the filename to be used in Item Display Name Format via {fieldName}
    getAdditionalFields(): Record<string, string> | null {
      const key = this.component.key || 'image';

      // Get the filename from the uploaded file(s)
      if (this._dataValue) {
        if (this.component.multiple) {
          // For multiple files, join the filenames
          if (Array.isArray(this._dataValue) && this._dataValue.length > 0) {
            const filenames = this._dataValue
              .map((f: any) => f.name || '')
              .filter((name: string) => name)
              .join(', ');
            if (filenames) {
              return {
                [`__${key}_filename`]: filenames
              };
            }
          }
        } else {
          // For single file, return the filename
          const filename = this._dataValue?.name;
          if (filename) {
            return {
              [`__${key}_filename`]: filename
            };
          }
        }
      }

      return null;
    }
    
    setValue(value: any, flags: any = {}) {

      if (this._isUpdating) {
        return false;
      }      
      
      this._isUpdating = true;
      
      try {
        if (!value) {
          this.uploadedFiles = [];
          this._dataValue = this.component.multiple ? [] : null;
        } else if (typeof value === 'string') {
          let displayFilename = null;
          const filenameKey = `__${this.key}_filename`;
          
          // Use cached filename from init if available
          if (this._cachedFilename) {
            displayFilename = this._cachedFilename;
          } else {            
            if (this.data[filenameKey] !== undefined) {
              displayFilename = this.data[filenameKey];
            }
          }
          
          
          // Try DIRECT property access - no conditionals
          try {
            displayFilename = this.data[filenameKey];
          } catch (err) {
          }
          
          
          // Fallback: Extract filename from URL
          if (!displayFilename) {
            const urlParts = value.split('/');
            displayFilename = urlParts[urlParts.length - 1] || 'Existing Image';
          }
          
          this.uploadedFiles = [{ 
            url: value, 
            name: displayFilename,
            path: value 
          }];

          this._dataValue = {
            url: value,
            name: displayFilename,
            path: value
          };
        } else if (Array.isArray(value)) {
          this.uploadedFiles = value;
          this._dataValue = value;
        } else if (typeof value === 'object') {
          // It's already an object with metadata
          this.uploadedFiles = [value];
          this._dataValue = value;
        }
        
        this.redraw();
        
        if (!flags.noUpdateEvent) {
          this.triggerChange();
        }
        
        return true;
      } finally {
        this._isUpdating = false;
      }
    }
    
    updateValue() {
      
      // CRITICAL FIX: Prevent circular updates
      if (this._isUpdating) {
        return;
      }
    
      this._isUpdating = true;
      
      try {
        const newValue = this.component.multiple 
          ? this.uploadedFiles 
          : this.uploadedFiles[0] || null;
        
        
        // Direct assignment instead of using dataValue setter
        if (JSON.stringify(this._dataValue) !== JSON.stringify(newValue)) {
          this._dataValue = newValue;
          this.triggerChange();
        }
      } finally {
        this._isUpdating = false;
      }
    }

    getFilename() {
      if (this.component.multiple) {
        return Array.isArray(this._dataValue)
          ? this._dataValue.map(f => f.name || 'Image')
          : [];
      } else {
        return this._dataValue?.name || '';
      }
    }

    // CRITICAL FIX: Remove the dataValue getter/setter that was causing loops
    get dataValue() {
      return this._dataValue;
    }
    
    set dataValue(value) {
      // Don't use triggerChange here - let setValue handle it
      if (this._isUpdating) {
        return;
      }
      
      if (JSON.stringify(this._dataValue) !== JSON.stringify(value)) {
        this._dataValue = value;
      }
    }

    formatFileSize(bytes: number) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    parseFileSize(sizeStr: string) {
      const units: any = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
      const match = sizeStr.match(/^(\d+)(KB|MB|GB)?$/i);
      if (!match) return 10 * 1024 * 1024;
      const size = parseInt(match[1]);
      const unit = match[2]?.toUpperCase();
      return unit ? size * units[unit] : size;
    }
  }

  return ImageUploadComponent;
};

export const registerImageComponent = () => {
  const Formio = (window as any).Formio;
  
  if (!Formio) {
    console.error('Formio not available for image component registration');
    return false;
  }
  
  if (Formio.Components.components.image) {
    return true;
  }
  
  const ImageComponent = createImageComponent(Formio);
  if (ImageComponent) {
    Formio.Components.addComponent('image', ImageComponent);
    return true;
  }
  
  return false;
};

export const fixImageComponentsInSchema = (schema: any) => {
  if (!schema || !schema.components) {
    return schema;
  }
  
  schema.components = schema.components.map((component: any) => {
    if (component.type === 'image') {
      return {
        ...component,
        input: true,
        persistent: true,
        tableView: false,
        storage: component.storage || 'supabase',
        supabaseBucket: component.supabaseBucket || 'images',
        supabaseFolder: component.supabaseFolder || 'uploads',
        fileMaxSize: component.fileMaxSize || '10MB',
        filePattern: component.filePattern || '*.jpg,*.jpeg,*.png,*.gif,*.webp'
      };
    }
    return component;
  });
  
  return schema;
};

export const isAnyImageUploading = () => uploadingComponents.size > 0;
