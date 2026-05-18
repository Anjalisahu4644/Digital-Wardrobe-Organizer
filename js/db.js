/* ========================================
   IndexedDB Wrapper
   ======================================== */
const DB = {
  name: 'WardrobeDB',
  version: 1,
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, this.version);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const users = db.createObjectStore('users', { keyPath: 'id' });
          users.createIndex('username', 'username', { unique: true });
        }

        // Clothes store
        if (!db.objectStoreNames.contains('clothes')) {
          const clothes = db.createObjectStore('clothes', { keyPath: 'id' });
          clothes.createIndex('userId', 'userId', { unique: false });
          clothes.createIndex('category', 'category', { unique: false });
        }

        // Outfits store
        if (!db.objectStoreNames.contains('outfits')) {
          const outfits = db.createObjectStore('outfits', { keyPath: 'id' });
          outfits.createIndex('userId', 'userId', { unique: false });
        }

        // Usage logs store
        if (!db.objectStoreNames.contains('usageLogs')) {
          const logs = db.createObjectStore('usageLogs', { keyPath: 'id' });
          logs.createIndex('userId', 'userId', { unique: false });
          logs.createIndex('clothId', 'clothId', { unique: false });
        }
      };

      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      req.onerror = (e) => reject(e.target.error);
    });
  },

  _tx(store, mode = 'readonly') {
    const tx = this.db.transaction(store, mode);
    return tx.objectStore(store);
  },

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, 'readwrite');
      const req = store.add(data);
      req.onsuccess = () => resolve(data);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getAllByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const idx = store.index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName);
      const idx = store.index(indexName);
      const req = idx.get(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async update(storeName, data) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, 'readwrite');
      const req = store.put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = this._tx(storeName, 'readwrite');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
};
