// ===========================
// SISTEMA DE AUTENTICACIÓN
// ===========================

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { appState, CONSTANTS, validators } from './config.js';
import { showSuccess, showError, showInfo } from './notifications.js';
import { firebaseService } from './firebase-service.js';

class AuthService {
    constructor() {
        this.loginForm = null;
        this.loginBtn = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.currentUserElement = null;
        this.logoutBtn = null;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
    }

    setupElements() {
        // Elementos del formulario de login
        this.loginForm = document.getElementById('loginForm');
        this.loginBtn = document.getElementById('loginBtn');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        
        // Elementos del dashboard
        this.currentUserElement = document.getElementById('currentUser');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    setupEventListeners() {
        // Formulario de login
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Botón de logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Validación en tiempo real
        if (this.emailInput) {
            this.emailInput.addEventListener('blur', () => this.validateEmail());
        }

        if (this.passwordInput) {
            this.passwordInput.addEventListener('input', () => this.validatePassword());
        }
    }

    // ===========================
    // AUTENTICACIÓN
    // ===========================
    async handleLogin(event) {
        event.preventDefault();
        
        const email = this.emailInput?.value?.trim();
        const password = this.passwordInput?.value;
        
        // Validar campos
        if (!this.validateLoginForm(email, password)) {
            return;
        }

        // Verificar Firebase
        if (!firebaseService.isInitialized()) {
            showError('Firebase no está inicializado. Intente recargar la página.');
            return;
        }
        
        this.setLoginLoading(true);
        
        try {
            const userCredential = await signInWithEmailAndPassword(
                appState.auth, 
                email, 
                password
            );
            
            const user = userCredential.user;
            console.log('Usuario autenticado exitosamente:', user.email);
            
            appState.currentUser = user;
            appState.isLoggedIn = true;
            
            this.onLoginSuccess(user);
            
        } catch (error) {
            console.error('Error de autenticación:', error);
            this.handleAuthError(error);
        } finally {
            this.setLoginLoading(false);
        }
    }

    async handleLogout() {
        if (!confirm('¿Está seguro que desea cerrar sesión?')) {
            return;
        }

        try {
            await signOut(appState.auth);
            
            appState.isLoggedIn = false;
            appState.currentUser = null;
            appState.zarpesData = [];
            appState.filteredZarpesData = [];
            appState.categoriasData = [];
            appState.filteredCategoriasData = [];
            
            this.onLogoutSuccess();
            
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showError('Error al cerrar sesión: ' + error.message);
        }
    }

    // ===========================
    // LISTENER DE ESTADO DE AUTH
    // ===========================
    setupAuthStateListener() {
        if (!appState.auth) {
            console.error('Auth no está inicializado');
            return;
        }

        onAuthStateChanged(appState.auth, (user) => {
            if (user) {
                appState.currentUser = user;
                appState.isLoggedIn = true;
                console.log('Usuario autenticado:', user.email);
                
                // Actualizar UI si está en el dashboard
                if (this.isDashboardVisible()) {
                    this.updateUserInfo(user);
                    this.loadInitialData();
                }
            } else {
                appState.currentUser = null;
                appState.isLoggedIn = false;
                console.log('Usuario no autenticado');
                
                // Redirigir si está en dashboard
                if (this.isDashboardVisible()) {
                    showInfo('Sesión expirada. Redirigiendo...');
                    setTimeout(() => this.onLogoutSuccess(), 2000);
                }
            }
        });
    }

    // ===========================
    // VALIDACIONES
    // ===========================
    validateLoginForm(email, password) {
        let isValid = true;

        // Validar email
        if (!validators.email(email)) {
            this.showFieldError(this.emailInput, 'Ingrese un correo electrónico válido');
            isValid = false;
        } else {
            this.clearFieldError(this.emailInput);
        }

        // Validar password
        if (!validators.password(password)) {
            this.showFieldError(this.passwordInput, 'La contraseña debe tener al menos 6 caracteres');
            isValid = false;
        } else {
            this.clearFieldError(this.passwordInput);
        }

        return isValid;
    }

    validateEmail() {
        const email = this.emailInput?.value?.trim();
        if (email && !validators.email(email)) {
            this.showFieldError(this.emailInput, 'Formato de correo inválido');
            return false;
        }
        this.clearFieldError(this.emailInput);
        return true;
    }

    validatePassword() {
        const password = this.passwordInput?.value;
        if (password && password.length > 0 && password.length < 6) {
            this.showFieldError(this.passwordInput, 'Mínimo 6 caracteres');
            return false;
        }
        this.clearFieldError(this.passwordInput);
        return true;
    }

    showFieldError(field, message) {
        if (!field) return;
        
        field.style.borderColor = '#ef4444';
        
        // Remover mensaje anterior
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Agregar nuevo mensaje
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.style.cssText = `
            color: #ef4444;
            font-size: 0.8rem;
            margin-top: 4px;
        `;
        errorEl.textContent = message;
        field.parentNode.appendChild(errorEl);
    }

    clearFieldError(field) {
        if (!field) return;
        
        field.style.borderColor = '';
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    // ===========================
    // MANEJO DE ERRORES DE AUTH
    // ===========================
    handleAuthError(error) {
        let errorMessage = 'Error de autenticación';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Usuario no encontrado';
                this.showFieldError(this.emailInput, 'Este correo no está registrado');
                break;
            case 'auth/wrong-password':
                errorMessage = 'Contraseña incorrecta';
                this.showFieldError(this.passwordInput, 'Contraseña incorrecta');
                break;
            case 'auth/invalid-email':
                errorMessage = 'Correo electrónico inválido';
                this.showFieldError(this.emailInput, 'Formato de correo inválido');
                break;
            case 'auth/user-disabled':
                errorMessage = 'Usuario deshabilitado';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos fallidos. Intente más tarde';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Error de conexión. Verifique su internet';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Credenciales inválidas';
                this.showFieldError(this.emailInput, 'Verifique sus credenciales');
                this.showFieldError(this.passwordInput, 'Verifique sus credenciales');
                break;
            default:
                errorMessage = error.message;
        }
        
        showError(errorMessage);
    }

    // ===========================
    // UI UPDATES
    // ===========================
    setLoginLoading(loading) {
        if (!this.loginBtn) return;
        
        this.loginBtn.disabled = loading;
        
        if (loading) {
            this.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        } else {
            this.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    }

    onLoginSuccess(user) {
        // Cerrar modal de login
        this.hideLoginModal();
        
        // Mostrar dashboard
        this.showDashboard();
        
        // Mostrar notificación
        showSuccess(`¡Bienvenido ${user.email}!`);
        
        // Resetear formulario
        this.resetLoginForm();

        // Forzar restauración del scroll
        setTimeout(() => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.documentElement.style.overflow = '';
            document.body.classList.remove('modal-open');
        }, 100);

        // Cargar datos inicial después del login
        this.loadInitialData();
    }



    onLogoutSuccess() {
        // Mostrar landing page
        this.showLandingPage();
        
        // Cerrar modales
        this.hideAllModals();
        
        // Resetear formulario
        this.resetLoginForm();
        
        // Mostrar notificación
        showSuccess('Sesión cerrada exitosamente');


        if (window.dataManager) {
            window.dataManager.invalidateCache();
            console.log('🧹 Auth: Caché limpiado al cerrar sesión');
        }

        // Asegurar scroll restaurado
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        document.body.classList.remove('modal-open');

    }

    updateUserInfo(user) {
        if (this.currentUserElement) {
            this.currentUserElement.textContent = user.email;
        }
    }

    resetLoginForm() {
        if (this.loginForm) {
            this.loginForm.reset();
        }
        
        // Limpiar errores
        if (this.emailInput) this.clearFieldError(this.emailInput);
        if (this.passwordInput) this.clearFieldError(this.passwordInput);
        
        this.setLoginLoading(false);
    }

    // ===========================
    // NAVEGACIÓN
    // ===========================
    showDashboard() {
        const landingPage = document.getElementById(CONSTANTS.PAGES.LANDING);
        const dashboard = document.getElementById(CONSTANTS.PAGES.DASHBOARD);
        
        if (landingPage) landingPage.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        
        // Inicializar carrusel del dashboard si existe
        if (window.carouselManager) {
            window.carouselManager.initializeCarousel('dashboardCarousel');
        }
    }

    showLandingPage() {
        const landingPage = document.getElementById(CONSTANTS.PAGES.LANDING);
        const dashboard = document.getElementById(CONSTANTS.PAGES.DASHBOARD);
        
        if (dashboard) dashboard.style.display = 'none';
        if (landingPage) landingPage.style.display = 'flex';
        
        // Inicializar carrusel del landing si existe
        if (window.carouselManager) {
            window.carouselManager.initializeCarousel('carousel');
        }
    }

    hideLoginModal() {
        const loginOverlay = document.getElementById(CONSTANTS.MODALS.LOGIN);
        if (loginOverlay) {
            loginOverlay.style.display = 'none';
        }
        
        // Reanudar carrusel si existe
        if (window.carouselManager) {
            window.carouselManager.startCarousel();
        }

        if (window.uiManager) {
        window.uiManager.hideModal(CONSTANTS.MODALS.LOGIN);
    }
    }

    showLoginModal() {
        const loginOverlay = document.getElementById(CONSTANTS.MODALS.LOGIN);
        if (loginOverlay) {
            loginOverlay.style.display = 'flex';
        }
        
        // Pausar carrusel si existe
        if (window.carouselManager) {
            window.carouselManager.stopCarousel();
        }
        
        // Focus en email
        setTimeout(() => {
            if (this.emailInput) {
                this.emailInput.focus();
            }
        }, 300);
    }

    hideAllModals() {
        Object.values(CONSTANTS.MODALS).forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        });
    }

    isDashboardVisible() {
        const dashboard = document.getElementById(CONSTANTS.PAGES.DASHBOARD);
        return dashboard && dashboard.style.display === 'block';
    }

    // ===========================
    // CARGA DE DATOS INICIAL
    // ===========================
    async loadInitialData() {
        if (appState.isFirebaseInitialized && appState.currentUser) {
            try {
                console.log('🔄 Auth: Iniciando carga de datos después del login...');
                
                // Usar directamente el dataManager global
                if (window.dataManager) {
                    await window.dataManager.loadInitialData();
                    console.log('✅ Auth: Datos iniciales cargados exitosamente');
                } else {
                    console.error('❌ Auth: DataManager no disponible');
                    showError('Error: Módulo de datos no disponible');
                }
            } catch (error) {
                console.error('❌ Auth: Error cargando datos iniciales:', error);
                showError('Error cargando datos del sistema');
            }
        } else {
            console.log('⚠️ Auth: No se pueden cargar datos - Firebase no inicializado o usuario no autenticado');
        }
    }

    // ===========================
    // MÉTODOS PÚBLICOS
    // ===========================
    getCurrentUser() {
        return appState.currentUser;
    }

    isLoggedIn() {
        return appState.isLoggedIn;
    }

    login(email, password) {
        // Simular formulario para login programático
        if (this.emailInput) this.emailInput.value = email;
        if (this.passwordInput) this.passwordInput.value = password;
        
        const fakeEvent = { preventDefault: () => {} };
        return this.handleLogin(fakeEvent);
    }

    logout() {
        return this.handleLogout();
    }
}

// Crear instancia global
const authService = new AuthService();

// Exportar servicio y métodos principales
export { authService };

export const setupAuthStateListener = () => {
    return authService.setupAuthStateListener();
};

export const showLoginModal = () => {
    return authService.showLoginModal();
};

export const hideLoginModal = () => {
    return authService.hideLoginModal();
};

export const getCurrentUser = () => {
    return authService.getCurrentUser();
};

export const isUserLoggedIn = () => {
    return authService.isLoggedIn();
};

export const login = (email, password) => {
    return authService.login(email, password);
};

export const logout = () => {
    return authService.logout();
};

// Hacer disponible globalmente
window.authService = authService;