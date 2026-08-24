-- Migration: Onboarding vragen en antwoorden per offerte

CREATE TABLE onboarding_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offerte_id UUID REFERENCES offertes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  hint TEXT,
  answer_type TEXT DEFAULT 'text' CHECK (answer_type IN ('text', 'choice', 'yesno')),
  options JSONB,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE onboarding_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES onboarding_questions(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(question_id, client_id)
);

ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients see own questions" ON onboarding_questions
  FOR SELECT USING (
    offerte_id IN (
      SELECT o.id FROM offertes o
      JOIN clients c ON c.id = o.client_id
      WHERE c.email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Clients manage own answers" ON onboarding_answers
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  ) WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE email = auth.jwt() ->> 'email')
  );

CREATE INDEX idx_onboarding_questions_offerte ON onboarding_questions(offerte_id);
CREATE INDEX idx_onboarding_answers_question ON onboarding_answers(question_id);
CREATE INDEX idx_onboarding_answers_client ON onboarding_answers(client_id);
