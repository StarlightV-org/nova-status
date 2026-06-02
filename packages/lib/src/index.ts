import ShortUniqueId from "short-unique-id";

export function generateShortId(totalLength = 8): string {
	const length = totalLength % 2 === 0 ? totalLength / 2 : Math.ceil(totalLength / 2);
	const { randomUUID: uuidNumber } = new ShortUniqueId({
		length,
		dictionary: "number",
	});
	const { randomUUID: uuidLetter } = new ShortUniqueId({
		length,
		dictionary: "alpha_upper",
	});
	return `${uuidLetter()}${uuidNumber()}`;
}
