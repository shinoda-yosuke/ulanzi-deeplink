import { normalizeDeeplink, openDeeplink } from './deeplink.js';

export const PLUGIN_UUID = 'com.ulanzi.ulanzistudio.deeplink';
export const ACTION_UUID = `${PLUGIN_UUID}.open`;

// English texts double as localization keys (see the "Localization" section of <language>.json),
// following the SDK convention, so an untranslated language still gets readable messages.
export const MESSAGES = Object.freeze({
  empty: 'Set a deeplink URL for this key first.',
  'no-scheme': 'The URL must start with a scheme such as myapp://',
  malformed: 'The URL contains invalid characters.',
  'no-handler': 'No app is registered to open this kind of link.',
  'open-failed': 'Could not open the link.',
});

/**
 * Wires the "Open Deeplink" action to a connection with Ulanzi Studio.
 *
 * @param {object} options
 * @param {import('./vendor/plugin-common-node/libs/ulanziApi.js').default} options.api
 * @param {(url: string) => Promise<void>} [options.open] opens a normalized URL; replaced in tests
 */
export function registerDeeplinkAction({ api, open = openDeeplink }) {
  /** Settings saved by the host for each key, keyed by context. */
  const settings = new Map();

  const remember = ({ context, param }) => {
    if (param && typeof param === 'object') settings.set(context, param);
  };

  /** @returns {Promise<{ ok: true, url: string } | { ok: false, message: string }>} */
  const launch = async (rawUrl) => {
    const normalized = normalizeDeeplink(rawUrl);
    if (!normalized.ok) return { ok: false, message: api.t(MESSAGES[normalized.reason]) };
    try {
      await open(normalized.url);
      return { ok: true, url: normalized.url };
    } catch (error) {
      api.logMessage(`Failed to open ${normalized.url}: ${error.message}`, 'error');
      return { ok: false, message: api.t(MESSAGES[error.reason] ?? MESSAGES['open-failed']) };
    }
  };

  api.onAdd(remember);
  api.onParamFromApp(remember);
  api.onParamFromPlugin(remember);

  api.onClear(({ param }) => {
    for (const { context } of param ?? []) settings.delete(context);
  });

  api.onRun(async (message) => {
    // run carries the saved settings too; prefer them in case an earlier event was missed
    remember(message);
    const result = await launch(settings.get(message.context)?.url);
    if (!result.ok) {
      api.showAlert(message.context);
      api.toast(result.message);
    }
  });

  // "Test" button in the property inspector
  api.onSendToPlugin(async ({ context, payload }) => {
    if (payload?.type !== 'test') return;
    const result = await launch(payload.url);
    api.sendToPropertyInspector(
      { type: 'testResult', ok: result.ok, message: result.ok ? '' : result.message },
      context,
    );
  });
}
