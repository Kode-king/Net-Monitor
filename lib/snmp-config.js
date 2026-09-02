// Shared normalization + validation for a device's SNMP settings.
// Used by the create/update/test API routes so the rules live in one place.

import { translate } from "./i18n.js";

export const SNMP_VERSIONS = ["1", "2c", "3"];
export const SEC_LEVELS = ["noAuthNoPriv", "authNoPriv", "authPriv"];
export const AUTH_PROTOCOLS = ["md5", "sha", "sha224", "sha256", "sha384", "sha512"];
export const PRIV_PROTOCOLS = ["des", "aes", "aes256b", "aes256r"];

const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

// Returns a normalized { snmp_* } object safe to spread into a DB row / snmp session.
export function normalizeSnmp(b = {}) {
  const version = pick(b.snmp_version, SNMP_VERSIONS, "2c");

  if (version === "3") {
    const secLevel = pick(b.snmp_sec_level, SEC_LEVELS, "authPriv");
    return {
      snmp_version: "3",
      snmp_community: "public", // unused for v3, kept non-null for the NOT NULL column
      snmp_sec_level: secLevel,
      snmp_sec_name: (b.snmp_sec_name || "").trim() || null,
      snmp_auth_protocol: pick(b.snmp_auth_protocol, AUTH_PROTOCOLS, "sha"),
      snmp_auth_key: secLevel === "noAuthNoPriv" ? null : b.snmp_auth_key || null,
      snmp_priv_protocol: pick(b.snmp_priv_protocol, PRIV_PROTOCOLS, "aes"),
      snmp_priv_key: secLevel === "authPriv" ? b.snmp_priv_key || null : null,
      snmp_context: (b.snmp_context || "").trim() || null,
    };
  }

  return {
    snmp_version: version,
    snmp_community: b.snmp_community || "public",
    snmp_sec_level: "authPriv",
    snmp_sec_name: null,
    snmp_auth_protocol: "sha",
    snmp_auth_key: null,
    snmp_priv_protocol: "aes",
    snmp_priv_key: null,
    snmp_context: null,
  };
}

// Human-readable check for missing v3 credentials; returns an error string or null.
export function validateSnmp(cfg, lang = "ar") {
  const m = (k) => translate(lang, k);
  if (cfg.snmp_version !== "3") return null;
  if (!cfg.snmp_sec_name) return m("srv.v3SecNameRequired");
  if (cfg.snmp_sec_level !== "noAuthNoPriv" && !cfg.snmp_auth_key)
    return m("srv.v3AuthKeyRequired");
  if (cfg.snmp_sec_level === "authPriv" && !cfg.snmp_priv_key)
    return m("srv.v3PrivKeyRequired");
  return null;
}
