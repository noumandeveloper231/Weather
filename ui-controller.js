// UI Controller for Advanced Weather App
class UIController {
    constructor() {
        this.weatherAPI = new WeatherAPI();
        this.storage = new StorageManager();
        this.notifications = new NotificationManager();
        this.currentLocation = null;
        this.currentWeatherData = null;
        this.temperatureChart = null;
        this.weatherMap = null;
        this.isDarkTheme = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.hideLoadingScreen();
        this.loadFavoriteLocations();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 60000);
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => this.handleSearch());
        document.getElementById('weather-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        document.getElementById('weather-input').addEventListener('input', (e) => this.handleSearchInput(e));
        document.getElementById('location-btn').addEventListener('click', () => this.getCurrentLocation());

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());

        // Favorites
        document.getElementById('favorite-btn').addEventListener('click', () => this.toggleFavorite());
        document.getElementById('add-favorite').addEventListener('click', () => this.addFavoriteLocation());

        // Map layers
        document.querySelectorAll('input[name="map-layer"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.changeMapLayer(e.target.value));
        });
    }

    async handleSearch() {
        const query = document.getElementById('weather-input').value.trim();
        if (!query) return;

        this.showLoading('Searching for location...');

        try {
            const coords = await this.weatherAPI.getCoordinates(query);
            await this.loadWeatherData(coords.lat, coords.lon, coords.name);
            this.hideSearchSuggestions();
        } catch (error) {
            this.showError('Location not found. Please try a different search term.');
        } finally {
            this.hideLoading();
        }
    }

    async handleSearchInput(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            this.hideSearchSuggestions();
            return;
        }

        try {
            const cities = await this.weatherAPI.searchCities(query);
            this.showSearchSuggestions(cities);
        } catch (error) {
            console.error('Search suggestions error:', error);
        }
    }

    showSearchSuggestions(cities) {
        const container = document.getElementById('search-suggestions');

        if (cities.length === 0) {
            this.hideSearchSuggestions();
            return;
        }

        container.innerHTML = cities.map(city =>
            `<div class="suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">
                <div class="font-medium text-gray-800">${city.name}</div>
                <div class="text-sm text-gray-600">${city.state ? city.state + ', ' : ''}${city.country}</div>
            </div>`
        ).join('');

        container.classList.remove('hidden');

        // Add click listeners to suggestions
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', async () => {
                const lat = parseFloat(item.dataset.lat);
                const lon = parseFloat(item.dataset.lon);
                const name = item.dataset.name;

                document.getElementById('weather-input').value = name;
                this.hideSearchSuggestions();

                this.showLoading('Loading weather data...');
                try {
                    await this.loadWeatherData(lat, lon, name);
                } catch (error) {
                    this.showError('Failed to load weather data');
                } finally {
                    this.hideLoading();
                }
            });
        });
    }

    hideSearchSuggestions() {
        document.getElementById('search-suggestions').classList.add('hidden');
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        this.showLoading('Getting your location...');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const cityData = await this.weatherAPI.getCityFromCoords(latitude, longitude);
                    await this.loadWeatherData(latitude, longitude, cityData.name);
                } catch (error) {
                    this.showError('Failed to get weather for your location');
                } finally {
                    this.hideLoading();
                }
            },
            (error) => {
                this.hideLoading();
                this.showError('Unable to get your location. Please check your browser settings.');
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    }

    async loadWeatherData(lat, lon, locationName) {
        try {
            const weatherData = await this.weatherAPI.getWeatherData(lat, lon);
            this.currentLocation = { lat, lon, name: locationName };
            this.currentWeatherData = weatherData;

            this.updateCurrentWeather(weatherData.current, locationName);
            this.updateHourlyForecast(weatherData.forecast.hourly);
            this.updateDailyForecast(weatherData.forecast.daily);
            this.updateAirQuality(weatherData.airPollution);
            this.updateTemperatureChart(weatherData.forecast.hourly);
            this.updateWeatherMap(lat, lon);
            this.checkWeatherAlerts(weatherData);

            // Update last updated time
            document.getElementById('last-updated').textContent =
                `Updated: ${new Date().toLocaleTimeString()}`;

        } catch (error) {
            console.error('Weather data error:', error);
            throw error;
        }
    }

    updateCurrentWeather(weather, locationName) {
        document.getElementById('current-location').textContent = locationName;
        document.getElementById('current-temp').textContent = `${weather.temperature}°`;
        document.getElementById('weather-desc').textContent = weather.weather.description;
        document.getElementById('feels-like').textContent = `Feels like ${weather.feelsLike}°`;
        document.getElementById('temp-range').textContent = `H: ${weather.tempMax}° L: ${weather.tempMin}°`;

        // Weather icon
        const iconElement = document.getElementById('weather-icon');
        iconElement.src = this.weatherAPI.getLocalWeatherIcon(weather.weather.main);
        iconElement.classList.add('weather-icon-animate');

        // Weather details
        document.getElementById('visibility').textContent = weather.visibility ? `${weather.visibility} km` : 'N/A';
        document.getElementById('wind-speed').textContent = `${Math.round(weather.windSpeed * 3.6)} km/h`;
        document.getElementById('humidity').textContent = `${weather.humidity}%`;
        document.getElementById('pressure').textContent = `${weather.pressure} hPa`;

        // Calculate and display UV Index
        const uvIndex = this.weatherAPI.calculateUVIndex(weather);
        document.getElementById('uv-index').textContent = uvIndex;
    }

    updateHourlyForecast(hourlyData) {
        const container = document.getElementById('hourly-forecast');

        container.innerHTML = hourlyData.map(hour => {
            const time = new Date(hour.time * 1000);
            const timeStr = time.getHours() === 0 ? '12 AM' :
                           time.getHours() <= 12 ? `${time.getHours()} AM` :
                           `${time.getHours() - 12} PM`;

            return `
                <div class="hourly-item">
                    <div class="text-sm text-gray-300 mb-2">${timeStr}</div>
                    <img src="${this.weatherAPI.getLocalWeatherIcon(hour.weather.main)}"
                         class="w-8 h-8 mx-auto mb-2" alt="${hour.weather.description}">
                    <div class="text-white font-medium">${hour.temperature}°</div>
                    <div class="text-xs text-gray-400 mt-1">${Math.round(hour.windSpeed * 3.6)} km/h</div>
                </div>
            `;
        }).join('');
    }

    updateDailyForecast(dailyData) {
        const container = document.getElementById('daily-forecast');

        container.innerHTML = dailyData.map(day => {
            const date = new Date(day.date * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

            return `
                <div class="daily-item">
                    <div class="flex items-center space-x-4">
                        <div class="w-20 text-white font-medium">${dayName}</div>
                        <img src="${this.weatherAPI.getLocalWeatherIcon(day.weather.main)}"
                             class="w-8 h-8" alt="${day.weather.description}">
                        <div class="flex-1 text-gray-300 capitalize">${day.weather.description}</div>
                    </div>
                    <div class="flex items-center space-x-4 text-white">
                        <span class="text-sm text-gray-400">${day.humidity}%</span>
                        <span class="font-medium">${day.tempMax}°</span>
                        <span class="text-gray-400">${day.tempMin}°</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateAirQuality(airData) {
        if (!airData) {
            document.getElementById('aqi-value').textContent = '--';
            document.getElementById('aqi-status').textContent = 'Not available';
            return;
        }

        document.getElementById('aqi-value').textContent = airData.aqi;
        document.getElementById('aqi-status').textContent = airData.status;

        const aqiBar = document.getElementById('aqi-bar');
        aqiBar.className = `h-2 rounded-full transition-all duration-300 ${airData.colorClass}`;
        aqiBar.style.width = `${(airData.aqi / 5) * 100}%`;
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Initialize section-specific functionality
        if (sectionName === 'maps' && this.currentLocation) {
            this.initializeWeatherMap();
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        const body = document.getElementById('app-body');
        const themeIcon = document.querySelector('#theme-toggle i');

        if (this.isDarkTheme) {
            body.classList.add('dark');
            body.classList.remove('bg-gradient-to-br', 'from-slate-900', 'via-blue-900', 'to-indigo-900');
            body.classList.add('bg-gradient-to-br', 'from-gray-900', 'via-slate-900', 'to-black');
            themeIcon.className = 'uil uil-moon text-xl';
        } else {
            body.classList.remove('dark');
            body.classList.remove('bg-gradient-to-br', 'from-gray-900', 'via-slate-900', 'to-black');
            body.classList.add('bg-gradient-to-br', 'from-slate-900', 'via-blue-900', 'to-indigo-900');
            themeIcon.className = 'uil uil-sun text-xl';
        }

        this.storage.set('theme', this.isDarkTheme ? 'dark' : 'light');
    }

    showLoading(message = 'Loading...') {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.querySelector('p').textContent = message;
        loadingScreen.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 1000);
    }

    showError(message) {
        // Create and show error toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 slide-up';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('current-date').textContent =
            now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
    }

    loadSettings() {
        const theme = this.storage.get('theme');
        if (theme === 'dark') {
            this.toggleTheme();
        }
    }

    openSettings() {
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    closeSettings() {
        document.getElementById('settings-modal').classList.add('hidden');
    }

    saveSettings() {
        // Save settings logic would go here
        this.closeSettings();
        this.showSuccess('Settings saved successfully');
    }

    resetSettings() {
        // Reset settings logic would go here
        this.showSuccess('Settings reset to defaults');
    }

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 slide-up';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    loadFavoriteLocations() {
        const favorites = this.storage.get('favorites') || [];
        const container = document.getElementById('favorite-locations');

        if (favorites.length === 0) {
            container.innerHTML = '<div class="text-gray-400 text-center py-8">No favorite locations yet</div>';
            return;
        }

        container.innerHTML = favorites.map(fav => `
            <div class="weather-card" data-lat="${fav.lat}" data-lon="${fav.lon}" data-name="${fav.name}">
                <div class="font-medium text-white mb-2">${fav.name}</div>
                <div class="text-2xl text-white font-bold">${fav.temp || '--'}°</div>
                <div class="text-gray-300 text-sm capitalize">${fav.description || 'Loading...'}</div>
            </div>
        `).join('');

        // Add click listeners
        container.querySelectorAll('.weather-card').forEach(card => {
            card.addEventListener('click', async () => {
                const lat = parseFloat(card.dataset.lat);
                const lon = parseFloat(card.dataset.lon);
                const name = card.dataset.name;

                this.showLoading('Loading weather data...');
                try {
                    await this.loadWeatherData(lat, lon, name);
                } catch (error) {
                    this.showError('Failed to load weather data');
                } finally {
                    this.hideLoading();
                }
            });
        });
    }

    toggleFavorite() {
        if (!this.currentLocation) return;

        const favorites = this.storage.get('favorites') || [];
        const existingIndex = favorites.findIndex(fav =>
            Math.abs(fav.lat - this.currentLocation.lat) < 0.01 &&
            Math.abs(fav.lon - this.currentLocation.lon) < 0.01
        );

        const favoriteBtn = document.getElementById('favorite-btn');
        const icon = favoriteBtn.querySelector('i');

        if (existingIndex >= 0) {
            // Remove from favorites
            favorites.splice(existingIndex, 1);
            icon.className = 'uil uil-heart text-xl';
            this.showSuccess('Removed from favorites');
        } else {
            // Add to favorites
            favorites.push({
                lat: this.currentLocation.lat,
                lon: this.currentLocation.lon,
                name: this.currentLocation.name,
                temp: this.currentWeatherData?.current?.temperature,
                description: this.currentWeatherData?.current?.weather?.description
            });
            icon.className = 'uil uil-heart-alt text-xl text-red-500';
            this.showSuccess('Added to favorites');
        }

        this.storage.set('favorites', favorites);
        this.loadFavoriteLocations();
    }

    updateTemperatureChart(hourlyData) {
        const ctx = document.getElementById('temperature-chart');
        if (!ctx) return;

        if (this.temperatureChart) {
            this.temperatureChart.destroy();
        }

        const labels = hourlyData.slice(0, 12).map(hour => {
            const time = new Date(hour.time * 1000);
            return time.getHours() + ':00';
        });

        const temperatures = hourlyData.slice(0, 12).map(hour => hour.temperature);

        this.temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    initializeWeatherMap() {
        if (this.weatherMap) return;

        const mapContainer = document.getElementById('weather-map');
        if (!mapContainer || !this.currentLocation) return;

        this.weatherMap = L.map('weather-map').setView([this.currentLocation.lat, this.currentLocation.lon], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.weatherMap);

        // Add weather marker
        L.marker([this.currentLocation.lat, this.currentLocation.lon])
            .addTo(this.weatherMap)
            .bindPopup(`<b>${this.currentLocation.name}</b><br>${this.currentWeatherData?.current?.temperature}°C`)
            .openPopup();
    }

    updateWeatherMap(lat, lon) {
        if (this.weatherMap) {
            this.weatherMap.setView([lat, lon], 10);
        }
    }

    changeMapLayer(layer) {
        // Map layer change logic would go here
        console.log('Changing map layer to:', layer);
    }

    checkWeatherAlerts(weatherData) {
        const alertsContainer = document.getElementById('weather-alerts');
        const alertsList = document.getElementById('weather-alerts-list');

        // Simple alert logic based on weather conditions
        const alerts = [];
        const current = weatherData.current;

        if (current.temperature > 35) {
            alerts.push({
                type: 'warning',
                title: 'High Temperature Alert',
                message: `Temperature is ${current.temperature}°C. Stay hydrated and avoid prolonged sun exposure.`
            });
        }

        if (current.temperature < 0) {
            alerts.push({
                type: 'warning',
                title: 'Freezing Temperature Alert',
                message: `Temperature is ${current.temperature}°C. Be cautious of icy conditions.`
            });
        }

        if (current.windSpeed > 15) {
            alerts.push({
                type: 'info',
                title: 'High Wind Alert',
                message: `Wind speed is ${Math.round(current.windSpeed * 3.6)} km/h. Secure loose objects.`
            });
        }

        if (weatherData.airPollution && weatherData.airPollution.aqi > 3) {
            alerts.push({
                type: 'warning',
                title: 'Air Quality Alert',
                message: `Air quality is ${weatherData.airPollution.status}. Consider limiting outdoor activities.`
            });
        }

        // Update alerts display
        if (alerts.length > 0) {
            alertsContainer.textContent = `${alerts.length} alert${alerts.length > 1 ? 's' : ''}`;
            alertsList.innerHTML = alerts.map(alert => `
                <div class="p-4 rounded-xl border alert-${alert.type}">
                    <div class="font-semibold mb-2">${alert.title}</div>
                    <div class="text-sm">${alert.message}</div>
                </div>
            `).join('');
        } else {
            alertsContainer.textContent = '';
            alertsList.innerHTML = '<div class="text-gray-400 text-center py-8">No active weather alerts</div>';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiController = new UIController();
});
