/* =========================================================
   Weather App
   - Geocoding + forecast: Open-Meteo (free, no API key)
   ========================================================= */

const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

/* WMO weather interpretation codes -> icon + description */
const WEATHER_CODES = {
  0: { icon: "☀️", description: "Clear sky" },
  1: { icon: "🌤️", description: "Mainly clear" },
  2: { icon: "⛅", description: "Partly cloudy" },
  3: { icon: "☁️", description: "Overcast" },
  45: { icon: "🌫️", description: "Fog" },
  48: { icon: "🌫️", description: "Depositing rime fog" },
  51: { icon: "🌦️", description: "Light drizzle" },
  53: { icon: "🌦️", description: "Moderate drizzle" },
  55: { icon: "🌦️", description: "Dense drizzle" },
  56: { icon: "🌧️", description: "Freezing drizzle" },
  57: { icon: "🌧️", description: "Dense freezing drizzle" },
  61: { icon: "🌧️", description: "Slight rain" },
  63: { icon: "🌧️", description: "Moderate rain" },
  65: { icon: "🌧️", description: "Heavy rain" },
  66: { icon: "🌧️", description: "Freezing rain" },
  67: { icon: "🌧️", description: "Heavy freezing rain" },
  71: { icon: "❄️", description: "Slight snow fall" },
  73: { icon: "❄️", description: "Moderate snow fall" },
  75: { icon: "❄️", description: "Heavy snow fall" },
  77: { icon: "❄️", description: "Snow grains" },
  80: { icon: "🌦️", description: "Slight rain showers" },
  81: { icon: "🌦️", description: "Moderate rain showers" },
  82: { icon: "⛈️", description: "Violent rain showers" },
  85: { icon: "🌨️", description: "Slight snow showers" },
  86: { icon: "🌨️", description: "Heavy snow showers" },
  95: { icon: "⛈️", description: "Thunderstorm" },
  96: { icon: "⛈️", description: "Thunderstorm with slight hail" },
  99: { icon: "⛈️", description: "Thunderstorm with heavy hail" },
};

const NIGHT_ICONS = {
  0: "🌙",
  1: "🌙",
  2: "☁️",
};

/* ---------- DOM elements ---------- */
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const statusEl = document.getElementById("status");
const weatherCard = document.getElementById("weather-card");
const forecastSection = document.getElementById("forecast-section");
const forecastList = document.getElementById("forecast-list");
const unitButtons = document.querySelectorAll(".units__button");

const locationNameEl = document.getElementById("location-name");
const locationDateEl = document.getElementById("location-date");
const iconEl = document.getElementById("weather-icon");
const temperatureEl = document.getElementById("temperature");
const temperatureUnitEl = document.getElementById("temperature-unit");
const descriptionEl = document.getElementById("weather-description");
const feelsLikeEl = document.getElementById("feels-like");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const pressureEl = document.getElementById("pressure");

/* ---------- State ---------- */
let unit = "celsius"; // "celsius" | "fahrenheit"
let lastPlace = null; // { latitude, longitude, name, country }

/* ---------- Helpers ---------- */
function unitSymbol() {
  return unit === "fahrenheit" ? "°F" : "°C";
}

function windUnit() {
  return unit === "fahrenheit" ? "mph" : "km/h";
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status" + (type ? ` status--${type}` : "");
}

function setLoading(isLoading) {
  searchBtn.disabled = isLoading;
  cityInput.disabled = isLoading;
  unitButtons.forEach((btn) => (btn.disabled = isLoading));
  if (isLoading) setStatus("Loading weather data…", "loading");
}

function weatherInfo(code, isDay) {
  if (!isDay && NIGHT_ICONS[code]) {
    return { icon: NIGHT_ICONS[code], description: WEATHER_CODES[code].description };
  }
  return WEATHER_CODES[code] || { icon: "🌡️", description: "Unknown conditions" };
}

function formatLocalDate(dateString, options) {
  return new Date(dateString).toLocaleDateString("en-US", options);
}

/* ---------- API calls ---------- */
async function geocodeCity(query) {
  const url = `${GEO_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding request failed. Please try again.");
  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No results found for "${query}". Check the spelling and try again.`);
  }
  return data.results[0];
}

async function fetchWeather(place) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "5",
    temperature_unit: unit,
    wind_speed_unit: unit === "fahrenheit" ? "mph" : "kmh",
  });

  const response = await fetch(`${WEATHER_API}?${params.toString()}`);
  if (!response.ok) throw new Error("Weather request failed. Please try again.");
  return response.json();
}

/* ---------- Rendering ---------- */
function renderCurrent(place, data) {
  const current = data.current;
  const info = weatherInfo(current.weather_code, current.is_day === 1);

  locationNameEl.textContent = [place.name, place.country].filter(Boolean).join(", ");
  locationDateEl.textContent = formatLocalDate(current.time, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  iconEl.textContent = info.icon;
  temperatureEl.textContent = Math.round(current.temperature_2m);
  temperatureUnitEl.textContent = unitSymbol();
  descriptionEl.textContent = info.description;

  feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}${unitSymbol()}`;
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windEl.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit()}`;
  pressureEl.textContent = `${Math.round(current.surface_pressure)} hPa`;

  weatherCard.hidden = false;
}

function renderForecast(data) {
  const daily = data.daily;
  forecastList.innerHTML = "";

  daily.time.forEach((day, index) => {
    const info = weatherInfo(daily.weather_code[index], true);
    const item = document.createElement("li");
    item.className = "forecast__day";

    const name = document.createElement("span");
    name.className = "forecast__name";
    name.textContent =
      index === 0 ? "Today" : formatLocalDate(day, { weekday: "short" });

    const icon = document.createElement("span");
    icon.className = "forecast__icon";
    icon.textContent = info.icon;
    icon.title = info.description;

    const temps = document.createElement("span");
    temps.className = "forecast__temps";

    const high = document.createElement("span");
    high.className = "high";
    high.textContent = `${Math.round(daily.temperature_2m_max[index])}${unitSymbol()}`;

    const low = document.createElement("span");
    low.className = "low";
    low.textContent = `${Math.round(daily.temperature_2m_min[index])}${unitSymbol()}`;

    temps.append(high, low);
    item.append(name, icon, temps);
    forecastList.appendChild(item);
  });

  forecastSection.hidden = false;
}

/* ---------- Main flow ---------- */
async function loadWeather(place) {
  setLoading(true);
  try {
    const data = await fetchWeather(place);
    lastPlace = place;
    renderCurrent(place, data);
    renderForecast(data);
    setStatus(`Showing weather for ${place.name}.`, "success");
  } catch (error) {
    weatherCard.hidden = true;
    forecastSection.hidden = true;
    setStatus(error.message || "Something went wrong. Please try again.", "error");
  } finally {
    setLoading(false);
  }
}

async function searchCity(query) {
  const cleaned = query.trim();
  if (!cleaned) {
    setStatus("Please enter a city name.", "error");
    return;
  }

  setLoading(true);
  try {
    const place = await geocodeCity(cleaned);
    await loadWeather(place);
  } catch (error) {
    weatherCard.hidden = true;
    forecastSection.hidden = true;
    setStatus(error.message || "Something went wrong. Please try again.", "error");
    setLoading(false);
  }
}

/* ---------- Event listeners ---------- */
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchCity(cityInput.value);
});

unitButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextUnit = button.dataset.unit;
    if (nextUnit === unit) return;

    unit = nextUnit;
    unitButtons.forEach((btn) =>
      btn.classList.toggle("units__button--active", btn.dataset.unit === unit)
    );

    if (lastPlace) {
      loadWeather(lastPlace);
    }
  });
});

/* ---------- Init: load a default city on start ---------- */
searchCity("Paris");


