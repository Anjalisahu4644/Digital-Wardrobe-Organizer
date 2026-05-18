/* ========================================
   Wardrobe Management Module
   ======================================== */
const Wardrobe = {
  categories: [
    "Tops",
    "Bottoms",
    "Dresses",
    "Ethnic Wear",
    "Traditional Wear",
    "Outerwear",
    "Shoes",
    "Accessories",
    "Activewear",
    "Formal",
    "Other",
  ],
  seasons: ["Spring", "Summer", "Fall", "Winter", "All Season"],
  colors: [
    "Black",
    "White",
    "Gray",
    "Red",
    "Maroon",
    "Cream",
    "Lavender",
    "Olive",
    "Silver",
    "Charcoal",
    "Wine",
    "Blue",
    "Green",
    "Yellow",
    "Pink",
    "Purple",
    "Orange",
    "Brown",
    "Navy",
    "Beige",
    "Multi",
  ],
  occasions: [
    "Casual",
    "Formal",
    "Work",
    "Festival",
    "Cuitural",
    "Party",
    "Sport",
    "Date Night",
    "Travel",
    "Lounge",
  ],

  categoryEmoji: {
    Tops: "👕",
    Bottoms: "👖",
    Dresses: "👗",
    Outerwear: "🧥",
    Shoes: "👟",
    Accessories: "⌚",
    Activewear: "🏃",
    Formal: "👔",
    Other: "🏷️",
  },

  async addItem(data) {
    const item = {
      id: DB.generateId(),
      userId: Auth.getUserId(),
      name: data.name,
      category: data.category,
      color: data.color || "",
      season: data.season || "All Season",
      occasion: data.occasion || "Casual",
      tags: data.tags || [],
      image: data.image || null,
      notes: data.notes || "",
      wearCount: 0,
      lastWorn: null,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    return await DB.add("clothes", item);
  },

  async getItem(id) {
    return await DB.get("clothes", id);
  },

  async getAllItems() {
    const userId = Auth.getUserId();
    return await DB.getAllByIndex("clothes", "userId", userId);
  },

  async updateItem(id, updates) {
    const item = await DB.get("clothes", id);
    if (!item) throw new Error("Item not found");
    Object.assign(item, updates);
    return await DB.update("clothes", item);
  },

  async deleteItem(id) {
    await DB.delete("clothes", id);
    // Also clean up usage logs
    const logs = await DB.getAllByIndex("usageLogs", "clothId", id);
    for (const log of logs) {
      await DB.delete("usageLogs", log.id);
    }
  },

  async toggleFavorite(id) {
    const item = await DB.get("clothes", id);
    if (item) {
      item.favorite = !item.favorite;
      await DB.update("clothes", item);
    }
    return item;
  },

  async logWear(itemId) {
    const item = await DB.get("clothes", itemId);
    if (item) {
      item.wearCount = (item.wearCount || 0) + 1;
      item.lastWorn = new Date().toISOString();
      await DB.update("clothes", item);
    }

    const log = {
      id: DB.generateId(),
      userId: Auth.getUserId(),
      clothId: itemId,
      date: new Date().toISOString(),
    };
    await DB.add("usageLogs", log);
  },

  async searchItems(query) {
    const items = await this.getAllItems();
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
        (item.notes && item.notes.toLowerCase().includes(q)),
    );
  },

  async filterItems(filters) {
    let items = await this.getAllItems();

    if (filters.category && filters.category !== "all") {
      items = items.filter((i) => i.category === filters.category);
    }
    if (filters.season && filters.season !== "all") {
      items = items.filter((i) => i.season === filters.season);
    }
    if (filters.color && filters.color !== "all") {
      items = items.filter((i) => i.color === filters.color);
    }
    if (filters.occasion && filters.occasion !== "all") {
      items = items.filter((i) => i.occasion === filters.occasion);
    }
    if (filters.favorite) {
      items = items.filter((i) => i.favorite);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.tags && i.tags.some((t) => t.toLowerCase().includes(q))),
      );
    }

    return items;
  },

  // AI-assisted auto-tagging via image analysis
  async analyzeImage(imageDataUrl) {
    const canvas = document.getElementById("hidden-canvas");
    const ctx = canvas.getContext("2d");

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Resize for analysis
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const pixels = imageData.data;

        // Analyze dominant colors
        const colorCounts = {};
        for (let i = 0; i < pixels.length; i += 16) {
          // Sample every 4th pixel
          const r = pixels[i],
            g = pixels[i + 1],
            b = pixels[i + 2],
            a = pixels[i + 3];
          if (a < 128) continue; // Skip transparent

          const colorName = this._classifyColor(r, g, b);
          colorCounts[colorName] = (colorCounts[colorName] || 0) + 1;
        }

        // Sort by frequency
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map((e) => e[0]);

        const dominantColor = sortedColors[0] || "Multi";

        // Analyze brightness
        let totalBrightness = 0;
        let pixelCount = 0;
        for (let i = 0; i < pixels.length; i += 16) {
          if (pixels[i + 3] < 128) continue;
          totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          pixelCount++;
        }
        const avgBrightness =
          pixelCount > 0 ? totalBrightness / pixelCount : 128;

        // Generate suggested tags
        const tags = [];
        tags.push(dominantColor.toLowerCase());

        if (avgBrightness > 180) tags.push("light");
        else if (avgBrightness < 80) tags.push("dark");

        if (sortedColors.length > 3) tags.push("colorful");
        if (sortedColors.length <= 2) tags.push("solid");

        // Style suggestions based on color
        if (["Black", "White", "Navy", "Gray"].includes(dominantColor)) {
          tags.push("versatile");
        }
        if (["Red", "Pink", "Purple"].includes(dominantColor)) {
          tags.push("bold");
        }
        if (["Beige", "Brown", "White"].includes(dominantColor)) {
          tags.push("neutral");
        }

        resolve({
          dominantColor,
          secondaryColor: sortedColors[1] || dominantColor,
          suggestedTags: [...new Set(tags)],
          brightness:
            avgBrightness > 150
              ? "light"
              : avgBrightness > 80
                ? "medium"
                : "dark",
        });
      };
      img.src = imageDataUrl;
    });
  },

  _classifyColor(r, g, b) {
    const hsv = this._rgbToHsv(r, g, b);
    const h = hsv[0],
      s = hsv[1],
      v = hsv[2];

    if (v < 0.15) return "Black";
    if (v > 0.85 && s < 0.12) return "White";
    if (s < 0.15) return "Gray";

    if (s < 0.25 && v > 0.6) return "Beige";

    if (h < 15 || h >= 345) return "Red";
    if (h >= 15 && h < 40) return "Orange";
    if (h >= 40 && h < 70) return "Yellow";
    if (h >= 70 && h < 165) return "Green";
    if (h >= 165 && h < 195) return v < 0.4 ? "Navy" : "Blue";
    if (h >= 195 && h < 250) return v < 0.35 ? "Navy" : "Blue";
    if (h >= 250 && h < 290) return "Purple";
    if (h >= 290 && h < 345) return "Pink";

    return "Multi";
  },

  _rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const d = max - min;
    let h,
      s = max === 0 ? 0 : d / max,
      v = max;

    if (max === min) {
      h = 0;
    } else {
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return [h * 360, s, v];
  },

  // Compress image before storing
  async compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.getElementById("hidden-canvas");
          const ctx = canvas.getContext("2d");

          const maxDim = 600;
          let w = img.width,
            h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = (h / w) * maxDim;
              w = maxDim;
            } else {
              w = (w / h) * maxDim;
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // Render wardrobe page
  renderPage() {
    return `
      <div class="page-header">
        <h1>My Wardrobe</h1>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="add-item-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Item
          </button>
        </div>
      </div>

      <div class="search-filter-bar">
        <div class="search-input-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="search-input" id="wardrobe-search" placeholder="Search clothes...">
        </div>
        <select class="filter-select" id="filter-category">
          <option value="all">All Categories</option>
          ${this.categories.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <select class="filter-select" id="filter-season">
          <option value="all">All Seasons</option>
          ${this.seasons.map((s) => `<option value="${s}">${s}</option>`).join("")}
        </select>
        <select class="filter-select" id="filter-color">
          <option value="all">All Colors</option>
          ${this.colors.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>

      <div class="items-grid" id="items-grid"></div>
    `;
  },

  async renderItems(filters = {}) {
    const grid = document.getElementById("items-grid");
    if (!grid) return;

    const items = await this.filterItems(filters);

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.38 3.46L16.01 2H8L3.62 3.46A2 2 0 0 0 2 5.34V21a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5.34a2 2 0 0 0-1.62-1.88z"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
          <h3>No items found</h3>
          <p>${Object.keys(filters).length > 0 ? "Try adjusting your filters" : "Start adding clothes to your wardrobe!"}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items
      .map(
        (item) => `
      <div class="item-card" data-id="${item.id}">
        ${
          item.image
            ? `<img class="item-card-img" src="${item.image}" alt="${item.name}" loading="lazy">`
            : `<div class="item-card-img-placeholder">${this.categoryEmoji[item.category] || "👕"}</div>`
        }
        <div class="item-card-body">
          <div class="item-card-name">${this._escapeHtml(item.name)}</div>
          <div class="item-card-meta">
            <span class="item-tag">${item.category}</span>
            ${item.color ? `<span class="item-tag green">${item.color}</span>` : ""}
            ${item.favorite ? '<span class="item-tag pink">★ Fav</span>' : ""}
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    // Attach click handlers
    grid.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", () =>
        this.showItemDetail(card.dataset.id),
      );
    });
  },

  showAddModal(editItem = null) {
    const isEdit = !!editItem;
    const title = isEdit ? "Edit Item" : "Add New Item";

    document.getElementById("modal-content").innerHTML = `
      <h2>${title}</h2>
      <form class="modal-form" id="item-form">
        <div class="img-upload-area" id="img-upload-area">
          ${
            editItem && editItem.image
              ? `<img src="${editItem.image}" alt="preview" id="img-preview">`
              : `<div class="img-upload-text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Click or drag to upload image
              </div>`
          }
          <input type="file" id="img-input" accept="image/*" style="display:none">
        </div>
        <div id="ai-suggestions"></div>

        <div class="input-group">
          <label for="item-name">Name</label>
          <input type="text" id="item-name" placeholder="e.g., Blue Denim Jacket" required value="${isEdit ? this._escapeHtml(editItem.name) : ""}">
        </div>

        <div class="form-row">
          <div class="input-group">
            <label for="item-category">Category</label>
            <select id="item-category" required>
              ${this.categories.map((c) => `<option value="${c}" ${isEdit && editItem.category === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
          <div class="input-group">
            <label for="item-color">Color</label>
            <select id="item-color">
              <option value="">Select color</option>
              ${this.colors.map((c) => `<option value="${c}" ${isEdit && editItem.color === c ? "selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="input-group">
            <label for="item-season">Season</label>
            <select id="item-season">
              ${this.seasons.map((s) => `<option value="${s}" ${isEdit && editItem.season === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
          <div class="input-group">
            <label for="item-occasion">Occasion</label>
            <select id="item-occasion">
              ${this.occasions.map((o) => `<option value="${o}" ${isEdit && editItem.occasion === o ? "selected" : ""}>${o}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="input-group">
          <label>Tags</label>
          <div class="tags-container" id="tags-container">
            ${isEdit && editItem.tags ? editItem.tags.map((t) => `<span class="tag-pill">${t}<button type="button" data-tag="${t}">&times;</button></span>`).join("") : ""}
            <input type="text" class="tag-input" id="tag-input" placeholder="Type and press Enter...">
          </div>
        </div>

        <div class="input-group">
          <label for="item-notes">Notes</label>
          <textarea id="item-notes" placeholder="Optional notes...">${isEdit && editItem.notes ? this._escapeHtml(editItem.notes) : ""}</textarea>
        </div>

        <button type="submit" class="btn btn-primary btn-full">${isEdit ? "Update Item" : "Add to Wardrobe"}</button>
      </form>
    `;

    // State
    let currentImage = editItem ? editItem.image : null;
    let currentTags = editItem ? [...(editItem.tags || [])] : [];
    let analysisResult = null;

    // Image upload
    const uploadArea = document.getElementById("img-upload-area");
    const imgInput = document.getElementById("img-input");

    uploadArea.addEventListener("click", () => imgInput.click());
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "var(--accent-primary)";
    });
    uploadArea.addEventListener("dragleave", () => {
      uploadArea.style.borderColor = "";
    });
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "";
      if (e.dataTransfer.files.length) handleImage(e.dataTransfer.files[0]);
    });

    imgInput.addEventListener("change", () => {
      if (imgInput.files.length) handleImage(imgInput.files[0]);
    });

    const handleImage = async (file) => {
      currentImage = await this.compressImage(file);
      uploadArea.innerHTML = `<img src="${currentImage}" alt="preview" id="img-preview">`;
      uploadArea.classList.add("has-image");

      // AI Analysis
      const suggestions = document.getElementById("ai-suggestions");
      suggestions.innerHTML = '<div class="spinner"></div>';

      analysisResult = await this.analyzeImage(currentImage);

      // Auto-fill color
      const colorSelect = document.getElementById("item-color");
      if (colorSelect.value === "" && analysisResult.dominantColor) {
        const option = Array.from(colorSelect.options).find(
          (o) => o.value === analysisResult.dominantColor,
        );
        if (option) colorSelect.value = analysisResult.dominantColor;
      }

      // Show tag suggestions
      suggestions.innerHTML = `
        <div style="margin-bottom: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
          🤖 AI Suggested Tags <span style="color: var(--accent-secondary);">(click to add)</span>
        </div>
        <div class="ai-tags">
          ${analysisResult.suggestedTags.map((t) => `<button type="button" class="ai-tag-suggestion" data-tag="${t}">${t}</button>`).join("")}
        </div>
      `;

      suggestions.querySelectorAll(".ai-tag-suggestion").forEach((btn) => {
        btn.addEventListener("click", () => {
          addTag(btn.dataset.tag);
          btn.remove();
        });
      });
    };

    // Tags
    const tagsContainer = document.getElementById("tags-container");
    const tagInput = document.getElementById("tag-input");

    const addTag = (tag) => {
      tag = tag.trim().toLowerCase();
      if (!tag || currentTags.includes(tag)) return;
      currentTags.push(tag);
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.innerHTML = `${tag}<button type="button" data-tag="${tag}">&times;</button>`;
      tagsContainer.insertBefore(pill, tagInput);
      pill
        .querySelector("button")
        .addEventListener("click", () => removeTag(tag, pill));
    };

    const removeTag = (tag, pill) => {
      currentTags = currentTags.filter((t) => t !== tag);
      pill.remove();
    };

    // Existing tag remove buttons
    tagsContainer.querySelectorAll(".tag-pill button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tag = btn.dataset.tag;
        currentTags = currentTags.filter((t) => t !== tag);
        btn.parentElement.remove();
      });
    });

    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInput.value);
        tagInput.value = "";
      }
      if (e.key === "Backspace" && !tagInput.value && currentTags.length) {
        const last = currentTags.pop();
        const pills = tagsContainer.querySelectorAll(".tag-pill");
        if (pills.length) pills[pills.length - 1].remove();
      }
    });

    tagsContainer.addEventListener("click", () => tagInput.focus());

    // Form submit
    document
      .getElementById("item-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = {
          name: document.getElementById("item-name").value.trim(),
          category: document.getElementById("item-category").value,
          color: document.getElementById("item-color").value,
          season: document.getElementById("item-season").value,
          occasion: document.getElementById("item-occasion").value,
          tags: currentTags,
          image: currentImage,
          notes: document.getElementById("item-notes").value.trim(),
        };

        try {
          if (isEdit) {
            await this.updateItem(editItem.id, data);
            App.toast("Item updated!", "success");
          } else {
            await this.addItem(data);
            App.toast("Item added to wardrobe!", "success");
          }
          App.closeModal();
          this.renderItems(App.currentFilters || {});
        } catch (err) {
          App.toast("Error: " + err.message, "error");
        }
      });

    App.openModal();
  },

  async showItemDetail(id) {
    const item = await this.getItem(id);
    if (!item) return;

    document.getElementById("modal-content").innerHTML = `
      <div style="margin-bottom:1rem;">
        ${
          item.image
            ? `<img src="${item.image}" alt="${item.name}" style="width:100%;max-height:300px;object-fit:contain;border-radius:var(--radius-md);background:var(--bg-input);">`
            : `<div class="item-card-img-placeholder" style="height:200px;border-radius:var(--radius-md);font-size:4rem;">${this.categoryEmoji[item.category] || "👕"}</div>`
        }
      </div>
      <h2 style="margin-bottom:0.5rem;">${this._escapeHtml(item.name)}</h2>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
        <span class="item-tag">${item.category}</span>
        ${item.color ? `<span class="item-tag green">${item.color}</span>` : ""}
        <span class="item-tag orange">${item.season}</span>
        <span class="item-tag pink">${item.occasion}</span>
      </div>
      ${
        item.tags && item.tags.length
          ? `
        <div style="margin-bottom:0.75rem;">
          ${item.tags.map((t) => `<span class="item-tag" style="margin-right:0.25rem;">${t}</span>`).join("")}
        </div>
      `
          : ""
      }
      ${item.notes ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">${this._escapeHtml(item.notes)}</p>` : ""}
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">
        Worn ${item.wearCount || 0} times ${item.lastWorn ? "• Last: " + new Date(item.lastWorn).toLocaleDateString() : ""}
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="detail-wear">👕 Log Wear</button>
        <button class="btn btn-secondary btn-sm" id="detail-fav">${item.favorite ? "★ Unfavorite" : "☆ Favorite"}</button>
        <button class="btn btn-secondary btn-sm" id="detail-edit">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" id="detail-delete">🗑️ Delete</button>
      </div>
    `;

    document
      .getElementById("detail-wear")
      .addEventListener("click", async () => {
        await this.logWear(id);
        App.toast("Wear logged!", "success");
        this.showItemDetail(id);
      });

    document
      .getElementById("detail-fav")
      .addEventListener("click", async () => {
        await this.toggleFavorite(id);
        App.toast(
          item.favorite ? "Removed from favorites" : "Added to favorites!",
          "success",
        );
        this.showItemDetail(id);
      });

    document.getElementById("detail-edit").addEventListener("click", () => {
      App.closeModal();
      setTimeout(() => this.showAddModal(item), 300);
    });

    document
      .getElementById("detail-delete")
      .addEventListener("click", async () => {
        if (confirm("Delete this item permanently?")) {
          await this.deleteItem(id);
          App.toast("Item deleted", "success");
          App.closeModal();
          this.renderItems(App.currentFilters || {});
        }
      });

    App.openModal();
  },

  _escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};
