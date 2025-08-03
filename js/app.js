// ===========================
// ORQUESTADOR PRINCIPAL DE LA APLICACIÓN
// ===========================

import { CONSTANTS } from './config.js';
import { showSuccess, showError, showInfo, showConnectionStatus } from './notifications.js';
import { initializeFirebase, firebaseService } from './firebase-service.js';
import { authService, setupAuthStateListener } from './auth.js';
import { carouselManager, initializeCarousel } from './carousel.js';
import { uiManager } from './ui-components.js';
import { dataManager } from './data-manager.js';
import { exportService } from './export-service.js';
import { filterManager } from './filters.js';

class Application {
    constructor() {
        this.isInitialized = false;
        this.startTime = Date.now();
        this.modules = {
            firebase: null,
            auth: null,
            carousel: null,
            ui: null,
            data: null,
            export: null,
            filters: null
        };
        
        console.log('🚀 Iniciando Sistema de Embarcaciones Guatapé v2.0');
    }

    // ===========================
    // INICIALIZACIÓN PRINCIPAL
    // ===========================
    async init() {
        try {
            console.log('⚙️ Iniciando aplicación modular...');
            showConnectionStatus('Inicializando sistema...', CONSTANTS.CONNECTION_STATUS.CONNECTING);
            
            // Fase 1: Configuración básica
            await this.initBasicSetup();
            
            // Fase 2: Inicialización de Firebase
            await this.initFirebase();
            
            // Fase 3: Configuración de módulos
            await this.initModules();
            
            // Fase 4: Configuración de eventos globales
            this.setupGlobalEvents();
            
            // Fase 5: Inicialización de UI
            this.initUI();
            
            // Marcar como inicializado
            this.isInitialized = true;
            
            const totalTime = Date.now() - this.startTime;
            console.log(`✅ Aplicación inicializada exitosamente en ${totalTime}ms`);
            
            showSuccess('Sistema inicializado correctamente');
            showConnectionStatus('Sistema listo', CONSTANTS.CONNECTION_STATUS.CONNECTED);
            
        } catch (error) {
            console.error('❌ Error crítico durante la inicialización:', error);
            showError('Error crítico al inicializar la aplicación');
            showConnectionStatus('Error de inicialización', CONSTANTS.CONNECTION_STATUS.DISCONNECTED);
            
            // Intentar recuperación
            this.handleInitializationError(error);
        }
    }

    // ===========================
    // CONFIGURACIÓN BÁSICA
    // ===========================
    async initBasicSetup() {
        console.log('🔧 Configurando sistema básico...');
        
        // Verificar elementos DOM críticos
        this.validateCriticalElements();
        
        // Configurar viewport para móviles
        this.setupMobileViewport();
        
        // Configurar detección de capacidades del navegador
        this.detectBrowserCapabilities();
        
        console.log('✅ Configuración básica completada');
    }

    validateCriticalElements() {
        const criticalElements = [
            'landingPage',
            'adminDashboard', 
            'loginOverlay',
            'carousel',
            'connectionStatus'
        ];
        
        const missingElements = criticalElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            throw new Error(`Elementos críticos faltantes: ${missingElements.join(', ')}`);
        }
    }

    setupMobileViewport() {
        // Configurar viewport height variable para iOS
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 100);
        });
    }

    detectBrowserCapabilities() {
        const capabilities = {
            localStorage: typeof Storage !== 'undefined',
            serviceWorker: 'serviceWorker' in navigator,
            pushNotifications: 'PushManager' in window,
            offlineCapable: 'navigator' in window && 'onLine' in navigator,
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            es6Modules: typeof Symbol !== 'undefined'
        };
        
        console.log('🔍 Capacidades del navegador detectadas:', capabilities);
        
        // Guardar para uso posterior
        window.browserCapabilities = capabilities;
        
        // Mostrar advertencias si es necesario
        if (!capabilities.localStorage) {
            console.warn('⚠️ LocalStorage no disponible - algunas funciones limitadas');
        }
        
        if (!capabilities.es6Modules) {
            throw new Error('Navegador no soporta ES6 modules - actualice su navegador');
        }
    }

    // ===========================
    // INICIALIZACIÓN DE FIREBASE
    // ===========================
    async initFirebase() {
        console.log('🔥 Inicializando Firebase...');
        
        try {
            const success = await initializeFirebase();
            
            if (!success) {
                throw new Error('Firebase no se pudo inicializar');
            }
            
            this.modules.firebase = firebaseService;
            console.log('✅ Firebase inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            
            // Intentar reintentar después de un delay
            console.log('🔄 Intentando reinicializar Firebase en 3 segundos...');
            setTimeout(async () => {
                try {
                    await initializeFirebase();
                    console.log('✅ Firebase inicializado en segundo intento');
                    showSuccess('Firebase conectado exitosamente');
                } catch (retryError) {
                    console.error('❌ Error en segundo intento de Firebase:', retryError);
                    showError('No se pudo conectar a Firebase. Algunas funciones no estarán disponibles.');
                }
            }, 3000);
            
            // No lanzar error para permitir que la app continúe
            console.warn('⚠️ Continuando sin Firebase - funcionalidad limitada');
        }
    }

    // ===========================
    // INICIALIZACIÓN DE MÓDULOS
    // ===========================
    async initModules() {
        console.log('📦 Inicializando módulos...');
        
        const modulePromises = [
            this.initAuthModule(),
            this.initCarouselModule(), 
            this.initUIModule(),
            this.initDataModule(),
            this.initExportModule(),
            this.initFiltersModule()
        ];
        
        const results = await Promise.allSettled(modulePromises);
        
        // Verificar resultados de inicialización
        results.forEach((result, index) => {
            const moduleNames = ['Auth', 'Carousel', 'UI', 'Data', 'Export', 'Filters'];
            if (result.status === 'rejected') {
                console.warn(`⚠️ Error inicializando módulo ${moduleNames[index]}:`, result.reason);
            } else {
                console.log(`✅ Módulo ${moduleNames[index]} inicializado`);
            }
        });
    }

    async initAuthModule() {
        try {
            this.modules.auth = authService;
            
            // Configurar listener de estado de autenticación
            setupAuthStateListener();
            
            console.log('🔐 Módulo de autenticación listo');
        } catch (error) {
            console.error('❌ Error inicializando módulo Auth:', error);
            throw error;
        }
    }

    async initCarouselModule() {
        try {
            this.modules.carousel = carouselManager;
            
            // Inicializar carrusel principal
            initializeCarousel('carousel');
            
            console.log('🎠 Módulo de carrusel listo');
        } catch (error) {
            console.error('⚠️ Error inicializando carrusel:', error);
            // No es crítico, continuar sin carrusel
        }
    }

    async initUIModule() {
        try {
            this.modules.ui = uiManager;
            console.log('🖼️ Módulo de UI listo');
        } catch (error) {
            console.error('❌ Error inicializando módulo UI:', error);
            throw error; // UI es crítico
        }
    }

    async initDataModule() {
        try {
            this.modules.data = dataManager;
            console.log('📊 Módulo de datos listo');
        } catch (error) {
            console.error('⚠️ Error inicializando módulo Data:', error);
            // No es crítico al inicio
        }
    }

    async initExportModule() {
        try {
            this.modules.export = exportService;
            console.log('📤 Módulo de exportación listo');
        } catch (error) {
            console.error('⚠️ Error inicializando módulo Export:', error);
            // No es crítico
        }
    }

    async initFiltersModule() {
        try {
            this.modules.filters = filterManager;
            console.log('🔍 Módulo de filtros listo');
        } catch (error) {
            console.error('⚠️ Error inicializando módulo Filters:', error);
            // No es crítico
        }
    }

    // ===========================
    // CONFIGURACIÓN DE EVENTOS GLOBALES
    // ===========================
    setupGlobalEvents() {
        console.log('🌐 Configurando eventos globales...');
        
        // Eventos de red
        this.setupNetworkEvents();
        
        // Eventos de teclado globales
        this.setupKeyboardEvents();
        
        // Eventos de error globales
        this.setupErrorHandling();
        
        // Eventos de rendimiento
        this.setupPerformanceMonitoring();
        
        // Eventos de PWA
        this.setupPWAEvents();
        
        console.log('✅ Eventos globales configurados');
    }

    setupNetworkEvents() {
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada');
            showSuccess('Conexión a internet restaurada');
            showConnectionStatus('En línea', CONSTANTS.CONNECTION_STATUS.CONNECTED);
            
            // Reintentar conexión con Firebase si es necesario
            if (!this.modules.firebase?.isInitialized()) {
                this.retryFirebaseConnection();
            }
        });

        window.addEventListener('offline', () => {
            console.log('📵 Conexión perdida');
            showError('Sin conexión a internet');
            showConnectionStatus('Sin conexión', CONSTANTS.CONNECTION_STATUS.DISCONNECTED);
        });
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Atajos de teclado globales
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'r':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.refreshApplication();
                        }
                        break;
                }
            }
            
            // F5 para refrescar datos
            if (e.key === 'F5' && this.modules.data) {
                e.preventDefault();
                this.modules.data.refreshData();
            }
        });
    }

    setupErrorHandling() {
        // Errores de JavaScript
        window.addEventListener('error', (event) => {
            console.error('❌ Error JavaScript global:', event.error);
            this.logError('JavaScript Error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Promesas rechazadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Promise rechazada:', event.reason);
            this.logError('Unhandled Promise Rejection', event.reason);
            
            // Prevenir que aparezca en consola si es manejable
            if (this.isHandleableError(event.reason)) {
                event.preventDefault();
            }
        });
    }

    setupPerformanceMonitoring() {
        // Monitorear carga de recursos
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.duration > 2000) { // Más de 2 segundos
                        console.warn(`⚠️ Recurso lento: ${entry.name} (${entry.duration}ms)`);
                    }
                });
            });
            
            observer.observe({ entryTypes: ['resource'] });
        }
    }

    setupPWAEvents() {
        // Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('✅ Service Worker registrado:', registration);
                    })
                    .catch((error) => {
                        console.log('❌ Service Worker falló:', error);
                    });
            });
        }
        
        // Eventos de instalación PWA
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('💡 PWA puede ser instalada');
            
            // Mostrar botón de instalación si existe
            const installBtn = document.getElementById('pwaInstallBtn');
            if (installBtn) {
                installBtn.style.display = 'block';
                installBtn.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        console.log('PWA install outcome:', outcome);
                        deferredPrompt = null;
                        installBtn.style.display = 'none';
                    }
                });
            }
        });
    }

    // ===========================
    // INICIALIZACIÓN DE UI
    // ===========================
    initUI() {
        console.log('🎨 Inicializando interfaz de usuario...');
        
        // Mostrar página de inicio
        this.showLandingPage();
        
        // Configurar animaciones de entrada
        this.setupEnterAnimations();
        
        // Configurar tema (si está implementado)
        this.setupTheme();
        
        console.log('✅ UI inicializada');
    }

    showLandingPage() {
        const landingPage = document.getElementById(CONSTANTS.PAGES.LANDING);
        const dashboard = document.getElementById(CONSTANTS.PAGES.DASHBOARD);
        
        if (landingPage) landingPage.style.display = 'flex';
        if (dashboard) dashboard.style.display = 'none';
    }

    setupEnterAnimations() {
        // Animar elementos al cargar
        const animatedElements = document.querySelectorAll('.feature-card, .collection-card');
        animatedElements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.1}s`;
        });
    }

    setupTheme() {
        // Detectar preferencia de tema del sistema
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
            console.log('🌙 Tema oscuro aplicado');
        } else {
            console.log('☀️ Tema claro aplicado');
        }
    }

    // ===========================
    // MANEJO DE ERRORES
    // ===========================
    handleInitializationError(error) {
        console.error('🔥 Manejando error de inicialización:', error);
        
        // Mostrar interfaz de error
        this.showErrorState(error);
        
        // Intentar recuperación parcial
        setTimeout(() => {
            this.attemptPartialRecovery();
        }, 5000);
    }

    showErrorState(error) {
        const errorHtml = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1e293b, #374151);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ef4444; margin-bottom: 2rem;"></i>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">Error de Inicialización</h1>
                    <p style="font-size: 1.1rem; margin-bottom: 2rem; opacity: 0.8;">
                        La aplicación no se pudo inicializar correctamente.
                    </p>
                    <button onclick="location.reload()" style="
                        background: #06b6d4;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        color: white;
                        font-size: 1rem;
                        cursor: pointer;
                    ">
                        <i class="fas fa-refresh"></i> Recargar Página
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorHtml);
    }

    async attemptPartialRecovery() {
        console.log('🔄 Intentando recuperación parcial...');
        
        try {
            // Intentar reinicializar módulos críticos
            await this.initUI();
            
            // Reintentar Firebase
            if (!this.modules.firebase?.isInitialized()) {
                await this.retryFirebaseConnection();
            }
            
            showInfo('Recuperación parcial exitosa');
            
        } catch (error) {
            console.error('❌ Recuperación parcial falló:', error);
        }
    }

    async retryFirebaseConnection() {
        console.log('🔄 Reintentando conexión con Firebase...');
        
        try {
            const success = await initializeFirebase();
            if (success) {
                showSuccess('Firebase reconectado exitosamente');
                return true;
            }
        } catch (error) {
            console.error('❌ Error en reintento de Firebase:', error);
        }
        
        return false;
    }

    // ===========================
    // UTILIDADES
    // ===========================
    isHandleableError(error) {
        // Determinar si un error puede ser manejado silenciosamente
        if (!error) return false;
        
        const handleableErrors = [
            'NetworkError',
            'Firebase: Error',
            'auth/network-request-failed'
        ];
        
        return handleableErrors.some(type => 
            error.toString().includes(type) || 
            error.code?.includes(type.split('/')[1])
        );
    }

    logError(type, error, context = {}) {
        const errorLog = {
            type,
            message: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            context
        };
        
        // En producción, enviar a servicio de logging
        console.error('📝 Error registrado:', errorLog);
    }

    focusSearch() {
        const searchInputs = document.querySelectorAll('#searchFilter, #searchCategoriasFilter');
        const visibleInput = Array.from(searchInputs).find(input => 
            input && input.offsetParent !== null
        );
        
        if (visibleInput) {
            visibleInput.focus();
            showInfo('Buscar con Ctrl+K');
        }
    }

    refreshApplication() {
        console.log('🔄 Refrescando aplicación...');
        
        if (this.modules.data) {
            this.modules.data.refreshData();
        }
        
        if (this.modules.filters) {
            this.modules.filters.refreshFilters();
        }
        
        showInfo('Aplicación refrescada');
    }

    // ===========================
    // MÉTODOS PÚBLICOS
    // ===========================
    getModule(moduleName) {
        return this.modules[moduleName];
    }

    isModuleReady(moduleName) {
        return this.modules[moduleName] !== null;
    }

    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            modules: Object.keys(this.modules).reduce((status, key) => {
                status[key] = this.modules[key] !== null;
                return status;
            }, {}),
            firebase: this.modules.firebase?.isInitialized() || false,
            online: navigator.onLine,
            capabilities: window.browserCapabilities
        };
    }

    // ===========================
    // HOOKS DEL CICLO DE VIDA
    // ===========================
    async beforeUnload() {
        console.log('🔄 Limpiando aplicación antes de cerrar...');
        
        // Limpiar intervalos y listeners
        if (this.modules.carousel) {
            this.modules.carousel.destroy();
        }
        
        if (this.modules.firebase) {
            this.modules.firebase.cleanup();
        }
        
        // Guardar estado si es necesario
        this.saveApplicationState();
    }

    saveApplicationState() {
        if (!window.browserCapabilities?.localStorage) return;
        
        try {
            const state = {
                lastSession: new Date().toISOString(),
                version: '2.0'
            };
            
            localStorage.setItem('embarcaciones_app_state', JSON.stringify(state));
        } catch (error) {
            console.warn('⚠️ No se pudo guardar estado de la aplicación:', error);
        }
    }

    restoreApplicationState() {
        if (!window.browserCapabilities?.localStorage) return null;
        
        try {
            const saved = localStorage.getItem('embarcaciones_app_state');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.warn('⚠️ No se pudo restaurar estado de la aplicación:', error);
            return null;
        }
    }

    // ===========================
    // DEBUGGING Y DESARROLLO
    // ===========================
    enableDebugMode() {
        window.DEBUG_MODE = true;
        window.app = this;
        
        console.log('🐛 Modo debug habilitado');
        console.log('💡 Usa window.app para acceder a la instancia de la aplicación');
        console.log('📊 Estado del sistema:', this.getSystemStatus());
        
        // Agregar estilos de debug
        document.documentElement.style.setProperty('--debug-mode', '1');
    }

    getDebugInfo() {
        return {
            version: '2.0',
            buildTime: this.startTime,
            systemStatus: this.getSystemStatus(),
            modules: this.modules,
            performance: {
                loadTime: Date.now() - this.startTime,
                memory: performance.memory ? {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                } : 'No disponible'
            }
        };
    }
}

// ===========================
// INICIALIZACIÓN DE LA APLICACIÓN
// ===========================
const app = new Application();

// Configurar cleanup antes de cerrar
window.addEventListener('beforeunload', () => {
    app.beforeUnload();
});

// Configurar cleanup en pagehide (mejor para móviles)
window.addEventListener('pagehide', () => {
    app.beforeUnload();
});

// Habilitar debug en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    app.enableDebugMode();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM cargado, iniciando aplicación...');
    
    try {
        await app.init();
        
        // Restaurar estado si existe
        const savedState = app.restoreApplicationState();
        if (savedState) {
            console.log('🔄 Estado anterior restaurado:', savedState);
        }
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        
        // Fallback: mostrar mensaje de error y botón de recarga
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1e293b, #374151);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                text-align: center;
                padding: 20px;
                font-family: system-ui, -apple-system, sans-serif;
            ">
                <div>
                    <i class="fas fa-anchor" style="font-size: 4rem; color: #06b6d4; margin-bottom: 2rem;"></i>
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">Sistema Embarcaciones</h1>
                    <p style="font-size: 1.1rem; margin-bottom: 2rem; opacity: 0.8;">
                        Error crítico al cargar la aplicación.<br>
                        Por favor, recargue la página.
                    </p>
                    <button onclick="location.reload()" style="
                        background: #06b6d4;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        color: white;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#0891b2'" onmouseout="this.style.background='#06b6d4'">
                        🔄 Recargar Página
                    </button>
                </div>
            </div>
        `;
    }
});

// Exportar aplicación para uso global
export { app as default };

// Hacer disponible globalmente para debugging
window.EmbarcacionesApp = app;

// Utilidades globales de conveniencia
window.getSystemStatus = () => app.getSystemStatus();
window.getDebugInfo = () => app.getDebugInfo();
window.refreshApp = () => app.refreshApplication();

console.log('🏁 Orquestador principal cargado y listo');

// ===========================
// FUNCIONES GLOBALES PARA COMPATIBILIDAD
// ===========================

// Estas funciones son necesarias para los event handlers en HTML
window.showLoginModal = () => {
    if (app.isModuleReady('auth')) {
        app.modules.auth.showLoginModal();
    }
};

window.hideLoginModal = () => {
    if (app.isModuleReady('auth')) {
        app.modules.auth.hideLoginModal();
    }
};

window.logout = () => {
    if (app.isModuleReady('auth')) {
        app.modules.auth.logout();
    }
};

window.openZarpesCollection = () => {
    if (app.isModuleReady('data')) {
        app.modules.data.openZarpesCollection();
    }
};

window.openCategoriasCollection = () => {
    if (app.isModuleReady('data')) {
        app.modules.data.openCategoriasCollection();
    }
};

window.exportToExcel = () => {
    if (app.isModuleReady('export')) {
        app.modules.export.exportZarpesToExcel();
    }
};

window.exportToPDF = () => {
    if (app.isModuleReady('export')) {
        app.modules.export.exportZarpesToPDF();
    }
};

window.exportCategoriasToExcel = () => {
    if (app.isModuleReady('export')) {
        app.modules.export.exportCategoriasToExcel();
    }
};

window.exportCategoriasToPDF = () => {
    if (app.isModuleReady('export')) {
        app.modules.export.exportCategoriasToPDF();
    }
};

window.hideZarpesModal = () => {
    if (app.isModuleReady('ui')) {
        app.modules.ui.hideModal('zarpesOverlay');
    }
};

window.hideCategoriasModal = () => {
    if (app.isModuleReady('ui')) {
        app.modules.ui.hideModal('categoriasOverlay');
    }
};

window.retryLoadData = () => {
    if (app.isModuleReady('data')) {
        app.modules.data.retryLoadZarpes();
    }
};

console.log('🔗 Funciones globales de compatibilidad registradas');