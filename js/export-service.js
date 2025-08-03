// ===========================
// SERVICIO DE EXPORTACIÓN
// ===========================

import { appState, exportConfig, utils } from './config.js';
import { showSuccess, showError, showInfo } from './notifications.js';

class ExportService {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkLibrariesAvailability();
    }

    // ===========================
    // VERIFICACIÓN DE LIBRERÍAS
    // ===========================
    checkLibrariesAvailability() {
        this.xlsxAvailable = typeof XLSX !== 'undefined';
        this.jsPDFAvailable = typeof window.jspdf !== 'undefined';
        
        if (!this.xlsxAvailable) {
            console.warn('⚠️ Librería XLSX no disponible - Exportación Excel deshabilitada');
        }
        
        if (!this.jsPDFAvailable) {
            console.warn('⚠️ Librería jsPDF no disponible - Exportación PDF deshabilitada');
        }
        
        console.log(`📊 Librerías de exportación: Excel=${this.xlsxAvailable}, PDF=${this.jsPDFAvailable}`);
    }

    // ===========================
    // EVENT LISTENERS
    // ===========================
    setupEventListeners() {
        // Botones de exportación para zarpes
        const excelBtn = document.getElementById('excelBtn');
        const pdfBtn = document.getElementById('pdfBtn');
        
        if (excelBtn) {
            excelBtn.addEventListener('click', () => this.exportZarpesToExcel());
        }
        
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => this.exportZarpesToPDF());
        }
        
        // Botones de exportación para categorías
        const excelCategoriasBtn = document.getElementById('excelCategoriasBtn');
        const pdfCategoriasBtn = document.getElementById('pdfCategoriasBtn');
        
        if (excelCategoriasBtn) {
            excelCategoriasBtn.addEventListener('click', () => this.exportCategoriasToExcel());
        }
        
        if (pdfCategoriasBtn) {
            pdfCategoriasBtn.addEventListener('click', () => this.exportCategoriasToPDF());
        }
    }

    // ===========================
    // EXPORTACIÓN A EXCEL - ZARPES
    // ===========================
    exportZarpesToExcel() {
        try {
            if (!this.validateExcelExport()) return;

            const data = appState.filteredZarpesData;
            if (!this.validateData(data, 'Excel')) return;

            showInfo('Generando archivo Excel de categorías...');

            const excelData = this.prepareCategoriasDataForExcel(data);
            const filename = this.generateFilename('categorias-embarcaciones-guatape', 'xlsx');
            
            this.createExcelFile(excelData, filename, 'Análisis por Categorías');
            
            showSuccess('¡Archivo Excel de categorías descargado exitosamente!');
            
        } catch (error) {
            console.error('❌ Error exportando categorías a Excel:', error);
            showError('Error al generar archivo Excel: ' + error.message);
        }
    }

    prepareCategoriasDataForExcel(data) {
        return data.map((registro, index) => {
            const fechaFormateada = utils.formatDate(registro.fechaHora);

            return {
                'ID Embarcación': registro.embarcacionId || registro.id || index + 1,
                'Embarcación': registro.embarcacion || 'N/A',
                'Categoría': registro.categoria || 'N/A',
                'Administrador': registro.administrador || 'N/A',
                'Fecha y Hora': fechaFormateada,
                'Cantidad Pasajeros': registro.cantidadPasajeros || 0,
                'Valor por Persona': registro.valorPorPersona || 0,
                'Valor Total': registro.valorTotal || 0,
                'Posición Desembarque': registro.posicionDesembarque || 'N/A'
            };
        });
    }

    // ===========================
    // EXPORTACIÓN A PDF - CATEGORÍAS
    // ===========================
    exportCategoriasToPDF() {
        try {
            if (!this.validatePDFExport()) return;

            const data = appState.filteredCategoriasData;
            if (!this.validateData(data, 'PDF')) return;

            showInfo('Generando archivo PDF de categorías...');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');

            // Encabezado del documento
            this.addPDFHeader(doc, 'Análisis por Categorías - Embalse de Guatapé', data.length);

            // Preparar datos para la tabla
            const tableData = this.prepareCategoriasDataForPDF(data);

            // Headers específicos para categorías
            const headers = ['ID', 'Embarcación', 'Categoría', 'Administrador', 'Fecha/Hora', 'Pasajeros', 'Valor/Pers', 'Valor Total', 'Pos. Desemb'];

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
                    fillColor: [16, 185, 129], // Verde para categorías
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 15 },
                    6: { cellWidth: 20 },
                    7: { cellWidth: 20 },
                    8: { cellWidth: 15 }
                },
                margin: { left: 10, right: 10 }
            });

            // Pie de página
            this.addPDFFooter(doc);

            // Descargar archivo
            const filename = this.generateFilename('categorias-embarcaciones-guatape', 'pdf');
            doc.save(filename);

            showSuccess('¡Archivo PDF de categorías descargado exitosamente!');

        } catch (error) {
            console.error('❌ Error exportando categorías a PDF:', error);
            showError('Error al generar archivo PDF: ' + error.message);
        }
    }

    prepareCategoriasDataForPDF(data) {
        return data.slice(0, 100).map((registro, index) => {
            const fechaFormateada = utils.formatDate(registro.fechaHora);

            return [
                registro.embarcacionId || registro.id || index + 1,
                registro.embarcacion || 'N/A',
                registro.categoria || 'N/A',
                registro.administrador || 'N/A',
                fechaFormateada,
                registro.cantidadPasajeros || 0,
                `${(registro.valorPorPersona || 0).toLocaleString('es-CO')}`,
                `${(registro.valorTotal || 0).toLocaleString('es-CO')}`,
                registro.posicionDesembarque || 'N/A'
            ];
        });
    }

    // ===========================
    // UTILIDADES DE EXCEL
    // ===========================
    createExcelFile(data, filename, sheetName) {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        
        // Configurar anchos de columna
        ws['!cols'] = exportConfig.excel.columns.map(col => ({ wch: col.width }));

        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Generar y descargar archivo
        XLSX.writeFile(wb, filename);
    }

    // ===========================
    // UTILIDADES DE PDF
    // ===========================
    addPDFHeader(doc, title, recordCount) {
        // Título principal
        doc.setFontSize(18);
        doc.setTextColor(6, 182, 212);
        doc.text(title, 15, 20);

        // Información adicional
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        const now = new Date();
        doc.text(`Generado el: ${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString('es-CO')}`, 15, 30);
        doc.text(`Total de registros: ${recordCount}`, 15, 36);
        
        if (appState.currentUser) {
            doc.text(`Usuario: ${appState.currentUser.email}`, 15, 42);
        }
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
                'Sistema Embarcaciones Guatapé', 
                15, 
                doc.internal.pageSize.height - 10
            );
        }
    }

    // ===========================
    // VALIDACIONES
    // ===========================
    validateExcelExport() {
        if (!appState.currentUser) {
            showError('Debe estar autenticado para exportar datos');
            return false;
        }

        if (!this.xlsxAvailable) {
            showError('Librería de Excel no disponible');
            return false;
        }

        return true;
    }

    validatePDFExport() {
        if (!appState.currentUser) {
            showError('Debe estar autenticado para exportar datos');
            return false;
        }

        if (!this.jsPDFAvailable) {
            showError('Librería de PDF no disponible');
            return false;
        }

        return true;
    }

    validateData(data, exportType) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            showError('No hay datos para exportar');
            return false;
        }

        // Advertir si hay muchos registros para PDF
        if (exportType === 'PDF' && data.length > 100) {
            const proceed = confirm(
                `Se exportarán solo los primeros 100 registros de ${data.length} totales para mantener la calidad del PDF. ¿Continuar?`
            );
            if (!proceed) return false;
        }

        return true;
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
    // EXPORTACIÓN PERSONALIZADA
    // ===========================
    exportCustomData(data, filename, options = {}) {
        const {
            format = 'excel',
            sheetName = 'Datos',
            title = 'Exportación de Datos',
            columns = null
        } = options;

        try {
            if (format === 'excel') {
                if (!this.validateExcelExport()) return;
                
                let processedData = data;
                if (columns) {
                    processedData = this.processDataWithColumns(data, columns);
                }
                
                this.createExcelFile(processedData, filename + '.xlsx', sheetName);
                showSuccess('Archivo Excel personalizado descargado');
                
            } else if (format === 'pdf') {
                if (!this.validatePDFExport()) return;
                
                // Implementar exportación PDF personalizada si es necesario
                showInfo('Exportación PDF personalizada en desarrollo');
                
            } else {
                showError('Formato de exportación no soportado');
            }
            
        } catch (error) {
            console.error('❌ Error en exportación personalizada:', error);
            showError('Error en exportación personalizada: ' + error.message);
        }
    }

    processDataWithColumns(data, columns) {
        return data.map(item => {
            const processedItem = {};
            columns.forEach(col => {
                processedItem[col.header] = item[col.key] || '';
            });
            return processedItem;
        });
    }

    // ===========================
    // EXPORTACIÓN POR RANGO DE FECHAS
    // ===========================
    exportByDateRange(startDate, endDate, format = 'excel') {
        try {
            const filteredData = appState.zarpesData.filter(item => {
                if (!item.fechaHora) return false;
                
                let itemDate;
                if (item.fechaHora.toDate) {
                    itemDate = item.fechaHora.toDate();
                } else if (item.fechaHora instanceof Date) {
                    itemDate = item.fechaHora;
                } else {
                    itemDate = new Date(item.fechaHora);
                }
                
                return itemDate >= startDate && itemDate <= endDate;
            });

            if (filteredData.length === 0) {
                showError('No hay datos en el rango de fechas seleccionado');
                return;
            }

            const filename = `embarcaciones-${startDate.toISOString().slice(0, 10)}-a-${endDate.toISOString().slice(0, 10)}`;
            
            if (format === 'excel') {
                const excelData = this.prepareZarpesDataForExcel(filteredData);
                this.createExcelFile(excelData, filename + '.xlsx', 'Datos por Fechas');
                showSuccess(`Exportados ${filteredData.length} registros por rango de fechas`);
            } else if (format === 'pdf') {
                // Implementar exportación PDF por fechas
                showInfo('Exportación PDF por fechas en desarrollo');
            }
            
        } catch (error) {
            console.error('❌ Error exportando por fechas:', error);
            showError('Error en exportación por fechas: ' + error.message);
        }
    }

    // ===========================
    // MÉTODOS PÚBLICOS
    // ===========================
    isExcelAvailable() {
        return this.xlsxAvailable;
    }

    isPDFAvailable() {
        return this.jsPDFAvailable;
    }

    getExportFormats() {
        const formats = [];
        if (this.xlsxAvailable) formats.push('excel');
        if (this.jsPDFAvailable) formats.push('pdf');
        return formats;
    }
}

// Crear instancia global
const exportService = new ExportService();

// Exportar servicio y métodos principales
export { exportService };

export const exportZarpesToExcel = () => {
    return exportService.exportZarpesToExcel();
};

export const exportZarpesToPDF = () => {
    return exportService.exportZarpesToPDF();
};

export const exportCategoriasToExcel = () => {
    return exportService.exportCategoriasToExcel();
};

export const exportCategoriasToPDF = () => {
    return exportService.exportCategoriasToPDF();
};

export const exportCustomData = (data, filename, options) => {
    return exportService.exportCustomData(data, filename, options);
};

export const exportByDateRange = (startDate, endDate, format) => {
    return exportService.exportByDateRange(startDate, endDate, format);
};

// Hacer disponible globalmente
window.exportService = exportService;'Excel')) return;

            showInfo('Generando archivo Excel...');

            const excelData = this.prepareZarpesDataForExcel(data);
            const filename = this.generateFilename('embarcaciones-guatape', 'xlsx');
            
            this.createExcelFile(excelData, filename, 'Registros Embarcaciones');
            
            showSuccess('¡Archivo Excel descargado exitosamente!');
            
        } catch (error) {
            console.error('❌ Error exportando a Excel:', error);
            showError('Error al generar archivo Excel: ' + error.message);
        }
    }

    prepareZarpesDataForExcel(data) {
        return data.map((registro, index) => {
            const fechaFormateada = utils.formatDate(registro.fechaHora);

            return {
                'ID Embarcación': registro.embarcacionId || registro.id || index + 1,
                'Embarcación': registro.embarcacion || 'N/A',
                'Administrador': registro.administrador || 'N/A',
                'Categoría': registro.categoria || 'N/A',
                'Fecha y Hora': fechaFormateada,
                'Cantidad Pasajeros': registro.cantidadPasajeros || 0,
                'Valor por Persona': registro.valorPorPersona || 0,
                'Valor Total': registro.valorTotal || 0,
                'Posición Desembarque': registro.posicionDesembarque || 'N/A'
            };
        });
    }

    // ===========================
    // EXPORTACIÓN A PDF - ZARPES
    // ===========================
    exportZarpesToPDF() {
        try {
            if (!this.validatePDFExport()) return;

            const data = appState.filteredZarpesData;
            if (!this.validateData(data, 'PDF')) return;

            showInfo('Generando archivo PDF...');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');

            // Encabezado del documento
            this.addPDFHeader(doc, 'Registros de Embarcaciones - Embalse de Guatapé', data.length);

            // Preparar datos para la tabla
            const tableData = this.prepareZarpesDataForPDF(data);

            // Crear tabla
            doc.autoTable({
                startY: 50,
                head: [exportConfig.pdf.headers],
                body: tableData,
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    halign: 'center'
                },
                headStyles: {
                    fillColor: [6, 182, 212],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: exportConfig.pdf.columnStyles,
                margin: { left: 15, right: 15 }
            });

            // Pie de página
            this.addPDFFooter(doc);

            // Descargar archivo
            const filename = this.generateFilename('embarcaciones-guatape', 'pdf');
            doc.save(filename);

            showSuccess('¡Archivo PDF descargado exitosamente!');

        } catch (error) {
            console.error('❌ Error exportando a PDF:', error);
            showError('Error al generar archivo PDF: ' + error.message);
        }
    }

    prepareZarpesDataForPDF(data) {
        return data.slice(0, 100).map((registro, index) => {
            const fechaFormateada = utils.formatDate(registro.fechaHora);

            return [
                registro.embarcacionId || registro.id || index + 1,
                registro.embarcacion || 'N/A',
                registro.administrador || 'N/A',
                registro.categoria || 'N/A',
                fechaFormateada,
                registro.cantidadPasajeros || 0,
                `$${(registro.valorPorPersona || 0).toLocaleString('es-CO')}`,
                `$${(registro.valorTotal || 0).toLocaleString('es-CO')}`
            ];
        });
    }

    // ===========================
    // EXPORTACIÓN A EXCEL - CATEGORÍAS
    // ===========================
    exportCategoriasToExcel() {
        try {
            if (!this.validateExcelExport()) return;

            const data = appState.filteredCategoriasData;
            if (!this.validateData(data,