(function () {
	var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	var locale = navigator.language || "en";

	var formatOffset = function (date, tz) {
		var parts = new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			timeZoneName: "shortOffset",
		}).formatToParts(date);
		var raw = "";
		for (var i = 0; i < parts.length; i++) {
			if (parts[i].type === "timeZoneName") {
				raw = parts[i].value.replace(/^GMT/, "");
				break;
			}
		}
		if (raw === "" || raw === "+0" || raw === "-0") return "+00:00";
		if (raw.indexOf(":") !== -1) return raw;
		return raw.replace(/([+-])(\d+)/, function (_, sign, h) {
			return sign + (h.length < 2 ? "0" + h : h) + ":00";
		});
	};

	var formatLocal = function (iso, tz, locale) {
		var date = new Date(iso);
		if (isNaN(date.getTime())) return iso;
		var f = new Intl.DateTimeFormat(locale, {
			timeZone: tz,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			day: "2-digit",
			month: "2-digit",
			year: "2-digit",
		});
		var parts = f.formatToParts(date);
		var get = function (type) {
			for (var i = 0; i < parts.length; i++) {
				if (parts[i].type === type) return parts[i].value;
			}
			return "";
		};
		var hour = get("hour") === "24" ? "00" : get("hour");
		var offset = formatOffset(date, tz);
		return (
			hour +
			":" +
			get("minute") +
			":" +
			get("second") +
			" " +
			get("day") +
			"/" +
			get("month") +
			"/" +
			get("year") +
			" (" +
			offset +
			")"
		);
	};

	var els = document.querySelectorAll("time[datetime]");
	for (var i = 0; i < els.length; i++) {
		var iso = els[i].getAttribute("datetime");
		if (iso) els[i].textContent = formatLocal(iso, tz, locale);
	}
})();
