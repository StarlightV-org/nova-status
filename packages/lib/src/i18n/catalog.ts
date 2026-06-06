export type NestedMessages = {
	[key: string]: string | NestedMessages;
};

export function flattenMessages(obj: NestedMessages, prefix = ""): Record<string, string> {
	const result: Record<string, string> = {};

	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "string") {
			result[path] = value;
		} else {
			Object.assign(result, flattenMessages(value, path));
		}
	}

	return result;
}
