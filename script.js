// Enhanced Weather App Main Script
// This file serves as the entry point and coordinates with other modules

// Global variables
let weatherAPI;
let uiController;
let storageManager;
let notificationManager;
let searchHistory = [];

// Initialize the application
window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize all app components
function initializeApp() {
    try {
        // Initialize core modules
        weatherAPI = new WeatherAPI();
        storageManager = new StorageManager();
        notificationManager = new NotificationManager();

        // Load search history
        loadSearchHistory();

        // Setup additional event listeners
        setupAdditionalEventListeners();

        // Initialize weather activity suggestions
        initializeActivitySuggestions();

        // Setup auto-refresh if enabled
        setupAutoRefresh();

        console.log('WeatherPro initialized successfully');
    } catch (error) {
        console.error('Failed to initialize WeatherPro:', error);
        showErrorMessage('Failed to initialize the application. Please refresh the page.');
    }
}

// Legacy search function for backward compatibility
function searchWeather() {
    if (window.uiController) {
        window.uiController.handleSearch();
    } else {
        // Fallback for basic search
        const city = document.getElementById('weather-input').value;
        if (city) {
            basicWeatherSearch(city);
        }
    }
}

// Basic weather search fallback
function basicWeatherSearch(city) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=658f7d37de6b11d8c852af9d34fb455c&units=metric`)
        .then(res => res.json())
        .then(data => {
            console.log(data);
            if (data.cod === "404") {
                showErrorMessage('Location not found');
            } else {
                // Basic display update
                updateBasicWeatherDisplay(data);
                addToHistory(city);
            }
        })
        .catch(err => {
            console.error("Error fetching weather data:", err);
            showErrorMessage('Failed to fetch weather data');
        });
}

// Update basic weather display
function updateBasicWeatherDisplay(data) {
    const tempElement = document.getElementById('temp');
    if (tempElement) {
        tempElement.innerHTML = `<span>${data.weather[0].main}</span><span> ${data.main.temp} &deg;C</span>`;
    }

    const windElement = document.querySelector('#wind-speed span');
    if (windElement) {
        windElement.textContent = data.wind.speed + " Speed";
    }

    const humidityElement = document.querySelector('#humidity span');
    if (humidityElement) {
        humidityElement.textContent = data.main.humidity + " Humidity";
    }

    // Update weather image
    const weatherImage = document.getElementById('weather-img');
    if (weatherImage) {
        const weatherSituation = data.weather[0].main;
        switch (weatherSituation) {
            case 'Clouds':
                weatherImage.src = 'cloud.png';
                break;
            case 'Clear':
                weatherImage.src = 'clear.png';
                break;
            case 'Rain':
                weatherImage.src = 'rain.png';
                break;
            default:
                weatherImage.src = 'clear.png';
        }
    }
}

// Load search history
function loadSearchHistory() {
    if (storageManager) {
        searchHistory = storageManager.get('searchHistory') || [];
    } else {
        searchHistory = JSON.parse(localStorage.getItem('history')) || [];
    }

    displaySearchHistory();
}

// Display search history
function displaySearchHistory() {
    const historyList = document.querySelector('.history-list');
    if (historyList && searchHistory.length > 0) {
        historyList.innerHTML = '';
        searchHistory.slice(-10).forEach(city => {
            historyList.insertAdjacentHTML('beforeend',
                `<li class="cursor-pointer hover:bg-white/10 p-2 rounded" onclick="searchHistoryItem('${city}')">${city}</li>`
            );
        });
    }
}

// Search from history item
function searchHistoryItem(city) {
    document.getElementById('weather-input').value = city;
    searchWeather();
}

// Add to search history
function addToHistory(city) {
    if (!searchHistory.includes(city)) {
        searchHistory.push(city);
        if (searchHistory.length > 20) {
            searchHistory.shift(); // Keep only last 20 searches
        }

        if (storageManager) {
            storageManager.set('searchHistory', searchHistory);
        } else {
            localStorage.setItem('history', JSON.stringify(searchHistory));
        }

        displaySearchHistory();
    }
}

// Legacy function for backward compatibility
function addhistory(city) {
    addToHistory(city);
}

// Setup additional event listeners
function setupAdditionalEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('weather-input').focus();
        }

        // Escape to clear search
        if (e.key === 'Escape') {
            document.getElementById('weather-input').value = '';
            document.getElementById('search-suggestions').classList.add('hidden');
        }
    });

    // Click outside to close suggestions
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('.relative');
        const suggestions = document.getElementById('search-suggestions');

        if (searchContainer && !searchContainer.contains(e.target)) {
            suggestions?.classList.add('hidden');
        }
    });
}

// Initialize weather activity suggestions
function initializeActivitySuggestions() {
    // This will be called when weather data is loaded
    window.generateActivitySuggestions = function(weatherData) {
        if (!weatherData) return [];

        const suggestions = [];
        const temp = weatherData.current?.temperature || 0;
        const weather = weatherData.current?.weather?.main || '';
        const windSpeed = weatherData.current?.windSpeed || 0;
        const humidity = weatherData.current?.humidity || 0;

        // Temperature-based suggestions
        if (temp > 25) {
            suggestions.push({
                activity: 'Swimming',
                icon: '🏊‍♂️',
                description: 'Perfect weather for a swim!',
                category: 'outdoor'
            });
            suggestions.push({
                activity: 'Beach Day',
                icon: '🏖️',
                description: 'Great day for the beach',
                category: 'outdoor'
            });
        } else if (temp < 5) {
            suggestions.push({
                activity: 'Hot Chocolate',
                icon: '☕',
                description: 'Warm up with a hot drink',
                category: 'indoor'
            });
            suggestions.push({
                activity: 'Indoor Activities',
                icon: '🏠',
                description: 'Stay cozy indoors',
                category: 'indoor'
            });
        } else if (temp >= 15 && temp <= 25) {
            suggestions.push({
                activity: 'Walking',
                icon: '🚶‍♂️',
                description: 'Perfect temperature for a walk',
                category: 'outdoor'
            });
            suggestions.push({
                activity: 'Cycling',
                icon: '🚴‍♂️',
                description: 'Great weather for cycling',
                category: 'outdoor'
            });
        }

        // Weather condition-based suggestions
        if (weather === 'Rain') {
            suggestions.push({
                activity: 'Reading',
                icon: '📚',
                description: 'Perfect weather for reading',
                category: 'indoor'
            });
            suggestions.push({
                activity: 'Movie Night',
                icon: '🎬',
                description: 'Cozy up with a good movie',
                category: 'indoor'
            });
        } else if (weather === 'Clear') {
            suggestions.push({
                activity: 'Picnic',
                icon: '🧺',
                description: 'Beautiful day for a picnic',
                category: 'outdoor'
            });
            suggestions.push({
                activity: 'Photography',
                icon: '📸',
                description: 'Great lighting for photos',
                category: 'outdoor'
            });
        }

        // Wind-based suggestions
        if (windSpeed > 10) {
            suggestions.push({
                activity: 'Kite Flying',
                icon: '🪁',
                description: 'Perfect wind for kites',
                category: 'outdoor'
            });
        }

        return suggestions.slice(0, 6); // Return max 6 suggestions
    };
}

// Setup auto-refresh functionality
function setupAutoRefresh() {
    const autoRefreshEnabled = storageManager?.get('autoRefresh') ?? true;

    if (autoRefreshEnabled) {
        // Refresh weather data every 10 minutes
        setInterval(() => {
            if (window.uiController && window.uiController.currentLocation) {
                console.log('Auto-refreshing weather data...');
                const { lat, lon, name } = window.uiController.currentLocation;
                window.uiController.loadWeatherData(lat, lon, name)
                    .catch(error => console.log('Auto-refresh failed:', error));
            }
        }, 10 * 60 * 1000); // 10 minutes
    }
}

// Show error message
function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 slide-up';
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Export functions for global access
window.searchWeather = searchWeather;
window.addhistory = addhistory;
window.searchHistoryItem = searchHistoryItem;

// Service Worker registration and updates
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(registration => {
            console.log('Service Worker registered successfully');

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Show update notification
                        showUpdateNotification();
                    }
                });
            });
        })
        .catch(error => {
            console.log('Service Worker registration failed:', error);
        });
}

// Show update notification
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
        <div class="mb-2 font-medium">App Update Available</div>
        <div class="text-sm mb-3">A new version is ready to install</div>
        <div class="flex space-x-2">
            <button onclick="updateApp()" class="px-3 py-1 bg-white text-blue-500 rounded text-sm font-medium">Update</button>
            <button onclick="this.parentElement.parentElement.remove()" class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Later</button>
        </div>
    `;

    document.body.appendChild(notification);
}

// Update app
function updateApp() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
            }
        });
    }
}

// Performance monitoring
window.addEventListener('load', () => {
    // Log performance metrics
    if ('performance' in window) {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('App Load Time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
    }
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Could send error reports to analytics service here
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});
