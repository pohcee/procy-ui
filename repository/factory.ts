import type {
	$Fetch,
	FetchOptions,
} from 'ofetch';

class ApiResponse<T> {
	data: T;
	error: unknown;
	status: unknown;
	constructor(data: T, error: unknown, status: unknown) {
		this.data = data;
		this.status = status;
		this.error = error;
	}
}
export enum HttpMethod {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
}
class HttpFactory {
	private $fetch: $Fetch;

	constructor(fetcher: $Fetch) {
		this.$fetch = fetcher;
	}

	async call<T>(
		method: string | HttpMethod,
		url: string,
		data?: object,
		fetchOptions?: FetchOptions<'json'>,
	): Promise<T> {
		return this.$fetch<T>(
			url,
			{
				method,
				body: data,
				...fetchOptions,
			},

		);
	}

	protected async httpGet<T>(
		url: string,
		data?: object,
		fetchOptions?: FetchOptions<'json'>,
	): Promise<T> {
		return this.$fetch(url, {
			method: HttpMethod.GET,
			body: data,
			...fetchOptions,
		});
	}

	protected async httpPost<T>(
		url: string,
		data?: object,
		fetchOptions?: FetchOptions<'json'>,
	): Promise<T> {
		return this.$fetch(url, {
			method: HttpMethod.POST,
			body: data,
			...fetchOptions,
		});
	}

	protected async httpPut<T>(
		url: string,
		data?: object,
		fetchOptions?: FetchOptions<'json'>,
	): Promise<T> {
		return this.$fetch(
			url,
			{
				method: HttpMethod.PUT,
				body: data,
				...fetchOptions,
			},
		);
	}

	protected async httpDelete<T>(
		url: string,
		data?: object,
		fetchOptions?: FetchOptions<'json'>,
	): Promise<T> {
		return this.$fetch(
			url,
			{
				method: HttpMethod.DELETE,
				body: data,
				...fetchOptions,
			},
		);
	}
}
export { HttpFactory, ApiResponse };
