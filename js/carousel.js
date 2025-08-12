// ===========================
// GESTOR DE CARRUSEL
// ===========================

import { appConfig, appState } from './config.js';

class CarouselManager {
    constructor() {
        this.images = appConfig.carousel.images;
        this.videoSrc = appConfig.carousel.videoSrc;
        this.videoDuration = appConfig.carousel.videoDuration;
        this.imageDuration = appConfig.carousel.imageDuration;
        
        this.currentSlide = 0;
        this.carouselInterval = null;
        this.activeCarousels = new Set();
        
        this.init();
    }

    async init() {
    // Verificar disponibilidad de imágenes y esperar a que termine
    await this.checkImageAvailability();

    // Inicializar carrusel principal si existe
    if (document.getElementById('carousel')) {
        this.initializeCarousel('carousel');
    }
    }

    // ===========================
    // INICIALIZACIÓN DE CARRUSEL
    // ===========================
    initializeCarousel(containerId) {
        const carousel = document.getElementById(containerId);
        const indicators = containerId === 'carousel' ? 
            document.getElementById('carouselIndicators') : null;
        
        if (!carousel) {
            console.warn(`Carrusel ${containerId} no encontrado`);
            return;
        }
        
        console.log(`Inicializando carrusel: ${containerId}`);
        
        // Limpiar contenido anterior
        carousel.innerHTML = '';
        if (indicators) indicators.innerHTML = '';
        
        // Reset slide actual
        this.currentSlide = 0;
        
        // Agregar a carruseles activos
        this.activeCarousels.add(containerId);
        
        // Crear slides
        this.createSlides(carousel, indicators, containerId);
        
        // Iniciar rotación automática
        this.startCarousel();
    }

    createSlides(carousel, indicators, containerId) {
        // Agregar slides de imagen
        this.images.forEach((image, index) => {
            this.createImageSlide(carousel, image, index, containerId);
            
            // Crear indicador solo para el carrusel principal
            if (indicators) {
                this.createIndicator(indicators, index, containerId);
            }
        });
        
        // Opcional: Agregar video slide (deshabilitado por compatibilidad)
        // this.createVideoSlide(carousel, this.images.length, containerId);
    }

    createImageSlide(carousel, imageSrc, index, containerId) {
        const slide = document.createElement('div');
        slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
        slide.setAttribute('data-slide-index', index);
        slide.setAttribute('data-carousel', containerId);
        
        // Verificar si la imagen existe antes de asignarla
        const resolvedSrc = this.resolveAssetPath(imageSrc);
            this.loadImage(resolvedSrc).then(loadedSrc => {
            slide.style.backgroundImage = `url(${loadedSrc})`;
        }).catch(() => {
            // Si no se puede cargar la imagen, agregar un fondo de respaldo
            slide.style.backgroundColor = '#1e293b';
            slide.innerHTML = `
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: #94a3b8;
                ">
                    <i class="fas fa-image" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                    <p>Imagen ${index + 1}</p>
                </div>
            `;
        });
        
        carousel.appendChild(slide);
    }

    createVideoSlide(carousel, index, containerId) {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide video';
        slide.setAttribute('data-slide-index', index);
        slide.setAttribute('data-carousel', containerId);
        
        const video = document.createElement('video');
        video.src = this.videoSrc;
        video.autoplay = false;
        video.muted = true;
        video.loop = false;
        video.playsInline = true;
        
        // Manejo de eventos del video
        video.addEventListener('loadedmetadata', () => {
            console.log('Video cargado:', this.videoSrc);
        });
        
        video.addEventListener('error', (e) => {
            console.warn('Error cargando video:', e);
            // Reemplazar con imagen estática
            slide.innerHTML = `
                <div style="
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #1e293b, #374151);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                ">
                    <div style="text-align: center;">
                        <i class="fas fa-play-circle" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                        <p>Video no disponible</p>
                    </div>
                </div>
            `;
        });
        
        slide.appendChild(video);
        carousel.appendChild(slide);
    }

    createIndicator(indicators, index, containerId) {
        const indicator = document.createElement('div');
        indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
        indicator.title = `Imagen ${index + 1}`;
        indicator.setAttribute('data-slide-index', index);
        indicator.setAttribute('data-carousel', containerId);
        
        indicator.addEventListener('click', () => {
            this.goToSlide(index, containerId);
        });
        
        indicators.appendChild(indicator);
    }

    // ===========================
    // CONTROL DE CARRUSEL
    // ===========================
    startCarousel() {
        // Detener carrusel anterior si existe
        this.stopCarousel();
        
        if (this.activeCarousels.size === 0) return;
        
        this.carouselInterval = setInterval(() => {
            this.nextSlide();
        }, this.imageDuration);
        
        console.log('Carrusel iniciado');
    }

    stopCarousel() {
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
            this.carouselInterval = null;
            console.log('Carrusel detenido');
        }
    }

    nextSlide() {
        this.activeCarousels.forEach(containerId => {
            const slides = document.querySelectorAll(`#${containerId} .carousel-slide`);
            const indicators = containerId === 'carousel' ? 
                document.querySelectorAll('#carouselIndicators .indicator') : [];
            
            if (slides.length === 0) return;
            
            // Remover clase active del slide actual
            slides[this.currentSlide].classList.remove('active');
            if (indicators.length > 0) {
                indicators[this.currentSlide].classList.remove('active');
            }
            
            // Avanzar al siguiente slide
            this.currentSlide = (this.currentSlide + 1) % slides.length;
            
            // Agregar clase active al nuevo slide
            slides[this.currentSlide].classList.add('active');
            if (indicators.length > 0 && indicators[this.currentSlide]) {
                indicators[this.currentSlide].classList.add('active');
            }
        });
    }

    goToSlide(index, containerId) {
        const slides = document.querySelectorAll(`#${containerId} .carousel-slide`);
        const indicators = containerId === 'carousel' ? 
            document.querySelectorAll('#carouselIndicators .indicator') : [];
        
        if (slides.length === 0 || index >= slides.length) return;
        
        // Remover clase active del slide actual
        slides[this.currentSlide].classList.remove('active');
        if (indicators.length > 0) {
            indicators[this.currentSlide].classList.remove('active');
        }
        
        // Ir al slide seleccionado
        this.currentSlide = index;
        
        // Agregar clase active al nuevo slide
        slides[this.currentSlide].classList.add('active');
        if (indicators.length > 0) {
            indicators[this.currentSlide].classList.add('active');
        }
        
        // Reiniciar el carrusel automático
        this.startCarousel();
    }

    // ===========================
    // GESTIÓN DE CARRUSELES MÚLTIPLES
    // ===========================
    removeCarousel(containerId) {
        this.activeCarousels.delete(containerId);
        
        // Si no hay carruseles activos, detener el intervalo
        if (this.activeCarousels.size === 0) {
            this.stopCarousel();
        }
    }

    pauseCarousel() {
        this.stopCarousel();
    }

    resumeCarousel() {
        if (this.activeCarousels.size > 0) {
            this.startCarousel();
        }
    }

    resolveAssetPath(src) {
        if (!src) return src;

        // 1) URLs absolutas o data URIs: devolver tal cual
        if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;

        // 2) Si hay <base href> en el HTML, úsalo como base
        const baseTagHref = document.querySelector('base')?.href;

        // 3) Permitir override manual (opcional) vía meta o variable global
        //    <meta name="basepath" content="/mi-repo/">
        const metaBase = document.querySelector('meta[name="basepath"]')?.content;
        const globalBase = window.__APP_BASE__ || '';

        // 4) Detectar si estamos en GitHub Pages
        const isGitHubPages = /github\.io$/i.test(location.hostname);

        // 5) Detectar si es "project page" (https://usuario.github.io/mi-repo/...)
        //    En ese caso el primer segmento de pathname es el repo.
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const repoSegment = pathSegments.length > 0 ? `/${pathSegments[0]}/` : '/';
        const projectBase = isGitHubPages ? repoSegment : '/';

        // 6) Construir base definitiva en orden de prioridad
        //    (a) <base href>  (b) meta/global overrides  (c) GitHub Pages projectBase  (d) carpeta actual del documento
        const fallbackDir = `${location.origin}${location.pathname.replace(/\/[^/]*$/, '/')}`;
        const computedBase =
            baseTagHref ||
            (metaBase ? new URL(metaBase, location.origin).href : null) ||
            (globalBase ? new URL(globalBase, location.origin).href : null) ||
            (new URL(projectBase, location.origin).href) ||
            fallbackDir;

        // 7) Si la ruta del asset empieza con "/", trátala como "raíz del sitio"
        //    Para project pages, la "raíz" real incluye el repo (p.ej. /mi-repo/)
        if (src.startsWith('/')) {
            const clean = src.replace(/^\/+/, '');                 // "/assets/a.jpg" -> "assets/a.jpg"
            const siteRoot = isGitHubPages
            ? new URL(repoSegment, location.origin).href        // .../mi-repo/
            : `${location.origin}/`;                            // .../
            return new URL(clean, siteRoot).href;
        }

        // 8) Rutas relativas (sin "/"): resolver contra la base calculada
        return new URL(src, computedBase).href;
    }




    // ===========================
    // UTILIDADES DE IMAGEN
    // ===========================
    async loadImage(src) {
        const finalSrc = this.resolveAssetPath(src);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(finalSrc);
            img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${finalSrc}`));
            img.src = finalSrc;
        });
    }

    async checkImageAvailability() {
        const availableImages = [];
        
        for (const imageSrc of this.images) {
            console.log("🔍 Verificando imagen:", imageSrc); // nombre/ruta original
            
            try {
                const resolvedSrc = this.resolveAssetPath(imageSrc);
                console.log("📂 Ruta resuelta:", resolvedSrc); // ruta absoluta después de procesar
                await this.loadImage(imageSrc);
                availableImages.push(imageSrc);
            } catch (error) {
                console.warn(`⚠️ Imagen no disponible: ${imageSrc}`);
            }
        }
        
        if (availableImages.length === 0) {
            console.warn('Ninguna imagen del carrusel está disponible, usando placeholders');
            this.images = this.createPlaceholderImages();
        } else {
            this.images = availableImages;
        }
        
        console.log(`✅ Imágenes disponibles para carrusel: ${this.images.length}`);
    }


    createPlaceholderImages() {
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        ];
        
        return colors.map((gradient, index) => {
            // Crear imagen placeholder con canvas
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            
            // Crear gradiente (simplificado para canvas)
            const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grd.addColorStop(0, this.getColorFromGradient(gradient, 0));
            grd.addColorStop(1, this.getColorFromGradient(gradient, 1));
            
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Agregar texto
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Embalse de Guatapé`, canvas.width / 2, canvas.height / 2 - 30);
            
            ctx.font = '32px Arial';
            ctx.fillText(`Imagen ${index + 1}`, canvas.width / 2, canvas.height / 2 + 30);
            
            return canvas.toDataURL();
        });
    }

    getColorFromGradient(gradient, position) {
        // Extrae colores del gradiente CSS (simplificado)
        const colors = ['#667eea', '#764ba2']; // Fallback colors
        return position === 0 ? colors[0] : colors[1];
    }

    // ===========================
    // EVENTOS DEL NAVEGADOR
    // ===========================
    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseCarousel();
        } else {
            this.resumeCarousel();
        }
    }

    handleResize() {
        // Ajustar carrusel al cambio de tamaño de ventana
        console.log('Ajustando carrusel al cambio de tamaño');
        
        // Reinicializar carruseles activos
        const activeCarouselIds = Array.from(this.activeCarousels);
        activeCarouselIds.forEach(containerId => {
            if (document.getElementById(containerId)) {
                this.initializeCarousel(containerId);
            }
        });
    }

    // ===========================
    // CONFIGURACIÓN DE EVENTOS GLOBALES
    // ===========================
    setupEventListeners() {
        // Pausar carrusel cuando la página no es visible
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Ajustar carrusel al cambiar tamaño de ventana
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Pausar carrusel cuando se abren modales
        document.addEventListener('modalopen', () => {
            this.pauseCarousel();
        });

        document.addEventListener('modalclose', () => {
            this.resumeCarousel();
        });
    }

    // ===========================
    // MÉTODOS PÚBLICOS
    // ===========================
    getCurrentSlide() {
        return this.currentSlide;
    }

    getTotalSlides() {
        return this.images.length;
    }

    isCarouselActive(containerId) {
        return this.activeCarousels.has(containerId);
    }

    getActiveCarousels() {
        return Array.from(this.activeCarousels);
    }

    // ===========================
    // CLEANUP
    // ===========================
    destroy() {
        this.stopCarousel();
        this.activeCarousels.clear();
        this.currentSlide = 0;
        
        // Remover event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('resize', this.handleResize);
        
        console.log('Carrusel destruido');
    }
}

// Crear instancia global
const carouselManager = new CarouselManager();

// Configurar event listeners
carouselManager.setupEventListeners();

// Exportar manager y métodos principales
export { carouselManager };

export const initializeCarousel = (containerId) => {
    return carouselManager.initializeCarousel(containerId);
};

export const startCarousel = () => {
    return carouselManager.startCarousel();
};

export const stopCarousel = () => {
    return carouselManager.stopCarousel();
};

export const nextSlide = () => {
    return carouselManager.nextSlide();
};

export const goToSlide = (index, containerId) => {
    return carouselManager.goToSlide(index, containerId);
};

export const pauseCarousel = () => {
    return carouselManager.pauseCarousel();
};

export const resumeCarousel = () => {
    return carouselManager.resumeCarousel();
};

// Hacer disponible globalmente
window.carouselManager = carouselManager;
