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
                { key: 'index', header: '#', type: 'number', className: 'text-center' },
                { key: 'embarcacion', header: 'Embarcación', type: 'text', className: 'font-bold' },
                { key: 'administrador', header: 'Administrador', type: 'text' },
                { key: 'categoria', header: 'Categoría', type: 'category' },
                { key: 'fechaHora', header: 'Fecha y Hora', type: 'date' },
                { key: 'cantidadPasajeros', header: 'Pasajeros', type: 'number', className: 'text-center font-bold' },
                { key: 'valorPorPersona', header: 'Valor/Persona', type: 'currency' },
                { key: 'valorTotal', header: 'Valor Total', type: 'currency', className: 'font-bold text-green-400' }
            ]
        };
        
        //Sistema de caché
        this.dataCache = {
            zarpes: { data: null, lastLoaded: null },
            ventas: { data: null, lastLoaded: null },
            reservas: { data: null, lastLoaded: null }
        };

        this.activeZarpesFilters = {
            search: '',
            category: '',
            date: ''
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
            showLoading('Cargando datos del sistema...');
            
            // Cargar datos principales y actualizar caché
            const results = await Promise.allSettled([
                this.loadAndCacheZarpes(),
                this.loadAndCacheVentas(), 
                this.loadAndCacheReservas()
            ]);
            
            // Actualizar estadísticas del dashboard
            await this.updateDashboardStats();
            
            const failedLoads = results.filter(result => result.status === 'rejected');
            
            if (failedLoads.length > 0) {
                console.warn('Algunas cargas de datos fallaron:', failedLoads);
                showError('Algunos datos no se pudieron cargar completamente');
            } else {
                showSuccess('Datos del sistema cargados exitosamente');
                console.log('✅ Carga inicial completada con caché actualizado');
            }
            
        } catch (error) {
            console.error('❌ Error en carga inicial:', error);
            showError('Error cargando datos del sistema');
        } finally {
            hideLoading();
        }
    }




    async updateDashboardStats() {
        try {
            console.log('📈 Actualizando estadísticas del dashboard...');
            
            // Usar datos del caché si están disponibles
            let statsData = appState.zarpesData;
            if (!statsData || statsData.length === 0) {
                // Si no hay datos en appState, intentar del caché
                if (this.isCacheValid('zarpes')) {
                    statsData = this.dataCache.zarpes.data;
                    appState.zarpesData = statsData;
                    appState.filteredZarpesData = [...statsData];
                }
            }
            
            const stats = calculateStatistics(statsData);
            
            // Actualizar contadores en las tarjetas
            updateCollectionCount('countControlZarpes', stats.totalRegistros, true);
            updateCollectionCount('countventas', stats.categoriasUnicas, true);
            updateCollectionCount('countEmbarcaciones', stats.totalRegistros > 0 ? Math.ceil(stats.totalRegistros / 10) : 0, true);
            updateCollectionCount('countFinanciero', `$${Math.round(stats.totalIngresos/1000)}K`, false);
            updateCollectionCount('countreservas', stats.totalRegistros > 0 ? Math.ceil(stats.totalRegistros / 5) : 0, true);
            
            console.log('✅ Estadísticas actualizadas:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ Error actualizando estadísticas:', error);
            throw error;
        }
}




    // ===========================
    // CARGA OPTIMIZADA CON CACHÉ
    // ===========================
    async loadAndCacheZarpes() {
        try {
            console.log('📊 Cargando y cacheando zarpes...');
            const data = await loadZarpesData();
            
            if (data && data.length > 0) {
                this.updateCache('zarpes', data);
                appState.zarpesData = data;
                appState.filteredZarpesData = [...data];
                updateCollectionCount('countControlZarpes', data.length, true);
                console.log(`✅ Zarpes cargados y cacheados: ${data.length} registros`);
            } else {
                updateCollectionCount('countControlZarpes', 0);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error cargando zarpes:', error);
            updateCollectionCount('countControlZarpes', 'Error');
            throw error;
        }
    }

    async loadAndCacheVentas() {
        try {
            console.log('💰 Cargando y cacheando ventas...');
            
            if (!window.firebaseService) {
                throw new Error('FirebaseService no disponible');
            }
            
            const data = await window.firebaseService.loadVentasData();
            
            if (data && data.length > 0) {
                this.updateCache('ventas', data);
                console.log(`✅ Ventas cargadas y cacheadas: ${data.length} registros`);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error cargando ventas:', error);
            return [];
        }
    }

    async loadAndCacheReservas() {
        try {
            console.log('📋 Cargando y cacheando reservas...');
            
            if (!window.firebaseService) {
                throw new Error('FirebaseService no disponible');
            }
            
            const data = await window.firebaseService.loadReservasData();
            
            if (data && data.length > 0) {
                this.updateCache('reservas', data);
                console.log(`✅ Reservas cargadas y cacheadas: ${data.length} registros`);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error cargando reservas:', error);
            return [];
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
            // Verificar caché primero
            if (this.isCacheValid('zarpes')) {
                console.log('📦 Usando datos en caché para zarpes');
                const cachedData = this.dataCache.zarpes.data;
                
                if (!cachedData || cachedData.length === 0) {
                    this.showZarpesNoDataState();
                    return;
                }
                
                appState.zarpesData = cachedData;
                appState.filteredZarpesData = [...cachedData];
                this.displayZarpesData(cachedData);
                this.enableExportButtons();
                return;
            }
            
            // Cargar desde Firebase solo si no hay caché válido
            console.log('🔄 Cargando zarpes desde Firebase...');
            this.showZarpesLoadingState();
            showInfo('Cargando registros desde la base de datos...');
            
            const data = await loadZarpesData();
            
            if (!data || data.length === 0) {
                this.showZarpesNoDataState();
                showInfo('No se encontraron registros en la base de datos');
                return;
            }
            
            // Guardar en caché
            this.updateCache('zarpes', data);
            
            this.displayZarpesData(data);
            showSuccess(`Cargados ${data.length} registros exitosamente`);
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
        
        const lastUpdateElement = document.getElementById('zarpesLastUpdate');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = this.getLastUpdateText('zarpes');
        }
        this.populateCategoryFilter();  
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
                <td class="text-center"><strong>${index + 1}</strong></td>
                <td><strong>${registro.embarcacion || 'N/A'}</strong></td>
                <td>${registro.administrador || 'N/A'}</td>
                <td>${categoriaBadge}</td>
                <td>${fechaFormateada}</td>
                <td class="text-center"><span style="font-weight: bold; color: #06b6d4;">${registro.cantidadPasajeros || '0'}</span></td>
                <td>${valorPorPersona}</td>
                <td><span style="font-weight: bold; color: #10b981;">${valorTotal}</span></td>
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
    // FILTROS PARA ZARPES
    // ===========================
    setupZarpesFilters() {
        console.log('🔍 Configurando filtros para zarpes...');
        
        const searchFilter = document.getElementById('searchFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const dateFilter = document.getElementById('dateFilter');
        const clearBtn = document.getElementById('clearZarpesFilters');
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.activeZarpesFilters.search = e.target.value;
                this.applyZarpesFilters();
            });
        }
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.activeZarpesFilters.category = e.target.value;
                console.log('🏷️ Filtro categoría seleccionado:', e.target.value);
                this.applyZarpesFilters();
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.activeZarpesFilters.date = e.target.value;
                this.applyZarpesFilters();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearZarpesFilters();
            });
        }
        
        console.log('✅ Filtros de zarpes configurados');
    }

    applyZarpesFilters() {
        console.log('🔍 Aplicando filtros zarpes:', this.activeZarpesFilters);
        
        if (!appState.zarpesData || appState.zarpesData.length === 0) {
            console.warn('No hay datos de zarpes para filtrar');
            return;
        }
        
        appState.filteredZarpesData = appState.zarpesData.filter(zarpe => {
            // Filtro de búsqueda
            if (this.activeZarpesFilters.search) {
                const searchTerm = this.activeZarpesFilters.search.toLowerCase();
                const matchesSearch = 
                    (zarpe.embarcacion && zarpe.embarcacion.toLowerCase().includes(searchTerm)) ||
                    (zarpe.administrador && zarpe.administrador.toLowerCase().includes(searchTerm)) ||
                    (zarpe.categoria && zarpe.categoria.toLowerCase().includes(searchTerm)) ||
                    (zarpe.embarcacionId && zarpe.embarcacionId.toString().includes(searchTerm));
                
                if (!matchesSearch) return false;
            }
            
            // Filtro de categoría
            if (this.activeZarpesFilters.category) {
                if (!zarpe.categoria) return false;
                
                const zarpeCategoria = zarpe.categoria.toLowerCase().trim();
                const filterCategoria = this.activeZarpesFilters.category.toLowerCase().trim();
                
                if (zarpeCategoria !== filterCategoria) {
                    return false;
                }
}
            
            // Filtro de fecha
            if (this.activeZarpesFilters.date) {
                if (!zarpe.fechaHora) return false;
                
                try {
                    let zarpeDate = '';
                    if (zarpe.fechaHora.toDate) {
                        zarpeDate = zarpe.fechaHora.toDate().toISOString().slice(0, 10);
                    } else if (zarpe.fechaHora instanceof Date) {
                        zarpeDate = zarpe.fechaHora.toISOString().slice(0, 10);
                    } else if (typeof zarpe.fechaHora === 'string') {
                        zarpeDate = new Date(zarpe.fechaHora).toISOString().slice(0, 10);
                    }
                    
                    if (zarpeDate !== this.activeZarpesFilters.date) return false;
                } catch (error) {
                    console.warn('Error procesando fecha:', zarpe.fechaHora, error);
                    return false;
                }
            }
            
            return true;
        });
        
        this.populateZarpesTable(appState.filteredZarpesData);
        
        console.log(`📊 Filtros zarpes aplicados: ${appState.filteredZarpesData.length}/${appState.zarpesData.length} registros`);
    }

    clearZarpesFilters() {
        console.log('🧹 Limpiando filtros de zarpes...');
        
        this.activeZarpesFilters = {
            search: '',
            category: '',
            date: ''
        };
        
        // Limpiar campos UI
        const searchFilter = document.getElementById('searchFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (searchFilter) searchFilter.value = '';
        if (categoryFilter) categoryFilter.selectedIndex = 0;
        if (dateFilter) dateFilter.value = '';
        
        // Restaurar datos completos
        if (appState.zarpesData) {
            appState.filteredZarpesData = [...appState.zarpesData];
            this.populateZarpesTable(appState.filteredZarpesData);
        }
        
        if (window.showSuccess) {
            window.showSuccess('Filtros de zarpes limpiados');
        }
    }

    // ===========================
    // GESTIÓN DINÁMICA DE CATEGORÍAS
    // ===========================
    populateCategoryFilter() {
        const categorySelect = document.getElementById('categoryFilter');
        if (!categorySelect) return;
        
        console.log('🏷️ Poblando selector de categorías...');
        
        // Limpiar opciones existentes (excepto la primera)
        while (categorySelect.options.length > 1) {
            categorySelect.removeChild(categorySelect.lastChild);
        }
        
        if (!appState.zarpesData || appState.zarpesData.length === 0) {
            console.log('⚠️ No hay datos para extraer categorías');
            return;
        }
        
        // Extraer categorías únicas de los datos
        const categories = new Set();
        appState.zarpesData.forEach(zarpe => {
            if (zarpe.categoria && zarpe.categoria.trim()) {
                categories.add(zarpe.categoria.trim());
            }
        });
        
        // Convertir a array y ordenar
        const sortedCategories = Array.from(categories).sort();
        
        console.log('📋 Categorías encontradas:', sortedCategories);
        
        // Agregar cada categoría como opción
        sortedCategories.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.toLowerCase();
            option.textContent = categoria;
            categorySelect.appendChild(option);
        });
        
        console.log(`✅ Selector poblado con ${sortedCategories.length} categorías`);
    }



    // Métodos públicos para filtros de zarpes
    getActiveZarpesFilters() {
        return this.activeZarpesFilters;
    }

    hasActiveZarpesFilters() {
        return this.activeZarpesFilters.search !== '' || 
            this.activeZarpesFilters.category !== '' || 
            this.activeZarpesFilters.date !== '';
    }


    debugCategorias() {
        if (!appState.zarpesData) {
            console.log('❌ No hay datos de zarpes');
            return;
        }
        
        console.log('🔍 Debug de categorías:');
        console.log('Total registros:', appState.zarpesData.length);
        
        const categorias = {};
        appState.zarpesData.forEach((zarpe, index) => {
            const cat = zarpe.categoria || 'sin-categoria';
            if (!categorias[cat]) {
                categorias[cat] = 0;
            }
            categorias[cat]++;
            
            if (index < 5) { // Mostrar primeros 5 registros
                console.log(`Registro ${index + 1}:`, {
                    embarcacion: zarpe.embarcacion,
                    categoria: zarpe.categoria,
                    administrador: zarpe.administrador
                });
            }
        });
        
        console.table(categorias);
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

        // Tarjeta de Ventas
        const ventasCard = document.getElementById('ventasCard');
        const analyzeVentasBtn = document.getElementById('analyzeventasBtn');
        const exportVentasBtn = document.getElementById('exportventasBtn');

        if (ventasCard) {
            ventasCard.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.openCategoriasCollection();
                }
            });
        }

        if (analyzeVentasBtn) {
            analyzeVentasBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openCategoriasCollection();
            });
            console.log('✅ Event listener de ventas agregado');
        } else {
            console.log('⚠️ Botón analyzeventasBtn no encontrado');
        }

        if (exportVentasBtn) {
            exportVentasBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showInfo('Abrir modal para exportar desde ahí');
            });
        }

        // Botón de refresh para zarpes
        const refreshZarpesBtn = document.getElementById('refreshZarpesBtn');
        if (refreshZarpesBtn) {
            refreshZarpesBtn.addEventListener('click', () => {
                this.refreshCache('zarpes');
                this.clearZarpesFilters();
            });
        }


    // Tarjeta de Reservas
    const reservasCard = document.getElementById('reservasCard');
    const manageReservasBtn = document.getElementById('managereservasBtn');
    const addReservaBtn = document.getElementById('addReserva');

    if (reservasCard) {
        reservasCard.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.openReservasCollection();
            }
        });
    }

    if (manageReservasBtn) {
        manageReservasBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openReservasCollection();
        });
        console.log('✅ Event listener de reservas agregado');
    } else {
        console.log('⚠️ Botón managereservasBtn no encontrado');
    }

    if (addReservaBtn) {
        addReservaBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showInfo('Función de agregar reserva en desarrollo');
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
            this.setupZarpesFilters();
        }, 500);
    }

    openCategoriasCollection() {
        if (window.salesManager) {
            window.salesManager.openVentasModal();
        } else {
            showError('Módulo de ventas no disponible');
        }
    }


    openReservasCollection() {

        if (window.reservasManager) {
            window.reservasManager.openReservasModal();
        } else {
            showError('Módulo de reservas no disponible');
        }
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

    // ===========================
    // SISTEMA DE CACHÉ
    // ===========================
    isCacheValid(cacheKey) {
        const cache = this.dataCache[cacheKey];
        const hasData = !!(cache && cache.data && cache.data.length > 0);
        
        console.log(`🔍 Caché ${cacheKey}: ${hasData ? 'disponible' : 'vacío'}`);
        return hasData;
    }

    updateCache(cacheKey, data) {
        this.dataCache[cacheKey] = {
            data: [...data], // Copia para evitar mutaciones
            lastLoaded: Date.now()
        };
        console.log(`💾 Caché actualizado para ${cacheKey}: ${data.length} registros`);
    }

    invalidateCache(cacheKey = null) {
        if (cacheKey) {
            this.dataCache[cacheKey] = { data: null, lastLoaded: null };
            console.log(`🗑️ Caché invalidado para ${cacheKey}`);
        } else {
            // Invalidar todo el caché
            Object.keys(this.dataCache).forEach(key => {
                this.dataCache[key] = { data: null, lastLoaded: null };
            });
            console.log('🗑️ Todo el caché invalidado');
        }
    }

    refreshCache(cacheKey) {
        console.log(`🔄 Forzando recarga de caché para ${cacheKey}`);
        this.invalidateCache(cacheKey);
        
        // Recargar según el tipo
        switch(cacheKey) {
            case 'zarpes':
                this.loadZarpesForModal();
                break;
            case 'ventas':
                if (window.salesManager) {
                    window.salesManager.loadVentasData();
                }
                break;
            case 'reservas':
                if (window.reservasManager) {
                    window.reservasManager.loadReservasData();
                }
                break;
        }
    }

    getCacheStatus() {
        const status = {};
        Object.keys(this.dataCache).forEach(key => {
            const cache = this.dataCache[key];
            status[key] = {
                hasData: !!cache.data,
                recordCount: cache.data ? cache.data.length : 0,
                lastLoaded: cache.lastLoaded ? new Date(cache.lastLoaded).toLocaleString() : 'Nunca',
                isValid: this.isCacheValid(key)
            };
        });
        return status;
    }

    getLastUpdateText(cacheKey) {
        const cache = this.dataCache[cacheKey];
        if (!cache || !cache.lastLoaded) {
            return 'Nunca actualizado';
        }
        
        const date = new Date(cache.lastLoaded);
        return `Última actualización: ${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;
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

export const openReservasCollection = () => {
    return dataManager.openReservasCollection();
};

// Hacer disponible globalmente
window.dataManager = dataManager;