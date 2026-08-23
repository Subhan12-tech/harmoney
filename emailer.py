# ============================================================================
# EMAIL — SMTP sending (Gmail or any provider)
# ----------------------------------------------------------------------------
# Configured entirely from the environment:
#   SMTP_HOST      smtp.gmail.com
#   SMTP_PORT      587
#   SMTP_USER      you@gmail.com
#   SMTP_PASSWORD  a Google App Password, NOT your account password
#   SMTP_FROM      optional display name, e.g. "Harmony <you@gmail.com>"
#
# When SMTP is not configured the code is printed to the log instead of sent.
# That keeps local development working with no account anywhere, and it is why
# email_configured() exists - callers tell the user which of the two happened
# rather than claiming an email was sent when none was.
# ============================================================================

import json
import os
import re
import smtplib
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage

# ----------------------------------------------------------------------------
# Two transports. Resend wins when configured.
# ----------------------------------------------------------------------------
# Resend sends over HTTPS. That matters because several hosts - Render's free
# tier among them - block outbound SMTP ports entirely to prevent spam, so
# Gmail SMTP cannot work there no matter how it is configured. HTTPS is never
# blocked, so this is the transport that actually works on a free deployment.
# Brevo verifies a single SENDER ADDRESS rather than a whole domain, so a plain
# Gmail can send to anyone once confirmed. That is the difference that matters
# without a domain: Resend's shared sender only reaches the account owner, which
# is useless for a demo where other people sign up. Free tier is 300/day.
BREVO_API_KEY = (os.getenv("BREVO_API_KEY") or "").strip()
BREVO_FROM = (os.getenv("BREVO_FROM") or "").strip()      # the verified sender address
BREVO_FROM_NAME = (os.getenv("BREVO_FROM_NAME") or "Harmony").strip()

RESEND_API_KEY = (os.getenv("RESEND_API_KEY") or "").strip()

# Resend will only send from a domain you have verified. Until you have one, its
# shared onboarding sender works but can ONLY deliver to the address that owns
# the Resend account - which is enough to verify your own signup and receive
# owner notifications.
RESEND_FROM = (os.getenv("RESEND_FROM") or "").strip() or "Harmony <onboarding@resend.dev>"

SMTP_HOST = (os.getenv("SMTP_HOST") or "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT") or 587)
SMTP_USER = (os.getenv("SMTP_USER") or "").strip()
SMTP_PASSWORD = (os.getenv("SMTP_PASSWORD") or "").strip()
SMTP_FROM = (os.getenv("SMTP_FROM") or "").strip() or (f"Harmony <{SMTP_USER}>" if SMTP_USER else "")

APP_NAME = "Harmony"

# Whether email actually WORKS, as opposed to merely being configured. Set once
# at startup by verify_connection(). The distinction matters: SMTP can be fully
# configured and still be unreachable - Render's free tier blocks outbound SMTP
# ports, for instance - and gating signup on "configured" locks every user out
# of a product whose verification email can never arrive.
_EMAIL_HEALTHY: bool | None = None

# Why the most recent send failed, for surfacing to the caller. Provider error
# text only - never credentials. Without this the reason lives solely in the
# server log, which is exactly where you cannot reach it on a hosted deploy.
LAST_SEND_ERROR: str | None = None


def last_send_error() -> str | None:
    return LAST_SEND_ERROR


def email_working() -> bool:
    """True only if a real SMTP login succeeded at startup.

    Falls back to the configuration check when startup verification never ran,
    so importing this module standalone still behaves sensibly.
    """
    if _EMAIL_HEALTHY is None:
        return email_configured()
    return _EMAIL_HEALTHY


def email_configured() -> bool:
    return (bool(BREVO_API_KEY and BREVO_FROM) or bool(RESEND_API_KEY)
            or bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD))


def transport() -> str:
    if BREVO_API_KEY and BREVO_FROM:
        return "brevo"
    if RESEND_API_KEY:
        return "resend"
    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        return "smtp"
    return "none"


def _send_brevo(to: str, subject: str, text: str, html: str) -> tuple[bool, str]:
    payload = json.dumps({
        "sender": {"name": BREVO_FROM_NAME, "email": BREVO_FROM},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": text,
        "htmlContent": html,
    }).encode()
    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email", data=payload, method="POST",
        headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json",
                 "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return (200 <= r.status < 300), "ok"
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:300]
        if e.code == 401:
            return False, "Brevo rejected BREVO_API_KEY."
        # Brevo refuses a sender it has not confirmed. That is a one-click fix
        # in their dashboard, so name it rather than passing the raw body along.
        if e.code == 400 and "sender" in body.lower():
            return False, (f"Brevo will not send from {BREVO_FROM}. Confirm that address under "
                           "Senders, Domains & Dedicated IPs in the Brevo dashboard, then retry. " + body)
        return False, f"Brevo HTTP {e.code}: {body}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def _send_resend(to: str, subject: str, text: str, html: str) -> tuple[bool, str]:
    payload = json.dumps({"from": RESEND_FROM, "to": [to], "subject": subject,
                          "text": text, "html": html}).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails", data=payload, method="POST",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}",
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return (200 <= r.status < 300), "ok"
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:300]
        # 403 here is nearly always the unverified-domain rule: the shared
        # onboarding sender may only deliver to the account owner's address.
        if e.code == 403:
            return False, ("Resend rejected the recipient. The shared onboarding sender can only "
                           "email the address that owns the Resend account. Verify a domain at "
                           "resend.com/domains and set RESEND_FROM to an address on it. " + body)
        return False, f"Resend HTTP {e.code}: {body}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def config_problem() -> str | None:
    """Why email will not work, in one sentence, or None if it looks fine.

    Checked at startup and surfaced by /healthz, because the failure mode is
    otherwise silent: verification is skipped when SMTP is unconfigured, so
    signup keeps working and nothing says the codes are not being sent.
    """
    if BREVO_API_KEY and not BREVO_FROM:
        return "BREVO_API_KEY is set but BREVO_FROM is not - Brevo needs the verified sender address."
    if (BREVO_API_KEY and BREVO_FROM) or RESEND_API_KEY:
        return None          # validated for real by verify_connection()

    missing = [n for n, v in (("SMTP_HOST", SMTP_HOST), ("SMTP_USER", SMTP_USER),
                              ("SMTP_PASSWORD", SMTP_PASSWORD)) if not v]
    if missing:
        return ("not configured - missing " + ", ".join(missing) +
                ". On a host that blocks SMTP (Render free tier does), set RESEND_API_KEY instead.")

    # Gmail rejects a normal account password over SMTP. App Passwords are 16
    # characters, usually shown in four groups of four.
    if "gmail" in SMTP_HOST.lower():
        pw = SMTP_PASSWORD.replace(" ", "")
        if len(pw) != 16:
            return ("SMTP_PASSWORD does not look like a Google App Password (16 characters). "
                    "Gmail rejects normal account passwords - create one at "
                    "myaccount.google.com/apppasswords")
    if SMTP_PORT not in (25, 465, 587, 2525):
        return f"SMTP_PORT {SMTP_PORT} is unusual; Gmail uses 587 (STARTTLS) or 465 (SSL)"
    return None


def verify_connection() -> tuple[bool, str]:
    """Actually log in to the SMTP server. Used at startup so a bad password is
    reported once, at boot, instead of silently on every signup."""
    global _EMAIL_HEALTHY
    if not email_configured():
        _EMAIL_HEALTHY = False
        return False, "not configured"

    if BREVO_API_KEY and BREVO_FROM:
        req = urllib.request.Request(
            "https://api.brevo.com/v3/account",
            headers={"api-key": BREVO_API_KEY, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15):
                _EMAIL_HEALTHY = True
                return True, "ok (brevo)"
        except urllib.error.HTTPError as e:
            _EMAIL_HEALTHY = e.code not in (401, 403)
            if e.code in (401, 403):
                return False, "Brevo rejected BREVO_API_KEY"
            return True, "ok (brevo)"
        except Exception as e:
            _EMAIL_HEALTHY = False
            return False, f"Brevo unreachable: {type(e).__name__}: {e}"

    if RESEND_API_KEY:
        # There is no send-nothing endpoint a SENDING-ONLY key can call. /domains
        # needs Full access, so probing it rejects a perfectly good sending key -
        # which is exactly the failure this check caused. Treat 401/403 as
        # "cannot verify from here" rather than "bad key", and let the first real
        # send be the judge. Reachability is still worth confirming.
        req = urllib.request.Request(
            "https://api.resend.com/domains",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"})
        try:
            with urllib.request.urlopen(req, timeout=15):
                _EMAIL_HEALTHY = True
                return True, "ok (resend, key verified)"
        except urllib.error.HTTPError as e:
            _EMAIL_HEALTHY = True
            if e.code in (401, 403):
                return True, ("ok (resend, reachable; key is sending-only so it could not be "
                              "verified here - a send will confirm it)")
            return True, "ok (resend)"
        except Exception as e:
            _EMAIL_HEALTHY = False
            return False, f"Resend unreachable: {type(e).__name__}: {e}"
    try:
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15,
                                  context=ssl.create_default_context()) as s:
                s.login(SMTP_USER, SMTP_PASSWORD)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as s:
                s.starttls(context=ssl.create_default_context())
                s.login(SMTP_USER, SMTP_PASSWORD)
        _EMAIL_HEALTHY = True
        return True, "ok"
    except smtplib.SMTPAuthenticationError:
        _EMAIL_HEALTHY = False
        return False, ("authentication rejected - for Gmail use an App Password "
                       "(myaccount.google.com/apppasswords), not the account password")
    except Exception as e:
        _EMAIL_HEALTHY = False
        return False, f"{type(e).__name__}: {e}"


def _send(to: str, subject: str, text: str, html: str) -> bool:
    """Returns True if the message was actually accepted by a provider."""
    global _EMAIL_HEALTHY, LAST_SEND_ERROR

    if BREVO_API_KEY and BREVO_FROM:
        ok, detail = _send_brevo(to, subject, text, html)
        LAST_SEND_ERROR = None if ok else detail
        if not ok:
            print(f"Brevo send failed: {detail}")
            if "401" in detail or "rejected" in detail.lower():
                _EMAIL_HEALTHY = False
        return ok

    if RESEND_API_KEY:
        ok, detail = _send_resend(to, subject, text, html)
        LAST_SEND_ERROR = None if ok else detail
        if not ok:
            print(f"Resend send failed: {detail}")
            # A real send is the only authoritative test. A rejected key means
            # email is not working, and signup must stop demanding a code that
            # will never arrive.
            if "401" in detail or "403" in detail or "api_key" in detail.lower():
                _EMAIL_HEALTHY = False
        return ok

    if not email_configured():
        # Not an error: this is the documented development path.
        print(f"[email not configured] would send to {to}: {subject}\n{text}")
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    try:
        # 465 is implicit TLS; 587 is STARTTLS. Gmail supports both, and picking
        # the wrong one for the port hangs rather than failing cleanly.
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20,
                                  context=ssl.create_default_context()) as s:
                s.login(SMTP_USER, SMTP_PASSWORD)
                s.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
                s.starttls(context=ssl.create_default_context())
                s.login(SMTP_USER, SMTP_PASSWORD)
                s.send_message(msg)
        return True
    except smtplib.SMTPAuthenticationError:
        # Overwhelmingly the cause with Gmail: a normal password was used where
        # an App Password is required, or 2FA is off so App Passwords cannot exist.
        print("SMTP auth failed. For Gmail use an App Password (myaccount.google.com/apppasswords), "
              "not your account password, and make sure 2-Step Verification is on.")
        return False
    except Exception as e:
        LAST_SEND_ERROR = f"{type(e).__name__}: {e}"
        print(f"SMTP send failed: {LAST_SEND_ERROR}")
        return False


def _shell(title: str, body_html: str) -> str:
    # Deliberately plain: table-free, inline styles, no images. Anything cleverer
    # renders unpredictably across mail clients and trips spam heuristics.
    return f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
            max-width:480px;margin:0 auto;padding:28px 24px;color:#1a1a1a">
  <div style="font-size:17px;font-weight:700;margin-bottom:22px">{APP_NAME}</div>
  <div style="font-size:15px;font-weight:600;margin-bottom:12px">{title}</div>
  {body_html}
  <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e6e6e6;
              font-size:12px;color:#777">
    {APP_NAME} — disclosure consistency. If you did not request this, ignore this email.
  </div>
</div>"""


def send_verification_code(to: str, code: str, minutes: int) -> bool:
    subject = f"{code} is your {APP_NAME} verification code"
    text = (f"Your {APP_NAME} verification code is {code}.\n\n"
            f"It expires in {minutes} minutes. If you did not request it, ignore this email.")
    html = _shell(
        "Confirm your email address",
        f"""<p style="font-size:14px;line-height:1.6;margin:0 0 18px">
             Enter this code to finish setting up your workspace.</p>
           <div style="font-size:30px;font-weight:700;letter-spacing:.16em;
                       padding:14px 0;text-align:center;background:#f5f7f9;border-radius:8px">
             {code}</div>
           <p style="font-size:12.5px;color:#666;margin:14px 0 0">
             Expires in {minutes} minutes.</p>""")
    return _send(to, subject, text, html)


def send_workspace_approved(to: str, org_name: str, url: str) -> bool:
    subject = f"Your {APP_NAME} workspace is ready"
    text = (f"{org_name} has been activated. Sign in at {url}")
    html = _shell(
        "Your workspace has been activated",
        f"""<p style="font-size:14px;line-height:1.6;margin:0 0 18px">
             <strong>{org_name}</strong> is approved and ready to use.</p>
           <a href="{url}" style="display:inline-block;background:#0b7285;color:#fff;
              text-decoration:none;padding:11px 20px;border-radius:7px;font-size:14px">
              Open {APP_NAME}</a>""")
    return _send(to, subject, text, html)


def send_signup_notice(to: str, org_name: str, requester: str, url: str) -> bool:
    """Tells the platform owner that someone is waiting for approval."""
    subject = f"New {APP_NAME} signup: {org_name}"
    text = f"{requester} signed up for {org_name} and is awaiting approval.\n\nApprove at {url}"
    html = _shell(
        "Someone is waiting for approval",
        f"""<p style="font-size:14px;line-height:1.6;margin:0 0 6px">
             <strong>{org_name}</strong></p>
           <p style="font-size:13px;color:#555;margin:0 0 18px">{requester}</p>
           <a href="{url}" style="display:inline-block;background:#0b7285;color:#fff;
              text-decoration:none;padding:11px 20px;border-radius:7px;font-size:14px">
              Review the request</a>""")
    return _send(to, subject, text, html)


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def looks_like_email(value: str) -> bool:
    return bool(EMAIL_RE.match((value or "").strip()))
