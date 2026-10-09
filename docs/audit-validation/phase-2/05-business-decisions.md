# Phase 2 — 05 Business Decisions (owner input required; nothing assumed)

1. **Q-BULK — Bulk import: build or remove?** Nav promises `?mode=bulk` (P1 D3). Options: (a) CSV/XLSX validate→import job + report page (XL); (b) delete 2 nav entries (S). Needed: format, row limits, validation rules, async vs inline.
2. **Q-CANCEL — Parcel cancellation policy.** Matrix allows pre-pickup cancel; no endpoint (D4). Who may cancel (merchant self-serve window vs hub/admin only)? Refund/fee on cancel? COD void rules?
3. **Q-ZERO-VERIFY — Zero-amount cash verification.** Today `actualAmount: 0` → 422, omitted → defaults to expected (`finance.dto.ts:97-101`). Is counted-zero a recordable outcome (e.g., lost cash) or always user error? (Prior audit listed as decision; confirmed unchanged.)
4. **Q-RTO — Return program scope.** Initiation actor (rider/hub/merchant request?), eligibility (failed-only vs anytime post-delivery?), attempt cap before auto-RTO (unlimited today), return fees / COD reversal / delivery-fee handling on return (none today; analytics explicitly doesn't track RTO cost), customer/merchant notification content, RTO SLA/metrics targets.
5. **Q-ATTEMPT-CAP — Max delivery attempts.** Unlimited `fail→start` loops today. Cap N then auto-RTO? N = ?
6. **Q-PROOF — Proof of delivery.** Photo mandatory? URL reachability/ownership checks? Remark requirements?
7. **Q-DUTY — Off-duty with assigned-not-started tasks.** Block OFF when holding `ASSIGNED_TO_RIDER` parcels, or keep current (OUT_FOR_DELIVERY only)?
8. **Q-REASSIGN — Reassign bypass of public matrix** (`parcels.service.ts:829-844`). Confirm intended; should `OUT_FOR_DELIVERY` ever be reassignable?
9. **Q-INTEL-SCOPE — Hub-manager intelligence/alerts.** Platform-wide today; scope to assigned hubs or admin-only?
10. **Q-ONBOARD — Merchant approval.** Instant-ACTIVE today. Add approval/suspension workflow? Pickup-address verification?
11. **Q-MONEY — Minor-unit unification (T-FIN-01).** Round-trips exact today (2dp inputs); still unify wallet reads to minor-canonical? Approve timing (post fan-out fix).
12. **Q-ROTATION — Credential rotation & history.** No evidence of committed secrets; rotate anyway on a schedule? Approve only if wanted.
