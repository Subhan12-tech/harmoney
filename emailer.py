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

import os
import re
import smtplib
import ssl
from email.message import EmailMessage

SMTP_HOST = (os.getenv("SMTP_HOST") or "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT") or 587)
SMTP_USER = (os.getenv("SMTP_USER") or "").strip()
SMTP_PASSWORD = (os.getenv("SMTP_PASSWORD") or "").strip()
SMTP_FROM = (os.getenv("SMTP_FROM") or "").strip() or (f"Harmony <{SMTP_USER}>" if SMTP_USER else "")

APP_NAME = "Harmony"


def email_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def _send(to: str, subject: str, text: str, html: str) -> bool:
    """Returns True if the message was actually handed to an SMTP server."""
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
        print(f"SMTP send failed: {type(e).__name__}: {e}")
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
