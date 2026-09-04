// Notification Manager for Advanced Weather App
class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.isSupported = 'Notification' in window;
        this.init();
    }

    init() {
        if (this.isSupported) {
            this.permission = Notification.permission;
        }
    }

    // Request notification permission
    async requestPermission() {
        if (!this.isSupported) {
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        } catch (error) {
            console.error('Notification permission error:', error);
            return false;
        }
    }

    // Show notification
    show(title, options = {}) {
        if (!this.isSupported || this.permission !== 'granted') {
            return null;
        }

        const defaultOptions = {
            icon: '/image.png',
            badge: '/image.png',
            tag: 'weather-notification',
            requireInteraction: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);

            // Auto close after 5 seconds if not requiring interaction
            if (!defaultOptions.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }

            return notification;
        } catch (error) {
            console.error('Notification show error:', error);
            return null;
        }
    }

    // Show weather alert notification
    showWeatherAlert(alertData) {
        const options = {
            body: alertData.message,
            icon: '/error.png',
            tag: 'weather-alert',
            requireInteraction: true,
            actions: [
                {
                    action: 'view',
                    title: 'View Details'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        };

        return this.show(alertData.title, options);
    }

    // Show temperature alert
    showTemperatureAlert(temperature, type = 'high') {
        const title = type === 'high' ? 'High Temperature Alert' : 'Low Temperature Alert';
        const body = type === 'high'
            ? `Temperature is ${temperature}°C. Stay hydrated and avoid prolonged sun exposure.`
            : `Temperature is ${temperature}°C. Dress warmly and be cautious of icy conditions.`;

        const options = {
            body,
            icon: type === 'high' ? '/clear.png' : '/cloud.png',
            tag: 'temperature-alert'
        };

        return this.show(title, options);
    }

    // Show rain notification
    showRainAlert(intensity = 'moderate') {
        const intensityMap = {
            light: 'Light rain expected',
            moderate: 'Moderate rain expected',
            heavy: 'Heavy rain expected'
        };

        const options = {
            body: `${intensityMap[intensity]}. Don't forget your umbrella!`,
            icon: '/rain.png',
            tag: 'rain-alert'
        };

        return this.show('Rain Alert', options);
    }

    // Show air quality alert
    showAirQualityAlert(aqi, status) {
        const options = {
            body: `Air quality is ${status} (AQI: ${aqi}). Consider limiting outdoor activities.`,
            icon: '/error.png',
            tag: 'air-quality-alert'
        };

        return this.show('Air Quality Alert', options);
    }

    // Check if notifications are supported
    isNotificationSupported() {
        return this.isSupported;
    }

    // Get current permission status
    getPermissionStatus() {
        return this.permission;
    }

    // Schedule notification (using setTimeout for simple scheduling)
    scheduleNotification(title, options, delay) {
        return setTimeout(() => {
            this.show(title, options);
        }, delay);
    }

    // Cancel scheduled notification
    cancelScheduledNotification(notificationId) {
        if (notificationId) {
            clearTimeout(notificationId);
        }
    }
}

// Export for use in other modules
window.NotificationManager = NotificationManager;