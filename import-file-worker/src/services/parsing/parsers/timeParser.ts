import {DateTime} from "luxon";

export const monthMap: Record<string, number> = {
    "Января": 1, "Февраля": 2, "Марта": 3, "Апреля": 4,
    "Мая": 5, "Июня": 6, "Июля": 7, "Августа": 8,
    "Сентября": 9, "Октября": 10, "Ноября": 11, "Декабря": 12,
};

export const normalizePhone = (phone: string): string => {
    if (!phone) return "";
    if (phone.startsWith("+")) return phone;
    if (phone.startsWith("996")) return "+" + phone;
    return phone;
};

export const timeToObject = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return { hour: h, minute: m };
};

export const parseTime = (raw: string, timezone: string) => {
    try {
        if (!raw || typeof raw !== "string") return null;

        // ---- Очистка строки ----
        const clean = raw
            .replace(/\s+/g, " ")        // убираем лишние пробелы
            .replace(/год[,]?/gi, "")    // убираем "год"
            .replace(/,/g, "")           // убираем запятые
            .trim();


        const dateMatch = clean.match(/^(\d{4})?[,\s]*(\d{1,2})[\s-]*([А-Яа-яЁё]+)/i);

        if (!dateMatch) {
            console.warn("❌ parseTime cannot extract date", raw);
            return null;
        }

        const [, yearStr, dayStr, monthStr] = dateMatch;
        const year = yearStr ? Number(yearStr) : new Date().getFullYear();
        const day = Number(dayStr);
        const month = monthMap[monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase()];

        if (!month || isNaN(day)) {
            console.warn("❌ parseTime invalid month/day", monthStr, dayStr, raw);
            return null;
        }

        const timeMatch = clean.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (!timeMatch) {
            console.warn("❌ parseTime cannot extract time", raw);
            return null;
        }
        const [, startStr, endStr] = timeMatch;

        const start = DateTime.fromObject(
            { year, month, day, ...timeToObject(startStr) },
            { zone: timezone }
        );
        const end = DateTime.fromObject(
            { year, month, day, ...timeToObject(endStr) },
            { zone: timezone }
        );

        if (!start.isValid || !end.isValid) {
            console.warn(
                "❌ parseTime invalid Luxon date",
                start.invalidReason,
                end.invalidReason,
                raw
            );
            return null;
        }

        return {
            assignmentDate: start
                .startOf("day")
                .toUTC()
                .toJSDate(),
            startUTC: start.toUTC().toFormat("HH:mm"),
            endUTC: end.toUTC().toFormat("HH:mm"),
        };
    } catch (err) {
        console.error("❌ parseTime fatal error", raw, err);
        return null;
    }
};