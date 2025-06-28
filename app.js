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
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeFormData(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
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
function createQuillEditor(container, placeholder = "Type your answer here...") {
  const editorDiv = document.createElement('div');
  editorDiv.className = 'quill-editor';
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
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();
            
            input.onchange = async () => {
              const file = input.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const range = this.quill.getSelection();
                  this.quill.insertEmbed(range.index, 'image', e.target.result);
                  
                  // Add click handler for resizing
                  setTimeout(() => {
                    const images = this.quill.root.querySelectorAll('img');
                    images.forEach(img => {
                      img.style.cursor = 'pointer';
                      img.onclick = () => showImageResizeModal(img, this.quill);
                    });
                  }, 100);
                };
                reader.readAsDataURL(file);
              }
            };
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
    draggedElement = null;
  });

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
    deleteBtn.onclick = () => {
      if (confirm(`Are you sure you want to delete this ${isSection ? 'section' : 'question'}?`)) {
        const idx = questions.findIndex(q => q.block === block);
        if (idx > -1) {
          questions.splice(idx, 1);
          block.remove();
          updateQuestionNumbers();
          checkEmptyState();
        }
      }
    };

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

    // Add description textarea with Markdown support
    const descriptionLabel = document.createElement("label");
    descriptionLabel.className = "form-label";
    descriptionLabel.textContent = "Description (supports Markdown)";
    descriptionLabel.style.marginTop = "1rem";
    descriptionLabel.style.fontSize = "0.75rem";

    const descriptionTextarea = document.createElement("textarea");
    descriptionTextarea.placeholder = isSection ? "Section description (optional)... You can use **bold**, *italic*, [links](url), etc." : "Question description or additional instructions (optional)... Supports Markdown formatting.";
    descriptionTextarea.rows = 2;
    descriptionTextarea.style.marginTop = "0.25rem";
    descriptionTextarea.style.resize = "vertical";
    descriptionTextarea.className = "form-input";
    
    // Prevent drag on textarea
    descriptionTextarea.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    descriptionTextarea.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "question-content";
    contentWrapper.appendChild(qInput);
    contentWrapper.appendChild(descriptionLabel);
    contentWrapper.appendChild(descriptionTextarea);
    
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
        description: descriptionTextarea, 
        imgCheck: hasImage, 
        wordLimit: wordLimitInput,
        type: 'question' 
      });
    } else {
      questions.push({ block, input: qInput, description: descriptionTextarea, type: 'section' });
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
  generateBtn.onclick = () => {
    const orderedQuestions = [...container.querySelectorAll('.question-card, .section-card')].map(block => {
      const q = questions.find(q => q.block === block);
      if (q.type === 'section') {
        return {
          type: 'section',
          title: q.input.value.trim(),
          description: q.description.value.trim()
        };
      } else {
        return {
          type: 'question',
          question: q.input.value.trim(),
          description: q.description.value.trim(),
          allowImage: q.imgCheck.checked,
          wordLimit: q.wordLimit.value ? parseInt(q.wordLimit.value) : null
        };
      }
    }).filter(item => (item.type === 'section' ? item.title.length > 0 : item.question.length > 0));

    const hasQuestions = orderedQuestions.some(item => item.type === 'question');
    if (!hasQuestions) {
      alert("Please add at least one question with text.");
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
      questions: orderedQuestions
    };

    const encoded = encodeFormData(assignmentData);
    const link = `${window.location.origin}${window.location.pathname}?exercise=${encoded}`;

    const shareSection = document.createElement("div");
    shareSection.className = "share-section";
    shareSection.innerHTML = `
      <h3>${createIcon('check')} Assignment Created Successfully!</h3>
      <p>Share this link with your students:</p>
      <div class="share-link">
        <textarea readonly>${link}</textarea>
        <button class="copy-btn" onclick="copyToClipboard(this, '${link}')">Copy Link</button>
      </div>
    `;
    
    const existingShare = document.querySelector('.share-section');
    if (existingShare) existingShare.remove();
    
    const mainArea = document.querySelector('.main-area') || app;
    mainArea.appendChild(shareSection);
    
    // Animate share section
    shareSection.classList.add('fade-in');
    shareSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      
      if (item.description) {
        const sectionDesc = document.createElement("p");
        sectionDesc.innerHTML = marked.parse(item.description);
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
      
      if (item.description) {
        const descDiv = document.createElement("div");
        descDiv.style.marginBottom = "1rem";
        descDiv.style.padding = "0.75rem";
        descDiv.style.background = "var(--ut-gray-50)";
        descDiv.style.borderRadius = "var(--radius)";
        descDiv.style.color = "var(--ut-gray-600)";
        descDiv.style.fontSize = "0.875rem";
        descDiv.innerHTML = marked.parse(item.description);
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
  const pdfContent = document.getElementById('pdf-content');
  
  let htmlContent = `
    <style>
      body { 
        font-family: 'Times New Roman', Times, serif; 
        line-height: 1.5; 
        color: #171717; 
        font-size: 12pt;
      }
      .report-header { 
        text-align: center; 
        margin-bottom: 40px; 
        border-bottom: 2px solid #002c5f; 
        padding-bottom: 20px;
      }
      .report-header h1 { 
        color: #002c5f; 
        font-size: 24pt; 
        margin: 0 0 10px 0; 
        font-family: Arial, sans-serif;
      }
      .report-header h2 {
        color: #cf0072;
        font-size: 18pt;
        margin: 0;
        font-family: Arial, sans-serif;
        font-weight: normal;
      }
      .student-info { 
        margin-bottom: 40px; 
        padding: 15px;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        background: #fafafa;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 20px;
      }
      .student-info p { 
        margin: 0; 
        font-size: 11pt;
      }
      .instructions {
        background: #f0f7ff; 
        padding: 15px; 
        border-left: 3px solid #0094b3; 
        margin-bottom: 30px; 
        font-style: italic;
        color: #404040;
      }
      .section-wrapper {
        page-break-inside: avoid;
      }
      .question-block { 
        margin-bottom: 25px; 
        page-break-inside: avoid;
        page-break-after: auto;
      }
      .section-header {
        page-break-after: avoid;
        margin-bottom: 20px;
      }
      .question-title { 
        font-size: 14pt; 
        font-weight: bold; 
        color: #4f2d7f; 
        margin-bottom: 15px; 
      }
      .answer-content { 
        margin-left: 0;
      }
      .answer-content img { 
        max-width: 100%; 
        height: auto; 
        margin: 15px 0; 
        border-radius: 6px; 
        border: 1px solid #e5e5e5;
        display: block;
      }
      hr {
        border: 0;
        border-top: 1px solid #d4d4d4;
        margin: 40px 0;
      }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
      th { background: #f5f0ff; }
      blockquote { border-left: 3px solid #cf0072; padding-left: 15px; margin-left: 0; color: #525252; font-style: italic; }
      pre { background: #f5f5f5; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 10pt; }
      .no-answer { color: #737373; font-style: italic; }
    </style>
    
    <div class="report-header">
      <h1>University of Twente</h1>
      <h2>${data.title || 'Assignment Report'}</h2>
    </div>
    
    <div class="student-info">
  `;

  if (studentInfo.name) htmlContent += `<p><strong>Student Name:</strong> ${studentInfo.name}</p>`;
  if (studentInfo.snumber) htmlContent += `<p><strong>S-Number:</strong> ${studentInfo.snumber}</p>`;
  if (studentInfo.group) htmlContent += `<p><strong>Group:</strong> ${studentInfo.group}</p>`;
  htmlContent += `<p><strong>Submission Date:</strong> ${studentInfo.date}</p>`;
  htmlContent += `</div>`;

  if (data.instructions) {
    htmlContent += `<div class="instructions">${data.instructions}</div>`;
  }

  let answerIndex = 0;
  let questionNumber = 0;
  let currentSectionContent = '';
  let inSection = false;
  
  for (let i = 0; i < data.questions.length; i++) {
    const item = data.questions[i];
    const nextItem = data.questions[i + 1];
    
    if (item.type === 'section') {
      // Close previous section if exists
      if (inSection && currentSectionContent) {
        htmlContent += `</div>` + currentSectionContent;
        currentSectionContent = '';
      }
      
      // Start new section
      htmlContent += `
        <div class="section-wrapper" style="page-break-inside: avoid;">
          <hr>
          <div class="section-header">
            <h2 style="color: #002c5f; font-family: Arial, sans-serif; font-size: 18pt; border-bottom: 1px solid #a3a3a3; padding-bottom: 8px;">${item.title}</h2>
            ${item.description ? `<p style="color: #525252; margin-top: 10px; font-style: italic;">${item.description}</p>` : ''}
          </div>
      `;
      inSection = true;
    } else {
      questionNumber++;
      const ans = answers[answerIndex];
      answerIndex++;
      
      htmlContent += `
        <div class="question-block">
          <h3 class="question-title">Question ${questionNumber}: ${ans.question}</h3>
          ${item.description ? `<p style="margin: -10px 0 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; color: #525252; font-size: 10pt;">${item.description}</p>` : ''}
          <div class="answer-content">
      `;
      
      const answerHtml = ans.editor.root.innerHTML;
      if (answerHtml && answerHtml !== '<p><br></p>') {
        htmlContent += answerHtml;
      } else {
        htmlContent += '<p class="no-answer">(No answer provided)</p>';
      }
      
      if (ans.fileInput && ans.fileInput.files.length > 0) {
        const file = ans.fileInput.files[0];
        // Use cached base64 if available
        const base64 = file.base64 || await toBase64(file);
        htmlContent += `<p style="margin-top: 15px;"><strong>Attached Image:</strong></p><img src="${base64}" style="max-width: 500px;" />`;
      }
      
      currentSectionContent += `</div></div>`;
      
      // If this is the last question in a section or the last question overall
      if (!nextItem || (nextItem && nextItem.type === 'section')) {
        if (inSection) {
          htmlContent += currentSectionContent + `</div>`;
          currentSectionContent = '';
          inSection = false;
        } else {
          htmlContent += currentSectionContent;
          currentSectionContent = '';
        }
      }
    }
  }
  
  // Close any remaining section
  if (inSection && currentSectionContent) {
    htmlContent += currentSectionContent + `</div>`;
  }

  pdfContent.innerHTML = htmlContent;

  const canvas = await html2canvas(pdfContent, {
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true
  });

  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  // Add page numbers
  const pageCount = pdf.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(`Page ${i} of ${pageCount}`, pdf.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
  }

  const filename = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${studentInfo.snumber || 'submission'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);

  pdfContent.innerHTML = '';
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
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btn.innerHTML;
    btn.innerHTML = createIcon('check') + "Copied!";
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('copied');
    }, 2000);
  });
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
        // Handle multiline strings
        if (value.includes('\n')) {
          yaml += `${spaces}${key}: |\n`;
          value.split('\n').forEach(line => {
            yaml += `${spaces}  ${line}\n`;
          });
        } else {
          // Simple string - no quotes needed for clean output
          yaml += `${spaces}${key}: ${value}\n`;
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
  const orderedQuestions = [...container.querySelectorAll('.question-card, .section-card')].map(block => {
    const q = questions.find(q => q.block === block);
    if (q.type === 'section') {
      return {
        type: 'section',
        title: q.input.value.trim(),
        description: q.description.value.trim()
      };
    } else {
      return {
        type: 'question',
        question: q.input.value.trim(),
        description: q.description.value.trim(),
        allowImage: q.imgCheck.checked,
        wordLimit: q.wordLimit.value ? parseInt(q.wordLimit.value) : null
      };
    }
  }).filter(item => (item.type === 'section' ? item.title.length > 0 : item.question.length > 0));

  const hasQuestions = orderedQuestions.some(item => item.type === 'question');
  if (!hasQuestions) {
    alert("Please add at least one question before saving.");
    return null;
  }

  return {
    title: document.getElementById('assignment-title').value.trim() || 'Untitled Assignment',
    instructions: document.getElementById('assignment-instructions').value.trim(),
    studentFields: {
      name: document.getElementById('field-name').checked,
      snumber: document.getElementById('field-snumber').checked,
      group: document.getElementById('field-group').checked
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
    q.description.value = item.description || '';
    
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
      const data = decodeFormData(exerciseData);
      if (data && data.questions) {
        createFiller(data);
      } else {
        document.getElementById("app").innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${createIcon('error')}</div>
            <h2>Invalid Assignment Link</h2>
            <p style="color: var(--error);">The assignment link appears to be invalid or corrupted.</p>
            <a href="?builder=true" class="btn btn-primary hover-lift" style="margin-top: 2rem;">${createIcon('builder')} Create New Assignment</a>
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