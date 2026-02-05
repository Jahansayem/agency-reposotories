-- ============================================
-- Add Customer Link to Todos
-- ============================================
-- Purpose: Enable linking tasks to customers from the book of business
--
-- This allows:
-- 1. Quick customer context when viewing tasks
-- 2. Filtering tasks by customer
-- 3. Tracking customer interactions through tasks
-- 4. Creating tasks from cross-sell opportunities
--
-- Author: Claude Code Integration
-- Date: 2026-02-05
-- ============================================

-- Add customer_id column to todos table
-- References customer_insights for aggregated customer data
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customer_insights(id) ON DELETE SET NULL;

-- Add customer_name for quick display without join
-- (Denormalized for performance in list views)
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add customer_segment for quick badge display
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS customer_segment TEXT CHECK (
  customer_segment IS NULL OR
  customer_segment IN ('elite', 'premium', 'standard', 'entry')
);

-- Create index for customer lookup
CREATE INDEX IF NOT EXISTS idx_todos_customer_id
  ON todos(customer_id)
  WHERE customer_id IS NOT NULL;

-- Create index for customer name search in tasks
CREATE INDEX IF NOT EXISTS idx_todos_customer_name
  ON todos(customer_name)
  WHERE customer_name IS NOT NULL;

-- ============================================
-- Update cross_sell_opportunities to link back
-- ============================================

-- The task_id column already exists on cross_sell_opportunities
-- Add a trigger to auto-update customer_id on todos when created from opportunity

CREATE OR REPLACE FUNCTION link_todo_to_customer()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_segment TEXT;
BEGIN
  -- If customer_name is provided but customer_id is not, try to find the customer
  IF NEW.customer_name IS NOT NULL AND NEW.customer_id IS NULL THEN
    SELECT id, customer_name INTO v_customer_id, v_customer_name
    FROM customer_insights
    WHERE customer_name ILIKE NEW.customer_name
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      NEW.customer_id := v_customer_id;
    END IF;
  END IF;

  -- If customer_id is provided, populate denormalized fields
  IF NEW.customer_id IS NOT NULL AND NEW.customer_name IS NULL THEN
    SELECT
      ci.customer_name,
      CASE
        WHEN ci.total_premium >= 15000 OR ci.total_policies >= 4 THEN 'elite'
        WHEN ci.total_premium >= 7000 OR ci.total_policies >= 3 THEN 'premium'
        WHEN ci.total_premium >= 3000 OR ci.total_policies >= 2 THEN 'standard'
        ELSE 'entry'
      END
    INTO v_customer_name, v_segment
    FROM customer_insights ci
    WHERE ci.id = NEW.customer_id;

    IF v_customer_name IS NOT NULL THEN
      NEW.customer_name := v_customer_name;
      NEW.customer_segment := v_segment;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new todos
DROP TRIGGER IF EXISTS trigger_link_todo_to_customer ON todos;
CREATE TRIGGER trigger_link_todo_to_customer
  BEFORE INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION link_todo_to_customer();

-- ============================================
-- Helper function to create task from opportunity
-- ============================================

CREATE OR REPLACE FUNCTION create_task_from_opportunity(
  p_opportunity_id UUID,
  p_assigned_to TEXT,
  p_created_by TEXT,
  p_priority TEXT DEFAULT 'high'
)
RETURNS UUID AS $$
DECLARE
  v_opp RECORD;
  v_customer_id UUID;
  v_task_id UUID;
  v_task_text TEXT;
BEGIN
  -- Get opportunity details
  SELECT * INTO v_opp
  FROM cross_sell_opportunities
  WHERE id = p_opportunity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opportunity not found';
  END IF;

  -- Try to find customer in customer_insights
  SELECT id INTO v_customer_id
  FROM customer_insights
  WHERE customer_name = v_opp.customer_name
  LIMIT 1;

  -- Build task text
  v_task_text := format(
    'Contact %s about %s opportunity',
    v_opp.customer_name,
    v_opp.recommended_product
  );

  -- Create the task
  INSERT INTO todos (
    text,
    priority,
    assigned_to,
    created_by,
    due_date,
    customer_id,
    customer_name,
    customer_segment,
    notes
  ) VALUES (
    v_task_text,
    p_priority,
    p_assigned_to,
    p_created_by,
    v_opp.renewal_date,
    v_customer_id,
    v_opp.customer_name,
    CASE
      WHEN v_opp.current_premium >= 15000 OR v_opp.policy_count >= 4 THEN 'elite'
      WHEN v_opp.current_premium >= 7000 OR v_opp.policy_count >= 3 THEN 'premium'
      WHEN v_opp.current_premium >= 3000 OR v_opp.policy_count >= 2 THEN 'standard'
      ELSE 'entry'
    END,
    format(E'**Cross-sell Opportunity**\n\nCurrent: %s\nRecommended: %s\nPotential: $%s/yr\n\n**Talking Points:**\n- %s\n- %s\n- %s',
      v_opp.current_products,
      v_opp.recommended_product,
      v_opp.potential_premium_add,
      COALESCE(v_opp.talking_point_1, ''),
      COALESCE(v_opp.talking_point_2, ''),
      COALESCE(v_opp.talking_point_3, '')
    )
  )
  RETURNING id INTO v_task_id;

  -- Link the opportunity to the task
  UPDATE cross_sell_opportunities
  SET task_id = v_task_id
  WHERE id = p_opportunity_id;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments
-- ============================================

COMMENT ON COLUMN todos.customer_id IS 'Links task to a customer from customer_insights table';
COMMENT ON COLUMN todos.customer_name IS 'Denormalized customer name for quick display';
COMMENT ON COLUMN todos.customer_segment IS 'Customer tier: elite, premium, standard, entry';
COMMENT ON FUNCTION create_task_from_opportunity IS 'Creates a todo from a cross-sell opportunity and links them';
