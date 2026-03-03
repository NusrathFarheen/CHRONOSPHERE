class ChronoSphere {
    constructor() {
        this.svg = document.getElementById('map-svg');
        this.container = document.getElementById('map');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.projection = d3.geoMercator()
            .scale(this.width / 6)
            .translate([this.width / 2, this.height / 1.5]);
        this.path = d3.geoPath().projection(this.projection);
        this.events = [];
        this.init();
    }

    async init() {
        await this.loadMap();
        await this.loadEvents();
        this.setupEventListeners();
    }

    async loadMap() {
        const response = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
        const data = await response.json();

        d3.select("#map-svg")
            .selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("d", this.path)
            .attr("class", "country")
            .on("mouseover", function () {
                d3.select(this).style("fill", "rgba(255, 255, 255, 0.08)");
            })
            .on("mouseout", function () {
                d3.select(this).style("fill", "transparent");
            });
    }

    async loadEvents() {
        const files = [
            'data/africa.json',
            'data/asia.json',
            'data/americas.json',
            'data/europe.json',
            'data/oceania.json',
            'data/global.json'
        ];

        for (const file of files) {
            try {
                const response = await fetch(file);
                const data = await response.json();
                this.events = [...this.events, ...data];
            } catch (e) {
                console.error(`Failed to load ${file}`, e);
            }
        }
        this.renderMarkers();
    }

    renderMarkers() {
        this.events.forEach((event, index) => {
            const [x, y] = this.projection([event.lng, event.lat]);

            const marker = document.createElement('div');
            marker.className = `marker ${event.type}`;
            marker.style.left = `${x}px`;
            marker.style.top = `${y}px`;

            const pulse = document.createElement('div');
            pulse.className = 'marker-pulse';
            marker.appendChild(pulse);

            marker.addEventListener('click', () => this.showOverlay(event));
            this.container.appendChild(marker);
        });
    }

    showOverlay(event) {
        const overlay = document.getElementById('event-overlay');
        const content = document.getElementById('overlay-content');

        overlay.classList.remove('hidden');
        content.innerHTML = `
            <div class="event-detail">
                <div class="event-image-container">
                    <img src="${event.image}" alt="${event.event}" class="event-main-image">
                    <div class="intensity-badge">Intensity: ${event.intensity}</div>
                </div>
                <div class="event-info">
                    <div class="event-meta">
                        <span>${event.year}</span> ΓÇó <span>${event.location}</span>
                    </div>
                    <h2>${event.event}</h2>
                    <p>${event.description}</p>
                    <a href="${event.learnMore}" target="_blank" class="learn-more-btn">Recordings & Artifacts</a>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        document.getElementById('close-overlay').addEventListener('click', () => {
            document.getElementById('event-overlay').classList.add('hidden');
        });

        const simBtn = document.getElementById('open-simulator');
        if (simBtn) {
            simBtn.addEventListener('click', () => this.toggleSimulator(true));
        }

        const closeSim = document.getElementById('close-simulator');
        if (closeSim) {
            closeSim.addEventListener('click', () => this.toggleSimulator(false));
        }

        const syncBtn = document.getElementById('run-sim');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.runAISimulation());
        }

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('ai-prompt').value = e.target.textContent;
            });
        });

        // UI Toggle
        const uiToggle = document.getElementById('toggle-ui');
        if (uiToggle) {
            uiToggle.addEventListener('click', () => this.toggleUI());
        }

    }

    toggleUI() {
        const header = document.querySelector('header');
        const stats = document.querySelector('.bottom-stats');
        header.style.display = header.style.display === 'none' ? 'flex' : 'none';
        stats.style.display = stats.style.display === 'none' ? 'flex' : 'none';
    }

    toggleSimulator(show) {
        const sim = document.getElementById('simulator-overlay');
        if (show) {
            sim.classList.remove('hidden');
            this.triggerTimelineGlitch(false);
        } else {
            sim.classList.add('hidden');
            this.triggerTimelineGlitch(false);
        }
    }

    async runAISimulation() {
        const promptInput = document.getElementById('ai-prompt');
        const prompt = promptInput.value.toLowerCase().trim();
        const responseBox = document.getElementById('ai-response');
        const hud = document.getElementById('sim-hud');
        const simWindow = document.querySelector('.simulator-window');

        if (!prompt) return;

        // Reset UI
        responseBox.innerHTML = '<span class="typing">Connecting to Chrono-AI...</span>';
        responseBox.classList.remove('glitch-text');
        hud.classList.add('hidden');
        simWindow.classList.add('glitch-active');

        // Visual Map Glitch
        this.triggerTimelineGlitch(true);

        // Simulation Logic
        setTimeout(() => {
            simWindow.classList.remove('glitch-active');
            hud.classList.remove('hidden');
            responseBox.classList.add('glitch-text');

            const scenario = this.getScenario(prompt);

            // Update HUD with calculated metrics
            document.getElementById('val-divergence').textContent = `${scenario.divergence}%`;
            document.getElementById('val-stability').textContent = `${scenario.stability}%`;
            document.getElementById('fill-divergence').style.width = `${scenario.divergence}%`;
            document.getElementById('fill-stability').style.width = `${scenario.stability}%`;

            this.typeWriter(scenario.response, responseBox, () => {
                responseBox.classList.remove('glitch-text');
            });
        }, 2500);
    }

    getScenario(prompt) {
        // Calculated Stats based on prompt length and seed
        const charSum = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const calcDivergence = Math.min(95, Math.max(15, (charSum % 70) + 15));
        const calcStability = Math.min(95, Math.max(10, 100 - calcDivergence + (charSum % 10)));

        const scenarios = [
            {
                keywords: ['alexandria'],
                divergence: 82,
                stability: 38,
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
                divergence: 68,
                stability: 52,
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
                divergence: 54,
                stability: 65,
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
                keywords: ['india', 'independence', 'freedom', 'colonial'],
                divergence: 58,
                stability: 44,
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
                divergence: 35,
                stability: 88,
                response: `<b>Immediate Divergence:</b> Ada Lovelace and Charles Babbage secure full funding for the Analytical Engine.

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Social:</b> Mechanical computation enters the Victorian home by 1880.</li>
    <li><b>Communication:</b> A global telegraph-based "Steam Internet" forms in 1900.</li>
    <li><b>War:</b> Data-driven diplomacy prevents the outbreak of World War I.</li>
</ul>

<b>Final Outcome (2026):</b> A world of high-tech brass and steam, where cybernetics were perfected by the 1950s.`
            }
        ];

        // Find match
        for (const s of scenarios) {
            if (s.keywords.some(k => prompt.includes(k))) {
                return s;
            }
        }

        // Dynamic Fallback
        return {
            divergence: calcDivergence,
            stability: calcStability,
            response: `<b>Immediate Divergence:</b> Neural node detected at prompt vertex: "${prompt}".

<b>Secondary Ripple Effects:</b>
<ul>
    <li><b>Political:</b> Regional hierarchies shift by ${Math.floor(calcDivergence / 3)}% to accommodate new timeline.</li>
    <li><b>Cultural:</b> Socio-linguistic drift detected in the subsequent 4 decades.</li>
    <li><b>Stablity:</b> ${calcStability > 60 ? 'Structural integrity maintained.' : 'Anomalous timeline variance detected.'}</li>
</ul>

<b>Final Outcome (2026):</b> A timeline defined by ${calcDivergence > 50 ? 'radical sociopolitical realignment' : 'minor structural adjustments'}. Chrono-Sync stable.`
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
        element.innerHTML = '';
        let i = 0;

        // Split text into tags and characters to handle HTML properly
        const parts = text.split(/(<[^>]*>)/g);
        let partIndex = 0;
        let charIndex = 0;

        const interval = setInterval(() => {
            if (partIndex >= parts.length) {
                clearInterval(interval);
                if (callback) callback();
                return;
            }

            const currentPart = parts[partIndex];
            if (currentPart.startsWith('<')) {
                element.innerHTML += currentPart;
                partIndex++;
            } else {
                element.innerHTML += currentPart.charAt(charIndex);
                charIndex++;
                if (charIndex >= currentPart.length) {
                    charIndex = 0;
                    partIndex++;
                }
            }

            // Scroll to bottom
            const window = element.closest('.simulator-window');
            if (window) window.scrollTop = window.scrollHeight;

        }, 15);
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
