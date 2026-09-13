# Twilio channel readiness (India demo) — D4

Checked live against the Twilio account whose `TWILIO_ACCOUNT_SID`/
`TWILIO_AUTH_TOKEN` are configured in `.env.local`, via read-only calls to
the Twilio REST API (`Accounts`, `IncomingPhoneNumbers`, `Balance`,
`messaging.twilio.com/v1/Services`) run on 2026-09-13. No numbers were
purchased, no messages were sent, and no account settings were changed by
these checks.

## Account snapshot (live, read-only)

| Field | Value |
|---|---|
| Friendly name | My First Twilio Account |
| Account status | `active` |
| Account type | **Trial** |
| Balance | `$0.00 USD` |
| Subaccounts | none (only the one account above) |
| Incoming phone numbers owned | **0** |
| Messaging Services configured | **0** (no DLT/sender-ID registration present) |

## Per-channel readiness

### Voice — **BLOCKED (not demo-ready)**

`TWILIO_VOICE_NUMBER` in `.env.local` is set to `+17372508034`, but the
live `IncomingPhoneNumbers` list for this account returns **zero**
numbers — that number is not currently owned/provisioned on this account,
so there is nothing to receive an inbound call or invoke the voice
recording-complete webhook. Twilio trial accounts cannot receive inbound
calls on a number they haven't purchased, and this account's trial
balance is $0.00. **Needs**: purchase (or reclaim) a Twilio voice-capable
number in the console/API, which typically requires either upgrading out
of trial or using trial credit if any exists (currently none — balance is
$0). This is a paid/account-affecting step and is **not something this
deploy pass performs**; it needs the user's own action in the Twilio
console.

### SMS — **BLOCKED (not demo-ready)**

Same root cause as Voice: `TWILIO_SMS_NUMBER` (`+17372508034`, same
number as Voice) is not among this account's owned incoming numbers per
the live check, and no Messaging Service exists, so there is no
DLT/sender-ID registration in place either (relevant for India SMS
compliance). **Needs**: purchase an SMS-capable number and, for
production-grade India SMS, complete DLT/sender-ID registration — both
console/carrier-side steps outside this deploy pass's reach.

### WhatsApp — **SANDBOX-READY, pending a live join-code test**

`TWILIO_WHATSAPP_NUMBER` in `.env.local` is a custom number (not Twilio's
public shared Sandbox number `whatsapp:+14155238886`), which normally
would suggest a dedicated/approved WhatsApp Business sender — but given
this account owns **zero** phone numbers and has no Messaging Service,
that cannot be a real approved WhatsApp Business sender yet; the value is
most likely a placeholder or copied-from-elsewhere number rather than a
provisioned channel on this account.

What **is** actually available on any Twilio trial account, including
this one, with no purchase required: Twilio's standard **WhatsApp
Sandbox**, opted into per-tester by texting a join code from a personal
WhatsApp number to Twilio's shared sandbox number
(`whatsapp:+14155238886`). This requires no phone-number purchase and no
DLT registration, so it is the one channel this account can realistically
demo without further account changes — but it has **not been opted into
or exercised live in this deploy pass** (that requires a real WhatsApp
message to be sent from a phone, which is an action for the user, not
something this pass fabricates).

## Verdict

| Channel | Status | Live-demo-ready? |
|---|---|---|
| Voice | No number owned on this account; $0 trial balance | No |
| SMS | No number owned on this account; no DLT/sender-ID registration | No |
| WhatsApp | Public Sandbox available (untested this pass); custom number in `.env.local` unconfirmed as a real approved sender | Sandbox-only, pending a live join-code test |

**None of the three channels were confirmed demo-ready by this check** —
this differs from the task's stated expectation that WhatsApp Sandbox
would be readily usable; the gap here is that this Twilio account has no
provisioned numbers/messaging service at all yet (a $0-balance trial
account), not a code or configuration problem. See "What's needed from
you" in the deploy status report for the exact next step (join the
Sandbox from a personal phone, or purchase a number) to close this out.
