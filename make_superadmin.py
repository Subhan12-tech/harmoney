# ============================================================================
# make_superadmin.py — apne account ko platform super-admin banao.
# Pehle app par NORMAL signup karo, phir ye chalao:
#     python make_superadmin.py your@email.com
# ============================================================================
import sys
from sqlmodel import Session, select
from db import engine, User, init_db

init_db()

if len(sys.argv) < 2:
    print("Usage: python make_superadmin.py your@email.com")
    sys.exit(1)

email = sys.argv[1].strip().lower()
with Session(engine) as s:
    u = s.exec(select(User).where(User.email == email)).first()
    if not u:
        print(f"No user found with email '{email}'. Sign up in the app first, then run this.")
        sys.exit(1)
    u.is_superadmin = True
    s.add(u); s.commit()
    print(f"Done. '{email}' is now a PLATFORM SUPER-ADMIN (full access to all companies).")
