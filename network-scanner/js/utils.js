/**
 * Utility functions for NetRadar
 */
const Utils = {
    /**
     * Calculate distance between two GPS coordinates (Haversine formula)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    },

    /**
     * Estimate distance from WiFi signal strength (RSSI)
     * Uses the Log-distance path loss model
     */
    rssiToDistance(rssi, frequency = 2400) {
        // Free space path loss model
        const txPower = -30; // Typical WiFi TX power at 1 meter
        const n = 2.7; // Path loss exponent (2-4, 2.7 typical indoors)
        const distance = Math.pow(10, (txPower - rssi) / (10 * n));
        return Math.round(distance * 100) / 100;
    },

    /**
     * Format distance for display
     */
    formatDistance(meters, unit = 'meters') {
        if (unit === 'feet') {
            const feet = meters * 3.28084;
            if (feet < 100) return `${Math.round(feet)} ft`;
            return `${Math.round(feet)} ft`;
        }
        if (meters < 1) return `${Math.round(meters * 100)} cm`;
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    },

    /**
     * Get signal strength level
     */
    getSignalLevel(rssi) {
        if (rssi >= -50) return { level: 4, text: 'Excellent', class: 'strong' };
        if (rssi >= -60) return { level: 3, text: 'Good', class: 'good' };
        if (rssi >= -70) return { level: 2, text: 'Fair', class: 'medium' };
        return { level: 1, text: 'Weak', class: 'weak' };
    },

    /**
     * Get icon for device type
     */
    getDeviceIcon(type) {
        const icons = {
            wifi: 'fa-wifi',
            mobile: 'fa-mobile-alt',
            computer: 'fa-laptop',
            bluetooth: 'fa-bluetooth-b',
            iot: 'fa-microchip',
            printer: 'fa-print',
            tv: 'fa-tv',
            speaker: 'fa-volume-up',
            camera: 'fa-video',
            router: 'fa-network-wired',
            tablet: 'fa-tablet-alt'
        };
        return icons[type] || 'fa-question-circle';
    },

    /**
     * Get color for device type
     */
    getDeviceColor(type) {
        const colors = {
            wifi: '#3b82f6',
            mobile: '#8b5cf6',
            computer: '#10b981',
            bluetooth: '#06b6d4',
            iot: '#f59e0b'
        };
        return colors[type] || '#64748b';
    },

    /**
     * Generate random position near a center point
     */
    randomNearbyPosition(centerLat, centerLng, radiusMeters) {
        const radiusInDegrees = radiusMeters / 111320;
        const u = Math.random();
        const v = Math.random();
        const w = radiusInDegrees * Math.sqrt(u);
        const t = 2 * Math.PI * v;
        const x = w * Math.cos(t);
        const y = w * Math.sin(t);

        const newLat = centerLat + y;
        const newLng = centerLng + x / Math.cos(centerLat * Math.PI / 180);

        return { lat: newLat, lng: newLng };
    },

    /**
     * Generate a random MAC address
     */
    randomMAC() {
        const hex = '0123456789ABCDEF';
        let mac = '';
        for (let i = 0; i < 6; i++) {
            if (i > 0) mac += ':';
            mac += hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
        }
        return mac;
    },

    /**
     * Generate random IP address
     */
    randomIP() {
        return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    },

    /**
     * Show toast notification
     */
    showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <div class="toast-message">
                <strong>${title}</strong>
                <small>${message}</small>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Calculate bearing between two points
     */
    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                  Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        let θ = Math.atan2(y, x);
        θ = (θ * 180 / Math.PI + 360) % 360;

        return θ;
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
