# net-monitor — مراقبة السيرفرات والسويتشات والراوترات عبر SNMP

لوحة مراقبة مبنية على **Next.js (JavaScript) + Tailwind** تجمع مقاييس الأداء (CPU / RAM / التخزين / حركة الشبكة / مدة التشغيل) من أجهزتك عبر **SNMP v1 / v2c / v3**، وتخزّنها في قاعدة بيانات SQLite محلية، وتعرضها في رسوم بيانية زمنية مع نظام تنبيهات وصلاحيات مستخدمين.

## المتطلبات
- Node.js 18+ (مثبت لديك: v24)
- أجهزة تدعم SNMP ومفعّل عليها (community string + UDP/161 مفتوح تجاه السيرفر)

## التشغيل محليًا

```bash
cd net-monitor
npm install
npm run dev
```

- افتح: http://localhost:4000
- الحساب الافتراضي: **admin / admin** — غيّر كلمة المرور من صفحة الإعدادات فورًا.

المتغيّر `RUN_POLLER_IN_APP=1` في `.env.local` يشغّل خدمة الاستعلام (poller) داخل تطبيق Next أثناء التطوير.

## التشغيل في الإنتاج

```bash
npm run build
npm run start                 # الواجهة على المنفذ 4000
# في عملية منفصلة (وأزل RUN_POLLER_IN_APP من البيئة):
npm run poller                # خدمة استعلام SNMP المستمرة
```

يفضّل تشغيل `poller` كخدمة مستقلة (systemd / PM2 / Windows Service) لأنها تحتاج للعمل باستمرار.

## الإعداد
1. سجّل الدخول ثم **الأجهزة ← إضافة جهاز**.
2. أدخل الاسم، العنوان/IP، النوع (سيرفر/سويتش/راوتر)، وإصدار SNMP:
   - **v1 / v2c**: community string.
   - **v3**: اسم المستخدم (Security Name)، مستوى الأمان (noAuthNoPriv / authNoPriv / authPriv)،
     بروتوكول ومفتاح المصادقة (MD5/SHA/SHA-2)، وبروتوكول ومفتاح التشفير (DES/AES) عند authPriv،
     و Context اختياريًا.
3. اضغط **اختبار SNMP** للتأكد من الوصول قبل الحفظ.
4. عدّل قواعد التنبيه من **الإعدادات** (توجد قواعد افتراضية: توقف الجهاز، CPU>90%، RAM>90%، التخزين>90%).

## المقاييس المدعومة (OIDs)
- النظام: `sysName`, `sysDescr`, `sysUpTime`
- المعالج: `HOST-RESOURCES hrProcessorLoad` ثم fallback إلى Cisco `cpmCPUTotal5min`
- الذاكرة/التخزين: `hrStorageTable` (RAM + Fixed Disks) ثم fallback إلى Cisco memory pool
- الشبكة: `ifName / ifOperStatus / ifHCInOctets / ifHCOutOctets / ifHighSpeed` (تُحسب السرعة bps بين كل استعلامين)

## البنية
```
app/                واجهة Next (App Router)
  (dash)/           الصفحات المحمية: الرئيسية، الأجهزة، التنبيهات، الإعدادات
  api/              مسارات REST
lib/
  db.js             اتصال SQLite + المخطط
  snmp.js           جلب المقاييس عبر net-snmp
  poller.js         حلقة الاستعلام + تقييم التنبيهات + تنظيف البيانات
  auth.js           جلسات JWT عبر cookie + bcrypt
  queries.js        استعلامات القراءة للـ API
scripts/
  standalone-poller.mjs
data/net-monitor.db  قاعدة البيانات (تُنشأ تلقائيًا)
```

## ملاحظات أمنية
- غيّر `AUTH_SECRET` في `.env.local` إلى سلسلة عشوائية طويلة.
- community strings ومفاتيح SNMPv3 (auth/priv) تُخزَّن كنص عادي في قاعدة البيانات المحلية — احمِ ملف `data/net-monitor.db`.
- يُفضَّل SNMPv3 بمستوى **authPriv** للسويتشات والراوترات؛ استخدم v1/v2c داخل شبكة موثوقة فقط.
