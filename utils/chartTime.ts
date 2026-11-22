/**
 * Labels for chart time axes, in the viewer's local time. When the data spans more than
 * ~20 h the same clock time appears twice, so the weekday is added ("Sat 14:05").
 */
export const chartTickFormatter = (timestamps: string[]) => {
	const times = timestamps.map(t => new Date(t).getTime()).filter(n => !Number.isNaN(n));
	const spanHours = times.length ? (Math.max(...times) - Math.min(...times)) / 3_600_000 : 0;
	const fmt = new Intl.DateTimeFormat(undefined, spanHours > 20
		? { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
		: { hour: '2-digit', minute: '2-digit', hour12: false });
	return (timestamp: string) => fmt.format(new Date(timestamp));
};
