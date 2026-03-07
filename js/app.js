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
                this.isSimulating = false;
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
            systemInstruction: {
                role: "system",
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                role: "user",
                parts: [{ text: promptText }]
            }],
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
            const errData = await response.json();
            const errDetails = errData.error ? errData.error.message : response.statusText;
            console.error(`[Chrono-Sync API Error ${response.status}]:`, errData);
            throw new Error(`API Error ${response.status}: ${errDetails}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.warn("Invalid response format from Gemini.", data);
            throw new Error("Invalid response format received from AI Simulator.");
        }
    }

    getFallbackScenarioText(prompt) {
        const p = prompt.toLowerCase();

        // Scenarios are ordered from most-specific (long phrases) to least-specific (short words).
        // This prevents 'india' matching before 'east india company'.
        const scenarios = [
            {
                keywords: ['east india company', 'british east india'],
                response: `<b>Immediate Divergence:</b> Without the East India Company's charter in 1600, English mercantile capitalism finds no unified vessel to project power into Asia. Dutch and Portuguese trading houses dominate the routes to India and China for another two centuries.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Geopolitical:</b> India remains a patchwork of powerful Mughal successors — the Maratha Empire, Hyderabad, and the Sikhs — never subjugated by a foreign commercial entity.</li>
    <li><b>Economic:</b> The wealth extracted from Bengal during the Plassey era (~£1 trillion in today's terms) stays in South Asia, funding an indigenous Industrial Revolution by the 1780s.</li>
    <li><b>Global:</b> Britain, never enriched by Indian wealth, develops more slowly. The American Revolution may never occur — there is no "taxation without representation" model to rebel against.</li>
</ul>

<b>Final Outcome (2026):</b> A multi-polar world where the Indian subcontinent became the world's premier economic and technological power by 1900, with Bombay and Calcutta as the global centers of finance.`
            },
            {
                keywords: ['mongol', 'genghis', 'temujin', 'kublai'],
                response: `<b>Immediate Divergence:</b> Without Temujin's unification of the Mongol tribes, no single conquering force sweeps across Eurasia in the 13th century.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Islamic World:</b> The Abbasid Caliphate in Baghdad survives. The "Golden Age of Islam" — already producing algebra, medicine, and astronomy — continues uninterrupted for centuries.</li>
    <li><b>China:</b> The Song Dynasty, never conquered, likely achieves an Industrial Revolution by the 14th century. Gunpowder, paper, and the compass are industrialized 400 years early.</li>
    <li><b>Europe:</b> Never threatened by Mongol invasion, feudal Europe remains insular. The Renaissance likely never happens — no influx of Arabic knowledge through trade disruption.</li>
</ul>

<b>Final Outcome (2026):</b> A world where the Islamic Caliphate and Song China are the dominant superpowers, with Europe still largely agricultural and fragmented.`
            },
            {
                keywords: ['ww3', 'world war 3', 'world war iii', 'third world war', 'nuclear war'],
                response: `<b>Immediate Divergence:</b> The conditions that trigger a third global conflict — most likely a Taiwan Strait confrontation or a NATO-Russia escalation — fail to materialize due to last-minute diplomatic intervention.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Geopolitical:</b> The unresolved tensions that caused the near-miss fundamentally reshape global governance. A reformed UN Security Council with binding arbitration powers is established by 2028.</li>
    <li><b>Technology:</b> Defense spending, freed from active-conflict burn rates, floods into renewable energy and AI research. Fusion power is achieved by 2035.</li>
    <li><b>Social:</b> A global "relief generation" emerges — having faced the abyss of nuclear annihilation and stepped back, a new wave of international cooperation redefines the 21st century.</li>
</ul>

<b>Final Outcome (2026):</b> Still on the knife's edge. The avoided war bought time, but the underlying fault lines — resource scarcity, AI-driven economic inequality, and competing ideologies — remain unresolved.`
            },
            {
                keywords: ['gandhi', 'mahatma'],
                response: `<b>Immediate Divergence:</b> Without Gandhi's philosophy of Ahimsa (non-violence), the Indian independence movement fractures into competing armed factions — socialist revolutionaries, Hindu nationalists, and regional separatists.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Independence:</b> A violent insurgency against British rule unfolds. Britain, weakened post-WW2, likely withdraws by 1950 but into chaos — not a unified nation.</li>
    <li><b>Partition:</b> Without Gandhi's moral authority to moderate the Congress-League conflict, the 1947 partition is exponentially bloodier. Pakistan may fragment further, splitting into three states.</li>
    <li><b>Global:</b> The blueprint of peaceful civil disobedience never reaches Martin Luther King Jr. The American civil rights movement takes a far more confrontational, potentially violent path.</li>
</ul>

<b>Final Outcome (2026):</b> South Asia is fragmented into 6-7 smaller states, still negotiating borders. Non-violent civil resistance as a global political tool may never have been invented.`
            },
            {
                keywords: ['cold war', 'soviet', 'ussr', 'communism'],
                response: `<b>Immediate Divergence:</b> The ideological confrontation between the US and USSR de-escalates permanently following the Cuban Missile Crisis, with both powers agreeing to a binding mutual disarmament framework.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Space:</b> Without the "space race" as a propaganda battle, the Moon landing becomes a joint US-Soviet mission in 1971. Mars is colonized by 1995.</li>
    <li><b>Vietnam:</b> Without Cold War proxy-war logic, US intervention collapses politically. Vietnam unifies peacefully under a socialist government in 1965.</li>
    <li><b>Economy:</b> Trillions freed from arms spending flood into health, education, and infrastructure globally. Global extreme poverty is eradicated by 2000.</li>
</ul>

<b>Final Outcome (2026):</b> A cooperative world order where the US and Russia are the closest of allies, jointly administering the International Mars Authority.`
            },
            {
                keywords: ['alexandria'],
                response: `<b>Immediate Divergence:</b> The Library of Alexandria is preserved by a decisive Roman naval guard. Every scroll — Euclid's missing works, Hero's automata, Aristarchus's heliocentric model — survives.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Technology:</b> Hero of Alexandria's steam engine is industrialized by 200 AD. The Roman Empire begins its own Industrial Revolution.</li>
    <li><b>Culture:</b> Global literacy exceeds 90% by 600 AD. The "Dark Ages" never occurs — classical knowledge is never lost.</li>
    <li><b>Religion:</b> Early astronomy proving a Sun-centered galaxy prevents the geocentric dogma from taking hold. The Scientific Revolution happens 1,400 years early.</li>
</ul>

<b>Final Outcome (2026):</b> Humanity is a Type II Kardashev civilization. We left Earth permanently in 1300 AD. The planet is now a nature reserve.`
            },
            {
                keywords: ['rome', 'roman empire'],
                response: `<b>Immediate Divergence:</b> Julius Caesar survives the Ides of March and implements sweeping constitutional reforms, transforming Rome into a stable constitutional monarchy.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> Without the power vacuum of Caesar's murder, the long civil wars never happen. Rome's engineering and legal systems spread further and faster.</li>
    <li><b>Religion:</b> Christianity remains a minor Jewish sect within a tolerant multicultural empire. Islam may never emerge as a political force.</li>
    <li><b>Language:</b> Latin never fragments into French, Spanish, Italian, and Portuguese — there is one global Romance language.</li>
</ul>

<b>Final Outcome (2026):</b> The Roman Empire, continuously reformed over 2,000 years, is the world's sole superpower — a constitutional monarchy of 4 billion citizens spanning four continents.`
            },
            {
                keywords: ['napoleon', 'waterloo'],
                response: `<b>Immediate Divergence:</b> Napoleon executes a decisive flanking maneuver at Waterloo, routing the Coalition forces and securing peace terms in Paris within six months.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> The "United States of Europe" — Napoleon's dream — forms under French hegemony by 1820, 130 years before the actual EU.</li>
    <li><b>Language:</b> French becomes the global language of commerce, law, and science. English remains the language of a minor Atlantic island.</li>
    <li><b>Technology:</b> The Metric system is adopted globally by 1830. Standardized engineering accelerates the Industrial Revolution by decades.</li>
</ul>

<b>Final Outcome (2026):</b> A federal Europe of 500 million citizens, the world's sole superpower, with its capital in Paris and its currency the Franc.`
            },
            {
                keywords: ['internet', 'computer', 'babbage', 'lovelace'],
                response: `<b>Immediate Divergence:</b> Ada Lovelace and Charles Babbage secure Royal Society funding for the Analytical Engine in 1843. The first programmable computer is operational by 1855.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Social:</b> Mechanical computation enters Victorian factories and homes by 1880. The first "programmer" profession emerges in the 1870s, predominantly female.</li>
    <li><b>Communication:</b> A global telegraph-and-punch-card network — a "Steam Internet" — forms by 1900.</li>
    <li><b>War:</b> Data-driven logistics and code-breaking technology prevents both World Wars from reaching their catastrophic scales.</li>
</ul>

<b>Final Outcome (2026):</b> A world of high-tech brass and steam where biological computing was perfected by 1980. The cyberpunk aesthetic is reality, not fiction.`
            },
            {
                keywords: ['hitler', 'ww2', 'world war 2', 'world war ii', 'nazi', 'second world war'],
                response: `<b>Immediate Divergence:</b> Without Hitler's rise, the NSDAP remains a fringe extremist party. The Weimar Republic, though fragile, survives through international economic reform.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> A conventional European war still likely occurs in the 1950s — but between a resurgent Russia and a coalition of democracies, not Nazi Germany.</li>
    <li><b>Technology:</b> Without wartime acceleration, jet engines, rocketry, and nuclear fission are delayed by 20-30 years. The space age begins in the 1980s.</li>
    <li><b>Humanity:</b> Six million Jewish lives are spared. The cultural, scientific, and artistic contributions of those who died in the Holocaust — and their descendants — reshape civilization.</li>
</ul>

<b>Final Outcome (2026):</b> A slower-developing but more humane world. Europe is a loose confederation of strong nation-states. Nuclear weapons may have never been invented.`
            },
            {
                keywords: ['india', 'independence', 'partition', 'british india'],
                response: `<b>Immediate Divergence:</b> Indian independence is achieved in 1930 through a successful Swaraj constitutional negotiation, 17 years early, avoiding the trauma of Partition.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Geopolitical:</b> A unified Indian subcontinent — Hindu, Muslim, and Sikh populations co-governing — becomes a superpower 30 years ahead of history's schedule.</li>
    <li><b>Cold War:</b> India, never weakened by Partition's refugee crisis, takes decisive leadership of the Non-Aligned Movement. The Cold War ends a decade early.</li>
    <li><b>Economy:</b> Without the trauma of 1947, South Asia's economic growth trajectory mirrors post-war Germany. GDP per capita rivals South Korea's by 1990.</li>
</ul>

<b>Final Outcome (2026):</b> A unified South Asia of 2 billion people is the world's largest economy. Delhi and Bombay are the financial and cultural capitals of the globe.`
            }
        ];

        // Find match (longer, more specific phrases checked first via array order)
        for (const s of scenarios) {
            if (s.keywords.some(k => p.includes(k))) {
                return s.response;
            }
        }

        // Intelligent Generic Fallback — uses the actual prompt to feel responsive
        const subject = prompt.replace(/what if/i, '').replace(/never (existed?|happened?|born?|found?|invented?)/i, '').trim();
        const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);

        return `<b>Immediate Divergence:</b> The removal or alteration of <i>${capSubject}</i> creates a critical fork in the historical timeline.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> The power vacuum left by this absence is filled within one generation by a rival force — one previously suppressed or outcompeted by ${capSubject}.</li>
    <li><b>Technological:</b> Any innovations directly attributed to or accelerated by ${capSubject} are delayed by 30–80 years. Adjacent fields that depended on them stagnate proportionally.</li>
    <li><b>Cultural:</b> The philosophical and ideological legacy of ${capSubject} never enters the global consciousness. Successor movements develop along fundamentally different lines.</li>
</ul>

<b>Final Outcome (2026):</b> A world recognizable in geography but alien in culture and technology — a reminder that history is not inevitable, but a chain of fragile contingencies where the absence of any single link reshapes everything downstream.`;
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
            if (partIndex % 2 !== 0) {
                // Odd indices contain the HTML tags matched by the split regex
                currentHTML += currentPart;
                partIndex++;
            } else {
                let char = currentPart.charAt(charIndex);
                if (char === '<') char = '&lt;';
                else if (char === '>') char = '&gt;';

                currentHTML += char;
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

