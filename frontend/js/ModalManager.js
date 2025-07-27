class ModalManager {
  constructor() {
    this.currentModal = null;
    this.initializeModal();
  }

  initializeModal() {
    // Always ensure modal exists when initializing
    this.ensureModalExists();
    
    // Add close event listeners
    this.addEventListeners();
  }

  ensureModalExists() {
    // Remove existing modal if it exists to avoid conflicts
    const existingModal = document.getElementById('modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create fresh modal structure
    this.createModalStructure();
  }

  createModalStructure() {
    const modalHTML = `
      <div id="modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modalTitle">Modal Title</h3>
            <span class="close-modal" id="closeModal">&times;</span>
          </div>
          <div class="modal-body" id="modalBody">
            Modal content goes here
          </div>
          <div class="modal-footer" id="modalFooter" style="display: none;">
            <!-- Dynamic buttons will be added here -->
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  addEventListeners() {
    // Close modal when clicking X
    document.addEventListener('click', (e) => {
      if (e.target.id === 'closeModal') {
        this.close();
      }
    });

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.id === 'modal') {
        this.close();
      }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.close();
      }
    });
  }

  show(title, content, options = {}) {
    // Ensure modal exists before trying to use it
    this.ensureModalExists();
    
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    if (!modal || !modalTitle || !modalBody) {
      console.error('Modal elements not found after creation attempt');
      return false;
    }

    try {
      modalTitle.textContent = title;
      modalBody.innerHTML = content;

      // Handle footer buttons
      if (options.buttons && options.buttons.length > 0) {
        this.createButtons(options.buttons);
        modalFooter.style.display = 'block';
      } else {
        modalFooter.style.display = 'none';
      }

      // Apply custom styles
      if (options.className) {
        modal.className = `modal ${options.className}`;
      }

      // Show modal
      modal.style.display = 'flex';
      this.currentModal = modal;

      // Auto-close if specified
      if (options.autoClose) {
        setTimeout(() => {
          this.close();
        }, options.autoClose);
      }

      return true;
    } catch (error) {
      console.error('Error showing modal:', error);
      return false;
    }
  }

  createButtons(buttons) {
    const modalFooter = document.getElementById('modalFooter');
    if (!modalFooter) return '';
    
    // Clear existing buttons
    modalFooter.innerHTML = '';
    
    // Create and attach buttons with proper event listeners
    buttons.forEach((button, index) => {
      const buttonClass = button.type || 'secondary';
      const btnElement = document.createElement('button');
      
      btnElement.className = `btn btn-${buttonClass}`;
      btnElement.textContent = button.text;
      btnElement.type = 'button';
      
      // Attach click handler
      if (button.onclick) {
        btnElement.addEventListener('click', (e) => {
          e.preventDefault();
          try {
            if (typeof button.onclick === 'function') {
              button.onclick();
            } else if (typeof button.onclick === 'string') {
              eval(button.onclick);
            }
          } catch (error) {
            console.error('Error executing button callback:', error);
          }
        });
      }
      
      modalFooter.appendChild(btnElement);
    });
    
    return ''; // Return empty since we're directly manipulating DOM
  }

  close() {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.style.display = 'none';
      this.currentModal = null;
    }
  }

  // Convenience methods for common modal types
  showSuccess(message, options = {}) {
    return this.show('نجح', `
      <div class="success-message">
        <i class="fas fa-check-circle text-success"></i>
        <p>${message}</p>
      </div>
    `, { ...options, className: 'success-modal', autoClose: options.autoClose || 3000 });
  }

  showError(message, options = {}) {
    return this.show('خطأ', `
      <div class="error-message">
        <i class="fas fa-exclamation-circle text-danger"></i>
        <p>${message}</p>
      </div>
    `, { ...options, className: 'error-modal' });
  }

  showWarning(message, options = {}) {
    return this.show('تحذير', `
      <div class="warning-message">
        <i class="fas fa-exclamation-triangle text-warning"></i>
        <p>${message}</p>
      </div>
    `, { ...options, className: 'warning-modal' });
  }

  showConfirm(message, onConfirm, onCancel = null, options = {}) {
    const buttons = [
      {
        text: 'تأكيد',
        type: 'primary',
        onclick: `modalManager.handleConfirm(${onConfirm})`
      },
      {
        text: 'إلغاء',
        type: 'secondary',
        onclick: `modalManager.handleCancel(${onCancel})`
      }
    ];

    return this.show('تأكيد', `
      <div class="confirm-message">
        <i class="fas fa-question-circle text-info"></i>
        <p>${message}</p>
      </div>
    `, { ...options, buttons, className: 'confirm-modal' });
  }

  showLoading(message = 'جاري التحميل...', options = {}) {
    return this.show('يرجى الانتظار', `
      <div class="loading-message">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `, { ...options, className: 'loading-modal' });
  }

  showForm(title, formHTML, onSubmit, options = {}) {
    const buttons = [
      {
        text: 'حفظ',
        type: 'primary',
        onclick: `modalManager.handleFormSubmit(${onSubmit})`
      },
      {
        text: 'إلغاء',
        type: 'secondary',
        onclick: 'modalManager.close()'
      }
    ];

    return this.show(title, `
      <form id="modalForm" class="modal-form">
        ${formHTML}
      </form>
    `, { ...options, buttons, className: 'form-modal' });
  }

  // Helper methods for button callbacks
  handleConfirm(callback) {
    if (typeof callback === 'function') {
      callback();
    }
    this.close();
  }

  handleCancel(callback) {
    if (typeof callback === 'function') {
      callback();
    }
    this.close();
  }

  handleFormSubmit(callback) {
    const form = document.getElementById('modalForm');
    if (form && typeof callback === 'function') {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      callback(data);
    }
    this.close();
  }

  // Get current modal state
  isOpen() {
    return this.currentModal !== null;
  }

  // Update modal content without closing
  updateContent(content) {
    const modalBody = document.getElementById('modalBody');
    if (modalBody && this.currentModal) {
      modalBody.innerHTML = content;
    }
  }

  // Update modal title without closing
  updateTitle(title) {
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle && this.currentModal) {
      modalTitle.textContent = title;
    }
  }
}

// Create global instance
const modalManager = new ModalManager();

// Legacy compatibility function
function showModal(title, content) {
  return modalManager.show(title, content);
}