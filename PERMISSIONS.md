# Chrome Web Store — permission justifications

Use the text below in **Privacy practices → Permission justifications** (or the equivalent fields when you submit or update the extension).

---

## `tabs`

**Justification (copy-paste):**

> The extension opens links in new browser tabs when you use the Google apps menu (9-dot launcher), click shortcuts in the top sites dock, or open pages from those UIs. The `tabs` permission is required to call `chrome.tabs.create()` from the new tab page so those actions open in a new tab instead of navigating away from your new tab experience. No tab contents are read, modified, or transmitted.

---

## `topSites`

**Justification (copy-paste):**

> The extension shows a “Top sites” dock on the new tab page with icons for your most visited sites, similar to a quick-launch bar. The `topSites` permission is used only to read Chrome’s locally stored list of frequently visited URLs and titles on your device to render that dock. This data is not sent to our servers—we do not operate a backend for this extension.

---

## Notes

- Character limits: if a field is truncated, shorten slightly while keeping the meaning.
- **Single purpose**: describe the extension as replacing the new tab with a calm scene, optional Google search, apps launcher, and top sites—no unrelated features.

