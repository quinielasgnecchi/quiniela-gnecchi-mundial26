-- ============================================
-- QUINIELA GNECCHI MUNDIAL 2026
-- Pega TODO este texto en el SQL Editor de Supabase
-- ============================================

-- 1. TABLA: perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  favorite_team TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: fases del torneo
CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_open BOOLEAN DEFAULT false,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar fases iniciales
INSERT INTO phases (phase_key, name, is_open) VALUES
  ('groups', 'Fase de grupos', true),
  ('round_of_32', 'Treintaidosavos', false),
  ('round_of_16', 'Dieciseisavos', false),
  ('quarterfinals', 'Cuartos de final', false),
  ('semifinals', 'Semifinales', false),
  ('final', 'Final', false)
ON CONFLICT (phase_key) DO NOTHING;

-- 3. TABLA: partidos
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,
  group_name TEXT,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'groups',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: resultados de partidos (los llena el admin)
CREATE TABLE IF NOT EXISTS match_results (
  match_id INTEGER PRIMARY KEY REFERENCES matches(id),
  result TEXT CHECK (result IN ('home','draw','away')),
  home_score INTEGER,
  away_score INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: pronósticos de usuarios
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  phase TEXT NOT NULL DEFAULT 'groups',
  prediction TEXT CHECK (prediction IN ('home','draw','away')),
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- 6. TABLA: envíos de quiniela
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  predictions_count INTEGER DEFAULT 0,
  UNIQUE(user_id, phase)
);

-- 7. TABLA: puntos ganados por partido
CREATE TABLE IF NOT EXISTS points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id INTEGER NOT NULL REFERENCES matches(id),
  phase TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- 8. VISTA: resumen de puntos por usuario
CREATE OR REPLACE VIEW points_summary AS
SELECT
  user_id,
  SUM(points_earned) AS total_points,
  COUNT(*) FILTER (WHERE points_earned > 0) AS correct_predictions
FROM points
GROUP BY user_id;

-- 9. VISTA: ranking completo
CREATE OR REPLACE VIEW ranking_view AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.avatar_url,
  p.favorite_team,
  COALESCE(ps.total_points, 0) AS total_points,
  COALESCE(ps.correct_predictions, 0) AS correct_predictions,
  RANK() OVER (ORDER BY COALESCE(ps.total_points, 0) DESC) AS position
FROM profiles p
LEFT JOIN points_summary ps ON ps.user_id = p.id
WHERE p.role = 'user'
ORDER BY total_points DESC;

-- 10. FUNCIÓN: calcular puntos automáticamente
CREATE OR REPLACE FUNCTION recalculate_points()
RETURNS void AS $$
BEGIN
  DELETE FROM points WHERE phase = 'groups';
  
  INSERT INTO points (user_id, match_id, phase, points_earned)
  SELECT
    pred.user_id,
    pred.match_id,
    pred.phase,
    CASE WHEN pred.prediction = mr.result THEN 1 ELSE 0 END AS points_earned
  FROM predictions pred
  JOIN match_results mr ON mr.match_id = pred.match_id
  WHERE pred.phase = 'groups'
  ON CONFLICT (user_id, match_id) DO UPDATE SET points_earned = EXCLUDED.points_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEGURIDAD: habilitar Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuarios ven todos los perfiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios editan su propio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insertar perfil propio" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para predictions
CREATE POLICY "Ver pronósticos propios" ON predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar pronósticos propios" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar pronósticos propios" ON predictions FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para submissions
CREATE POLICY "Ver envío propio" ON submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insertar envío propio" ON submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar envío propio" ON submissions FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para puntos (todos pueden ver, solo sistema escribe)
CREATE POLICY "Ver todos los puntos" ON points FOR SELECT USING (true);

-- Políticas para fases (todos pueden leer)
CREATE POLICY "Ver fases" ON phases FOR SELECT USING (true);
CREATE POLICY "Admin edita fases" ON phases FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Políticas para resultados
CREATE POLICY "Ver resultados" ON match_results FOR SELECT USING (true);
CREATE POLICY "Admin guarda resultados" ON match_results FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- STORAGE: bucket para fotos de perfil
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ver avatares" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Subir avatar propio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Actualizar avatar propio" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- ¡LISTO! Ahora configura tu primer admin:
-- Reemplaza TU_EMAIL@CORREO.COM con tu correo
-- ============================================
-- UPDATE profiles SET role = 'admin' WHERE email = 'TU_EMAIL@CORREO.COM';
