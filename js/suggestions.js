/* ========================================
   Smart Suggestions Module
   ======================================== */
const Suggestions = {
  weatherData: null,
  locationAllowed: false,

  async getWeather() {
    try {
      // Try to get user location
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
        });
      });

      this.locationAllowed = true;
      const lat = pos.coords.latitude.toFixed(2);
      const lon = pos.coords.longitude.toFixed(2);

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`,
      );
      const data = await res.json();

      this.weatherData = {
        temp: Math.round(data.current.temperature_2m),
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        unit: "°C",
      };
    } catch (e) {
      // Fallback: use default/simulated data
      this.weatherData = {
        temp: 35,
        weatherCode: 1,
        windSpeed: 10,
        unit: "°C",
        simulated: true,
      };
    }
    return this.weatherData;
  },

  getWeatherDescription(code) {
    const descriptions = {
      0: { text: "Clear sky", icon: "☀️" },
      1: { text: "Mainly clear", icon: "🌤️" },
      2: { text: "Partly cloudy", icon: "⛅" },
      3: { text: "Overcast", icon: "☁️" },
      45: { text: "Foggy", icon: "🌫️" },
      48: { text: "Freezing fog", icon: "🌫️" },
      51: { text: "Light drizzle", icon: "🌦️" },
      53: { text: "Moderate drizzle", icon: "🌧️" },
      61: { text: "Light rain", icon: "🌧️" },
      63: { text: "Moderate rain", icon: "🌧️" },
      65: { text: "Heavy rain", icon: "🌧️" },
      71: { text: "Light snow", icon: "❄️" },
      73: { text: "Moderate snow", icon: "❄️" },
      75: { text: "Heavy snow", icon: "❄️" },
      80: { text: "Rain showers", icon: "🌦️" },
      95: { text: "Thunderstorm", icon: "⛈️" },
    };
    return descriptions[code] || { text: "Unknown", icon: "🌡️" };
  },

  async getWeatherSuggestions() {
    if (!this.weatherData) await this.getWeather();
    const items = await Wardrobe.getAllItems();
    const temp = this.weatherData.temp;
    const code = this.weatherData.weatherCode;

    let suggested = [];
    let reason = "";

    if (temp < 5) {
      reason = "It's freezing! Bundle up with warm layers.";
      suggested = items.filter(
        (i) =>
          i.season === "Winter" ||
          i.category === "Outerwear" ||
          i.tags?.some((t) => ["warm", "cozy", "thick", "wool"].includes(t)),
      );
    } else if (temp < 15) {
      reason = "Cool weather — layer up with a jacket.";
      suggested = items.filter(
        (i) =>
          ["Fall", "Winter", "All Season"].includes(i.season) ||
          i.category === "Outerwear",
      );
    } else if (temp < 25) {
      reason = "Pleasant weather — light layers work great.";
      suggested = items.filter((i) =>
        ["Spring", "All Season"].includes(i.season),
      );
    } else {
      reason = "It's hot! Stay cool with light clothing.";
      suggested = items.filter(
        (i) =>
          i.season === "Summer" ||
          i.season === "All Season" ||
          i.tags?.some((t) => ["light", "breathable", "cotton"].includes(t)),
      );
    }

    // If rainy, add outerwear
    if ([51, 53, 61, 63, 65, 80, 95].includes(code)) {
      reason += " Don't forget your rain gear!";
      const rainGear = items.filter(
        (i) =>
          i.category === "Outerwear" ||
          i.tags?.some((t) => ["waterproof", "rain", "umbrella"].includes(t)),
      );
      suggested = [...new Set([...rainGear, ...suggested])];
    }

    // Limit results but ensure variety
    return { items: this._diversify(suggested, 8), reason };
  },

  async getOccasionSuggestions(occasion) {
    const items = await Wardrobe.getAllItems();
    let suggested = items.filter((i) => i.occasion === occasion);

    // Also include items with matching tags
    if (suggested.length < 4) {
      const additional = items.filter(
        (i) =>
          i.tags?.some((t) => t.toLowerCase() === occasion.toLowerCase()) &&
          !suggested.includes(i),
      );
      suggested = [...suggested, ...additional];
    }

    return this._diversify(suggested, 8);
  },

  async getRandomOutfit() {
    const items = await Wardrobe.getAllItems();
    if (items.length === 0) return null;

    const byCategory = {};
    items.forEach((item) => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    });

    const outfit = {};
    for (const [cat, catItems] of Object.entries(byCategory)) {
      const rand = catItems[Math.floor(Math.random() * catItems.length)];
      outfit[cat] = rand;
    }

    return outfit;
  },

  _diversify(items, limit) {
    // Try to get items from different categories
    const byCategory = {};
    items.forEach((item) => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    });

    const result = [];
    const cats = Object.keys(byCategory);
    let idx = 0;
    while (result.length < limit && idx < items.length) {
      for (const cat of cats) {
        if (byCategory[cat].length > 0 && result.length < limit) {
          result.push(byCategory[cat].shift());
        }
      }
      idx += cats.length;
    }

    return result;
  },

  renderPage() {
    return `
      <div class="page-header">
        <h1>Smart Suggestions</h1>
      </div>

      <div id="weather-section">
        <div class="spinner"></div>
      </div>

      <h2 style="font-size:1.1rem;margin:1.5rem 0 0.75rem;">By Occasion</h2>
      <div class="occasion-chips" id="occasion-chips">
        ${Wardrobe.occasions.map((o) => `<button class="occasion-chip" data-occasion="${o}">${o}</button>`).join("")}
      </div>

      <div class="items-grid" id="suggestion-items"></div>
    `;
  },

  async renderWeather() {
    const section = document.getElementById("weather-section");
    if (!section) return;

    const weather = await this.getWeather();
    const desc = this.getWeatherDescription(weather.weatherCode);
    const { items: suggested, reason } = await this.getWeatherSuggestions();

    section.innerHTML = `
      <div class="weather-card">
        <div class="weather-icon">${desc.icon}</div>
        <div class="weather-info">
          <div class="weather-temp">${weather.temp}${weather.unit}</div>
          <h3>${desc.text}</h3>
          <div class="weather-desc">${weather.simulated ? "📍 Location unavailable — showing sample weather" : "Current conditions"}</div>
        </div>
      </div>

      <h2 style="font-size:1.1rem;margin-bottom:0.5rem;">Weather-Based Picks</h2>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">${reason}</p>

      <div class="items-grid" id="weather-items">
        ${
          suggested.length === 0
            ? '<p style="color:var(--text-muted);font-size:0.85rem;">Add items to your wardrobe to get suggestions!</p>'
            : suggested
                .map(
                  (item) => `
            <div class="item-card" data-id="${item.id}">
              ${
                item.image
                  ? `<img class="item-card-img" src="${item.image}" alt="${item.name}">`
                  : `<div class="item-card-img-placeholder">${Wardrobe.categoryEmoji[item.category] || "👕"}</div>`
              }
              <div class="item-card-body">
                <div class="item-card-name">${Wardrobe._escapeHtml(item.name)}</div>
                <div class="item-card-meta">
                  <span class="item-tag">${item.category}</span>
                </div>
              </div>
            </div>
          `,
                )
                .join("")
        }
      </div>
    `;

    // Click handlers on suggestion cards
    section.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", () =>
        Wardrobe.showItemDetail(card.dataset.id),
      );
    });
  },

  async renderOccasionItems(occasion) {
    const grid = document.getElementById("suggestion-items");
    if (!grid) return;

    const items = await this.getOccasionSuggestions(occasion);

    if (items.length === 0) {
      grid.innerHTML =
        '<p style="color:var(--text-muted);font-size:0.85rem;grid-column:1/-1;">No items match this occasion. Add items with this occasion tag!</p>';
      return;
    }

    grid.innerHTML = items
      .map(
        (item) => `
      <div class="item-card" data-id="${item.id}">
        ${
          item.image
            ? `<img class="item-card-img" src="${item.image}" alt="${item.name}">`
            : `<div class="item-card-img-placeholder">${Wardrobe.categoryEmoji[item.category] || "👕"}</div>`
        }
        <div class="item-card-body">
          <div class="item-card-name">${Wardrobe._escapeHtml(item.name)}</div>
          <div class="item-card-meta">
            <span class="item-tag">${item.category}</span>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    grid.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", () =>
        Wardrobe.showItemDetail(card.dataset.id),
      );
    });
  },
};
