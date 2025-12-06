// University of Twente Assignment Assistant - JavaScript

// Global variables
const isBuilder = new URLSearchParams(window.location.search).get("builder") === "true";
const exerciseData = new URLSearchParams(window.location.search).get("exercise");
let editors = [];
let currentEditor = null;
let questions = [];
let updateQuestionNumbers = null;
let checkEmptyState = null;
let createQuestionBlock = null;

// Utility functions
function encodeFormData(data) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch (error) {
    console.error('Error encoding form data:', error);
    return null;
  }
}

function decodeFormData(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch (error) {
    console.error('Error decoding form data:', error);
    return null;
  }
}

// Image hosting configuration
const IMAGE_HOSTING = {
  // Free imgur API - no account needed for anonymous uploads
  imgur: {
    clientId: '546c25a59c58ad7', // Public client ID for anonymous uploads
    endpoint: 'https://api.imgur.com/3/image'
  },
  // You can add other services here
  enabled: true
};

// Upload image to hosting service and return URL
async function uploadImageToHost(file) {
  if (!IMAGE_HOSTING.enabled) {
    console.log('Image hosting disabled, falling back to base64');
    return await toBase64(file);
  }
  
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(IMAGE_HOSTING.imgur.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${IMAGE_HOSTING.imgur.clientId}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success && data.data?.link) {
      console.log('Image uploaded successfully:', data.data.link);
      return data.data.link;
    } else {
      throw new Error('Invalid response from image host');
    }
    
  } catch (error) {
    console.error('Image upload failed, falling back to base64:', error);
    // Fallback to base64 compression if upload fails
    const base64 = await toBase64(file);
    return await compressImage(base64, 600, 0.7);
  }
}

// Compress image to reduce URL size (kept as fallback)
async function compressImage(dataUrl, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression for better size reduction
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => resolve(dataUrl); // Return original if compression fails
    img.src = dataUrl;
  });
}

// Convert image URL to base64 with compression
async function imageUrlToBase64(url) {
  try {
    // Try direct fetch first
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // Compress the image before returning
    return await compressImage(dataUrl);
  } catch (error) {
    // If direct fetch fails (likely CORS), try using an image element
    console.warn('Direct fetch failed, trying alternative method:', error);
    try {
      const dataUrl = await convertImageViaCanvas(url);
      return await compressImage(dataUrl);
    } catch (canvasError) {
      console.error('Error converting image to base64:', canvasError);
      return url; // Return original URL if conversion fails
    }
  }
}

// Alternative method using canvas for CORS-restricted images
async function convertImageViaCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Try to enable CORS
    
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL();
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = function() {
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

// Process HTML content for assignment sharing
async function processImagesInHtml(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const images = tempDiv.querySelectorAll('img');
  
  for (const img of images) {
    const src = img.getAttribute('src');
    
    if (src) {
      if (src.startsWith('data:image/')) {
        // Base64 images - compress them to reduce URL size
        try {
          const compressed = await compressImage(src);
          img.setAttribute('src', compressed);
          console.log('Compressed embedded base64 image');
        } catch (error) {
          console.error('Error compressing embedded image:', error);
        }
      } else if (src.includes('imgur.com') || src.includes('i.imgur.com')) {
        // Imgur hosted images - keep as URLs (they're already optimized)
        console.log('Keeping imgur hosted image as URL:', src);
        // No processing needed - imgur URLs are stable and work well
      } else if (src.startsWith('http://') || src.startsWith('https://')) {
        // Other external URLs - convert to base64 with compression for offline access
        try {
          const base64 = await imageUrlToBase64(src);
          img.setAttribute('src', base64);
          console.log('Converted external image to compressed base64');
        } catch (error) {
          console.error('Error processing external image:', src, error);
          // Keep original URL if conversion fails
        }
      }
      // Local file URLs or other protocols - leave unchanged
    }
  }
  
  return tempDiv.innerHTML;
}

// Add smooth scroll to section
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Add floating action button
function createFloatingActionButton() {
  const fab = document.createElement('div');
  fab.className = 'fab';
  fab.innerHTML = createIcon('plus');
  fab.title = 'Add New Question';
  document.body.appendChild(fab);
  
  fab.addEventListener('click', () => {
    if (isBuilder) {
      const sections = document.querySelectorAll('.section-card');
      if (sections.length > 0) {
        const lastSection = sections[sections.length - 1];
        const container = lastSection.querySelector('.section-content');
        if (container) {
          const block = createQuestionBlock();
          container.appendChild(block);
          updateQuestionNumbers();
          
          // Animate the new question
          block.classList.add('slide-in-left');
          
          // Scroll to new question
          setTimeout(() => {
            block.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
  });
}

function countWords(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || '';
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function createIcon(type) {
  const icons = {
    drag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5h2v2H9zm4 0h2v2h-2zM9 9h2v2H9zm4 0h2v2h-2zm-4 4h2v2H9zm4 0h2v2h-2zm-4 4h2v2H9zm4 0h2v2h-2z"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
    section: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>',
    delete: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>',
    plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
    share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
    download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
    builder: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
    student: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>',
    preview: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
    pdf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>',
    upload: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>',
    save: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
    import: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',
    reset: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>',
    yaml: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 9h5.5L13 3.5V9M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4c0-1.11.89-2 2-2m9 16v-2H6v2h9m3-4v-2H6v2h12z"/></svg>',
    progress: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2.03v2.02c4.39.54 7.5 4.53 6.96 8.92-.46 3.64-3.32 6.53-6.96 6.96v2.02c5.5-.55 9.5-5.43 8.95-10.93-.45-4.75-4.22-8.5-8.95-8.95zM12 4.03C7.05 4.03 3 8.08 3 13s4.05 8.97 9 8.97v-2c-3.85 0-7-3.15-7-7s3.15-7 7-7v-2zm0 4v6l5 3-1 1.73-5.45-3.27V8.03h1.45z"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
  };
  return icons[type] || '';
}

function showModeIndicator() {
  const indicator = document.getElementById('mode-indicator');
  if (isBuilder) {
    indicator.innerHTML = createIcon('builder') + ' Instructor Mode';
    indicator.classList.add('hover-lift');
  } else if (exerciseData) {
    indicator.innerHTML = createIcon('student') + ' Student Mode';
    indicator.classList.add('hover-lift');
  }
}

// Create sidebar navigation for builder mode
function createSidebar() {
  if (!isBuilder) return null;
  
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar slide-in-left';
  sidebar.innerHTML = `
    <h3>Quick Navigation</h3>
    <nav id="section-nav">
      <a href="#assignment-info" class="nav-item active" onclick="scrollToSection('assignment-info'); return false;">
        ${createIcon('info')} Assignment Info
      </a>
    </nav>
    <div style="margin-top: var(--space-xl);">
      <button class="btn btn-primary" onclick="addSection()" style="width: 100%;">
        ${createIcon('plus')} Add Section
      </button>
    </div>
  `;
  
  return sidebar;
}

// Update sidebar navigation
function updateSidebarNav() {
  const nav = document.getElementById('section-nav');
  if (!nav) return;
  
  const sections = document.querySelectorAll('.section-card');
  const navItems = ['<a href="#assignment-info" class="nav-item" onclick="scrollToSection(\'assignment-info\'); return false;">' + createIcon('info') + ' Assignment Info</a>'];
  
  sections.forEach((section, index) => {
    const input = section.querySelector('input[type="text"]');
    const sectionName = input ? input.value || `Section ${index + 1}` : `Section ${index + 1}`;
    const sectionId = `section-${index}`;
    section.id = sectionId;
    
    navItems.push(`
      <a href="#${sectionId}" class="nav-item" onclick="scrollToSection('${sectionId}'); return false;">
        ${createIcon('section')} ${sectionName}
      </a>
    `);
  });
  
  nav.innerHTML = navItems.join('');
  
  // Update active state on scroll
  updateActiveNavOnScroll();
}

// Update active navigation item on scroll
function updateActiveNavOnScroll() {
  const sections = document.querySelectorAll('.card, .section-card');
  const navItems = document.querySelectorAll('.nav-item');
  
  window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop - 200) {
        current = section.id || 'assignment-info';
      }
    });
    
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${current}`) {
        item.classList.add('active');
      }
    });
  });
}

// Quill Editor Functions
function createQuillEditor(container, placeholder = "Type your answer here...", showHelp = true) {
  const editorDiv = document.createElement('div');
  editorDiv.className = 'quill-editor';
  
  // Add help text for images (only for student answer fields)
  if (showHelp && placeholder.includes("answer")) {
    const helpText = document.createElement('div');
    helpText.style.cssText = 'font-size: 0.8rem; color: #666; margin-bottom: 8px; font-style: italic;';
    helpText.innerHTML = '💡 Tip: You can add images by clicking the image button, dragging & dropping, or pasting from clipboard';
    container.appendChild(helpText);
  }
  
  container.appendChild(editorDiv);

  const toolbarOptions = [
    [{ 'font': ['', 'serif', 'monospace'] }],
    [{ 'header': [1, 2, 3, false] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image', 'blockquote', 'code-block'],
    ['table'],
    ['clean']
  ];

  const quill = new Quill(editorDiv, {
    theme: 'snow',
    placeholder: placeholder,
    modules: {
      toolbar: {
        container: toolbarOptions,
        handlers: {
          'table': function() {
            currentEditor = quill;
            showTableModal();
          },
          'image': function() {
            // Show options dialog
            const choice = confirm('Choose image source:\n\nOK = Upload from computer\nCancel = Enter image URL');
            
            if (choice) {
              // File upload
              const input = document.createElement('input');
              input.setAttribute('type', 'file');
              input.setAttribute('accept', 'image/*');
              input.click();
              
              input.onchange = async () => {
                const file = input.files[0];
                if (file) {
                  // Check file size (increased limit since we're using hosting service)
                  if (file.size > 20 * 1024 * 1024) {
                    alert('Image is too large. Please use an image smaller than 20MB.');
                    return;
                  }
                  
                  try {
                    // Show uploading status
                    const range = this.quill.getSelection();
                    this.quill.insertText(range.index, '[Uploading image...]');
                    
                    // Upload to hosting service (imgur) or fallback to compressed base64
                    const imageUrl = await uploadImageToHost(file);
                    
                    // Remove the uploading text and insert actual image
                    this.quill.deleteText(range.index, '[Uploading image...]'.length);
                    this.quill.insertEmbed(range.index, 'image', imageUrl);
                    
                    // Add click handler for resizing
                    setTimeout(() => {
                      const images = this.quill.root.querySelectorAll('img');
                      images.forEach(img => {
                        img.style.cursor = 'pointer';
                        img.onclick = () => showImageResizeModal(img, this.quill);
                      });
                    }, 100);
                    
                  } catch (error) {
                    console.error('Image upload failed:', error);
                    alert('Failed to upload image. Please try again or use a smaller image.');
                    // Remove the uploading text
                    const currentRange = this.quill.getSelection();
                    if (currentRange) {
                      this.quill.deleteText(currentRange.index - '[Uploading image...]'.length, '[Uploading image...]'.length);
                    }
                  }
                }
              };
            } else {
              // URL input
              const url = prompt('Enter image URL:\n\nNote: The image must be publicly accessible and allow cross-origin access.');
              if (url) {
                // Try to validate and load the image
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  // Convert to base64 to ensure it works offline
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0);
                  
                  try {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    const range = this.quill.getSelection();
                    this.quill.insertEmbed(range.index, 'image', dataUrl);
                    
                    // Add click handler
                    setTimeout(() => {
                      const images = this.quill.root.querySelectorAll('img');
                      images.forEach(img => {
                        img.style.cursor = 'pointer';
                        img.onclick = () => showImageResizeModal(img, this.quill);
                      });
                    }, 100);
                  } catch (e) {
                    alert('Could not load image. The image may be protected by CORS policy.');
                  }
                };
                img.onerror = () => {
                  alert('Failed to load image. Please check the URL or try uploading the image file directly.');
                };
                img.src = url;
              }
            }
          }
        }
      }
    }
  });
  
  // Add click handlers to existing images
  quill.root.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      showImageResizeModal(e.target, quill);
    }
  });
  
  // Add drag and drop support for images
  const editor = quill.root;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    editor.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    editor.addEventListener(eventName, () => {
      editor.classList.add('drag-over');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    editor.addEventListener(eventName, () => {
      editor.classList.remove('drag-over');
    }, false);
  });
  
  editor.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    handleFiles(files, quill);
  }, false);
  
  function handleFiles(files, quill) {
    ([...files]).forEach(async (file) => {
      if (file.type.startsWith('image/')) {
        if (file.size > 20 * 1024 * 1024) {
          alert(`Image "${file.name}" is too large. Please use images smaller than 20MB.`);
          return;
        }
        
        try {
          // Show uploading status
          const range = quill.getSelection() || { index: quill.getLength() };
          quill.insertText(range.index, `[Uploading ${file.name}...]`);
          
          // Upload to hosting service or fallback to compressed base64
          const imageUrl = await uploadImageToHost(file);
          
          // Remove the uploading text and insert actual image
          quill.deleteText(range.index, `[Uploading ${file.name}...]`.length);
          quill.insertEmbed(range.index, 'image', imageUrl);
          
          setTimeout(() => {
            const images = quill.root.querySelectorAll('img');
            images.forEach(img => {
              img.style.cursor = 'pointer';
              img.onclick = () => showImageResizeModal(img, quill);
            });
          }, 100);
          
        } catch (error) {
          console.error('Drag & drop image upload failed:', error);
          alert(`Failed to upload "${file.name}". Please try again.`);
          // Remove the uploading text
          const currentLength = quill.getLength();
          const uploadText = `[Uploading ${file.name}...]`;
          const content = quill.getText();
          const uploadIndex = content.lastIndexOf(uploadText);
          if (uploadIndex !== -1) {
            quill.deleteText(uploadIndex, uploadText.length);
          }
        }
      }
    });
  }

  return quill;
}

function showTableModal() {
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('table-modal').classList.add('active');
}

function closeTableModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('table-modal').classList.remove('active');
}

function insertTable() {
  const rows = parseInt(document.getElementById('table-rows').value) || 3;
  const cols = parseInt(document.getElementById('table-cols').value) || 3;
  
  if (currentEditor) {
    let tableHTML = '<table><tbody>';
    for (let i = 0; i < rows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        if (i === 0) {
          tableHTML += '<th>Header ' + (j + 1) + '</th>';
        } else {
          tableHTML += '<td>Cell ' + i + ',' + (j + 1) + '</td>';
        }
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table><p><br></p>';
    
    const range = currentEditor.getSelection(true);
    currentEditor.clipboard.dangerouslyPasteHTML(range.index, tableHTML);
  }
  
  closeTableModal();
}

// Builder Functions
function createBuilder() {
  const app = document.getElementById("app");
  questions = []; // Reset the global questions array
  let draggedElement = null;

  // Assignment details card
  const assignmentCard = document.createElement("div");
  assignmentCard.className = "card";
  assignmentCard.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">Assignment Details</h2>
      <p class="card-description">Set up your assignment information and requirements</p>
    </div>
    <div class="form-group">
      <label class="form-label">Assignment Title <span class="required">*</span></label>
      <input type="text" id="assignment-title" placeholder="e.g., Lab Report - Digital Systems Design">
    </div>
    <div class="form-group">
      <label class="form-label">Instructions</label>
      <textarea id="assignment-instructions" placeholder="Provide clear instructions for your students..." rows="4"></textarea>
    </div>
  `;

  // Student fields card
  const studentFieldsCard = document.createElement("div");
  studentFieldsCard.className = "card";
  studentFieldsCard.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">Student Information</h2>
      <p class="card-description">Select which information students must provide</p>
    </div>
    <div class="checkbox-group">
      <div class="checkbox-wrapper">
        <input type="checkbox" id="field-name" checked>
        <label for="field-name">Student Name</label>
      </div>
      <div class="checkbox-wrapper">
        <input type="checkbox" id="field-snumber" checked>
        <label for="field-snumber">S-Number</label>
      </div>
      <div class="checkbox-wrapper">
        <input type="checkbox" id="field-group">
        <label for="field-group">Group Number</label>
      </div>
    </div>
  `;

  // Questions card
  const questionsCard = document.createElement("div");
  questionsCard.className = "card";
  questionsCard.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">Assignment Questions</h2>
      <p class="card-description">Add and organize your questions</p>
    </div>
  `;

  const container = document.createElement("div");
  container.id = "questions-container";
  
  // Set up container drag handlers
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (draggedElement) {
      const afterElement = getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(draggedElement);
      } else {
        container.insertBefore(draggedElement, afterElement);
      }
    }
  });
  
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggedElement) {
      // Reorder the questions array to match the new DOM order
      reorderQuestionsArray();
    }
    draggedElement = null;
  });

  // Reorder the questions array to match the DOM order
  const reorderQuestionsArray = function() {
    const orderedBlocks = [...container.querySelectorAll('.question-card, .section-card')];
    const newQuestionsOrder = [];
    
    orderedBlocks.forEach(block => {
      const questionData = questions.find(q => q.block === block);
      if (questionData) {
        newQuestionsOrder.push(questionData);
      }
    });
    
    // Replace the questions array with the reordered version
    questions.length = 0; // Clear array
    questions.push(...newQuestionsOrder); // Add in new order
  };

  updateQuestionNumbers = function() {
    let questionCount = 0;
    container.querySelectorAll('.question-card, .section-card').forEach((card) => {
      const num = card.querySelector('.question-number');
      if (card.classList.contains('question-card')) {
        questionCount++;
        num.textContent = questionCount;
      }
    });
  };

  createQuestionBlock = function(isSection = false) {
    const block = document.createElement("div");
    block.className = isSection ? "section-card slide-in-left" : "question-card slide-in-left";
    block.draggable = false; // Only drag handle will be draggable
    block.dataset.type = isSection ? "section" : "question";
    
    // Debug logging
    if (!isSection) {
      console.log('Creating question with options controls');
    }

    const header = document.createElement("div");
    header.className = "question-header";

    const questionNum = document.createElement("span");
    questionNum.className = "question-number";
    if (!isSection) {
      questionNum.textContent = questions.filter(q => q.type === 'question').length + 1;
    } else {
      questionNum.textContent = "Section";
      questionNum.style.fontWeight = "bold";
      questionNum.style.color = "white";
      questionNum.style.width = "auto";
      questionNum.style.minWidth = "2.5rem";
      questionNum.style.padding = "0 0.75rem";
      questionNum.style.fontSize = "0.875rem";
    }

    const actions = document.createElement("div");
    actions.className = "question-actions";

    const dragBtn = document.createElement("button");
    dragBtn.className = "btn-icon drag-handle hover-grow";
    dragBtn.innerHTML = createIcon('drag');
    dragBtn.style.cursor = "move";
    dragBtn.draggable = true;
    dragBtn.title = "Drag to reorder";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-icon delete";
    deleteBtn.innerHTML = createIcon('delete');
    deleteBtn.title = `Delete this ${isSection ? 'section' : 'question'}`;
    
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (confirm(`Are you sure you want to delete this ${isSection ? 'section' : 'question'}?`)) {
        const idx = questions.findIndex(q => q.block === block);
        
        if (idx > -1) {
          questions.splice(idx, 1);
          block.remove();
          updateQuestionNumbers();
          checkEmptyState();
        } else {
          // Force remove from DOM even if not found in array (graceful fallback)
          block.remove();
          updateQuestionNumbers();
          checkEmptyState();
        }
      }
    });

    actions.appendChild(dragBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(questionNum);
    header.appendChild(actions);

    const qInput = document.createElement("input");
    qInput.placeholder = isSection ? "Enter section title..." : "Enter your question here...";
    qInput.type = "text";
    qInput.className = "form-input";
    if (isSection) {
      qInput.style.fontWeight = "600";
      qInput.style.fontSize = "1.125rem";
    }
    
    // Prevent drag on input
    qInput.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    qInput.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });

    // Add description with rich text editor
    const descriptionLabel = document.createElement("label");
    descriptionLabel.className = "form-label";
    descriptionLabel.textContent = "Description (Rich Text Editor)";
    descriptionLabel.style.marginTop = "1rem";
    descriptionLabel.style.fontSize = "0.875rem";

    // Create container for Quill editor
    const descriptionContainer = document.createElement("div");
    descriptionContainer.className = "description-editor-container";
    descriptionContainer.style.marginTop = "0.5rem";
    
    // Create a simplified Quill editor for descriptions
    const descriptionEditor = createQuillEditor(descriptionContainer, 
      isSection ? "Section description (optional)... You can add text, images, formatting, etc." 
                : "Question description or additional instructions (optional)... Add images, formatted text, etc.",
      false); // Don't show help text for description fields
    
    // Make it smaller for descriptions
    descriptionContainer.querySelector('.ql-editor').style.minHeight = '80px';
    
    // Prevent drag on editor
    descriptionContainer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    descriptionContainer.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "question-content";
    contentWrapper.appendChild(qInput);
    contentWrapper.appendChild(descriptionLabel);
    contentWrapper.appendChild(descriptionContainer);
    
    // Prevent any drag behavior on content
    contentWrapper.addEventListener('dragstart', (e) => {
      if (e.target !== dragBtn) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    
    block.appendChild(header);
    block.appendChild(contentWrapper);

    if (!isSection) {
      // Options row for image upload and word limit
      const optionsLabel = document.createElement("div");
      optionsLabel.style.fontSize = "0.75rem";
      optionsLabel.style.color = "var(--text-secondary)";
      optionsLabel.style.marginTop = "1rem";
      optionsLabel.style.marginBottom = "0.5rem";
      optionsLabel.style.fontWeight = "600";
      optionsLabel.style.textTransform = "uppercase";
      optionsLabel.style.letterSpacing = "0.5px";
      optionsLabel.textContent = "Question Options";
      contentWrapper.appendChild(optionsLabel);
      
      const optionsRow = document.createElement("div");
      optionsRow.className = "question-options";
      optionsRow.style.display = "flex";
      optionsRow.style.gap = "2rem";
      optionsRow.style.alignItems = "center";
      optionsRow.style.padding = "1rem";
      optionsRow.style.backgroundColor = "var(--secondary-light)";
      optionsRow.style.borderRadius = "var(--radius-md)";
      optionsRow.style.border = "1px solid var(--secondary)";
      
      // Image upload checkbox
      const checkboxWrapper = document.createElement("div");
      checkboxWrapper.className = "checkbox-wrapper";
      checkboxWrapper.style.margin = "0";
      
      const hasImage = document.createElement("input");
      hasImage.type = "checkbox";
      hasImage.id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      hasImage.style.width = "18px";
      hasImage.style.height = "18px";
      hasImage.style.cursor = "pointer";
      
      // Prevent drag on checkbox
      hasImage.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      hasImage.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
      
      const hasImageLabel = document.createElement("label");
      hasImageLabel.htmlFor = hasImage.id;
      hasImageLabel.textContent = "Allow image upload";
      hasImageLabel.style.cursor = "pointer";
      hasImageLabel.style.userSelect = "none";
      hasImageLabel.style.fontSize = "0.875rem";
      hasImageLabel.style.color = "var(--text)";
      
      checkboxWrapper.appendChild(hasImage);
      checkboxWrapper.appendChild(hasImageLabel);
      
      // Word limit input
      const wordLimitWrapper = document.createElement("div");
      wordLimitWrapper.style.display = "flex";
      wordLimitWrapper.style.alignItems = "center";
      wordLimitWrapper.style.gap = "0.5rem";
      
      const wordLimitLabel = document.createElement("label");
      wordLimitLabel.textContent = "Word limit:";
      wordLimitLabel.style.fontSize = "0.875rem";
      wordLimitLabel.style.color = "var(--gray-600)";
      
      const wordLimitInput = document.createElement("input");
      wordLimitInput.type = "number";
      wordLimitInput.min = "0";
      wordLimitInput.placeholder = "No limit";
      wordLimitInput.style.width = "120px";
      wordLimitInput.style.padding = "0.5rem";
      wordLimitInput.style.fontSize = "0.875rem";
      wordLimitInput.style.border = "2px solid var(--border)";
      wordLimitInput.style.borderRadius = "var(--radius-md)";
      wordLimitInput.style.backgroundColor = "white";
      
      // Prevent drag on input
      wordLimitInput.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      wordLimitInput.addEventListener('dragstart', (e) => {
        e.preventDefault();
      });
      
      wordLimitWrapper.appendChild(wordLimitLabel);
      wordLimitWrapper.appendChild(wordLimitInput);
      
      optionsRow.appendChild(checkboxWrapper);
      optionsRow.appendChild(wordLimitWrapper);
      contentWrapper.appendChild(optionsRow);
      
      questions.push({ 
        block, 
        input: qInput, 
        description: descriptionEditor, 
        imgCheck: hasImage, 
        wordLimit: wordLimitInput,
        type: 'question' 
      });
    } else {
      questions.push({ block, input: qInput, description: descriptionEditor, type: 'section' });
    }

    // Drag and drop handlers - only on the drag button
    dragBtn.addEventListener('dragstart', (e) => {
      draggedElement = block;
      block.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    dragBtn.addEventListener('dragend', () => {
      block.classList.remove('dragging');
      draggedElement = null;
    });

    return block;
  };

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.question-card:not(.dragging), .section-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  checkEmptyState = function() {
    if (questions.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.id = "empty-state";
      emptyState.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <p>No questions added yet</p>
      `;
      container.appendChild(emptyState);
    } else {
      const emptyState = document.getElementById("empty-state");
      if (emptyState) emptyState.remove();
    }
  };

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "button-group";

  const addSectionBtn = document.createElement("button");
  addSectionBtn.className = "btn btn-secondary";
  addSectionBtn.innerHTML = createIcon('plus') + "Add Section";
  addSectionBtn.onclick = () => {
    const block = createQuestionBlock(true);
    container.appendChild(block);
    updateQuestionNumbers();
    checkEmptyState();
    updateSidebarNav();
    
    // Animate and scroll to new section
    setTimeout(() => {
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const addQuestionBtn = document.createElement("button");
  addQuestionBtn.className = "btn btn-primary";
  addQuestionBtn.innerHTML = createIcon('plus') + "Add Question";
  addQuestionBtn.onclick = () => {
    const block = createQuestionBlock(false);
    container.appendChild(block);
    updateQuestionNumbers();
    checkEmptyState();
    
    // Animate new question
    setTimeout(() => {
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const generateBtn = document.createElement("button");
  generateBtn.className = "btn btn-success";
  generateBtn.innerHTML = createIcon('share') + "Generate Share Link";
  generateBtn.onclick = async () => {
    // Show loading state
    generateBtn.disabled = true;
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = createIcon('progress') + "Processing Images...";
    
    try {
      const orderedQuestions = await Promise.all(
        [...container.querySelectorAll('.question-card, .section-card')].map(async (block) => {
          const q = questions.find(q => q.block === block);
          if (q.type === 'section') {
            const processedDescription = await processImagesInHtml(q.description.root.innerHTML);
            return {
              type: 'section',
              title: q.input.value.trim(),
              description: processedDescription
            };
          } else {
            const processedDescription = await processImagesInHtml(q.description.root.innerHTML);
            return {
              type: 'question',
              question: q.input.value.trim(),
              description: processedDescription,
              allowImage: q.imgCheck.checked,
              wordLimit: q.wordLimit.value ? parseInt(q.wordLimit.value) : null
            };
          }
        })
      );
      
      const filteredQuestions = orderedQuestions.filter(item => 
        (item.type === 'section' ? item.title.length > 0 : item.question.length > 0)
      );

      const hasQuestions = filteredQuestions.some(item => item.type === 'question');
      if (!hasQuestions) {
        alert("Please add at least one question with text.");
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
        return;
      }

      const assignmentData = {
        title: document.getElementById('assignment-title').value.trim() || 'Untitled Assignment',
        instructions: document.getElementById('assignment-instructions').value.trim(),
        studentFields: {
          name: document.getElementById('field-name').checked,
          snumber: document.getElementById('field-snumber').checked,
          group: document.getElementById('field-group').checked
        },
        questions: filteredQuestions
      };

      const encoded = encodeFormData(assignmentData);
      if (!encoded) {
        alert('Error encoding assignment data. Please try again or reduce the content size.');
        return;
      }
      
      const link = `${window.location.origin}${window.location.pathname}?exercise=${encoded}`;
      
      // Check URL length limits and offer high compression if needed
      if (link.length > 8000) {
        const retry = confirm('Assignment is too large for URL sharing. Try high compression mode?\n\n• This will reduce image quality significantly\n• Choose "OK" to try high compression\n• Choose "Cancel" to manually reduce content');
        
        if (retry) {
          // Retry with high compression
          generateBtn.innerHTML = createIcon('progress') + "Applying High Compression...";
          
          const highCompressedQuestions = await Promise.all(
            orderedQuestions.map(async (item) => {
              if (item.description && item.description.includes('<img')) {
                // Re-process with high compression
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.description;
                const images = tempDiv.querySelectorAll('img[src^="data:image/"]');
                
                for (const img of images) {
                  try {
                    const highCompressed = await compressImage(img.src, 400, 0.4); // Lower quality/size
                    img.src = highCompressed;
                  } catch (error) {
                    console.error('High compression failed:', error);
                  }
                }
                
                return { ...item, description: tempDiv.innerHTML };
              }
              return item;
            })
          );
          
          const highCompressedData = { ...assignmentData, questions: highCompressedQuestions };
          const highCompressedEncoded = encodeFormData(highCompressedData);
          const highCompressedLink = `${window.location.origin}${window.location.pathname}?exercise=${highCompressedEncoded}`;
          
          if (highCompressedLink.length > 8000) {
            alert('Even with high compression, the assignment is too large. Please:\n• Remove some images\n• Reduce text content\n• Split into multiple assignments');
            return;
          }
          
          // Use the high compressed version
          Object.assign(assignmentData, highCompressedData);
          link = highCompressedLink;
          console.log(`High compression successful: ${link.length} characters`);
        } else {
          return;
        }
      }
      
      if (link.length > 2000) {
        console.warn(`URL is ${link.length} characters. May not work in older browsers.`);
      }

      const shareSection = document.createElement("div");
      shareSection.className = "share-section";
      
      // Calculate URL size info and hosting status
      const linkSizeKB = Math.round((link.length * 2) / 1024); // Approximate UTF-8 size
      const sizeWarning = link.length > 6000 ? '<p style="color: #f39c12; font-size: 0.875rem;">⚠️ Large URL - may not work in older browsers</p>' : '';
      
      // Check if images are hosted vs embedded
      const hasHostedImages = link.includes('imgur.com');
      const hasBase64Images = link.includes('data:image/');
      
      let imageInfo = '';
      if (hasHostedImages && hasBase64Images) {
        imageInfo = '<p style="color: #28a745; font-size: 0.875rem;">🌐 Mixed: Some images hosted online, some embedded</p>';
      } else if (hasHostedImages) {
        imageInfo = '<p style="color: #28a745; font-size: 0.875rem;">🌐 Images hosted online - URLs stay short!</p>';
      } else if (hasBase64Images) {
        imageInfo = '<p style="color: #6c757d; font-size: 0.875rem;">💡 Images embedded and compressed</p>';
      }
      
      shareSection.innerHTML = `
        <h3>${createIcon('check')} Assignment Created Successfully!</h3>
        <p>Share this link with your students:</p>
        <div class="share-link">
          <textarea readonly>${link}</textarea>
          <button class="copy-btn" onclick="copyToClipboard(this, '${link}')">Copy Link</button>
        </div>
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 0.875rem; margin: 0;">URL Size: ~${linkSizeKB} KB (${link.length} characters)</p>
          ${sizeWarning}
          ${imageInfo}
        </div>
      `;
      
      const existingShare = document.querySelector('.share-section');
      if (existingShare) existingShare.remove();
      
      const mainArea = document.querySelector('.main-area') || app;
      mainArea.appendChild(shareSection);
      
      // Animate share section
      shareSection.classList.add('fade-in');
      shareSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('An error occurred while processing images. Some images may not be included in the share link.');
    } finally {
      // Restore button state
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalText;
    }
  };

  questionsCard.appendChild(container);
  questionsCard.appendChild(buttonGroup);

  app.appendChild(assignmentCard);
  app.appendChild(studentFieldsCard);
  app.appendChild(questionsCard);
  
  // Import/Export card at the bottom
  const importExportCard = document.createElement("div");
  importExportCard.className = "card";
  importExportCard.style.background = "linear-gradient(135deg, #f8f9fa 0%, white 100%)";
  importExportCard.style.borderTop = "3px solid var(--primary)";
  importExportCard.innerHTML = `
    <div class="card-header">
      <h2 class="card-title">Form Management</h2>
      <p class="card-description">Save your form as a template or load a previous form</p>
    </div>
    <div class="button-group" style="justify-content: center;">
      <button class="btn btn-secondary" onclick="document.getElementById('json-upload').click()">
        ${createIcon('import')} Import Form
      </button>
      <button class="btn btn-secondary" onclick="downloadFormAsJSON()">
        ${createIcon('save')} Export as JSON
      </button>
      <button class="btn btn-secondary" onclick="downloadFormAsYAML()">
        ${createIcon('yaml')} Export as YAML
      </button>
      <input type="file" id="json-upload" accept=".json" style="display: none;" onchange="if(this.files[0]) importFormFromJSON(this.files[0])">
    </div>
  `;
  
  app.appendChild(importExportCard);
  
  checkEmptyState();

  buttonGroup.appendChild(addSectionBtn);
  buttonGroup.appendChild(addQuestionBtn);
  buttonGroup.appendChild(generateBtn);
}

// Student View Functions
function createFiller(data) {
  const app = document.getElementById("app");
  const answers = [];
  const storageKey = `assignment_${btoa(data.title || 'untitled').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
  
  // Create asymmetric grid layout
  const gridLayout = document.createElement("div");
  gridLayout.className = "asymmetric-grid";
  
  // Main content area
  const mainArea = document.createElement("div");
  mainArea.className = "main-area";

  // Assignment header card
  const headerCard = document.createElement("div");
  headerCard.className = "card fade-in";
  headerCard.innerHTML = `
    <div class="card-header">
      <h2 class="card-title animate-text">${data.title || 'Assignment'}</h2>
      ${data.instructions ? `<p class="card-description">${data.instructions}</p>` : ''}
    </div>
  `;

  // Student info card
  const studentCard = document.createElement("div");
  studentCard.className = "card card-neumorphic fade-in";
  studentCard.style.animationDelay = "0.1s";
  studentCard.innerHTML = `
    <div class="card-header">
      <h2 class="card-title animate-text">Student Information</h2>
      <p class="card-description">Please fill in your details</p>
    </div>
    <div class="info-grid">
  `;

  if (data.studentFields.name) {
    studentCard.innerHTML += `
      <div class="form-group">
        <label class="form-label">Full Name <span class="required">*</span></label>
        <input type="text" id="student-name" required placeholder="Your full name">
      </div>
    `;
  }

  if (data.studentFields.snumber) {
    studentCard.innerHTML += `
      <div class="form-group">
        <label class="form-label">S-Number <span class="required">*</span></label>
        <input type="text" id="student-snumber" required placeholder="s1234567" pattern="s[0-9]{7}">
      </div>
    `;
  }

  if (data.studentFields.group) {
    studentCard.innerHTML += `
      <div class="form-group">
        <label class="form-label">Group Number</label>
        <input type="text" id="student-group" placeholder="e.g., Group 3">
      </div>
    `;
  }

  studentCard.innerHTML += `
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="text" id="student-date" value="${new Date().toLocaleDateString('en-GB')}" readonly style="background: var(--gray-100); cursor: not-allowed;">
      </div>
    </div>
  `;

  mainArea.appendChild(headerCard);
  mainArea.appendChild(studentCard);

  // Questions
  let questionIndex = 0;
  let currentSectionDiv = null;
  
  data.questions.forEach((item, idx) => {
    if (item.type === 'section') {
      // Create section container
      const sectionWrapper = document.createElement("div");
      sectionWrapper.className = "section-wrapper";
      sectionWrapper.style.marginBottom = "2rem";
      
      // Create section header card
      const sectionCard = document.createElement("div");
      sectionCard.className = "section-header-card fade-in";
      sectionCard.style.animationDelay = `${idx * 0.05}s`;
      
      const sectionTitle = document.createElement("h2");
      sectionTitle.className = "animate-text";
      sectionTitle.textContent = item.title;
      
      sectionCard.appendChild(sectionTitle);
      
      if (item.description && item.description.trim() !== '<p><br></p>') {
        const sectionDesc = document.createElement("div");
        sectionDesc.className = "section-description";
        // Simply set the HTML content directly since it's already HTML from Quill
        sectionDesc.innerHTML = item.description;
        sectionCard.appendChild(sectionDesc);
      }
      
      sectionWrapper.appendChild(sectionCard);
      
      currentSectionDiv = document.createElement("div");
      currentSectionDiv.className = "section-content";
      sectionWrapper.appendChild(currentSectionDiv);
      
      mainArea.appendChild(sectionWrapper);
    } else {
      // Create question card
      questionIndex++;
      const questionCard = document.createElement("div");
      questionCard.className = "card hover-lift fade-in";
      questionCard.style.animationDelay = `${idx * 0.05}s`;
      
      const header = document.createElement("div");
      header.className = "question-header";
      header.style.marginBottom = "1rem";
      
      const questionNum = document.createElement("span");
      questionNum.className = "question-number";
      questionNum.textContent = questionIndex;
      
      const questionText = document.createElement("h3");
      questionText.style.flex = "1";
      questionText.style.marginLeft = "1rem";
      questionText.style.fontSize = "1.125rem";
      questionText.style.fontWeight = "600";
      questionText.textContent = item.question;
      
      header.appendChild(questionNum);
      header.appendChild(questionText);
      
      if (item.wordLimit) {
        const wordLimitBadge = document.createElement("span");
        wordLimitBadge.className = "word-limit-badge";
        wordLimitBadge.textContent = `${item.wordLimit} word limit`;
        header.appendChild(wordLimitBadge);
      }
      
      questionCard.appendChild(header);
      
      if (item.description && item.description.trim() !== '<p><br></p>') {
        const descDiv = document.createElement("div");
        descDiv.className = "question-description";
        descDiv.style.marginBottom = "1rem";
        // Simply set the HTML content directly since it's already HTML from Quill
        descDiv.innerHTML = item.description;
        questionCard.appendChild(descDiv);
      }

      const editorContainer = document.createElement("div");
      editorContainer.className = "editor-container";
      questionCard.appendChild(editorContainer);

      const editor = createQuillEditor(editorContainer);
      
      if (item.wordLimit) {
        const wordCountDiv = document.createElement("div");
        wordCountDiv.style.marginTop = "0.5rem";
        wordCountDiv.style.fontSize = "0.875rem";
        wordCountDiv.style.color = "var(--gray-500)";
        wordCountDiv.style.textAlign = "right";
        
        const updateWordCount = () => {
          const wordCount = countWords(editor.root.innerHTML);
          const remaining = item.wordLimit - wordCount;
          wordCountDiv.textContent = `Words: ${wordCount}/${item.wordLimit}`;
          
          if (remaining < 0) {
            wordCountDiv.style.color = "var(--error)";
            wordCountDiv.textContent += ` (${Math.abs(remaining)} over limit)`;
          } else if (remaining < 50) {
            wordCountDiv.style.color = "var(--warning)";
          } else {
            wordCountDiv.style.color = "var(--gray-500)";
          }
        };
        
        let isUpdating = false;
        
        editor.on('text-change', (delta, oldDelta, source) => {
          if (isUpdating) return;
          
          updateWordCount();
          
          // Enforce word limit
          if (source === 'user' && item.wordLimit) {
            const wordCount = countWords(editor.root.innerHTML);
            if (wordCount > item.wordLimit) {
              isUpdating = true;
              
              // Get the text content
              const text = editor.getText();
              const words = text.trim().split(/\s+/);
              
              if (words.length > item.wordLimit) {
                // Find the position after the last allowed word
                const allowedWords = words.slice(0, item.wordLimit);
                const allowedText = allowedWords.join(' ');
                
                // Clear and set limited text
                editor.setText(allowedText);
                
                // Show a temporary warning
                wordCountDiv.style.fontWeight = 'bold';
                setTimeout(() => {
                  wordCountDiv.style.fontWeight = 'normal';
                }, 1000);
              }
              
              isUpdating = false;
            }
          }
          
          debouncedSave();
        });
        
        updateWordCount();
        questionCard.appendChild(wordCountDiv);
      }
      
      editors.push(editor);

      let fileInput = null;
      let fileName = null;
      if (item.allowImage) {
        const fileWrapper = document.createElement("div");
        fileWrapper.className = "file-input-wrapper";
      
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.id = `file-${idx}`;
      
        const fileLabel = document.createElement("label");
        fileLabel.htmlFor = fileInput.id;
        fileLabel.className = "file-label";
        fileLabel.innerHTML = createIcon('upload') + "Upload Image (optional)";
      
        fileName = document.createElement("span");
        fileName.className = "file-name";
      
        fileInput.onchange = (e) => {
          if (e.target.files.length > 0) {
            fileName.textContent = e.target.files[0].name;
            toBase64(e.target.files[0]).then(base64 => saveProgress());
          } else {
            fileName.textContent = "";
            saveProgress();
          }
        };
      
        fileWrapper.appendChild(fileLabel);
        fileWrapper.appendChild(fileInput);
        fileWrapper.appendChild(fileName);
        questionCard.appendChild(fileWrapper);
      }

      answers.push({ editor, fileInput, fileName, question: item.question, index: idx });
      
      if (currentSectionDiv) {
        currentSectionDiv.appendChild(questionCard);
      } else {
        mainArea.appendChild(questionCard);
      }
    }
  });
  
  // Add progress save/load section with animated progress bar
  const progressCard = document.createElement("div");
  progressCard.className = "progress-section fade-in";
  progressCard.style.animationDelay = `${data.questions.length * 0.05 + 0.2}s`;
  
  // Calculate progress
  const totalQuestions = data.questions.filter(q => q.type === 'question').length;
  const answeredQuestions = answers.filter(a => a.editor.getText().trim().length > 0).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  
  progressCard.innerHTML = `
    <h4>${createIcon('progress')} Progress Management</h4>
    <div class="progress-info">
      <span class="progress-text">${answeredQuestions} of ${totalQuestions} questions answered</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
    </div>
    <button class="btn btn-secondary hover-lift" onclick="window.downloadStudentProgress()">
      ${createIcon('download')} Download Progress
    </button>
    <button class="btn btn-secondary hover-lift" onclick="document.getElementById('progress-upload').click()">
      ${createIcon('upload')} Load Progress
    </button>
    <button class="btn btn-danger hover-lift" onclick="window.resetStudentProgress()">
      ${createIcon('reset')} Reset Progress
    </button>
    <input type="file" id="progress-upload" accept=".json" style="display: none;" onchange="if(this.files[0]) window.loadStudentProgress(this.files[0])">
  `;
  mainArea.appendChild(progressCard);
  
  // Update progress bar on changes
  const updateProgressBar = () => {
    const answered = answers.filter(a => a.editor.getText().trim().length > 0).length;
    const percent = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
    const progressFill = progressCard.querySelector('.progress-fill');
    const progressText = progressCard.querySelector('.progress-text');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${answered} of ${totalQuestions} questions answered`;
  };

  // Save/Load Progress logic
  const saveProgress = () => {
    const progress = {
        timestamp: new Date().toISOString(),
        assignmentTitle: data.title,
        studentInfo: collectStudentInfo(),
        answers: answers.map(ans => ({
            html: ans.editor.root.innerHTML,
            file: ans.fileInput && ans.fileInput.files.length > 0 ? {
              name: ans.fileInput.files[0].name,
              data: ans.fileInput.files[0].base64 || null
            } : null
        }))
    };
    
    // Asynchronously get base64 for files before saving
    const filePromises = answers.map((ans, i) => {
      if (ans.fileInput && ans.fileInput.files.length > 0 && !ans.fileInput.files[0].base64) {
        return toBase64(ans.fileInput.files[0]).then(base64 => {
          ans.fileInput.files[0].base64 = base64; // cache it
          progress.answers[i].file.data = base64;
        });
      }
      return Promise.resolve();
    });

    Promise.all(filePromises).then(() => {
        localStorage.setItem(storageKey, JSON.stringify(progress));
    });
  };

  const loadProgress = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            const progress = JSON.parse(saved);
            
            // Load student info
            if (progress.studentInfo) {
              if (document.getElementById('student-name')) document.getElementById('student-name').value = progress.studentInfo.name || '';
              if (document.getElementById('student-snumber')) document.getElementById('student-snumber').value = progress.studentInfo.snumber || '';
              if (document.getElementById('student-group')) document.getElementById('student-group').value = progress.studentInfo.group || '';
            }

            // Load answers
            progress.answers.forEach((savedAns, i) => {
                const currentAns = answers[i];
                if (currentAns) {
                    currentAns.editor.root.innerHTML = savedAns.html;
                    if (savedAns.file && savedAns.file.data) {
                      const file = dataURLtoFile(savedAns.file.data, savedAns.file.name);
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(file);
                      currentAns.fileInput.files = dataTransfer.files;
                      currentAns.fileName.textContent = savedAns.file.name;
                      currentAns.fileInput.files[0].base64 = savedAns.file.data; // restore cache
                    }
                }
            });
            console.log('Progress loaded successfully.');
        } catch (e) {
            console.error("Failed to load progress:", e);
        }
    }
  };
  
  const resetProgress = () => {
    if (confirm("Are you sure you want to clear all your answers? This cannot be undone.")) {
      localStorage.removeItem(storageKey);
      window.location.reload();
    }
  };
  
  // Export/Import Progress Functions for Students
  window.downloadStudentProgress = async () => {
    await saveProgress(); // Ensure latest is saved
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const progress = JSON.parse(saved);
      const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_progress_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      alert('No progress to download yet.');
    }
  };
  
  window.loadStudentProgress = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const progress = JSON.parse(e.target.result);
        if (progress.assignmentTitle !== data.title) {
          if (!confirm(`This progress file is for "${progress.assignmentTitle}" but you're working on "${data.title}". Load anyway?`)) {
            return;
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(progress));
        window.location.reload();
      } catch (error) {
        alert('Invalid progress file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };
  
  window.resetStudentProgress = resetProgress;

  // Debounce save function
  let saveTimeout;
  const debouncedSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveProgress();
      updateProgressBar();
      
      // Update sidebar stats
      const completed = answers.filter(a => a.editor.getText().trim().length > 0).length;
      const percent = totalQuestions > 0 ? Math.round((completed / totalQuestions) * 100) : 0;
      const completedEl = document.getElementById('completed-count');
      const percentEl = document.getElementById('progress-percent');
      if (completedEl) completedEl.textContent = completed;
      if (percentEl) percentEl.textContent = `${percent}%`;
    }, 500);
  };

  // Attach event listeners
  editors.forEach(editor => editor.on('text-change', debouncedSave));
  document.querySelectorAll('#student-name, #student-snumber, #student-group').forEach(input => {
    input.addEventListener('input', debouncedSave);
  });
  
  // Create sidebar for progress info
  const sidebarInfo = document.createElement("aside");
  sidebarInfo.className = "sidebar slide-in-right";
  sidebarInfo.innerHTML = `
    <h3>Assignment Progress</h3>
    <div class="progress-stats">
      <div class="stat-item">
        <span class="stat-label">Total Questions</span>
        <span class="stat-value">${totalQuestions}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Completed</span>
        <span class="stat-value" id="completed-count">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Progress</span>
        <span class="stat-value" id="progress-percent">0%</span>
      </div>
    </div>
  `;
  
  // Action buttons
  const actionsCard = document.createElement("div");
  actionsCard.className = "card fade-in";
  actionsCard.style.animationDelay = `${data.questions.length * 0.05 + 0.3}s`;
  actionsCard.style.background = "var(--glass-bg)";
  actionsCard.style.backdropFilter = "var(--backdrop-blur)";
  actionsCard.style.border = "1px solid var(--glass-border)";
  
  const buttonGroup = document.createElement("div");
  buttonGroup.className = "button-group";
  buttonGroup.style.justifyContent = "center";

  const previewBtn = document.createElement("button");
  previewBtn.className = "btn btn-secondary hover-lift";
  previewBtn.innerHTML = createIcon('preview') + "Preview Report";
  previewBtn.onclick = async (e) => {
    e.preventDefault();
    const markdown = await generateMarkdown(data, answers, collectStudentInfo());
    showPreview(markdown);
  };

  const exportMdBtn = document.createElement("button");
  exportMdBtn.className = "btn btn-success hover-lift";
  exportMdBtn.innerHTML = createIcon('download') + "Download Markdown";
  exportMdBtn.onclick = async (e) => {
    e.preventDefault();
    const markdown = await generateMarkdown(data, answers, collectStudentInfo());
    downloadMarkdown(markdown, data.title);
  };

  const exportPdfBtn = document.createElement("button");
  exportPdfBtn.className = "btn btn-warning hover-lift";
  exportPdfBtn.innerHTML = createIcon('pdf') + "Download PDF";
  exportPdfBtn.onclick = async (e) => {
    e.preventDefault();
    await generatePDF(data, answers, collectStudentInfo());
  };
  
  const exportYamlBtn = document.createElement("button");
  exportYamlBtn.className = "btn btn-secondary hover-lift";
  exportYamlBtn.innerHTML = createIcon('yaml') + "Download YAML";
  exportYamlBtn.onclick = async (e) => {
    e.preventDefault();
    await generateYAML(data, answers, collectStudentInfo());
  };
  
  const resetBtn = document.createElement("button");
  resetBtn.className = "btn btn-danger hover-tilt";
  resetBtn.innerHTML = createIcon('reset') + "Clear & Reset Form";
  resetBtn.onclick = resetProgress;


  function collectStudentInfo() {
    return {
      name: document.getElementById('student-name')?.value || '',
      snumber: document.getElementById('student-snumber')?.value || '',
      group: document.getElementById('student-group')?.value || '',
      date: document.getElementById('student-date')?.value || ''
    };
  }

  buttonGroup.appendChild(previewBtn);
  buttonGroup.appendChild(exportMdBtn);
  buttonGroup.appendChild(exportPdfBtn);
  buttonGroup.appendChild(exportYamlBtn);
  
  actionsCard.appendChild(buttonGroup);

  const resetGroup = document.createElement("div");
  resetGroup.className = "button-group";
  resetGroup.style.justifyContent = "center";
  resetGroup.appendChild(resetBtn);

  actionsCard.appendChild(resetGroup);
  mainArea.appendChild(actionsCard);
  
  // Add layout to app
  gridLayout.appendChild(mainArea);
  gridLayout.appendChild(sidebarInfo);
  app.appendChild(gridLayout);
  
  // Initial load of saved progress
  loadProgress();
  updateProgressBar();
  
  // Create floating action button for quick export
  const exportFab = document.createElement('div');
  exportFab.className = 'fab';
  exportFab.innerHTML = createIcon('download');
  exportFab.title = 'Quick Export';
  exportFab.onclick = async () => {
    const markdown = await generateMarkdown(data, answers, collectStudentInfo());
    downloadMarkdown(markdown, data.title);
  };
  document.body.appendChild(exportFab);
}

// Export Functions
async function generateMarkdown(data, answers, studentInfo) {
  const lines = [];
  
  lines.push(`# ${data.title || 'Assignment Report'}\n`);
  
  lines.push("## Student Information\n");
  if (studentInfo.name) lines.push(`**Name:** ${studentInfo.name}`);
  if (studentInfo.snumber) lines.push(`**S-Number:** ${studentInfo.snumber}`);
  if (studentInfo.group) lines.push(`**Group:** ${studentInfo.group}`);
  lines.push(`**Date:** ${studentInfo.date}`);
  lines.push("\n");

  if (data.instructions) {
    lines.push("## Instructions\n");
    lines.push(`> ${data.instructions}\n`);
  }

  lines.push("## Responses\n");
  
  let answerIndex = 0;
  let questionNumber = 0;
  
  for (const item of data.questions) {
    if (item.type === 'section') {
      lines.push(`\n### ${item.title}\n`);
      if (item.description) {
        lines.push(`*${item.description}*\n`);
      }
    } else {
      questionNumber++;
      const ans = answers[answerIndex];
      answerIndex++;
      
      lines.push(`\n#### Question ${questionNumber}: ${ans.question}\n`);
      
      const html = ans.editor.root.innerHTML;
      if (html && html !== '<p><br></p>') {
        lines.push(html);
      } else {
        lines.push("*(No answer provided)*");
      }
      lines.push("\n");
      
      if (ans.fileInput && ans.fileInput.files.length > 0) {
        const file = ans.fileInput.files[0];
        const base64 = await toBase64(file);
        lines.push(`**Attached Image:**\n![Uploaded Image](${base64})\n`);
      }
      lines.push("---\n");
    }
  }

  return lines.join("\n");
}

function downloadMarkdown(content, title) {
  const blob = new Blob([content], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.md`;
  link.click();
}

async function generateYAML(data, answers, studentInfo) {
  const yamlData = [];
  
  let answerIndex = 0;
  
  for (const item of data.questions) {
    if (item.type === 'section') {
      // Skip sections, only include questions
      continue;
    } else {
      const ans = answers[answerIndex];
      answerIndex++;
      
      // Convert HTML to plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = ans.editor.root.innerHTML;
      
      // Convert common HTML elements to markdown
      let markdownText = convertHtmlToMarkdown(tempDiv);
      
      const questionAnswer = {
        question: ans.question,
        answer: markdownText.trim() || '(No answer provided)'
      };
      
      yamlData.push(questionAnswer);
    }
  }
  
  const yamlContent = convertToYAML(yamlData);
  downloadYAML(yamlContent, data.title);
}

function convertHtmlToMarkdown(element) {
  let markdown = '';
  
  // Process all child nodes
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      markdown += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      switch (tag) {
        case 'p':
          markdown += convertHtmlToMarkdown(node) + '\n\n';
          break;
        case 'strong':
        case 'b':
          markdown += '**' + convertHtmlToMarkdown(node) + '**';
          break;
        case 'em':
        case 'i':
          markdown += '*' + convertHtmlToMarkdown(node) + '*';
          break;
        case 'u':
          markdown += '_' + convertHtmlToMarkdown(node) + '_';
          break;
        case 'h1':
          markdown += '# ' + convertHtmlToMarkdown(node) + '\n\n';
          break;
        case 'h2':
          markdown += '## ' + convertHtmlToMarkdown(node) + '\n\n';
          break;
        case 'h3':
          markdown += '### ' + convertHtmlToMarkdown(node) + '\n\n';
          break;
        case 'ul':
          for (const li of node.querySelectorAll('li')) {
            markdown += '- ' + convertHtmlToMarkdown(li) + '\n';
          }
          markdown += '\n';
          break;
        case 'ol':
          let index = 1;
          for (const li of node.querySelectorAll('li')) {
            markdown += index + '. ' + convertHtmlToMarkdown(li) + '\n';
            index++;
          }
          markdown += '\n';
          break;
        case 'li':
          // Already handled in ul/ol
          break;
        case 'blockquote':
          markdown += '> ' + convertHtmlToMarkdown(node).replace(/\n/g, '\n> ') + '\n\n';
          break;
        case 'code':
          markdown += '`' + node.textContent + '`';
          break;
        case 'pre':
          markdown += '```\n' + node.textContent + '\n```\n\n';
          break;
        case 'a':
          markdown += '[' + convertHtmlToMarkdown(node) + '](' + node.href + ')';
          break;
        case 'br':
          markdown += '\n';
          break;
        case 'hr':
          markdown += '\n---\n\n';
          break;
        case 'table':
          // Simple table conversion
          const rows = node.querySelectorAll('tr');
          if (rows.length > 0) {
            for (const row of rows) {
              const cells = row.querySelectorAll('td, th');
              markdown += '| ';
              for (const cell of cells) {
                markdown += convertHtmlToMarkdown(cell).trim() + ' | ';
              }
              markdown += '\n';
              
              // Add header separator after first row
              if (row === rows[0]) {
                markdown += '| ';
                for (let i = 0; i < cells.length; i++) {
                  markdown += '--- | ';
                }
                markdown += '\n';
              }
            }
            markdown += '\n';
          }
          break;
        default:
          // For any other tags, just get the content
          markdown += convertHtmlToMarkdown(node);
      }
    }
  }
  
  // Clean up extra whitespace
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}

function downloadYAML(content, title) {
  const blob = new Blob([content], { type: "text/yaml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.yaml`;
  link.click();
}

async function generatePDF(data, answers, studentInfo) {
  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 40px;
    border-radius: 8px;
    font-size: 16px;
    z-index: 10000;
  `;
  loadingDiv.textContent = 'Generating PDF...';
  document.body.appendChild(loadingDiv);
  
  try {
    // Create jsPDF instance
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    // Constants for layout - efficient spacing
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20; // Smaller margins
    const contentWidth = pageWidth - (2 * margin);
    let yPos = 25; // Start position
    
    // Simple page numbers only
    const addPageNumber = () => {
      const currentPage = pdf.internal.getCurrentPageInfo().pageNumber;
      const savedSize = pdf.internal.getFontSize();
      
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(String(currentPage), pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      pdf.setFontSize(savedSize);
    };
    
    // Helper function to check page overflow
    const checkPageOverflow = (height) => {
      if (yPos + height > pageHeight - margin - 10) {
        pdf.addPage();
        yPos = margin;
        addPageNumber();
      }
    };
    
    // Helper to extract plain text from HTML
    const htmlToText = (html) => {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      // Convert br tags to newlines
      temp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      // Convert p tags to double newlines
      temp.querySelectorAll('p').forEach(p => {
        p.prepend('\n');
        p.append('\n');
      });
      return temp.textContent || temp.innerText || '';
    };
    
    // Helper to add wrapped text with compact spacing
    const addWrappedText = (text, x, y, maxWidth, lineHeight = 5) => {
      const lines = pdf.splitTextToSize(text, maxWidth);
      for (let i = 0; i < lines.length; i++) {
        checkPageOverflow(lineHeight);
        pdf.text(lines[i], x, yPos);
        yPos += lineHeight;
      }
      return yPos;
    };
    
    // Set metadata
    pdf.setProperties({
      title: data.title || 'Assignment Report',
      subject: 'University of Twente Assignment',
      author: studentInfo.name || 'Student',
      keywords: `assignment,${data.title},${studentInfo.snumber || ''}`,
      creator: 'UT Assignment Formatting Assistant'
    });
    
    // Compact header
    pdf.setFontSize(18);
    pdf.setFont('times', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(data.title || 'Assignment', pageWidth / 2, 25, { align: 'center' });
    yPos = 35;
    
    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');
    pdf.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // Student info box
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    const infoBoxHeight = 30;
    pdf.rect(margin, yPos, contentWidth, infoBoxHeight);
    
    // Student info content
    yPos += 8;
    pdf.setFont('times', 'normal');
    let infoY = yPos;
    
    if (studentInfo.name) {
      pdf.text(`Name: ${studentInfo.name}`, margin + 5, infoY);
      infoY += 7;
    }
    if (studentInfo.snumber) {
      pdf.text(`Student Number: ${studentInfo.snumber}`, margin + 5, infoY);
      infoY += 7;
    }
    if (studentInfo.group) {
      pdf.text(`Group: ${studentInfo.group}`, margin + 5, infoY);
      infoY += 7;
    }
    pdf.text(`Date: ${studentInfo.date}`, margin + 5, infoY);
    
    yPos += infoBoxHeight + 8;
    
    // Instructions if any
    if (data.instructions) {
      pdf.setFontSize(11);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Instructions:', margin, yPos);
      yPos += 5;
      
      pdf.setFontSize(10);
      pdf.setFont('times', 'normal');
      addWrappedText(data.instructions, margin, yPos, contentWidth);
      yPos += 6;
    }
    
    // Process questions and answers
    let questionNumber = 0;
    let answerIndex = 0;
    
    for (let i = 0; i < data.questions.length; i++) {
      const item = data.questions[i];
      
      if (item.type === 'section') {
        // Section
        checkPageOverflow(15);
        yPos += 10; // Reduced space before sections
        
        pdf.setFontSize(13);
        pdf.setFont('times', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(item.title, margin, yPos);
        yPos += 6;
        
        if (item.description && item.description.trim() !== '') {
          pdf.setFontSize(10);
          pdf.setFont('times', 'normal');
          pdf.setTextColor(0, 0, 0);
          
          // Process section description with rich content (including images)
          const processSectionContent = async (html) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Get all images first and preload them
            const images = tempDiv.getElementsByTagName('img');
            const imagePromises = [];
            const imageData = new Map();
            
            for (const img of images) {
              const promise = new Promise((resolve) => {
                const tempImg = new Image();
                tempImg.onload = () => {
                  imageData.set(img.src, {
                    width: tempImg.width,
                    height: tempImg.height,
                    src: img.src
                  });
                  resolve();
                };
                tempImg.onerror = () => {
                  console.error('Failed to load section image:', img.src);
                  resolve();
                };
                tempImg.src = img.src;
              });
              imagePromises.push(promise);
            }
            
            await Promise.all(imagePromises);
            
            // Process the HTML content
            const processNode = (node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.trim()) {
                  addWrappedText(node.textContent, margin, yPos, contentWidth);
                  yPos += 4;
                }
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'IMG') {
                  const imgData = imageData.get(node.src);
                  if (imgData) {
                    // Add the image to PDF
                    checkPageOverflow(60); // Ensure space for image
                    
                    const maxImageWidth = contentWidth * 0.8;
                    const aspectRatio = imgData.height / imgData.width;
                    let imageWidth = Math.min(imgData.width, maxImageWidth);
                    let imageHeight = imageWidth * aspectRatio;
                    
                    // Center the image
                    const imageX = margin + (contentWidth - imageWidth) / 2;
                    
                    try {
                      pdf.addImage(node.src, 'JPEG', imageX, yPos, imageWidth, imageHeight);
                      yPos += imageHeight + 5;
                    } catch (error) {
                      console.error('Error adding section image to PDF:', error);
                      // Add text fallback
                      pdf.setTextColor(150, 150, 150);
                      pdf.text('[Image could not be displayed]', margin, yPos);
                      yPos += 5;
                      pdf.setTextColor(0, 0, 0);
                    }
                  }
                } else if (node.tagName === 'P') {
                  for (const child of node.childNodes) {
                    processNode(child);
                  }
                  yPos += 2; // Extra space after paragraphs
                } else {
                  // Process other elements (bold, italic, etc.)
                  for (const child of node.childNodes) {
                    processNode(child);
                  }
                }
              }
            };
            
            for (const child of tempDiv.childNodes) {
              processNode(child);
            }
          };
          
          await processSectionContent(item.description);
          yPos += 3;
        }
      } else {
        // Question
        questionNumber++;
        const answer = answers[answerIndex];
        answerIndex++;
        
        // Question with compact formatting
        checkPageOverflow(10);
        yPos += 6; // Minimal space before question
        
        // Question header
        pdf.setFontSize(11);
        pdf.setFont('times', 'bold');
        pdf.setTextColor(0, 0, 0);
        const qText = `Question ${questionNumber}: ${item.question}`;
        addWrappedText(qText, margin, yPos, contentWidth);
        yPos += 5;
        
        // Question description (if any) with images
        if (item.description && item.description.trim() !== '') {
          pdf.setFontSize(10);
          pdf.setFont('times', 'normal');
          pdf.setTextColor(0, 0, 0);
          
          // Process question description with rich content (including images)
          const processQuestionContent = async (html) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Get all images first and preload them
            const images = tempDiv.getElementsByTagName('img');
            const imagePromises = [];
            const imageData = new Map();
            
            for (const img of images) {
              const promise = new Promise((resolve) => {
                const tempImg = new Image();
                tempImg.onload = () => {
                  imageData.set(img.src, {
                    width: tempImg.width,
                    height: tempImg.height,
                    src: img.src
                  });
                  resolve();
                };
                tempImg.onerror = () => {
                  console.error('Failed to load question image:', img.src);
                  resolve();
                };
                tempImg.src = img.src;
              });
              imagePromises.push(promise);
            }
            
            await Promise.all(imagePromises);
            
            // Process the HTML content similar to answer processing
            const processNode = (node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.trim()) {
                  addWrappedText(node.textContent, margin, yPos, contentWidth);
                  yPos += 4;
                }
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'IMG') {
                  const imgData = imageData.get(node.src);
                  if (imgData) {
                    // Add the image to PDF
                    checkPageOverflow(60); // Ensure space for image
                    
                    const maxImageWidth = contentWidth * 0.8;
                    const aspectRatio = imgData.height / imgData.width;
                    let imageWidth = Math.min(imgData.width, maxImageWidth);
                    let imageHeight = imageWidth * aspectRatio;
                    
                    // Center the image
                    const imageX = margin + (contentWidth - imageWidth) / 2;
                    
                    try {
                      pdf.addImage(node.src, 'JPEG', imageX, yPos, imageWidth, imageHeight);
                      yPos += imageHeight + 5;
                    } catch (error) {
                      console.error('Error adding question image to PDF:', error);
                      // Add text fallback
                      pdf.setTextColor(150, 150, 150);
                      pdf.text('[Image could not be displayed]', margin, yPos);
                      yPos += 5;
                      pdf.setTextColor(0, 0, 0);
                    }
                  }
                } else if (node.tagName === 'P') {
                  for (const child of node.childNodes) {
                    processNode(child);
                  }
                  yPos += 2; // Extra space after paragraphs
                } else {
                  // Process other elements (bold, italic, etc.)
                  for (const child of node.childNodes) {
                    processNode(child);
                  }
                }
              }
            };
            
            for (const child of tempDiv.childNodes) {
              processNode(child);
            }
          };
          
          await processQuestionContent(item.description);
          yPos += 3; // Space after question description
        }
        
        // Answer label
        pdf.setFont('times', 'italic');
        pdf.setFontSize(10);
        pdf.text('Answer:', margin, yPos);
        yPos += 4;
        
        // Answer content
        pdf.setFontSize(10);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(0, 0, 0);
        
        const answerHTML = answer.editor.root.innerHTML;
        if (!answerHTML || answerHTML.trim() === '') {
          pdf.setTextColor(150, 150, 150);
          pdf.setFont('helvetica', 'italic');
          pdf.text('(No answer provided)', margin, yPos);
          yPos += 7;
        } else {
          // Process rich content with embedded images
          const processRichContent = async (html) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Get all images first and preload them
            const images = tempDiv.getElementsByTagName('img');
            const imagePromises = [];
            const imageData = new Map();
            
            for (const img of images) {
              const promise = new Promise((resolve) => {
                const tempImg = new Image();
                tempImg.onload = () => {
                  imageData.set(img.src, {
                    width: tempImg.width,
                    height: tempImg.height,
                    src: img.src
                  });
                  resolve();
                };
                tempImg.onerror = () => {
                  console.error('Failed to load image:', img.src);
                  resolve();
                };
                tempImg.src = img.src;
              });
              imagePromises.push(promise);
            }
            
            await Promise.all(imagePromises);
            
            // Track current text formatting
            let currentFormat = {
              bold: false,
              italic: false,
              underline: false,
              fontSize: 11,
              color: { r: 0, g: 0, b: 0 }
            };
            
            // Helper to apply text formatting
            const applyFormatting = (format) => {
              const fontStyle = format.bold && format.italic ? 'bolditalic' : 
                               format.bold ? 'bold' : 
                               format.italic ? 'italic' : 'normal';
              pdf.setFont('times', fontStyle);
              pdf.setFontSize(format.fontSize);
              pdf.setTextColor(format.color.r, format.color.g, format.color.b);
            };
            
            // Helper to parse styles
            const parseStyles = (element) => {
              const format = { ...currentFormat };
              
              // Check for Quill classes
              if (element.classList) {
                if (element.classList.contains('ql-size-small')) format.fontSize = 9;
                else if (element.classList.contains('ql-size-large')) format.fontSize = 14;
                else if (element.classList.contains('ql-size-huge')) format.fontSize = 18;
              }
              
              // Check for inline styles
              if (element.style) {
                if (element.style.color) {
                  const rgb = element.style.color.match(/\d+/g);
                  if (rgb) {
                    format.color = { r: parseInt(rgb[0]), g: parseInt(rgb[1]), b: parseInt(rgb[2]) };
                  }
                }
                if (element.style.backgroundColor && element.style.backgroundColor !== 'transparent') {
                  // Note: PDF doesn't support background colors easily, but we could add a highlight effect
                }
              }
              
              // Check for formatting tags
              if (element.tagName === 'STRONG' || element.tagName === 'B') format.bold = true;
              if (element.tagName === 'EM' || element.tagName === 'I') format.italic = true;
              if (element.tagName === 'U') format.underline = true;
              
              return format;
            };
            
            // Now process the content in order
            const processNode = async (node, inheritedFormat = currentFormat) => {
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text && text.trim()) {
                  applyFormatting(inheritedFormat);
                  
                  // Handle underline if needed
                  if (inheritedFormat.underline) {
                    const lines = pdf.splitTextToSize(text, contentWidth);
                    for (const line of lines) {
                      checkPageOverflow(7);
                      const textWidth = pdf.getTextWidth(line);
                      pdf.text(line, margin, yPos);
                      // Draw underline
                      pdf.line(margin, yPos + 1, margin + textWidth, yPos + 1);
                      yPos += 7;
                    }
                  } else {
                    addWrappedText(text, margin, yPos, contentWidth);
                  }
                }
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'IMG') {
                  yPos += 5;
                  checkPageOverflow(80);
                  
                  try {
                    const imgInfo = imageData.get(node.src);
                    if (imgInfo) {
                      const maxImgWidth = Math.min(contentWidth * 0.8, 120); // 80% width like LaTeX
                      const imgHeight = (imgInfo.height * maxImgWidth) / imgInfo.width;
                      
                      // Center the image
                      const imgX = margin + (contentWidth - maxImgWidth) / 2;
                      
                      // Add the image with border
                      pdf.setDrawColor(200, 200, 200);
                      pdf.setLineWidth(0.3);
                      pdf.rect(imgX - 2, yPos - 2, maxImgWidth + 4, imgHeight + 4);
                      pdf.addImage(node.src, 'JPEG', imgX, yPos, maxImgWidth, imgHeight);
                      yPos += imgHeight + 3;
                      
                      // Add figure caption
                      pdf.setFontSize(9);
                      pdf.setFont('times', 'italic');
                      pdf.setTextColor(80, 80, 80);
                      const figNum = processNode.figureCount = (processNode.figureCount || 0) + 1;
                      pdf.text(`Figure ${figNum}`, pageWidth / 2, yPos + 3, { align: 'center' });
                      yPos += 5;
                      
                      // Reset formatting
                      applyFormatting(inheritedFormat);
                    } else {
                      throw new Error('Image not preloaded');
                    }
                  } catch (e) {
                    console.error('Error adding embedded image:', e);
                    pdf.setTextColor(255, 0, 0);
                    pdf.text('[Image could not be loaded]', margin, yPos);
                    yPos += 7;
                    // Reset color
                    applyFormatting(inheritedFormat);
                  }
                } else if (node.tagName === 'P' || node.tagName === 'DIV') {
                  const format = parseStyles(node);
                  
                  // Check text alignment
                  let alignment = 'left';
                  if (node.classList) {
                    if (node.classList.contains('ql-align-center')) alignment = 'center';
                    else if (node.classList.contains('ql-align-right')) alignment = 'right';
                    else if (node.classList.contains('ql-align-justify')) alignment = 'justify';
                  }
                  
                  // Save current position for alignment
                  const savedMargin = margin;
                  const savedYPos = yPos;
                  
                  // Process paragraph/div contents in order
                  for (const child of node.childNodes) {
                    await processNode(child, format);
                  }
                  yPos += 1; // Minimal space after block element
                } else if (node.tagName === 'BR') {
                  yPos += 3; // Line break
                } else if (node.tagName === 'UL' || node.tagName === 'OL') {
                  // Handle lists
                  const listItems = node.getElementsByTagName('li');
                  for (let i = 0; i < listItems.length; i++) {
                    checkPageOverflow(7);
                    const bullet = node.tagName === 'UL' ? '• ' : `${i + 1}. `;
                    
                    // Add bullet/number
                    applyFormatting(inheritedFormat);
                    pdf.text(bullet, margin, yPos);
                    
                    // Process list item content
                    const listItem = listItems[i];
                    const bulletWidth = pdf.getTextWidth(bullet);
                    const savedMargin = margin;
                    margin += bulletWidth;
                    
                    // Process children of list item
                    for (const child of listItem.childNodes) {
                      await processNode(child, inheritedFormat);
                    }
                    
                    margin = savedMargin;
                    yPos += 1; // Minimal list item spacing
                  }
                } else if (node.tagName === 'BLOCKQUOTE') {
                  // Handle blockquotes
                  const savedMargin = margin;
                  margin += 10;
                  
                  // Draw quote line
                  pdf.setDrawColor(207, 0, 114);
                  pdf.setLineWidth(0.5);
                  const startY = yPos;
                  
                  // Process blockquote content
                  const format = { ...inheritedFormat, italic: true };
                  for (const child of node.childNodes) {
                    await processNode(child, format);
                  }
                  
                  // Draw the vertical line
                  pdf.line(savedMargin + 5, startY, savedMargin + 5, yPos - 3);
                  margin = savedMargin;
                  yPos += 3; // Reduced spacing after blockquote
                } else if (node.tagName === 'PRE' || node.tagName === 'CODE') {
                  // Handle code blocks
                  checkPageOverflow(10);
                  const format = { ...inheritedFormat, fontSize: 9 };
                  pdf.setFont('courier', 'normal');
                  pdf.setFontSize(9);
                  
                  // Background for code
                  pdf.setFillColor(245, 245, 245);
                  const codeText = node.textContent;
                  const codeLines = pdf.splitTextToSize(codeText, contentWidth - 10);
                  const codeHeight = codeLines.length * 5 + 4;
                  pdf.rect(margin, yPos - 2, contentWidth, codeHeight, 'F');
                  
                  // Add code text
                  pdf.setTextColor(0, 0, 0);
                  pdf.text(codeLines, margin + 5, yPos + 2);
                  yPos += codeHeight + 3; // Reduced spacing after code
                  
                  // Reset formatting
                  applyFormatting(inheritedFormat);
                } else {
                  // For other formatting elements, parse styles and process children
                  const format = parseStyles(node);
                  for (const child of node.childNodes) {
                    await processNode(child, format);
                  }
                }
              }
            };
            
            // Process all top-level nodes
            for (const node of tempDiv.childNodes) {
              await processNode(node);
            }
          };
          
          await processRichContent(answerHTML);
        }
        
        // Add image if exists
        if (answer.fileInput && answer.fileInput.files.length > 0) {
          yPos += 5;
          checkPageOverflow(80);
          
          try {
            const file = answer.fileInput.files[0];
            const base64 = file.base64 || await toBase64(file);
            
            // Calculate image dimensions to fit width
            const maxImgWidth = Math.min(contentWidth, 150);
            pdf.addImage(base64, 'JPEG', margin, yPos, maxImgWidth, 0);
            
            // Get actual image height after adding
            const imgProps = pdf.getImageProperties(base64);
            const imgHeight = (imgProps.height * maxImgWidth) / imgProps.width;
            yPos += imgHeight + 5;
          } catch (e) {
            console.error('Error adding image:', e);
            pdf.setTextColor(255, 0, 0);
            pdf.text('[Error loading image]', margin, yPos);
            yPos += 7;
          }
        }
        
        // Add minimal spacing between questions
        yPos += 4;
      }
    }
    
    // Helper to convert base64 to blob
    const base64ToBlob = (base64) => {
      const parts = base64.split(',');
      const contentType = parts[0].match(/:(.*?);/)[1];
      const raw = atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: contentType });
    };
    
    // Build metadata with full content
    const metadata = {
      generatedAt: new Date().toISOString(),
      title: data.title,
      student: studentInfo,
      questionCount: answers.length,
      questions: []
    };
    
    // Keep track of attachments
    const attachments = [];
    let attachmentIndex = 0;
    
    // Process questions and extract images
    let qaIndex = 0;
    for (let i = 0; i < data.questions.length; i++) {
      const item = data.questions[i];
      if (item.type !== 'section') {
        const answer = answers[qaIndex];
        qaIndex++;
        
        const questionData = {
          questionNumber: metadata.questions.length + 1,
          questionText: item.question,  // Full question text
          questionDescription: item.description || '',
          answerText: answer.editor.getText(),  // Full answer text
          attachments: []  // References to image attachments
        };
        
        // Process ALL images in answer HTML (embedded base64 and external URLs)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = answer.editor.root.innerHTML;
        const images = tempDiv.getElementsByTagName('img');

        for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
          const img = images[imgIdx];
          if (img.src) {
            const isEmbedded = img.src.startsWith('data:');
            const attachmentName = `q${questionData.questionNumber}_img_${imgIdx + 1}`;

            questionData.attachments.push({
              type: isEmbedded ? 'embedded' : 'external',
              filename: attachmentName,
              src: isEmbedded ? null : img.src  // Store URL for external images
            });

            // Store image data for later attachment (only for embedded)
            if (isEmbedded) {
              attachments.push({
                name: attachmentName + '.png',
                data: img.src
              });
            }
          }
        }
        
        // Process uploaded image
        if (answer.fileInput && answer.fileInput.files.length > 0) {
          const file = answer.fileInput.files[0];
          const base64 = file.base64 || await toBase64(file);
          const attachmentName = `q${questionData.questionNumber}_uploaded.jpg`;
          
          questionData.attachments.push({
            type: 'uploaded',
            filename: attachmentName
          });
          
          attachments.push({
            name: attachmentName,
            data: base64
          });
        }
        
        metadata.questions.push(questionData);
      }
    }
    
    // Store metadata in PDF properties
    const metadataString = JSON.stringify(metadata);
    
    // Set basic PDF properties
    pdf.setProperties({
      title: data.title || 'Assignment Report',
      subject: 'University of Twente Assignment',
      author: studentInfo.name || 'Student',
      keywords: metadataString,  // Full metadata without images
      creator: 'UT Assignment Formatting Assistant'
    });
    
    // Add images as PDF attachments (if jsPDF supports it)
    try {
      // Note: Standard jsPDF doesn't have built-in attachment support
      // This would work with jsPDF plugins or we'd need to use the internal API
      if (pdf.internal && pdf.internal.events) {
        // Store attachments info in PDF structure
        const attachmentsInfo = {
          type: 'assignment_attachments',
          count: attachments.length,
          files: attachments.map(att => ({ name: att.name, size: att.data.length }))
        };
        
        // Add as annotation on first page
        pdf.setPage(1);
        pdf.setFontSize(1);
        pdf.setTextColor(255, 255, 255);
        pdf.text(JSON.stringify(attachmentsInfo), 0, 0);
      }
    } catch (e) {
      console.error('Error adding attachments info:', e);
    }
    
    // Save the PDF
    const filename = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${studentInfo.snumber || 'submission'}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    
    // Clean up
    document.body.removeChild(loadingDiv);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Failed to generate PDF: ' + error.message);
    if (document.body.contains(loadingDiv)) {
      document.body.removeChild(loadingDiv);
    }
  }
}

// Modal Functions
function showPreview(markdown) {
  const modal = document.getElementById('preview-modal');
  const body = document.getElementById('preview-body');
  
  const html = marked.parse(markdown);
  body.innerHTML = html;
  
  modal.classList.add('active');
}

function closePreview() {
  const modal = document.getElementById('preview-modal');
  modal.classList.remove('active');
}

// Image Resize Modal
let currentResizingImage = null;
let currentQuillInstance = null;

function showImageResizeModal(img, quillInstance) {
  currentResizingImage = img;
  currentQuillInstance = quillInstance;
  
  // Create modal if it doesn't exist
  let modal = document.getElementById('image-resize-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-resize-modal';
    modal.className = 'table-modal';
    modal.innerHTML = `
      <h3>Resize Image</h3>
      <div class="form-group">
        <label class="form-label">Width (px)</label>
        <input type="number" id="image-width" min="50" max="800" value="${img.width || 400}">
      </div>
      <div class="form-group">
        <label class="form-label">Height (px)</label>
        <input type="number" id="image-height" min="50" max="800" value="${img.height || 300}">
      </div>
      <div class="checkbox-wrapper">
        <input type="checkbox" id="maintain-aspect-ratio" checked>
        <label for="maintain-aspect-ratio">Maintain aspect ratio</label>
      </div>
      <div class="button-group" style="margin-top: 1rem;">
        <button class="btn btn-primary" onclick="applyImageResize()">Apply</button>
        <button class="btn btn-secondary" onclick="closeImageResizeModal()">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  // Set current dimensions
  document.getElementById('image-width').value = img.width || img.naturalWidth || 400;
  document.getElementById('image-height').value = img.height || img.naturalHeight || 300;
  
  // Show modal
  document.getElementById('modal-overlay').classList.add('active');
  modal.classList.add('active');
  
  // Add aspect ratio handler
  const widthInput = document.getElementById('image-width');
  const heightInput = document.getElementById('image-height');
  const aspectCheckbox = document.getElementById('maintain-aspect-ratio');
  const aspectRatio = img.naturalWidth / img.naturalHeight;
  
  widthInput.oninput = () => {
    if (aspectCheckbox.checked) {
      heightInput.value = Math.round(widthInput.value / aspectRatio);
    }
  };
  
  heightInput.oninput = () => {
    if (aspectCheckbox.checked) {
      widthInput.value = Math.round(heightInput.value * aspectRatio);
    }
  };
}

function closeImageResizeModal() {
  const modal = document.getElementById('image-resize-modal');
  if (modal) {
    modal.classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
  }
  currentResizingImage = null;
  currentQuillInstance = null;
}

function applyImageResize() {
  if (currentResizingImage) {
    const width = document.getElementById('image-width').value;
    const height = document.getElementById('image-height').value;
    
    currentResizingImage.style.width = width + 'px';
    currentResizingImage.style.height = height + 'px';
    currentResizingImage.setAttribute('width', width);
    currentResizingImage.setAttribute('height', height);
    
    // Trigger Quill to recognize the change
    if (currentQuillInstance) {
      currentQuillInstance.update();
    }
  }
  
  closeImageResizeModal();
}

function applyImageResize() {
  if (currentResizingImage) {
    const width = document.getElementById('image-width').value;
    const height = document.getElementById('image-height').value;
    
    currentResizingImage.style.width = width + 'px';
    currentResizingImage.style.height = height + 'px';
    currentResizingImage.width = width;
    currentResizingImage.height = height;
    
    // Trigger Quill update
    if (currentQuillInstance) {
      currentQuillInstance.update();
    }
  }
  closeImageResizeModal();
}

// Helper Functions
function toBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

function copyToClipboard(btn, text) {
  // Try modern clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showCopySuccess(btn);
    }).catch(() => {
      // Fallback to legacy method
      fallbackCopyToClipboard(btn, text);
    });
  } else {
    // Use fallback method
    fallbackCopyToClipboard(btn, text);
  }
}

function fallbackCopyToClipboard(btn, text) {
  // Create temporary textarea
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  
  try {
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    if (successful) {
      showCopySuccess(btn);
    } else {
      showCopyError(btn);
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showCopyError(btn);
  } finally {
    document.body.removeChild(textArea);
  }
}

function showCopySuccess(btn) {
  const originalText = btn.innerHTML;
  btn.innerHTML = createIcon('check') + "Copied!";
  btn.classList.add('copied');
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.classList.remove('copied');
  }, 2000);
}

function showCopyError(btn) {
  const originalText = btn.innerHTML;
  btn.innerHTML = createIcon('error') + "Copy Failed";
  btn.style.backgroundColor = '#dc3545';
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.style.backgroundColor = '';
  }, 2000);
  
  // Show manual copy instructions
  alert('Copy failed. Please manually select and copy the link from the text area above.');
}

// Import/Export Functions
function downloadFormAsJSON() {
  const formData = collectFormData();
  if (!formData) return;
  
  const json = JSON.stringify(formData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_form.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadFormAsYAML() {
  const formData = collectFormData();
  if (!formData) return;
  
  // Convert to YAML format
  const yamlContent = convertToYAML(formData);
  const blob = new Blob([yamlContent], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_form.yaml`;
  link.click();
  URL.revokeObjectURL(url);
}

function convertToYAML(obj, indent = 0) {
  let yaml = '';
  const spaces = ' '.repeat(indent);
  
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (typeof item === 'object') {
        yaml += `${spaces}-\n`;
        yaml += convertToYAML(item, indent + 2).split('\n').map(line => 
          line ? `${spaces}  ${line}` : ''
        ).join('\n').trimEnd() + '\n';
      } else {
        yaml += `${spaces}- ${item}\n`;
      }
    });
  } else {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue; // Skip null values for cleaner output
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else if (typeof value === 'string') {
        // Handle HTML content, multiline strings, or strings with special characters
        if (value.includes('\n') || value.includes('<') || value.includes('"') || value.includes("'") || value.includes(':')) {
          yaml += `${spaces}${key}: |\n`;
          value.split('\n').forEach(line => {
            yaml += `${spaces}  ${line}\n`;
          });
        } else if (value === '') {
          yaml += `${spaces}${key}: ""\n`;
        } else {
          // Simple string - add quotes for safety with special characters
          yaml += `${spaces}${key}: "${value.replace(/"/g, '\\"')}"\n`;
        }
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          yaml += `${spaces}${key}:\n`;
          value.forEach(item => {
            if (typeof item === 'object') {
              yaml += `${spaces}  -\n`;
              yaml += convertToYAML(item, indent + 4).split('\n').map(line => 
                line ? `${spaces}    ${line}` : ''
              ).join('\n').trimEnd() + '\n';
            } else {
              yaml += `${spaces}  - ${item}\n`;
            }
          });
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += convertToYAML(value, indent + 2);
      }
    }
  }
  
  return yaml;
}

function collectFormData() {
  const container = document.getElementById('questions-container');
  if (!container) {
    alert("No questions container found. Please make sure you're in builder mode.");
    return null;
  }
  
  const orderedQuestions = [...container.querySelectorAll('.question-card, .section-card')].map(block => {
    const q = questions.find(q => q.block === block);
    if (!q) {
      console.error('Question data not found for block:', block);
      return null;
    }
    
    if (q.type === 'section') {
      return {
        type: 'section',
        title: q.input.value.trim(),
        description: q.description.root ? q.description.root.innerHTML : ''
      };
    } else {
      return {
        type: 'question',
        question: q.input.value.trim(),
        description: q.description.root ? q.description.root.innerHTML : '',
        allowImage: q.imgCheck.checked,
        wordLimit: q.wordLimit.value ? parseInt(q.wordLimit.value) : null
      };
    }
  }).filter(item => item && (item.type === 'section' ? item.title.length > 0 : item.question.length > 0));

  const hasQuestions = orderedQuestions.some(item => item.type === 'question');
  if (!hasQuestions) {
    alert("Please add at least one question before saving.");
    return null;
  }

  return {
    title: document.getElementById('assignment-title')?.value.trim() || 'Untitled Assignment',
    instructions: document.getElementById('assignment-instructions')?.value.trim() || '',
    studentFields: {
      name: document.getElementById('field-name')?.checked || false,
      snumber: document.getElementById('field-snumber')?.checked || false,
      group: document.getElementById('field-group')?.checked || false
    },
    questions: orderedQuestions
  };
}

function importFormFromJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      loadFormData(data);
    } catch (error) {
      alert('Invalid JSON file. Please check the file format.');
    }
  };
  reader.readAsText(file);
}

function loadFormData(data) {
  // Set basic form fields
  document.getElementById('assignment-title').value = data.title || '';
  document.getElementById('assignment-instructions').value = data.instructions || '';
  
  // Set student fields
  document.getElementById('field-name').checked = data.studentFields.name;
  document.getElementById('field-snumber').checked = data.studentFields.snumber;
  document.getElementById('field-group').checked = data.studentFields.group;
  
  // Clear existing questions
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  questions.length = 0;
  
  // Add questions and sections
  data.questions.forEach(item => {
    const block = createQuestionBlock(item.type === 'section');
    container.appendChild(block);
    
    const q = questions[questions.length - 1];
    q.input.value = item.type === 'section' ? item.title : item.question;
    
    // Fix: Properly set Quill editor content instead of trying to set .value
    if (item.description && item.description.trim() !== '') {
      q.description.root.innerHTML = item.description;
      
      // Restore click handlers for images in the imported content
      setTimeout(() => {
        const images = q.description.root.querySelectorAll('img');
        images.forEach(img => {
          img.style.cursor = 'pointer';
          img.onclick = () => showImageResizeModal(img, q.description);
        });
      }, 100);
      
      // Trigger Quill to update its internal state
      q.description.update();
    } else {
      q.description.setText(''); // Clear the editor if no description
    }
    
    if (item.type === 'question') {
      q.imgCheck.checked = item.allowImage || false;
      if (item.wordLimit) {
        q.wordLimit.value = item.wordLimit;
      }
    }
  });
  
  updateQuestionNumbers();
  checkEmptyState();
}

// Add global functions for onclick handlers
window.insertTable = insertTable;
window.closeTableModal = closeTableModal;
window.closePreview = closePreview;
window.showImageResizeModal = showImageResizeModal;
window.closeImageResizeModal = closeImageResizeModal;
window.applyImageResize = applyImageResize;
window.copyToClipboard = copyToClipboard;

// Entry point
document.addEventListener('DOMContentLoaded', () => {
    showModeIndicator();

    if (isBuilder) {
      createBuilder();
    } else if (exerciseData) {
      console.log('Processing exercise data from URL...');
      const data = decodeFormData(exerciseData);
      console.log('Decoded data:', data ? 'success' : 'failed');
      
      if (data && data.questions && Array.isArray(data.questions)) {
        createFiller(data);
      } else {
        console.error('Invalid assignment data structure:', data);
        const errorDetails = !data ? 'Failed to decode URL data' : 
                           !data.questions ? 'No questions found in assignment' :
                           'Questions data is not in expected format';
        
        document.getElementById("app").innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${createIcon('error')}</div>
            <h2>Invalid Assignment Link</h2>
            <p style="color: var(--error);">The assignment link appears to be invalid or corrupted.</p>
            <p style="color: var(--text-muted); font-size: 0.875rem;">Error: ${errorDetails}</p>
            <div style="margin-top: 1rem;">
              <a href="?" class="btn btn-secondary" style="margin-right: 1rem;">Go to Home</a>
              <a href="?builder=true" class="btn btn-primary hover-lift">${createIcon('builder')} Create New Assignment</a>
            </div>
          </div>
        `;
      }
    } else {
      document.getElementById("app").innerHTML = `
        <div class="empty-state">
          <div class="university-logo">
            <div class="logo-icon">UT</div>
            <div class="logo-text">
              <div class="logo-main">University of Twente</div>
              <div class="logo-sub">Assignment Formatting Assistant</div>
            </div>
          </div>
          <h2 class="animate-text">Welcome to Assignment Formatting Assistant</h2>
          <p>Create and manage student assignments formatting using this simple interface</p>
          <a href="?builder=true" class="btn btn-primary hover-lift" style="margin-top: 2rem;">
            ${createIcon('builder')} Create New Assignment
          </a>
        </div>
      `;
    }

    // Close modals on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePreview();
        closeTableModal();
      }
    });

    // Close preview on background click
    document.getElementById('preview-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        closePreview();
      }
    });

    document.getElementById('modal-overlay').addEventListener('click', closeTableModal);
});