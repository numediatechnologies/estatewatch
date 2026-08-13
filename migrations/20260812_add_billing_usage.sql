ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(30) NOT NULL DEFAULT 'free';
ALTER TABLE billing_payments ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES billing_documents(id);
CREATE TABLE IF NOT EXISTS billing_usage_monthly (
  user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(auth_subject) ON DELETE CASCADE,
  usage_month DATE NOT NULL,
  estate_views INT NOT NULL DEFAULT 0,
  pipeline_opportunities INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_month)
);
