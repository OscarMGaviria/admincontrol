// ===========================
// SISTEMA DE FILTROS Y BÚSQUEDA
// ===========================

import { appState, utils } from './config.js';
import { showInfo } from './notifications.js';

class FilterManager {
    constructor() {
        this.activeFilters = {
            zarpes: {
                search: '',
                category: '',
                date: '',
                administrador: ''
            },
            categorias: {
                search: '',
                category: '',
                date: '',
                administrador: ''
            }
        };
        
        this.debouncedApplyFilters = utils.debounce(this.applyFilters.bind(this), 300);
        this.init();
    }

    init() {
        this.setupFilterElements();
        this.setupEventListeners();
    }

    // ===========================
    // CONFIGURACIÓN DE ELEMENTOS
    // ===========================
    setupFilterElements() {
        // Elementos de filtros para zarpes
        this.zarpesElements = {
            searchFilter: document.getElementById('searchFilter'),
            categoryFilter: document.getElementById('categoryFilter'),
            dateFilter: document.getElementById('dateFilter')
        };

        // Elementos de filtros para categorías
        this.categoriasElements = {
            searchCategoriasFilter: document.getElementById('searchCategoriasFilter'),
            categoryAnalysisFilter: document.getElementById('categoryAnalysisFilter'),
            dateCategoriasFilter: document.getElementById('dateCategoriasFilter')
        };

        // Inicializar opciones de categorías
        this.initializeCategoryOptions();
    }

    initializeCategoryOptions() {
        // Obtener categorías únicas de los datos existentes
        const categories = this.getUniqueCategories();
        
        // Actualizar select de categorías en zarpes
        if (this.zarpesElements.categoryFilter) {
            this.populateCategorySelect(this.zarpesElements.categoryFilter, categories);
        }

        // Actualizar select de análisis de categorías
        if (this.categoriasElements.categoryAnalysisFilter) {
            this.populateCategorySelect(this.categoriasElements.categoryAnalysisFilter, categories);
        }
    }

    populateCategorySelect(selectElement, categories) {
        // Mantener opción "Todas las categorías"
        const currentOptions = Array.from(selectElement.options).slice(1); // Excluir primera opción
        
        // Limpiar opciones existentes excepto la primera
        while (selectElement.options.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }

        // Agregar categorías únicas
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selectElement.appendChild(option);
        });
    }

    getUniqueCategories() {
        const allData = [...appState.zarpesData, ...appState.categoriasData];
        const categories = new Set();
        
        allData.forEach(item => {
            if (item.categoria && item.categoria.trim()) {
                categories.add(item.categoria.trim());
            }
        });
        
        return Array.from(categories).sort();
    }

    // ===========================
    // EVENT LISTENERS
    // ===========================
    setupEventListeners() {
        // Filtros de zarpes
        if (this.zarpesElements.searchFilter) {
            this.zarpesElements.searchFilter.addEventListener('input', () => {
                this.updateFilter('zarpes', 'search', this.zarpesElements.searchFilter.value);
                this.debouncedApplyFilters('zarpes');
            });
        }

        if (this.zarpesElements.categoryFilter) {
            this.zarpesElements.categoryFilter.addEventListener('change', () => {
                this.updateFilter('zarpes', 'category', this.zarpesElements.categoryFilter.value);
                this.applyFilters('zarpes');
            });
        }

        if (this.zarpesElements.dateFilter) {
            this.zarpesElements.dateFilter.addEventListener('change', () => {
                this.updateFilter('zarpes', 'date', this.zarpesElements.dateFilter.value);
                this.applyFilters('zarpes');
            });
        }

        // Filtros de categorías
        if (this.categoriasElements.searchCategoriasFilter) {
            this.categoriasElements.searchCategoriasFilter.addEventListener('input', () => {
                this.updateFilter('categorias', 'search', this.categoriasElements.searchCategoriasFilter.value);
                this.debouncedApplyFilters('categorias');
            });
        }

        if (this.categoriasElements.categoryAnalysisFilter) {
            this.categoriasElements.categoryAnalysisFilter.addEventListener('change', () => {
                this.updateFilter('categorias', 'category', this.categoriasElements.categoryAnalysisFilter.value);
                this.applyFilters('categorias');
            });
        }

        if (this.categoriasElements.dateCategoriasFilter) {
            this.categoriasElements.dateCategoriasFilter.addEventListener('change', () => {
                this.updateFilter('categorias', 'date', this.categoriasElements.dateCategoriasFilter.value);
                this.applyFilters('categorias');
            });
        }
    }

    // ===========================
    // GESTIÓN DE FILTROS
    // ===========================
    updateFilter(type, filterKey, value) {
        if (this.activeFilters[type]) {
            this.activeFilters[type][filterKey] = value;
            console.log(`🔍 Filtro ${type}.${filterKey} actualizado:`, value);
        }
    }

    applyFilters(type) {
        console.log(`🔍 Aplicando filtros para ${type}:`, this.activeFilters[type]);
        
        if (type === 'zarpes') {
            this.applyZarpesFilters();
        } else if (type === 'categorias') {
            this.applyCategoriasFilters();
        }
        
        this.updateFilteredResultsCount(type);
    }

    applyZarpesFilters() {
        const filters = this.activeFilters.zarpes;
        
        appState.filteredZarpesData = appState.zarpesData.filter(registro => {
            return this.matchesAllFilters(registro, filters);
        });

        // Actualizar tabla si está visible
        if (window.dataManager && document.getElementById('zarpesTableContainer').style.display !== 'none') {
            window.dataManager.populateZarpesTable(appState.filteredZarpesData);
        }
    }

    applyCategoriasFilters() {
        const filters = this.activeFilters.categorias;
        
        appState.filteredCategoriasData = appState.categoriasData.filter(registro => {
            return this.matchesAllFilters(registro, filters);
        });

        // Actualizar tabla si está visible
        if (window.dataManager && document.getElementById('categoriasTableContainer').style.display !== 'none') {
            window.dataManager.populateCategoriasTable(appState.filteredCategoriasData);
        }
    }

    matchesAllFilters(registro, filters) {
        // Filtro de búsqueda de texto
        if (filters.search && !this.matchesSearchFilter(registro, filters.search)) {
            return false;
        }

        // Filtro de categoría
        if (filters.category && !this.matchesCategoryFilter(registro, filters.category)) {
            return false;
        }

        // Filtro de fecha
        if (filters.date && !this.matchesDateFilter(registro, filters.date)) {
            return false;
        }

        // Filtro de administrador (si existe)
        if (filters.administrador && !this.matchesAdministradorFilter(registro, filters.administrador)) {
            return false;
        }

        return true;
    }

    matchesSearchFilter(registro, searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;

        const searchableFields = [
            registro.embarcacion,
            registro.administrador,
            registro.categoria,
            registro.embarcacionId,
            registro.posicionDesembarque
        ];

        return searchableFields.some(field => {
            return field && field.toString().toLowerCase().includes(term);
        });
    }

    matchesCategoryFilter(registro, category) {
        if (!category) return true;
        return registro.categoria === category;
    }

    matchesDateFilter(registro, dateFilter) {
        if (!dateFilter || !registro.fechaHora) return true;

        try {
            let registroDate;
            if (registro.fechaHora.toDate) {
                registroDate = registro.fechaHora.toDate().toISOString().slice(0, 10);
            } else if (registro.fechaHora instanceof Date) {
                registroDate = registro.fechaHora.toISOString().slice(0, 10);
            } else if (typeof registro.fechaHora === 'string') {
                registroDate = new Date(registro.fechaHora).toISOString().slice(0, 10);
            } else {
                return false;
            }
            
            return registroDate === dateFilter;
        } catch (error) {
            console.warn('Error comparando fechas:', error);
            return false;
        }
    }

    matchesAdministradorFilter(registro, administrador) {
        if (!administrador) return true;
        return registro.administrador === administrador;
    }

    // ===========================
    // FILTROS AVANZADOS
    // ===========================
    applyAdvancedFilters(type, advancedFilters) {
        console.log(`🔍 Aplicando filtros avanzados para ${type}:`, advancedFilters);
        
        const sourceData = type === 'zarpes' ? appState.zarpesData : appState.categoriasData;
        let filteredData = [...sourceData];

        // Filtro por rango de fechas
        if (advancedFilters.dateRange) {
            filteredData = this.filterByDateRange(filteredData, advancedFilters.dateRange);
        }

        // Filtro por rango de valores
        if (advancedFilters.valueRange) {
            filteredData = this.filterByValueRange(filteredData, advancedFilters.valueRange);
        }

        // Filtro por cantidad de pasajeros
        if (advancedFilters.passengerRange) {
            filteredData = this.filterByPassengerRange(filteredData, advancedFilters.passengerRange);
        }

        // Filtro por múltiples categorías
        if (advancedFilters.categories && advancedFilters.categories.length > 0) {
            filteredData = this.filterByMultipleCategories(filteredData, advancedFilters.categories);
        }

        // Actualizar datos filtrados
        if (type === 'zarpes') {
            appState.filteredZarpesData = filteredData;
            if (window.dataManager) {
                window.dataManager.populateZarpesTable(filteredData);
            }
        } else {
            appState.filteredCategoriasData = filteredData;
            if (window.dataManager) {
                window.dataManager.populateCategoriasTable(filteredData);
            }
        }

        this.updateFilteredResultsCount(type);
        showInfo(`Filtros avanzados aplicados: ${filteredData.length} resultados encontrados`);
    }

    filterByDateRange(data, dateRange) {
        const { start, end } = dateRange;
        
        return data.filter(item => {
            if (!item.fechaHora) return false;
            
            try {
                let itemDate;
                if (item.fechaHora.toDate) {
                    itemDate = item.fechaHora.toDate();
                } else if (item.fechaHora instanceof Date) {
                    itemDate = item.fechaHora;
                } else {
                    itemDate = new Date(item.fechaHora);
                }
                
                return itemDate >= new Date(start) && itemDate <= new Date(end);
            } catch (error) {
                return false;
            }
        });
    }

    filterByValueRange(data, valueRange) {
        const { min, max, field = 'valorTotal' } = valueRange;
        
        return data.filter(item => {
            const value = item[field] || 0;
            return value >= min && value <= max;
        });
    }

    filterByPassengerRange(data, passengerRange) {
        const { min, max } = passengerRange;
        
        return data.filter(item => {
            const passengers = item.cantidadPasajeros || 0;
            return passengers >= min && passengers <= max;
        });
    }

    filterByMultipleCategories(data, categories) {
        return data.filter(item => {
            return categories.includes(item.categoria);
        });
    }

    // ===========================
    // ESTADÍSTICAS DE FILTROS
    // ===========================
    updateFilteredResultsCount(type) {
        const count = type === 'zarpes' ? 
            appState.filteredZarpesData.length : 
            appState.filteredCategoriasData.length;
            
        console.log(`📊 Resultados filtrados (${type}): ${count}`);
        
        // Actualizar UI si existe un elemento contador
        const counterElement = document.getElementById(`${type}ResultsCount`);
        if (counterElement) {
            counterElement.textContent = count;
        }
    }

    getFilterStats(type) {
        const data = type === 'zarpes' ? appState.filteredZarpesData : appState.filteredCategoriasData;
        
        if (!data || data.length === 0) {
            return {
                total: 0,
                categories: {},
                dateRange: null,
                valueRange: null
            };
        }

        // Estadísticas por categorías
        const categories = {};
        data.forEach(item => {
            const cat = item.categoria || 'Sin categoría';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        // Rango de fechas
        const dates = data
            .map(item => {
                try {
                    if (item.fechaHora?.toDate) return item.fechaHora.toDate();
                    if (item.fechaHora instanceof Date) return item.fechaHora;
                    return new Date(item.fechaHora);
                } catch {
                    return null;
                }
            })
            .filter(date => date !== null)
            .sort((a, b) => a - b);

        const dateRange = dates.length > 0 ? {
            start: dates[0],
            end: dates[dates.length - 1]
        } : null;

        // Rango de valores
        const values = data
            .map(item => item.valorTotal || 0)
            .filter(value => value > 0)
            .sort((a, b) => a - b);

        const valueRange = values.length > 0 ? {
            min: values[0],
            max: values[values.length - 1],
            average: values.reduce((sum, val) => sum + val, 0) / values.length
        } : null;

        return {
            total: data.length,
            categories,
            dateRange,
            valueRange
        };
    }

    // ===========================
    // GESTIÓN DE FILTROS GUARDADOS
    // ===========================
    saveFilter(name, type, filters) {
        const savedFilters = this.getSavedFilters();
        savedFilters[name] = {
            type,
            filters,
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('embarcaciones_saved_filters', JSON.stringify(savedFilters));
        showInfo(`Filtro "${name}" guardado exitosamente`);
    }

    getSavedFilters() {
        try {
            const saved = localStorage.getItem('embarcaciones_saved_filters');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('Error cargando filtros guardados:', error);
            return {};
        }
    }

    loadSavedFilter(name) {
        const savedFilters = this.getSavedFilters();
        const filter = savedFilters[name];
        
        if (!filter) {
            showError(`Filtro "${name}" no encontrado`);
            return false;
        }

        // Aplicar filtros guardados
        this.activeFilters[filter.type] = { ...filter.filters };
        
        // Actualizar elementos UI
        this.updateFilterUI(filter.type, filter.filters);
        
        // Aplicar filtros
        this.applyFilters(filter.type);
        
        showInfo(`Filtro "${name}" aplicado exitosamente`);
        return true;
    }

    updateFilterUI(type, filters) {
        const elements = type === 'zarpes' ? this.zarpesElements : this.categoriasElements;
        
        // Actualizar campos de búsqueda
        if (elements.searchFilter && filters.search !== undefined) {
            elements.searchFilter.value = filters.search;
        }
        if (elements.searchCategoriasFilter && filters.search !== undefined) {
            elements.searchCategoriasFilter.value = filters.search;
        }
        
        // Actualizar selectores de categoría
        if (elements.categoryFilter && filters.category !== undefined) {
            elements.categoryFilter.value = filters.category;
        }
        if (elements.categoryAnalysisFilter && filters.category !== undefined) {
            elements.categoryAnalysisFilter.value = filters.category;
        }
        
        // Actualizar campos de fecha
        if (elements.dateFilter && filters.date !== undefined) {
            elements.dateFilter.value = filters.date;
        }
        if (elements.dateCategoriasFilter && filters.date !== undefined) {
            elements.dateCategoriasFilter.value = filters.date;
        }
    }

    deleteSavedFilter(name) {
        const savedFilters = this.getSavedFilters();
        
        if (savedFilters[name]) {
            delete savedFilters[name];
            localStorage.setItem('embarcaciones_saved_filters', JSON.stringify(savedFilters));
            showInfo(`Filtro "${name}" eliminado`);
            return true;
        }
        
        return false;
    }

    // ===========================
    // LIMPIEZA DE FILTROS
    // ===========================
    clearFilters(type) {
        console.log(`🧹 Limpiando filtros para ${type}`);
        
        // Resetear filtros activos
        this.activeFilters[type] = {
            search: '',
            category: '',
            date: '',
            administrador: ''
        };
        
        // Limpiar elementos UI
        const elements = type === 'zarpes' ? this.zarpesElements : this.categoriasElements;
        
        Object.values(elements).forEach(element => {
            if (element) {
                if (element.type === 'text' || element.type === 'date') {
                    element.value = '';
                } else if (element.tagName === 'SELECT') {
                    element.selectedIndex = 0;
                }
            }
        });
        
        // Restaurar datos originales
        if (type === 'zarpes') {
            appState.filteredZarpesData = [...appState.zarpesData];
            if (window.dataManager) {
                window.dataManager.populateZarpesTable(appState.filteredZarpesData);
            }
        } else {
            appState.filteredCategoriasData = [...appState.categoriasData];
            if (window.dataManager) {
                window.dataManager.populateCategoriasTable(appState.filteredCategoriasData);
            }
        }
        
        this.updateFilteredResultsCount(type);
        showInfo('Filtros limpiados');
    }

    clearAllFilters() {
        this.clearFilters('zarpes');
        this.clearFilters('categorias');
    }

    // ===========================
    // BÚSQUEDA INTELIGENTE
    // ===========================
    performIntelligentSearch(query, type = 'zarpes') {
        console.log(`🔍 Búsqueda inteligente: "${query}" en ${type}`);
        
        const sourceData = type === 'zarpes' ? appState.zarpesData : appState.categoriasData;
        const results = [];
        
        // Dividir query en términos
        const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        
        sourceData.forEach(item => {
            let score = 0;
            let matches = [];
            
            // Buscar en diferentes campos con diferentes pesos
            const searchFields = [
                { field: 'embarcacion', weight: 3, value: item.embarcacion },
                { field: 'categoria', weight: 2, value: item.categoria },
                { field: 'administrador', weight: 2, value: item.administrador },
                { field: 'embarcacionId', weight: 1, value: item.embarcacionId },
                { field: 'posicionDesembarque', weight: 1, value: item.posicionDesembarque }
            ];
            
            terms.forEach(term => {
                searchFields.forEach(({ field, weight, value }) => {
                    if (value && value.toString().toLowerCase().includes(term)) {
                        score += weight;
                        if (!matches.includes(field)) {
                            matches.push(field);
                        }
                    }
                });
            });
            
            if (score > 0) {
                results.push({
                    item,
                    score,
                    matches,
                    relevance: score / terms.length
                });
            }
        });
        
        // Ordenar por relevancia
        results.sort((a, b) => b.relevance - a.relevance);
        
        return results;
    }

    // ===========================
    // EXPORTACIÓN DE FILTROS
    // ===========================
    exportFilteredData(type, format = 'excel') {
        const data = type === 'zarpes' ? appState.filteredZarpesData : appState.filteredCategoriasData;
        
        if (!data || data.length === 0) {
            showError('No hay datos filtrados para exportar');
            return;
        }
        
        const filters = this.activeFilters[type];
        const activeFiltersList = Object.entries(filters)
            .filter(([key, value]) => value && value.trim())
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        
        const filename = `${type}-filtrados-${data.length}-registros`;
        
        if (window.exportService) {
            const options = {
                format,
                title: `${type} Filtrados (${data.length} registros)`,
                subtitle: activeFiltersList ? `Filtros aplicados: ${activeFiltersList}` : 'Sin filtros activos'
            };
            
            window.exportService.exportCustomData(data, filename, options);
        } else {
            showError('Servicio de exportación no disponible');
        }
    }

    // ===========================
    // ACTUALIZACIÓN AUTOMÁTICA
    // ===========================
    refreshFilters() {
        console.log('🔄 Actualizando opciones de filtros...');
        
        // Actualizar opciones de categorías
        this.initializeCategoryOptions();
        
        // Reaplicar filtros actuales
        this.applyFilters('zarpes');
        this.applyFilters('categorias');
        
        showInfo('Filtros actualizados');
    }

    // ===========================
    // MÉTODOS PÚBLICOS
    // ===========================
    getActiveFilters(type) {
        return this.activeFilters[type];
    }

    hasActiveFilters(type) {
        const filters = this.activeFilters[type];
        return Object.values(filters).some(value => value && value.trim());
    }

    getFilteredDataCount(type) {
        return type === 'zarpes' ? appState.filteredZarpesData.length : appState.filteredCategoriasData.length;
    }

    setFilter(type, filterKey, value) {
        this.updateFilter(type, filterKey, value);
        this.updateFilterUI(type, this.activeFilters[type]);
        this.applyFilters(type);
    }

    // ===========================
    // CLEANUP
    // ===========================
    destroy() {
        // Limpiar todos los filtros
        this.clearAllFilters();
        
        // Reset referencias
        this.zarpesElements = {};
        this.categoriasElements = {};
        this.activeFilters = {
            zarpes: { search: '', category: '', date: '', administrador: '' },
            categorias: { search: '', category: '', date: '', administrador: '' }
        };
        
        console.log('FilterManager destruido');
    }
}

// Crear instancia global
const filterManager = new FilterManager();

// Exportar manager y métodos principales
export { filterManager };

export const applyFilters = (type) => {
    return filterManager.applyFilters(type);
};

export const clearFilters = (type) => {
    return filterManager.clearFilters(type);
};

export const setFilter = (type, filterKey, value) => {
    return filterManager.setFilter(type, filterKey, value);
};

export const getActiveFilters = (type) => {
    return filterManager.getActiveFilters(type);
};

export const hasActiveFilters = (type) => {
    return filterManager.hasActiveFilters(type);
};

export const performIntelligentSearch = (query, type) => {
    return filterManager.performIntelligentSearch(query, type);
};

export const applyAdvancedFilters = (type, filters) => {
    return filterManager.applyAdvancedFilters(type, filters);
};

export const saveFilter = (name, type, filters) => {
    return filterManager.saveFilter(name, type, filters);
};

export const loadSavedFilter = (name) => {
    return filterManager.loadSavedFilter(name);
};

export const exportFilteredData = (type, format) => {
    return filterManager.exportFilteredData(type, format);
};

export const refreshFilters = () => {
    return filterManager.refreshFilters();
};

// Hacer disponible globalmente
window.filterManager = filterManager;