import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { apiBaseUrl } from '../utils/apiBase.ts';

const ORIGIN = 'https://ui.example.com';

describe('apiBaseUrl', () => {
	it('uses the page origin when no API URL is configured', () => {
		assert.equal(apiBaseUrl(undefined, ORIGIN).host, 'ui.example.com');
		assert.equal(apiBaseUrl('', ORIGIN).host, 'ui.example.com');
		assert.equal(apiBaseUrl('  ', ORIGIN).protocol, 'https:');
	});
	it('resolves a relative API URL such as "/" against the page origin (it used to throw)', () => {
		const url = apiBaseUrl('/', ORIGIN);
		assert.equal(url.host, 'ui.example.com');
		assert.equal(url.protocol, 'https:');
		assert.equal(apiBaseUrl('/rport/', ORIGIN).pathname, '/rport/');
	});
	it('keeps an absolute API URL', () => {
		const url = apiBaseUrl('http://api.example.net:3000', ORIGIN);
		assert.equal(url.host, 'api.example.net:3000');
		assert.equal(url.protocol, 'http:');
	});
});
