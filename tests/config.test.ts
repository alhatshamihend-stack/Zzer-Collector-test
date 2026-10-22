import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfig, getScraperConfig } from '../src/config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('environment configuration', () => {
  it('loads the scraper configuration without requiring Supabase credentials', () => {
    vi.stubEnv('ZZER_AUTH_TOKEN', 'test-zzer-token');
    vi.stubEnv('ZZER_API_BASE_URL', 'https://gwapi-v2.goshare2.com');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    expect(getScraperConfig()).toMatchObject({
      ZZER_AUTH_TOKEN: 'test-zzer-token',
      ZZER_API_BASE_URL: 'https://gwapi-v2.goshare2.com',
      LOG_LEVEL: 'info',
    });
  });

  it('uses the default API base URL when the optional value is blank', () => {
    vi.stubEnv('ZZER_AUTH_TOKEN', 'test-zzer-token');
    vi.stubEnv('ZZER_API_BASE_URL', '');

    expect(getScraperConfig().ZZER_API_BASE_URL).toBe('https://gwapi-v2.goshare2.com');
  });

  it('still requires Supabase credentials for the full upload pipeline', () => {
    vi.stubEnv('ZZER_AUTH_TOKEN', 'test-zzer-token');
    vi.stubEnv('ZZER_API_BASE_URL', 'https://gwapi-v2.goshare2.com');
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    expect(() => getConfig()).toThrow(/SUPABASE_URL/u);
  });
});
