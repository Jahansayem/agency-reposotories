-- ============================================
-- Seed Customer Insights Data
-- ============================================
-- Purpose: Populate customer_insights with sample data for testing
-- the customer linking feature.
--
-- Author: Claude Code Integration
-- Date: 2026-02-05
-- ============================================

-- Insert sample customers across all segments
INSERT INTO customer_insights (
  customer_name,
  customer_email,
  customer_phone,
  total_premium,
  total_policies,
  products_held,
  tenure_years,
  retention_risk,
  upcoming_renewal
) VALUES
  -- Elite tier customers ($15K+ premium or 4+ policies)
  ('Johnson Family Trust', 'johnson.family@email.com', '(555) 123-4567', 28500.00, 6, ARRAY['Auto', 'Home', 'Umbrella', 'Life', 'Boat', 'RV'], 12, 'low', NOW() + INTERVAL '45 days'),
  ('Martinez Holdings LLC', 'info@martinezholdings.com', '(555) 234-5678', 42000.00, 8, ARRAY['Commercial Auto', 'General Liability', 'Property', 'Workers Comp', 'Umbrella', 'Cyber', 'Directors & Officers', 'Employment Practices'], 8, 'low', NOW() + INTERVAL '30 days'),
  ('Sarah & Michael Chen', 'chen.family@gmail.com', '(555) 345-6789', 18750.00, 5, ARRAY['Auto', 'Home', 'Umbrella', 'Life', 'Jewelry'], 15, 'low', NOW() + INTERVAL '60 days'),
  ('Robert Williams Estate', 'rwilliams.estate@email.com', '(555) 456-7890', 22000.00, 4, ARRAY['Home', 'Auto', 'Umbrella', 'Collections'], 20, 'low', NOW() + INTERVAL '15 days'),

  -- Premium tier customers ($7K-$15K premium or 3 policies)
  ('Anderson Construction', 'office@andersonconstruction.com', '(555) 567-8901', 12500.00, 3, ARRAY['Commercial Auto', 'General Liability', 'Umbrella'], 6, 'medium', NOW() + INTERVAL '25 days'),
  ('Emily & David Park', 'parkfamily@email.com', '(555) 678-9012', 8200.00, 3, ARRAY['Auto', 'Home', 'Umbrella'], 4, 'low', NOW() + INTERVAL '90 days'),
  ('Thompson Dental Group', 'admin@thompsondental.com', '(555) 789-0123', 9800.00, 3, ARRAY['Professional Liability', 'Property', 'Workers Comp'], 7, 'low', NOW() + INTERVAL '120 days'),
  ('Jennifer Rodriguez', 'j.rodriguez@email.com', '(555) 890-1234', 7500.00, 3, ARRAY['Auto', 'Home', 'Life'], 5, 'medium', NOW() + INTERVAL '45 days'),
  ('Oak Valley Farms', 'contact@oakvalleyfarms.com', '(555) 901-2345', 11200.00, 3, ARRAY['Farm', 'Auto', 'Umbrella'], 18, 'low', NOW() + INTERVAL '75 days'),

  -- Standard tier customers ($3K-$7K premium or 2 policies)
  ('James Wilson', 'jwilson123@gmail.com', '(555) 012-3456', 4800.00, 2, ARRAY['Auto', 'Home'], 3, 'low', NOW() + INTERVAL '30 days'),
  ('Lisa Chang', 'lisa.chang@email.com', '(555) 123-4568', 3500.00, 2, ARRAY['Auto', 'Renters'], 2, 'medium', NOW() + INTERVAL '60 days'),
  ('Brown & Associates', 'info@brownassociates.com', '(555) 234-5679', 5200.00, 2, ARRAY['Professional Liability', 'General Liability'], 4, 'low', NOW() + INTERVAL '90 days'),
  ('Maria Santos', 'msantos@email.com', '(555) 345-6790', 4100.00, 2, ARRAY['Auto', 'Home'], 6, 'low', NOW() + INTERVAL '15 days'),
  ('Kevin OBrien', 'kobrien@email.com', '(555) 456-7891', 3800.00, 2, ARRAY['Auto', 'Motorcycle'], 1, 'medium', NOW() + INTERVAL '45 days'),
  ('Sunrise Bakery', 'orders@sunrisebakery.com', '(555) 567-8902', 6200.00, 2, ARRAY['Business Property', 'General Liability'], 5, 'low', NOW() + INTERVAL '120 days'),

  -- Entry tier customers (<$3K premium, 1 policy)
  ('Alex Taylor', 'alex.t@email.com', '(555) 678-9013', 1800.00, 1, ARRAY['Auto'], 1, 'high', NOW() + INTERVAL '30 days'),
  ('Crystal Motors', 'service@crystalmotors.com', '(555) 789-0124', 2400.00, 1, ARRAY['Commercial Auto'], 2, 'medium', NOW() + INTERVAL '60 days'),
  ('Sophie Martinez', 'sophie.m@gmail.com', '(555) 890-1235', 1200.00, 1, ARRAY['Renters'], 0, 'high', NOW() + INTERVAL '90 days'),
  ('Daniel Kim', 'dkim@email.com', '(555) 901-2346', 2100.00, 1, ARRAY['Auto'], 1, 'medium', NOW() + INTERVAL '45 days'),
  ('Fresh Start Cleaning', 'info@freshstartcleaning.com', '(555) 012-3457', 1500.00, 1, ARRAY['General Liability'], 1, 'high', NOW() + INTERVAL '15 days')

ON CONFLICT DO NOTHING;

-- Also add some cross-sell opportunities
INSERT INTO cross_sell_opportunities (
  customer_name,
  phone,
  email,
  priority_rank,
  priority_tier,
  priority_score,
  current_products,
  recommended_product,
  potential_premium_add,
  renewal_date,
  days_until_renewal,
  talking_point_1,
  talking_point_2,
  talking_point_3
) VALUES
  ('James Wilson', '(555) 012-3456', 'jwilson123@gmail.com', 1, 'HOT', 95, 'Auto, Home', 'Umbrella', 350.00, NOW() + INTERVAL '30 days', 25, 'High-value home would benefit from umbrella protection', 'Multiple vehicles increase liability exposure', 'Umbrella adds $1M protection for minimal cost'),
  ('Lisa Chang', '(555) 123-4568', 'lisa.chang@email.com', 2, 'HIGH', 85, 'Auto, Renters', 'Life', 400.00, NOW() + INTERVAL '60 days', 55, 'Young professional building financial foundation', 'Term life very affordable at current age', 'Consider bundling with existing policies for discount'),
  ('Alex Taylor', '(555) 678-9013', 'alex.t@email.com', 3, 'HIGH', 80, 'Auto', 'Renters', 250.00, NOW() + INTERVAL '30 days', 25, 'Currently renting apartment', 'Renters insurance protects belongings', 'Multi-policy discount available'),
  ('Kevin OBrien', '(555) 456-7891', 'kobrien@email.com', 4, 'MEDIUM', 70, 'Auto, Motorcycle', 'Home', 1200.00, NOW() + INTERVAL '45 days', 40, 'Recent homebuyer based on credit check', 'Currently missing home coverage', 'Bundle discount would apply'),
  ('Emily & David Park', '(555) 678-9012', 'parkfamily@email.com', 5, 'MEDIUM', 65, 'Auto, Home, Umbrella', 'Life', 800.00, NOW() + INTERVAL '90 days', 85, 'Growing family with new child', 'Term life protects family future', 'Consider 20-year term for college planning')

ON CONFLICT DO NOTHING;

-- Log the seeding
DO $$
BEGIN
  RAISE NOTICE 'Seeded % customer_insights records', (SELECT COUNT(*) FROM customer_insights);
  RAISE NOTICE 'Seeded % cross_sell_opportunities records', (SELECT COUNT(*) FROM cross_sell_opportunities);
END $$;
