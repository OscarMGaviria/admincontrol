// ===========================
// GESTOR DE MÓDULO DE VENTAS - VERSIÓN SIMPLIFICADA
// ===========================

class SalesManager {
constructor() {
    this.currentData = [];
    this.filteredData = [];
    // AGREGAR ESTAS LÍNEAS
    this.activeFilters = {
            search: '',
            date: ''
        };
    }

    // ===========================
    // MÉTODO PRINCIPAL
    // ===========================
    async openVentasModal() {
        console.log('🔍 Abriendo modal de ventas...');
        console.log('🔍 appState.isFirebaseInitialized:', window.appState?.isFirebaseInitialized);
        console.log('🔍 firebaseService disponible:', !!window.firebaseService);
        
        // Mostrar modal directamente
        const modal = document.getElementById('ventasOverlay');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Modal de ventas mostrado');
            
            // Cargar datos
            setTimeout(() => {
                this.loadVentasData();
                this.setupVentasFilters();
            }, 500);
        } else {
            console.error('❌ Modal ventasOverlay no encontrado');
            if (window.showError) {
                window.showError('Modal de ventas no encontrado en el HTML');
            }
        }
    }

    closeVentasModal() {
        const modal = document.getElementById('ventasOverlay');
        if (modal) {
            modal.style.display = 'none';
            console.log('✅ Modal de ventas cerrado');
        }
    }

    // ===========================
    // CONFIGURACIÓN DE FILTROS
    // ===========================
    setupVentasFilters() {
        console.log('🔍 Configurando filtros de ventas...');
        
        const searchFilter = document.getElementById('searchVentasFilter');
        const dateFilter = document.getElementById('dateVentasFilter');
        const clearBtn = document.getElementById('clearVentasFilters');
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.activeFilters.search = e.target.value;
                this.applyVentasFilters();
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.activeFilters.date = e.target.value;
                this.applyVentasFilters();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearVentasFilters();
            });
        }
        
        console.log('✅ Filtros de ventas configurados');


        // Botón de refresh
        const refreshBtn = document.getElementById('refreshVentasBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Refrescando datos de ventas...');
                if (window.dataManager) {
                    window.dataManager.refreshCache('ventas');
                }
                if (window.showInfo) {
                    window.showInfo('Recargando datos de ventas...');
                }
            });
        }
        
        console.log('✅ Filtros de ventas configurados');
    }

    applyVentasFilters() {
        console.log('🔍 Aplicando filtros:', this.activeFilters);
        
        this.filteredData = this.currentData.filter(venta => {
            // Filtro de búsqueda
            if (this.activeFilters.search) {
                const searchTerm = this.activeFilters.search.toLowerCase();
                const matchesSearch = 
                    (venta.nombre && venta.nombre.toLowerCase().includes(searchTerm)) ||
                    (venta.documento && venta.documento.toString().includes(searchTerm)) ||
                    (venta.embarcacion && venta.embarcacion.toLowerCase().includes(searchTerm));
                
                if (!matchesSearch) return false;
            }
            
            // Filtro de fecha
            if (this.activeFilters.date) {
                if (!venta.fecha) return false;
                
                // Convertir fecha del registro para comparar
                let ventaFecha = '';
                if (venta.fecha) {
                    // Asumir formato DD/MM/AAAA o similar
                    const fechaParts = venta.fecha.split('/');
                    if (fechaParts.length === 3) {
                        // Convertir DD/MM/AAAA a AAAA-MM-DD
                        ventaFecha = `${fechaParts[2]}-${fechaParts[1].padStart(2, '0')}-${fechaParts[0].padStart(2, '0')}`;
                    }
                }
                
                if (ventaFecha !== this.activeFilters.date) return false;
            }
            
            return true;
        });
        
        this.populateVentasTable();
        
        console.log(`📊 Filtros aplicados: ${this.filteredData.length}/${this.currentData.length} registros`);
    }

    clearVentasFilters() {
        console.log('🧹 Limpiando filtros de ventas...');
        
        this.activeFilters = {
            search: '',
            date: ''
        };
        
        // Limpiar campos UI
        const searchFilter = document.getElementById('searchVentasFilter');
        const dateFilter = document.getElementById('dateVentasFilter');
        
        if (searchFilter) searchFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        
        // Restaurar datos completos
        this.filteredData = [...this.currentData];
        this.populateVentasTable();
        
        if (window.showSuccess) {
            window.showSuccess('Filtros limpiados');
        }
    }


    // ===========================
    // CARGA DE DATOS
    // ===========================
    async loadVentasData() {

        try {
            // Verificar caché primero
            if (window.dataManager && window.dataManager.isCacheValid('ventas')) {
                console.log('📦 Usando datos en caché para ventas');
                const cachedData = window.dataManager.dataCache.ventas.data;
                
                if (!cachedData || cachedData.length === 0) {
                    this.showNoDataState();
                    return;
                }
                
                this.currentData = cachedData;
                this.filteredData = [...cachedData];
                this.displayVentasData();
                return;
            }
            
            // Cargar desde Firebase
            console.log('🔄 Cargando ventas desde Firebase...');
            this.showLoadingState();
            
            if (!window.firebaseService) {
                throw new Error('FirebaseService no disponible');
            }

            const data = await window.firebaseService.loadVentasData();
            
            if (!data || data.length === 0) {
                this.showNoDataState();
                console.log('ℹ️ No se encontraron ventas');
                return;
            }
            
            // Guardar en caché
            if (window.dataManager) {
                window.dataManager.updateCache('ventas', data);
            }
            
            this.currentData = data;
            this.filteredData = [...data];
            this.displayVentasData();
            
            console.log(`✅ Cargadas ${data.length} ventas exitosamente`);
            
            if (window.showSuccess) {
                window.showSuccess(`Cargadas ${data.length} ventas exitosamente`);
            }
            
        } catch (error) {
            console.error('❌ Error cargando ventas:', error);
            this.showErrorState(error.message);
            
            if (window.showError) {
                window.showError('Error cargando ventas: ' + error.message);
            }
        }
    }



    // ===========================
    // ESTADOS DE UI
    // ===========================
    showLoadingState() {
        const loading = document.getElementById('ventasLoading');
        const table = document.getElementById('ventasTableContainer');
        const noData = document.getElementById('noVentasData');
        const error = document.getElementById('ventasError');

        if (loading) loading.style.display = 'flex';
        if (table) table.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (error) error.style.display = 'none';
    }

    showErrorState(errorMessage) {
        const loading = document.getElementById('ventasLoading');
        const table = document.getElementById('ventasTableContainer');
        const noData = document.getElementById('noVentasData');
        const error = document.getElementById('ventasError');

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (error) {
            error.style.display = 'block';
            error.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>Error: ${errorMessage}</span>
            `;
        }
    }

    showNoDataState() {
        const loading = document.getElementById('ventasLoading');
        const table = document.getElementById('ventasTableContainer');
        const noData = document.getElementById('noVentasData');
        const error = document.getElementById('ventasError');

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'none';
        if (error) error.style.display = 'none';
        if (noData) noData.style.display = 'block';
    }

    displayVentasData() {
        const loading = document.getElementById('ventasLoading');
        const table = document.getElementById('ventasTableContainer');
        const noData = document.getElementById('noVentasData');
        const error = document.getElementById('ventasError');

        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (table) table.style.display = 'block';


        const lastUpdateElement = document.getElementById('ventasLastUpdate');
        if (lastUpdateElement && window.dataManager) {
            lastUpdateElement.textContent = window.dataManager.getLastUpdateText('ventas');
        }

        this.populateVentasTable();
    }

    // ===========================
    // TABLA DE DATOS
    // ===========================
    populateVentasTable() {
        const tbody = document.getElementById('ventasTableBody');
        if (!tbody) {
            console.error('❌ Tabla ventasTableBody no encontrada');
            return;
        }

        tbody.innerHTML = '';

        this.filteredData.forEach((venta, index) => {
            const row = document.createElement('tr');
            
            const totalPasajeros = (venta.adultos || 0) + (venta.ninos || 0);
            const precioFormateado = `$${(venta.precio || 0).toLocaleString('es-CO')}`;
            
            row.innerHTML = `
                <td class="text-center"><strong>${index + 1}</strong></td>
                <td><strong>${venta.nombre || 'N/A'}</strong></td>
                <td>${venta.documento || 'N/A'}</td>
                <td>
                    <span class="category-badge">
                        ${venta.embarcacion || 'N/A'}
                    </span>
                </td>
                <td>${venta.fecha || 'N/A'}</td>
                <td class="text-center">${venta.adultos || 0}</td>
                <td class="text-center">${venta.ninos || 0}</td>
                <td class="text-center"><strong style="color: #06b6d4;">${totalPasajeros}</strong></td>
                <td><strong style="color: #10b981;">${precioFormateado}</strong></td>
                <td>${venta.email || 'N/A'}</td>
                <td>${venta.telefono || 'N/A'}</td>
            `;
            
            tbody.appendChild(row);
        });

        console.log(`✅ Tabla poblada con ${this.filteredData.length} registros`);
    }





    // ===========================
    // MÉTODOS PÚBLICOS
    // ===========================
    getFilteredData() {
        return this.filteredData;
    }

    getCurrentData() {
        return this.currentData;
    }

    // ===========================
    // MÉTODOS PARA FILTROS
    // ===========================
    getActiveFilters() {
        return this.activeFilters;
    }

    hasActiveFilters() {
        return this.activeFilters.search !== '' || this.activeFilters.date !== '';
    }

    setFilter(filterKey, value) {
        this.activeFilters[filterKey] = value;
        this.applyVentasFilters();
    }
}



// Crear instancia global inmediatamente
const salesManager = new SalesManager();

// Hacer disponible globalmente
window.salesManager = salesManager;

