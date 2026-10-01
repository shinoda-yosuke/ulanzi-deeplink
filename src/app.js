// Main service entry. Ulanzi Studio starts it as `node plugin/app.js <address> <port> <language> <version>`.
import UlanziApi from './vendor/plugin-common-node/index.js';
import { PLUGIN_UUID, registerDeeplinkAction } from './plugin.js';

const $UD = new UlanziApi();

registerDeeplinkAction({ api: $UD });

// EventEmitter throws on an "error" event nobody listens to
$UD.onError((error) => console.error(error));
// Ulanzi Studio owns this process; exit once the connection is gone so no orphan stays behind
$UD.onClose(() => process.exit(0));

process.on('unhandledRejection', (error) => {
  $UD.logMessage(`Unhandled rejection: ${error?.stack ?? error}`, 'error');
});

$UD.connect(PLUGIN_UUID);
// The Node SDK leaves localization to the plugin; load <language>.json so toasts follow the host language
$UD.localizeUI();
