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

// Real-time utility functions
class RealTimeUtils {
    // Subscribe to real-time updates
    static subscribeToReservations(callback) {
        const supabase = RestaurantUtils.initSupabase();
        return supabase
            .channel('reservations')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'reservations' },
                callback
            )
            .subscribe();
    }

    // Get live table availability
    static async getLiveTableAvailability(date, time) {
        const supabase = RestaurantUtils.initSupabase();
        
        // Get all tables
        const { data: allTables, error: tablesError } = await supabase
            .from('restaurant_tables')
            .select('*');
            
        if (tablesError) throw tablesError;

        // Get reservations for the specific date and time
        const { data: reservations, error: resError } = await supabase
            .from('reservations')
            .select('table_number')
            .eq('date', date)
            .eq('time', time)
            .eq('status', 'confirmed');

        if (resError) throw resError;

        // Calculate available tables
        const occupiedTables = new Set(reservations.map(r => r.table_number));
        const availableTables = allTables.filter(table => 
            table.is_available && !occupiedTables.has(table.table_number)
        );

        return {
            all: allTables,
            available: availableTables,
            occupied: allTables.filter(table => occupiedTables.has(table.table_number))
        };
    }

    // Send real-time notification
    static async sendNotification(userId, type, message) {
        const supabase = RestaurantUtils.initSupabase();
        const { error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                type: type,
                message: message
            }]);

        return !error;
    }

    // Get unread notifications count
    static async getUnreadNotificationsCount(userId) {
        const supabase = RestaurantUtils.initSupabase();
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return count;
    }
}

// Add to main RestaurantUtils class
RestaurantUtils.RealTime = RealTimeUtils;

// PWA Utility Functions
class PWAUtils {
    // Register Service Worker
    static async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('🔄 New Service Worker found:', newWorker);
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
                return registration;
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
        return null;
    }

    // Show update notification
    static showUpdateNotification() {
        if (this.showAppUpdateNotification()) {
            const updateToast = document.createElement('div');
            updateToast.className = 'position-fixed bottom-0 end-0 p-3';
            updateToast.style.zIndex = '9999';
            updateToast.innerHTML = `
                <div class="toast show" role="alert">
                    <div class="toast-header">
                        <strong class="me-auto">🔄 更新があります</strong>
                        <button type="button" class="btn-close" onclick="this.closest('.toast').remove()"></button>
                    </div>
                    <div class="toast-body">
                        新しいバージョンが利用可能です。
                        <button class="btn btn-primary btn-sm ms-2" onclick="location.reload()">更新</button>
                    </div>
                </div>
            `;
            document.body.appendChild(updateToast);
        }
    }

    // Check if app is installed
    static isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone ||
               document.referrer.includes('android-app://');
    }

    // Show install prompt
    static async showInstallPrompt() {
        if (!this.isAppInstalled() && this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ User accepted install');
                this.trackEvent('pwa_install_accepted');
            } else {
                console.log('❌ User dismissed install');
                this.trackEvent('pwa_install_dismissed');
            }
            
            this.deferredPrompt = null;
        }
    }

    // Create install button
    static createInstallButton() {
        if (!this.isAppInstalled() && this.isInstallable()) {
            const installBtn = document.createElement('button');
            installBtn.className = 'btn btn-success btn-sm';
            installBtn.innerHTML = '📱 アプリをインストール';
            installBtn.onclick = () => this.showInstallPrompt();
            
            // Add to page
            const nav = document.querySelector('.navbar-nav');
            if (nav) {
                const li = document.createElement('li');
                li.className = 'nav-item';
                li.appendChild(installBtn);
                nav.appendChild(li);
            }
        }
    }

    // Check if PWA is installable
    static isInstallable() {
        return this.deferredPrompt !== null;
    }

    // Track PWA events
    static trackEvent(eventName, data = {}) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, data);
        }
        
        // Send to analytics
        console.log('📊 PWA Event:', eventName, data);
    }

    // Request notification permission
    static async requestNotificationPermission() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                this.trackEvent('notifications_granted');
                return true;
            } else {
                console.log('❌ Notification permission denied');
                this.trackEvent('notifications_denied');
                return false;
            }
        }
        return false;
    }

    // Send local notification
    static showLocalNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                ...options
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            return notification;
        }
    }

    // Check network status
    static getNetworkStatus() {
        return navigator.onLine ? 'online' : 'offline';
    }

    // Add network status listener
    static addNetworkListener(callback) {
        window.addEventListener('online', () => callback('online'));
        window.addEventListener('offline', () => callback('offline'));
    }

    // Get storage usage
    static async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage,
                total: estimate.quota,
                percentage: (estimate.usage / estimate.quota * 100).toFixed(1)
            };
        }
        return null;
    }

    // Clear cache
    static async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('🗑️ Cache cleared');
            return true;
        }
        return false;
    }
}

// Global variable for install prompt
PWAUtils.deferredPrompt = null;

// Add to main RestaurantUtils class
RestaurantUtils.PWA = PWAUtils;
// Reservation Management Functions
let allReservations = [];
let currentReservationsPage = 1;
const reservationsPerPage = 10;

async function loadReservations() {
    try {
        const { data: reservations, error } = await supabase
            .from('reservations')
            .select('*')
            .order('date', { ascending: false })
            .order('time', { ascending: false });
            
        if (error) throw error;
        
        allReservations = reservations || [];
        displayReservations();
        updateReservationsCount();
        
    } catch (error) {
        console.error('Error loading reservations:', error);
        showAlert('予約データの読み込みに失敗しました', 'error');
    }
}

function displayReservations(reservations = allReservations) {
    const tbody = document.getElementById('reservationsTable');
    const startIndex = (currentReservationsPage - 1) * reservationsPerPage;
    const paginatedReservations = reservations.slice(startIndex, startIndex + reservationsPerPage);
    
    tbody.innerHTML = '';
    
    if (paginatedReservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">予約がありません</td></tr>';
        return;
    }
    
    paginatedReservations.forEach(reservation => {
        const row = document.createElement('tr');
        const statusBadge = getStatusBadge(reservation.status);
        
        row.innerHTML = `
            <td><small class="text-muted">${reservation.id.slice(0, 8)}</small></td>
            <td>
                <strong>${reservation.customer_name}</strong>
                ${reservation.customer_email ? `<br><small class="text-muted">${reservation.customer_email}</small>` : ''}
            </td>
            <td>${reservation.date}</td>
            <td>${reservation.time}</td>
            <td>${reservation.guests}名</td>
            <td>${reservation.table_number || '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editReservation('${reservation.id}')">
                    ✏️
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="cancelReservation('${reservation.id}')">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateReservationsPagination(reservations.length);
}

function getStatusBadge(status) {
    const badges = {
        'confirmed': '<span class="badge bg-success">確認済み</span>',
        'pending': '<span class="badge bg-warning">保留中</span>',
        'cancelled': '<span class="badge bg-danger">キャンセル</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">不明</span>';
}

function filterReservations() {
    const dateFilter = document.getElementById('filterDate').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const customerFilter = document.getElementById('filterCustomer').value.toLowerCase();
    
    let filtered = allReservations;
    
    if (dateFilter) {
        filtered = filtered.filter(r => r.date === dateFilter);
    }
    
    if (statusFilter) {
        filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (customerFilter) {
        filtered = filtered.filter(r => 
            r.customer_name.toLowerCase().includes(customerFilter) ||
            (r.customer_email && r.customer_email.toLowerCase().includes(customerFilter))
        );
    }
    
    currentReservationsPage = 1;
    displayReservations(filtered);
    updateReservationsCount(filtered.length);
}

function clearFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterCustomer').value = '';
    currentReservationsPage = 1;
    displayReservations();
    updateReservationsCount();
}

function updateReservationsCount(count = allReservations.length) {
    document.getElementById('reservationsCount').textContent = `${count}件の予約`;
}

function updateReservationsPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / reservationsPerPage);
    const pagination = document.getElementById('reservationsPagination');
    
    pagination.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentReservationsPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changeReservationsPage(${i})">${i}</a>`;
        pagination.appendChild(li);
    }
}

function changeReservationsPage(page) {
    currentReservationsPage = page;
    displayReservations();
}

// Staff Management Functions
async function loadStaff() {
    try {
        const { data: staff, error } = await supabase
            .from('staff')
            .select('*')
            .order('name');
            
        if (error) throw error;
        
        displayStaff(staff || []);
        updateStaffStats(staff || []);
        
    } catch (error) {
        console.error('Error loading staff:', error);
        showAlert('スタッフデータの読み込みに失敗しました', 'error');
    }
}

function displayStaff(staff) {
    const tbody = document.getElementById('staffTable');
    tbody.innerHTML = '';
    
    if (staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">スタッフが登録されていません</td></tr>';
        return;
    }
    
    staff.forEach(employee => {
        const row = document.createElement('tr');
        const statusBadge = employee.is_active ? 
            '<span class="badge bg-success">アクティブ</span>' : 
            '<span class="badge bg-secondary">非アクティブ</span>';
        
        row.innerHTML = `
            <td>
                <strong>${employee.name}</strong>
                <br><small class="text-muted">${employee.email}</small>
            </td>
            <td>${getRoleDisplayName(employee.role)}</td>
            <td>${employee.phone || '-'}</td>
            <td>${employee.hourly_rate ? `¥${employee.hourly_rate.toLocaleString()}` : '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editStaff('${employee.id}')">
                    ✏️
                </button>
                <button class="btn btn-sm btn-outline-${employee.is_active ? 'warning' : 'success'}" 
                        onclick="toggleStaffStatus('${employee.id}', ${!employee.is_active})">
                    ${employee.is_active ? '⏸️' : '▶️'}
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getRoleDisplayName(role) {
    const roles = {
        'manager': 'マネージャー',
        'chef': 'シェフ',
        'server': 'サービス',
        'kitchen': 'キッチン',
        'cleaner': '清掃'
    };
    return roles[role] || role;
}

function updateStaffStats(staff) {
    const totalStaff = staff.length;
    const activeStaff = staff.filter(s => s.is_active).length;
    
    document.getElementById('totalStaff').textContent = totalStaff;
    document.getElementById('activeStaffCount').textContent = activeStaff;
    
    // These would be calculated from schedules in a full implementation
    document.getElementById('workingToday').textContent = Math.floor(activeStaff * 0.7); // Simulated
    document.getElementById('weeklyHours').textContent = `${totalStaff * 40}h`; // Simulated
}

async function saveStaff() {
    const name = document.getElementById('staffName').value;
    const email = document.getElementById('staffEmail').value;
    const phone = document.getElementById('staffPhone').value;
    const role = document.getElementById('staffRole').value;
    const hourlyRate = document.getElementById('staffHourlyRate').value;
    
    if (!name || !email || !role) {
        showAlert('必須項目を入力してください', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('staff')
            .insert([{
                name,
                email,
                phone,
                role,
                hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null
            }])
            .select();
            
        if (error) throw error;
        
        showAlert('スタッフを追加しました', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addStaffModal')).hide();
        document.getElementById('staffForm').reset();
        loadStaff();
        
    } catch (error) {
        console.error('Error saving staff:', error);
        showAlert('スタッフの追加に失敗しました', 'error');
    }
}

function searchStaff() {
    const query = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('#staffTable tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Utility Functions
function showAlert(message, type = 'info') {
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Initialize all admin features when showing sections
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.remove('d-none');
    
    // Update active nav link
    document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'reservations':
            loadReservations();
            break;
        case 'staff':
            loadStaff();
            break;
        case 'menu':
            loadMenuItems();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Add Bootstrap JS for modal functionality
document.head.innerHTML += '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>';

// Initialize when admin dashboard loads
setTimeout(() => {
    loadReservations();
    loadStaff();
}, 1000);