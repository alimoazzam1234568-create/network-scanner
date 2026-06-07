/**
 * Map Manager - Handles Leaflet map and radar canvas
 */
class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.userMarker = null;
        this.radiusCircle = null;
        this.radarCanvas = null;
        this.radarCtx = null;
        this.radarAngle = 0;
        this.radarAnimationId = null;
    }

    /**
     * Initialize Leaflet map
     */
    initMap(center, zoom = 17) {
        if (this.map) {
            this.map.remove();
        }

        this.map = L.map('map', {
            center: [center.lat, center.lng],
            zoom: zoom,
            zoomControl: false,
            attributionControl: false
        });

        // Dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            subdomains: 'abcd'
        }).addTo(this.map);

        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Add user marker
        this.addUserMarker(center);

        return this.map;
    }

    /**
     * Add user location marker
     */
    addUserMarker(position) {
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        const userIcon = L.divIcon({
            className: 'custom-marker-wrapper',
            html: `
                <div class="custom-marker user"></div>
                <div class="marker-pulse" style="border-color: rgba(239, 68, 68, 0.4);"></div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        this.userMarker = L.marker([position.lat, position.lng], { icon: userIcon, zIndexOffset: 1000 })
            .addTo(this.map)
            .bindPopup('<strong>📍 Your Location</strong>');
    }

    /**
     * Add scan radius circle
     */
    addRadiusCircle(center, radius) {
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
        }

        this.radiusCircle = L.circle([center.lat, center.lng], {
            radius: radius,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.05,
            weight: 1,
            dashArray: '5, 10'
        }).addTo(this.map);
    }

    /**
     * Add device markers to map
     */
    addDeviceMarkers(devices, onClickCallback) {
        // Clear existing markers
        this.clearMarkers();

        devices.forEach((device, index) => {
            const color = Utils.getDeviceColor(device.type);
            const iconClass = Utils.getDeviceIcon(device.type);

            const markerIcon = L.divIcon({
                className: 'custom-marker-wrapper',
                html: `
                    <div class="custom-marker ${device.type}" style="animation-delay: ${index * 0.05}s">
                        <i class="fas ${iconClass}"></i>
                    </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            const marker = L.marker([device.position.lat, device.position.lng], { 
                icon: markerIcon 
            }).addTo(this.map);

            // Create popup content
            const popupContent = this.createPopupContent(device);
            marker.bindPopup(popupContent, {
                className: 'device-popup-container',
                maxWidth: 280
            });

            // Add click handler
            marker.on('click', () => {
                if (onClickCallback) {
                    onClickCallback(device);
                }
            });

            // Draw line from user to device on hover
            marker.on('mouseover', () => {
                this.drawConnectionLine(
                    { lat: this.userMarker.getLatLng().lat, lng: this.userMarker.getLatLng().lng },
                    device.position,
                    color
                );
            });

            marker.on('mouseout', () => {
                this.removeConnectionLine();
            });

            this.markers.push(marker);
        });
    }

    /**
     * Create popup content for a device
     */
    createPopupContent(device) {
        const distanceStr = Utils.formatDistance(device.distance);
        const signalInfo = device.signalLevel;

        let securityHTML = '';
        if (device.security) {
            const secClass = device.security === 'Open' ? 'open' : 'secure';
            securityHTML = `<div><span class="label">Security:</span> 
                <span class="security-badge ${secClass}">${device.security}</span></div>`;
        }

        return `
            <div class="device-popup">
                <div class="popup-header">
                    <i class="fas ${device.icon}" style="color: ${Utils.getDeviceColor(device.type)}"></i>
                    <h3>${device.name}</h3>
                </div>
                <div class="popup-info">
                    <div><span class="label">Distance:</span> 
                        <span class="distance-badge">${distanceStr}</span>
                    </div>
                    <div><span class="label">Signal:</span> ${device.rssi} dBm (${signalInfo.text})</div>
                    <div><span class="label">MAC:</span> ${device.mac}</div>
                    ${device.ip ? `<div><span class="label">IP:</span> ${device.ip}</div>` : ''}
                    <div><span class="label">Manufacturer:</span> ${device.manufacturer}</div>
                    ${securityHTML}
                    ${device.channel ? `<div><span class="label">Channel:</span> ${device.channel} (${device.band})</div>` : ''}
                    ${device.isConnected ? '<div style="color: #10b981; font-weight: 600;">✓ Connected</div>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Draw a connection line between two points
     */
    drawConnectionLine(from, to, color) {
        this.removeConnectionLine();
        this.connectionLine = L.polyline(
            [[from.lat, from.lng], [to.lat, to.lng]],
            { color: color, weight: 2, opacity: 0.6, dashArray: '5, 10' }
        ).addTo(this.map);
    }

    /**
     * Remove connection line
     */
    removeConnectionLine() {
        if (this.connectionLine) {
            this.map.removeLayer(this.connectionLine);
            this.connectionLine = null;
        }
    }

    /**
     * Clear all device markers
     */
    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    /**
     * Fit map to show all devices
     */
    fitToDevices(devices, userLocation) {
        if (devices.length === 0) return;

        const bounds = L.latLngBounds([
            [userLocation.lat, userLocation.lng]
        ]);

        devices.forEach(device => {
            bounds.extend([device.position.lat, device.position.lng]);
        });

        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }

    /**
     * Initialize radar canvas
     */
    initRadarCanvas() {
        this.radarCanvas = document.getElementById('radar-canvas');
        this.radarCtx = this.radarCanvas.getContext('2d');
        this.resizeCanvas();

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.radarCanvas) return;
        const container = this.radarCanvas.parentElement;
        this.radarCanvas.width = container.clientWidth * window.devicePixelRatio;
        this.radarCanvas.height = container.clientHeight * window.devicePixelRatio;
        this.radarCanvas.style.width = container.clientWidth + 'px';
        this.radarCanvas.style.height = container.clientHeight + 'px';
        this.radarCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    /**
     * Draw radar view with devices
     */
    drawRadar(devices, userLocation, maxRadius = 200) {
        if (!this.radarCtx) return;

        const ctx = this.radarCtx;
        const width = this.radarCanvas.clientWidth;
        const height = this.radarCanvas.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const radarRadius = Math.min(centerX, centerY) - 40;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        // Draw radar circles
        const rings = 4;
        for (let i = 1; i <= rings; i++) {
            const r = (radarRadius / rings) * i;
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Distance labels
            const distLabel = Math.round((maxRadius / rings) * i);
            ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${distLabel}m`, centerX, centerY - r - 5);
        }

        // Draw crosshair lines
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radarRadius);
        ctx.lineTo(centerX, centerY + radarRadius);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX - radarRadius, centerY);
        ctx.lineTo(centerX + radarRadius, centerY);
        ctx.stroke();

        // Draw compass labels
        ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', centerX, centerY - radarRadius - 10);
        ctx.fillText('S', centerX, centerY + radarRadius + 18);
        ctx.fillText('E', centerX + radarRadius + 14, centerY + 4);
        ctx.fillText('W', centerX - radarRadius - 14, centerY + 4);

        // Draw sweep
        this.radarAngle = (this.radarAngle + 1.5) % 360;
        const sweepAngle = (this.radarAngle * Math.PI) / 180 - Math.PI / 2;

        const gradient = ctx.createConicalGradient
            ? null
            : ctx.createLinearGradient(centerX, centerY,
                centerX + Math.cos(sweepAngle) * radarRadius,
                centerY + Math.sin(sweepAngle) * radarRadius);

        // Sweep line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + Math.cos(sweepAngle) * radarRadius,
            centerY + Math.sin(sweepAngle) * radarRadius
        );
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Sweep trail (arc)
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radarRadius, sweepAngle - 0.5, sweepAngle, false);
        ctx.closePath();
        const trailGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radarRadius);
        trailGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
        trailGrad.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
        ctx.fillStyle = trailGrad;
        ctx.fill();

        // Draw devices
        devices.forEach(device => {
            const distance = device.distance;
            if (distance > maxRadius) return;

            const normalizedDist = (distance / maxRadius) * radarRadius;
            const angle = ((device.bearing - 90) * Math.PI) / 180;

            const x = centerX + Math.cos(angle) * normalizedDist;
            const y = centerY + Math.sin(angle) * normalizedDist;

            const color = Utils.getDeviceColor(device.type);

            // Device dot glow
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fillStyle = color + '33';
            ctx.fill();

            // Device dot
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Pulse effect for close devices
            if (distance < 20) {
                const pulseSize = 6 + Math.sin(Date.now() / 300) * 3;
                ctx.beginPath();
                ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
                ctx.strokeStyle = color + '66';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(device.name.substring(0, 15), x, y - 12);

            // Distance label
            ctx.fillStyle = color;
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText(Utils.formatDistance(distance), x, y + 16);
        });

        // Center dot (user)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    /**
     * Start radar animation
     */
    startRadarAnimation(devices, userLocation, maxRadius) {
        this.stopRadarAnimation();

        const animate = () => {
            this.drawRadar(devices, userLocation, maxRadius);
            this.radarAnimationId = requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Stop radar animation
     */
    stopRadarAnimation() {
        if (this.radarAnimationId) {
            cancelAnimationFrame(this.radarAnimationId);
            this.radarAnimationId = null;
        }
    }
}
