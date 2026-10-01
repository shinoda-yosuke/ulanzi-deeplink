# Deeplink Launcher for Ulanzi Studio

[![CI](https://github.com/shinoda-yosuke/ulanzi-deeplink/actions/workflows/ci.yml/badge.svg)](https://github.com/shinoda-yosuke/ulanzi-deeplink/actions/workflows/ci.yml)

[English](README.md) · **日本語**

`slack://`・`obsidian://`・`zoommtg://`・`raycast://`・`https://` などのディープリンク（URL スキーム）を
キー 1 つで開く [Ulanzi Studio](https://www.ulanzi.com/pages/ulanzi-app)（UlanziDeck）用プラグインです。
メインサービスは公式の [UlanziDeckPlugin-SDK](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK) を使って Node.js で実装しています。

<img src="com.ulanzi.deeplink.ulanziPlugin/assets/icons/plugin.png" width="96" alt="Deeplink Launcher のアイコン">

## 機能

- **ディープリンクを開く** アクション: キーごとに URL を設定し、押すとそのスキームに登録されたアプリで開きます。
- どんなスキームでも使えます（アプリのディープリンク、`https://`、`mailto:`、`x-apple.systempreferences:`、`ms-settings:` など）。
- スペースや日本語などの文字は自動でパーセントエンコードします。
- 設定パネルの **テスト** ボタンで、キーを押さずに動作を確認できます。
- 開けなかったとき（URL 未設定・スキームなし・対応アプリなし）は、キーにアラートを表示し、Ulanzi Studio に理由を表示します。
- macOS / Windows 対応。設定パネルとメッセージは 8 言語（英・日・簡体字・繁体字・独・韓・葡・西）。
- マルチアクションの中でも使えます。

## インストール

### リリースから

1. [Releases](https://github.com/shinoda-yosuke/ulanzi-deeplink/releases) から `com.ulanzi.deeplink.ulanziPlugin.zip` をダウンロードします。
2. Ulanzi Studio を終了し、プラグインフォルダの直下に `com.ulanzi.deeplink.ulanziPlugin` フォルダが来るように展開します。
   - macOS: `~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/`
   - Windows: `%APPDATA%\Ulanzi\UlanziDeck\Plugins\`
3. Ulanzi Studio を起動すると、アクション一覧に **ディープリンクランチャー** が表示されます。

### ソースから

Node.js 22 以上が必要です。

```sh
npm ci
npm run plugin:install   # ビルドして Ulanzi Studio のプラグインフォルダへコピー
```

表示されない場合や古いバージョンが動き続ける場合は、Ulanzi Studio を再起動してください。

## 使い方

1. **ディープリンクランチャー › ディープリンクを開く** をキーにドラッグします。
2. `slack://open` などの URL を入力し、**テスト** で動作を確認します。
3. キーを押します。

| 対象 | URL |
| --- | --- |
| Slack | `slack://open` |
| Zoom（会議に参加） | `zoommtg://zoom.us/join?confno=<会議 ID>` |
| Obsidian | `obsidian://open?vault=<Vault 名>` |
| Notion | `notion://www.notion.so/<ページ>` |
| Raycast | `raycast://extensions/raycast/clipboard-history/clipboard-history` |
| Spotify | `spotify:playlist:<ID>` |
| VS Code | `vscode://file/<絶対パス>` |
| macOS のシステム設定 | `x-apple.systempreferences:com.apple.preference.security` |
| Windows の設定 | `ms-settings:display` |
| メール | `mailto:someone@example.com` |
| Web ページ | `https://example.com` |

### リンクの開き方

メインサービス（`plugin/app.js`）が URL を検証（スキームで始まること）し、URL に使えない文字をパーセントエンコードしてから
OS に渡します。macOS は `open`、Windows は `rundll32 url.dll,FileProtocolHandler` を使います。URL はシェルを介さず
1 つの引数として渡すため、コマンドとして解釈されることはありません。

## プライバシー

Deeplink Launcher はデータの収集・保存・送信を一切行いません。入力した URL は Ulanzi Studio がキーの設定として保存し、
キーまたは **テスト** ボタンを押したときに OS へ渡されるだけです。

## 開発

```sh
npm ci
npm test                  # ビルド + 単体テスト + 偽の Ulanzi Studio を相手にした E2E テスト
npm run plugin:link       # このチェックアウトを Ulanzi Studio にシンボリックリンク（変更後は npm run build）
npm run plugin:install    # パッケージ済みのビルドをコピー
npm run plugin:uninstall
npm run package           # dist/com.ulanzi.deeplink.ulanziPlugin.zip を作成
npm run icons             # design/*.svg から PNG アイコンを生成
```

Ulanzi Studio 同梱の Node.js（Node.js 20）で E2E テストを実行するには:

```sh
PLUGIN_NODE="/Applications/Ulanzi Studio.app/Contents/MacOS/NodeJS/node" npm test
```

ディレクトリ構成やリリース手順は [README.md](README.md#development)、ストアへの提出手順は [store/README.md](store/README.md) を参照してください。

## ライセンス

[MIT](LICENSE)。Ulanzi SDK（Apache-2.0）と [ws](https://github.com/websockets/ws)（MIT）を同梱しています。
[THIRD_PARTY_NOTICES.txt](com.ulanzi.deeplink.ulanziPlugin/THIRD_PARTY_NOTICES.txt) と [src/vendor](src/vendor/README.md) を参照してください。

Ulanzi 公式ではないコミュニティ製プラグインです。UUID（`com.ulanzi.ulanzistudio.deeplink`）は SDK が定める命名規則に従っています。
