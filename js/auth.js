/* ========================================
   Authentication Module
   ======================================== */
const Auth = {
  currentUser: null,

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "wardrobe_salt_2024");
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  },

  async register(name, username, password) {
    // Check if username exists
    const existing = await DB.getByIndex("users", "username", username);
    if (existing) throw new Error("Username already taken");

    const user = {
      id: DB.generateId(),
      name,
      username,
      passwordHash: await this.hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    await DB.add("users", user);
    this.setSession(user);
    return user;
  },

  async login(username, password) {
    const user = await DB.getByIndex("users", "username", username);
    if (!user) throw new Error("User not found");

    const hash = await this.hashPassword(password);
    if (user.passwordHash !== hash) throw new Error("Incorrect password");

    this.setSession(user);
    return user;
  },

  async changePassword(currentPassword, newPassword) {
    if (!this.currentUser) throw new Error("Not signed in");

    const hash = await this.hashPassword(currentPassword);
    if (hash !== this.currentUser.passwordHash)
      throw new Error("Incorrect current password");

    this.currentUser.passwordHash = await this.hashPassword(newPassword);
    await DB.update("users", this.currentUser);
    this.setSession(this.currentUser);
    return this.currentUser;
  },

  async resetPassword(username, newPassword) {  
    const user = await DB.getByIndex("users", "username", username);
    if (!user) throw new Error("User not found");

    user.passwordHash = await this.hashPassword(newPassword);
    await DB.update("users", user);

    if (this.currentUser?.id === user.id) this.setSession(user);
    return user;
  },

  setSession(user) {
    this.currentUser = user;
    localStorage.setItem(
      "wardrobe_session",
      JSON.stringify({
        id: user.id,
        name: user.name,
        username: user.username,
      }),
    );
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem("wardrobe_session");
  },

  async restoreSession() {
    const session = localStorage.getItem("wardrobe_session");
    if (!session) return null;

    try {
      const data = JSON.parse(session);
      const user = await DB.get("users", data.id);
      if (user) {
        this.currentUser = user;
        return user;
      }
    } catch (e) {
      console.warn("Session restore failed:", e);
    }

    localStorage.removeItem("wardrobe_session");
    return null;
  },

  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  },

  isLoggedIn() {
    return !!this.currentUser;
  },
};
