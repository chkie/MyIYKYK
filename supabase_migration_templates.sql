-- Migration: Add fixed cost templates
-- Templates sind monat-unabhängige Standard-Fixkosten

-- Template Categories
CREATE TABLE IF NOT EXISTS fixed_cost_template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Template Items
CREATE TABLE IF NOT EXISTS fixed_cost_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    template_category_id UUID NOT NULL REFERENCES fixed_cost_template_categories (id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    split_mode TEXT NOT NULL DEFAULT 'income' CHECK (
        split_mode IN (
            'income',
            'me',
            'partner',
            'half'
        )
    ),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_items_category ON fixed_cost_template_items (template_category_id);

-- Enable RLS (Row Level Security)
ALTER TABLE fixed_cost_template_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE fixed_cost_template_items ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations (da wir ein Single-User-Tool mit Passwort-Gate haben)
CREATE POLICY "Enable all for template_categories" ON fixed_cost_template_categories FOR ALL USING (true);

CREATE POLICY "Enable all for template_items" ON fixed_cost_template_items FOR ALL USING (true);

-- Add a flag to existing fixed_cost_categories to mark template-based categories
ALTER TABLE fixed_cost_categories
ADD COLUMN IF NOT EXISTS is_from_template BOOLEAN DEFAULT false;

ALTER TABLE fixed_cost_categories
ADD COLUMN IF NOT EXISTS template_category_id UUID REFERENCES fixed_cost_template_categories (id) ON DELETE SET NULL;

-- Add flag to items
ALTER TABLE fixed_cost_items
ADD COLUMN IF NOT EXISTS is_from_template BOOLEAN DEFAULT false;

ALTER TABLE fixed_cost_items
ADD COLUMN IF NOT EXISTS template_item_id UUID REFERENCES fixed_cost_template_items (id) ON DELETE SET NULL;