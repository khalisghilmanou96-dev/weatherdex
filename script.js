const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

const POPULAR_CITIES = [
  { name: "Paris", country: "France", countryCode: "FR", latitude: 48.8566, longitude: 2.3522 },
  { name: "Londres", country: "Royaume-Uni", countryCode: "GB", latitude: 51.5072, longitude: -0.1276 },
  { name: "New York", country: "États-Unis", countryCode: "US", latitude: 40.7128, longitude: -74.0060 },
  { name: "Tokyo", country: "Japon", countryCode: "JP", latitude: 35.6762, longitude: 139.6503 },
  { name: "Dubaï", country: "Émirats arabes unis", countryCode: "AE", latitude: 25.2048, longitude: 55.2708 },
  { name: "Sydney", country: "Australie", countryCode: "AU", latitude: -33.8688, longitude: 151.2093 },
  { name: "Montréal", country: "Canada", countryCode: "CA", latitude: 45.5019, longitude: -73.5674 },
  { name: "Marrakech", country: "Maroc", countryCode: "MA", latitude: 31.6295, longitude: -7.9811 }
];

const WEATHER_CODES = {
  0: ["Ciel dégagé", "☀️"], 1: ["Plutôt dégagé", "🌤️"], 2: ["Partiellement nuageux", "⛅"], 3: ["Couvert", "☁️"],
  45: ["Brouillard", "🌫️"], 48: ["Brouillard givrant", "🌫️"], 51: ["Bruine légère", "🌦️"], 53: ["Bruine", "🌦️"],
  55: ["Bruine forte", "🌧️"], 56: ["Bruine verglaçante", "🌧️"], 57: ["Forte bruine verglaçante", "🌧️"],
  61: ["Pluie légère", "🌦️"], 63: ["Pluie", "🌧️"], 65: ["Forte pluie", "🌧️"], 66: ["Pluie verglaçante", "🌧️"],
  67: ["Forte pluie verglaçante", "🌧️"], 71: ["Neige légère", "🌨️"], 73: ["Neige", "🌨️"], 75: ["Forte neige", "❄️"],
  77: ["Grains de neige", "❄️"], 80: ["Averses légères", "🌦️"], 81: ["Averses", "🌧️"], 82: ["Fortes averses", "⛈️"],
  85: ["Averses de neige", "🌨️"], 86: ["Fortes averses de neige", "❄️"], 95: ["Orage", "⛈️"], 96: ["Orage et grêle", "⛈️"], 99: ["Fort orage et grêle", "⛈️"]
};

const grid = document.querySelector("#weatherGrid");
const statusEl = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");
const unitSelect = document.querySelector("#unitSelect");
const searchButton = document.querySelector("#searchButton");
const locationButton = document.querySelector("#locationButton");
const refreshButton = document.querySelector("#refreshButton");
const cardTemplate = document.querySelector("#weatherCardTemplate");
const dialog = document.querySelector("#weatherDialog");
const details = document.querySelector("#weatherDetails");
const closeDialogButton = document.querySelector("#closeDialogButton");

function setStatus(message = "") { statusEl.textContent = message; }
function condition(code) { return WEATHER_CODES[code] || ["Conditions variables", "🌡️"]; }
function tempUnit() { return unitSelect.value === "fahrenheit" ? "°F" : "°C"; }
function formatTemp(value) { return value == null ? "—" : `${Math.round(value)}${tempUnit()}`; }
function formatDay(date) { return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`)); }

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur API (${response.status})`);
  return response.json();
}

async function fetchWeather(place) {
  const url = new URL(FORECAST_API);
  url.searchParams.set("latitude", place.latitude);
  url.searchParams.set("longitude", place.longitude);
  url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max");
  url.searchParams.set("temperature_unit", unitSelect.value);
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");
  return getJson(url);
}

async function geocode(query) {
  const url = new URL(GEOCODING_API);
  url.searchParams.set("name", query.trim());
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "fr");
  url.searchParams.set("format", "json");
  const data = await getJson(url);
  if (!data.results?.length) throw new Error("Ville introuvable");
  const p = data.results[0];
  return { name: p.name, country: p.country || "", countryCode: p.country_code || "", admin1: p.admin1 || "", latitude: p.latitude, longitude: p.longitude };
}

function createPill(text) {
  const pill = document.createElement("span");
  pill.className = "type-pill";
  pill.textContent = text;
  return pill;
}

function createCard(place, weather) {
  const node = cardTemplate.content.cloneNode(true);
  const card = node.querySelector(".pokemon-card");
  const current = weather.current;
  const [label, icon] = condition(current.weather_code);
  node.querySelector(".weather-country").textContent = place.countryCode || place.country || "MONDE";
  node.querySelector(".weather-icon").textContent = icon;
  node.querySelector(".pokemon-name").textContent = place.name;
  node.querySelector(".weather-temp").textContent = formatTemp(current.temperature_2m);
  node.querySelector(".weather-condition").textContent = label;
  const pills = node.querySelector(".pokemon-types");
  pills.appendChild(createPill(`Ressenti ${formatTemp(current.apparent_temperature)}`));
  pills.appendChild(createPill(`Vent ${Math.round(current.wind_speed_10m)} km/h`));
  card.addEventListener("click", () => openDetails(place));
  return node;
}

async function loadPopular() {
  setStatus("Chargement de la météo mondiale…");
  refreshButton.disabled = true;
  grid.innerHTML = "";
  try {
    const results = await Promise.all(POPULAR_CITIES.map(async place => ({ place, weather: await fetchWeather(place) })));
    results.forEach(({ place, weather }) => grid.appendChild(createCard(place, weather)));
    setStatus(`${results.length} villes mises à jour via Open-Meteo.`);
  } catch (error) {
    console.error(error);
    setStatus("Impossible de charger la météo pour le moment.");
  } finally {
    refreshButton.disabled = false;
  }
}

function infoRow(label, value) { return `<div class="info-row"><span>${label}</span><strong>${value ?? "—"}</strong></div>`; }

async function openDetails(place) {
  setStatus(`Chargement de la météo de ${place.name}…`);
  try {
    const weather = await fetchWeather(place);
    const c = weather.current;
    const [label, icon] = condition(c.weather_code);
    const forecast = weather.daily.time.map((date, i) => {
      const [dayLabel, dayIcon] = condition(weather.daily.weather_code[i]);
      return `<div class="forecast-day"><span>${formatDay(date)}</span><b>${dayIcon}</b><strong>${formatTemp(weather.daily.temperature_2m_max[i])}</strong><small>${formatTemp(weather.daily.temperature_2m_min[i])} · ${dayLabel}</small></div>`;
    }).join("");

    details.innerHTML = `
      <div class="detail-shell">
        <div class="detail-hero">
          <div class="detail-weather-icon">${icon}</div>
          <div>
            <div class="detail-number">${place.country}${place.admin1 ? ` · ${place.admin1}` : ""}</div>
            <h2 class="detail-name">${place.name}</h2>
            <div class="pokemon-types"><span class="type-pill">${label}</span><span class="type-pill">${weather.timezone_abbreviation || weather.timezone}</span></div>
            <div class="detail-meta">
              <span><strong>${formatTemp(c.temperature_2m)}</strong><br>Température</span>
              <span><strong>${formatTemp(c.apparent_temperature)}</strong><br>Ressenti</span>
              <span><strong>${Math.round(c.relative_humidity_2m)} %</strong><br>Humidité</span>
            </div>
          </div>
        </div>
        <div class="stats">
          <p class="eyebrow">Aujourd’hui</p>
          ${infoRow("Vent", `${Math.round(c.wind_speed_10m)} km/h`)}
          ${infoRow("Rafale max / vent max", `${Math.round(weather.daily.wind_speed_10m_max[0])} km/h`)}
          ${infoRow("Précipitations", `${weather.daily.precipitation_probability_max[0] ?? 0} %`)}
          ${infoRow("Lever du soleil", weather.daily.sunrise[0].split("T")[1])}
          ${infoRow("Coucher du soleil", weather.daily.sunset[0].split("T")[1])}
          <p class="eyebrow forecast-title">Prévisions sur 7 jours</p>
          <div class="forecast-grid">${forecast}</div>
        </div>
      </div>`;
    if (typeof dialog.showModal === "function") dialog.showModal();
    setStatus(`${place.name} mis à jour via Open-Meteo.`);
  } catch (error) {
    console.error(error);
    setStatus("Impossible de charger cette ville pour le moment.");
  }
}

async function searchCity() {
  const query = searchInput.value.trim();
  if (!query) { searchInput.focus(); setStatus("Entre le nom d’une ville."); return; }
  setStatus(`Recherche de “${query}”…`);
  try { const place = await geocode(query); await openDetails(place); }
  catch (error) { console.error(error); setStatus(`Aucune ville trouvée pour “${query}”.`); }
}

function useLocation() {
  if (!navigator.geolocation) { setStatus("La géolocalisation n’est pas disponible dans ce navigateur."); return; }
  setStatus("Localisation en cours…");
  navigator.geolocation.getCurrentPosition(
    pos => openDetails({ name: "Ma position", country: "Position actuelle", countryCode: "📍", latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    () => setStatus("Position non accessible. Autorise la géolocalisation ou recherche une ville."),
    { enableHighAccuracy: false, timeout: 10000 }
  );
}

searchButton.addEventListener("click", searchCity);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") searchCity(); });
locationButton.addEventListener("click", useLocation);
refreshButton.addEventListener("click", loadPopular);
unitSelect.addEventListener("change", loadPopular);
closeDialogButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });

loadPopular();
