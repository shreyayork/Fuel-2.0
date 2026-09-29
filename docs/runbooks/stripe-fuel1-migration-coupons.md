# Stripe coupons — Fuel 1.0 / promo campaigns

**Primary workflow:** Super Admin → **Coupons** (`/super-admin/coupons`).
Creates Stripe Coupons + unique Promotion Codes via API, emails codes with SES,
tracks send/redeem status in Postgres.

**Fallback:** Stripe Dashboard remains available for audit. Do not put secrets or
real customer codes in this repo.

## App behavior (Checkout)

| Path | Promo box? |
|------|------------|
| `createSubscriptionCheckout` (Free → Pro) | Yes — `allow_promotion_codes: true` |
| `createTopUpCheckout` | No |
| Billing Portal / cycle change | No |

No code entered → catalog price unchanged. Webhook Pro activation unchanged;
redemption rows update when a known Promotion Code is used.

## Super Admin flow

1. **New campaign** — benefit (`percent_off` or `amount_off`), duration
   (`once` / `repeating` / `forever`), optional redeem-by, optional restrict to
   Pro monthly/annual Price products. Creates Stripe Coupon (coupon-level max
   redemptions left unlimited).
2. **Paste emails** → **Generate** — unique `PREFIX-{suffix}` Promotion Codes,
   `max_redemptions: 1`, **no Customer restriction**. Idempotent per
   `(campaign, email)`. Max 500 emails per request; Stripe calls batched.
3. **Email unsent / failed** or per-row **Resend** — SES branded email with code
   + upgrade instructions. Send status tracked separately from redemption.
4. **Redeemed** — set from `checkout.session.completed` when discount present
   and promotion code matches a recipient row.

## Ops rules (still true)

- Prefer **no Customer** on Promotion Codes (email match ≠ `cus_…` match).
- Put one-time limits on **Promotion Codes**, not Coupon max = 1 for multi-user.
- Overlapping campaigns for the same email are **allowed** (two valid codes).
- Test vs live follows env Stripe keys (`STRIPE_SECRET_KEY` / Secrets Manager).

## Manual Dashboard troubleshooting

See historical notes: Checkout “This code is invalid” with Customer restriction
set → clear Customer or match exact `accounts.stripe_customer_id` `cus_…`.

## Schema

- `coupon_campaigns` — campaign + `stripe_coupon_id`
- `coupon_recipients` — email, code, send status, redemption fields

Migration: `0081_coupon_campaigns.sql`.
