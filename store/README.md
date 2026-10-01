# Marketplace submission kit

Materials and steps for listing Deeplink Launcher on the
[Ulanzi Studio Marketplace](https://ugc.ulanzistudio.com) and the unofficial
[Ulanzi Community Store](https://ulanzicommunitystore.narlei.com/).

## Materials

| Item | File | Notes |
| --- | --- | --- |
| Plugin package | `dist/com.ulanzi.deeplink.ulanziPlugin.zip` (`npm run package`) or the asset of a GitHub Release | The `com.ulanzi.deeplink.ulanziPlugin/` folder sits at the root of the zip; keep this file name |
| Cover (1:1) | [`../com.ulanzi.deeplink.ulanziPlugin/assets/icons/plugin.png`](../com.ulanzi.deeplink.ulanziPlugin/assets/icons/plugin.png) (288×288 PNG) | Taken from `Icon` in manifest.json |
| Banner 01 (3:2) | [`banner-1.png`](banner-1.png) (1098×732) | Source: [`../design/banner.svg`](../design/banner.svg) (`npm run icons`) |
| Name, summary, details, update note | [`listing.md`](listing.md) | Limits: name 40, summary 300, details 1000, update note 1000 characters |
| Privacy policy | <https://github.com/shinoda-yosuke/ulanzi-deeplink#privacy> | |

## Ulanzi Studio Marketplace

1. Sign in at <https://ugc.ulanzistudio.com> and choose **Upload works**
   ([guide](https://bbs.ulanzistudio.com/thread-464-1-1.html)).
2. Drop the zip into the main work file field and wait until every item of **Auto check** passes.
3. Add the cover and banner, then the texts of each supported language from [`listing.md`](listing.md).
4. Compatibility: all devices (the action works on any key); Windows, macOS (Apple Silicon) and macOS (Intel).
5. Submit and follow the review under **Works under review**. In July 2026 Ulanzi support also asked developers to
   e-mail <ustudioservice@ulanzi.com> with the upload ID or name and what the plugin is for; check whether this is still needed.
6. For updates, bump the version (see "Releasing" in the README) and upload the new zip the same way. The published
   version stays online until the new one is approved.

> [!IMPORTANT]
> The plugin UUID (`com.ulanzi.ulanzistudio.deeplink`) cannot be changed once the plugin is published
> ([guideline](https://bbs.ulanzistudio.com/thread-23-1-1.html)).

## Ulanzi Community Store

1. Push a tag that matches the version, e.g. `v1.0.0`. The Release workflow attaches `com.ulanzi.deeplink.ulanziPlugin.zip`.
2. Submit the repository URL at <https://ulanzicommunitystore.narlei.com/#publish>
   ([requirements](https://github.com/narlei/ulanzicommunitystore/blob/main/PUBLISHING.md)).
