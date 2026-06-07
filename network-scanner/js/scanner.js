/**
 * Network Scanner - Simulates scanning for nearby devices & networks
 * In a real app, this would use:
 * - Web Bluetooth API for Bluetooth devices
 * - NetworkInformation API for network info
 * - Native APIs (via Capacitor/Cordova) for WiFi scanning
 */
class NetworkScanner {
    constructor() {
        this.devices = [];
        this.userLocation = null;
        this.scanRadius = 200;
        this.isScanning = false;
        this.scanCallbacks = [];

        // Realistic device/network names
        this.wifiNames = [
            'HOME-NETWORK-5G', 'Starbucks WiFi', 'xfinitywifi',
            'NETGEAR80', 'TP-Link_2.4G', 'ATT-WIFI-2901',
            'Linksys00142', 'DIRECT-roku-423', 'HP-Print-A8',
            'MySpectrumWiFi', 'FBI Surveillance Van', 'Pretty Fly for a WiFi',
            'BillWitheScienceFi', 'Hidden Network', 'Guest_Network',
            'Office_5GHz', 'Hotel_Lobby_Free', 'Airport_Free_WiFi',
            'Verizon_MiFi_7730L', 'AndroidAP_Samsung', 'iPhone_Hotspot',
            'ASUS_RT-AX88U', 'Mesh_Node_Living', 'IoT_Network',
            'Neighbors_WiFi', 'CoxWiFi', 'Google Starbucks',
            'eduroam', 'Company_Secure', 'Guest_5G'
        ];

        this.mobileNames = [
            'iPhone 15 Pro', 'Galaxy S24 Ultra', 'Pixel 8 Pro',
            'OnePlus 12', 'iPhone 14', 'Galaxy A54',
            'Xiaomi 14', 'iPhone SE', 'Moto G Power',
            'Galaxy Z Flip5', 'Nothing Phone (2)', 'iPad Pro',
            'Galaxy Tab S9', 'iPad Air', 'iPad Mini'
        ];

        this.computerNames = [
            'MacBook-Pro-M3', 'DESKTOP-WIN11', 'ThinkPad-X1',
            'Dell-XPS-15', 'iMac-Office', 'Surface-Laptop',
            'HP-Pavilion', 'ASUS-ROG', 'Mac-Mini-Server',
            'Chromebook-14', 'Linux-Workstation', 'Gaming-PC'
        ];

        this.bluetoothNames = [
            'AirPods Pro', 'Galaxy Buds2 Pro', 'JBL Flip 6',
            'Sony WH-1000XM5', 'Apple Watch', 'Fitbit Charge 5',
            'Bose QC45', 'Tile Tracker', 'AirTag',
            'Echo Dot', 'Beats Studio3', 'Jabra Elite 85t'
        ];

        this.iotNames = [
            'Nest Thermostat', 'Ring Doorbell', 'Philips Hue Bridge',
            'Smart TV - LG', 'Roku Ultra', 'Amazon Echo',
            'Google Home Mini', 'Smart Plug #3', 'Security Cam - Front',
            'Robot Vacuum', 'Smart Lock', 'Wyze Cam v3'
        ];

        this.manufacturers = {
            wifi: ['Netgear', 'TP-Link', 'ASUS', 'Linksys', 'Cisco', 'Ubiquiti'],
            mobile: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Motorola'],
            computer: ['Apple', 'Dell', 'Lenovo', 'HP', 'Microsoft', 'ASUS'],
            bluetooth: ['Apple', 'Samsung', 'JBL', 'Sony', 'Bose', 'Jabra'],
            iot: ['Amazon', 'Google', 'Ring', 'Philips', 'Nest', 'Wyze']
        };
    }

    /**
     * Get user's current position
     */
    async getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                // Default location (New York City)
                this.userLocation = { lat: 40.7128, lng: -74.0060 };
                resolve(this.userLocation);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(this.userLocation);
                },
                (error) => {
                    console.warn('Geolocation error, using default:', error.message);
                    // Default location
                    this.userLocation = { lat: 40.7128, lng: -74.0060 };
                    resolve(this.userLocation);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    /**
     * Check for Web Bluetooth support and scan
     */
    async scanBluetooth() {
        const realBluetoothDevices = [];

        if ('bluetooth' in navigator) {
            try {
                // Note: Web Bluetooth requires user gesture and HTTPS
                console.log('Web Bluetooth API available');
                // In production, you'd use:
                // const device = await navigator.bluetooth.requestDevice({
                //     acceptAllDevices: true,
                //     optionalServices: ['battery_service']
                // });
            } catch (e) {
                console.log('Bluetooth scan not available in this context');
            }
        }

        return realBluetoothDevices;
    }

    /**
     * Get network information using Network Information API
     */
    getNetworkInfo() {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;

        if (connection) {
            return {
                type: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
        return null;
    }

    /**
     * Main scan function - generates realistic nearby devices
     */
    async scan(progressCallback) {
        this.isScanning = true;

        // Get user location first
        if (!this.userLocation) {
            await this.getUserLocation();
        }

        const networkInfo = this.getNetworkInfo();
        const totalDevices = 15 + Math.floor(Math.random() * 20);
        const newDevices = [];

        for (let i = 0; i < totalDevices; i++) {
            // Update progress
            if (progressCallback) {
                progressCallback((i / totalDevices) * 100);
            }

            // Simulate scan delay
            await this.delay(50 + Math.random() * 100);

            const device = this.generateDevice(i);
            newDevices.push(device);
        }

        // Add current network connection as first device if available
        if (networkInfo) {
            const currentNetwork = this.generateCurrentNetwork(networkInfo);
            newDevices.unshift(currentNetwork);
        }

        this.devices = newDevices;
        this.isScanning = false;

        if (progressCallback) {
            progressCallback(100);
        }

        return this.devices;
    }

    /**
     * Generate a simulated device
     */
    generateDevice(index) {
        // Determine device type with weighted probability
        const typeRoll = Math.random();
        let type, name, icon;

        if (typeRoll < 0.35) {
            type = 'wifi';
            name = this.wifiNames[Math.floor(Math.random() * this.wifiNames.length)];
            icon = 'fa-wifi';
        } else if (typeRoll < 0.55) {
            type = 'mobile';
            name = this.mobileNames[Math.floor(Math.random() * this.mobileNames.length)];
            icon = 'fa-mobile-alt';
        } else if (typeRoll < 0.70) {
            type = 'computer';
            name = this.computerNames[Math.floor(Math.random() * this.computerNames.length)];
            icon = 'fa-laptop';
        } else if (typeRoll < 0.85) {
            type = 'bluetooth';
            name = this.bluetoothNames[Math.floor(Math.random() * this.bluetoothNames.length)];
            icon = 'fa-bluetooth-b';
        } else {
            type = 'iot';
            name = this.iotNames[Math.floor(Math.random() * this.iotNames.length)];
            icon = 'fa-microchip';
        }

        // Generate signal strength (RSSI) - closer devices have stronger signals
        const rssi = -(30 + Math.floor(Math.random() * 60)); // -30 to -90

        // Calculate estimated distance from signal
        const estimatedDistance = Utils.rssiToDistance(rssi);

        // Generate position based on estimated distance
        const position = Utils.randomNearbyPosition(
            this.userLocation.lat,
            this.userLocation.lng,
            estimatedDistance
        );

        // Calculate actual distance from generated position
        const actualDistance = Utils.calculateDistance(
            this.userLocation.lat,
            this.userLocation.lng,
            position.lat,
            position.lng
        );

        // Calculate bearing/direction
        const bearing = Utils.calculateBearing(
            this.userLocation.lat,
            this.userLocation.lng,
            position.lat,
            position.lng
        );

        // Security type for WiFi networks
        let security = null;
        if (type === 'wifi') {
            const secRoll = Math.random();
            if (secRoll < 0.5) security = 'WPA3';
            else if (secRoll < 0.8) security = 'WPA2';
            else if (secRoll < 0.9) security = 'WEP';
            else security = 'Open';
        }

        // Channel for WiFi
        let channel = null;
        let frequency = null;
        if (type === 'wifi') {
            if (Math.random() < 0.6) {
                channel = [1, 6, 11][Math.floor(Math.random() * 3)];
                frequency = 2412 + (channel - 1) * 5;
            } else {
                channel = [36, 40, 44, 48, 149, 153, 157, 161][Math.floor(Math.random() * 8)];
                frequency = 5000 + channel * 5;
            }
        }

        const manufacturer = this.manufacturers[type] || ['Unknown'];

        return {
            id: `device_${Date.now()}_${index}`,
            name: name,
            type: type,
            icon: icon,
            mac: Utils.randomMAC(),
            ip: type !== 'bluetooth' ? Utils.randomIP() : null,
            rssi: rssi,
            signalLevel: Utils.getSignalLevel(rssi),
            distance: Math.round(actualDistance * 10) / 10,
            estimatedDistance: estimatedDistance,
            position: position,
            bearing: bearing,
            security: security,
            channel: channel,
            frequency: frequency,
            manufacturer: manufacturer[Math.floor(Math.random() * manufacturer.length)],
            lastSeen: new Date(),
            isConnected: index === 0 && type === 'wifi',
            isHidden: Math.random() < 0.05,
            speed: type === 'wifi' ? `${[54, 150, 300, 600, 1200][Math.floor(Math.random() * 5)]} Mbps` : null,
            band: frequency ? (frequency < 3000 ? '2.4 GHz' : '5 GHz') : null
        };
    }

    /**
     * Generate entry for current network connection
     */
    generateCurrentNetwork(networkInfo) {
        const position = Utils.randomNearbyPosition(
            this.userLocation.lat,
            this.userLocation.lng,
            5
        );

        return {
            id: 'current_network',
            name: 'Connected Network',
            type: 'wifi',
            icon: 'fa-wifi',
            mac: Utils.randomMAC(),
            ip: '192.168.1.1',
            rssi: -35,
            signalLevel: Utils.getSignalLevel(-35),
            distance: 2,
            estimatedDistance: 2,
            position: position,
            bearing: 0,
            security: 'WPA3',
            channel: 6,
            frequency: 2437,
            manufacturer: 'Router',
            lastSeen: new Date(),
            isConnected: true,
            isHidden: false,
            speed: `${networkInfo.downlink || 100} Mbps`,
            band: '2.4 GHz',
            connectionType: networkInfo.type,
            rtt: networkInfo.rtt
        };
    }

    /**
     * Filter devices
     */
    filterDevices(filter, searchQuery = '') {
        let filtered = [...this.devices];

        if (filter && filter !== 'all') {
            filtered = filtered.filter(d => d.type === filter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(d =>
                d.name.toLowerCase().includes(query) ||
                d.mac.toLowerCase().includes(query) ||
                d.manufacturer.toLowerCase().includes(query) ||
                d.type.toLowerCase().includes(query)
            );
        }

        return filtered;
    }

    /**
     * Sort devices
     */
    sortDevices(devices, sortBy = 'distance') {
        return [...devices].sort((a, b) => {
            switch (sortBy) {
                case 'distance': return a.distance - b.distance;
                case 'signal': return b.rssi - a.rssi;
                case 'name': return a.name.localeCompare(b.name);
                case 'type': return a.type.localeCompare(b.type);
                default: return 0;
            }
        });
    }

    /**
     * Get device counts by type
     */
    getCounts() {
        const counts = {
            wifi: 0,
            mobile: 0,
            computer: 0,
            bluetooth: 0,
            iot: 0,
            total: this.devices.length
        };

        this.devices.forEach(d => {
            if (counts.hasOwnProperty(d.type)) {
                counts[d.type]++;
            }
        });

        return counts;
    }

    /**
     * Get a device by ID
     */
    getDevice(id) {
        return this.devices.find(d => d.id === id);
    }

    /**
     * Utility delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
