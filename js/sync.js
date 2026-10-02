/* DAT Prep — saves progress online with a personal code (no email needed yet).
   The code comes from a personal link (…/dat-prep/?code=XXXX-XXXX-XXXX), is kept on the device,
   and is removed from the address bar. Progress still saves on the device first; every change is
   then uploaded. On open, the newer copy (device or online) wins; a replaced device copy is kept
   under "dat-prep-v1-before-sync" as a safety net. */
(function () {
  "use strict";
  const URL_ = "https://frdcgfafsumdqjbjdhmf.supabase.co/rest/v1/rpc/";
  const KEY_ = "sb_publishable_S-5a43bXpPvd_aDsrcp44A_D8TQTAOw"; // public key; the functions only work with a valid personal code
  const CODE_KEY = "dat-prep-code";
  const BACKUP_KEY = "dat-prep-v1-before-sync";
  let status = "off", lastSynced = null, timer = null, pushing = false, again = false;

  const getCode = () => { try { return localStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; } };
  const setCode = (c) => { try { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); } catch (e) { } };

  async function rpc(fn, body) {
    const r = await fetch(URL_ + fn, { method: "POST", headers: { apikey: KEY_, Authorization: "Bearer " + KEY_, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { const e = new Error((j && j.message) || "HTTP " + r.status); e.code = j && j.message; throw e; }
    return j;
  }
  function paint() {
    const chip = document.getElementById("syncChip");
    if (!chip) return;
    const code = getCode();
    chip.hidden = !code;
    chip.dataset.state = status;
    chip.textContent = status === "syncing" ? "Saving…" : status === "error" ? "Not saved online" : status === "offline" ? "Offline · on device" : "Saved online";
    chip.title = lastSynced ? "Last saved online " + lastSynced.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    document.dispatchEvent(new CustomEvent("dat-sync-status"));
  }
  function set(s) { status = s; if (s === "synced") lastSynced = new Date(); paint(); }

  async function push() {
    const app = window.DATApp, code = getCode();
    if (!app || !code) return;
    if (pushing) { again = true; return; }
    pushing = true; set("syncing");
    try {
      const s = app.state;
      const r = await rpc("dat_save", { p_code: code, p_data: s, p_ms: s.updatedAt || Date.now() });
      if (r && r.saved === false) await pull(false); // another device saved something newer
      else set("synced");
    } catch (e) { set(navigator.onLine ? "error" : "offline"); }
    pushing = false;
    if (again) { again = false; push(); }
  }
  const schedule = () => { if (!getCode()) return; clearTimeout(timer); timer = setTimeout(push, 1500); };

  async function pull(first) {
    const app = window.DATApp, code = getCode();
    if (!app || !code) return;
    if (app.busy && app.busy()) return; // never swap data under a running test
    set("syncing");
    let r;
    try { r = await rpc("dat_load", { p_code: code }); }
    catch (e) {
      if (/DAT_CODE_INVALID/.test(e.code || e.message)) { setCode(""); set("off"); app.toast("That personal link isn't valid. Ask Vinu for a new one."); return; }
      set(navigator.onLine ? "error" : "offline"); return;
    }
    const local = app.state, localMs = local.updatedAt || 0, remoteMs = Number(r.client_updated_ms) || 0;
    const keepCopy = () => { if (localMs > 0) { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(local)); } catch (e) { } } };
    // This device's progress belongs to someone else, or to nobody yet: never mix it into this account blindly.
    if (local.owner !== code && localMs > 0) {
      if (r.data) { keepCopy(); app.replace(Object.assign({}, r.data, { owner: code })); set("synced"); if (first) app.toast("Your progress is loaded" + (r.name ? ", " + r.name : "")); return; }
      const who = r.name || "this account";
      const keep = local.owner ? false : confirm("This device already has DAT Prep progress from before. Add it to " + who + "'s online account?\n\nOK: add it.  Cancel: start " + who + "'s account fresh (the old progress is kept on this device as a backup).");
      if (!keep) { keepCopy(); const fresh = app.blank(); fresh.owner = code; fresh.settings.name = r.name || ""; app.replace(fresh); }
      else app.setOwner(code);
      await push(); return;
    }
    if (local.owner !== code) app.setOwner(code);
    if (r.data && remoteMs > localMs + 1000) {
      if (localMs > 0) { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(local)); } catch (e) { } }
      app.replace(Object.assign({}, r.data, { owner: code }));
      set("synced");
      if (first) app.toast("Your progress is loaded" + (r.name ? ", " + r.name : ""));
    } else if (!r.data || localMs > remoteMs + 1000) {
      if (r.name && !local.settings.name) app.applyName(r.name);
      await push();
      if (first && !r.data) app.toast("Your progress now saves online");
    } else set("synced");
  }

  // Use a personal code: from the link, or typed in Me → Settings.
  async function useCode(code) {
    code = String(code || "").trim().toUpperCase();
    if (!code) return false;
    setCode(code);
    await pull(true);
    return !!getCode();
  }
  function forget() { setCode(""); set("off"); }

  // Read-only viewing link: …/dat-prep/?watch=CODE. Loads the learner's progress without saving anything.
  async function watch(code) {
    const app = window.DATApp;
    try { const r = await rpc("dat_load", { p_code: code }); app.watch(r.data, r.name); }
    catch (e) { app.toast(/DAT_CODE_INVALID/.test(e.code || e.message) ? "That viewing link isn't valid." : "Couldn't reach the server. Check the connection and reload."); }
  }
  function boot() {
    const u = new URL(location.href), fromLink = u.searchParams.get("code"), watching = u.searchParams.get("watch");
    if (watching) {
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") watch(watching.trim().toUpperCase()); });
      watch(watching.trim().toUpperCase());
      window.DATSync = { useCode() { return false; }, forget() { }, push() { return Promise.resolve(); }, pull() { }, code: "", status: "off", lastSynced: null };
      return;
    }
    if (fromLink) { u.searchParams.delete("code"); history.replaceState(null, "", u.pathname + (u.search ? u.search : "") + u.hash); setCode(fromLink.trim().toUpperCase()); }
    document.addEventListener("dat-saved", schedule);
    window.addEventListener("online", () => { if (getCode()) push(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && getCode()) pull(false); });
    const chip = document.getElementById("syncChip");
    if (chip) chip.addEventListener("click", () => window.DATApp && window.DATApp.go("me", "settings"));
    paint();
    if (getCode()) pull(true);
  }
  window.DATSync = { useCode, forget, push, pull, get code() { return getCode(); }, get status() { return status; }, get lastSynced() { return lastSynced; } };
  if (window.DATApp) boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
