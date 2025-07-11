// API configuration
const API_BASE_URL = 'http://localhost:8000';

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

    // Debounced auto-save function
    debouncedAutoSave: null,

    // Initialize the component
    async init() {
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
        const response = await fetch(`${API_BASE_URL}/compile/pdf`, {
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
