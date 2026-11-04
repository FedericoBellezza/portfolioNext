-- =============================================================================
-- Fiscale: premio INAIL (autoliquidazione) tra i versamenti F24.
-- Non e' un contributo previdenziale: non si deduce dal reddito forfettario.
-- Come gli altri tipi (tranne 'other') vale un versamento per anno di competenza.
-- =============================================================================

alter type fiscale.tax_payment_kind add value if not exists 'inail_premium';
