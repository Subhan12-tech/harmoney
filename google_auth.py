# ============================================================================
# GOOGLE SIGN-IN — verify a Google ID token, locally.
# ----------------------------------------------------------------------------
# The frontend uses Google Identity Services: the user clicks "Continue with
# Google", Google hands the browser a signed ID token (a JWT), and the browser
# posts it here. This module proves the token is real before we trust a single
# claim in it.
#
# Verified LOCALLY against Google's published signing keys rather than by
# calling Google's tokeninfo endpoint on every login. Local verification is what
# Google recommends: no per-login round trip, no rate limit, and the keys are
# cached for an hour. A token is only accepted if its signature checks out AND
# its audience is OUR client id - without the audience check, a token minted for
# any other Google app would be accepted, which is a full account-takeover hole.
# ============================================================================

import json
import time
import urllib.request

from jose import jwt

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"]

_certs_cache: dict = {"keys": None, "expires": 0.0}


def _jwks(force: bool = False) -> list:
    """Google's current signing keys (JWKS), cached for an hour."""
    if not force and _certs_cache["keys"] and time.time() < _certs_cache["expires"]:
        return _certs_cache["keys"]
    with urllib.request.urlopen(GOOGLE_CERTS_URL, timeout=10) as r:
        data = json.loads(r.read().decode())
    _certs_cache["keys"] = data.get("keys", [])
    _certs_cache["expires"] = time.time() + 3600
    return _certs_cache["keys"]


def _key_for(kid: str) -> dict | None:
    key = next((k for k in _jwks() if k.get("kid") == kid), None)
    if key is None:
        # A key we do not know can mean Google rotated theirs since we cached.
        # Refresh once before giving up.
        key = next((k for k in _jwks(force=True) if k.get("kid") == kid), None)
    return key


def verify_google_token(credential: str, client_id: str) -> dict:
    """Return the verified claims, or raise ValueError.

    Checks the signature against Google's keys, that the audience is our own
    client id, and that the issuer is Google. jose enforces expiry.
    """
    if not credential:
        raise ValueError("No credential supplied.")
    if not client_id:
        raise ValueError("Google sign-in is not configured on this server.")

    try:
        header = jwt.get_unverified_header(credential)
    except Exception as e:
        raise ValueError(f"Malformed token: {e}")

    key = _key_for(header.get("kid", ""))
    if key is None:
        raise ValueError("Token was not signed by a recognised Google key.")

    try:
        claims = jwt.decode(
            credential, key, algorithms=["RS256"],
            audience=client_id, issuer=GOOGLE_ISSUERS,
        )
    except Exception as e:
        # jose raises for a bad signature, wrong audience, wrong issuer, expiry.
        raise ValueError(f"Google token rejected: {e}")

    if not claims.get("email"):
        raise ValueError("Google token carried no email address.")
    return claims
