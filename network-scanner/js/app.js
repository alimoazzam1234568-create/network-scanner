/**
 * NetRadar - Main Application Controller
 */
class NetRadarApp {
    constructor() {
        this.scanner = new NetworkScanner();
        this.mapManager = new MapManager();
        this.currentView = 'map';
        this.currentFilter = 'all';
        this.currentSort = 'distance';
        this.searchQuery = '';
        this.autoScanInterval = null;
        this.settings = {
            scanRadius: 200,
            scanInterval: 15,
            autoScan: true,
            showHidden: true,
            distanceUnit: 'meters',
            darkMode: true,
            notifyNew: false
        };

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        this.bindEvents();
        this.loadSettings();
        await this.initializeLocation();
        this.initializeMap();
        this.mapManager.initRadarCanvas();
        
        // Perform initial scan
        await this.performScan();

        // Start auto-scan if enabled
        if (this.settings.autoScan) {
            this.startAutoScan();
        }
    }

    /**
     * Initialize user location
     */
    async initializeLocation() {
        Utils.showToast('Locating', 'Getting your position...', 'info');
        await this.scanner.getUserLocation();
        Utils.showToast('Located', `Position acquired`, 'success');
    }

    /**
     * Initialize the map
     */
    initializeMap() {
        const location = this.scanner.userLocation;
        this.mapManager.initMap(location, 17);
        this.mapManager.addRadiusCircle(location, this.settings.scanRadius);
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Scan button
        document.getElementById('scan-btn').addEventListener('click', () => {
            this.performScan();
        });

        // View toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Search input
        document.getElementById('search-input').addEventListener('input',
            Utils.debounce((e) => {
                this.searchQuery = e.target.value;
                this.updateListView();
            }, 300)
        );

        // Filter chips
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentFilter = e.currentTarget.dataset.filter;
                this.updateListView();
            });
        });

        // Sort select
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.updateListView();
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.remove('hidden');
        });

        // Settings close
        document.getElementById('settings-close').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.add('hidden');
        });

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => {
            document.getElementById('device-modal').classList.add('hidden');
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Settings inputs
        document.getElementById('scan-radius').addEventListener('input', (e) => {
            this.settings.scanRadius = parseInt(e.target.value);
            document.getElementById('radius-value').textContent = `${e.target.value}m`;
            this.scanner.scanRadius = this.settings.scanRadius;
            if (this.mapManager.map) {
                this.mapManager.addRadiusCircle(this.scanner.userLocation, this.settings.scanRadius);
            }
            this.saveSettings();
        });

        document.getElementById('scan-interval').addEventListener('input', (e) => {
            this.settings.scanInterval = parseInt(e.target.value);
            document.getElementById('interval-value').textContent = `${e.target.value}s`;
            if (this.settings.autoScan) {
                this.startAutoScan();
            }
            this.saveSettings();
        });

        document.getElementById('auto-scan').addEventListener('change', (e) => {
            this.settings.autoScan = e.target.checked;
            if (e.target.checked) {
                this.startAutoScan();
            } else {
                this.stopAutoScan();
            }
            this.saveSettings();
        });

        document.getElementById('distance-unit').addEventListener('change', (e) => {
            this.settings.distanceUnit = e.target.value;
            this.updateAllViews();
            this.saveSettings();
        });

        document.getElementById('show-hidden').addEventListener('change', (e) => {
            this.settings.showHidden = e.target.checked;
            this.updateAllViews();
            this.saveSettings();
        });

        document.getElementById('notify-new').addEventListener('change', (e) => {
            this.settings.notifyNew = e.target.checked;
            if (e.target.checked) {
                Notification.requestPermission();
            }
            this.saveSettings();
        });
    }

    /**
     * Perform a network scan
     */
    async performScan() {
        if (this.scanner.isScanning) return;

        const scanBtn = document.getElementById('scan-btn');
        const overlay = document.getElementById('radar-overlay');
        const progressBar = document.getElementById('scan-progress-bar');

        // Show scanning UI
        scanBtn.classList.add('scanning');
        scanBtn.querySelector('span').textContent = 'Scanning...';
        overlay.classList.remove('hidden');
        progressBar.style.width = '0%';

        try {
            const devices = await this.scanner.scan((progress) => {
                progressBar.style.width = `${progress}%`;
            });

            // Update all views
            this.updateAllViews();

            // Show completion notification
            const counts = this.scanner.getCounts();
            Utils.showToast(
                'Scan Complete',
                `Found ${counts.total} devices nearby`,
                'success'
            );

        } catch (error) {
            Utils.showToast('Scan Error', error.message, 'error');
        } finally {
            // Hide scanning UI
            setTimeout(() => {
                overlay.classList.add('hidden');
                scanBtn.classList.remove('scanning');
                scanBtn.querySelector('span').textContent = 'Scan';
            }, 500);
        }
    }

    /**
     * Update all views with current data
     */
    updateAllViews() {
        this.updateStats();
        this.updateMapView();
        this.updateListView();
        this.updateRadarView();
    }

    /**
     * Update statistics bar
     */
    updateStats() {
        const counts = this.scanner.getCounts();
        
        this.animateCounter('wifi-count', counts.wifi);
        this.animateCounter('mobile-count', counts.mobile);
        this.animateCounter('laptop-count', counts.computer);
        this.animateCounter('bluetooth-count', counts.bluetooth);
        this.animateCounter('total-count', counts.total);
    }

    /**
     * Animate a counter from current value to target
     */
    animateCounter(elementId, target) {
        const element = document.getElementById(elementId);
        const current = parseInt(element.textContent) || 0;
        const diff = target - current;
        const steps = 20;
        const stepDuration = 30;

        let step = 0;
        const interval = setInterval(() => {
            step++;
            const value = Math.round(current + (diff * (step / steps)));
            element.textContent = value;

            if (step >= steps) {
                element.textContent = target;
                clearInterval(interval);
            }
        }, stepDuration);
    }

    /**
     * Update map view with device markers
     */
    updateMapView() {
        let devices = this.scanner.devices;

        if (!this.settings.showHidden) {
            devices = devices.filter(d => !d.isHidden);
        }

        this.mapManager.addDeviceMarkers(devices, (device) => {
            this.showDeviceDetail(device);
        });
    }

    /**
     * Update list view
     */
    updateListView() {
        const container = document.getElementById('device-list');
        let devices = this.scanner.filterDevices(this.currentFilter, this.searchQuery);

        if (!this.settings.showHidden) {
            devices = devices.filter(d => !d.isHidden);
        }

        devices = this.scanner.sortDevices(devices, this.currentSort);

        if (devices.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No devices found matching your criteria</p>
                </div>
            `;
            return;
        }

        container.innerHTML = devices.map((device, index) => {
            const signalInfo = device.signalLevel;
            const distanceStr = Utils.formatDistance(device.distance, this.settings.distanceUnit);
            const signalBars = this.generateSignalBars(signalInfo);

            let securityBadge = '';
            if (device.security) {
                const secClass = device.security === 'Open' ? 'open' : 
                                 device.security.includes('WPA') ? 'wpa' : 'secure';
                securityBadge = `<span class="security-badge ${secClass}">${device.security}</span>`;
            }

            return `
                <div class="device-card" data-id="${device.id}" style="animation-delay: ${index * 0.05}s">
                    <div class="device-icon ${device.type}">
                        <i class="fas ${device.icon}"></i>
                    </div>
                    <div class="device-info">
                        <div class="device-name">
                            ${device.isConnected ? '✓ ' : ''}${device.name}
                            ${device.isHidden ? ' <i class="fas fa-eye-slash" style="font-size:0.7rem; opacity:0.5"></i>' : ''}
                        </div>
                        <div class="device-meta">
                            <span><i class="fas fa-industry"></i> ${device.manufacturer}</span>
                            <span>${device.mac}</span>
                            ${device.band ? `<span>${device.band}</span>` : ''}
                        </div>
                    </div>
                    <div class="device-right">
                        <div class="device-distance">
                            ${distanceStr}
                        </div>
                        ${signalBars}
                        ${securityBadge}
                    </div>
                </div>
            `;
        }).join('');

        // Bind click events to cards
        container.querySelectorAll('.device-card').forEach(card => {
            card.addEventListener('click', () => {
                const device = this.scanner.getDevice(card.dataset.id);
                if (device) {
                    this.showDeviceDetail(device);
                }
            });
        });
    }

    /**
     * Generate signal strength bars HTML
     */
    generateSignalBars(signalInfo) {
        let bars = '';
        for (let i = 1; i <= 4; i++) {
            bars += `<div class="bar ${i <= signalInfo.level ? 'active' : ''}"></div>`;
        }
        return `<div class="signal-bar ${signalInfo.class}">${bars}</div>`;
    }

    /**
     * Update radar view
     */
    updateRadarView() {
        if (this.currentView === 'radar') {
            let devices = this.scanner.devices;
            if (!this.settings.showHidden) {
                devices = devices.filter(d => !d.isHidden);
            }
            this.mapManager.startRadarAnimation(
                devices,
                this.scanner.userLocation,
                this.settings.scanRadius
            );
        } else {
            this.mapManager.stopRadarAnimation();
        }
    }

    /**
     * Switch between views
     */
    switchView(view) {
        this.currentView = view;

        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update view panels
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${view}-view`).classList.add('active');

        // Handle specific view initialization
        if (view === 'map') {
            setTimeout(() => {
                this.mapManager.map?.invalidateSize();
            }, 100);
            this.mapManager.stopRadarAnimation();
        } else if (view === 'radar') {
            this.mapManager.resizeCanvas();
            this.updateRadarView();
        } else if (view === 'list') {
            this.mapManager.stopRadarAnimation();
            this.updateListView();
        }
    }

    /**
     * Show device detail modal
     */
    showDeviceDetail(device) {
        const modal = document.getElementById('device-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = 'Device Details';

        const signalInfo = device.signalLevel;
        const distanceStr = Utils.formatDistance(device.distance, this.settings.distanceUnit);
        const signalPercent = Math.min(100, Math.max(0, ((device.rssi + 100) / 70) * 100));

        let signalColor = '#10b981';
        if (signalInfo.class === 'medium') signalColor = '#f59e0b';
        if (signalInfo.class === 'weak') signalColor = '#ef4444';

        const directionLabels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const directionIndex = Math.round(device.bearing / 45) % 8;
        const direction = directionLabels[directionIndex];

        body.innerHTML = `
            <div class="detail-header">
                <div class="detail-icon device-icon ${device.type}">
                    <i class="fas ${device.icon}"></i>
                </div>
                <div class="detail-title">
                    <h3>${device.name}</h3>
                    <p>${device.type.charAt(0).toUpperCase() + device.type.slice(1)} Device • ${device.manufacturer}</p>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <label>Distance</label>
                    <div class="value highlight">${distanceStr}</div>
                </div>
                <div class="detail-item">
                    <label>Direction</label>
                    <div class="value">${direction} (${Math.round(device.bearing)}°)</div>
                </div>
                <div class="detail-item">
                    <label>Signal Strength</label>
                    <div class="value">${device.rssi} dBm</div>
                </div>
                <div class="detail-item">
                    <label>Signal Quality</label>
                    <div class="value" style="color: ${signalColor}">${signalInfo.text}</div>
                </div>
                <div class="detail-item">
                    <label>MAC Address</label>
                    <div class="value" style="font-size: 0.85rem">${device.mac}</div>
                </div>
                ${device.ip ? `
                <div class="detail-item">
                    <label>IP Address</label>
                    <div class="value">${device.ip}</div>
                </div>` : '<div class="detail-item"><label>Type</label><div class="value">${device.type}</div></div>'}
                ${device.security ? `
                <div class="detail-item">
                    <label>Security</label>
                    <div class="value">${device.security}</div>
                </div>` : ''}
                ${device.channel ? `
                <div class="detail-item">
                    <label>Channel / Band</label>
                    <div class="value">Ch ${device.channel} / ${device.band}</div>
                </div>` : ''}
                ${device.speed ? `
                <div class="detail-item">
                    <label>Speed</label>
                    <div class="value">${device.speed}</div>
                </div>` : ''}
                ${device.frequency ? `
                <div class="detail-item">
                    <label>Frequency</label>
                    <div class="value">${device.frequency} MHz</div>
                </div>` : ''}
                <div class="detail-item">
                    <label>Status</label>
                    <div class="value" style="color: ${device.isConnected ? '#10b981' : '#94a3b8'}">
                        ${device.isConnected ? '● Connected' : '○ Detected'}
                    </div>
                </div>
                <div class="detail-item">
                    <label>Last Seen</label>
                    <div class="value" style="font-size: 0.85rem">${device.lastSeen.toLocaleTimeString()}</div>
                </div>
            </div>

            <div class="signal-meter">
                <label>Signal Strength Meter</label>
                <div class="signal-meter-bar">
                    <div class="signal-meter-fill" style="width: ${signalPercent}%; background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);"></div>
                </div>
            </div>

            <div class="detail-grid" style="margin-top: 16px;">
                <div class="detail-item">
                    <label>Latitude</label>
                    <div class="value" style="font-size: 0.8rem">${device.position.lat.toFixed(6)}</div>
                </div>
                <div class="detail-item">
                    <label>Longitude</label>
                    <div class="value" style="font-size: 0.8rem">${device.position.lng.toFixed(6)}</div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // Animate signal meter
        setTimeout(() => {
            const fill = body.querySelector('.signal-meter-fill');
            if (fill) {
                fill.style.width = `${signalPercent}%`;
            }
        }, 100);
    }

    /**
     * Start auto-scanning
     */
    startAutoScan() {
        this.stopAutoScan();
        this.autoScanInterval = setInterval(() => {
            this.performScan();
        }, this.settings.scanInterval * 1000);
    }

    /**
     * Stop auto-scanning
     */
    stopAutoScan() {
        if (this.autoScanInterval) {
            clearInterval(this.autoScanInterval);
            this.autoScanInterval = null;
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('netradar_settings', JSON.stringify(this.settings));
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('netradar_settings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };

                // Apply settings to UI
                document.getElementById('scan-radius').value = this.settings.scanRadius;
                document.getElementById('radius-value').textContent = `${this.settings.scanRadius}m`;
                document.getElementById('scan-interval').value = this.settings.scanInterval;
                document.getElementById('interval-value').textContent = `${this.settings.scanInterval}s`;
                document.getElementById('auto-scan').checked = this.settings.autoScan;
                document.getElementById('show-hidden').checked = this.settings.showHidden;
                document.getElementById('distance-unit').value = this.settings.distanceUnit;
                document.getElementById('notify-new').checked = this.settings.notifyNew;
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.netRadar = new NetRadarApp();
});
