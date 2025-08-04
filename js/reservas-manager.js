// ===========================
// GESTOR DE MÓDULO DE RESERVAS
// ===========================

class ReservasManager {
    constructor() {
        this.currentData = [];
        this.filteredData = [];
        this.excelFile = null;
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
            
            // Configurar botones de exportación (método separado)
            this.setupExportButtons();
            
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
    // CARGA DE DATOS
    // ===========================
    async loadReservasData() {
        console.log('📊 Iniciando carga de reservas...');
        
        try {
            this.showLoadingState();
            
            if (!window.firebaseService) {
                throw new Error('FirebaseService no disponible');
            }

            console.log('🔥 Llamando a firebase para cargar reservas...');
            const data = await window.firebaseService.loadReservasData();
            
            if (!data || data.length === 0) {
                this.showNoDataState();
                console.log('ℹ️ No se encontraron reservas');
                return;
            }
            
            this.currentData = data;
            this.filteredData = [...data];
            
            this.displayReservasData();
            this.updateReservasStats();
            
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
        const upload = document.getElementById('reservasUploadSection');

        if (loading) loading.style.display = 'flex';
        if (table) table.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (error) error.style.display = 'none';
        if (upload) upload.style.display = 'none';
    }

    showErrorState(errorMessage) {
        const loading = document.getElementById('reservasLoading');
        const table = document.getElementById('reservasTableContainer');
        const noData = document.getElementById('noReservasData');
        const error = document.getElementById('reservasError');
        const upload = document.getElementById('reservasUploadSection');

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (upload) upload.style.display = 'none';
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
        const upload = document.getElementById('reservasUploadSection');

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'none';
        if (error) error.style.display = 'none';
        if (noData) noData.style.display = 'block';
        if (upload) upload.style.display = 'block';
    }

    displayReservasData() {
        const loading = document.getElementById('reservasLoading');
        const table = document.getElementById('reservasTableContainer');
        const noData = document.getElementById('noReservasData');
        const error = document.getElementById('reservasError');
        const upload = document.getElementById('reservasUploadSection');

        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (noData) noData.style.display = 'none';
        if (table) table.style.display = 'block';
        
        // MANTENER VISIBLE LA SECCIÓN DE UPLOAD PERO LIMPIARLA
        if (upload) {
            upload.style.display = 'block';
            // Solo limpiar la vista previa, no toda la sección
            const previewContainer = document.getElementById('excelPreview');
            if (previewContainer && previewContainer.innerHTML.includes('Vista previa del archivo')) {
                previewContainer.style.display = 'none';
                previewContainer.innerHTML = '';
            }
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
    // CONFIGURACIÓN INICIAL (SOLO UNA VEZ)
    // ===========================
    setupExcelUpload() {
        // Solo configurar upload de archivos aquí
        const fileInput = document.getElementById('excelFileInput');
        const uploadBtn = document.getElementById('uploadExcelBtn');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.uploadExcelData();
            });
        }
    }

    // NUEVO MÉTODO SEPARADO PARA EXPORTACIÓN
    setupExportButtons() {
        const excelExportBtn = document.getElementById('excelReservasBtn');
        const pdfExportBtn = document.getElementById('pdfReservasBtn');
        
        // Remover listeners anteriores si existen
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
    }

    handleFileSelect(file) {
        if (!file) return;

        if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
            file.type !== 'application/vnd.ms-excel') {
            if (window.showError) {
                window.showError('Por favor seleccione un archivo Excel válido (.xlsx o .xls)');
            }
            return;
        }

        this.excelFile = file;
        this.previewExcelFile(file);
        
        // Habilitar botón de upload
        const uploadBtn = document.getElementById('uploadExcelBtn');
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
    }

    previewExcelFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                this.showExcelPreview(jsonData.slice(0, 6)); // Mostrar solo las primeras 6 filas
                
                if (window.showSuccess) {
                    window.showSuccess(`Archivo cargado: ${jsonData.length - 1} registros encontrados`);
                }
            } catch (error) {
                console.error('Error leyendo archivo Excel:', error);
                if (window.showError) {
                    window.showError('Error al leer el archivo Excel');
                }
            }
        };
        reader.readAsArrayBuffer(file);
    }


    showExcelPreview(data) {
        const previewContainer = document.getElementById('excelPreview');
        if (!previewContainer || !data || data.length === 0) return;

        // Procesar datos para mostrar fechas legibles
        const processedData = data.slice(0, 6).map((row, index) => {
            if (index === 0) return row; // Headers sin cambios
            
            if (Array.isArray(row)) {
                return row.map((cell, cellIndex) => {
                    // Convertir fechas en columnas específicas
                    if (cellIndex === 0 || cellIndex === 1) { // Timestamp y Fecha
                        return this.formatDateForPreview(cell);
                    } else if (cellIndex === 2) { // Hora de Salida
                        return this.formatTimeForPreview(cell);
                    }
                    return cell;
                });
            }
            return row;
        });

        let tableHTML = `
            <h4>Vista previa del archivo (${data.length - 1} registros):</h4>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px;">
                <strong>Mapeo:</strong> Timestamp → fecha-hora, Fecha+Hora → fecha_hora_salida, 
                Tipo de Embarcación → CATEGORIA, etc.
            </p>
            <div style="overflow-x: auto;">
                <table class="preview-table">
        `;
        
        processedData.forEach((row, index) => {
            const isHeader = index === 0;
            tableHTML += `<tr class="${isHeader ? 'header' : ''}">`;
            
            if (Array.isArray(row)) {
                row.forEach(cell => {
                    const tag = isHeader ? 'th' : 'td';
                    const cellContent = cell !== null && cell !== undefined ? cell : '';
                    tableHTML += `<${tag}>${cellContent}</${tag}>`;
                });
            }
            
            tableHTML += '</tr>';
        });
        
        tableHTML += `
                </table>
            </div>
            <p style="color: #10b981; font-size: 0.8rem; margin-top: 8px;">
                ✅ Las fechas se convertirán automáticamente al formato correcto al cargar
            </p>
        `;
        
        previewContainer.innerHTML = tableHTML;
        previewContainer.style.display = 'block';
    }



    // ===========================
    // FORMATEO PARA VISTA PREVIA
    // ===========================
    formatDateForPreview(excelDate) {
        try {
            if (!excelDate || excelDate === '') return 'N/A';
            
            // Si es número serial de Excel
            if (typeof excelDate === 'number') {
                // Convertir número serial de Excel a fecha JavaScript
                const date = new Date((excelDate - 25569) * 86400 * 1000);
                return date.toLocaleString('es-CO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            // Si ya es una fecha
            const date = new Date(excelDate);
            if (!isNaN(date.getTime())) {
                return date.toLocaleString('es-CO', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            return excelDate.toString();
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    formatTimeForPreview(excelTime) {
        try {
            if (!excelTime || excelTime === '') return 'N/A';
            
            // Si es número decimal (fracción de día)
            if (typeof excelTime === 'number') {
                const totalMinutes = Math.round(excelTime * 24 * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
            
            // Si ya es una fecha
            const date = new Date(excelTime);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            return excelTime.toString();
        } catch (error) {
            return 'Hora inválida';
        }
    }



    async uploadExcelData() {
        if (!this.excelFile) {
            if (window.showError) {
                window.showError('Por favor seleccione un archivo Excel primero');
            }
            return;
        }

        try {
            if (window.showLoading) {
                window.showLoading('Procesando archivo Excel...');
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    await this.processExcelData(jsonData);
                } catch (error) {
                    console.error('Error procesando Excel:', error);
                    if (window.showError) {
                        window.showError('Error procesando el archivo Excel');
                    }
                } finally {
                    if (window.hideLoading) {
                        window.hideLoading();
                    }
                }
            };
            reader.readAsArrayBuffer(this.excelFile);

        } catch (error) {
            console.error('Error subiendo Excel:', error);
            if (window.showError) {
                window.showError('Error al procesar el archivo');
            }
        }
    }


    async processExcelData(data) {
        console.log('📊 Procesando datos de Excel:', data.length, 'registros');
    
        // Debug del estado de Firebase
        console.log('🔍 Debug Firebase:', {
            'appState exists': !!window.appState,
            'db exists': !!window.appState?.db,
            'isFirebaseInitialized': window.appState?.isFirebaseInitialized,
            'firebaseService exists': !!window.firebaseService,
            'auth currentUser': !!window.appState?.auth?.currentUser
        });
        
        try {
            // Mapear y validar datos del Excel a la estructura de Firebase
            const mappedData = data.map((row, index) => {
                // Convertir fechas correctamente
                const fechaReserva = this.parseExcelDate(row['Timestamp']);
                const fechaSalida = this.combineDateTime(row['Fecha'], row['Hora de Salida']);
                
                const mappedRow = {
                    CATEGORIA: (row['Tipo de Embarcación'] || '').toString(),
                    DOCUMENTO: parseInt(row['Número de Documento']) || 0,
                    EMPRESA: (row['Empresa'] || '').toString(),
                    NOMBRE: (row['Nombre de Guía/Pasajero'] || '').toString(),
                    PASAJEROS: parseInt(row['Cantidad de Pasajeros']) || 0,
                    'fecha-hora': fechaReserva,
                    'fecha_hora_salida': fechaSalida,
                    usado: false, // Por defecto false para nuevas reservas
                    embarcacion: (row['Embarcación'] || '').toString(),
                    email: (row['Email Address'] || '').toString()
                };
                
                // Validar que los campos requeridos no estén vacíos
                if (!mappedRow.NOMBRE || !mappedRow.EMPRESA || mappedRow.DOCUMENTO === 0) {
                    console.warn(`⚠️ Fila ${index + 1} tiene datos incompletos:`, mappedRow);
                }
                
                return mappedRow;
            });
            
            // Filtrar filas con datos válidos
            const validData = mappedData.filter(row => 
                row.NOMBRE && row.EMPRESA && row.DOCUMENTO > 0
            );
            
            console.log(`📋 Datos válidos: ${validData.length}/${mappedData.length}`);
            console.log('📋 Muestra de datos mapeados:', validData.slice(0, 2));
            
            if (validData.length === 0) {
                throw new Error('No se encontraron datos válidos para procesar');
            }
            
            // Confirmar antes de subir
            const confirmMessage = `¿Está seguro de cargar ${validData.length} reservas a la base de datos?`;
            if (!confirm(confirmMessage)) {
                if (window.showInfo) {
                    window.showInfo('Carga cancelada por el usuario');
                }
                return;
            }
            
            // Subir a Firebase
            await this.uploadToFirebaseAlternative(validData);
            
            if (window.showSuccess) {
                window.showSuccess(`${validData.length} reservas cargadas exitosamente`);
            }
            
            // Recargar datos
            this.loadReservasData();
            
        } catch (error) {
            this.clearUploadSection(); // ← AGREGAR ESTA LÍNEA
            if (window.showError) {
                window.showError('Error procesando los datos: ' + error.message);
            }
        }
    }



    // ===========================
    // MÉTODOS DE CONVERSIÓN MEJORADOS
    // ===========================
    parseExcelDate(excelDate) {
        if (!excelDate) return new Date();
        
        try {
            // Si ya es una fecha de JavaScript
            if (excelDate instanceof Date) {
                return excelDate;
            }
            
            // Si es string ISO
            if (typeof excelDate === 'string') {
                const date = new Date(excelDate);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            // Si es número serial de Excel
            if (typeof excelDate === 'number') {
                // Excel cuenta desde 1900-01-01, pero con ajuste para el bug del año 1900
                // Fórmula: (número_excel - 25569) * 86400 * 1000
                const date = new Date((excelDate - 25569) * 86400 * 1000);
                
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
            
            return new Date(excelDate);
        } catch (error) {
            console.warn('Error parseando fecha:', excelDate, error);
            return new Date();
        }
    }

    combineDateTime(fechaExcel, horaExcel) {
        try {
            const fecha = this.parseExcelDate(fechaExcel);
            
            // Si la hora es un número decimal (fracción de día)
            if (typeof horaExcel === 'number') {
                const totalMinutes = Math.round(horaExcel * 24 * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                
                const fechaCombinada = new Date(fecha);
                fechaCombinada.setHours(hours);
                fechaCombinada.setMinutes(minutes);
                fechaCombinada.setSeconds(0);
                
                return fechaCombinada;
            }
            
            // Si la hora ya es una fecha, extraer solo la hora
            const hora = new Date(horaExcel);
            if (!isNaN(hora.getTime())) {
                const fechaCombinada = new Date(fecha);
                fechaCombinada.setHours(hora.getHours());
                fechaCombinada.setMinutes(hora.getMinutes());
                fechaCombinada.setSeconds(hora.getSeconds());
                
                return fechaCombinada;
            }
            
            return fecha;
        } catch (error) {
            console.warn('Error combinando fecha y hora:', error);
            return new Date();
        }
    }



    combineDateTime(fechaExcel, horaExcel) {
        try {
            const fecha = this.parseExcelDate(fechaExcel);
            const hora = this.parseExcelTime(horaExcel);
            
            // Combinar fecha y hora
            const fechaCombinada = new Date(fecha);
            fechaCombinada.setHours(hora.getHours());
            fechaCombinada.setMinutes(hora.getMinutes());
            fechaCombinada.setSeconds(hora.getSeconds());
            
            return fechaCombinada;
        } catch (error) {
            console.warn('Error combinando fecha y hora:', error);
            return new Date();
        }
    }

    parseExcelTime(excelTime) {
        if (!excelTime) return new Date();
        
        try {
            // Si ya es una fecha
            if (excelTime instanceof Date) {
                return excelTime;
            }
            
            // Si es string
            if (typeof excelTime === 'string') {
                const timeDate = new Date(excelTime);
                return timeDate;
            }
            
            // Si es número decimal (fracción de día)
            if (typeof excelTime === 'number') {
                const hours = Math.floor(excelTime * 24);
                const minutes = Math.floor((excelTime * 24 * 60) % 60);
                const seconds = Math.floor((excelTime * 24 * 60 * 60) % 60);
                
                const timeDate = new Date();
                timeDate.setHours(hours);
                timeDate.setMinutes(minutes);
                timeDate.setSeconds(seconds);
                
                return timeDate;
            }
            
            return new Date(excelTime);
        } catch (error) {
            console.warn('Error parseando hora:', excelTime, error);
            return new Date();
        }
    }

    // ===========================
    // SUBIDA A FIREBASE
    // ===========================
    async uploadToFirebase(data) {
        console.log('🔥 Subiendo datos a Firebase...');
        
        try {
            // Importar funciones de Firebase
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Verificar múltiples formas de acceder a la base de datos
            let db = null;
            
            if (window.appState?.db) {
                db = window.appState.db;
            } else if (window.firebaseService?.getDatabase) {
                db = window.firebaseService.getDatabase();
            } else if (window.app?.appState?.db) {
                db = window.app.appState.db;
            }
            
            console.log('🔍 Estado de Firebase:', {
                'window.appState': !!window.appState,
                'window.appState.db': !!window.appState?.db,
                'window.firebaseService': !!window.firebaseService,
                'db encontrada': !!db
            });
            
            if (!db) {
                throw new Error('Base de datos Firebase no disponible. Verifique que esté logueado correctamente.');
            }
            
            const reservasRef = collection(db, 'Reservas');
            
            // Subir en lotes para evitar problemas de rendimiento
            const batchSize = 5; // Reducir el tamaño del lote
            let uploaded = 0;
            
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                
                console.log(`📊 Subiendo lote ${Math.floor(i/batchSize) + 1}: ${batch.length} registros`);
                
                const promises = batch.map(async (reserva, index) => {
                    try {
                        console.log(`⬆️ Subiendo reserva ${uploaded + index + 1}:`, reserva.NOMBRE);
                        const docRef = await addDoc(reservasRef, reserva);
                        console.log('✅ Reserva subida con ID:', docRef.id);
                        return docRef;
                    } catch (error) {
                        console.error('❌ Error subiendo reserva individual:', reserva.NOMBRE, error);
                        throw error;
                    }
                });
                
                await Promise.all(promises);
                uploaded += batch.length;
                
                console.log(`📊 Progreso: ${uploaded}/${data.length} reservas subidas`);
                
                // Mostrar progreso
                if (window.showInfo) {
                    window.showInfo(`Subiendo reservas... ${uploaded}/${data.length}`);
                }
                
                // Pequeña pausa entre lotes
                if (i + batchSize < data.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            console.log('✅ Todas las reservas subidas exitosamente');
            
        } catch (error) {
            console.error('❌ Error subiendo a Firebase:', error);
            throw error;
        }
    }


    // ===========================
    // MÉTODO ALTERNATIVO USANDO FIREBASE SERVICE
    // ===========================
    async uploadToFirebaseAlternative(data) {
        console.log('🔥 Subiendo datos usando FirebaseService...');
        
        try {
            if (!window.firebaseService) {
                throw new Error('FirebaseService no está disponible');
            }
            
            // Importar directamente desde firebase
            const { collection, addDoc, getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            
            // Obtener la app y db de Firebase
            const app = getApp();
            const db = getFirestore(app);
            
            console.log('🔍 Firebase app y db obtenidos:', !!app, !!db);
            
            const reservasRef = collection(db, 'Reservas');
            
            // Subir registros uno por uno con mejor control de errores
            let uploaded = 0;
            const errors = [];
            
            for (let i = 0; i < data.length; i++) {
                try {
                    const reserva = data[i];
                    console.log(`⬆️ Subiendo reserva ${i + 1}/${data.length}:`, reserva.NOMBRE);
                    
                    const docRef = await addDoc(reservasRef, reserva);
                    uploaded++;
                    
                    console.log(`✅ Reserva ${i + 1} subida con ID:`, docRef.id);
                    
                    // Mostrar progreso cada 5 registros
                    if (i % 5 === 0 || i === data.length - 1) {
                        if (window.showInfo) {
                            window.showInfo(`Subiendo reservas... ${uploaded}/${data.length}`);
                        }
                    }
                    
                    // Pequeña pausa entre registros
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`❌ Error subiendo reserva ${i + 1}:`, data[i].NOMBRE, error);
                    errors.push({ index: i + 1, nombre: data[i].NOMBRE, error: error.message });
                }
            }
            
            console.log(`✅ Proceso completado: ${uploaded}/${data.length} reservas subidas`);
            
            if (errors.length > 0) {
                console.warn('⚠️ Errores encontrados:', errors);
                if (window.showWarning) {
                    window.showWarning(`${uploaded} reservas subidas, ${errors.length} errores`);
                }
            } else {
                if (window.showSuccess) {
                    window.showSuccess(`${uploaded} reservas cargadas exitosamente`);
                }
            }
            
            // RECARGAR AUTOMÁTICAMENTE LOS DATOS
            setTimeout(() => {
                this.loadReservasData();
                
                // LIMPIAR LA VISTA PREVIA Y RESET DEL UPLOAD
                this.clearUploadSection();
            }, 1000);
            
            return { uploaded, errors };
            
        } catch (error) {
            console.error('❌ Error en uploadToFirebaseAlternative:', error);
            throw error;
        }
    }

    // ===========================
    // MÉTODO PARA REFRESCAR DATOS
    // ===========================
    refreshReservas() {
        console.log('🔄 Refrescando datos de reservas...');
        
        if (window.showInfo) {
            window.showInfo('Actualizando datos de reservas...');
        }
        
        this.loadReservasData();
    }


    // ===========================
    // LIMPIAR SECCIÓN DE UPLOAD
    // ===========================
    clearUploadSection() {
        console.log('🧹 Limpiando sección de upload...');
        
        // Ocultar vista previa
        const previewContainer = document.getElementById('excelPreview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
            previewContainer.innerHTML = '';
        }
        
        // Resetear input de archivo
        const fileInput = document.getElementById('excelFileInput');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Deshabilitar botón de upload
        const uploadBtn = document.getElementById('uploadExcelBtn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
        }
        
        // Limpiar archivo en memoria
        this.excelFile = null;
        
        // Actualizar label del archivo
        const fileLabel = document.querySelector('.file-label span');
        if (fileLabel) {
            fileLabel.textContent = 'Seleccionar archivo Excel';
        }
        
        console.log('✅ Sección de upload limpiada');
    }




    // ===========================
    // EXPORTACIÓN A EXCEL
    // ===========================
    exportReservasToExcel() {
        try {
            console.log('📊 Exportando reservas a Excel...');
            
            if (!this.filteredData || this.filteredData.length === 0) {
                if (window.showError) {
                    window.showError('No hay datos de reservas para exportar');
                }
                return;
            }
            
            // Verificar que XLSX esté disponible
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
                { wch: 15 },  // Embarcación
                { wch: 30 }   // Email
            ];
            
            // Agregar hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, 'Reservas');
            
            // Generar nombre de archivo
            const filename = this.generateFilename('reservas-guatape', 'xlsx');
            
            // Descargar archivo
            XLSX.writeFile(wb, filename);
            
            if (window.showSuccess) {
                window.showSuccess(`¡Archivo Excel descargado: ${filename}!`);
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

            return {
                'No.': index + 1,
                'Nombre': reserva.NOMBRE || 'N/A',
                'Documento': reserva.DOCUMENTO || 'N/A',
                'Empresa': reserva.EMPRESA || 'N/A',
                'Categoría': reserva.CATEGORIA || 'N/A',
                'Pasajeros': reserva.PASAJEROS || 0,
                'Fecha Reserva': formatearFecha(reserva['fecha-hora']),
                'Fecha Salida': formatearFecha(reserva['fecha_hora_salida']),
                'Estado': reserva.usado ? 'Usado' : 'Pendiente',
                'Embarcación': reserva.embarcacion || 'N/A',
                'Email': reserva.email || 'N/A'
            };
        });
    }

    // ===========================
    // EXPORTACIÓN A PDF
    // ===========================
    exportReservasToPDF() {
        try {
            console.log('📊 Exportando reservas a PDF...');
            
            if (!this.filteredData || this.filteredData.length === 0) {
                if (window.showError) {
                    window.showError('No hay datos de reservas para exportar');
                }
                return;
            }
            
            // Verificar que jsPDF esté disponible
            if (typeof window.jspdf === 'undefined') {
                if (window.showError) {
                    window.showError('Librería PDF no disponible');
                }
                return;
            }
            
            if (window.showInfo) {
                window.showInfo('Generando archivo PDF...');
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape para mejor ajuste
            
            // Encabezado del documento
            this.addPDFHeader(doc, 'Reservas de Embarcaciones - Embalse de Guatapé');
            
            // Preparar datos para la tabla
            const tableData = this.prepareReservasDataForPDF(this.filteredData);
            
            // Headers para PDF
            const headers = ['No.', 'Nombre', 'Documento', 'Empresa', 'Categoría', 'Pasajeros', 'Fecha Reserva', 'Estado'];
            
            // Crear tabla
            doc.autoTable({
                startY: 50,
                head: [headers],
                body: tableData,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    halign: 'center'
                },
                headStyles: {
                    fillColor: [139, 92, 246], // Color morado para reservas
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 15 },  // No.
                    1: { cellWidth: 40 },  // Nombre
                    2: { cellWidth: 25 },  // Documento
                    3: { cellWidth: 35 },  // Empresa
                    4: { cellWidth: 25 },  // Categoría
                    5: { cellWidth: 20 },  // Pasajeros
                    6: { cellWidth: 35 },  // Fecha Reserva
                    7: { cellWidth: 20 }   // Estado
                },
                margin: { left: 10, right: 10 }
            });
            
            // Pie de página
            this.addPDFFooter(doc);
            
            // Descargar archivo
            const filename = this.generateFilename('reservas-guatape', 'pdf');
            doc.save(filename);
            
            if (window.showSuccess) {
                window.showSuccess(`¡Archivo PDF descargado: ${filename}!`);
            }
            
            console.log('✅ Exportación PDF completada');
            
        } catch (error) {
            console.error('❌ Error exportando a PDF:', error);
            if (window.showError) {
                window.showError('Error al generar archivo PDF: ' + error.message);
            }
        }
    }

    prepareReservasDataForPDF(data) {
        return data.slice(0, 100).map((reserva, index) => { // Limitar a 100 para PDF
            const formatearFecha = (fecha) => {
                if (!fecha) return 'N/A';
                try {
                    if (fecha.toDate) {
                        const d = fecha.toDate();
                        return `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`;
                    } else if (fecha instanceof Date) {
                        return `${fecha.toLocaleDateString('es-CO')} ${fecha.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`;
                    } else {
                        const d = new Date(fecha);
                        return `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`;
                    }
                } catch (e) {
                    return 'N/A';
                }
            };

            return [
                index + 1,
                reserva.NOMBRE || 'N/A',
                reserva.DOCUMENTO || 'N/A',
                reserva.EMPRESA || 'N/A',
                reserva.CATEGORIA || 'N/A',
                reserva.PASAJEROS || 0,
                formatearFecha(reserva['fecha-hora']),
                reserva.usado ? 'Usado' : 'Pendiente'
            ];
        });
    }

    // ===========================
    // UTILIDADES DE PDF
    // ===========================
    addPDFHeader(doc, title) {
        // Título principal
        doc.setFontSize(18);
        doc.setTextColor(139, 92, 246); // Color morado
        doc.text(title, 15, 20);

        // Información adicional
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        const now = new Date();
        doc.text(`Generado el: ${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO')}`, 15, 30);
        doc.text(`Total de registros: ${this.filteredData.length}`, 15, 36);
        
        // Estadísticas rápidas
        const stats = this.calculateStats(this.filteredData);
        doc.text(`Pendientes: ${stats.pendientes} | Usadas: ${stats.usadas} | Total Pasajeros: ${stats.totalPasajeros}`, 15, 42);
    }

    addPDFFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            
            // Número de página
            doc.text(
                `Página ${i} de ${pageCount}`, 
                doc.internal.pageSize.width - 30, 
                doc.internal.pageSize.height - 10
            );
            
            // Pie de página
            doc.text(
                'Sistema Reservas Embarcaciones Guatapé', 
                15, 
                doc.internal.pageSize.height - 10
            );
        }
    }

    // ===========================
    // UTILIDADES GENERALES
    // ===========================
    generateFilename(baseFilename, extension) {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        return `${baseFilename}-${timestamp}.${extension}`;
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

// Crear instancia global
const reservasManager = new ReservasManager();

// Hacer disponible globalmente
window.reservasManager = reservasManager;

// Configurar upload cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (reservasManager) {
        reservasManager.setupExcelUpload();
    }
});