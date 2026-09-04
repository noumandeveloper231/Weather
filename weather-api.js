// Advanced Weather API Handler
class WeatherAPI {
    constructor() {
        this.apiKey = '658f7d37de6b11d8c852af9d34fb455c';
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.oneCallUrl = 'https://api.openweathermap.org/data/3.0/onecall';
        this.geocodingUrl = 'https://api.openweathermap.org/geo/1.0';
        this.airPollutionUrl = 'https://api.openweathermap.org/data/2.5/air_pollution';
        this.cache = new Map();
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
    }

    // Get coordinates from city name
    async getCoordinates(cityName) {
        const cacheKey = `coords_${cityName}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.geocodingUrl}/direct?q=${encodeURIComponent(cityName)}&limit=5&appid=${this.apiKey}`
            );
            const data = await response.json();

            if (data.length > 0) {
                const result = {
                    lat: data[0].lat,
                    lon: data[0].lon,
                    name: data[0].name,
                    country: data[0].country,
                    state: data[0].state
                };
                this.setCache(cacheKey, result);
                return result;
            }
            throw new Error('Location not found');
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    }

    // Get city name from coordinates
    async getCityFromCoords(lat, lon) {
        const cacheKey = `city_${lat}_${lon}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.geocodingUrl}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`
            );
            const data = await response.json();

            if (data.length > 0) {
                const result = {
                    name: data[0].name,
                    country: data[0].country,
                    state: data[0].state
                };
                this.setCache(cacheKey, result);
                return result;
            }
            throw new Error('Location not found');
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            throw error;
        }
    }

    // Get current weather
    async getCurrentWeather(lat, lon) {
        const cacheKey = `current_${lat}_${lon}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            const data = await response.json();

            if (data.cod === 200) {
                const result = this.formatCurrentWeather(data);
                this.setCache(cacheKey, result);
                return result;
            }
            throw new Error(data.message || 'Weather data not available');
        } catch (error) {
            console.error('Current weather error:', error);
            throw error;
        }
    }

    // Get comprehensive weather data (current + forecast)
    async getWeatherData(lat, lon) {
        try {
            // For free tier, we'll use multiple endpoints
            const [current, forecast, airPollution] = await Promise.all([
                this.getCurrentWeather(lat, lon),
                this.getForecast(lat, lon),
                this.getAirPollution(lat, lon).catch(() => null)
            ]);

            return {
                current,
                forecast,
                airPollution,
                location: { lat, lon }
            };
        } catch (error) {
            console.error('Weather data error:', error);
            throw error;
        }
    }

    // Get 5-day forecast
    async getForecast(lat, lon) {
        const cacheKey = `forecast_${lat}_${lon}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`
            );
            const data = await response.json();

            if (data.cod === '200') {
                const result = this.formatForecast(data);
                this.setCache(cacheKey, result);
                return result;
            }
            throw new Error(data.message || 'Forecast data not available');
        } catch (error) {
            console.error('Forecast error:', error);
            throw error;
        }
    }

    // Get air pollution data
    async getAirPollution(lat, lon) {
        const cacheKey = `air_${lat}_${lon}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.airPollutionUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}`
            );
            const data = await response.json();

            if (data.list && data.list.length > 0) {
                const result = this.formatAirPollution(data.list[0]);
                this.setCache(cacheKey, result);
                return result;
            }
            throw new Error('Air pollution data not available');
        } catch (error) {
            console.error('Air pollution error:', error);
            throw error;
        }
    }

    // Search cities with suggestions
    async searchCities(query) {
        if (query.length < 2) return [];

        try {
            const response = await fetch(
                `${this.geocodingUrl}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.apiKey}`
            );
            const data = await response.json();

            return data.map(city => ({
                name: city.name,
                country: city.country,
                state: city.state,
                lat: city.lat,
                lon: city.lon,
                displayName: `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`
            }));
        } catch (error) {
            console.error('City search error:', error);
            return [];
        }
    }

    // Format current weather data
    formatCurrentWeather(data) {
        return {
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            tempMin: Math.round(data.main.temp_min),
            tempMax: Math.round(data.main.temp_max),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            visibility: data.visibility ? Math.round(data.visibility / 1000) : null,
            windSpeed: data.wind?.speed || 0,
            windDirection: data.wind?.deg || 0,
            cloudiness: data.clouds?.all || 0,
            weather: {
                main: data.weather[0].main,
                description: data.weather[0].description,
                icon: data.weather[0].icon
            },
            sunrise: data.sys.sunrise,
            sunset: data.sys.sunset,
            timezone: data.timezone,
            timestamp: Date.now()
        };
    }

    // Format forecast data
    formatForecast(data) {
        const hourly = [];
        const daily = [];
        const processedDays = new Set();

        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();

            // Hourly forecast (next 24 hours)
            if (hourly.length < 24) {
                hourly.push({
                    time: item.dt,
                    temperature: Math.round(item.main.temp),
                    weather: {
                        main: item.weather[0].main,
                        description: item.weather[0].description,
                        icon: item.weather[0].icon
                    },
                    precipitation: item.rain ? item.rain['3h'] || 0 : 0,
                    windSpeed: item.wind?.speed || 0
                });
            }

            // Daily forecast (group by day)
            if (!processedDays.has(dayKey) && daily.length < 7) {
                processedDays.add(dayKey);
                daily.push({
                    date: item.dt,
                    tempMin: Math.round(item.main.temp_min),
                    tempMax: Math.round(item.main.temp_max),
                    weather: {
                        main: item.weather[0].main,
                        description: item.weather[0].description,
                        icon: item.weather[0].icon
                    },
                    humidity: item.main.humidity,
                    windSpeed: item.wind?.speed || 0,
                    precipitation: item.rain ? item.rain['3h'] || 0 : 0
                });
            }
        });

        return { hourly, daily };
    }

    // Format air pollution data
    formatAirPollution(data) {
        const aqi = data.main.aqi;
        const components = data.components;

        const aqiLabels = {
            1: 'Good',
            2: 'Fair',
            3: 'Moderate',
            4: 'Poor',
            5: 'Very Poor'
        };

        const aqiColors = {
            1: 'aqi-good',
            2: 'aqi-moderate',
            3: 'aqi-unhealthy-sensitive',
            4: 'aqi-unhealthy',
            5: 'aqi-very-unhealthy'
        };

        return {
            aqi,
            status: aqiLabels[aqi] || 'Unknown',
            colorClass: aqiColors[aqi] || 'aqi-good',
            components: {
                co: components.co,
                no: components.no,
                no2: components.no2,
                o3: components.o3,
                so2: components.so2,
                pm2_5: components.pm2_5,
                pm10: components.pm10,
                nh3: components.nh3
            },
            timestamp: Date.now()
        };
    }

    // Get weather icon URL
    getWeatherIcon(iconCode, size = '2x') {
        return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
    }

    // Get local weather icon
    getLocalWeatherIcon(weatherMain) {
        const iconMap = {
            'Clear': 'clear.png',
            'Clouds': 'cloud.png',
            'Rain': 'rain.png',
            'Drizzle': 'rain.png',
            'Thunderstorm': 'rain.png',
            'Snow': 'cloud.png',
            'Mist': 'cloud.png',
            'Smoke': 'cloud.png',
            'Haze': 'cloud.png',
            'Dust': 'cloud.png',
            'Fog': 'cloud.png',
            'Sand': 'cloud.png',
            'Ash': 'cloud.png',
            'Squall': 'wind.png',
            'Tornado': 'wind.png'
        };
        return iconMap[weatherMain] || 'clear.png';
    }

    // Calculate UV Index (approximation based on weather conditions)
    calculateUVIndex(weatherData) {
        const { cloudiness, timestamp, sunrise, sunset } = weatherData;
        const currentTime = timestamp / 1000;

        // Check if it's daytime
        if (currentTime < sunrise || currentTime > sunset) {
            return 0;
        }

        // Simple UV calculation based on cloud cover
        const baseUV = 7; // Moderate UV for clear sky
        const cloudFactor = (100 - cloudiness) / 100;
        return Math.round(baseUV * cloudFactor);
    }

    // Cache management
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    clearCache() {
        this.cache.clear();
    }
}

// Export for use in other modules
window.WeatherAPI = WeatherAPI;
