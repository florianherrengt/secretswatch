import { describe, expect, it, afterEach, vi } from "vitest";
import { formatTimestamp, formatRelativeTime } from "./formatDate.js";

describe("formatTimestamp", () => {
	it("formats UTC midnight with en-US locale", () => {
		expect(formatTimestamp("2026-01-01T00:00:00.000Z", "UTC", "en-US")).toBe("00:00:00 01/01/26");
	});

	it("formats non-UTC timezone (America/New_York)", () => {
		expect(formatTimestamp("2026-01-01T17:30:45.000Z", "America/New_York", "en-US")).toBe("12:30:45 01/01/26");
	});

	it("formats with different locale (de-DE)", () => {
		expect(formatTimestamp("2026-06-15T08:00:00.000Z", "UTC", "de-DE")).toBe("08:00:00 15/06/26");
	});

	it("throws on invalid date string", () => {
		expect(() => formatTimestamp("not-a-date", "UTC", "en-US")).toThrow();
	});

	it("throws on empty string", () => {
		expect(() => formatTimestamp("", "UTC", "en-US")).toThrow();
	});

	it("formats midday time", () => {
		expect(formatTimestamp("2026-12-25T12:00:00.000Z", "UTC", "en-US")).toBe("12:00:00 25/12/26");
	});
});

describe("formatRelativeTime", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows 'now' for 30 seconds ago", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
		const result = formatRelativeTime("2026-01-01T00:00:00.000Z", "en-US");
		expect(result).toContain("now");
	});

	it("shows minutes for 5 minutes ago", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:05:00.000Z"));
		const result = formatRelativeTime("2026-01-01T00:00:00.000Z", "en-US");
		expect(result).toContain("5 minute");
	});

	it("shows hours for 2 hours ago", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T02:00:00.000Z"));
		const result = formatRelativeTime("2026-01-01T00:00:00.000Z", "en-US");
		expect(result).toContain("2 hour");
	});

	it("shows days for 3 days ago", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-04T00:00:00.000Z"));
		const result = formatRelativeTime("2026-01-01T00:00:00.000Z", "en-US");
		expect(result).toContain("3 day");
	});

	it("shows months for 2 months ago", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
		const result = formatRelativeTime("2026-01-01T00:00:00.000Z", "en-US");
		expect(result).toContain("2 month");
	});

	it("shows years for 1 year ago", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2027-01-01T00:00:00.000Z"));
		const result = formatRelativeTime("2026-01-01T00:00:00.000Z", "en-US");
		expect(result).toContain("year");
	});

	it("shows 'in' prefix for future dates", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const result = formatRelativeTime("2026-01-01T02:00:00.000Z", "en-US");
		expect(result).toContain("2 hour");
		expect(result).toContain("in");
	});

	it("throws on invalid date", () => {
		expect(() => formatRelativeTime("invalid", "en-US")).toThrow();
	});
});
