# نظام الصوت - إشعارات الرسائل 🔊

## الوصف
تم إضافة نظام إشعار صوتي يشبه واتساب للتطبيق. عند استقبال رسالة جديدة، يتم تشغيل صوت إشعار لطيف ثنائي النغمات.

## المميزات ✨

### 1. صوت إشعار مدمج (Synthesized Sound)
- يتم إنشاء الصوت ديناميكياً باستخدام **Web Audio API**
- لا يتطلب ملفات صوتية خارجية
- **خفيف الوزن** وسريع التحميل
- توليفة موسيقية بسيطة:
  - **النغمة الأولى**: 880 Hz (A5) لمدة 120ms
  - **النغمة الثانية**: 1046 Hz (C6) لمدة 150ms

### 2. تحكم المستخدم
يمكن تفعيل/تعطيل الأصوات عبر:
```javascript
import { setSoundsEnabled, getSoundsEnabled } from './utils/messageSound';

// تفعيل الأصوات
setSoundsEnabled(true);

// تعطيل الأصوات
setSoundsEnabled(false);

// التحقق من الحالة
const isEnabled = getSoundsEnabled();
```

## الملفات المعدلة 📝

### 1. `src/utils/messageSound.ts` (جديد)
ملف الأداة يحتوي على جميع وظائف الصوت:
- `playMessageNotificationSound()` - تشغيل صوت الإشعار
- `playMessageSoundFromFile()` - تشغيل من ملف خارجي (اختياري)
- `setSoundsEnabled()` - تفعيل/تعطيل
- `getSoundsEnabled()` - الحصول على الحالة
- `playNotificationSoundIfEnabled()` - تشغيل مشروط

### 2. `src/App.tsx` (معدل)
تم إضافة:
- استيراد دالة `playMessageNotificationSound`
- استدعاء الدالة عند استقبال رسالة جديدة (السطر ~824)

## الاستخدام 🎵

### التشغيل الأساسي
الصوت يتشغل تلقائياً عند استقبال رسالة جديدة دون أي تكوين إضافي.

### مع التحكم المشروط
```typescript
import { playNotificationSoundIfEnabled } from './utils/messageSound';

// يتشغل فقط إذا كانت الأصوات مفعلة
await playNotificationSoundIfEnabled();
```

### إضافة خيار في الإعدادات
يمكنك إضافة toggle للأصوات في واجهة الإعدادات:
```jsx
const [soundsEnabled, setSoundsEnabled] = useState(getSoundsEnabled());

const handleToggleSound = () => {
  const newState = !soundsEnabled;
  setSoundsEnabled(newState);
  setSoundsEnabled(newState);
};

// في JSX:
<label>
  <input 
    type="checkbox" 
    checked={soundsEnabled} 
    onChange={handleToggleSound}
  />
  تفعيل أصوات الإشعارات
</label>
```

## الخصائص التقنية 🔧

### تنسيق الصوت
- **نوع الموجة**: Sine (موجة جيبية ناعمة)
- **مستوى الصوت**: 0.5 (50%)
- **المدة الكلية**: ~300ms
- **متوافق**: جميع المتصفحات الحديثة

### التخزين المحلي
الإعدادات تُحفظ في `localStorage` تحت المفتاح: `ddy_sounds_enabled`

### معالجة الأخطاء
- الأخطاء تُسجل في console بدون التأثير على التطبيق
- يتعامل مع المتصفحات التي لا تدعم Web Audio API

## البدائل (اختيارية) 🔄

إذا أردت استخدام ملف صوتي حقيقي بدلاً من الصوت المولّد:

1. أضف ملف صوتي إلى `src/sound/message-notification.mp3`
2. استخدم الدالة البديلة:
```typescript
import { playMessageSoundFromFile } from './utils/messageSound';

// بدل playMessageNotificationSound() استخدم:
await playMessageSoundFromFile('/sound/message-notification.mp3');
```

## الترخيص والملكية 📜
- صوت مولّد بدون أي حقوق ملكية
- يمكن تخصيصه حسب الحاجة

---

**تم الإنشاء**: مايو 2026
**الإصدار**: 1.0
