// ===========================
// COMPONENTES DE INTERFAZ
// ===========================

import { CONSTANTS, utils } from './config.js';
import { showSuccess, showError, showInfo } from './notifications.js';

class UIManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        
        this.init();
    }

    init() {
        this.setupModalElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    // ===========================
    // CONFIGURACIÓN DE MODALES
    // ===========================
    setupModalElements() {
        // Registrar modales principales
        Object.entries(CONSTANTS.MODALS).forEach(([key, modalId]) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                this.modals.set(modalId, {
                    element: modal,
                    overlay: modal,
                    closeButtons: modal.querySelectorAll('.modal-close'),
                    isOpen: false
                });
                
                this.setupModalControls(modalId);
            }
        });
    }

    setupModalControls(modalId) {
        const modalData = this.modals.get(modalId);
        if (!modalData) return;

        const { element, closeButtons } = modalData;

        // Botones de cerrar
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.hideModal(modalId));
        });

        // Cerrar al hacer clic en el overlay
        element.addEventListener('click', (e) => {
            if (e.target === element) {
                this.hideModal(modalId);
            }
        });

        // Prevenir cierre al hacer clic en el contenido del modal
        const modalContent = element.querySelector('.login-modal, .zarpes-modal');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // ===========================
    // GESTIÓN DE MODALES
    // ===========================
    showModal(modalId, options = {}) {
        const modalData = this.modals.get(modalId);
        if (!modalData) {
            console.error(`Modal ${modalId} no encontrado`);
            return false;
        }

        // Cerrar modal activo si existe
        if (this.activeModal && this.activeModal !== modalId) {
            this.hideModal(this.activeModal);
        }

        const { element } = modalData;
        
        // Configurar opciones
        const {
            backdrop = true,
            keyboard = true,
            focus = true
        } = options;

        // Mostrar modal
        element.style.display = 'flex';
        modalData.isOpen = true;
        this.activeModal = modalId;

        // Disparar evento personalizado
        const event = new CustomEvent('modalopen', { 
            detail: { modalId, options } 
        });
        document.dispatchEvent(event);

        // Focus automático si está habilitado
        if (focus) {
            setTimeout(() => {
                const focusElement = element.querySelector('input[type="email"], input[type="text"], button');
                if (focusElement) {
                    focusElement.focus();
                }
            }, 300);
        }

        // Añadir clase al body para prevenir scroll
        document.body.classList.add('modal-open');

        // Añadir clase al body para prevenir scroll
        document.body.classList.add('modal-open');

        // Bloquear scroll del body
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = this.getScrollbarWidth() + 'px';
        document.documentElement.style.overflow = 'hidden';

        return true;
    }


    hideModal(modalId) {
        const modalData = this.modals.get(modalId);
        if (!modalData || !modalData.isOpen) return false;

        const { element } = modalData;
        
        // Ocultar modal
        element.style.display = 'none';
        modalData.isOpen = false;

        // Limpiar modal activo si es el mismo
        if (this.activeModal === modalId) {
            this.activeModal = null;
        }

        // Disparar evento personalizado
        const event = new CustomEvent('modalclose', { 
            detail: { modalId } 
        });
        document.dispatchEvent(event);

        // MEJORAR ESTA SECCIÓN
        // Verificar si quedan modales abiertos
        const remainingOpenModals = Array.from(this.modals.values()).filter(modal => modal.isOpen);
    
        
        // Solo restaurar scroll si NO hay modales abiertos
        if (remainingOpenModals.length === 0) {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            document.documentElement.style.overflow = '';
            document.body.classList.remove('modal-open');
        } 

        return true;
    }



    hideAllModals() {
        this.modals.forEach((modalData, modalId) => {
            if (modalData.isOpen) {
                this.hideModal(modalId);
            }
        });
        // Asegurar que el scroll se restaure completamente
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        document.body.classList.remove('modal-open');
    }


    // ===========================
    // UTILIDAD PARA SCROLLBAR
    // ===========================
    getScrollbarWidth() {
        // Crear elemento temporal para medir scrollbar
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        outer.style.msOverflowStyle = 'scrollbar';
        document.body.appendChild(outer);
        
        const inner = document.createElement('div');
        outer.appendChild(inner);
        
        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        
        outer.parentNode.removeChild(outer);
        
        return scrollbarWidth;
    }

    isModalOpen(modalId) {
        const modalData = this.modals.get(modalId);
        return modalData ? modalData.isOpen : false;
    }

    // ===========================
    // ESTADOS DE LOADING
    // ===========================
    showLoadingState(containerId, message = 'Cargando...') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }

    showErrorState(containerId, message, retryCallback = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let retryButton = '';
        if (retryCallback) {
            const retryId = utils.generateId();
            retryButton = `
                <button onclick="${retryCallback}" id="${retryId}" style="
                    background: #06b6d4; 
                    border: none; 
                    padding: 8px 16px; 
                    border-radius: 6px; 
                    color: white; 
                    cursor: pointer;
                    margin-top: 15px;
                ">
                    <i class="fas fa-retry"></i> Reintentar
                </button>
            `;
        }

        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>Error:</strong><br>
                    ${message}
                    ${retryButton}
                </div>
            </div>
        `;
    }

    showNoDataState(containerId, title = 'No hay datos disponibles', message = 'No se encontraron registros') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    // ===========================
    // ACTUALIZACIÓN DE CONTADORES
    // ===========================
    updateCollectionCount(elementId, count, animated = true) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (animated && typeof count === 'number') {
            this.animateNumber(element, parseInt(element.textContent) || 0, count);
        } else {
            element.textContent = count;
        }
    }

    animateNumber(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const difference = end - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Función de easing
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(start + (difference * easeOutQuart));
            
            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // ===========================
    // BADGES Y ELEMENTOS DINÁMICOS
    // ===========================
    createCategoryBadge(categoria) {
        if (!categoria) return '<span class="category-badge category-sin-categoria">Sin categoría</span>';
        
        const badgeClass = utils.getCategoryBadgeClass(categoria);
        return `<span class="category-badge ${badgeClass}">${categoria}</span>`;
    }

    formatCurrency(amount) {
        return utils.formatCurrency(amount);
    }

    formatDate(date) {
        return utils.formatDate(date);
    }

    // ===========================
    // UTILIDADES DE TABLA
    // ===========================
    createTableRow(data, columns) {
        const row = document.createElement('tr');
        
        columns.forEach(column => {
            const cell = document.createElement('td');
            let content = data[column.key] || '';
            
            // Aplicar formateo según el tipo de columna
            switch (column.type) {
                case 'currency':
                    content = this.formatCurrency(content);
                    break;
                case 'date':
                    content = this.formatDate(content);
                    break;
                case 'category':
                    content = this.createCategoryBadge(content);
                    break;
                case 'number':
                    content = typeof content === 'number' ? content.toLocaleString('es-CO') : content;
                    break;
                default:
                    content = content.toString();
            }
            
            cell.innerHTML = content;
            
            // Aplicar estilos de columna si existen
            if (column.className) {
                cell.className = column.className;
            }
            
            row.appendChild(cell);
        });
        
        return row;
    }

    populateTable(tableBodyId, data, columns) {
        const tbody = document.getElementById(tableBodyId);
        if (!tbody) return;

        // Limpiar tabla
        tbody.innerHTML = '';

        // Agregar filas
        data.forEach(item => {
            const row = this.createTableRow(item, columns);
            tbody.appendChild(row);
        });
    }

    // ===========================
    // EVENT LISTENERS GLOBALES
    // ===========================
    setupEventListeners() {
        // Botones de acceso al login
        const loginAccessBtn = document.getElementById('loginAccessBtn');
        const ctaBtn = document.getElementById('ctaBtn');
        const loginModalClose = document.getElementById('loginModalClose');

        if (loginAccessBtn) {
            loginAccessBtn.addEventListener('click', () => {
                this.showModal(CONSTANTS.MODALS.LOGIN);
            });
        }

        if (ctaBtn) {
            ctaBtn.addEventListener('click', () => {
                this.showModal(CONSTANTS.MODALS.LOGIN);
            });
        }

        // Botones de cierre específicos
        if (loginModalClose) {
            loginModalClose.addEventListener('click', () => {
                this.hideModal(CONSTANTS.MODALS.LOGIN);
            });
        }

        // Cerrar modales con botones específicos
        const zarpesModalClose = document.getElementById('zarpesModalClose');
        const categoriasModalClose = document.getElementById('categoriasModalClose');

        if (zarpesModalClose) {
            zarpesModalClose.addEventListener('click', () => {
                this.hideModal(CONSTANTS.MODALS.ZARPES);
            });
        }

        if (categoriasModalClose) {
            categoriasModalClose.addEventListener('click', () => {
                this.hideModal(CONSTANTS.MODALS.CATEGORIAS);
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape para cerrar modales
            if (e.key === 'Escape' && this.activeModal) {
                this.hideModal(this.activeModal);
            }

            // Enter para enviar formularios en modales
            if (e.key === 'Enter' && this.activeModal === CONSTANTS.MODALS.LOGIN) {
                const form = document.getElementById('loginForm');
                if (form && e.target.tagName !== 'BUTTON') {
                    e.preventDefault();
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    // ===========================
    // UTILIDADES DE VALIDACIÓN UI
    // ===========================
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
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

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.style.borderColor = '';
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    clearAllFieldErrors() {
        document.querySelectorAll('.field-error').forEach(error => {
            error.remove();
        });
        
        document.querySelectorAll('input, select, textarea').forEach(field => {
            field.style.borderColor = '';
        });
    }

    // ===========================
    // UTILIDADES DE SCROLL
    // ===========================
    scrollToTop(smooth = true) {
        window.scrollTo({
            top: 0,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    scrollToElement(elementId, smooth = true) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            block: 'start'
        });
    }

    // ===========================
    // CLEANUP
    // ===========================
    destroy() {
        // Restaurar scroll antes de destruir
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        document.documentElement.style.overflow = '';
        document.body.classList.remove('modal-open');
        // Cerrar todos los modales
        this.hideAllModals();
        
        // Limpiar referencias
        this.modals.clear();
        this.activeModal = null;
        
        // Remover clase del body
        document.body.classList.remove('modal-open');
        
    }

    // ===========================
    // DEBUGGING DE MODALES
    // ===========================
    getModalStatus() {
        const status = {};
        this.modals.forEach((modalData, modalId) => {
            status[modalId] = {
                isOpen: modalData.isOpen,
                display: modalData.element.style.display
            };
        });
        return {
            activeModal: this.activeModal,
            modals: status,
            bodyHasModalClass: document.body.classList.contains('modal-open'),
            bodyOverflow: document.body.style.overflow
        };
    }

}


// Crear instancia global
const uiManager = new UIManager();

// Exportar manager y métodos principales
export { uiManager };

export const showModal = (modalId, options) => {
    return uiManager.showModal(modalId, options);
};

export const hideModal = (modalId) => {
    return uiManager.hideModal(modalId);
};

export const hideAllModals = () => {
    return uiManager.hideAllModals();
};

export const showLoadingState = (containerId, message) => {
    return uiManager.showLoadingState(containerId, message);
};

export const showErrorState = (containerId, message, retryCallback) => {
    return uiManager.showErrorState(containerId, message, retryCallback);
};

export const showNoDataState = (containerId, title, message) => {
    return uiManager.showNoDataState(containerId, title, message);
};

export const updateCollectionCount = (elementId, count, animated) => {
    return uiManager.updateCollectionCount(elementId, count, animated);
};

export const createCategoryBadge = (categoria) => {
    return uiManager.createCategoryBadge(categoria);
};

export const populateTable = (tableBodyId, data, columns) => {
    return uiManager.populateTable(tableBodyId, data, columns);
};

// Hacer disponible globalmente
window.uiManager = uiManager;