// Alpine.js component for authentication page
function authPage() {
  return {
    // State variables
    activeTab: 'login',
    loading: false,
    status: null,
    showForgotPassword: false,

    // Form data
    loginForm: {
      email: '',
      password: ''
    },
    signupForm: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    resetForm: {
      email: ''
    },

    // Initialize the component
    async init() {
      // Check if user is already logged in
      const session = await authHelpers.getCurrentSession();
      if (session) {
        // Redirect to main editor if already logged in
        window.location.href = './frontend/index.html';
      }

      // Listen for auth state changes
      authHelpers.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          this.showStatus('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = './frontend/index.html';
          }, 1500);
        }
      });

      // Check for URL parameters (e.g., from email verification)
      this.handleUrlParams();
    },

    // Handle URL parameters
    handleUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const message = urlParams.get('message');

      if (error) {
        this.showStatus(decodeURIComponent(error), 'error');
      } else if (message) {
        this.showStatus(decodeURIComponent(message), 'success');
      }
    },

    // Login function
    async login() {
      if (!this.loginForm.email || !this.loginForm.password) {
        this.showStatus('Please fill in all fields.', 'error');
        return;
      }

      this.loading = true;
      this.status = null;

      try {
        const { user, session } = await authHelpers.signIn(
          this.loginForm.email,
          this.loginForm.password
        );

        if (user) {
          this.showStatus('Login successful! Redirecting...', 'success');
          
          // Clear form
          this.loginForm = { email: '', password: '' };
          
          // Redirect after short delay
          setTimeout(() => {
            window.location.href = './frontend/index.html';
          }, 1500);
        }
      } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment and try again.';
        }
        
        this.showStatus(errorMessage, 'error');
      } finally {
        this.loading = false;
      }
    },

    // Signup function
    async signup() {
      if (!this.signupForm.email || !this.signupForm.password || !this.signupForm.confirmPassword) {
        this.showStatus('Please fill in all fields.', 'error');
        return;
      }

      if (this.signupForm.password !== this.signupForm.confirmPassword) {
        this.showStatus('Passwords do not match.', 'error');
        return;
      }

      if (this.signupForm.password.length < 6) {
        this.showStatus('Password must be at least 6 characters long.', 'error');
        return;
      }

      this.loading = true;
      this.status = null;

      try {
        const { user, session } = await authHelpers.signUp(
          this.signupForm.email,
          this.signupForm.password
        );

        if (user) {
          if (user.email_confirmed_at) {
            // User is immediately confirmed (might happen in development)
            this.showStatus('Account created successfully! Redirecting...', 'success');
            setTimeout(() => {
              window.location.href = './frontend/index.html';
            }, 1500);
          } else {
            // User needs to confirm email
            this.showStatus(
              'Account created! Please check your email and click the confirmation link to complete your registration.',
              'success'
            );
            
            // Switch to login tab
            this.activeTab = 'login';
            this.loginForm.email = this.signupForm.email;
          }
          
          // Clear form
          this.signupForm = { email: '', password: '', confirmPassword: '' };
        }
      } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Signup failed. Please try again.';
        
        if (error.message.includes('already registered')) {
          errorMessage = 'An account with this email already exists. Please log in instead.';
          this.activeTab = 'login';
          this.loginForm.email = this.signupForm.email;
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
        
        this.showStatus(errorMessage, 'error');
      } finally {
        this.loading = false;
      }
    },

    // Reset password function
    async resetPassword() {
      if (!this.resetForm.email) {
        this.showStatus('Please enter your email address.', 'error');
        return;
      }

      this.loading = true;
      this.status = null;

      try {
        await authHelpers.resetPassword(this.resetForm.email);
        
        this.showStatus(
          'Password reset email sent! Please check your inbox and follow the instructions.',
          'success'
        );
        
        // Close modal and clear form
        this.showForgotPassword = false;
        this.resetForm.email = '';
      } catch (error) {
        console.error('Reset password error:', error);
        let errorMessage = 'Failed to send reset email. Please try again.';
        
        if (error.message.includes('not found')) {
          errorMessage = 'No account found with this email address.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Too many reset attempts. Please wait a moment and try again.';
        }
        
        this.showStatus(errorMessage, 'error');
      } finally {
        this.loading = false;
      }
    },

    // Show status message
    showStatus(message, type = 'info') {
      this.status = { message, type };
      
      // Auto-hide after 7 seconds for success messages, 10 seconds for errors
      const hideAfter = type === 'error' ? 10000 : 7000;
      setTimeout(() => {
        this.status = null;
      }, hideAfter);
    },

    // Switch between login and signup tabs
    switchTab(tab) {
      this.activeTab = tab;
      this.status = null;
      
      // Clear forms when switching
      if (tab === 'login') {
        this.signupForm = { email: '', password: '', confirmPassword: '' };
      } else {
        this.loginForm = { email: '', password: '' };
      }
    }
  };
}
