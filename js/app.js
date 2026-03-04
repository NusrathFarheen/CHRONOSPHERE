/**
 * CHRONOSPHERE - Core Application Engine (Leaflet Edition)
 * Orchestrates Leaflet, Timeline, and Data Layers
 */

class ChronoSphere {
    constructor() {
        this.currentYear = 1500;
        this.historyData = [];
        this.arcsData = [];  // Dedicated arc narrative data
        this.map = null;
        this.markers = [];
        this.arcs = []; // Tracking array for drawn idea contagion arcs
        this.activeFilters = ['war', 'revolution', 'culture', 'science'];
        this.heatmapEnabled = false;
        this.uiVisible = true;
        this.isPlaying = false;
        this.playInterval = null;

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
            const [results, arcsResult] = await Promise.all([
                Promise.all(dataPromises),
                fetch('data/arcs.json').then(r => r.ok ? r.json() : [])
            ]);
            this.historyData = results.flat();
            this.arcsData = arcsResult;

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
                if (this.isPlaying) this.toggleAutoplay();
                this.updateYear(parseInt(e.target.value));
            });
        }

        const autoplayBtn = document.getElementById('autoplay-btn');
        if (autoplayBtn) {
            autoplayBtn.addEventListener('click', () => this.toggleAutoplay());
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

        // Template Buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const query = e.target.dataset.query;
                const promptInput = document.getElementById('ai-prompt');
                if (promptInput && query) {
                    promptInput.value = query;
                    this.runAISimulation();
                }
            });
        });

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



        // Arc Popup Close
        const arcPopupClose = document.getElementById('arc-popup-close');
        if (arcPopupClose) {
            arcPopupClose.addEventListener('click', () => {
                const popup = document.getElementById('arc-popup');
                if (popup) popup.classList.add('hidden');
            });
        }

        // UI Toggle
        const uiToggle = document.getElementById('toggle-ui');
        if (uiToggle) {
            uiToggle.addEventListener('click', () => this.toggleUI());
        }
    }

    toggleAutoplay() {
        this.isPlaying = !this.isPlaying;
        const btn = document.getElementById('autoplay-btn');
        const slider = document.getElementById('timeline-slider');

        if (btn) {
            const playIcon = btn.querySelector('.icon-play');
            const pauseIcon = btn.querySelector('.icon-pause');

            if (this.isPlaying) {
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'block';

                this.playInterval = setInterval(() => {
                    let nextYear = this.currentYear + 2;
                    if (nextYear > 2025) nextYear = 1500;
                    if (slider) slider.value = nextYear;
                    this.updateYear(nextYear);
                }, 300);
            } else {
                if (playIcon) playIcon.style.display = 'block';
                if (pauseIcon) pauseIcon.style.display = 'none';
                clearInterval(this.playInterval);
            }
        }
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
        // 1. Remove existing markers and arcs
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        this.arcs.forEach(a => this.map.removeLayer(a));
        this.arcs = [];

        // 2. Filter data by year and category
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

        // 4. Draw Idea Contagion Arcs
        filteredData.forEach(event => {
            if (event.connections && event.connections.length > 0) {
                event.connections.forEach(targetId => {
                    const targetEvent = filteredData.find(e => e.id === targetId);
                    if (targetEvent) {
                        const start = L.latLng(event.coordinates[0], event.coordinates[1]);
                        const end = L.latLng(targetEvent.coordinates[0], targetEvent.coordinates[1]);

                        // Generate smooth Bezier curve points
                        const curvePoints = this.getBezierCurve(start, end);

                        // Create and style the glowing polyline
                        const arc = L.polyline(curvePoints, {
                            className: `idea-arc ${event.type}`,
                            snakingSpeed: 200
                        });

                        this.map.addLayer(arc);
                        this.arcs.push(arc);
                    }
                });
            }
        });

        // 5. Draw dedicated Idea Contagion arcs from arcs.json
        this.renderContagionArcs();

        this.updateEraLabel();
    }

    // Mathematical Helper: Generate points for a quadratic Bezier curve over the map
    getBezierCurve(latlng1, latlng2) {
        const points = [];
        const numPoints = 50;

        // Calculate midpoint
        const midLat = (latlng1.lat + latlng2.lat) / 2;
        const midLng = (latlng1.lng + latlng2.lng) / 2;

        // Calculate distance to determine curve height
        const dx = latlng2.lng - latlng1.lng;
        const dy = latlng2.lat - latlng1.lat;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Control point: Perpendicular offset from midpoint
        // The further apart the points, the higher the arc
        const offset = distance * 0.25;

        // Perpendicular vector
        const perpX = -dy / distance;
        const perpY = dx / distance;

        const controlLat = midLat + perpY * offset;
        const controlLng = midLng + perpX * offset;

        // Generate points along the quadratic curve
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const u = 1 - t;

            const lat = (u * u * latlng1.lat) + (2 * u * t * controlLat) + (t * t * latlng2.lat);
            const lng = (u * u * latlng1.lng) + (2 * u * t * controlLng) + (t * t * latlng2.lng);

            points.push([lat, lng]);
        }

        return points;
    }

    // Render arcs from the dedicated arcs.json data
    renderContagionArcs() {
        if (!this.arcsData || this.arcsData.length === 0) return;

        this.arcsData.forEach(arcDef => {
            // Only show arc if the year has passed and its type is in active filters
            if (arcDef.year > this.currentYear) return;
            if (!this.activeFilters.includes(arcDef.type)) return;

            const origin = L.latLng(arcDef.origin.coordinates[0], arcDef.origin.coordinates[1]);

            arcDef.targets.forEach(target => {
                const dest = L.latLng(target.coordinates[0], target.coordinates[1]);
                const curvePoints = this.getBezierCurve(origin, dest);

                const arc = L.polyline(curvePoints, {
                    className: `idea-arc ${arcDef.type}`
                });

                arc.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    this.showArcPopup(arcDef);
                });

                this.map.addLayer(arc);
                this.arcs.push(arc);
            });
        });
    }

    // Show the arc narrative popup panel
    showArcPopup(arcDef) {
        const popup = document.getElementById('arc-popup');
        const titleEl = document.getElementById('arc-popup-title');
        const bodyEl = document.getElementById('arc-popup-body');
        const typeBar = document.getElementById('arc-popup-type-bar');

        if (!popup || !titleEl || !bodyEl) return;

        // Set content
        titleEl.textContent = arcDef.title;
        bodyEl.textContent = arcDef.narrative;

        // Style the type bar color matching the arc type
        const typeColors = {
            science: 'var(--science)',
            culture: 'var(--culture)',
            revolution: 'var(--revolution)',
            war: 'var(--war)'
        };
        typeBar.style.background = typeColors[arcDef.type] || 'var(--accent)';

        // Show the popup
        popup.classList.remove('hidden');
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
        if (this.isSimulating) return;

        const promptInput = document.getElementById('ai-prompt');
        const prompt = promptInput.value.trim();
        const responseBox = document.getElementById('ai-response');
        const hud = document.getElementById('sim-hud');
        const simWindow = document.querySelector('.simulator-window');

        if (!prompt) return;

        this.isSimulating = true;

        // Reset UI
        responseBox.innerHTML = '<span class="typing">Connecting to Chrono-AI...</span>';
        if (responseBox.classList) responseBox.classList.remove('glitch-text');
        if (hud) hud.classList.add('hidden');
        if (simWindow) simWindow.classList.add('glitch-active');

        // Visual Map Glitch (if implemented)
        if (this.triggerTimelineGlitch) this.triggerTimelineGlitch(true);

        try {
            const apiKey = this.getGeminiApiKey();
            if (!apiKey) {
                // Return if user canceled prompt
                if (simWindow) simWindow.classList.remove('glitch-active');
                responseBox.innerHTML = '<span class="typing">Simulation Aborted. API Key required.</span>';
                return;
            }

            const responseText = await this.fetchGeminiResponse(prompt, apiKey);

            // Simulation Logic
            if (simWindow) simWindow.classList.remove('glitch-active');
            if (hud) hud.classList.remove('hidden');
            if (responseBox.classList) responseBox.classList.add('glitch-text');

            const scenario = this.calculateMetrics(prompt, responseText);

            // Update HUD with calculated metrics if they exist in UI
            const divEl = document.getElementById('val-divergence');
            const stabEl = document.getElementById('val-stability');
            const fillDiv = document.getElementById('fill-divergence');
            const fillStab = document.getElementById('fill-stability');

            if (divEl) divEl.textContent = `${scenario.divergence}%`;
            if (stabEl) stabEl.textContent = `${scenario.stability}%`;
            if (fillDiv) fillDiv.style.width = `${scenario.divergence}%`;
            if (fillStab) fillStab.style.width = `${scenario.stability}%`;

            this.typeWriter(scenario.response, responseBox, () => {
                if (responseBox.classList) responseBox.classList.remove('glitch-text');
            });

        } catch (error) {
            console.error(error);
            if (simWindow) simWindow.classList.remove('glitch-active');
            responseBox.innerHTML = `<span style="color: red;">Chrono-Sync Error: ${error.message}</span>`;

            // Allow user to reset key if it failed due to bad key
            if (error.message.includes("400") || error.message.includes("API Key") || error.message.includes("key")) {
                const btn = document.createElement('button');
                btn.className = "btn-simulate-large";
                btn.style.marginTop = "10px";
                btn.textContent = "Re-enter API Key";
                btn.onclick = () => {
                    localStorage.removeItem('GEMINI_API_KEY');
                    this.isSimulating = false;
                    this.runAISimulation();
                };
                responseBox.appendChild(btn);
            }
        } finally {
            this.isSimulating = false;
        }
    }

    getGeminiApiKey() {
        let key = localStorage.getItem('GEMINI_API_KEY');
        if (!key) {
            key = prompt("Chrono-Sync requires a Google Gemini API Key.\\n\\nYou can get a free one at https://aistudio.google.com/app/apikey\\n\\nPlease enter it below:");
            if (key !== null && key.trim() !== "") {
                localStorage.setItem('GEMINI_API_KEY', key.trim());
            } else {
                return null;
            }
        }
        return localStorage.getItem('GEMINI_API_KEY');
    }

    async fetchGeminiResponse(promptText, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const systemInstruction = `You are Chrono-AI, a quantum history simulator. The user will give you a "What If" historical divergence query.
You must respond using EXACTLY this HTML format:

<b>Immediate Divergence:</b> [1-2 sentences on the immediate change]

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>[Category 1]:</b> [Effect]</li>
    <li><b>[Category 2]:</b> [Effect]</li>
    <li><b>[Category 3]:</b> [Effect]</li>
</ul>

<b>Final Outcome (2026):</b> [1-2 sentences on what the world looks like today]

Do not include markdown codeblocks. Just raw HTML. Keep it concise, creative, and plausible.`;

        const payload = {
            contents: [{
                parts: [{ text: promptText }]
            }],
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 800,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.warn(`Gemini API returned status ${response.status}. Falling back to internal engine...`);
            return this.getFallbackScenarioText(promptText);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.warn("Invalid response format from Gemini. Falling back to internal engine...");
            return this.getFallbackScenarioText(promptText);
        }
    }

    getFallbackScenarioText(prompt) {
        const p = prompt.toLowerCase();
        const scenarios = [
            {
                keywords: ['alexandria'],
                response: `<b>Immediate Divergence:</b> Library of Alexandria preserved by rapid deployment of Roman naval guards.
                
<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Technology:</b> Hero of Alexandria establishes the first steam-engine factory in 150 AD.</li>
    <li><b>Culture:</b> Global literacy exceeds 95% by 600 AD; the "Dark Ages" never occurs.</li>
    <li><b>Political:</b> The Ptolemaic-Roman Scientific Coalition becomes the first planetary government.</li>
</ul>

<b>Final Outcome (2026):</b> Humanity is a Type II civilization, currently colonizing the Andromeda Galaxy.`
            },
            {
                keywords: ['rome', 'roman'],
                response: `<b>Immediate Divergence:</b> Julius Caesar survives the Ides of March and implements the "Great Census."

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> Administrative automation preserves the Empire for 2,000 years.</li>
    <li><b>Law:</b> Roman Civil Law remains the sole global legal framework.</li>
    <li><b>Culture:</b> Latin stays the dominant global language; nation-states never form.</li>
</ul>

<b>Final Outcome (2026):</b> The Eternal Empire spans the globe, currently launching the first Martian colony.`
            },
            {
                keywords: ['napoleon', 'waterloo'],
                response: `<b>Immediate Divergence:</b> Napoleon executes a flanking maneuver at Waterloo, securing a decisive victory.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> The "United States of Europe" is established 140 years early.</li>
    <li><b>Language:</b> French becomes the primary commercial and diplomatic tongue.</li>
    <li><b>Technology:</b> Metric system adopted globally by 1850; standardized engineering accelerates growth.</li>
</ul>

<b>Final Outcome (2026):</b> A prosperous, unified global federation with its capital in Paris.`
            },
            {
                keywords: ['india', 'independence', 'freedom', 'colonial', 'gandhi'],
                response: `<b>Immediate Divergence:</b> The 1947 partition is avoided through a federalist compromise.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Geopolitical:</b> The Indian Subcontinent remains a single, massive economic powerhouse.</li>
    <li><b>Cold War:</b> India becomes the third superpower, leading the Non-Aligned Movement.</li>
    <li><b>Technology:</b> Early focus on indigenous aerospace makes India the leader in moon-mining.</li>
</ul>

<b>Final Outcome (2026):</b> The "Bharatiya Global Bloc" holds the keys to the world's energy supply through thorium fusion.`
            },
            {
                keywords: ['internet', 'computer', 'babbage', 'lovelace'],
                response: `<b>Immediate Divergence:</b> Ada Lovelace and Charles Babbage secure full funding for the Analytical Engine.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Social:</b> Mechanical computation enters the Victorian home by 1880.</li>
    <li><b>Communication:</b> A global telegraph-based "Steam Internet" forms in 1900.</li>
    <li><b>War:</b> Data-driven diplomacy prevents the outbreak of World War I.</li>
</ul>

<b>Final Outcome (2026):</b> A world of high-tech brass and steam, where cybernetics were perfected by the 1950s.`
            },
            {
                keywords: ['hitler', 'ww2', 'nazi'],
                response: `<b>Immediate Divergence:</b> Without Hitler, the National Socialist German Workers' Party fails to gain significant traction, remaining a fringe extremist group.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> The Weimar Republic, while fragile, survives its economic crises through international coalitions.</li>
    <li><b>Global Conflict:</b> A major, conventional European war likely occurs in the 1950s involving a resurgent, authoritarian Russia rather than Germany.</li>
    <li><b>Technology:</b> Jet propulsion and rocketry development are delayed by two decades without wartime acceleration.</li>
</ul>

<b>Final Outcome (2026):</b> A multi-polar Europe defined by strong national borders and slower technological integration, avoiding the trauma of the Holocaust.`
            }
        ];

        // Find match
        for (const s of scenarios) {
            if (s.keywords.some(k => p.includes(k))) {
                return s.response;
            }
        }

        // Dynamic Fallback
        const charSum = p.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const calcDivergence = Math.min(95, Math.max(15, (charSum % 70) + 15));
        const calcStability = Math.min(95, Math.max(10, 100 - calcDivergence + (charSum % 10)));

        return `<b>Immediate Divergence:</b> Neural node detected at prompt vertex: "${prompt}".

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> Regional hierarchies shift by ${Math.floor(calcDivergence / 3)}% to accommodate new timeline.</li>
    <li><b>Cultural:</b> Socio-linguistic drift detected in the subsequent 4 decades.</li>
    <li><b>Stability:</b> ${calcStability > 60 ? 'Structural integrity maintained.' : 'Anomalous timeline variance detected.'}</li>
</ul>
<b>Final Outcome (2026):</b> A timeline defined by ${calcDivergence > 50 ? 'radical sociopolitical realignment' : 'minor structural adjustments'}. Chrono-Sync stable.`;
    }

    calculateMetrics(prompt, responseText) {
        // Calculated Stats based on prompt length and seed
        const charSum = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const calcDivergence = Math.min(95, Math.max(15, (charSum % 70) + 15));
        const calcStability = Math.min(95, Math.max(10, 100 - calcDivergence + (charSum % 10)));

        // Clean up response if it accidentally has markdown tags
        let cleanResponse = responseText.replaceAll('\`\`\`html', '').replaceAll('\`\`\`', '').trim();

        return {
            divergence: calcDivergence,
            stability: calcStability,
            response: cleanResponse
        };
    }

    triggerTimelineGlitch(active) {
        const app = document.getElementById('app');
        if (active) {
            app.classList.add('timeline-glitch');
            setTimeout(() => {
                app.classList.remove('timeline-glitch');
            }, 5000);
        } else {
            app.classList.remove('timeline-glitch');
        }
    }

    typeWriter(text, element, callback) {
        if (this.typeWriterInterval) clearInterval(this.typeWriterInterval);

        element.innerHTML = '';
        let currentHTML = '';
        let i = 0;

        // Split text into tags and characters to handle HTML properly
        const parts = text.split(/(<[^>]*>)/g);
        let partIndex = 0;
        let charIndex = 0;

        this.typeWriterInterval = setInterval(() => {
            if (partIndex >= parts.length) {
                clearInterval(this.typeWriterInterval);
                this.typeWriterInterval = null;
                if (callback) callback();
                return;
            }

            const currentPart = parts[partIndex];
            if (currentPart.startsWith('<')) {
                currentHTML += currentPart;
                partIndex++;
            } else {
                currentHTML += currentPart.charAt(charIndex);
                charIndex++;
                if (charIndex >= currentPart.length) {
                    charIndex = 0;
                    partIndex++;
                }
            }

            element.innerHTML = currentHTML;

            // Scroll to bottom
            const scrollContainer = element.closest('.simulator-body');
            if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;

        }, 15);
    }
}

// Start Application
window.addEventListener('DOMContentLoaded', () => {
    window.chronosphere = new ChronoSphere();

    // Removed SW registration to permanently fix local localhost caching loops
});

