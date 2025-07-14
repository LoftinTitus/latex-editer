// API configuration - Define globally
window.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000' 
  : 'https://latex-editor-backend.fly.dev';

// Utility functions
const utils = {
  // Debounce function to limit how often a function is called
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format date for display
  formatDate: (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return dateString;
    }
  }
};

// LaTeX commands for autocomplete
const LATEX_COMMANDS = [
  // Document structure
  '\\documentclass{article}',
  '\\documentclass{book}',
  '\\documentclass{report}',
  '\\documentclass{letter}',
  '\\documentclass{beamer}',
  '\\begin{document}',
  '\\end{document}',
  '\\maketitle',
  '\\tableofcontents',
  
  // Packages
  '\\usepackage{amsmath}',
  '\\usepackage{amsfonts}',
  '\\usepackage{amssymb}',
  '\\usepackage{graphicx}',
  '\\usepackage{hyperref}',
  '\\usepackage{geometry}',
  '\\usepackage{babel}',
  '\\usepackage{inputenc}',
  '\\usepackage{fontenc}',
  
  // Sections
  '\\section{}',
  '\\subsection{}',
  '\\subsubsection{}',
  '\\paragraph{}',
  '\\subparagraph{}',
  '\\chapter{}',
  '\\part{}',
  
  // Environments
  '\\begin{equation}',
  '\\end{equation}',
  '\\begin{align}',
  '\\end{align}',
  '\\begin{itemize}',
  '\\end{itemize}',
  '\\begin{enumerate}',
  '\\end{enumerate}',
  '\\begin{description}',
  '\\end{description}',
  '\\begin{figure}',
  '\\end{figure}',
  '\\begin{table}',
  '\\end{table}',
  '\\begin{center}',
  '\\end{center}',
  '\\begin{flushleft}',
  '\\end{flushleft}',
  '\\begin{flushright}',
  '\\end{flushright}',
  '\\begin{verbatim}',
  '\\end{verbatim}',
  '\\begin{quote}',
  '\\end{quote}',
  '\\begin{quotation}',
  '\\end{quotation}',
  
  // Math environments
  '\\begin{matrix}',
  '\\end{matrix}',
  '\\begin{pmatrix}',
  '\\end{pmatrix}',
  '\\begin{bmatrix}',
  '\\end{bmatrix}',
  '\\begin{vmatrix}',
  '\\end{vmatrix}',
  '\\begin{Vmatrix}',
  '\\end{Vmatrix}',
  '\\begin{cases}',
  '\\end{cases}',
  
  // Text formatting
  '\\textbf{}',
  '\\textit{}',
  '\\underline{}',
  '\\emph{}',
  '\\texttt{}',
  '\\textrm{}',
  '\\textsf{}',
  '\\textsc{}',
  '\\textsl{}',
  '\\tiny',
  '\\scriptsize',
  '\\footnotesize',
  '\\small',
  '\\normalsize',
  '\\large',
  '\\Large',
  '\\LARGE',
  '\\huge',
  '\\Huge',
  
  // Math symbols and commands
  '\\frac{}{}',
  '\\sqrt{}',
  '\\sum',
  '\\prod',
  '\\int',
  '\\lim',
  '\\sin',
  '\\cos',
  '\\tan',
  '\\log',
  '\\ln',
  '\\exp',
  '\\alpha',
  '\\beta',
  '\\gamma',
  '\\delta',
  '\\epsilon',
  '\\theta',
  '\\lambda',
  '\\mu',
  '\\pi',
  '\\sigma',
  '\\phi',
  '\\psi',
  '\\omega',
  '\\Alpha',
  '\\Beta',
  '\\Gamma',
  '\\Delta',
  '\\Theta',
  '\\Lambda',
  '\\Pi',
  '\\Sigma',
  '\\Phi',
  '\\Psi',
  '\\Omega',
  '\\infty',
  '\\partial',
  '\\nabla',
  '\\pm',
  '\\mp',
  '\\times',
  '\\div',
  '\\neq',
  '\\leq',
  '\\geq',
  '\\approx',
  '\\equiv',
  '\\subset',
  '\\supset',
  '\\subseteq',
  '\\supseteq',
  '\\in',
  '\\notin',
  '\\cup',
  '\\cap',
  '\\emptyset',
  '\\exists',
  '\\forall',
  '\\rightarrow',
  '\\leftarrow',
  '\\leftrightarrow',
  '\\Rightarrow',
  '\\Leftarrow',
  '\\Leftrightarrow',
  
  // References and labels
  '\\label{}',
  '\\ref{}',
  '\\cite{}',
  '\\bibliography{}',
  '\\bibliographystyle{}',
  
  // Lists
  '\\item',
  
  // Spacing
  '\\vspace{}',
  '\\hspace{}',
  '\\newpage',
  '\\clearpage',
  '\\linebreak',
  '\\nolinebreak',
  '\\pagebreak',
  '\\nopagebreak',
  '\\\\'
];

// Alpine.js component for the LaTeX editor
function latexEditor() {
  return {
    // State variables
    latexContent: '',
    pdfUrl: null,
    compiling: false,
    saving: false,
    user: null,
    status: null,
    notes: [],
    currentNoteId: null,
    currentNoteTitle: '',
    showNotesModal: false,
    showSaveModal: false,

    // Autocomplete state
    autocomplete: {
      showing: false,
      suggestions: [],
      selectedIndex: -1,
      triggerPos: -1,
      searchTerm: '',
      dropdownPosition: { top: 0, left: 0 }
    },

    // Debounced auto-save function
    debouncedAutoSave: null,

    // Initialize the component
    async init() {
      console.log('Alpine.js component initializing...');
      
      // Check for existing session
      await this.checkAuth();
      
      // Load user notes if logged in
      if (this.user) {
        await this.loadUserNotes();
      }

      // Set up auto-save with debouncing
      this.debouncedAutoSave = utils.debounce(() => {
        if (this.user && this.latexContent.trim()) {
          this.autoSave();
        }
      }, 2000);

      // Set up autocomplete keyboard handling
      document.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));

      // Listen for auth state changes
      authHelpers.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          this.user = session.user;
          this.loadUserNotes();
        } else if (event === 'SIGNED_OUT') {
          this.user = null;
          this.notes = [];
          this.currentNoteId = null;
          this.currentNoteTitle = '';
        }
      });

      // Load example content on first visit
      if (!this.latexContent.trim()) {
        this.loadExample();
      }
    },

    // Autocomplete methods
    onTextareaInput(event) {
      const textarea = event.target;
      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      
      // Auto-save
      this.debouncedAutoSave();
      
      // Use requestAnimationFrame for smoother autocomplete updates
      requestAnimationFrame(() => {
        this.checkAutocomplete(text, cursorPos, textarea);
      });
    },

    checkAutocomplete(text, cursorPos, textarea) {
      // Look backwards from cursor to find backslash
      let backslashPos = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (text[i] === '\\') {
          backslashPos = i;
          break;
        }
        // If we hit whitespace or another command, stop
        if (/\s/.test(text[i]) || text[i] === '}' || text[i] === '{' || text[i] === '$') {
          break;
        }
      }

      if (backslashPos !== -1) {
        const searchTerm = text.substring(backslashPos, cursorPos);
        
        // Only show autocomplete if we have at least backslash + one character
        if (searchTerm.length >= 2) {
          this.showAutocomplete(searchTerm, backslashPos, cursorPos, textarea);
        } else if (searchTerm.length === 1 && searchTerm === '\\') {
          // Show all commands when just backslash is typed
          this.showAutocomplete('\\', backslashPos, cursorPos, textarea);
        } else {
          this.hideAutocomplete();
        }
      } else {
        this.hideAutocomplete();
      }
    },

    showAutocomplete(searchTerm, triggerPos, cursorPos, textarea) {
      // Filter commands based on search term
      const filtered = LATEX_COMMANDS.filter(cmd => 
        cmd.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filtered.length === 0) {
        this.hideAutocomplete();
        return;
      }

      this.autocomplete.suggestions = filtered.slice(0, 10); // Limit to 10 suggestions
      this.autocomplete.triggerPos = triggerPos;
      this.autocomplete.searchTerm = searchTerm;
      this.autocomplete.selectedIndex = -1;
      this.autocomplete.showing = true;

      // Position the dropdown right at the cursor
      this.positionAutocompleteDropdown(textarea, cursorPos);
    },

    hideAutocomplete() {
      this.autocomplete.showing = false;
      this.autocomplete.suggestions = [];
      this.autocomplete.selectedIndex = -1;
    },

    positionAutocompleteDropdown(textarea, cursorPos) {
      // Get textarea position and dimensions
      const rect = textarea.getBoundingClientRect();
      const style = window.getComputedStyle(textarea);
      
      // Create a temporary element to measure text dimensions exactly
      const measurer = document.createElement('div');
      measurer.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: ${style.fontFamily};
        font-size: ${style.fontSize};
        font-weight: ${style.fontWeight};
        line-height: ${style.lineHeight};
        letter-spacing: ${style.letterSpacing};
        padding: ${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft};
        border: ${style.borderWidth} ${style.borderStyle} transparent;
        width: ${textarea.offsetWidth}px;
        height: auto;
        overflow: hidden;
      `;
      
      // Add text up to cursor position
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      measurer.textContent = textBeforeCursor;
      
      // Add measurer to DOM temporarily
      document.body.appendChild(measurer);
      
      // Get the exact position
      const measuredHeight = measurer.offsetHeight;
      const lines = textBeforeCursor.split('\n');
      const lastLine = lines[lines.length - 1];
      
      // Create another measurer for the last line to get width
      const lineMeasurer = document.createElement('span');
      lineMeasurer.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font-family: ${style.fontFamily};
        font-size: ${style.fontSize};
        font-weight: ${style.fontWeight};
        letter-spacing: ${style.letterSpacing};
      `;
      lineMeasurer.textContent = lastLine;
      document.body.appendChild(lineMeasurer);
      
      const lineWidth = lineMeasurer.offsetWidth;
      
      // Clean up
      document.body.removeChild(measurer);
      document.body.removeChild(lineMeasurer);
      
      // Calculate final position - position dropdown right at the cursor
      const lineHeight = parseInt(style.lineHeight) || 20;
      const top = rect.top + measuredHeight + lineHeight + window.scrollY;
      const left = rect.left + lineWidth + parseInt(style.paddingLeft || '0', 10);
      
      this.autocomplete.dropdownPosition = { top, left };
    },

    selectAutocompleteSuggestion(index) {
      if (index >= 0 && index < this.autocomplete.suggestions.length) {
        this.autocomplete.selectedIndex = index;
        this.applyAutocomplete(this.autocomplete.suggestions[index]);
      }
    },

    applyAutocomplete(suggestion) {
      const textarea = this.$refs.latexTextarea;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      
      // Replace the search term with the suggestion
      const beforeTrigger = text.substring(0, this.autocomplete.triggerPos);
      const afterCursor = text.substring(cursorPos);
      
      // For commands with braces, position cursor inside the braces
      let newCursorPos;
      if (suggestion.includes('{}')) {
        // Find the first occurrence of {} and position cursor inside
        const braceIndex = suggestion.indexOf('{}');
        newCursorPos = this.autocomplete.triggerPos + braceIndex + 1;
        this.latexContent = beforeTrigger + suggestion + afterCursor;
      } else {
        newCursorPos = this.autocomplete.triggerPos + suggestion.length;
        this.latexContent = beforeTrigger + suggestion + afterCursor;
      }
      
      this.hideAutocomplete();
      
      // Set cursor position after the update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },

    handleGlobalKeyDown(event) {
      if (!this.autocomplete.showing) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.autocomplete.selectedIndex = Math.min(
            this.autocomplete.selectedIndex + 1,
            this.autocomplete.suggestions.length - 1
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.autocomplete.selectedIndex = Math.max(
            this.autocomplete.selectedIndex - 1,
            -1
          );
          break;
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          if (this.autocomplete.selectedIndex >= 0) {
            this.selectAutocompleteSuggestion(this.autocomplete.selectedIndex);
          } else if (this.autocomplete.suggestions.length > 0) {
            // Select first suggestion if none is selected
            this.selectAutocompleteSuggestion(0);
          }
          break;
        case 'Escape':
          event.preventDefault();
          this.hideAutocomplete();
          break;
      }
    },

    // Check authentication status
    async checkAuth() {
      try {
        const session = await authHelpers.getCurrentSession();
        if (session) {
          this.user = session.user;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    },

    // Compile LaTeX to PDF
    async compile() {
      console.log('Compile function called!');
      
      if (!this.latexContent.trim()) {
        this.showStatus('Please enter some LaTeX content first.', 'error');
        return;
      }

      if (!this.user) {
        this.showStatus('Please log in to compile LaTeX documents.', 'error');
        return;
      }

      this.compiling = true;
      this.status = null;

      try {
        // Get the current session for authentication
        const session = await authHelpers.getCurrentSession();
        if (!session?.access_token) {
          throw new Error('Authentication required. Please log in.');
        }

        // Call the backend compile/pdf endpoint
        const response = await fetch(`${window.API_BASE_URL}/compile/pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            latex_content: this.latexContent
          })
        });

        if (response.ok) {
          // Get the PDF blob from the response
          const pdfBlob = await response.blob();
          
          // Clean up previous PDF URL to prevent memory leaks
          if (this.pdfUrl) {
            URL.revokeObjectURL(this.pdfUrl);
          }
          
          // Create new blob URL for PDF preview
          this.pdfUrl = URL.createObjectURL(pdfBlob);
          
          this.showStatus('LaTeX compiled successfully!', 'success');
        } else {
          // Handle error response
          const errorText = await response.text();
          let errorMessage = 'Compilation failed';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorMessage;
          } catch {
            // If response is not JSON, use the text directly
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('Compilation error:', error);
        this.showStatus(`Compilation failed: ${error.message}`, 'error');
      } finally {
        this.compiling = false;
      }
    },

    // Clear the editor / Create new note
    clearEditor() {
      console.log('Clear editor function called!');
      
      if (this.latexContent.trim() && !confirm('Are you sure you want to clear the editor and start a new note?')) {
        return;
      }
      
      this.latexContent = '';
      this.currentNoteTitle = '';
      
      // Clean up PDF URL to prevent memory leaks
      if (this.pdfUrl) {
        URL.revokeObjectURL(this.pdfUrl);
        this.pdfUrl = null;
      }
      
      this.currentNoteId = null;
      this.status = null;
      
      // Show helpful message for new note
      if (this.user) {
        this.showStatus('Ready to create a new note!', 'success');
      } else {
        this.showStatus('Please log in to save your notes.', 'info');
      }
    },

    // Load example LaTeX content
    loadExample() {
      this.latexContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}

\\title{Welcome to LaTeX Editor}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample LaTeX document. You can edit this content and compile it to PDF.

\\section{Mathematical Expressions}
Here are some examples of mathematical notation:

\\subsection{Inline Math}
The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

\\subsection{Display Math}
\\[
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
\\]

\\subsection{Aligned Equations}
\\begin{align}
f(x) &= x^2 + 2x + 1 \\\\
     &= (x + 1)^2
\\end{align}

\\section{Lists}

\\subsection{Itemized List}
\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item
\\end{itemize}

\\subsection{Numbered List}
\\begin{enumerate}
    \\item First numbered item
    \\item Second numbered item
    \\item Third numbered item
\\end{enumerate}

\\section{Conclusion}
Start editing this content to create your own LaTeX document!

\\end{document}`;

      this.currentDocumentId = null;
      this.showStatus('Example content loaded. Click "Compile PDF" to see the result.', 'success');
    },

    // Save note for logged-in users
    async saveNote() {
      if (!this.user) {
        this.showStatus('Please log in to save notes.', 'error');
        return;
      }

      if (!this.latexContent.trim()) {
        this.showStatus('Nothing to save. Please enter some content first.', 'error');
        return;
      }

      // Show save modal to get title
      this.showSaveModal = true;
    },

    // Confirm save with title
    async confirmSave(title) {
      if (!title?.trim()) {
        this.showStatus('Please enter a title for your note.', 'error');
        return;
      }

      this.saving = true;
      this.showSaveModal = false;

      try {
        if (this.currentNoteId) {
          // Update existing note
          await dbHelpers.updateNote(this.currentNoteId, title, this.latexContent, this.latexContent);
          this.currentNoteTitle = title;
          this.showStatus('Note updated successfully!', 'success');
        } else {
          // Create new note
          const newNote = await dbHelpers.saveNote(title, this.latexContent, this.latexContent);
          this.currentNoteId = newNote.id;
          this.currentNoteTitle = title;
          this.showStatus('Note saved successfully!', 'success');
        }

        // Refresh notes list
        await this.loadUserNotes();
      } catch (error) {
        console.error('Save error:', error);
        this.showStatus(`Failed to save note: ${error.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    // Auto-save function
    async autoSave() {
      if (!this.user || !this.latexContent.trim() || !this.currentNoteId) return;

      try {
        await dbHelpers.updateNote(this.currentNoteId, this.currentNoteTitle, this.latexContent, this.latexContent);
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    },

    // Load user's notes
    async loadUserNotes() {
      if (!this.user) return;

      try {
        this.notes = await dbHelpers.getUserNotes();
      } catch (error) {
        console.error('Failed to load notes:', error);
        this.showStatus('Failed to load notes. Please try again.', 'error');
        this.notes = []; // Ensure notes is always an array
      }
    },

    // Load a specific note
    async loadNote(note) {
      this.latexContent = note.content || note.latex_content || '';
      this.currentNoteId = note.id;
      this.currentNoteTitle = note.title;
      
      // Clean up previous PDF URL to prevent memory leaks
      if (this.pdfUrl) {
        URL.revokeObjectURL(this.pdfUrl);
        this.pdfUrl = null;
      }
      
      this.showStatus(`Loaded note: ${note.title}`, 'success');
    },

    // Delete a note
    async deleteNote(noteId) {
      if (!confirm('Are you sure you want to delete this note?')) {
        return;
      }

      try {
        await dbHelpers.deleteNote(noteId);
        
        // Clear editor if current note was deleted
        if (this.currentNoteId === noteId) {
          this.clearEditor();
        }
        
        // Refresh notes list
        await this.loadUserNotes();
        this.showStatus('Note deleted successfully.', 'success');
      } catch (error) {
        console.error('Delete error:', error);
        this.showStatus(`Failed to delete note: ${error.message}`, 'error');
      }
    },

    // Toggle notes modal
    toggleNotesModal() {
      this.showNotesModal = !this.showNotesModal;
    },

    // Legacy document functions for backward compatibility
    async loadUserDocuments() {
      return await this.loadUserNotes();
    },

    async loadDocument(doc) {
      return await this.loadNote(doc);
    },

    async deleteDocument(docId) {
      return await this.deleteNote(docId);
    },

    async saveDocument() {
      return await this.saveNote();
    },

    // Logout function
    async logout() {
      try {
        await authHelpers.signOut();
        this.showStatus('Logged out successfully.', 'success');
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = './login.html';
        }, 1500);
      } catch (error) {
        console.error('Logout error:', error);
        this.showStatus(`Logout failed: ${error.message}`, 'error');
      }
    },

    // Show status message
    showStatus(message, type = 'info') {
      this.status = { message, type };
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.status = null;
      }, 5000);
    },

    // Format date for display
    formatDate(dateString) {
      return utils.formatDate(dateString);
    }
  };
}
