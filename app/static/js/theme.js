/**
 * Theme Toggle - Dark/Light Mode
 * MedGuardian
 */

class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // Apply saved theme on load
        this.applyTheme(this.theme);

        // Create toggle button if not exists
        this.createToggleButton();
    }

    createToggleButton() {
        // Check if button already exists
        if (document.getElementById('themeToggle')) return;

        const navbar = document.querySelector('.navbar .navbar-nav');
        if (!navbar) return;

        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `
            <button id="themeToggle" class="btn btn-link nav-link" title="Toggle Dark Mode">
                <i class="fas ${this.theme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
            </button>
        `;

        navbar.insertBefore(li, navbar.firstChild);

        document.getElementById('themeToggle').addEventListener('click', () => this.toggle());
    }

    toggle() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.theme);
        localStorage.setItem('theme', this.theme);

        // Update icon
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${this.theme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});
