# Communication Platform — Phase 8 Browser, Responsive and Accessibility QA

Isolated stack: API with real ClamAV 1.4.6, LocalStack S3, disposable PostgreSQL/Redis, fresh production web build. Config: `apps/web-merchant/playwright.crossbrowser.config.ts` (projects chromium, firefox, webkit, tablet = iPad gen 7 viewport, phone = Pixel 5). Each spec used a fresh parcel per browser.

## 1. Results

| Project                          | Phase 6 media (`chat-attachments.spec.ts`)                    | Phase 7 admin (`chat-admin-center.spec.ts`) | Responsive/a11y (`chat-responsive-a11y.spec.ts`) |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Chromium 1254                    | 7/7                                                           | 10/10                                       | 3/3                                              |
| Firefox 155                      | 7/7 (voice recorded via fake media prefs)                     | 10/10                                       | 3/3                                              |
| WebKit 26.6                      | 6/7, 1 skipped (voice: no fake microphone in headless WebKit) | 10/10                                       | 3/3                                              |
| Tablet (iPad viewport, Chromium) | —                                                             | —                                           | 3/3                                              |
| Phone (Pixel 5)                  | —                                                             | —                                           | 3/3                                              |

Covered journeys: file uploads, image preview and lightbox, PDF download, voice record/playback (Chromium, Firefox), other-participant visibility, unauthorized download (404/401), reload and realtime reconnect, admin center navigation, inbox filters/search, reason-gated workspace, visible intervention and staff message, internal note privacy (customer UI + API), escalation lifecycle, report review, scan states with a **paused real clamd** (pending → automatic recovery), restricted staff download, unauthorized staff (ordinary admin "Restricted area", hub manager/merchant 403), audit history.

## 2. Accessibility (automated; no manual screen-reader testing was performed)

| Check                                                                                             | Result                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No horizontal page scroll (admin overview, inbox, workspace, messenger) on desktop, tablet, phone | Pass                                                                                                                                                                                                               |
| Keyboard: tabs reachable, arrow-key navigation, Enter activates                                   | Pass                                                                                                                                                                                                               |
| Reason gate autofocus, Tab order to submit, Enter submits                                         | Pass                                                                                                                                                                                                               |
| Dialog: focus moves inside, Tab stays trapped, Escape closes, **focus returns to the opener**     | Pass after fix F-A11Y-1 (before: focus dropped to `<body>`)                                                                                                                                                        |
| Buttons have accessible names (admin center, workspace, messenger)                                | Pass                                                                                                                                                                                                               |
| Live region for announcements (toasts) present                                                    | Pass                                                                                                                                                                                                               |
| Composer labelled ("Message"), keyboard send keeps focus in composer                              | Pass                                                                                                                                                                                                               |
| Text contrast (computed WCAG 2.x against effective background)                                    | No text below 3:1. **8 elements between 4.29 and 4.49:1** (inactive tab labels, page subtitle, messenger timestamps — the shared `muted-foreground` token), below AA 4.5:1 for normal text → design-system finding |

## 3. Findings

| ID       | Finding                                                                                                                      | Status                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| F-A11Y-1 | Admin `ReasonDialog` (opened programmatically, no `DialogTrigger`) did not restore focus on close                            | **Fixed** (remember opener, `onCloseAutoFocus`) and verified on all browsers |
| F-A11Y-2 | Phase 4 messenger dialogs (edit/remove/report) use the same programmatic pattern — likely the same focus-restore gap         | Open (not changed in Phase 8)                                                |
| F-A11Y-3 | Muted text 4.29–4.49:1                                                                                                       | Open (design tokens)                                                         |
| F-UX-1   | Login form ignores clicks before hydration (observed on WebKit): nothing happens, no feedback                                | Open (outside chat; tests now wait for hydration)                            |
| F-QA-1   | Stale `next start` processes from an earlier session were still bound to the test port — first Chromium run hit an old build | Process issue; all runs reported here used the fresh build                   |

## 4. Not done

Manual screen-reader passes (NVDA/VoiceOver), real mobile devices, Safari on macOS/iOS (WebKit on Windows is an approximation), voice recording on WebKit, hub-manager-specific browser journey.
