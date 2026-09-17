-- coupons.is_hidden — admin toggle that suppresses a coupon from the customer-
-- facing "available coupons" listing without disabling it. Used for invite-only
-- coupons: the special-guest types the code in and it still applies, but it
-- isn't advertised on the buteak.in / TDS homepage rail.
--
-- Independent of is_active:
--   is_active=false → coupon never applies anywhere
--   is_hidden=true  → coupon still applies if the code is typed; just hidden
--                     from discovery endpoints. Admin always sees it.

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_coupons_is_hidden ON coupons (is_hidden) WHERE is_hidden = true;
