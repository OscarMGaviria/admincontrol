// ===========================
// CONFIGURACIÓN FIREBASE
// ===========================

// Configuración de Firebase
export const firebaseConfig = {
    apiKey: "AIzaSyDdjYoi4BSBFFAuXumLxj-NMQWUVSFdSv4",
    authDomain: "contratos-5e932.firebaseapp.com",
    projectId: "contratos-5e932",
    storageBucket: "contratos-5e932.firebasestorage.app",
    messagingSenderId: "945849105278",
    appId: "1:945849105278:web:f0291a411b8e33327a112f"
};

// Configuración de la aplicación
export const appConfig = {
    // Carrusel
    carousel: {
        images: [
            'assets/fotos/guatape1.jpg',
            'assets/fotos/guatape2.jpg', 
            'assets/fotos/guatape3.jpg',
            'assets/fotos/guatape4.jpg',
            'assets/fotos/guatape5.jpg'
        ],
        videoSrc: 'assets/video.mp4',
        videoDuration: 15000,
        imageDuration: 5000
    },
    
    // Base de datos
    collections: {
        controlZarpes: 'ControlZarpes',
        embarcaciones: 'embarcaciones',
        users: 'users',
        reservas: 'Reservas',
        ventas: 'ventas'
    },
    
    // UI
    ui: {
        notificationDuration: 4000,
        connectionCheckInterval: 30000,
        retryAttempts: 3,
        retryDelay: 2000
    },
    
    // Categorías
    categories: {
        carguero: {
            name: 'Carguero',
            color: '#10b981',
            darkColor: '#059669'
        },
        pasajeros: {
            name: 'Pasajeros',
            color: '#06b6d4',
            darkColor: '#0891b2'
        },
        turismo: {
            name: 'Turismo',
            color: '#8b5cf6',
            darkColor: '#7c3aed'
        }
    }
};

// Variables globales de estado
export const appState = {
    // Firebase
    app: null,
    db: null,
    auth: null,
    isFirebaseInitialized: false,
    
    // Usuario
    currentUser: null,
    isLoggedIn: false,
    
    // Datos
    zarpesData: [],
    categoriasData: [],
    filteredZarpesData: [],
    filteredCategoriasData: [],
    
    // UI
    currentSlide: 0,
    carouselInterval: null,
    connectionCheckInterval: null
};

// Constantes de la aplicación
export const CONSTANTS = {
    STORAGE_KEYS: {
        USER_PREFERENCES: 'embarcaciones_user_prefs',
        LAST_LOGIN: 'embarcaciones_last_login'
    },
    
    NOTIFICATION_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info',
        WARNING: 'warning'
    },
    
    CONNECTION_STATUS: {
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
        CONNECTING: 'connecting'
    },
    
    PAGES: {
        LANDING: 'landingPage',
        DASHBOARD: 'adminDashboard'
    },
    
    MODALS: {
        LOGIN: 'loginOverlay',
        ZARPES: 'zarpesOverlay',
        CATEGORIAS: 'categoriasOverlay'
    }
};

// Configuración de exportación
export const exportConfig = {
    excel: {
        columns: [
            { header: 'ID Embarcación', key: 'embarcacionId', width: 15 },
            { header: 'Embarcación', key: 'embarcacion', width: 15 },
            { header: 'Administrador', key: 'administrador', width: 25 },
            { header: 'Categoría', key: 'categoria', width: 12 },
            { header: 'Fecha y Hora', key: 'fechaHora', width: 20 },
            { header: 'Cantidad Pasajeros', key: 'cantidadPasajeros', width: 12 },
            { header: 'Valor por Persona', key: 'valorPorPersona', width: 15 },
            { header: 'Valor Total', key: 'valorTotal', width: 15 },
            { header: 'Posición Desembarque', key: 'posicionDesembarque', width: 18 }
        ]
    },
    
    pdf: {
        title: 'Registros de Embarcaciones - Embalse de Guatapé',
        headers: ['ID', 'Embarcación', 'Administrador', 'Categoría', 'Fecha/Hora', 'Pasajeros', 'Valor/Pers', 'Valor Total'],
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 25 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 },
            4: { cellWidth: 30 },
            5: { cellWidth: 15 },
            6: { cellWidth: 25 },
            7: { cellWidth: 25 }
        }
    }
};

// Validaciones
export const validators = {
    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    password: (password) => {
        return password && password.length >= 6;
    },
    
    required: (value) => {
        return value !== null && value !== undefined && value !== '';
    }
};

// Utilidades
export const utils = {
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
    
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    formatDate: (date) => {
        if (!date) return 'N/A';
        
        try {
            let dateObj;
            if (date.toDate) {
                dateObj = date.toDate();
            } else if (date instanceof Date) {
                dateObj = date;
            } else if (typeof date === 'string') {
                dateObj = new Date(date);
            } else {
                return date.toString();
            }
            
            return `${dateObj.toLocaleDateString('es-CO')} ${dateObj.toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'N/A';
        }
    },
    
    getCategoryBadgeClass: (categoria) => {
        if (!categoria) return 'category-sin-categoria';
        return `category-${categoria.toLowerCase().replace(/\s+/g, '-')}`;
    },
    
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    sanitizeInput: (input) => {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }
};