/* ========================================
   Outfits Module
   ======================================== */
const Outfits = {
  slots: ["Tops", "Bottoms", "Shoes", "Outerwear", "Accessories"],
  currentOutfit: {}, // { slotName: itemId }

  async create(data) {
    const outfit = {
      id: DB.generateId(),
      userId: Auth.getUserId(),
      name: data.name,
      occasion: data.occasion || "Casual",
      items: data.items, // { Tops: itemId, Bottoms: itemId, ... }
      notes: data.notes || "",
      wearCount: 0,
      createdAt: new Date().toISOString(),
    };
    return await DB.add("outfits", outfit);
  },

  async getAll() {
    return await DB.getAllByIndex("outfits", "userId", Auth.getUserId());
  },

  async get(id) {
    return await DB.get("outfits", id);
  },

  async update(id, data) {
    const outfit = await DB.get("outfits", id);
    if (!outfit) throw new Error("Outfit not found");
    Object.assign(outfit, data);
    return await DB.update("outfits", outfit);
  },

  async delete(id) {
    await DB.delete("outfits", id);
  },

  async wearOutfit(id) {
    const outfit = await this.get(id);
    if (!outfit) return;
    outfit.wearCount = (outfit.wearCount || 0) + 1;
    await DB.update("outfits", outfit);
    // Log wear for each item
    for (const value of Object.values(outfit.items)) {
      if (Array.isArray(value)) {
        for (const itemId of value) {
          if (itemId) await Wardrobe.logWear(itemId);
        }
      } else if (value) {
        await Wardrobe.logWear(value);
      }
    }
  },

  renderPage() {
    return `
      <div class="page-header">
        <h1>Outfits</h1>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="create-outfit-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Build Outfit
          </button>
        </div>
      </div>
      <div class="items-grid" id="outfits-grid"></div>
    `;
  },

  async renderOutfits() {
    const grid = document.getElementById("outfits-grid");
    if (!grid) return;

    const outfits = await this.getAll();
    const allItems = await Wardrobe.getAllItems();
    const itemMap = {};
    allItems.forEach((i) => (itemMap[i.id] = i));

    if (outfits.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <h3>No outfits yet</h3>
          <p>Create your first outfit combination!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = outfits
      .map((outfit) => {
        const itemEntries = Object.values(outfit.items)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter(Boolean)
          .map((id) => itemMap[id])
          .filter(Boolean);
        return `
        <div class="outfit-card" data-id="${outfit.id}">
          <div class="outfit-card-preview">
            ${itemEntries
              .slice(0, 4)
              .map((item) =>
                item.image
                  ? `<img src="${item.image}" alt="${item.name}">`
                  : `<div class="preview-placeholder">${Wardrobe.categoryEmoji[item.category] || "👕"}</div>`,
              )
              .join("")}
            ${itemEntries.length === 0 ? '<div class="preview-placeholder">🎨</div>' : ""}
          </div>
          <div class="outfit-card-name">${Wardrobe._escapeHtml(outfit.name)}</div>
          <div class="outfit-card-meta">${outfit.occasion} • ${itemEntries.length} items • Worn ${outfit.wearCount || 0}x</div>
          <div class="outfit-card-actions">
            <button class="btn btn-primary btn-sm outfit-wear" data-id="${outfit.id}">👕 Wear</button>
            <button class="btn btn-secondary btn-sm outfit-view" data-id="${outfit.id}">View</button>
            <button class="btn btn-danger btn-sm outfit-del" data-id="${outfit.id}">🗑️</button>
          </div>
        </div>
      `;
      })
      .join("");

    grid.querySelectorAll(".outfit-wear").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.wearOutfit(btn.dataset.id);
        App.toast("Outfit wear logged!", "success");
        this.renderOutfits();
      });
    });

    grid.querySelectorAll(".outfit-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showOutfitDetail(btn.dataset.id);
      });
    });

    grid.querySelectorAll(".outfit-del").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Delete this outfit?")) {
          await this.delete(btn.dataset.id);
          App.toast("Outfit deleted", "success");
          this.renderOutfits();
        }
      });
    });
  },

  async showOutfitDetail(id) {
    const outfit = await this.get(id);
    if (!outfit) return;

    const allItems = await Wardrobe.getAllItems();
    const itemMap = {};
    allItems.forEach((i) => (itemMap[i.id] = i));

    const itemEntries = Object.entries(outfit.items).flatMap(
      ([slot, value]) => {
        if (!value) return [];
        if (Array.isArray(value)) {
          return value
            .filter((itemId) => itemMap[itemId])
            .map((itemId) => ({ slot, item: itemMap[itemId] }));
        }
        return itemMap[value] ? [{ slot, item: itemMap[value] }] : [];
      },
    );

    document.getElementById("modal-content").innerHTML = `
      <h2>${Wardrobe._escapeHtml(outfit.name)}</h2>
      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">
        <span class="item-tag">${outfit.occasion}</span>
        <span class="item-tag green">${itemEntries.length} items</span>
        <span class="item-tag orange">Worn ${outfit.wearCount || 0}x</span>
      </div>
      <div class="outfit-slots" style="margin-bottom:1rem;">
        ${itemEntries
          .map(
            ({ slot, item }) => `
          <div class="outfit-slot filled">
            ${
              item.image
                ? `<img src="${item.image}" alt="${item.name}">`
                : `<div style="font-size:2rem;">${Wardrobe.categoryEmoji[item.category] || "👕"}</div>`
            }
            <div class="outfit-slot-label">${slot}</div>
            <div style="font-size:0.75rem;margin-top:0.25rem;">${Wardrobe._escapeHtml(item.name)}</div>
          </div>
        `,
          )
          .join("")}
      </div>
      ${outfit.notes ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">${Wardrobe._escapeHtml(outfit.notes)}</p>` : ""}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="outfit-d-wear">👕 Log Wear</button>
        <button class="btn btn-danger btn-sm" id="outfit-d-del">🗑️ Delete</button>
      </div>
    `;

    document
      .getElementById("outfit-d-wear")
      .addEventListener("click", async () => {
        await this.wearOutfit(id);
        App.toast("Outfit wear logged!", "success");
        App.closeModal();
        this.renderOutfits();
      });

    document
      .getElementById("outfit-d-del")
      .addEventListener("click", async () => {
        if (confirm("Delete this outfit?")) {
          await this.delete(id);
          App.toast("Outfit deleted", "success");
          App.closeModal();
          this.renderOutfits();
        }
      });

    App.openModal();
  },

  _getSlotItemIds(slotName) {
    const value = this.currentOutfit[slotName];
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  },

  _addItemToSlot(slotName, itemId) {
    if (slotName === "Accessories") {
      const list = this._getSlotItemIds(slotName);
      if (!list.includes(itemId)) {
        list.push(itemId);
      }
      this.currentOutfit[slotName] = list;
      return;
    }
    this.currentOutfit[slotName] = itemId;
  },

  _removeItemFromSlot(slotName, itemId) {
    if (slotName === "Accessories") {
      const list = this._getSlotItemIds(slotName).filter((id) => id !== itemId);
      if (list.length > 0) {
        this.currentOutfit[slotName] = list;
      } else {
        delete this.currentOutfit[slotName];
      }
      return;
    }
    delete this.currentOutfit[slotName];
  },

  _renderSlot(slotName, allItems) {
    const slot = document.getElementById(`slot-${slotName}`);
    if (!slot) return;

    const ids = this._getSlotItemIds(slotName);
    if (ids.length === 0) {
      slot.classList.remove("filled");
      slot.innerHTML = `<div class="outfit-slot-label">${slotName}</div>`;
      return;
    }

    slot.classList.add("filled");
    if (slotName === "Accessories") {
      slot.innerHTML = ids
        .map((itemId) => {
          const item = allItems.find((i) => i.id === itemId);
          if (!item) return "";
          return `
            <div class="accessory-preview" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
              ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;">` : `<div style="width:40px;height:40px;border-radius:10px;background:var(--bg-input);display:flex;align-items:center;justify-content:center;">${Wardrobe.categoryEmoji[item.category] || "⌚"}</div>`}
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.75rem;font-weight:600;">${Wardrobe._escapeHtml(item.name)}</div>
                <div style="font-size:0.7rem;color:var(--text-secondary);">${item.category}</div>
              </div>
              <button class="outfit-slot-remove" data-slot="${slotName}" data-id="${item.id}" style="background:none;border:none;color:var(--text-danger);font-size:1.1rem;cursor:pointer;">&times;</button>
            </div>
          `;
        })
        .join("");
    } else {
      const item = allItems.find((i) => i.id === ids[0]);
      if (!item) {
        slot.classList.remove("filled");
        slot.innerHTML = `<div class="outfit-slot-label">${slotName}</div>`;
        return;
      }
      slot.innerHTML = `
        ${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<div style="font-size:1.5rem;">${Wardrobe.categoryEmoji[item.category] || "👕"}</div>`}
        <div class="outfit-slot-label">${slotName}</div>
        <div style="font-size:0.7rem;">${Wardrobe._escapeHtml(item.name)}</div>
        <button class="outfit-slot-remove" data-slot="${slotName}" data-id="${item.id}" style="opacity:1;">&times;</button>
      `;
    }

    slot.querySelectorAll(".outfit-slot-remove").forEach((removeBtn) => {
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const slotName = removeBtn.dataset.slot;
        this._removeItemFromSlot(slotName, removeBtn.dataset.id);
        this._renderSlot(slotName, allItems);

        document
          .querySelectorAll("#builder-items-list .outfit-item-mini")
          .forEach((mini) => {
            if (mini.dataset.id === removeBtn.dataset.id) {
              mini.classList.remove("selected");
            }
          });
      });
    });
  },

  async showBuilder() {
    this.currentOutfit = {};
    const allItems = await Wardrobe.getAllItems();

    // Group items by category
    const grouped = {};
    allItems.forEach((item) => {
      const cat = item.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    document.getElementById("modal-content").innerHTML = `
      <h2>Build an Outfit</h2>
      <div class="input-group" style="margin-bottom:1rem;">
        <label for="outfit-name">Outfit Name</label>
        <input type="text" id="outfit-name" placeholder="e.g., Casual Friday" required>
      </div>
      <div class="form-row" style="margin-bottom:1rem;">
        <div class="input-group">
          <label for="outfit-occasion">Occasion</label>
          <select id="outfit-occasion">
            ${Wardrobe.occasions.map((o) => `<option value="${o}">${o}</option>`).join("")}
          </select>
        </div>
        <div class="input-group">
          <label for="outfit-notes">Notes</label>
          <input type="text" id="outfit-notes" placeholder="Optional notes">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <!-- Selected slots -->
        <div>
          <h3 style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem;">SELECTED ITEMS</h3>
          <div id="builder-slots">
            ${this.slots
              .map(
                (slot) => `
              <div class="outfit-slot" data-slot="${slot}" id="slot-${slot}">
                <div class="outfit-slot-label">${slot}</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <!-- Available items -->
        <div style="max-height:400px;overflow-y:auto;">
          <h3 style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem;">AVAILABLE ITEMS</h3>
          <select id="builder-category-filter" class="filter-select" style="width:100%;margin-bottom:0.5rem;">
            <option value="all">All Categories</option>
            ${Object.keys(grouped)
              .map((c) => `<option value="${c}">${c}</option>`)
              .join("")}
          </select>
          <div id="builder-items-list">
            ${allItems
              .map(
                (item) => `
              <div class="outfit-item-mini" data-id="${item.id}" data-category="${item.category}">
                ${
                  item.image
                    ? `<img src="${item.image}" alt="${item.name}">`
                    : `<div class="outfit-item-mini-placeholder">${Wardrobe.categoryEmoji[item.category] || "👕"}</div>`
                }
                <div class="outfit-item-mini-info">
                  <div class="outfit-item-mini-name">${Wardrobe._escapeHtml(item.name)}</div>
                  <div class="outfit-item-mini-cat">${item.category}</div>
                </div>
              </div>
            `,
              )
              .join("")}
            ${
              allItems.length === 0
                ? '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:1rem;">No items in wardrobe</p>'
                : ""
            }
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="save-outfit-btn">Save Outfit</button>
    `;

    const catFilter = document.getElementById("builder-category-filter");
    catFilter.addEventListener("change", () => {
      const val = catFilter.value;
      document
        .querySelectorAll("#builder-items-list .outfit-item-mini")
        .forEach((el) => {
          el.style.display =
            val === "all" || el.dataset.category === val ? "" : "none";
        });
    });

    const itemElements = document.querySelectorAll(
      "#builder-items-list .outfit-item-mini",
    );
    itemElements.forEach((el) => {
      el.addEventListener("click", () => {
        const itemId = el.dataset.id;
        const item = allItems.find((i) => i.id === itemId);
        if (!item) return;

        const slotName = this._categoryToSlot(item.category);
        const isAccessory = slotName === "Accessories";
        const selectedIds = this._getSlotItemIds(slotName);
        const alreadySelected = selectedIds.includes(itemId);

        if (isAccessory) {
          if (alreadySelected) {
            this._removeItemFromSlot(slotName, itemId);
            el.classList.remove("selected");
            App.toast("Accessory removed", "info");
          } else {
            this._addItemToSlot(slotName, itemId);
            el.classList.add("selected");
            App.toast("Accessory added", "success");
          }
        } else {
          this._addItemToSlot(slotName, itemId);
          document
            .querySelectorAll("#builder-items-list .outfit-item-mini")
            .forEach((otherEl) => {
              if (this._categoryToSlot(otherEl.dataset.category) === slotName) {
                otherEl.classList.remove("selected");
              }
            });
          el.classList.add("selected");
          App.toast(`Added to ${slotName}`, "info");
        }

        this._renderSlot(slotName, allItems);
      });
    });

    document
      .getElementById("save-outfit-btn")
      .addEventListener("click", async () => {
        const name = document.getElementById("outfit-name").value.trim();
        if (!name) {
          App.toast("Enter outfit name", "error");
          return;
        }

        const filledSlots = Object.keys(this.currentOutfit).filter(
          (k) => this.currentOutfit[k],
        );
        if (filledSlots.length === 0) {
          App.toast("Add at least one item", "error");
          return;
        }

        try {
          await this.create({
            name,
            occasion: document.getElementById("outfit-occasion").value,
            items: { ...this.currentOutfit },
            notes: document.getElementById("outfit-notes").value.trim(),
          });
          App.toast("Outfit saved!", "success");
          App.closeModal();
          if (document.getElementById("outfits-grid")) this.renderOutfits();
        } catch (err) {
          App.toast("Error: " + err.message, "error");
        }
      });

    App.openModal();
  },

  _categoryToSlot(category) {
    const map = {
      Tops: "Tops",
      Bottoms: "Bottoms",
      Dresses: "Tops",
      Outerwear: "Outerwear",
      Shoes: "Shoes",
      Accessories: "Accessories",
      Activewear: "Tops",
      Formal: "Tops",
      Other: "Accessories",
    };
    return map[category] || "Accessories";
  },
};
