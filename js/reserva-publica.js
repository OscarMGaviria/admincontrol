// ===========================
// GESTOR DE RESERVAS PÚBLICAS - FORMATO OFICIAL
// ===========================

class ReservaPublicaManager {
    constructor() {
        this.init();
        console.log('📅 ReservaPublicaManager inicializado');
    }

    init() {
        this.setupEventListeners();
        this.setupDateDefaults();
        this.setupConditionalFields();
    }

    setupEventListeners() {
        // Botón CTA para abrir modal
        const ctaBtn = document.getElementById('ctaBtn');
        if (ctaBtn) {
            ctaBtn.addEventListener('click', () => {
                this.openReservaModal();
            });
        }

        // Botón cerrar modal
        const closeBtn = document.getElementById('reservaPublicaModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeReservaModal();
            });
        }

        // Formulario de reserva
        const form = document.getElementById('reservaPublicaForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleReservaSubmit(e);
            });
        }

        // Cerrar modal al hacer clic en overlay
        const overlay = document.getElementById('reservaPublicaOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeReservaModal();
                }
            });
        }
    }

    setupDateDefaults() {
    // Mostrar fecha/hora actual en el campo informativo (texto readonly)
    const ahoraTxt = document.getElementById('fechaReserva');
    if (ahoraTxt) {
        const ahora = new Date();
        const f = new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium', timeStyle: 'short'
        }).format(ahora);
        ahoraTxt.value = f;
    }

    // Configurar fecha de salida mínima = ahora + 4 horas
    const salida = document.getElementById('fechaSalidaReserva');
    if (salida) {
        const min = new Date(Date.now() + 4 * 60 * 60 * 1000);
        const pad = n => String(n).padStart(2, '0');
        const local = `${min.getFullYear()}-${pad(min.getMonth()+1)}-${pad(min.getDate())}T${pad(min.getHours())}:${pad(min.getMinutes())}`;
        salida.min = local;
        if (!salida.value) salida.value = local; // sugerir valor por defecto
    }
    }


    setupConditionalFields() {
        // Mostrar/ocultar campo "Otro tipo"
        const tipoSelect = document.getElementById('tipoEmbarcacionReserva');
        const otroTipoGroup = document.getElementById('otroTipoGroup');
        const otroTipoInput = document.getElementById('otroTipoReserva');
        
        if (tipoSelect && otroTipoGroup && otroTipoInput) {
            tipoSelect.addEventListener('change', (e) => {
                if (e.target.value === 'OTRO') {
                    otroTipoGroup.style.display = 'block';
                    otroTipoInput.required = true;
                } else {
                    otroTipoGroup.style.display = 'none';
                    otroTipoInput.required = false;
                    otroTipoInput.value = '';
                }
            });
        }
    }

    openReservaModal() {
        const modal = document.getElementById('reservaPublicaOverlay');
        if (modal) {
            modal.style.display = 'flex';
            
            // Pausar carrusel
            if (window.carouselManager) {
                window.carouselManager.stopCarousel();
            }
            
            // Focus en primer campo
            setTimeout(() => {
                const emailInput = document.getElementById('emailReserva');
                if (emailInput) {
                    emailInput.focus();
                }
            }, 300);

            console.log('✅ Modal de reserva pública abierto');
        }
    }

    closeReservaModal() {
        const modal = document.getElementById('reservaPublicaOverlay');
        if (modal) {
            modal.style.display = 'none';
            
            // Reanudar carrusel
            if (window.carouselManager) {
                window.carouselManager.startCarousel();
            }
            
            // Limpiar formulario
            this.resetForm();
            
            console.log('✅ Modal de reserva pública cerrado');
        }
    }

    async handleReservaSubmit(event) {
        event.preventDefault();
        
        try {
            // Validar formulario
            if (!this.validateForm()) {
                return;
            }

            // Validar tiempo de antelación (4 horas)
            if (!this.validateAdvanceTime()) {
                return;
            }

            // Obtener datos del formulario
            const reservaData = this.getFormData();
            
            // Mostrar loading
            this.setSubmitLoading(true);
            
            // Subir a Firebase
            await this.submitReserva(reservaData);
            
            // Mostrar éxito
            this.showSuccess();
            
            // Cerrar modal después de 3 segundos
            setTimeout(() => {
                this.closeReservaModal();
            }, 3000);

        } catch (error) {
            console.error('❌ Error enviando reserva:', error);
            this.showError(error.message);
        } finally {
            this.setSubmitLoading(false);
        }
    }

    validateForm() {
        const requiredFields = [
        'emailReserva',
        'empresaReserva',
        'categoriaReserva',
        'pasajerosReserva',
        'documentoReserva',
        'telefonoReserva',
        'nombreReserva',
        'fechaSalidaReserva'
        ];

        let isValid = true;

        // Validar campos básicos
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                this.showFieldError(field, 'Este campo es obligatorio');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        // Validar campo "Otro tipo" si está visible
        const tipoSelect = document.getElementById('tipoEmbarcacionReserva');
        const otroTipoInput = document.getElementById('otroTipoReserva');
        if (tipoSelect && tipoSelect.value === 'OTRO') {
            if (!otroTipoInput || !otroTipoInput.value.trim()) {
                this.showFieldError(otroTipoInput, 'Especifica el tipo de embarcación');
                isValid = false;
            }
        }

        // Validaciones específicas
        const email = document.getElementById('emailReserva');
        if (email && email.value && !this.validateEmail(email.value)) {
            this.showFieldError(email, 'Email inválido');
            isValid = false;
        }

        const telefono = document.getElementById('telefonoReserva');
        if (telefono && telefono.value && !this.validateTelefono(telefono.value)) {
            this.showFieldError(telefono, 'Número de teléfono inválido (10 dígitos)');
            isValid = false;
        }

        const pasajeros = document.getElementById('cantidadPasajerosReserva');
        if (pasajeros && (pasajeros.value < 1 || pasajeros.value > 100)) {
            this.showFieldError(pasajeros, 'Entre 1 y 100 pasajeros');
            isValid = false;
        }

        return isValid;
    }

    validateAdvanceTime() {
        const salida = document.getElementById('fechaSalidaReserva');
        if (!salida || !salida.value) return false;

        // Parsear datetime-local COMO LOCAL (no UTC)
        const parseLocal = (val) => {
            // Espera "YYYY-MM-DDTHH:mm" o "YYYY-MM-DDTHH:mm:ss"
            const [fecha, hora] = val.split('T');
            if (!fecha || !hora) return null;
            const [Y, M, D] = fecha.split('-').map(Number);
            const partesHora = hora.split(':').map(Number);
            const h = partesHora[0] ?? 0;
            const m = partesHora[1] ?? 0;
            const s = partesHora[2] ?? 0;
            return new Date(Y, M - 1, D, h, m, s, 0); // LOCAL
        };

        const fechaSalida = parseLocal(salida.value);
        if (!fechaSalida || isNaN(fechaSalida.getTime())) {
            this.showError('Fecha de salida no válida');
            this.showFieldError(salida, 'Formato inválido');
            return false;
        }

        // Normalizar "ahora" al minuto exacto (sin seg/miliseg)
        const now = new Date();
        const nowTrim = new Date(
            now.getFullYear(), now.getMonth(), now.getDate(),
            now.getHours(), now.getMinutes(), 0, 0
        );

        // ---- DEBUG: imprime para verificar qué se está comparando ----
        console.log('[Reserva] ahora=', now.toString(), 'nowTrim=', nowTrim.toString());
        console.log('[Reserva] salida.value=', salida.value, 'fechaSalida(local)=', fechaSalida.toString());

        // Comparar directamente en MILISEGUNDOS contra 4 horas (no usar floor/ceil)
        const diffMs = fechaSalida.getTime() - nowTrim.getTime();
        const cuatroHorasMs = 4 * 60 * 60 * 1000;

        console.log('[Reserva] diffMs=', diffMs, 'equivMin=', diffMs / 60000);

        if (diffMs < cuatroHorasMs) {
            this.showError('La reserva debe hacerse con al menos 4 horas de antelación');
            this.showFieldError(salida, 'Mínimo 4 horas de antelación');
            return false;
        }

        // (Opcional) también respetar el atributo min del input, si existe
        if (salida.min) {
            const minLocal = parseLocal(salida.min);
            if (minLocal) {
            const diffVsMin = fechaSalida.getTime() - minLocal.getTime();
            console.log('[Reserva] min=', salida.min, 'minLocal=', minLocal.toString(), 'diffVsMin(ms)=', diffVsMin);
            if (diffVsMin < 0) {
                this.showError('Selecciona una hora igual o posterior al mínimo sugerido');
                this.showFieldError(salida, 'Debe ser posterior al mínimo');
                return false;
            }
            }
        }

        this.clearFieldError(salida);
        return true;
    }




    getFormData() {
    const email = document.getElementById('emailReserva').value.trim();
    const empresa = document.getElementById('empresaReserva').value.trim();
    const categoria = document.getElementById('categoriaReserva').value;
    const pasajeros = parseInt(document.getElementById('pasajerosReserva').value, 10);
    const documento = parseInt(document.getElementById('documentoReserva').value, 10);
    const telefono = document.getElementById('telefonoReserva').value.trim();
    const nombre = document.getElementById('nombreReserva').value.trim();
    const fechaSalida = document.getElementById('fechaSalidaReserva').value; // ISO local

    return {
        email,
        telefono,
        EMPRESA: empresa,
        CATEGORIA: categoria,
        PASAJEROS: pasajeros,
        NOMBRE: nombre,
        DOCUMENTO: documento,
        'fecha-hora': new Date(),                // cuando se crea la reserva
        'fecha_hora_salida': new Date(fechaSalida), // salida solicitada
        usado: false,
        timestamp: new Date(),
        origen: 'web-publica-oficial'
    };
    }



    async submitReserva(reservaData) {
        console.log('📤 Enviando reserva oficial a Firebase:', reservaData);

        // Importar Firebase
        const { collection, addDoc, getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        // Verificar que Firebase esté inicializado
        if (!window.appState?.isFirebaseInitialized) {
            throw new Error('Sistema no disponible. Intente más tarde.');
        }

        const app = getApp();
        const db = getFirestore(app);
        const reservasRef = collection(db, 'Reservas');

        // Subir reserva
        const docRef = await addDoc(reservasRef, reservaData);
        
        console.log('✅ Reserva oficial creada con ID:', docRef.id);
        
        // Invalidar caché de reservas para que se actualice
        if (window.dataManager) {
            window.dataManager.invalidateCache('reservas');
        }

        return docRef.id;
    }

    showSuccess() {
        const form = document.getElementById('reservaPublicaForm');
        const successHtml = `
            <div class="form-success">
                <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 12px;"></i>
                <h3>¡Reserva Enviada Exitosamente!</h3>
                <p>Su reserva ha sido registrada en el sistema oficial. Recibirá confirmación por correo electrónico en las próximas horas.</p>
                <p><strong>Recuerde:</strong> Debe presentarse con 30 minutos de antelación en el muelle.</p>
            </div>
        `;
        
        form.innerHTML = successHtml;
    }

    showError(message) {
        // Eliminar errores anteriores
        const existingError = document.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }

        const form = document.getElementById('reservaPublicaForm');
        const errorHtml = `
            <div class="form-error">
                <i class="fas fa-exclamation-triangle"></i>
                Error: ${message}
            </div>
        `;
        
        form.insertAdjacentHTML('beforeend', errorHtml);
    }

    showFieldError(field, message) {
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

    clearFieldError(field) {
        if (!field) return;
        
        field.style.borderColor = '';
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    setSubmitLoading(loading) {
        const btn = document.getElementById('reservaSubmitBtn');
        if (!btn) return;
        
        btn.disabled = loading;
        
        if (loading) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        } else {
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Reserva';
        }
    }

    resetForm() {
        const form = document.getElementById('reservaPublicaForm');
        if (form) {
            form.reset();
            this.setupDateDefaults();
            
            // Ocultar campo "Otro tipo"
            const otroTipoGroup = document.getElementById('otroTipoGroup');
            if (otroTipoGroup) {
                otroTipoGroup.style.display = 'none';
            }
            
            // Limpiar errores
            document.querySelectorAll('.field-error').forEach(error => error.remove());
            document.querySelectorAll('.form-error').forEach(error => error.remove());
            document.querySelectorAll('.form-success').forEach(success => success.remove());
            
            // Restaurar estilos
            document.querySelectorAll('.form-input').forEach(input => {
                input.style.borderColor = '';
            });
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validateTelefono(telefono) {
        // Validar que tenga 10 dígitos y solo números
        const re = /^[0-9]{10}$/;
        return re.test(telefono.replace(/\s/g, ''));
    }
}

// Crear instancia global
const reservaPublicaManager = new ReservaPublicaManager();

// Hacer disponible globalmente
window.reservaPublicaManager = reservaPublicaManager;