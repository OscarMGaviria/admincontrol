// ===========================
// GESTOR DE MÓDULO DE VENTAS - VERSIÓN SIMPLIFICADA
// ===========================

class SalesManager {
    constructor() {
        this.currentData = [];
        this.filteredData = [];
        console.log('💰 SalesManager inicializado');
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
    // CARGA DE DATOS
    // ===========================
    async loadVentasData() {
        console.log('📊 Iniciando carga de ventas...');
        
        try {
            this.showLoadingState();
            
            // Usar firebaseService directamente sin verificaciones de usuario
            if (!window.firebaseService) {
                throw new Error('FirebaseService no disponible');
            }

            console.log('🔥 Llamando a firebase para cargar ventas...');
            const data = await window.firebaseService.loadVentasData();
            
            if (!data || data.length === 0) {
                this.showNoDataState();
                console.log('ℹ️ No se encontraron ventas');
                return;
            }
            
            this.currentData = data;
            this.filteredData = [...data];
            
            this.displayVentasData();
            this.updateVentasStats();
            
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
    // ESTADÍSTICAS SIMPLES
    // ===========================
    updateVentasStats() {
        const stats = this.calculateStats(this.filteredData);
        
        // Actualizar elementos si existen
        const totalVentasCount = document.getElementById('totalVentasCount');
        const totalPasajerosVentas = document.getElementById('totalPasajerosVentas');
        const totalIngresosVentas = document.getElementById('totalIngresosVentas');
        const promedioVentasPrecio = document.getElementById('promedioVentasPrecio');

        if (totalVentasCount) totalVentasCount.textContent = stats.totalVentas;
        if (totalPasajerosVentas) totalPasajerosVentas.textContent = stats.totalPasajeros;
        if (totalIngresosVentas) totalIngresosVentas.textContent = `$${Math.round(stats.totalIngresos/1000)}K`;
        if (promedioVentasPrecio) promedioVentasPrecio.textContent = `$${Math.round(stats.precioPromedio/1000)}K`;

        console.log('📊 Estadísticas actualizadas:', stats);
    }

    calculateStats(data) {
        if (!data || data.length === 0) {
            return { totalVentas: 0, totalPasajeros: 0, totalIngresos: 0, precioPromedio: 0 };
        }

        const totalVentas = data.length;
        const totalPasajeros = data.reduce((sum, venta) => sum + (venta.adultos || 0) + (venta.ninos || 0), 0);
        const totalIngresos = data.reduce((sum, venta) => sum + (venta.precio || 0), 0);
        const precioPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;

        return { totalVentas, totalPasajeros, totalIngresos, precioPromedio };
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
}

// Crear instancia global inmediatamente
const salesManager = new SalesManager();

// Hacer disponible globalmente
window.salesManager = salesManager;

