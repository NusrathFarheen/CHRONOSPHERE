/**
 * CHRONOSPHERE - Core Application Engine (Leaflet Edition)
 * Orchestrates Leaflet, Timeline, and Data Layers
 */

class ChronoSphere {
    constructor() {
        this.currentYear = 1500;
        this.historyData = [];
        this.map = null;
        this.markers = [];
        this.activeFilters = ['war', 'revolution', 'culture', 'science'];
        this.heatmapEnabled = false;
        this.uiVisible = true;

        this.init();
    }

    async init() {
        try {
            // 0. Handle Window Resize
            window.addEventListener('resize', () => {
                if (this.map) this.map.invalidateSize();
            });

            // 1. Load Modular Data
            const continents = ['europe', 'asia', 'africa', 'americas', 'oceania', 'global'];
            const dataPromises = continents.map(c =>
                fetch(`data/${c}.json`).then(r => r.ok ? r.json() : [])
            );
            const results = await Promise.all(dataPromises);
            this.historyData = results.flat();


            // 2. Initialize Map
            this.initMap();

            // 3. Initialize UI Components
            this.setupUI();

            // 4. Close Loader
            setTimeout(() => {
                const loader = document.getElementById('loader');
                if (loader) {
                    gsap.to(loader, { opacity: 0, duration: 1, onComplete: () => loader.remove() });
                }
            }, 1000);

        } catch (error) {
            console.error("Initialization Failed:", error);
        }
    }

    initMap() {
        // Initialize Leaflet Map
        this.map = L.map('map', {
            center: [20, 0],
            zoom: 2.5,
            zoomControl: false,
            attributionControl: true
        });

        // Add CartoDB Dark Matter Tiles (Premium Dark Theme, No Key Required)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        // Move attribution to avoid overlapping UI
        this.map.attributionControl.setPosition('bottomleft');

        this.updateMapState();
    }

    updateYear(year) {
        this.currentYear = year;

        // Update Displays
        const yearDisplay = document.getElementById('display-year');
        const eraDisplay = document.getElementById('display-era');

        if (yearDisplay) yearDisplay.textContent = year;

        // Dynamic Era Names
        let era = "The Renaissance";
        if (year >= 2000) era = "The Digital Age";
        else if (year >= 1945) era = "The Cold War";
        else if (year >= 1914) era = "The World Wars";
        else if (year >= 1800) era = "The Industrial Era";
        else if (year >= 1700) era = "The Enlightenment";

        if (eraDisplay) eraDisplay.textContent = era;

        this.updateMapState();
    }



    setupUI() {
        const slider = document.getElementById('timeline-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.updateYear(parseInt(e.target.value));
            });
        }

        // Filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.add('active');
            chip.addEventListener('click', () => {
                const filter = chip.dataset.filter;
                if (this.activeFilters.includes(filter)) {
                    this.activeFilters = this.activeFilters.filter(f => f !== filter);
                    chip.classList.remove('active');
                } else {
                    this.activeFilters.push(filter);
                    chip.classList.add('active');
                }
                this.updateMapState();
            });
        });

        // Heatmap Toggle
        const heatmapBtn = document.getElementById('toggle-heatmap');
        if (heatmapBtn) {
            heatmapBtn.addEventListener('click', () => {
                this.heatmapEnabled = !this.heatmapEnabled;
                heatmapBtn.classList.toggle('active');
                this.updateMapState();
            });
        }


        // Close Detail Card
        const closeCard = document.getElementById('close-card');
        if (closeCard) {
            closeCard.addEventListener('click', () => this.hideEventDetails());
        }

        // Click Map to close detail
        this.map.on('click', (e) => {
            if (!document.getElementById('floating-card').classList.contains('hidden')) {
                // Check if click was on map (not card)
                if (e.originalEvent.target.id === 'map') {
                    this.hideEventDetails();
                }
            }
        });

        // Simulator Handlers
        const closeSim = document.getElementById('close-simulator');
        const simOverlay = document.getElementById('simulator-overlay');
        const navSim = document.getElementById('nav-simulator');

        if (closeSim) {
            closeSim.addEventListener('click', () => simOverlay.classList.add('hidden'));
        }

        if (navSim) {
            navSim.addEventListener('click', () => simOverlay.classList.remove('hidden'));
        }

        // AI Processor for Simulation
        const runSim = document.getElementById('run-simulation');
        if (runSim) {
            runSim.addEventListener('click', () => this.runAISimulation());
        }

        // Learn More Handler
        const learnMoreBtn = document.getElementById('card-learn-more');
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                if (this.activeEvent && this.activeEvent.wikipedia_url) {
                    window.open(this.activeEvent.wikipedia_url, '_blank');
                }
            });
        }

        // UI Toggle
        const uiToggle = document.getElementById('toggle-ui');
        if (uiToggle) {
            uiToggle.addEventListener('click', () => this.toggleUI());
        }

        // Divergence Templates
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const promptArea = document.getElementById('ai-prompt');
                if (promptArea) {
                    promptArea.value = btn.dataset.query;
                    this.runAISimulation();
                }
            });
        });
    }


    updateEraLabel() {
        const prefix = document.querySelector('.year-prefix');
        if (!prefix) return;

        if (this.currentYear < 1600) prefix.textContent = "Age of Discovery";
        else if (this.currentYear < 1750) prefix.textContent = "Colonial Expansion";
        else if (this.currentYear < 1850) prefix.textContent = "Age of Revolutions";
        else if (this.currentYear < 1914) prefix.textContent = "Industrial Era";
        else if (this.currentYear < 1945) prefix.textContent = "World Wars";
        else if (this.currentYear < 1991) prefix.textContent = "The Cold War";
        else prefix.textContent = "The Digital Age";
    }

    toggleUI() {
        this.uiVisible = !this.uiVisible;
        const header = document.querySelector('.main-header');
        const timeline = document.querySelector('.timeline-container');
        const legend = document.querySelector('.map-legend');

        const opacity = this.uiVisible ? 1 : 0;
        const pointerEvents = this.uiVisible ? 'auto' : 'none';

        gsap.to([header, timeline, legend], {
            opacity,
            duration: 0.5,
            ease: "power2.inOut",
            onStart: () => {
                if (this.uiVisible) {
                    header.style.pointerEvents = 'none'; // header container is none, children are auto
                    timeline.style.pointerEvents = 'auto';
                    legend.style.pointerEvents = 'auto';
                } else {
                    [header, timeline, legend].forEach(el => el.style.pointerEvents = 'none');
                }
            }
        });
    }


    updateMapState() {
        // 1. Remove existing markers
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        // 2. Filter data by year and category (Show only events from last 100 years to reduce clutter)
        const filteredData = this.historyData.filter(event =>
            event.year <= this.currentYear &&
            this.activeFilters.includes(event.type)
        );

        // 3. Create new markers
        filteredData.forEach(event => {
            const baseSize = 12;
            const intensity = event.intensity_score || 0.5;
            const size = this.heatmapEnabled ? baseSize * (1 + intensity) : baseSize;

            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="marker-pulse ${event.type}" style="background-color: var(--${event.type}); box-shadow: 0 0 ${this.heatmapEnabled ? 20 * intensity : 15}px var(--${event.type}); width: ${size}px; height: ${size}px;"></div>`,
                iconSize: [size + 4, size + 4],
                iconAnchor: [(size + 4) / 2, (size + 4) / 2]
            });


            const marker = L.marker(event.coordinates, { icon: icon })
                .addTo(this.map);


            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                this.showEventDetails(event);
            });

            this.markers.push(marker);
        });
    }

    showEventDetails(event) {
        // Save previous zoom/center for restoration
        this.previousView = {
            center: this.map.getCenter(),
            zoom: this.map.getZoom()
        };

        // 1. Zoom to marker
        this.map.flyTo(event.coordinates, 6, {
            duration: 1.2
        });

        // 2. Dim background
        document.body.classList.add('event-active');
        setTimeout(() => document.body.classList.add('dim-active'), 50);

        // 3. Populate Floating Card
        this.activeEvent = event; // Track active event for "Learn More"
        const card = document.getElementById('floating-card');
        const badge = document.getElementById('card-badge');
        const title = document.getElementById('card-title');
        const year = document.getElementById('card-year');
        const desc = document.getElementById('card-description');
        const gallery = document.getElementById('card-images');

        badge.textContent = event.type.toUpperCase();
        badge.className = `badge ${event.type}`;
        title.textContent = event.title;
        year.textContent = event.year;
        desc.textContent = event.description;

        // Populate Images
        gallery.innerHTML = '';
        if (event.images && event.images.length > 0) {
            event.images.forEach((img) => {
                const imgWrap = document.createElement('div');
                imgWrap.className = 'image-wrapper';
                imgWrap.innerHTML = `
                    <img src="${img.url}" alt="${img.caption}" 
                         onerror="this.src='https://images.unsplash.com/photo-1585644131575-f09691888195?auto=format&fit=crop&w=400&q=80'">
                    <div class="image-overlay">
                        <span>Historical View</span>
                    </div>
                `;
                imgWrap.onclick = () => this.openGallery(img);
                gallery.appendChild(imgWrap);
            });
        }

        // 4. Smart Positioning
        // Calculate pixel position of marker
        const pos = this.map.latLngToContainerPoint(event.coordinates);
        const cardWidth = 420;
        const cardHeight = 350; // approximate

        let leftPos = pos.x + 40;
        let topPos = pos.y - (cardHeight / 2);

        // Right Edge Check
        if (leftPos + cardWidth > window.innerWidth - 40) {
            leftPos = pos.x - cardWidth - 40;
        }

        // Vertical Bounds Check
        if (topPos < 120) topPos = 120;
        if (topPos + cardHeight > window.innerHeight - 150) {
            topPos = window.innerHeight - cardHeight - 150;
        }

        card.style.left = `${leftPos}px`;
        card.style.top = `${topPos}px`;

        card.classList.remove('hidden');
    }

    hideEventDetails() {
        const card = document.getElementById('floating-card');
        card.classList.add('hidden');

        document.body.classList.remove('dim-active');
        setTimeout(() => document.body.classList.remove('event-active'), 500);

        // Restore View
        if (this.previousView) {
            this.map.flyTo(this.previousView.center, this.previousView.zoom, {
                duration: 1.2
            });
        }
    }

    openGallery(img) {
        const modal = document.getElementById('gallery-modal');
        const modalImg = document.getElementById('modal-image');
        const modalTitle = document.getElementById('image-title');
        const modalDesc = document.getElementById('image-desc');

        if (modal && modalImg) {
            modalImg.src = img.url;
            if (modalTitle) modalTitle.textContent = img.caption;
            if (modalDesc) modalDesc.textContent = `Documented in ${img.year || 'unknown'}. Credit: ${img.credit || 'Public Domain'}`;

            modal.style.display = 'flex';
            gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.5 });

            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    gsap.to(modal, { opacity: 0, duration: 0.3, onComplete: () => modal.style.display = 'none' });
                };
            }
        }
    }


    async runAISimulation() {
        const promptInput = document.getElementById('ai-prompt');
        const prompt = promptInput.value.toLowerCase();
        const responseBox = document.getElementById('ai-response');
        const hud = document.getElementById('sim-hud');
        const simWindow = document.querySelector('.simulator-window');

        if (!prompt) return;

        // Reset UI
        responseBox.innerHTML = '<span class="typing">Connecting to Chrono-AI...</span>';
        hud.classList.add('hidden');
        simWindow.classList.add('glitch-active');

        // Visual Map Glitch
        this.triggerTimelineGlitch(true);

        // Simulation Logic
        setTimeout(() => {
            simWindow.classList.remove('glitch-active');
            hud.classList.remove('hidden');

            const scenario = this.getScenario(prompt);

            // Update HUD with scenario metrics
            document.getElementById('val-divergence').textContent = `${scenario.divergence}%`;
            document.getElementById('val-stability').textContent = `${scenario.stability}%`;
            document.getElementById('fill-divergence').style.width = `${scenario.divergence}%`;
            document.getElementById('fill-stability').style.width = `${scenario.stability}%`;

            this.typeWriter(scenario.response, responseBox);
        }, 2000);
    }

    getScenario(prompt) {
        const scenarios = [
            {
                keywords: ['alexandria'],
                divergence: 78,
                stability: 42,
                response: `SIMULATION DATA: Alexandria Safeguard Protocol.
                
If the Library never burned, the "Dark Ages" transition is bypassed. Knowledge of steam power and advanced calculus is stabilized by 400 AD. 

KEY RIPPLE EFFECTS:
• Industrialization: Occurs 1,400 years early. The first orbital satellite is launched in 750 AD.
• Cultural: Global literacy reaches 90% by the 10th century. Greek remains the scientific lingua franca.
• Stability: CRITICAL. Rapid expansion leads to resource depletion before planetary management is understood.

Timeline convergence: High-Tech Antiquity.`
            },
            {
                keywords: ['rome', 'roman'],
                divergence: 65,
                stability: 55,
                response: `SIMULATION DATA: Pax Romana Perpetual.

The Roman Empire avoids the 5th-century collapse via administrative decentralization and early adoption of printing.

KEY RIPPLE EFFECTS:
• Geopolitical: A unified European/Mediterranean state persists into the 20th century.
• Legal: Civil law is standardized globally. Modern nation-states never form.
• Stability: MODERATE. Stagnation in social reform leads to internal friction, but external threats are non-existent.`
            },
            {
                keywords: ['napoleon', 'waterloo'],
                divergence: 45,
                stability: 72,
                response: `SIMULATION DATA: Napoleonic Hegemony.

Victory at Waterloo preserves the Continental System, forcing a French-led European Union by 1850.

KEY RIPPLE EFFECTS:
• Language: French becomes the primary global trade language.
• Political: The "Concert of Europe" is replaced by a single imperial oversight.
• Stability: SUSTAINABLE. Britain remains a powerful naval isolationist, creating a bipolar world order.`
            },
            {
                keywords: ['india', 'independence', 'freedom'],
                divergence: 58,
                stability: 61,
                response: `SIMULATION DATA: Extended Colonialism Divergence.

If India never gained independence in 1947, the global decolonization movement stalls, leading to a "Cold War" defined by Imperial vs Sovereign interests.

KEY RIPPLE EFFECTS:
• Global: The Commonwealth remains a formal, unified political bloc. 
• Economics: Asian markets develop under strictly controlled extractive models.
• Stability: VOLATILE. Guerilla movements across Africa and SE Asia prevent global peace well into the 1980s.`
            },
            {
                keywords: ['internet', 'computer', 'technology'],
                divergence: 32,
                stability: 85,
                response: `SIMULATION DATA: Early Silicon Awakening.

If Babbage’s Engine was fully funded in 1840, information theory matures during the Victorian Era.

KEY RIPPLE EFFECTS:
• Social: Victorian "Steam-Computers" create an early global oversight network.
• War: Calculations of military logistics prevent World War I through optimized deterrence.
• Stability: HIGH. The gradual crawl of tech allows for better societal adaptation than the 20th-century boom.`
            },
            {
                keywords: ['cleopatra'],
                divergence: 24,
                stability: 88,
                response: `SIMULATION DATA: Ptolemaic Pivot.

Discovery of Cleopatra's actual strategic directives leads to a revised understanding of Roman-Egyptian diplomacy. 

KEY RIPPLE EFFECTS:
• Archaeological: Early discovery triggers a "Classical Renaissance" in the 1800s.
• Religion: Greater syncretism between Mediterranean faiths.
• Stability: OPTIMAL. Minor adjustments to the historical record, but no major structural collapse.`
            }
        ];

        // Find match
        for (const s of scenarios) {
            if (s.keywords.some(k => prompt.includes(k))) {
                return s;
            }
        }

        // Fallback Perspective
        const div = Math.floor(Math.random() * 30) + 15;
        const stab = 100 - Math.floor(div * 1.5);
        return {
            divergence: div,
            stability: stab,
            response: `SIMULATION DATA: General Divergence Protocol. Prompt: "${prompt}".

The ripple effects of this change create a ${div}% shift in the core timeline, primarily affecting local regional hierarchies.

KEY RIPPLE EFFECTS:
• Socio-Political: Power structures shift to accommodate the new divergence vertex.
• Temporal: Minor butterfly effects detected in the following 50 years.
• Stability: ${stab > 70 ? 'STABLE' : 'UNPREDICTABLE'}. Chrono-Sync holding.

Further input required for deep-node analysis.`
        };
    }

    triggerTimelineGlitch(active) {
        const app = document.getElementById('app');
        if (active) {
            app.classList.add('timeline-glitch');
            setTimeout(() => {
                app.classList.remove('timeline-glitch');
            }, 5000); // Effect durations
        } else {
            app.classList.remove('timeline-glitch');
        }
    }

    typeWriter(text, element) {
        element.innerHTML = '';
        let i = 0;
        const interval = setInterval(() => {
            element.innerHTML += text.charAt(i);
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 20);
    }
}

// Start Application
window.addEventListener('DOMContentLoaded', () => {
    window.chronosphere = new ChronoSphere();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.log('SW registration failed:', err));
    }
});

