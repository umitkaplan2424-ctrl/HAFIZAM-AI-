import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Lazy/Safe Groq AI API Key helper
function getGroqApiKey(): string | null {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GROQ_API_KEY' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return apiKey;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'HAFIZAM AI', timestamp: new Date().toISOString() });
});

// Helper to get Turkey local date/time parts (Europe/Istanbul UTC+3)
function getTurkeyParts(dateObj: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(dateObj);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
  };
}

// Helper to create an ISO string representing a specific date and time in Turkey (Europe/Istanbul UTC+3)
function createTurkeyIsoString(year: number, month: number, day: number, hour: number, minute: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const isoStrWithOffset = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+03:00`;
  return new Date(isoStrWithOffset).toISOString();
}

// Parse time from Turkish text
function parseTimeFromTurkishText(userText: string, defaultHour = 9, defaultMin = 0): { hours: number; mins: number; hasTime: boolean } {
  const text = userText.toLowerCase();

  // Context indicators
  const isMorningOrNight = /\b(sabah|gece|sabahleyin|geceleyin|sabaha karşı)\b/i.test(text);
  const isAfternoonOrEvening = /\b(öğleden sonra|ogleden sonra|akşam|aksam|akşamüstü|aksamustu|öğlen|oglen|ikindi)\b/i.test(text);

  let rawHour: number | null = null;
  let mins = 0;
  let hasTime = false;
  let isExplicit24HourAM = false;

  // 1. Check HH:MM pattern (e.g. 14:30, 09.00, 03:00, 3:00, 15.00)
  const timeMatchWithMin = text.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatchWithMin) {
    const hourStr = timeMatchWithMin[1];
    let h = parseInt(hourStr, 10);
    let m = parseInt(timeMatchWithMin[2], 10);

    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      rawHour = h;
      mins = m;
      hasTime = true;
      // Explicit 24-hour leading zero format (e.g., "03:00", "09:30", "01.00")
      if (hourStr.length === 2 && hourStr.startsWith('0')) {
        isExplicit24HourAM = true;
      }
    }
  }

  // 2. Check "saat X" or "X'da" / "X'de" / "X'te" / "X'ta" if HH:MM was not matched
  if (rawHour === null) {
    const timeMatchHourOnly = text.match(/saat\s*(\d{1,2})/);
    const timeMatchSuffixed = text.match(/(\d{1,2})['’\s]*(da|de|ta|te|’da|’de|’ta|’te)/);

    if (timeMatchHourOnly) {
      let h = parseInt(timeMatchHourOnly[1], 10);
      if (h >= 0 && h <= 23) {
        rawHour = h;
        mins = 0;
        hasTime = true;
      }
    } else if (timeMatchSuffixed) {
      let h = parseInt(timeMatchSuffixed[1], 10);
      if (h >= 0 && h <= 23) {
        rawHour = h;
        mins = 0;
        hasTime = true;
      }
    }
  }

  // 3. Turkish word numbers (e.g. saat üçte, dörtte, birde)
  if (rawHour === null) {
    const trWordNumbers: Record<string, number> = {
      'bir': 1, 'iki': 2, 'üç': 3, 'uc': 3, 'dört': 4, 'dort': 4,
      'beş': 5, 'bes': 5, 'altı': 6, 'alti': 6, 'yedi': 7, 'sekiz': 8,
      'dokuz': 9, 'on': 10, 'on bir': 11, 'on iki': 12, 'on üç': 13,
      'on dört': 14, 'on beş': 15, 'on altı': 16, 'on yedi': 17,
      'on sekiz': 18, 'on dokuz': 19, 'yirmi': 20, 'yirmi bir': 21,
      'yirmi iki': 22, 'yirmi üç': 23
    };

    for (const [word, val] of Object.entries(trWordNumbers)) {
      const wordRegex = new RegExp(`(saat\\s+${word}|${word}['’\\s]*(da|de|ta|te|’da|’de|’ta|’te))`, 'i');
      if (wordRegex.test(text)) {
        rawHour = val;
        mins = 0;
        hasTime = true;
        break;
      }
    }
  }

  if (rawHour === null || !hasTime) {
    return { hours: defaultHour, mins: defaultMin, hasTime: false };
  }

  let finalHour = rawHour;

  // Apply AM/PM logic for Turkish natural speech
  if (finalHour >= 13) {
    // Already in 24-hour PM format (e.g. 15:00) -> keep as 15
    return { hours: finalHour, mins, hasTime: true };
  }

  if (finalHour === 12) {
    if (isMorningOrNight && (text.includes('gece') || text.includes('gece yarısı'))) {
      finalHour = 0; // Midnight 00:00
    } else {
      finalHour = 12; // Noon 12:00
    }
    return { hours: finalHour, mins, hasTime: true };
  }

  // Hours 1 to 11
  if (isMorningOrNight || isExplicit24HourAM) {
    // Explicit morning/night indicator or explicit "03:00" -> keep AM (03:00)
    finalHour = rawHour;
  } else if (isAfternoonOrEvening) {
    // Explicit afternoon/evening indicator -> 15:00
    finalHour = rawHour + 12;
  } else {
    // AM/PM NOT specified:
    // Single-digit hours 1 <= rawHour <= 7 default to afternoon/evening in Turkish daily speech
    // e.g. "saat 3'te", "3'te", "saat üçte" -> 15:00
    if (rawHour >= 1 && rawHour <= 7) {
      finalHour = rawHour + 12;
    } else {
      // 8, 9, 10, 11 default to morning (08:00, 09:00, 10:00, 11:00)
      finalHour = rawHour;
    }
  }

  return { hours: finalHour, mins, hasTime: true };
}

// Fast rule-based reminder parser
function parseReminderFast(promptText: string, nowIso?: string) {
  const userText = (promptText || '').toLowerCase();
  const currentDateObj = nowIso ? new Date(nowIso) : new Date();
  const trParts = getTurkeyParts(currentDateObj);

  const timeRes = parseTimeFromTurkishText(userText, 9, 0);
  const hours = timeRes.hours;
  const mins = timeRes.mins;

  // Midnight today in Turkey
  const trToday = new Date(createTurkeyIsoString(trParts.year, trParts.month, trParts.day, 0, 0));
  const currentDayOfWeek = trToday.getDay(); // 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi

  // 1. Check specific date e.g. "15 ağustos", "15.08"
  const trMonths: Record<string, number> = {
    'ocak': 1, 'şubat': 2, 'subat': 2, 'mart': 3, 'nisan': 4,
    'mayıs': 5, 'mayis': 5, 'haziran': 6, 'temmuz': 7,
    'ağustos': 8, 'agustos': 8, 'eylül': 9, 'eylul': 9,
    'ekim': 10, 'kasım': 11, 'kasim': 11, 'aralık': 12, 'aralik': 12
  };

  let specificDay: number | null = null;
  let specificMonth: number | null = null;

  const monthNameMatch = userText.match(/(\d{1,2})\s*(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)/);
  if (monthNameMatch) {
    specificDay = parseInt(monthNameMatch[1], 10);
    specificMonth = trMonths[monthNameMatch[2]] || null;
  } else {
    const numericDateMatch = userText.match(/(\d{1,2})[.\/](\d{1,2})([.\/](\d{4}))?/);
    if (numericDateMatch && !numericDateMatch[0].includes(':')) {
      specificDay = parseInt(numericDateMatch[1], 10);
      specificMonth = parseInt(numericDateMatch[2], 10);
    }
  }

  // 2. Check weekday names
  let targetDayNum = -1;

  if (userText.includes('cumartesi')) { targetDayNum = 6; }
  else if (userText.includes('pazartesi')) { targetDayNum = 1; }
  else if (userText.includes('çarşamba') || userText.includes('carsamba')) { targetDayNum = 3; }
  else if (userText.includes('perşembe') || userText.includes('persembe')) { targetDayNum = 4; }
  else if (userText.includes('cuma')) { targetDayNum = 5; }
  else if (userText.includes('salı') || userText.includes('sali')) { targetDayNum = 2; }
  else if (userText.includes('pazar')) { targetDayNum = 0; }

  let daysToAdd = 0;

  if (specificDay !== null && specificMonth !== null) {
    let year = trParts.year;
    if (specificMonth < trParts.month || (specificMonth === trParts.month && specificDay < trParts.day)) {
      year += 1;
    }
    const targetDate = new Date(createTurkeyIsoString(year, specificMonth, specificDay, 0, 0));
    const diffTime = targetDate.getTime() - trToday.getTime();
    daysToAdd = Math.round(diffTime / (1000 * 3600 * 24));
  } else if (targetDayNum !== -1) {
    // Weekday specified by user (e.g., Cuma, Pazartesi)
    daysToAdd = (targetDayNum - currentDayOfWeek + 7) % 7;

    const currentTrMinutes = trParts.hour * 60 + trParts.minute;
    const targetTrMinutes = hours * 60 + mins;

    if (daysToAdd === 0) {
      if (targetTrMinutes <= currentTrMinutes || userText.includes('gelecek') || userText.includes('haftaya') || userText.includes('önümüzdeki')) {
        daysToAdd = 7;
      }
    } else {
      if (userText.includes('gelecek') || userText.includes('haftaya') || userText.includes('önümüzdeki')) {
        daysToAdd += 7;
      }
    }
  } else if (userText.includes('yarın')) {
    daysToAdd = 1;
  } else if (userText.includes('bugün')) {
    daysToAdd = 0;
  } else {
    // No explicit day/date given
    const currentTrMinutes = trParts.hour * 60 + trParts.minute;
    const targetTrMinutes = hours * 60 + mins;
    if (targetTrMinutes <= currentTrMinutes) {
      daysToAdd = 1;
    } else {
      daysToAdd = 0;
    }
  }

  trToday.setDate(trToday.getDate() + daysToAdd);

  const finalTrParts = getTurkeyParts(trToday);
  const dateTimeIso = createTurkeyIsoString(finalTrParts.year, finalTrParts.month, finalTrParts.day, hours, mins);

  // Format date display label in Turkish
  const trMonthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylul', 'Ekim', 'Kasım', 'Aralık'
  ];
  const trDayNames = [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
  ];

  let dateDisplay = '';
  if (daysToAdd === 0) {
    dateDisplay = 'Bugün';
  } else if (daysToAdd === 1) {
    dateDisplay = 'Yarın';
  } else {
    const mName = trMonthNames[finalTrParts.month - 1] || '';
    const dName = trDayNames[trToday.getDay()] || '';
    dateDisplay = `${finalTrParts.day} ${mName} ${dName}`;
  }

  let cleanTitle = promptText
    .replace(/\b(\d{1,2}[:.]\d{2}|\d{1,2})['’\s]*(da|de|ta|te)?\b/gi, '')
    .replace(/(bana|hatırlat|uyandır|alarm|kur|bugün|yarın|saat|lütfen|her gün|her sabah|her akşam|günlük|haftalık|aylık|beni|bir|kaydet|ekle|'da|'de|'ta|'te|günü|pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar|gelecek|haftaya|önümüzdeki|öğleden sonra|ogleden sonra|akşamüstü|aksamustu|öğlen|oglen|sabah|gece)/gi, '')
    .replace(/\s+(da|de|ta|te)\b/gi, '')
    .replace(/\b(da|de|ta|te)\s+/gi, '')
    .trim();

  cleanTitle = cleanTitle.replace(/^['".,\s]+|['".,\s]+$/g, '');
  if (!cleanTitle || cleanTitle.length < 2) {
    cleanTitle = 'Hatırlatma';
  } else {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }

  let repeatFrequency: 'none' | 'daily' | 'weekly' | 'monthly' = 'none';
  if (userText.includes('her gün') || userText.includes('her sabah') || userText.includes('günlük') || userText.includes('her akşam')) {
    repeatFrequency = 'daily';
  } else if (userText.includes('her hafta') || userText.includes('haftalık') || userText.includes('her pazartesi') || userText.includes('her salı') || userText.includes('her çarşamba') || userText.includes('her perşembe') || userText.includes('her cuma') || userText.includes('her cumartesi') || userText.includes('her pazar')) {
    repeatFrequency = 'weekly';
  } else if (userText.includes('her ay') || userText.includes('aylık')) {
    repeatFrequency = 'monthly';
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const timeDisplay = `${pad(hours)}:${pad(mins)}`;

  const responseText = `🔔 Hatırlatma oluşturuldu — ${dateDisplay} ${timeDisplay}\n📌 ${cleanTitle}`;
  const speechText = `${dateDisplay} saat ${timeDisplay}'de ${cleanTitle} hatırlatılacak.`;

  return {
    intent: 'remind',
    responseText,
    speechText,
    memoryToSave: null,
    reminderToSave: {
      title: cleanTitle,
      dateTime: dateTimeIso,
      repeatFrequency,
    },
  };
}

// Parse snooze / delay commands for Turkish text
function parseSnoozeFast(promptText: string): { isSnooze: boolean; snoozeMinutes: number } {
  const userText = (promptText || '').toLowerCase().trim();

  const isSnoozeKeyword =
    userText.includes('ertele') ||
    userText.includes('tekrar hatırlat') ||
    userText.includes('tekrar hatırla') ||
    userText.includes('sonra tekrar') ||
    userText.includes('daha sonra') ||
    userText.includes('sonra hatırlat');

  if (!isSnoozeKeyword) {
    return { isSnooze: false, snoozeMinutes: 0 };
  }

  let minutes = 30; // default 30 min

  if (userText.includes('yarım saat')) {
    minutes = 30;
  } else if (userText.includes('yarın')) {
    minutes = 1440; // 24 hours
  } else if (userText.includes('bir saat') || userText.includes('1 saat') || userText.includes('bi saat')) {
    minutes = 60;
  } else {
    // Check "X saat"
    const hourMatch = userText.match(/(\d+)\s*saat/);
    if (hourMatch) {
      minutes = parseInt(hourMatch[1], 10) * 60;
    } else {
      // Check "X dakika" or "X dk"
      const minMatch = userText.match(/(\d+)\s*(dakika|dk)/);
      if (minMatch) {
        minutes = parseInt(minMatch[1], 10);
      } else {
        // Check "X gün"
        const dayMatch = userText.match(/(\d+)\s*gün/);
        if (dayMatch) {
          minutes = parseInt(dayMatch[1], 10) * 1440;
        } else {
          // Word numbers
          if (userText.includes('on dakika')) minutes = 10;
          else if (userText.includes('beş dakika')) minutes = 5;
          else if (userText.includes('on beş dakika')) minutes = 15;
          else if (userText.includes('yirmi dakika')) minutes = 20;
          else if (userText.includes('otuz dakika')) minutes = 30;
          else if (userText.includes('kırk beş dakika')) minutes = 45;
          else if (userText.includes('iki saat')) minutes = 120;
          else if (userText.includes('üç saat')) minutes = 180;
          else if (userText.includes('iki gün')) minutes = 2880;
        }
      }
    }
  }

  if (isNaN(minutes) || minutes <= 0) minutes = 30;

  return { isSnooze: true, snoozeMinutes: minutes };
}

// AI Processing API Route
app.post('/api/ai/process', async (req, res) => {
  const promptStr = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
  const imageBase64 = req.body?.imageBase64;
  const mimeType = req.body?.mimeType;
  const currentMemories = req.body?.currentMemories || [];
  const currentReminders = req.body?.currentReminders || [];
  const currentDateTimeIso = req.body?.currentDateTimeIso;

  try {
    const prompt = promptStr;
    const nowIso = currentDateTimeIso || new Date().toISOString();
    const currentDateObj = new Date(nowIso);

    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: 'Lütfen bir metin veya görsel gönderin.' });
    }

    const userText = prompt.toLowerCase();

    // FAST-PATH: Snooze / Repeat Reminder Intent
    const snoozeCheck = parseSnoozeFast(prompt);
    if (snoozeCheck.isSnooze && !imageBase64) {
      const snoozeMins = snoozeCheck.snoozeMinutes;
      const durationStr =
        snoozeMins >= 1440
          ? `${Math.round(snoozeMins / 1440)} gün`
          : snoozeMins >= 60
          ? `${Math.round(snoozeMins / 60)} saat`
          : `${snoozeMins} dakika`;

      console.log('[Fast Snooze Parser]: Instant execution for:', prompt, 'minutes:', snoozeMins);
      return res.json({
        intent: 'snooze_reminder',
        snoozeMinutes: snoozeMins,
        responseText: `⏰ Hatırlatıcı ${durationStr} ertelendi.`,
        speechText: `Tamam, hatırlatıcıyı ${durationStr} erteledim.`,
        memoryToSave: null,
        reminderToSave: {
          title: `__SNOOZE_${snoozeMins}__`,
          dateTime: String(snoozeMins),
          repeatFrequency: 'none',
        },
      });
    }

    const isExplicitReminder =
      userText.includes('hatırlat') ||
      userText.includes('uyandır') ||
      userText.includes('alarm') ||
      userText.includes('beni ara') ||
      userText.includes('hatırlatma');

    // FAST-PATH: If user clearly asks for a reminder/alarm, handle instantly without waiting for Gemini API delay
    if (isExplicitReminder && !imageBase64) {
      const fastResult = parseReminderFast(prompt, nowIso);
      console.log('[Fast Reminder Parser]: Instant execution for:', prompt);
      return res.json(fastResult);
    }

    const groqApiKey = getGroqApiKey();

    // Fallback if API key is not configured or offline
    if (!groqApiKey) {
      console.warn('Groq API key missing (GROQ_API_KEY), generating mock intelligent offline response.');
      if (isExplicitReminder) {
        return res.json(parseReminderFast(prompt, nowIso));
      }
      let intent: 'remember' | 'remind' | 'answer' | 'search' | 'ocr' = 'answer';
      let responseText = 'Anlaşıldı! Sizi dinliyorum.';
      let speechText = responseText;
      let memoryToSave = null;
      let reminderToSave = null;

      if (
        userText.includes('hakkımda ne biliyorsun') ||
        userText.includes('benim hakkımda') ||
        userText.includes('ne biliyorsun') ||
        userText.includes('hakkımda ne biliyosun')
      ) {
        intent = 'search';
        if (currentMemories.length === 0) {
          responseText = 'Şu anda senin hakkında kayıtlı bir bilgim yok.';
          speechText = 'Şu anda senin hakkında kayıtlı bir bilgim yok.';
        } else {
          const listStr = currentMemories
            .map((m: any, idx: number) => `${idx + 1}. ${m.title}: ${m.content}`)
            .join('\n');
          responseText = `Şu anda hafızamda senin hakkında kayıtlı olan bilgiler:\n\n${listStr}`;
          speechText = `Şu anda hafızamda senin hakkında kayıtlı ${currentMemories.length} bilgi bulunuyor.`;
        }
      } else if (userText.includes('hatırla') || userText.includes('kaydet') || userText.includes('hafıza')) {
        intent = 'remember';
        const cleanContent = prompt?.replace(/(hatırla|kaydet|hafızama ekle|lütfen)/gi, '').trim() || 'Kaydedilen Bilgi';
        memoryToSave = {
          title: cleanContent.slice(0, 35) || 'Yeni Not',
          content: cleanContent || 'Fotoğraf veya Ses Kaydı',
          category: 'Not' as const,
          tags: ['kişisel'],
        };
        responseText = `🧠 "${memoryToSave.title}" bilginiz Hafızam'a kaydedildi.`;
        speechText = `${memoryToSave.title} hafızaya kaydedildi.`;
      } else if (imageBase64) {
        intent = 'ocr';
        responseText = '📷 Görsel analiz edildi: Nesne veya belge tespit edildi. Bu bilgiyi hafızanıza kaydetmek ister misiniz?';
        speechText = 'Görsel analiz edildi.';
      } else if (userText.includes('bul') || userText.includes('neydi') || userText.includes('ara')) {
        intent = 'search';
        const query = userText.replace(/(bul|neydi|ara|geçen|kaydettiğim)/gi, '').trim();
        const found = currentMemories.find((m: any) =>
          m.title.toLowerCase().includes(query) || m.content.toLowerCase().includes(query)
        );
        if (found) {
          responseText = `🔍 Hafızamda buldum:\n📌 ${found.title}: ${found.content}`;
          speechText = `Hafızanızda ${found.title} bulundu: ${found.content}`;
        } else {
          responseText = `🔍 Hafızamda "${query}" ile eşleşen bir kayıt bulunamadı.`;
          speechText = 'Aradığınız bilgi hafızada bulunamadı.';
        }
      }

      return res.json({
        intent,
        responseText,
        speechText,
        memoryToSave,
        reminderToSave,
      });
    }

    // Call Groq API server-side with strict system instructions and JSON format
    const systemInstruction = `
Sen "HAFIZAM AI" adında, Android akıllı telefonlarda çalışan kişisel bir Türkçe yapay zekâ asistanısın.
Şu anki gerçek tarih ve saat (ISO): ${nowIso} (Yerel Tarih: ${currentDateObj.toLocaleString('tr-TR')})

Mevcut Kullanıcı Hafızası (${currentMemories.length} adet):
${JSON.stringify(currentMemories.map((m: any) => ({ id: m.id, title: m.title, content: m.content, category: m.category, tags: m.tags, createdAt: m.createdAt })))}

KRİTİK GİZLİLİK VE SIFIR TAHMİN KURALLARI (ÇOK ÖNEMLİ!):
1. Kullanıcının adı, yaşı, mesleği, konumu, adresi, ailesi, geçmişi, hobileri, karakteri veya başka herhangi bir kişisel özelliği hakkında KESİNLİKLE TAHMİN YAPMA VE BİLGİ UYDURMA!
2. Kullanıcı hakkında YALNIZCA şu 3 kaynaktaki doğrulanmış bilgileri kullanabilirsin:
   A) Kullanıcının o anki mesajında açıkça söylediği bilgiler.
   B) Kullanıcının açıkça "hatırla", "kaydet", "bunu unutma" gibi bir komutla kaydettiği bilgiler.
   C) Yukarıdaki 'Mevcut Kullanıcı Hafızası' listesinde yer alan gerçek kayıtlar.
3. Kullanıcı "Benim hakkımda ne biliyorsun?" veya "Hakkımda ne biliyorsun?" veya "Ne biliyorsun?" diye sorduğunda:
   - Eğer Mevcut Kullanıcı Hafızası boşsa (0 kayıt):
     Ekrana ve sese KESİNLİKLE şu cevabı ver: "Şu anda senin hakkında kayıtlı bir bilgim yok."
   - Eğer Mevcut Kullanıcı Hafızasında kayıtlar varsa:
     ResponseText cevabına şu başlıkla başla: "Şu anda hafızamda senin hakkında kayıtlı olan bilgiler:"
     ve ardından YALNIZCA listedeki gerçek kayıtları maddeler halinde yaz. Genel varsayımlarla veya tahminlerle sakın doldurma.
4. Bir bilgi hakkında emin değilsen veya hafızada yoksa doğrudan "Bunu bilmiyorum." de.

KATEGORİLER VE BİLDİRİM MANTIKLARI:

1. "remind" (GERÇEK HATIRLATMA VEYA ALARM BİLDİRİMİ):
   - Kullanıcı "bana ... hatırlat", "yarın ... uyandır", "her gün saat ...'de ilacımı hatırlat" dediğinde ÇALIŞIR.
   - TEKRAR SIKLIĞI (repeatFrequency):
     * "her gün", "her sabah", "her akşam", "günlük" -> repeatFrequency: "daily"
     * "her pazartesi", "her salı", "her çarşamba", "her perşembe", "her cuma", "her cumartesi", "her pazar", "her hafta", "haftalık" -> repeatFrequency: "weekly"
     * "her ayın 1'inde", "her ay", "aylık" -> repeatFrequency: "monthly"
     * Kullanıcı tekrar sıklığı BELİRTMEDİYSE -> repeatFrequency: "none"
   - Cihaz alarmı / bildirimi için 'reminderToSave' doldur.
   - ResponseText formatı:
     "🔔 Hatırlatma oluşturuldu — [SAAT VEYA TARİH]\n📌 [Hatırlatma Başlığı]"

2. "remember":
   - SADECE 'memoryToSave' nesnesini doldur.
3. "search" / "answer":
   - 'memoryToSave' = null ve 'reminderToSave' = null.

ÇIKTI FORMATI:
SADECE ve SADECE aşağıdaki JSON formatında geçerli bir JSON objesi döndür. Başka hiçbir açıklama veya ek metin ekleme:
{
  "intent": "remember" | "remind" | "search" | "ocr" | "answer",
  "responseText": "Kullanıcıya gösterilecek Türkçe açıklama",
  "speechText": "Sesli okunacak yanıt",
  "memoryToSave": { "title": "...", "content": "...", "category": "Not", "tags": ["..."] } | null,
  "reminderToSave": { "title": "...", "dateTime": "ISO_STRING", "repeatFrequency": "none" | "daily" | "weekly" | "monthly" } | null,
  "matchedMemoryIds": []
}
`;

    const userMessages: any[] = [];
    if (imageBase64) {
      const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      userMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt || 'Lütfen bu görseli incele ve bilgi ver.' },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType || 'image/jpeg'};base64,${cleanData}`,
            },
          },
        ],
      });
    } else {
      userMessages.push({
        role: 'user',
        content: prompt || 'Merhaba',
      });
    }

    const groqRequestBody = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction },
        ...userMessages,
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groqRequestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!groqRes.ok) {
        const errorText = await groqRes.text().catch(() => '');
        console.error(`Groq API returned HTTP status ${groqRes.status}:`, errorText);
        throw new Error(`Groq API error (${groqRes.status}): ${errorText.slice(0, 150)}`);
      }

      const groqData: any = await groqRes.json();
      const rawContent = groqData.choices?.[0]?.message?.content || '{}';
      const cleanedContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

      let resultJson: any = {};
      try {
        resultJson = JSON.parse(cleanedContent);
      } catch (e) {
        console.error('Groq JSON parse error, raw content:', rawContent);
        resultJson = {
          intent: 'answer',
          responseText: rawContent || 'İşleminiz tamamlandı.',
          speechText: 'İşleminiz tamamlandı.',
        };
      }

      if (!resultJson.responseText) {
        resultJson.responseText = 'İşleminiz tamamlandı.';
      }
      if (!resultJson.speechText) {
        resultJson.speechText = resultJson.responseText;
      }
      if (!resultJson.intent) {
        resultJson.intent = 'answer';
      }

      // Guarantee reminder object format if intent is remind
      if (resultJson.intent === 'remind' || isExplicitReminder) {
        resultJson.intent = 'remind';
        const fastParsed = parseReminderFast(prompt, nowIso);
        const existingRem = resultJson.reminderToSave || {};

        let title = (existingRem.title || '').trim();
        if (!title || title.length < 2) {
          title = fastParsed.reminderToSave.title;
        }

        let dateTime = existingRem.dateTime;
        if (!dateTime || isNaN(new Date(dateTime).getTime())) {
          dateTime = fastParsed.reminderToSave.dateTime;
        }

        resultJson.reminderToSave = {
          title,
          dateTime,
          repeatFrequency: existingRem.repeatFrequency || fastParsed.reminderToSave.repeatFrequency,
        };
      }

      return res.json(resultJson);
    } catch (apiError: any) {
      clearTimeout(timeoutId);
      console.error('[Groq API Call Error / Fallback]:', apiError);

      if (promptStr && (promptStr.includes('hatırlat') || promptStr.includes('uyandır') || promptStr.includes('alarm'))) {
        return res.json(parseReminderFast(promptStr, currentDateTimeIso));
      }

      return res.status(500).json({
        error: 'Groq API işlemi sırasında hata oluştu: ' + (apiError.message || 'Bilinmeyen hata'),
        responseText: 'Üzgünüm, isteğinizi işlerken bir sorun oluştu. Lütfen tekrar deneyin.',
        speechText: 'Bir sorun oluştu. Lütfen tekrar deneyin.',
      });
    }
  } catch (outerErr: any) {
    console.error('Outer API Process Error:', outerErr);
    if (promptStr && (promptStr.includes('hatırlat') || promptStr.includes('uyandır') || promptStr.includes('alarm'))) {
      return res.json(parseReminderFast(promptStr, currentDateTimeIso));
    }
    return res.status(500).json({
      error: 'İşlem sırasında bir hata oluştu: ' + (outerErr.message || 'Bilinmeyen hata'),
      responseText: 'Üzgünüm, isteğinizi işlerken bir sorun oluştu. Lütfen tekrar deneyin.',
      speechText: 'Bir sorun oluştu. Lütfen tekrar deneyin.',
    });
  }
});

// Turkish TTS Audio API Endpoint (Free & Google Cloud Billing independent)
app.post('/api/tts/tr', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter required' });
    }

    // Clean text for natural speech synthesis
    let cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[🔔📌🧠💡⚙️]/g, '')
      .replace(/[*_#`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'Empty text after cleaning' });
    }

    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 500);
    }

    // Split into chunks <= 150 chars for Google Translate TTS API chunk limit
    const chunks: string[] = [];
    let remaining = cleanText;
    while (remaining.length > 0) {
      if (remaining.length <= 150) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = remaining.lastIndexOf('.', 150);
      if (splitIdx === -1) splitIdx = remaining.lastIndexOf(',', 150);
      if (splitIdx === -1) splitIdx = remaining.lastIndexOf(' ', 150);
      if (splitIdx === -1) splitIdx = 150;

      const chunk = remaining.substring(0, splitIdx + 1).trim();
      if (chunk) chunks.push(chunk);
      remaining = remaining.substring(splitIdx + 1).trim();
    }

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      if (!chunk) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tr&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`TTS upstream returned status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    const finalBuffer = Buffer.concat(audioBuffers);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(finalBuffer);
  } catch (err: any) {
    console.error('[TTS Endpoint Error]:', err);
    return res.status(500).json({ error: 'TTS audio generation failed: ' + (err.message || 'unknown error') });
  }
});

async function startServer() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HAFIZAM AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
