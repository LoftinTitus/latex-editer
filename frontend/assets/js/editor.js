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
    documents: [],
    currentDocumentId: null,

    // Debounced auto-save function
    debouncedAutoSave: null,

    // Initialize the component
    async init() {
      // Check for existing session
      await this.checkAuth();
      
      // Load user documents if logged in
      if (this.user) {
        await this.loadUserDocuments();
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
          this.loadUserDocuments();
        } else if (event === 'SIGNED_OUT') {
          this.user = null;
          this.documents = [];
          this.currentDocumentId = null;
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

      this.compiling = true;
      this.status = null;

      try {
        const response = await fetch('/api/compile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latex_content: this.latexContent,
            user_id: this.user?.id || null
          })
        });

        const result = await response.json();

        if (response.ok) {
          // Create blob URL for PDF
          const pdfBlob = new Blob([new Uint8Array(result.pdf_data)], { type: 'application/pdf' });
          this.pdfUrl = URL.createObjectURL(pdfBlob);
          
          this.showStatus('LaTeX compiled successfully!', 'success');
        } else {
          throw new Error(result.error || 'Compilation failed');
        }
      } catch (error) {
        console.error('Compilation error:', error);
        this.showStatus(`Compilation failed: ${error.message}`, 'error');
      } finally {
        this.compiling = false;
      }
    },

    // Clear the editor
    clearEditor() {
      if (this.latexContent.trim() && !confirm('Are you sure you want to clear the editor?')) {
        return;
      }
      
      this.latexContent = '';
      this.pdfUrl = null;
      this.currentDocumentId = null;
      this.status = null;
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

    // Save document for logged-in users
    async saveDocument() {
      if (!this.user) {
        this.showStatus('Please log in to save documents.', 'error');
        return;
      }

      if (!this.latexContent.trim()) {
        this.showStatus('Nothing to save. Please enter some content first.', 'error');
        return;
      }

      this.saving = true;

      try {
        const title = utils.generateTitle(this.latexContent);

        if (this.currentDocumentId) {
          // Update existing document
          await dbHelpers.updateDocument(this.currentDocumentId, title, this.latexContent);
          this.showStatus('Document updated successfully!', 'success');
        } else {
          // Create new document
          const newDoc = await dbHelpers.saveDocument(title, this.latexContent, this.user.id);
          this.currentDocumentId = newDoc.id;
          this.showStatus('Document saved successfully!', 'success');
        }

        // Refresh documents list
        await this.loadUserDocuments();
      } catch (error) {
        console.error('Save error:', error);
        this.showStatus(`Failed to save document: ${error.message}`, 'error');
      } finally {
        this.saving = false;
      }
    },

    // Auto-save function
    async autoSave() {
      if (!this.user || !this.latexContent.trim()) return;

      try {
        const title = utils.generateTitle(this.latexContent);

        if (this.currentDocumentId) {
          await dbHelpers.updateDocument(this.currentDocumentId, title, this.latexContent);
        } else {
          const newDoc = await dbHelpers.saveDocument(title, this.latexContent, this.user.id);
          this.currentDocumentId = newDoc.id;
          await this.loadUserDocuments();
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    },

    // Load user's documents
    async loadUserDocuments() {
      if (!this.user) return;

      try {
        this.documents = await dbHelpers.getUserDocuments(this.user.id);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    },

    // Load a specific document
    async loadDocument(document) {
      this.latexContent = document.content;
      this.currentDocumentId = document.id;
      this.pdfUrl = null; // Clear previous PDF
      this.showStatus(`Loaded document: ${document.title}`, 'success');
    },

    // Delete a document
    async deleteDocument(documentId) {
      if (!confirm('Are you sure you want to delete this document?')) {
        return;
      }

      try {
        await dbHelpers.deleteDocument(documentId);
        
        // Clear editor if current document was deleted
        if (this.currentDocumentId === documentId) {
          this.clearEditor();
        }
        
        // Refresh documents list
        await this.loadUserDocuments();
        this.showStatus('Document deleted successfully.', 'success');
      } catch (error) {
        console.error('Delete error:', error);
        this.showStatus(`Failed to delete document: ${error.message}`, 'error');
      }
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
