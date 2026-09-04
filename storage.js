// Storage Manager for Advanced Weather App
class StorageManager {
    constructor() {
        this.prefix = 'weatherpro_';
    }

    // Set data in localStorage
    set(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(this.prefix + key, serializedValue);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    }

    // Get data from localStorage
    get(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    }

    // Remove data from localStorage
    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }

    // Clear all app data
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    // Get all keys with prefix
    getAllKeys() {
        try {
            const keys = Object.keys(localStorage);
            return keys.filter(key => key.startsWith(this.prefix))
                      .map(key => key.replace(this.prefix, ''));
        } catch (error) {
            console.error('Storage getAllKeys error:', error);
            return [];
        }
    }

    // Check if storage is available
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get storage usage info
    getStorageInfo() {
        if (!this.isAvailable()) return null;

        try {
            let totalSize = 0;
            let appSize = 0;

            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const size = localStorage[key].length;
                    totalSize += size;

                    if (key.startsWith(this.prefix)) {
                        appSize += size;
                    }
                }
            }

            return {
                totalSize: totalSize,
                appSize: appSize,
                available: 5242880 - totalSize, // 5MB limit approximation
                percentage: (totalSize / 5242880) * 100
            };
        } catch (error) {
            console.error('Storage info error:', error);
            return null;
        }
    }
}

// Export for use in other modules
window.StorageManager = StorageManager;
