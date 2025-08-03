// ===========================
// SISTEMA DE NOTIFICACIONES
// ===========================

import { CONSTANTS } from './config.js';

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.init();
    }

    init() {
        // Crear estilos para notificaciones si no existen
        if (!document.getElementById('notificationStyles')) {
            this.createNotificationStyles();
        }
    }

    createNotificationStyles() {
        const styles = document.createElement('style');
        styles.id = 'notificationStyles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(30, 41, 59, 0.95);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 3000;
                animation: slideInRight 0.3s ease;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(148, 163, 184, 0.2);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                min-width: 300px;
            }
            
            .notification.success {
                border-left: 4px solid #10b981;
            }
            
            .notification.error {
                border-left: 4px solid #ef4444;
            }
            
            .notification.info {
                border-left: 4px solid #06b6d4;
            }
            
            .notification.warning {
                border-left: 4px solid #f59e0b;
            }
            
            .notification-icon {
                font-size: 1.2rem;
                flex-shrink: 0;
            }
            
            .notification-content {
                flex: 1;
            }
            
            .notification-title {
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .notification-message {
                font-size: 0.9rem;
                opacity: 0.9;
                line-height: 1.4;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .notification.removing {
                animation: slideOutRight 0.3s ease forwards;
            }
            
            /* Responsive */
            @media (max-width: 480px) {
                .notification {
                    right: 10px;
                    left: 10px;
                    max-width: none;
                    min-width: unset;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    show(message, type = CONSTANTS.NOTIFICATION_TYPES.INFO, options = {}) {
        const {
            title = null,
            duration = 4000,
            persistent = false,
            id = null
        } = options;

        // Si ya existe una notificación con el mismo ID, no crear otra
        const notificationId = id || this.generateId();
        if (this.notifications.has(notificationId)) {
            return notificationId;
        }

        // Crear elemento de notificación
        const notification = this.createNotificationElement(
            message, 
            type, 
            title, 
            notificationId,
            persistent
        );

        // Agregar al DOM
        document.body.appendChild(notification);
        this.notifications.set(notificationId, notification);

        // Auto-remove si no es persistente
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.remove(notificationId);
            }, duration);
        }

        return notificationId;
    }

    createNotificationElement(message, type, title, id, persistent) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('data-notification-id', id);

        const icon = this.getIcon(type);
        
        let content = `
            <div class="notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${title}</div>` : ''}
                <div class="notification-message">${message}</div>
            </div>
        `;

        // Agregar botón de cerrar si es persistente o si se requiere
        if (persistent || title) {
            content += `
                <button class="notification-close" onclick="notificationManager.remove('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }

        notification.innerHTML = content;
        return notification;
    }

    getIcon(type) {
        const icons = {
            [CONSTANTS.NOTIFICATION_TYPES.SUCCESS]: 'check-circle',
            [CONSTANTS.NOTIFICATION_TYPES.ERROR]: 'exclamation-triangle',
            [CONSTANTS.NOTIFICATION_TYPES.INFO]: 'info-circle',
            [CONSTANTS.NOTIFICATION_TYPES.WARNING]: 'exclamation-circle'
        };
        return icons[type] || 'info-circle';
    }

    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        // Aplicar animación de salida
        notification.classList.add('removing');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    removeAll() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
    }

    generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Métodos de conveniencia
    success(message, options = {}) {
        return this.show(message, CONSTANTS.NOTIFICATION_TYPES.SUCCESS, options);
    }

    error(message, options = {}) {
        return this.show(message, CONSTANTS.NOTIFICATION_TYPES.ERROR, options);
    }

    info(message, options = {}) {
        return this.show(message, CONSTANTS.NOTIFICATION_TYPES.INFO, options);
    }

    warning(message, options = {}) {
        return this.show(message, CONSTANTS.NOTIFICATION_TYPES.WARNING, options);
    }

    // Notificaciones específicas del sistema
    showConnectionStatus(message, status) {
        const statusEl = document.getElementById('connectionStatus');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `connection-status ${status}`;
        statusEl.style.display = 'block';

        if (status === CONSTANTS.CONNECTION_STATUS.CONNECTED) {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }

    showLoading(message = 'Cargando...') {
        return this.show(message, CONSTANTS.NOTIFICATION_TYPES.INFO, {
            id: 'loading',
            persistent: true,
            title: null
        });
    }

    hideLoading() {
        this.remove('loading');
    }

    showRetry(message, retryCallback, options = {}) {
        const retryMessage = `
            <div>${message}</div>
            <button onclick="${retryCallback}" style="
                background: #06b6d4; 
                border: none; 
                padding: 6px 12px; 
                border-radius: 4px; 
                color: white; 
                cursor: pointer;
                margin-top: 8px;
                font-size: 0.8rem;
            ">
                <i class="fas fa-retry"></i> Reintentar
            </button>
        `;

        return this.show(retryMessage, CONSTANTS.NOTIFICATION_TYPES.ERROR, {
            ...options,
            persistent: true
        });
    }
}

// Crear instancia global
const notificationManager = new NotificationManager();

// Exportar instancia y funciones de conveniencia
export { notificationManager };

export const showNotification = (message, type, options) => {
    return notificationManager.show(message, type, options);
};

export const showSuccess = (message, options) => {
    return notificationManager.success(message, options);
};

export const showError = (message, options) => {
    return notificationManager.error(message, options);
};

export const showInfo = (message, options) => {
    return notificationManager.info(message, options);
};

export const showWarning = (message, options) => {
    return notificationManager.warning(message, options);
};

export const removeNotification = (id) => {
    return notificationManager.remove(id);
};

export const removeAllNotifications = () => {
    return notificationManager.removeAll();
};

export const showConnectionStatus = (message, status) => {
    return notificationManager.showConnectionStatus(message, status);
};

export const showLoading = (message) => {
    return notificationManager.showLoading(message);
};

export const hideLoading = () => {
    return notificationManager.hideLoading();
};

// Hacer disponible globalmente para uso en HTML
window.notificationManager = notificationManager;