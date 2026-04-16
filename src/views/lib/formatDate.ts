import { z } from "zod";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_MONTH = 2592000;
const SECONDS_PER_YEAR = 31536000;

export const formatTimestamp = z
	.function()
	.args(z.string(), z.string(), z.string())
	.returns(z.string())
	.implement((isoDate, timezone, locale) => {
		const date = new Date(isoDate);

		if (Number.isNaN(date.getTime())) {
			throw new Error("Invalid date: " + isoDate);
		}

		const formatter = new Intl.DateTimeFormat(locale, {
			timeZone: timezone,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			day: "2-digit",
			month: "2-digit",
			year: "2-digit"
		});

		const parts = formatter.formatToParts(date);

		const get = (type: Intl.DateTimeFormatPartTypes): string => {
			return parts.find((p) => p.type === type)?.value ?? "";
		};

		const hour = get("hour") === "24" ? "00" : get("hour");

		return hour + ":" + get("minute") + ":" + get("second") + " " + get("day") + "/" + get("month") + "/" + get("year");
	});

export const formatRelativeTime = z
	.function()
	.args(z.string(), z.string())
	.returns(z.string())
	.implement((isoDate, locale) => {
		const date = new Date(isoDate);

		if (Number.isNaN(date.getTime())) {
			throw new Error("Invalid date: " + isoDate);
		}

		const diffSeconds = Math.floor((date.getTime() - Date.now()) / 1000);
		const absDiff = Math.abs(diffSeconds);

		const resolved = absDiff < SECONDS_PER_MINUTE
			? { unit: "second" as const, value: 0 }
			: absDiff < SECONDS_PER_HOUR
				? { unit: "minute" as const, value: Math.round(diffSeconds / SECONDS_PER_MINUTE) }
				: absDiff < SECONDS_PER_DAY
					? { unit: "hour" as const, value: Math.round(diffSeconds / SECONDS_PER_HOUR) }
					: absDiff < SECONDS_PER_MONTH
						? { unit: "day" as const, value: Math.round(diffSeconds / SECONDS_PER_DAY) }
						: absDiff < SECONDS_PER_YEAR
							? { unit: "month" as const, value: Math.round(diffSeconds / SECONDS_PER_MONTH) }
							: { unit: "year" as const, value: Math.round(diffSeconds / SECONDS_PER_YEAR) };

		const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "long" });
		return rtf.format(resolved.value, resolved.unit);
	});
