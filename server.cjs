var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
function getGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GROQ_API_KEY" || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return apiKey;
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "HAFIZAM AI", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
function getTurkeyParts(dateObj = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(dateObj);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10)
  };
}
function createTurkeyIsoString(year, month, day, hour, minute) {
  const pad = (n) => String(n).padStart(2, "0");
  const isoStrWithOffset = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+03:00`;
  return new Date(isoStrWithOffset).toISOString();
}
function parseTimeFromTurkishText(userText, defaultHour = 9, defaultMin = 0) {
  const text = userText.toLowerCase();
  const isMorningOrNight = /\b(sabah|gece|sabahleyin|geceleyin|sabaha karşı)\b/i.test(text);
  const isAfternoonOrEvening = /\b(öğleden sonra|ogleden sonra|akşam|aksam|akşamüstü|aksamustu|öğlen|oglen|ikindi)\b/i.test(text);
  let rawHour = null;
  let mins = 0;
  let hasTime = false;
  let isExplicit24HourAM = false;
  const timeMatchWithMin = text.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatchWithMin) {
    const hourStr = timeMatchWithMin[1];
    let h = parseInt(hourStr, 10);
    let m = parseInt(timeMatchWithMin[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      rawHour = h;
      mins = m;
      hasTime = true;
      if (hourStr.length === 2 && hourStr.startsWith("0")) {
        isExplicit24HourAM = true;
      }
    }
  }
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
  if (rawHour === null) {
    const trWordNumbers = {
      "bir": 1,
      "iki": 2,
      "\xFC\xE7": 3,
      "uc": 3,
      "d\xF6rt": 4,
      "dort": 4,
      "be\u015F": 5,
      "bes": 5,
      "alt\u0131": 6,
      "alti": 6,
      "yedi": 7,
      "sekiz": 8,
      "dokuz": 9,
      "on": 10,
      "on bir": 11,
      "on iki": 12,
      "on \xFC\xE7": 13,
      "on d\xF6rt": 14,
      "on be\u015F": 15,
      "on alt\u0131": 16,
      "on yedi": 17,
      "on sekiz": 18,
      "on dokuz": 19,
      "yirmi": 20,
      "yirmi bir": 21,
      "yirmi iki": 22,
      "yirmi \xFC\xE7": 23
    };
    for (const [word, val] of Object.entries(trWordNumbers)) {
      const wordRegex = new RegExp(`(saat\\s+${word}|${word}['\u2019\\s]*(da|de|ta|te|\u2019da|\u2019de|\u2019ta|\u2019te))`, "i");
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
  if (finalHour >= 13) {
    return { hours: finalHour, mins, hasTime: true };
  }
  if (finalHour === 12) {
    if (isMorningOrNight && (text.includes("gece") || text.includes("gece yar\u0131s\u0131"))) {
      finalHour = 0;
    } else {
      finalHour = 12;
    }
    return { hours: finalHour, mins, hasTime: true };
  }
  if (isMorningOrNight || isExplicit24HourAM) {
    finalHour = rawHour;
  } else if (isAfternoonOrEvening) {
    finalHour = rawHour + 12;
  } else {
    if (rawHour >= 1 && rawHour <= 7) {
      finalHour = rawHour + 12;
    } else {
      finalHour = rawHour;
    }
  }
  return { hours: finalHour, mins, hasTime: true };
}
function parseReminderFast(promptText, nowIso) {
  const userText = (promptText || "").toLowerCase();
  const currentDateObj = nowIso ? new Date(nowIso) : /* @__PURE__ */ new Date();
  const trParts = getTurkeyParts(currentDateObj);
  const timeRes = parseTimeFromTurkishText(userText, 9, 0);
  const hours = timeRes.hours;
  const mins = timeRes.mins;
  const trToday = new Date(createTurkeyIsoString(trParts.year, trParts.month, trParts.day, 0, 0));
  const currentDayOfWeek = trToday.getDay();
  const trMonths = {
    "ocak": 1,
    "\u015Fubat": 2,
    "subat": 2,
    "mart": 3,
    "nisan": 4,
    "may\u0131s": 5,
    "mayis": 5,
    "haziran": 6,
    "temmuz": 7,
    "a\u011Fustos": 8,
    "agustos": 8,
    "eyl\xFCl": 9,
    "eylul": 9,
    "ekim": 10,
    "kas\u0131m": 11,
    "kasim": 11,
    "aral\u0131k": 12,
    "aralik": 12
  };
  let specificDay = null;
  let specificMonth = null;
  const monthNameMatch = userText.match(/(\d{1,2})\s*(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)/);
  if (monthNameMatch) {
    specificDay = parseInt(monthNameMatch[1], 10);
    specificMonth = trMonths[monthNameMatch[2]] || null;
  } else {
    const numericDateMatch = userText.match(/(\d{1,2})[.\/](\d{1,2})([.\/](\d{4}))?/);
    if (numericDateMatch && !numericDateMatch[0].includes(":")) {
      specificDay = parseInt(numericDateMatch[1], 10);
      specificMonth = parseInt(numericDateMatch[2], 10);
    }
  }
  let targetDayNum = -1;
  if (userText.includes("cumartesi")) {
    targetDayNum = 6;
  } else if (userText.includes("pazartesi")) {
    targetDayNum = 1;
  } else if (userText.includes("\xE7ar\u015Famba") || userText.includes("carsamba")) {
    targetDayNum = 3;
  } else if (userText.includes("per\u015Fembe") || userText.includes("persembe")) {
    targetDayNum = 4;
  } else if (userText.includes("cuma")) {
    targetDayNum = 5;
  } else if (userText.includes("sal\u0131") || userText.includes("sali")) {
    targetDayNum = 2;
  } else if (userText.includes("pazar")) {
    targetDayNum = 0;
  }
  let daysToAdd = 0;
  if (specificDay !== null && specificMonth !== null) {
    let year = trParts.year;
    if (specificMonth < trParts.month || specificMonth === trParts.month && specificDay < trParts.day) {
      year += 1;
    }
    const targetDate = new Date(createTurkeyIsoString(year, specificMonth, specificDay, 0, 0));
    const diffTime = targetDate.getTime() - trToday.getTime();
    daysToAdd = Math.round(diffTime / (1e3 * 3600 * 24));
  } else if (targetDayNum !== -1) {
    daysToAdd = (targetDayNum - currentDayOfWeek + 7) % 7;
    const currentTrMinutes = trParts.hour * 60 + trParts.minute;
    const targetTrMinutes = hours * 60 + mins;
    if (daysToAdd === 0) {
      if (targetTrMinutes <= currentTrMinutes || userText.includes("gelecek") || userText.includes("haftaya") || userText.includes("\xF6n\xFCm\xFCzdeki")) {
        daysToAdd = 7;
      }
    } else {
      if (userText.includes("gelecek") || userText.includes("haftaya") || userText.includes("\xF6n\xFCm\xFCzdeki")) {
        daysToAdd += 7;
      }
    }
  } else if (userText.includes("yar\u0131n")) {
    daysToAdd = 1;
  } else if (userText.includes("bug\xFCn")) {
    daysToAdd = 0;
  } else {
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
  const trMonthNames = [
    "Ocak",
    "\u015Eubat",
    "Mart",
    "Nisan",
    "May\u0131s",
    "Haziran",
    "Temmuz",
    "A\u011Fustos",
    "Eylul",
    "Ekim",
    "Kas\u0131m",
    "Aral\u0131k"
  ];
  const trDayNames = [
    "Pazar",
    "Pazartesi",
    "Sal\u0131",
    "\xC7ar\u015Famba",
    "Per\u015Fembe",
    "Cuma",
    "Cumartesi"
  ];
  let dateDisplay = "";
  if (daysToAdd === 0) {
    dateDisplay = "Bug\xFCn";
  } else if (daysToAdd === 1) {
    dateDisplay = "Yar\u0131n";
  } else {
    const mName = trMonthNames[finalTrParts.month - 1] || "";
    const dName = trDayNames[trToday.getDay()] || "";
    dateDisplay = `${finalTrParts.day} ${mName} ${dName}`;
  }
  let cleanTitle = promptText.replace(/\b(\d{1,2}[:.]\d{2}|\d{1,2})['’\s]*(da|de|ta|te)?\b/gi, "").replace(/(bana|hatırlat|uyandır|alarm|kur|bugün|yarın|saat|lütfen|her gün|her sabah|her akşam|günlük|haftalık|aylık|beni|bir|kaydet|ekle|'da|'de|'ta|'te|günü|pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar|gelecek|haftaya|önümüzdeki|öğleden sonra|ogleden sonra|akşamüstü|aksamustu|öğlen|oglen|sabah|gece)/gi, "").replace(/\s+(da|de|ta|te)\b/gi, "").replace(/\b(da|de|ta|te)\s+/gi, "").trim();
  cleanTitle = cleanTitle.replace(/^['".,\s]+|['".,\s]+$/g, "");
  if (!cleanTitle || cleanTitle.length < 2) {
    cleanTitle = "Hat\u0131rlatma";
  } else {
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }
  let repeatFrequency = "none";
  if (userText.includes("her g\xFCn") || userText.includes("her sabah") || userText.includes("g\xFCnl\xFCk") || userText.includes("her ak\u015Fam")) {
    repeatFrequency = "daily";
  } else if (userText.includes("her hafta") || userText.includes("haftal\u0131k") || userText.includes("her pazartesi") || userText.includes("her sal\u0131") || userText.includes("her \xE7ar\u015Famba") || userText.includes("her per\u015Fembe") || userText.includes("her cuma") || userText.includes("her cumartesi") || userText.includes("her pazar")) {
    repeatFrequency = "weekly";
  } else if (userText.includes("her ay") || userText.includes("ayl\u0131k")) {
    repeatFrequency = "monthly";
  }
  const pad = (n) => String(n).padStart(2, "0");
  const timeDisplay = `${pad(hours)}:${pad(mins)}`;
  const responseText = `\u{1F514} Hat\u0131rlatma olu\u015Fturuldu \u2014 ${dateDisplay} ${timeDisplay}
\u{1F4CC} ${cleanTitle}`;
  const speechText = `${dateDisplay} saat ${timeDisplay}'de ${cleanTitle} hat\u0131rlat\u0131lacak.`;
  return {
    intent: "remind",
    responseText,
    speechText,
    memoryToSave: null,
    reminderToSave: {
      title: cleanTitle,
      dateTime: dateTimeIso,
      repeatFrequency
    }
  };
}
function parseSnoozeFast(promptText) {
  const userText = (promptText || "").toLowerCase().trim();
  const isSnoozeKeyword = userText.includes("ertele") || userText.includes("tekrar hat\u0131rlat") || userText.includes("tekrar hat\u0131rla") || userText.includes("sonra tekrar") || userText.includes("daha sonra") || userText.includes("sonra hat\u0131rlat");
  if (!isSnoozeKeyword) {
    return { isSnooze: false, snoozeMinutes: 0 };
  }
  let minutes = 30;
  if (userText.includes("yar\u0131m saat")) {
    minutes = 30;
  } else if (userText.includes("yar\u0131n")) {
    minutes = 1440;
  } else if (userText.includes("bir saat") || userText.includes("1 saat") || userText.includes("bi saat")) {
    minutes = 60;
  } else {
    const hourMatch = userText.match(/(\d+)\s*saat/);
    if (hourMatch) {
      minutes = parseInt(hourMatch[1], 10) * 60;
    } else {
      const minMatch = userText.match(/(\d+)\s*(dakika|dk)/);
      if (minMatch) {
        minutes = parseInt(minMatch[1], 10);
      } else {
        const dayMatch = userText.match(/(\d+)\s*gün/);
        if (dayMatch) {
          minutes = parseInt(dayMatch[1], 10) * 1440;
        } else {
          if (userText.includes("on dakika")) minutes = 10;
          else if (userText.includes("be\u015F dakika")) minutes = 5;
          else if (userText.includes("on be\u015F dakika")) minutes = 15;
          else if (userText.includes("yirmi dakika")) minutes = 20;
          else if (userText.includes("otuz dakika")) minutes = 30;
          else if (userText.includes("k\u0131rk be\u015F dakika")) minutes = 45;
          else if (userText.includes("iki saat")) minutes = 120;
          else if (userText.includes("\xFC\xE7 saat")) minutes = 180;
          else if (userText.includes("iki g\xFCn")) minutes = 2880;
        }
      }
    }
  }
  if (isNaN(minutes) || minutes <= 0) minutes = 30;
  return { isSnooze: true, snoozeMinutes: minutes };
}
app.post("/api/ai/process", async (req, res) => {
  const promptStr = typeof req.body?.prompt === "string" ? req.body.prompt : "";
  const imageBase64 = req.body?.imageBase64;
  const mimeType = req.body?.mimeType;
  const currentMemories = req.body?.currentMemories || [];
  const currentReminders = req.body?.currentReminders || [];
  const currentDateTimeIso = req.body?.currentDateTimeIso;
  try {
    const prompt = promptStr;
    const nowIso = currentDateTimeIso || (/* @__PURE__ */ new Date()).toISOString();
    const currentDateObj = new Date(nowIso);
    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: "L\xFCtfen bir metin veya g\xF6rsel g\xF6nderin." });
    }
    const userText = prompt.toLowerCase();
    const snoozeCheck = parseSnoozeFast(prompt);
    if (snoozeCheck.isSnooze && !imageBase64) {
      const snoozeMins = snoozeCheck.snoozeMinutes;
      const durationStr = snoozeMins >= 1440 ? `${Math.round(snoozeMins / 1440)} g\xFCn` : snoozeMins >= 60 ? `${Math.round(snoozeMins / 60)} saat` : `${snoozeMins} dakika`;
      console.log("[Fast Snooze Parser]: Instant execution for:", prompt, "minutes:", snoozeMins);
      return res.json({
        intent: "snooze_reminder",
        snoozeMinutes: snoozeMins,
        responseText: `\u23F0 Hat\u0131rlat\u0131c\u0131 ${durationStr} ertelendi.`,
        speechText: `Tamam, hat\u0131rlat\u0131c\u0131y\u0131 ${durationStr} erteledim.`,
        memoryToSave: null,
        reminderToSave: {
          title: `__SNOOZE_${snoozeMins}__`,
          dateTime: String(snoozeMins),
          repeatFrequency: "none"
        }
      });
    }
    const isExplicitReminder = userText.includes("hat\u0131rlat") || userText.includes("uyand\u0131r") || userText.includes("alarm") || userText.includes("beni ara") || userText.includes("hat\u0131rlatma");
    if (isExplicitReminder && !imageBase64) {
      const fastResult = parseReminderFast(prompt, nowIso);
      console.log("[Fast Reminder Parser]: Instant execution for:", prompt);
      return res.json(fastResult);
    }
    const groqApiKey = getGroqApiKey();
    if (!groqApiKey) {
      console.warn("Groq API key missing (GROQ_API_KEY), generating mock intelligent offline response.");
      if (isExplicitReminder) {
        return res.json(parseReminderFast(prompt, nowIso));
      }
      let intent = "answer";
      let responseText = "Anla\u015F\u0131ld\u0131! Sizi dinliyorum.";
      let speechText = responseText;
      let memoryToSave = null;
      let reminderToSave = null;
      if (userText.includes("hakk\u0131mda ne biliyorsun") || userText.includes("benim hakk\u0131mda") || userText.includes("ne biliyorsun") || userText.includes("hakk\u0131mda ne biliyosun")) {
        intent = "search";
        if (currentMemories.length === 0) {
          responseText = "\u015Eu anda senin hakk\u0131nda kay\u0131tl\u0131 bir bilgim yok.";
          speechText = "\u015Eu anda senin hakk\u0131nda kay\u0131tl\u0131 bir bilgim yok.";
        } else {
          const listStr = currentMemories.map((m, idx) => `${idx + 1}. ${m.title}: ${m.content}`).join("\n");
          responseText = `\u015Eu anda haf\u0131zamda senin hakk\u0131nda kay\u0131tl\u0131 olan bilgiler:

${listStr}`;
          speechText = `\u015Eu anda haf\u0131zamda senin hakk\u0131nda kay\u0131tl\u0131 ${currentMemories.length} bilgi bulunuyor.`;
        }
      } else if (userText.includes("hat\u0131rla") || userText.includes("kaydet") || userText.includes("haf\u0131za")) {
        intent = "remember";
        const cleanContent = prompt?.replace(/(hatırla|kaydet|hafızama ekle|lütfen)/gi, "").trim() || "Kaydedilen Bilgi";
        memoryToSave = {
          title: cleanContent.slice(0, 35) || "Yeni Not",
          content: cleanContent || "Foto\u011Fraf veya Ses Kayd\u0131",
          category: "Not",
          tags: ["ki\u015Fisel"]
        };
        responseText = `\u{1F9E0} "${memoryToSave.title}" bilginiz Haf\u0131zam'a kaydedildi.`;
        speechText = `${memoryToSave.title} haf\u0131zaya kaydedildi.`;
      } else if (imageBase64) {
        intent = "ocr";
        responseText = "\u{1F4F7} G\xF6rsel analiz edildi: Nesne veya belge tespit edildi. Bu bilgiyi haf\u0131zan\u0131za kaydetmek ister misiniz?";
        speechText = "G\xF6rsel analiz edildi.";
      } else if (userText.includes("bul") || userText.includes("neydi") || userText.includes("ara")) {
        intent = "search";
        const query = userText.replace(/(bul|neydi|ara|geçen|kaydettiğim)/gi, "").trim();
        const found = currentMemories.find(
          (m) => m.title.toLowerCase().includes(query) || m.content.toLowerCase().includes(query)
        );
        if (found) {
          responseText = `\u{1F50D} Haf\u0131zamda buldum:
\u{1F4CC} ${found.title}: ${found.content}`;
          speechText = `Haf\u0131zan\u0131zda ${found.title} bulundu: ${found.content}`;
        } else {
          responseText = `\u{1F50D} Haf\u0131zamda "${query}" ile e\u015Fle\u015Fen bir kay\u0131t bulunamad\u0131.`;
          speechText = "Arad\u0131\u011F\u0131n\u0131z bilgi haf\u0131zada bulunamad\u0131.";
        }
      }
      return res.json({
        intent,
        responseText,
        speechText,
        memoryToSave,
        reminderToSave
      });
    }
    const systemInstruction = `
Sen "HAFIZAM AI" ad\u0131nda, Android ak\u0131ll\u0131 telefonlarda \xE7al\u0131\u015Fan ki\u015Fisel bir T\xFCrk\xE7e yapay zek\xE2 asistan\u0131s\u0131n.
\u015Eu anki ger\xE7ek tarih ve saat (ISO): ${nowIso} (Yerel Tarih: ${currentDateObj.toLocaleString("tr-TR")})

Mevcut Kullan\u0131c\u0131 Haf\u0131zas\u0131 (${currentMemories.length} adet):
${JSON.stringify(currentMemories.map((m) => ({ id: m.id, title: m.title, content: m.content, category: m.category, tags: m.tags, createdAt: m.createdAt })))}

KR\u0130T\u0130K G\u0130ZL\u0130L\u0130K VE SIFIR TAHM\u0130N KURALLARI (\xC7OK \xD6NEML\u0130!):
1. Kullan\u0131c\u0131n\u0131n ad\u0131, ya\u015F\u0131, mesle\u011Fi, konumu, adresi, ailesi, ge\xE7mi\u015Fi, hobileri, karakteri veya ba\u015Fka herhangi bir ki\u015Fisel \xF6zelli\u011Fi hakk\u0131nda KES\u0130NL\u0130KLE TAHM\u0130N YAPMA VE B\u0130LG\u0130 UYDURMA!
2. Kullan\u0131c\u0131 hakk\u0131nda YALNIZCA \u015Fu 3 kaynaktaki do\u011Frulanm\u0131\u015F bilgileri kullanabilirsin:
   A) Kullan\u0131c\u0131n\u0131n o anki mesaj\u0131nda a\xE7\u0131k\xE7a s\xF6yledi\u011Fi bilgiler.
   B) Kullan\u0131c\u0131n\u0131n a\xE7\u0131k\xE7a "hat\u0131rla", "kaydet", "bunu unutma" gibi bir komutla kaydetti\u011Fi bilgiler.
   C) Yukar\u0131daki 'Mevcut Kullan\u0131c\u0131 Haf\u0131zas\u0131' listesinde yer alan ger\xE7ek kay\u0131tlar.
3. Kullan\u0131c\u0131 "Benim hakk\u0131mda ne biliyorsun?" veya "Hakk\u0131mda ne biliyorsun?" veya "Ne biliyorsun?" diye sordu\u011Funda:
   - E\u011Fer Mevcut Kullan\u0131c\u0131 Haf\u0131zas\u0131 bo\u015Fsa (0 kay\u0131t):
     Ekrana ve sese KES\u0130NL\u0130KLE \u015Fu cevab\u0131 ver: "\u015Eu anda senin hakk\u0131nda kay\u0131tl\u0131 bir bilgim yok."
   - E\u011Fer Mevcut Kullan\u0131c\u0131 Haf\u0131zas\u0131nda kay\u0131tlar varsa:
     ResponseText cevab\u0131na \u015Fu ba\u015Fl\u0131kla ba\u015Fla: "\u015Eu anda haf\u0131zamda senin hakk\u0131nda kay\u0131tl\u0131 olan bilgiler:"
     ve ard\u0131ndan YALNIZCA listedeki ger\xE7ek kay\u0131tlar\u0131 maddeler halinde yaz. Genel varsay\u0131mlarla veya tahminlerle sak\u0131n doldurma.
4. Bir bilgi hakk\u0131nda emin de\u011Filsen veya haf\u0131zada yoksa do\u011Frudan "Bunu bilmiyorum." de.

KATEGOR\u0130LER VE B\u0130LD\u0130R\u0130M MANTIKLARI:

1. "remind" (GER\xC7EK HATIRLATMA VEYA ALARM B\u0130LD\u0130R\u0130M\u0130):
   - Kullan\u0131c\u0131 "bana ... hat\u0131rlat", "yar\u0131n ... uyand\u0131r", "her g\xFCn saat ...'de ilac\u0131m\u0131 hat\u0131rlat" dedi\u011Finde \xC7ALI\u015EIR.
   - TEKRAR SIKLI\u011EI (repeatFrequency):
     * "her g\xFCn", "her sabah", "her ak\u015Fam", "g\xFCnl\xFCk" -> repeatFrequency: "daily"
     * "her pazartesi", "her sal\u0131", "her \xE7ar\u015Famba", "her per\u015Fembe", "her cuma", "her cumartesi", "her pazar", "her hafta", "haftal\u0131k" -> repeatFrequency: "weekly"
     * "her ay\u0131n 1'inde", "her ay", "ayl\u0131k" -> repeatFrequency: "monthly"
     * Kullan\u0131c\u0131 tekrar s\u0131kl\u0131\u011F\u0131 BEL\u0130RTMED\u0130YSE -> repeatFrequency: "none"
   - Cihaz alarm\u0131 / bildirimi i\xE7in 'reminderToSave' doldur.
   - ResponseText format\u0131:
     "\u{1F514} Hat\u0131rlatma olu\u015Fturuldu \u2014 [SAAT VEYA TAR\u0130H]
\u{1F4CC} [Hat\u0131rlatma Ba\u015Fl\u0131\u011F\u0131]"

2. "remember":
   - SADECE 'memoryToSave' nesnesini doldur.
3. "search" / "answer":
   - 'memoryToSave' = null ve 'reminderToSave' = null.

\xC7IKTI FORMATI:
SADECE ve SADECE a\u015Fa\u011F\u0131daki JSON format\u0131nda ge\xE7erli bir JSON objesi d\xF6nd\xFCr. Ba\u015Fka hi\xE7bir a\xE7\u0131klama veya ek metin ekleme:
{
  "intent": "remember" | "remind" | "search" | "ocr" | "answer",
  "responseText": "Kullan\u0131c\u0131ya g\xF6sterilecek T\xFCrk\xE7e a\xE7\u0131klama",
  "speechText": "Sesli okunacak yan\u0131t",
  "memoryToSave": { "title": "...", "content": "...", "category": "Not", "tags": ["..."] } | null,
  "reminderToSave": { "title": "...", "dateTime": "ISO_STRING", "repeatFrequency": "none" | "daily" | "weekly" | "monthly" } | null,
  "matchedMemoryIds": []
}
`;
    const userMessages = [];
    if (imageBase64) {
      const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      userMessages.push({
        role: "user",
        content: [
          { type: "text", text: prompt || "L\xFCtfen bu g\xF6rseli incele ve bilgi ver." },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType || "image/jpeg"};base64,${cleanData}`
            }
          }
        ]
      });
    } else {
      userMessages.push({
        role: "user",
        content: prompt || "Merhaba"
      });
    }
    const groqRequestBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemInstruction },
        ...userMessages
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e4);
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(groqRequestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!groqRes.ok) {
        const errorText = await groqRes.text().catch(() => "");
        console.error(`Groq API returned HTTP status ${groqRes.status}:`, errorText);
        throw new Error(`Groq API error (${groqRes.status}): ${errorText.slice(0, 150)}`);
      }
      const groqData = await groqRes.json();
      const rawContent = groqData.choices?.[0]?.message?.content || "{}";
      const cleanedContent = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      let resultJson = {};
      try {
        resultJson = JSON.parse(cleanedContent);
      } catch (e) {
        console.error("Groq JSON parse error, raw content:", rawContent);
        resultJson = {
          intent: "answer",
          responseText: rawContent || "\u0130\u015Fleminiz tamamland\u0131.",
          speechText: "\u0130\u015Fleminiz tamamland\u0131."
        };
      }
      if (!resultJson.responseText) {
        resultJson.responseText = "\u0130\u015Fleminiz tamamland\u0131.";
      }
      if (!resultJson.speechText) {
        resultJson.speechText = resultJson.responseText;
      }
      if (!resultJson.intent) {
        resultJson.intent = "answer";
      }
      if (resultJson.intent === "remind" || isExplicitReminder) {
        resultJson.intent = "remind";
        const fastParsed = parseReminderFast(prompt, nowIso);
        const existingRem = resultJson.reminderToSave || {};
        let title = (existingRem.title || "").trim();
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
          repeatFrequency: existingRem.repeatFrequency || fastParsed.reminderToSave.repeatFrequency
        };
      }
      return res.json(resultJson);
    } catch (apiError) {
      clearTimeout(timeoutId);
      console.error("[Groq API Call Error / Fallback]:", apiError);
      if (promptStr && (promptStr.includes("hat\u0131rlat") || promptStr.includes("uyand\u0131r") || promptStr.includes("alarm"))) {
        return res.json(parseReminderFast(promptStr, currentDateTimeIso));
      }
      return res.status(500).json({
        error: "Groq API i\u015Flemi s\u0131ras\u0131nda hata olu\u015Ftu: " + (apiError.message || "Bilinmeyen hata"),
        responseText: "\xDCzg\xFCn\xFCm, iste\u011Finizi i\u015Flerken bir sorun olu\u015Ftu. L\xFCtfen tekrar deneyin.",
        speechText: "Bir sorun olu\u015Ftu. L\xFCtfen tekrar deneyin."
      });
    }
  } catch (outerErr) {
    console.error("Outer API Process Error:", outerErr);
    if (promptStr && (promptStr.includes("hat\u0131rlat") || promptStr.includes("uyand\u0131r") || promptStr.includes("alarm"))) {
      return res.json(parseReminderFast(promptStr, currentDateTimeIso));
    }
    return res.status(500).json({
      error: "\u0130\u015Flem s\u0131ras\u0131nda bir hata olu\u015Ftu: " + (outerErr.message || "Bilinmeyen hata"),
      responseText: "\xDCzg\xFCn\xFCm, iste\u011Finizi i\u015Flerken bir sorun olu\u015Ftu. L\xFCtfen tekrar deneyin.",
      speechText: "Bir sorun olu\u015Ftu. L\xFCtfen tekrar deneyin."
    });
  }
});
app.post("/api/tts/tr", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text parameter required" });
    }
    let cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").replace(/[🔔📌🧠💡⚙️]/g, "").replace(/[*_#`~]/g, "").replace(/\s+/g, " ").trim();
    if (!cleanText) {
      return res.status(400).json({ error: "Empty text after cleaning" });
    }
    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 500);
    }
    const chunks = [];
    let remaining = cleanText;
    while (remaining.length > 0) {
      if (remaining.length <= 150) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = remaining.lastIndexOf(".", 150);
      if (splitIdx === -1) splitIdx = remaining.lastIndexOf(",", 150);
      if (splitIdx === -1) splitIdx = remaining.lastIndexOf(" ", 150);
      if (splitIdx === -1) splitIdx = 150;
      const chunk = remaining.substring(0, splitIdx + 1).trim();
      if (chunk) chunks.push(chunk);
      remaining = remaining.substring(splitIdx + 1).trim();
    }
    const audioBuffers = [];
    for (const chunk of chunks) {
      if (!chunk) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tr&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const response = await fetch(ttsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`TTS upstream returned status ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }
    const finalBuffer = Buffer.concat(audioBuffers);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", finalBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(finalBuffer);
  } catch (err) {
    console.error("[TTS Endpoint Error]:", err);
    return res.status(500).json({ error: "TTS audio generation failed: " + (err.message || "unknown error") });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HAFIZAM AI Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
