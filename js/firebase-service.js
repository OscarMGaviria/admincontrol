// ===========================
// SERVICIO FIREBASE
// ===========================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { firebaseConfig, appConfig, appState, CONSTANTS } from './config.js';
import { showConnectionStatus, showError, showSuccess } from './notifications.js';

class FirebaseService {
    constructor() {
        this.maxRetries = appConfig.ui.retryAttempts;
        this.retryDelay = appConfig.ui.retryDelay;
        this.connectionCheckInterval = null;
    }

    // ===========================
    // INICIALIZACIÓN
    // ===========================
    async initializeWithRetry() {
        let retryCount = 0;

        while (retryCount < this.maxRetries && !appState.isFirebaseInitialized) {
            try {
                showConnectionStatus('Conectando a Firebase...', CONSTANTS.CONNECTION_STATUS.CONNECTING);
                
                appState.app = initializeApp(firebaseConfig);
                appState.db = getFirestore(appState.app);
                appState.auth = getAuth(appState.app);
                
                // Probar conexión básica
                await this.testConnection();
                
                appState.isFirebaseInitialized = true;
                showConnectionStatus('Conectado a Firebase', CONSTANTS.CONNECTION_STATUS.CONNECTED);
                console.log('Firebase inicializado correctamente');
                
                // Iniciar monitoreo de conexión
                this.startConnectionMonitoring();
                
                return true;
            } catch (error) {
                retryCount++;
                console.error(`Error inicializando Firebase (intento ${retryCount}):`, error);
                
                if (retryCount < this.maxRetries) {
                    showConnectionStatus(
                        `Reintentando conexión... (${retryCount}/${this.maxRetries})`, 
                        CONSTANTS.CONNECTION_STATUS.CONNECTING
                    );
                    await this.delay(this.retryDelay * retryCount);
                } else {
                    showConnectionStatus('Sin conexión a Firebase', CONSTANTS.CONNECTION_STATUS.DISCONNECTED);
                    showError('Error de conexión con Firebase. Verifique su internet.');
                }
            }
        }
        
        return false;
    }

    async testConnection() {
        try {
            const testQuery = query(
                collection(appState.db, appConfig.collections.controlZarpes), 
                orderBy('fechaHora', 'desc')
            );
            await getDocs(testQuery);
            return true;
        } catch (error) {
            console.error('Error probando conexión:', error);
            throw error;
        }
    }

    // ===========================
    // MONITOREO DE CONEXIÓN
    // ===========================
    startConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }

        this.connectionCheckInterval = setInterval(async () => {
            if (appState.isFirebaseInitialized && navigator.onLine) {
                try {
                    await this.testConnection();
                    // Conexión OK, no hacer nada
                } catch (error) {
                    console.warn('Conexión perdida, intentando reconectar...');
                    showConnectionStatus('Reconectando...', CONSTANTS.CONNECTION_STATUS.CONNECTING);
                    
                    setTimeout(async () => {
                        try {
                            await this.testConnection();
                            showConnectionStatus('Reconectado', CONSTANTS.CONNECTION_STATUS.CONNECTED);
                        } catch (e) {
                            showConnectionStatus('Sin conexión', CONSTANTS.CONNECTION_STATUS.DISCONNECTED);
                        }
                    }, 2000);
                }
            }
        }, appConfig.ui.connectionCheckInterval);
    }

    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    // ===========================
    // CARGA DE DATOS
    // ===========================
    async loadZarpesData() {
        try {
            this.validateFirebaseState();
            
            const zarpesRef = collection(appState.db, appConfig.collections.controlZarpes);
            const q = query(zarpesRef, orderBy('fechaHora', 'desc'));
            
            // Agregar timeout para evitar carga infinita
            const queryPromise = getDocs(q);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout al cargar datos')), 30000)
            );
            
            const querySnapshot = await Promise.race([queryPromise, timeoutPromise]);
            
            appState.zarpesData = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                appState.zarpesData.push({
                    id: doc.id,
                    ...data
                });
            });

            console.log('Datos cargados:', appState.zarpesData.length, 'registros');
            appState.filteredZarpesData = [...appState.zarpesData];
            
            return appState.zarpesData;
            
        } catch (error) {
            console.error('Error cargando datos de Firebase:', error);
            throw this.handleFirebaseError(error);
        }
    }

    async loadCategoriasData() {
        try {
            this.validateFirebaseState();
            
            const zarpesRef = collection(appState.db, appConfig.collections.controlZarpes);
            const q = query(zarpesRef, orderBy('fechaHora', 'desc'));
            const querySnapshot = await getDocs(q);
            
            appState.categoriasData = [];
            querySnapshot.forEach((doc) => {
                appState.categoriasData.push({ 
                    id: doc.id, 
                    ...doc.data() 
                });
            });

            appState.filteredCategoriasData = [...appState.categoriasData];
            return appState.categoriasData;
            
        } catch (error) {
            console.error('Error cargando categorías:', error);
            throw this.handleFirebaseError(error);
        }
    }

    // ===========================
    // VALIDACIONES Y MANEJO DE ERRORES
    // ===========================
    validateFirebaseState() {
        if (!appState.isFirebaseInitialized) {
            throw new Error('Firebase no está inicializado');
        }

        if (!appState.auth.currentUser) {
            throw new Error('Usuario no autenticado');
        }
    }

    handleFirebaseError(error) {
        let errorMessage = 'Error desconocido';
        let errorType = 'generic';

        switch (error.code) {
            case 'permission-denied':
                errorMessage = 'Sin permisos para acceder a los datos';
                errorType = 'permission';
                break;
            case 'unavailable':
                errorMessage = 'Servicio no disponible. Intente más tarde';
                errorType = 'network';
                break;
            case 'deadline-exceeded':
                errorMessage = 'Tiempo de espera agotado';
                errorType = 'timeout';
                break;
            case 'unauthenticated':
                errorMessage = 'Sesión expirada. Por favor, inicie sesión nuevamente';
                errorType = 'auth';
                break;
            default:
                if (error.message.includes('Timeout')) {
                    errorMessage = 'Tiempo de espera agotado. Intente nuevamente';
                    errorType = 'timeout';
                } else if (error.message.includes('network')) {
                    errorMessage = 'Error de conexión. Verifique su internet';
                    errorType = 'network';
                } else {
                    errorMessage = error.message;
                }
        }

        return {
            message: errorMessage,
            type: errorType,
            originalError: error
        };
    }

    // ===========================
    // ESTADÍSTICAS
    // ===========================
    calculateStatistics(data = null) {
        const dataToAnalyze = data || appState.zarpesData;
        
        if (!dataToAnalyze || dataToAnalyze.length === 0) {
            return {
                totalRegistros: 0,
                totalPasajeros: 0,
                totalIngresos: 0,
                categoriasUnicas: 0,
                promedioPersonasPorViaje: 0,
                ingresoPromedioPorViaje: 0
            };
        }

        const totalRegistros = dataToAnalyze.length;
        const totalPasajeros = dataToAnalyze.reduce((sum, item) => {
            return sum + (item.cantidadPasajeros || 0);
        }, 0);
        const totalIngresos = dataToAnalyze.reduce((sum, item) => {
            return sum + (item.valorTotal || 0);
        }, 0);
        
        const categoriasUnicas = new Set(
            dataToAnalyze.map(item => item.categoria).filter(cat => cat)
        ).size;

        const promedioPersonasPorViaje = totalRegistros > 0 ? 
            Math.round(totalPasajeros / totalRegistros) : 0;
        
        const ingresoPromedioPorViaje = totalRegistros > 0 ? 
            Math.round(totalIngresos / totalRegistros) : 0;

        return {
            totalRegistros,
            totalPasajeros,
            totalIngresos,
            categoriasUnicas,
            promedioPersonasPorViaje,
            ingresoPromedioPorViaje
        };
    }

    // ===========================
    // UTILIDADES
    // ===========================
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async retryOperation(operation, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await this.delay(this.retryDelay * (i + 1));
                }
            }
        }
        
        throw lastError;
    }

    // ===========================
    // CLEANUP
    // ===========================
    cleanup() {
        this.stopConnectionMonitoring();
        
        // Reset estado
        appState.isFirebaseInitialized = false;
        appState.app = null;
        appState.db = null;
        appState.auth = null;
        appState.zarpesData = [];
        appState.categoriasData = [];
        appState.filteredZarpesData = [];
        appState.filteredCategoriasData = [];
    }

    // ===========================
    // MÉTODOS DE CONVENIENCIA
    // ===========================
    isInitialized() {
        return appState.isFirebaseInitialized;
    }

    getCurrentUser() {
        return appState.auth?.currentUser || null;
    }

    getDatabase() {
        return appState.db;
    }

    getAuth() {
        return appState.auth;
    }
}

// Crear instancia global
const firebaseService = new FirebaseService();

// Exportar servicio y métodos principales
export { firebaseService };

export const initializeFirebase = () => {
    return firebaseService.initializeWithRetry();
};

export const loadZarpesData = () => {
    return firebaseService.loadZarpesData();
};

export const loadCategoriasData = () => {
    return firebaseService.loadCategoriasData();
};

export const calculateStatistics = (data) => {
    return firebaseService.calculateStatistics(data);
};

export const testFirebaseConnection = () => {
    return firebaseService.testConnection();
};

export const cleanupFirebase = () => {
    return firebaseService.cleanup();
};

// Hacer disponible globalmente
window.firebaseService = firebaseService;