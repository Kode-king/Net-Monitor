// فحص سريع للوصول إلى جهاز عبر SNMP من سطر الأوامر — قبل إضافته في اللوحة.
//   node scripts/snmp-check.mjs <host> [community] [version] [port]
//   node scripts/snmp-check.mjs 10.157.1.10 public 2c 161
const [host, community = "public", version = "2c", port = "161"] = process.argv.slice(2);

if (!host) {
  console.error("الاستخدام: node scripts/snmp-check.mjs <host> [community] [version=2c|1] [port=161]");
  process.exit(1);
}

const { testDevice } = await import("../lib/snmp.js");

console.log(`فحص ${host}:${port}  community="${community}"  v${version} ...`);
const r = await testDevice({
  host,
  snmp_community: community,
  snmp_version: version === "1" ? "1" : "2c",
  snmp_port: Number(port),
});

if (r.ok) {
  console.log("✅ نجح");
  console.log("  sysName :", r.sysName);
  console.log("  sysDescr:", r.sysDescr);
  process.exit(0);
} else {
  console.log("❌ فشل:", r.error);
  console.log("  تحقق: التوجيه/الجدار الناري إلى VLAN الهدف على UDP/161، صحة community string، وتفعيل SNMP على الجهاز.");
  process.exit(2);
}
