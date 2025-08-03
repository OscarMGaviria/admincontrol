// ===========================
// GESTOR DE DATOS
// ===========================

import { appState, CONSTANTS } from './config.js';
import { loadZarpesData, loadCategoriasData, calculateStatistics } from './firebase-service.js';
import { showSuccess, showError, showInfo, showLoading, hideLoading } from './notifications.js';
import { 
    showLoadingState, 
    showErrorState, 
    showNoDataState, 
    updateCollectionCount,
    createCategoryBadge,
    populateTable 
} from './ui-components.js';

class DataManager {
    constructor() {
        this.tableColumns = {
            zarpes: [
                { key: 'embarcacionId', header: 'ID', type: 'text', className: 'text-center' },
                { key: 'embarcacion', header: 'Embarcación', type: 'text', className: 'font-bold' },
                { key: 'administrador', header: 'Administrador', type: 'text' },
                { key: 'categoria', header: 'Categoría', type: 'category' },
                { key: 'fechaHora', header: 'Fecha y Hora', type: 'date' },
                { key: 'cantidadPasajeros', header: 'Pasajeros', type: 'number', className: 'text-center font-bold' },
                { key: 'valorPorPersona', header: 'Valor/Persona', type: 'currency' },
                { key: 'valorTotal', header: 'Valor Total', type: 'currency', className: 'font-bold text-green-400' },
                { key: 'posicionDesembarque', header: 'Pos. Desembarque', type: 'text', className: 'text-center' }
            ]
        };
        
        this.init();
    }

    init() {
        this.setupCardEventListeners();
    }

    // ===========================
    // CARGA DE DATOS INICIAL
    // ===========================
    async loadInitialData() {
        console.log('🔄 Iniciando carga de datos inicial...');
        
        try {
            // Mostrar indicador de carga general
            showLoading('Cargando datos del sistema...');
            
            // Cargar datos principales en paralelo
            const results = await Promise.allSettled([
                this.loadZarpesDataSafe(),
                this.updateDashboardStats()
            ]);
            
            // Verificar resultados
            const failedLoads = results.filter(result => result.status === 'rejected');
            
            if (failedLoads.length > 0) {
                console.warn('Algunas cargas de datos fallaron:', failedLoads);
                showError('Algunos datos no se pudieron cargar completamente');
            } else {
                showSuccess('Datos del sistema cargados exitosamente');
                console.log('✅ Carga inicial completada');
            }
            
        } catch (error) {
            console.error('❌ Error en carga inicial:', error);
            showError('Error cargando datos del sistema');
        } finally {
            hideLoading();
        }
    }

    async loadZarpesDataSafe() {
        try {
            console.log('📊 Cargando datos de zarpes...');
            const data = await loadZarpesData();
            
            if (data && data.length > 0) {
                console.log(`✅ Cargados ${data.length} registros de zarpes`);
                updateCollectionCount('countControlZarpes', data.length, true);
                return data;
            } else {
                console.log('ℹ️ No se encontraron registros de zarpes');
                updateCollectionCount('countControlZarpes', 0);
                return [];
            }
        } catch (error) {
            console.error('❌ Error cargando zarpes:', error);
            updateCollectionCount('countControlZarpes', 'Error');
            throw error;
        }
    }

    async updateDashboardStats() {
        try {
            console.log('📈 Actualizando estadísticas del dashboard...');
            
            const stats = calculateStatistics(appState.zarpesData);
            
            // Actualizar contadores en las tarjetas
            updateCollectionCount('countControlZarpes', stats.totalRegistros, true);
            updateCollectionCount('countCategorias', stats.categoriasUnicas, true);
            updateCollectionCount('countEmbarcaciones', stats.totalRegistros > 0 ? Math.ceil(stats.totalRegistros / 10) : 0, true);
            updateCollectionCount('countFinanciero', `$${Math.round(stats.totalIngresos/1000)}K`, false);
            
            console.log('✅ Estadísticas actualizadas:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ Error actualizando estadísticas:', error);
            throw error;
        }
    }

    // ===========================
    // CARGA DE DATOS DE ZARPES PARA MODAL
    // ===========================
    async loadZarpesForModal() {
        const loadingContainer = 'zarpesLoading';
        const errorContainer = 'zarpesError';
        const tableContainer = 'zarpesTableContainer';
        const noDataContainer = 'noZarpesData';
        
        try {
            // Mostrar estado de carga
            this.showZarpesLoadingState();
            showInfo('Cargando registros de embarcaciones...');
            
            // Cargar datos
            const data = await loadZarpesData();
            
            if (!data || data.length === 0) {
                this.showZarpesNoDataState();
                showInfo('No se encontraron registros en la base de datos');
                return;
            }
            
            // Mostrar datos en tabla
            this.displayZarpesData(data);
            showSuccess(`Cargados ${data.length} registros exitosamente`);
            
            // Habilitar botones de exportación
            this.enableExportButtons();
            
        } catch (error) {
            console.error('❌ Error cargando datos para modal:', error);
            this.showZarpesErrorState(error.message);
            this.handleZarpesLoadError(error);
        }
    }

    showZarpesLoadingState() {
        document.getElementById('zarpesLoading').style.display = 'flex';
        document.getElementById('zarpesTableContainer').style.display = 'none';
        document.getElementById('noZarpesData').style.display = 'none';
        document.getElementById('zarpesError').style.display = 'none';
        
        this.disableExportButtons();
    }

    showZarpesErrorState(errorMessage) {
        document.getElementById('zarpesLoading').style.display = 'none';
        document.getElementById('zarpesTableContainer').style.display = 'none';
        document.getElementById('noZarpesData').style.display = 'none';
        document.getElementById('zarpesError').style.display = 'block';
        
        const errorElement = document.getElementById('zarpesError');
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>Error al cargar los datos:</strong><br>
                ${errorMessage}
                <br><br>
                <button onclick="dataManager.retryLoadZarpes()" style="
                    background: #06b6d4; 
                    border: none; 
                    padding: 8px 16px; 
                    border-radius: 6px; 
                    color: white; 
                    cursor: pointer;
                ">
                    <i class="fas fa-retry"></i> Reintentar
                </button>
            </div>
        `;
        
        this.disableExportButtons();
    }

    showZarpesNoDataState() {
        document.getElementById('zarpesLoading').style.display = 'none';
        document.getElementById('zarpesTableContainer').style.display = 'none';
        document.getElementById('zarpesError').style.display = 'none';
        document.getElementById('noZarpesData').style.display = 'block';
        
        this.disableExportButtons();
    }

    displayZarpesData(data) {
        document.getElementById('zarpesLoading').style.display = 'none';
        document.getElementById('zarpesError').style.display = 'none';
        document.getElementById('noZarpesData').style.display = 'none';
        document.getElementById('zarpesTableContainer').style.display = 'block';
        
        this.populateZarpesTable(data || appState.filteredZarpesData);
    }

    populateZarpesTable(data) {
        const tbody = document.getElementById('zarpesTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        data.forEach((registro, index) => {
            const row = document.createElement('tr');
            
            // Formatear fecha
            let fechaFormateada = 'N/A';
            if (registro.fechaHora) {
                try {
                    if (registro.fechaHora.toDate) {
                        const fecha = registro.fechaHora.toDate();
                        fechaFormateada = `${fecha.toLocaleDateString('es-CO')} ${fecha.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`;
                    } else if (registro.fechaHora instanceof Date) {
                        fechaFormateada = `${registro.fechaHora.toLocaleDateString('es-CO')} ${registro.fechaHora.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`;
                    } else if (typeof registro.fechaHora === 'string') {
                        const fecha = new Date(registro.fechaHora);
                        fechaFormateada = `${fecha.toLocaleDateString('es-CO')} ${fecha.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`;
                    }
                } catch (e) {
                    fechaFormateada = registro.fechaHora.toString();
                }
            }

            // Crear badge de categoría
            const categoria = registro.categoria || 'sin-categoria';
            const categoriaBadge = createCategoryBadge(categoria);

            // Formatear valores monetarios
            const valorPorPersona = registro.valorPorPersona ? `$${registro.valorPorPersona.toLocaleString('es-CO')}` : '$0';
            const valorTotal = registro.valorTotal ? `$${registro.valorTotal.toLocaleString('es-CO')}` : '$0';

            row.innerHTML = `
                <td class="text-center">${registro.embarcacionId || registro.id || index + 1}</td>
                <td><strong>${registro.embarcacion || 'N/A'}</strong></td>
                <td>${registro.administrador || 'N/A'}</td>
                <td>${categoriaBadge}</td>
                <td>${fechaFormateada}</td>
                <td class="text-center"><span style="font-weight: bold; color: #06b6d4;">${registro.cantidadPasajeros || '0'}</span></td>
                <td>${valorPorPersona}</td>
                <td><span style="font-weight: bold; color: #10b981;">${valorTotal}</span></td>
                <td class="text-center">${registro.posicionDesembarque || 'N/A'}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // ===========================
    // CARGA DE DATOS DE CATEGORÍAS PARA MODAL
    // ===========================
    async loadCategoriasForModal() {
        try {
            this.showCategoriasLoadingState();
            showInfo('Cargando análisis por categorías...');
            
            const data = await loadCategoriasData();
            
            if (!data || data.length === 0) {
                this.showCategoriasNoDataState();
                return;
            }
            
            this.displayCategoriasData(data);
            showSuccess(`Cargados ${data.length} registros para análisis`);
            
        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
            this.showCategoriasErrorState(error.message);
            this.handleCategoriasLoadError(error);
        }
    }

    showCategoriasLoadingState() {
        document.getElementById('categoriasLoading').style.display = 'flex';
        document.getElementById('categoriasTableContainer').style.display = 'none';
        document.getElementById('noCategoriasData').style.display = 'none';
    }

    showCategoriasErrorState(message) {
        document.getElementById('categoriasLoading').style.display = 'none';
        document.getElementById('categoriasTableContainer').style.display = 'none';
        document.getElementById('noCategoriasData').style.display = 'block';
        
        // Mostrar mensaje de error en el contenedor no-data
        const noDataContainer = document.getElementById('noCategoriasData');
        noDataContainer.innerHTML = `
            <div class="no-data-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Error al cargar datos</h3>
            <p>${message}</p>
            <button onclick="dataManager.retryLoadCategorias()" style="
                background: #06b6d4; 
                border: none; 
                padding: 12px 24px; 
                border-radius: 8px; 
                color: white; 
                cursor: pointer;
                margin-top: 15px;
            ">
                <i class="fas fa-retry"></i> Reintentar
            </button>
        `;
    }

    showCategoriasNoDataState() {
        document.getElementById('categoriasLoading').style.display = 'none';
        document.getElementById('categoriasTableContainer').style.display = 'none';
        document.getElementById('noCategoriasData').style.display = 'block';
    }

    displayCategoriasData(data) {
        document.getElementById('categoriasLoading').style.display = 'none';
        document.getElementById('noCategoriasData').style.display = 'none';
        document.getElementById('categoriasTableContainer').style.display = 'block';
        
        this.populateCategoriasTable(data || appState.filteredCategoriasData);
    }

    populateCategoriasTable(data) {
        const tbody = document.getElementById('categoriasTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        data.forEach((registro, index) => {
            const row = document.createElement('tr');
            
            let fechaFormateada = 'N/A';
            if (registro.fechaHora?.toDate) {
                const fecha = registro.fechaHora.toDate();
                fechaFormateada = `${fecha.toLocaleDateString('es-CO')} ${fecha.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`;
            }

            const categoria = registro.categoria || 'sin-categoria';
            const categoriaBadge = createCategoryBadge(categoria);

            row.innerHTML = `
                <td>${registro.embarcacionId || registro.id}</td>
                <td><strong>${registro.embarcacion || 'N/A'}</strong></td>
                <td>${categoriaBadge}</td>
                <td>${registro.administrador || 'N/A'}</td>
                <td>${fechaFormateada}</td>
                <td class="text-center"><span style="font-weight: bold; color: #06b6d4;">${registro.cantidadPasajeros || '0'}</span></td>
                <td>$${(registro.valorPorPersona || 0).toLocaleString('es-CO')}</td>
                <td><span style="font-weight: bold; color: #10b981;">$${(registro.valorTotal || 0).toLocaleString('es-CO')}</span></td>
                <td class="text-center">${registro.posicionDesembarque || 'N/A'}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // ===========================
    // MANEJO DE ERRORES
    // ===========================
    handleZarpesLoadError(error) {
        if (error.type === 'permission') {
            showError('Sin permisos para acceder a los datos.');
            setTimeout(() => {
                if (window.authService) {
                    window.authService.logout();
                }
            }, 3000);
        } else if (error.type === 'timeout') {
            showError('Tiempo de espera agotado. Intente nuevamente.');
        } else if (error.type === 'network') {
            showError('Error de conexión. Verifique su internet.');
        } else {
            showError('Error cargando datos: ' + error.message);
        }
    }

    handleCategoriasLoadError(error) {
        this.handleZarpesLoadError(error); // Mismo manejo de errores
    }

    // ===========================
    // CONTROL DE BOTONES DE EXPORTACIÓN
    // ===========================
    enableExportButtons() {
        const excelBtn = document.getElementById('excelBtn');
        const pdfBtn = document.getElementById('pdfBtn');
        
        if (excelBtn) excelBtn.disabled = false;
        if (pdfBtn) pdfBtn.disabled = false;
    }

    disableExportButtons() {
        const excelBtn = document.getElementById('excelBtn');
        const pdfBtn = document.getElementById('pdfBtn');
        
        if (excelBtn) excelBtn.disabled = true;
        if (pdfBtn) pdfBtn.disabled = true;
    }

    // ===========================
    // REINTENTOS
    // ===========================
    async retryLoadZarpes() {
        console.log('🔄 Reintentando carga de zarpes...');
        await this.loadZarpesForModal();
    }

    async retryLoadCategorias() {
        console.log('🔄 Reintentando carga de categorías...');
        await this.loadCategoriasForModal();
    }

    // ===========================
    // EVENT LISTENERS DE TARJETAS
    // ===========================
    setupCardEventListeners() {
        // Tarjeta de Control de Zarpes
        const controlZarpesCard = document.getElementById('controlZarpesCard');
        const viewZarpesBtn = document.getElementById('viewZarpesBtn');
        const newZarpeBtn = document.getElementById('newZarpeBtn');

        if (controlZarpesCard) {
            controlZarpesCard.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.openZarpesCollection();
                }
            });
        }

        if (viewZarpesBtn) {
            viewZarpesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openZarpesCollection();
            });
        }

        if (newZarpeBtn) {
            newZarpeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showInfo('Función de crear registro en desarrollo');
            });
        }

        // Tarjeta de Categorías
        const categoriasCard = document.getElementById('categoriasCard');
        const analyzeCategoriasBtn = document.getElementById('analyzeCategoriasBtn');

        if (categoriasCard) {
            categoriasCard.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.openCategoriasCollection();
                }
            });
        }

        if (analyzeCategoriasBtn) {
            analyzeCategoriasBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCategoriasCollection();
            });
        }

        // Otras tarjetas
        this.setupOtherCardListeners();
    }

    setupOtherCardListeners() {
        const embarcacionesCard = document.getElementById('embarcacionesCard');
        const financieroCard = document.getElementById('financieroCard');

        if (embarcacionesCard) {
            embarcacionesCard.addEventListener('click', () => {
                showInfo('Función de gestión de embarcaciones en desarrollo');
            });
        }

        if (financieroCard) {
            financieroCard.addEventListener('click', () => {
                showInfo('Función de reportes financieros en desarrollo');
            });
        }
    }

    // ===========================
    // APERTURA DE MODALES DE COLECCIONES
    // ===========================
    openZarpesCollection() {
        if (!appState.currentUser) {
            showError('Debe iniciar sesión para acceder a los datos');
            if (window.authService) {
                window.authService.showLoginModal();
            }
            return;
        }

        if (window.uiManager) {
            window.uiManager.showModal(CONSTANTS.MODALS.ZARPES);
        }
        
        // Cargar datos después de mostrar el modal
        setTimeout(() => {
            this.loadZarpesForModal();
        }, 500);
    }

    openCategoriasCollection() {
        if (!appState.currentUser) {
            showError('Debe iniciar sesión para acceder a los datos');
            if (window.authService) {
                window.authService.showLoginModal();
            }
            return;
        }

        if (window.uiManager) {
            window.uiManager.showModal(CONSTANTS.MODALS.CATEGORIAS);
        }
        
        // Cargar datos después de mostrar el modal
        setTimeout(() => {
            this.loadCategoriasForModal();
        }, 500);
    }

    // ===========================
    // MÉTODOS PÚBLICOS
    // ===========================
    refreshData() {
        return this.loadInitialData();
    }

    getCurrentZarpesData() {
        return appState.filteredZarpesData;
    }

    getCurrentCategoriasData() {
        return appState.filteredCategoriasData;
    }
}

// Crear instancia global
const dataManager = new DataManager();

// Exportar manager y métodos principales
export { dataManager };

export const loadInitialData = () => {
    return dataManager.loadInitialData();
};

export const openZarpesCollection = () => {
    return dataManager.openZarpesCollection();
};

export const openCategoriasCollection = () => {
    return dataManager.openCategoriasCollection();
};

export const refreshData = () => {
    return dataManager.refreshData();
};

// Hacer disponible globalmente
window.dataManager = dataManager;