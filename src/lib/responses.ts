/**
 * throws a redirect response, halting execution and redirecting the client.
 * must be used within a route handler - the router will catch and return it.
 *
 * @param url the URL to redirect to
 * @param status the HTTP status code (default 302)
 * @throws {Response}
 */
export function redirect(url: string | URL, status = 302): never {
	if (status < 300 || status > 308) {
		throw new RangeError(`redirect status must be 300-308, got ${status}`);
	}

	throw Response.redirect(url.toString(), status);
}
