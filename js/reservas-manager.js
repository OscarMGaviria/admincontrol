// ===========================
// GESTOR DE MÓDULO DE RESERVAS - VERSIÓN CON FILTROS
// ===========================

class ReservasManager {
    constructor() {
        this.currentData = [];
        this.filteredData = [];
        this.activeFilters = {
            search: '',
            estado: '',
            categoria: '',
            date: ''
        };
        console.log('📋 ReservasManager inicializado');
    }

    // ===========================
    // MÉTODO PRINCIPAL
    // ===========================
    async openReservasModal() {
        console.log('🔍 Abriendo modal de reservas...');
        
        const modal = document.getElementById('reservasOverlay');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Modal de reservas mostrado');
            
            this.setupExportButtons();
            this.setupReservasFilters();
            
            setTimeout(() => {
                this.loadReservasData();
            }, 500);
        } else {
            console.error('❌ Modal reservasOverlay no encontrado');
            if (window.showError) {
                window.showError('Modal de reservas no encontrado en el HTML');
            }
        }
    }

    closeReservasModal() {
        const modal = document.getElementById('reservasOverlay');
        if (modal) {
            modal.style.display = 'none';
            console.log('✅ Modal de reservas cerrado');
        }
    }

    // ===========================
    // CONFIGURACIÓN DE FILTROS
    // ===========================
    setupReservasFilters() {
        console.log('🔍 Configurando filtros de reservas...');
        
        const searchFilter = document.getElementById('searchReservasFilter');
        const estadoFilter = document.getElementById('estadoReservasFilter');
        const categoriaFilter = document.getElementById('categoriaReservasFilter');
        const dateFilter = document.getElementById('dateReservasFilter');
        const clearBtn = document.getElementById('clearReservasFilters');
        
        // Establecer filtro de fecha por defecto (hoy)
        if (dateFilter && !dateFilter.value) {
            const today = new Date().toISOString().slice(0, 10);
            dateFilter.value = today;
            this.activeFilters.date = today;
            console.log('📅 Filtro de fecha establecido por defecto:', today);
        }
        
        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.activeFilters.search = e.target.value;
                this.applyReservasFilters();
            });
        }
        
        if (estadoFilter) {
            estadoFilter.addEventListener('change', (e) => {
                this.activeFilters.estado = e.target.value;
                this.applyReservasFilters();
            });
        }
        
        if (categoriaFilter) {
            categoriaFilter.addEventListener('change', (e) => {
                this.activeFilters.categoria = e.target.value;
                this.applyReservasFilters();
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.activeFilters.date = e.target.value;
                this.applyReservasFilters();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearReservasFilters();
            });
        }
        
        console.log('✅ Filtros de reservas configurados');
    }

    applyReservasFilters() {
        console.log('🔍 Aplicando filtros de reservas:', this.activeFilters);
        
        this.filteredData = this.currentData.filter(reserva => {
            // Filtro de búsqueda
            if (this.activeFilters.search) {
                const searchTerm = this.activeFilters.search.toLowerCase();
                const matchesSearch = 
                    (reserva.NOMBRE && reserva.NOMBRE.toLowerCase().includes(searchTerm)) ||
                    (reserva.DOCUMENTO && reserva.DOCUMENTO.toString().includes(searchTerm)) ||
                    (reserva.EMPRESA && reserva.EMPRESA.toLowerCase().includes(searchTerm));
                
                if (!matchesSearch) return false;
            }
            
            // Filtro de estado
            if (this.activeFilters.estado) {
                const estado = reserva.usado ? 'usado' : 'pendiente';
                if (estado !== this.activeFilters.estado) return false;
            }
            
            // Filtro de categoría
            if (this.activeFilters.categoria) {
                if (!reserva.CATEGORIA || reserva.CATEGORIA.toLowerCase() !== this.activeFilters.categoria.toLowerCase()) {
                    return false;
                }
            }
            
            // Filtro de fecha
            if (this.activeFilters.date) {
                if (!reserva['fecha-hora']) return false;
                
                try {
                    let reservaFecha = '';
                    if (reserva['fecha-hora'].toDate) {
                        reservaFecha = reserva['fecha-hora'].toDate().toISOString().slice(0, 10);
                    } else if (reserva['fecha-hora'] instanceof Date) {
                        reservaFecha = reserva['fecha-hora'].toISOString().slice(0, 10);
                    } else {
                        reservaFecha = new Date(reserva['fecha-hora']).toISOString().slice(0, 10);
                    }
                    
                    if (reservaFecha !== this.activeFilters.date) return false;
                } catch (error) {
                    console.warn('Error procesando fecha:', reserva['fecha-hora'], error);
                    return false;
                }
            }
            
            return true;
        });
        
        this.populateReservasTable();
        this.updateReservasStats();
        
        console.log(`📊 Filtros aplicados: ${this.filteredData.length}/${this.currentData.length} reservas`);
    }

    clearReservasFilters() {
        console.log('🧹 Limpiando filtros de reservas...');
        
        this.activeFilters = {
            search: '',
            estado: '',
            categoria: '',
            date: ''
        };
        
        // Limpiar campos UI
        const searchFilter = document.getElementById('searchReservasFilter');
        const estadoFilter = document.getElementById('estadoReservasFilter');
        const categoriaFilter = document.getElementById('categoriaReservasFilter');
        const dateFilter = document.getElementById('dateReservasFilter');
        
        if (searchFilter) searchFilter.value = '';
        if (estadoFilter) estadoFilter.selectedIndex = 0;
        if (categoriaFilter) categoriaFilter.selectedIndex = 0;
        if (dateFilter) dateFilter.value = '';
        
        // Restaurar datos completos
        this.filteredData = [...this.currentData];
        this.populateReservasTable();
        this.updateReservasStats();
        
        if (window.showSuccess) {
            window.showSuccess('Filtros de reservas limpiados');
        }
    }

    populateCategoriaFilter() {
        const categorySelect = document.getElementById('categoriaReservasFilter');
        if (!categorySelect || !this.currentData) return;
        
        console.log('🏷️ Poblando selector de categorías de reservas...');
        
        // Limpiar opciones existentes (excepto la primera)
        while (categorySelect.options.length > 1) {
            categorySelect.removeChild(categorySelect.lastChild);
        }
        
        // Extraer categorías únicas
        const categories = new Set();
        this.currentData.forEach(reserva => {
            if (reserva.CATEGORIA && reserva.CATEGORIA.trim()) {
                categories.add(reserva.CATEGORIA.trim());
            }
        });
        
        // Convertir a array y ordenar
        const sortedCategories = Array.from(categories).sort();
        
        // Agregar cada categoría como opción
        sortedCategories.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.toLowerCase();
            option.textContent = categoria;
            categorySelect.appendChild(option);
        });
        
        console.log(`✅ Selector poblado con ${sortedCategories.length} categorías`);
    }

    // ===========================
    // CARGA DE DATOS
    // ===========================
    async loadReservasData() {
        console.log('📊 Iniciando carga de reservas...');
        
        try {
            // Verificar caché primero
            if (window.dataManager && window.dataManager.isCacheValid('reservas')) {
                console.log('📦 Usando datos en caché para reservas');
                const cachedData = window.dataManager.dataCache.reservas.data;
                
                if (!cachedData || cachedData.length === 0) {
                    this.showNoDataState();
                    return;
                }
                
                this.currentData = cachedData;
                this.populateCategoriaFilter();
                this.applyReservasFilters(); // Aplicar filtros automáticamente
                this.displayReservasData();
                
                console.log(`📦 Reservas cargadas desde caché: ${cachedData.length} registros`);
                return;
            }
            
            // Solo cargar desde Firebase si NO hay caché válido
            console.log('🔄 No hay caché, cargando reservas desde Firebase...');
            this.showLoadingState();
            
            if (!window.firebaseService) {
                throw new Error('FirebaseService no disponible');
            }

            const data = await window.firebaseService.loadReservasData();
            
            if (!data || data.length === 0) {
                this.showNoDataState();
                console.log('ℹ️ No se encontraron reservas');
                return;
            }
            
            // Guardar en caché
            if (window.dataManager) {
                window.dataManager.updateCache('reservas', data);
            }
            
            this.currentData = data;
            this.populateCategoriaFilter();
            this.applyReservasFilters(); // Aplicar filtros automáticamente
            this.displayReservasData();
            
            console.log(`✅ Cargadas ${data.length} reservas exitosamente`);
            
            if (window.showSuccess) {
                window.showSuccess(`Cargadas ${data.length} reservas exitosamente`);
            }
            
        } catch (error) {
            console.error('❌ Error cargando reservas:', error);
            this.showErrorState(error.message);
            
            if (window.showError) {
                window.showError('Error cargando reservas: ' + error.message);
            }
        }
    }

    // ===========================
    // ESTADOS DE UI
    // ===========================
    showLoadingState() {
        const loading = document.getElementById('reservasLoading');
        const table = document.getElementById('reservasTableContainer');
        const noData = document.getElementById('noReservasData');
        const error = document.getElementById('reservasError');

        if (loading) loading.style.display = 'flex';
        if (table) table.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (error) error.style.display = 'none';
    }

    showErrorState(errorMessage) {
        const loading = document.getElementById('reservasLoading');
        const table = document.getElementById('reservasTableContainer');
        const noData = document.getElementById('noReservasData');
        const error = document.getElementById('reservasError');

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
        const loading = document.getElementById('reservasLoading');
        const table = document.getElementById('reservasTableContainer');
        const noData = document.getElementById('noReservasData');
        const error = document.getElementById('reservasError');

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'none';
        if (error) error.style.display = 'none';
        if (noData) noData.style.display = 'block';
    }

    displayReservasData() {
        const loading = document.getElementById('reservasLoading');
        const table = document.getElementById('reservasTableContainer');
        const noData = document.getElementById('noReservasData');
        const error = document.getElementById('reservasError');

        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (table) table.style.display = 'block';

        const lastUpdateElement = document.getElementById('reservasLastUpdate');
        if (lastUpdateElement && window.dataManager) {
            lastUpdateElement.textContent = window.dataManager.getLastUpdateText('reservas');
        }

        this.populateReservasTable();
    }

    // ===========================
    // TABLA DE DATOS
    // ===========================
    populateReservasTable() {
        const tbody = document.getElementById('reservasTableBody');
        if (!tbody) {
            console.error('❌ Tabla reservasTableBody no encontrada');
            return;
        }

        tbody.innerHTML = '';

        this.filteredData.forEach((reserva, index) => {
            const row = document.createElement('tr');
            
            // Formatear fechas
            const formatearFecha = (fecha) => {
                if (!fecha) return 'N/A';
                try {
                    if (fecha.toDate) {
                        return fecha.toDate().toLocaleString('es-CO');
                    } else if (fecha instanceof Date) {
                        return fecha.toLocaleString('es-CO');
                    } else {
                        return new Date(fecha).toLocaleString('es-CO');
                    }
                } catch (e) {
                    return 'N/A';
                }
            };

            const fechaReserva = formatearFecha(reserva['fecha-hora']);
            const fechaSalida = formatearFecha(reserva['fecha_hora_salida']);
            
            // Estado de la reserva
            const estado = reserva.usado ? 
                '<span class="status-badge usado">Usado</span>' : 
                '<span class="status-badge pendiente">Pendiente</span>';
            
            row.innerHTML = `
                <td class="text-center"><strong>${index + 1}</strong></td>
                <td><strong>${reserva.NOMBRE || 'N/A'}</strong></td>
                <td>${reserva.DOCUMENTO || 'N/A'}</td>
                <td>${reserva.EMPRESA || 'N/A'}</td>
                <td>
                    <span class="category-badge category-${(reserva.CATEGORIA || '').toLowerCase()}">
                        ${reserva.CATEGORIA || 'N/A'}
                    </span>
                </td>
                <td class="text-center"><strong style="color: #06b6d4;">${reserva.PASAJEROS || 0}</strong></td>
                <td>${fechaReserva}</td>
                <td>${fechaSalida}</td>
                <td class="text-center">${estado}</td>
            `;
            
            tbody.appendChild(row);
        });

        console.log(`✅ Tabla de reservas poblada con ${this.filteredData.length} registros`);
    }

    // ===========================
    // ESTADÍSTICAS
    // ===========================
    updateReservasStats() {
        const stats = this.calculateStats(this.filteredData);
        
        const totalReservasCount = document.getElementById('totalReservasCount');
        const totalPasajerosReservas = document.getElementById('totalPasajerosReservas');
        const reservasPendientes = document.getElementById('reservasPendientes');
        const reservasUsadas = document.getElementById('reservasUsadas');

        if (totalReservasCount) totalReservasCount.textContent = stats.totalReservas;
        if (totalPasajerosReservas) totalPasajerosReservas.textContent = stats.totalPasajeros;
        if (reservasPendientes) reservasPendientes.textContent = stats.pendientes;
        if (reservasUsadas) reservasUsadas.textContent = stats.usadas;

        console.log('📊 Estadísticas de reservas actualizadas:', stats);
    }

    calculateStats(data) {
        if (!data || data.length === 0) {
            return { totalReservas: 0, totalPasajeros: 0, pendientes: 0, usadas: 0 };
        }

        const totalReservas = data.length;
        const totalPasajeros = data.reduce((sum, reserva) => sum + (reserva.PASAJEROS || 0), 0);
        const pendientes = data.filter(reserva => !reserva.usado).length;
        const usadas = data.filter(reserva => reserva.usado).length;

        return { totalReservas, totalPasajeros, pendientes, usadas };
    }

    // ===========================
    // CONFIGURACIÓN DE BOTONES
    // ===========================
    setupExportButtons() {
        const excelExportBtn = document.getElementById('excelReservasBtn');
        const pdfExportBtn = document.getElementById('pdfReservasBtn');
        const refreshBtn = document.getElementById('refreshReservasBtn');
        
        if (excelExportBtn) {
            excelExportBtn.replaceWith(excelExportBtn.cloneNode(true));
            const newExcelBtn = document.getElementById('excelReservasBtn');
            newExcelBtn.addEventListener('click', () => {
                this.exportReservasToExcel();
            });
            console.log('✅ Event listener Excel export configurado');
        }
        
        if (pdfExportBtn) {
            pdfExportBtn.replaceWith(pdfExportBtn.cloneNode(true));
            const newPdfBtn = document.getElementById('pdfReservasBtn');
            newPdfBtn.addEventListener('click', () => {
                this.exportReservasToPDF();
            });
            console.log('✅ Event listener PDF export configurado');
        }

        if (refreshBtn) {
            refreshBtn.replaceWith(refreshBtn.cloneNode(true));
            const newRefreshBtn = document.getElementById('refreshReservasBtn');
            newRefreshBtn.addEventListener('click', () => {
                console.log('🔄 Refrescando datos de reservas...');
                if (window.dataManager) {
                    window.dataManager.refreshCache('reservas');
                }
                if (window.showInfo) {
                    window.showInfo('Recargando datos de reservas...');
                }
            });
            console.log('✅ Event listener Refresh configurado');
        }
    }

    // ===========================
    // EXPORTACIÓN DE DATOS FILTRADOS
    // ===========================
    exportReservasToExcel() {
        try {
            console.log('📊 Exportando reservas filtradas a Excel...');
            
            if (!this.filteredData || this.filteredData.length === 0) {
                if (window.showError) {
                    window.showError('No hay datos de reservas para exportar con los filtros actuales');
                }
                return;
            }
            
            if (typeof XLSX === 'undefined') {
                if (window.showError) {
                    window.showError('Librería Excel no disponible');
                }
                return;
            }
            
            if (window.showInfo) {
                window.showInfo('Generando archivo Excel...');
            }
            
            // Preparar datos para Excel
            const excelData = this.prepareReservasDataForExcel(this.filteredData);
            
            // Crear libro de Excel
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            
            // Configurar anchos de columna
            ws['!cols'] = [
                { wch: 5 },   // No.
                { wch: 25 },  // Nombre
                { wch: 15 },  // Documento
                { wch: 20 },  // Empresa
                { wch: 18 },  // Categoría
                { wch: 12 },  // Pasajeros
                { wch: 20 },  // Fecha Reserva
                { wch: 20 },  // Fecha Salida
                { wch: 12 },  // Estado
            ];
            
            // Agregar hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, 'Reservas Filtradas');
            
            // Generar nombre de archivo con información de filtros
            let filename = 'reservas-filtradas';
            if (this.activeFilters.date) {
                filename += `-${this.activeFilters.date}`;
            }
            if (this.activeFilters.estado) {
                filename += `-${this.activeFilters.estado}`;
            }
            filename += `.xlsx`;
            
            // Descargar archivo
            XLSX.writeFile(wb, filename);
            
            if (window.showSuccess) {
                window.showSuccess(`¡Archivo Excel descargado: ${this.filteredData.length} reservas!`);
            }
            
            console.log('✅ Exportación Excel completada');
            
        } catch (error) {
            console.error('❌ Error exportando a Excel:', error);
            if (window.showError) {
                window.showError('Error al generar archivo Excel: ' + error.message);
            }
        }
    }

    prepareReservasDataForExcel(data) {
        return data.map((reserva, index) => {
            // Formatear fechas para Excel
            const formatearFecha = (fecha) => {
                if (!fecha) return 'N/A';
                try {
                    if (fecha.toDate) {
                        return fecha.toDate().toLocaleString('es-CO');
                    } else if (fecha instanceof Date) {
                        return fecha.toLocaleString('es-CO');
                    } else {
                        return new Date(fecha).toLocaleString('es-CO');
                    }
                } catch (e) {
                    return 'N/A';
                }
            };

            return {
                'No.': index + 1,
                'Nombre': reserva.NOMBRE || 'N/A',
                'Documento': reserva.DOCUMENTO || 'N/A',
                'Empresa': reserva.EMPRESA || 'N/A',
                'Categoría': reserva.CATEGORIA || 'N/A',
                'Pasajeros': reserva.PASAJEROS || 0,
                'Fecha Reserva': formatearFecha(reserva['fecha-hora']),
                'Fecha Salida': formatearFecha(reserva['fecha_hora_salida']),
                'Estado': reserva.usado ? 'Usado' : 'Pendiente'
            };
        });
    }

    exportReservasToPDF() {
        // Implementación similar pero para PDF
        if (window.showInfo) {
            window.showInfo('Función PDF en desarrollo - use Excel por ahora');
        }
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

    getActiveFilters() {
        return this.activeFilters;
    }

    hasActiveFilters() {
        return this.activeFilters.search !== '' || 
               this.activeFilters.estado !== '' || 
               this.activeFilters.categoria !== '' || 
               this.activeFilters.date !== '';
    }
}

// Crear instancia global
const reservasManager = new ReservasManager();

// Hacer disponible globalmente
window.reservasManager = reservasManager;