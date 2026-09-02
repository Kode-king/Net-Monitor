import snmp from "net-snmp";

// --- Standard OIDs -----------------------------------------------------------
const OID = {
  sysDescr: "1.3.6.1.2.1.1.1.0",
  sysUpTime: "1.3.6.1.2.1.1.3.0",
  sysName: "1.3.6.1.2.1.1.5.0",

  hrProcessorLoad: "1.3.6.1.2.1.25.3.3.1.2",

  hrStorageType: "1.3.6.1.2.1.25.2.3.1.2",
  hrStorageDescr: "1.3.6.1.2.1.25.2.3.1.3",
  hrStorageAllocUnits: "1.3.6.1.2.1.25.2.3.1.4",
  hrStorageSize: "1.3.6.1.2.1.25.2.3.1.5",
  hrStorageUsed: "1.3.6.1.2.1.25.2.3.1.6",

  hrStorageRam: "1.3.6.1.2.1.25.2.1.2",
  hrStorageFixedDisk: "1.3.6.1.2.1.25.2.1.4",

  ifName: "1.3.6.1.2.1.31.1.1.1.1",
  ifHCInOctets: "1.3.6.1.2.1.31.1.1.1.6",
  ifHCOutOctets: "1.3.6.1.2.1.31.1.1.1.10",
  ifHighSpeed: "1.3.6.1.2.1.31.1.1.1.15",
  ifOperStatus: "1.3.6.1.2.1.2.2.1.8",
  ifDescr: "1.3.6.1.2.1.2.2.1.2",

  // Cisco fallbacks
  cpmCPUTotal5min: "1.3.6.1.4.1.9.9.109.1.1.1.1.8",
  cpmCPUTotal1min: "1.3.6.1.4.1.9.9.109.1.1.1.1.7",
  ciscoMemPoolUsed: "1.3.6.1.4.1.9.9.48.1.1.1.5",
  ciscoMemPoolFree: "1.3.6.1.4.1.9.9.48.1.1.1.6",
};

function toNum(v) {
  if (v == null) return null;
  if (typeof v === "bigint") return Number(v);
  if (Buffer.isBuffer(v)) {
    let n = 0n;
    for (const b of v) n = (n << 8n) | BigInt(b);
    return Number(n);
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function lastIndex(oid) {
  const parts = oid.split(".");
  return parseInt(parts[parts.length - 1], 10);
}

function makeSession(device) {
  const port = device.snmp_port || 161;

  if (device.snmp_version === "3") {
    const level =
      snmp.SecurityLevel[device.snmp_sec_level] ?? snmp.SecurityLevel.authPriv;
    const user = { name: device.snmp_sec_name || "", level };
    if (level !== snmp.SecurityLevel.noAuthNoPriv) {
      user.authProtocol =
        snmp.AuthProtocols[device.snmp_auth_protocol] ?? snmp.AuthProtocols.sha;
      user.authKey = device.snmp_auth_key || "";
    }
    if (level === snmp.SecurityLevel.authPriv) {
      user.privProtocol =
        snmp.PrivProtocols[device.snmp_priv_protocol] ?? snmp.PrivProtocols.aes;
      user.privKey = device.snmp_priv_key || "";
    }
    const options = { port, retries: 1, timeout: 4000, version: snmp.Version3 };
    if (device.snmp_context) options.context = device.snmp_context;
    return snmp.createV3Session(device.host, user, options);
  }

  const version = device.snmp_version === "1" ? snmp.Version1 : snmp.Version2c;
  return snmp.createSession(device.host, device.snmp_community || "public", {
    port,
    version,
    retries: 1,
    timeout: 4000,
  });
}

function get(session, oids) {
  return new Promise((resolve) => {
    session.get(oids, (error, varbinds) => {
      if (error) return resolve(null);
      const out = {};
      varbinds.forEach((vb, i) => {
        if (snmp.isVarbindError(vb)) out[oids[i]] = null;
        else out[oids[i]] = vb.value;
      });
      resolve(out);
    });
  });
}

function walk(session, baseOid) {
  return new Promise((resolve) => {
    const rows = [];
    session.subtree(
      baseOid,
      20,
      (varbinds) => {
        for (const vb of varbinds) {
          if (snmp.isVarbindError(vb)) continue;
          rows.push({ oid: vb.oid, index: lastIndex(vb.oid), value: vb.value });
        }
      },
      (error) => resolve(error ? [] : rows)
    );
  });
}

async function walkMap(session, baseOid) {
  const rows = await walk(session, baseOid);
  const m = new Map();
  for (const r of rows) m.set(r.index, r.value);
  return m;
}

// --- Main poll -------------------------------------------------------------
export async function pollDevice(device) {
  const session = makeSession(device);
  const started = Date.now();
  const result = {
    reachable: false,
    latency_ms: null,
    cpu: null,
    mem_used: null,
    mem_total: null,
    uptime_s: null,
    sys_name: null,
    sys_descr: null,
    storage: [],
    ifaces: [],
  };

  try {
    const sys = await get(session, [OID.sysDescr, OID.sysUpTime, OID.sysName]);
    if (!sys || sys[OID.sysUpTime] == null) {
      session.close();
      return result;
    }
    result.reachable = true;
    result.latency_ms = Date.now() - started;
    result.sys_descr = sys[OID.sysDescr]?.toString() ?? null;
    result.sys_name = sys[OID.sysName]?.toString() ?? null;
    // sysUpTime is in hundredths of a second
    result.uptime_s = Math.round(toNum(sys[OID.sysUpTime]) / 100);

    // CPU — HOST-RESOURCES first
    const cpuLoads = await walk(session, OID.hrProcessorLoad);
    if (cpuLoads.length) {
      const vals = cpuLoads.map((r) => toNum(r.value)).filter((n) => n != null);
      if (vals.length) result.cpu = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    // hrStorage table (RAM + disks)
    const types = await walkMap(session, OID.hrStorageType);
    if (types.size) {
      const descrs = await walkMap(session, OID.hrStorageDescr);
      const units = await walkMap(session, OID.hrStorageAllocUnits);
      const sizes = await walkMap(session, OID.hrStorageSize);
      const useds = await walkMap(session, OID.hrStorageUsed);

      for (const [idx, typeOid] of types) {
        const t = typeOid?.toString() ?? "";
        const unit = toNum(units.get(idx)) || 1;
        const total = (toNum(sizes.get(idx)) || 0) * unit;
        const used = (toNum(useds.get(idx)) || 0) * unit;
        const descr = descrs.get(idx)?.toString() ?? `#${idx}`;
        if (t === OID.hrStorageRam) {
          result.mem_total = total;
          result.mem_used = used;
        } else if (t === OID.hrStorageFixedDisk && total > 0) {
          result.storage.push({ idx, descr, used, total });
        }
      }
    }

    // Interfaces
    const names = await walkMap(session, OID.ifName);
    const oper = await walkMap(session, OID.ifOperStatus);
    const inOct = await walkMap(session, OID.ifHCInOctets);
    const outOct = await walkMap(session, OID.ifHCOutOctets);
    const hiSpeed = await walkMap(session, OID.ifHighSpeed);
    const idxSet = new Set([...oper.keys()]);
    for (const ifIndex of idxSet) {
      result.ifaces.push({
        if_index: ifIndex,
        if_name: names.get(ifIndex)?.toString() ?? `if${ifIndex}`,
        oper_status: toNum(oper.get(ifIndex)),
        speed_bps: (toNum(hiSpeed.get(ifIndex)) || 0) * 1_000_000,
        in_octets: toNum(inOct.get(ifIndex)),
        out_octets: toNum(outOct.get(ifIndex)),
      });
    }

    // Cisco CPU / memory fallback
    if (result.cpu == null) {
      const c = await walk(session, OID.cpmCPUTotal5min);
      const vals = c.map((r) => toNum(r.value)).filter((n) => n != null);
      if (vals.length) result.cpu = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    if (result.mem_total == null) {
      const used = await walk(session, OID.ciscoMemPoolUsed);
      const free = await walk(session, OID.ciscoMemPoolFree);
      const u = used.reduce((a, r) => a + (toNum(r.value) || 0), 0);
      const f = free.reduce((a, r) => a + (toNum(r.value) || 0), 0);
      if (u + f > 0) {
        result.mem_used = u;
        result.mem_total = u + f;
      }
    }
  } catch {
    // leave partial result
  } finally {
    session.close();
  }

  return result;
}

export async function testDevice(device) {
  const session = makeSession(device);
  try {
    const sys = await get(session, [OID.sysName, OID.sysDescr, OID.sysUpTime]);
    session.close();
    if (!sys || sys[OID.sysUpTime] == null) return { ok: false, error: "No SNMP response" };
    return {
      ok: true,
      sysName: sys[OID.sysName]?.toString() ?? null,
      sysDescr: sys[OID.sysDescr]?.toString() ?? null,
    };
  } catch (e) {
    try { session.close(); } catch {}
    return { ok: false, error: String(e?.message || e) };
  }
}
