# Harmony — Test Guide (kaise check karein system sahi chal raha hai)

Ye guide batati hai ke har test draft se **kya expect karna hai**. Agar system
in ke qareeb result de, matlab sahi kaam kar raha hai.

---

## Kaise run karein

```bash
python harmony.py
```

1. Past statements ka path do:
   ```
   data/sample/history
   ```
2. Phir `data/sample/drafts/` mein se kisi ek file ka **poora text copy-paste** karo.
3. Report par pehle `no` (reject) try karo — dekho system dobara pass lagata hai (back-edge).
   Phir dubara chala kar `yes` (approve) karo — safe final version banni chahiye.
4. Har draft ke liye alag run behtar hai (taake state mix na ho). Nikalne ke liye `exit`.

> Note: rating LLM deta hai, is liye number thoda upar-neeche ho sakta hai. Aham ye
> hai ke system **sahi issue pakde** aur consistent draft ko **saaf** kahe.

---

## History mein kya facts hain (jin se compare hota hai)

- Full-year growth = **mid-single-digit** (double-digit NAHI)
- AI analytics platform = **early access / experimental**, GA target **Q4** (production-ready / GA NAHI)
- Q1 revenue = **~$120 million**, up ~6%
- Enterprise customers = **~400**
- Dividend = **no change**

---

## Test cases aur expected result

| File | Kya test karta hai | Expected inconsistencies | Expected rating |
|------|--------------------|--------------------------|-----------------|
| **01_clear_inconsistency.txt** | 2 saaf contradictions | "double-digit" vs mid-single-digit; "production-ready / generally available" vs early-access | **Low** (approx 2–4/10) |
| **02_consistent.txt** | Sab kuch history se aligned | Koi nahi (ya bohat mamooli) | **High** (approx 9–10/10) |
| **03_subtle_number_mismatch.txt** | Chhota number farq | Revenue "$130M" vs history "$120M" pakadna chahiye | **Medium** (approx 5–7/10) |
| **04_multiple_issues.txt** | 4 alag issues ek saath | double-digit; GA; "600 customers" vs 400; "increased dividend" vs no change | **Low** (approx 1–3/10) |
| **05_new_topic_no_evidence.txt** | Aisi baat jo history mein hai hi nahi (Berlin office) | **Koi contradiction NAHI** — system ko jhoota alarm nahi dena chahiye | **High** (approx 8–10/10) |

---

## Pass / Fail — kaise samjhein

**PASS (system theek hai) agar:**
- 01 aur 04 par **low rating** aur sahi issues list hon.
- 02 par **high rating** aur "consistent / aligned" wali baat ho.
- 03 par **$130M vs $120M** wala mismatch pakda jaye.
- 05 par koi banaya-hua (hallucinated) contradiction **na** aaye.
- Reject karne par graph **dobara** chale, aur 2 baar reject par ruk jaye (retry cap).
- Approve karne par ek **safe final version** bane.

**Dhyan dene wali baat (FAIL signals):**
- 02 ya 05 par jhoota contradiction aa raha hai → prompt thoda sakht karo (false positive).
- 03 ka number miss ho raha hai → `retrieve_context` mein `k` barha do (zyada evidence).
- Koi crash → error mujhe bata dena, ya library version check karo.

---

## Bonus: back-edge (loop) ka test

1. Koi bhi draft daalo → report aaye → `no` likho.
   - Console mein "Human Rejected. Sending back for another pass." aana chahiye,
     aur report **dobara** banni chahiye. (Yehi back-edge hai.)
2. Dubara `no` likho.
   - Ab `retry_count >= 2` → supervisor **FINISH** kar dega (loop guard kaam kar rahi hai).

---

## Naye features ka test (is version mein)

- **Persistence:** ek baar `data/sample/history` ingest karo, program band karo, phir chalao —
  ab "Loaded N chunks from the local database" aana chahiye (dobara ingest ki zaroorat nahi).
- **Faithfulness (critic):** draft 05 (Berlin, history mein nahi) par critic ko koi jhoota
  contradiction pass NAHI karna chahiye. Console mein "Critic (faithfulness)" block aur
  "verified / unverified" count dikhega.
- **Approved -> history:** koi draft approve karo (`yes`). Uske baad woh approved version DB mein
  save ho jata hai — agli baar us se related draft usi se bhi compare hoga.
