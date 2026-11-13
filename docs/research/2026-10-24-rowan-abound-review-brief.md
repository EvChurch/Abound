---
title: Rowan Abound consolidated review brief
date: 2026-10-24
status: replied-feedback-incorporated
---

# Rowan Abound consolidated review brief

This is the consolidated reply sent to Rowan's Giving Check thread. The attached requirements included all 15 interview questions and proposed answers. Rowan replied on 31 October; see [feedback reconciliation](2026-10-31-rowan-plan-feedback.md) for current decisions. The email below is preserved as sent.

## Delivery record

- Sent on 24 October 2026 from Tataihono's personal Gmail account to Rowan Hilsden at `rowan@aucklandev.co.nz`, with no additional recipients.
- Subject: Re: Giving Check. Replied to Rowan's 13:13 household-filter message so this is the main consolidated thread.
- Gmail confirmed message `1a16bc452d61ec50` with the SENT label in thread `1a16b4025525692b`.
- [Sent reply](https://mail.google.com/mail/u/tataihono.nikora@gmail.com/#all/1a16bc452d61ec50)
- Three text attachments contain the requirements/interview appendix, provisional plan and initial assessment. Application implementation and production changes have not started.

## Email

Hi Rowan,

I've brought your Abound, Rock data, Abound data and Giving Check emails together here so we can use this as the main thread.

I've reviewed the requests and the giving report, and worked through a proposed set of requirements and a provisional implementation plan. Both are attached, along with the initial assessment. The requirements include all 15 questions and proposed answers so you can see the reasoning and change anything that doesn't match what you need.

The proposed first delivery is:

1. Household reporting and filters. A dashboard table by connection status, with household totals, recorded Christian-status categories and giving participation. Clicking a count would open the matching household list with the same filters.
2. UniChurch Connect Group coverage. Abound's code currently includes the standard Connect Group type only; the existing Rock discovery records UniChurch's separate type. Your concern about missing coverage is supported by the code. Abound can recognise both while preserving their different Rock types. This is identified and planned; it has not been fixed or deployed yet.
3. Verification and data review. Reproduce the material giving-report figures with consistent definitions, and produce a review list for suspect household records.
4. Attendance discovery. Check what Sunday-service and Connect Group attendance Rock actually records, how complete it is and how far back it goes. Then scope the attendance/giving work from that evidence. First recorded attendance, group membership and someone's actual first visit need to remain distinct.

The main reporting proposal is to use family households for household counts, with giving attributed through Rock's giving-household relationships. Connection status and recorded Christian status would be separate. Among eligible adults, one recorded Christian would mean "Christian adult present"; all explicitly non-Christian would mean "All adults recorded non-Christian"; otherwise the household would be "Unknown". Children would not determine that classification. The exact Christian-status field and its availability through Rock still need verification.

Giving participation would use positive net actual gifts to the enabled funds during the last 12 completed calendar months, with the last completed month shown alongside. We'd show both all-household participation and participation among households with a recorded Christian adult, making the latter the main answer to your question. Existing "Healthy" giving status would remain a separate measure.

On the report: I agree that household counts are useful and that individual donors and households need separate labels. Some conclusions need correction or further checks:

- Central's 618 of 1,146 adults is about 54%, rather than the stated 59%.
- The overall people-to-households ratio doesn't establish how many households have one or two givers.
- Annual giver counts divided by one month's household counts don't establish the explanation about student flats.
- Xero and Abound need matching funds, periods and household identities before we can call them reconciled.
- Similar or blank household names can flag records for review, but aren't sufficient evidence for merging or retiring them.

I haven't independently reproduced the production counts yet, so I wouldn't treat the report's public headline or its adjusted household denominator as verified.

Could you review these five points in particular?

1. Are household reporting and UniChurch coverage the right first delivery, with attendance investigation alongside and attendance implementation following separately?
2. Are you happy to use the explicit Christian-status field independently of connection status, with the adult-only and unknown rules above?
3. For the initial household-stage rule, does Growing > Attending > Joining work? Other statuses would stay visible under "Other / needs classification". Where should Establishing in faith, Fringe and the remaining statuses sit if you want a fuller ordering?
4. Is household giving participation over the last 12 completed months the right headline, with participation among households with a recorded Christian adult primary and last-month figures alongside?
5. Are you happy for the first version to use current household membership/status when reporting historical giving, and to produce a data-quality review list before any staff-approved corrections in Rock?

The attachments are drafts for your input. I haven't committed to the report's 8 November cleanup date or a delivery date. Once we've incorporated your feedback and verified the source fields, we can finalise the implementation scope and sequence.

Thanks,
Tatai

## Attachments

- [Draft requirements and interview appendix](../brainstorms/2026-10-24-household-participation-requirements.md)
- [Provisional implementation plan](../plans/2026-10-24-001-household-participation-plan.md)
- [Initial request and giving-report assessment](2026-10-24-rowan-abound-request-assessment.md)
