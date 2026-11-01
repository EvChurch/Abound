---
title: Archived membership release verification
date: 2026-10-31
status: deployed-and-verified
roadmap: RM-007
---

# Archived membership release verification

Tataihono authorized deployment of PR #62. It was squash-merged through GitHub at 18:22:03 UTC as `ec6ced9710ea8c24872ff9182291a2c6e33604bc`. Main CI run `41229066096` and production-image verification run `41229066055` passed.

GitHub-connected Railway production deployments of that exact commit reached SUCCESS:

- Web: `c2bd671e-7511-4b72-9ef3-90f94ab91733`, 18:28:42 UTC.
- Worker: `9fa53470-b49e-4112-8a53-c97e9e02b079`, 18:27:55 UTC.

No local archive deployment, Rock write or repair SQL was used. The scheduled full-sync job already running before release completed at 18:25:54 UTC, before either new service became live. The pre-release saved-audience check found two unarchived views, zero Connect Group filters and zero linked automations. The deployed household route redirects anonymous requests to Auth0 login (HTTP 307).

An authorized normal full-sync job `7fad45fd-0ab8-4dc5-88c9-00f3ecd36051` started at 18:29:00 UTC. Run `cmvwqt26u000208qlqc1x37zz` began persistence at 18:36:46 UTC. After the group stage, the GET-only/read-only standard-group comparison passed: 386 current source memberships, 423 historical local rows, 37 collection-omitted archived rows, zero active local extras and zero missing source memberships. Standard active memberships changed from 403 to 374; 29 stale active flags were cleared through normal persistence. UniChurch matched exactly: six groups, 106 memberships, 104 active, zero missing/extra IDs, state mismatches or missing people; all its rows reference this run. The run finished SUCCEEDED at 18:51:08 UTC and the pg-boss job completed at 18:51:09 UTC, including derived refreshes. It read 225,522 records, wrote 309,341 and skipped one. The only issue is the same pre-existing WARNING / RockHouseholdMember / MISSING_PERSON seen in the prior run; there are no membership refresh errors. The deployed `getSyncStatusSummary` service reports 34 Connect Groups and 478 active memberships (374 standard + 104 UniChurch), with this successful run as latest. Both exact-commit Railway deployments were rechecked SUCCESS after sync completion.

## Christian classification follow-up

During deployment, the Giving Check thread was checked again. Rowan replied at 11:35:51 UTC in message `1a191bed26637d5b`, asking to use Investigating connection status for non-Christian status for the time being (the body contains an apparent dictation typo, “Jon Christian”). This supports a temporary negative-status proxy; it does not establish a positive Christian marker or mean every other status is Christian. It differs from Tataihono’s earlier explicit-field-only decision. Tataihono explicitly adopted that temporary rule in the deployment follow-up. The requirements and implementation plan now record Investigating (65) as the temporary negative proxy, with provenance and explicit-field precedence; other statuses remain Unknown unless explicitly recorded. No Christian-classification code changes are included in this release.
