/* global $UD, Utils */
// Property inspector of the "Open Deeplink" action. Ulanzi Studio stores what is sent with
// sendParamFromPlugin and hands it to the main service (plugin/app.js) as the key's settings.

const ACTION_UUID = 'com.ulanzi.ulanzistudio.deeplink.open';
// Same rule as normalizeDeeplink() in src/deeplink.js
const SCHEME = /^[a-z][a-z0-9+.-]+:/i;

const wrapper = document.querySelector('.uspi-wrapper');
const urlInput = document.getElementById('url');
const testButton = document.getElementById('test');
const statusText = document.getElementById('status');

let settings = {};

function showStatus(text, kind) {
  statusText.textContent = text;
  statusText.className = kind ? `status ${kind}` : 'status';
}

function validate() {
  const value = urlInput.value.trim();
  if (value && !SCHEME.test(value)) {
    showStatus($UD.t('The URL must start with a scheme such as myapp://'), 'error');
  } else {
    showStatus('');
  }
}

function load(message) {
  settings = message.param && typeof message.param === 'object' ? { ...message.param } : {};
  // Do not overwrite what the user is typing
  if (document.activeElement !== urlInput) urlInput.value = settings.url ?? '';
  validate();
}

const save = Utils.debounce(() => {
  settings = { ...settings, url: urlInput.value.trim() };
  $UD.sendParamFromPlugin(settings);
}, 300);

$UD.connect(ACTION_UUID);

$UD.onConnected(() => wrapper.classList.remove('hidden'));
$UD.onAdd(load);
$UD.onParamFromApp(load);

$UD.onSendToPropertyInspector(({ payload }) => {
  if (payload?.type !== 'testResult') return;
  showStatus(payload.ok ? $UD.t('Opened') : payload.message, payload.ok ? 'ok' : 'error');
});

urlInput.addEventListener('input', () => {
  validate();
  save();
});

testButton.addEventListener('click', () => {
  showStatus('');
  $UD.sendToPlugin({ type: 'test', url: urlInput.value });
});
