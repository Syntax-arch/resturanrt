// Utility functions for the restaurant system

class RestaurantUtils {
    // Supabase configuration
    static supabaseConfig = {
        url: 'https://nfcjbjohxzaikelxgmjg.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mY2piam9oeHphaWtlbHhnbWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTgzMjAsImV4cCI6MjA3NjYzNDMyMH0.u0ta1NxSDbJ_9lf1TcMp3M0-_vNNBs6HByOj8wtKsX4'
    };

    // Initialize Supabase client
    static initSupabase() {
        return window.supabase.createClient(this.supabaseConfig.url, this.supabaseConfig.key);
    }

    // Authentication check
    static checkAuth(redirectToLogin = true) {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user && redirectToLogin) {
            window.location.href = 'login.html';
            return null;
        }
        return user;
    }

    // Logout function
    static logout() {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    // Format date for display
    static formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        return new Date(dateString).toLocaleDateString('ja-JP', options);
    }

    // Format time
    static formatTime(timeString) {
        return timeString;
    }

    // Show loading state
    static setLoading(button, isLoading, loadingText = '処理中...') {
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = loadingText;
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText;
            button.disabled = false;
        }
    }

    // Show message
    static showMessage(element, message, type = 'success') {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        element.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }

    // Validate email
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate password strength
    static checkPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        return {
            strength: strength,
            level: strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong'
        };
    }

    // Debounce function for search inputs
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Get user's reservations
    static async getUserReservations(userId) {
        const supabase = this.initSupabase();
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // Create new reservation
    static async createReservation(reservationData) {
        const supabase = this.initSupabase();
        const { data, error } = await supabase
            .from('reservations')
            .insert([reservationData])
            .select();

        if (error) throw error;
        return data;
    }

    // Delete reservation
    static async deleteReservation(reservationId) {
        const supabase = this.initSupabase();
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('id', reservationId);

        if (error) throw error;
        return true;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add fade-in animation to all cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in-up');
    });

    // Add smooth scrolling to all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading states to all forms
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                RestaurantUtils.setLoading(submitBtn, true, '⏳ 送信中...');
            }
        });
    });
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RestaurantUtils;
}