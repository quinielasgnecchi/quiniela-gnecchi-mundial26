export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  favorite_team?: string
  role: 'user' | 'admin'
  created_at: string
}

export interface Match {
  id: number
  group_name: string
  match_date: string
  match_time: string
  home_team: string
  away_team: string
  home_score?: number
  away_score?: number
  phase: 'groups' | 'round_of_32' | 'round_of_16' | 'quarterfinals' | 'semifinals' | 'final'
  status: 'upcoming' | 'live' | 'finished'
}

export interface Prediction {
  id: string
  user_id: string
  match_id: number
  prediction: 'home' | 'draw' | 'away'
  home_score?: number
  away_score?: number
  points_earned?: number
  created_at: string
}

export interface RankingEntry {
  user_id: string
  full_name: string
  avatar_url?: string
  favorite_team?: string
  total_points: number
  correct_predictions: number
  position: number
}

export interface Phase {
  id: string
  name: string
  phase_key: string
  is_open: boolean
  deadline?: string
}

export const TEAMS: { name: string; flag: string }[] = [
  { name: 'México', flag: '🇲🇽' },
  { name: 'Sudáfrica', flag: '🇿🇦' },
  { name: 'Corea del Sur', flag: '🇰🇷' },
  { name: 'Chequia', flag: '🇨🇿' },
  { name: 'Canadá', flag: '🇨🇦' },
  { name: 'Bosnia y Herzegovina', flag: '🇧🇦' },
  { name: 'Catar', flag: '🇶🇦' },
  { name: 'Suiza', flag: '🇨🇭' },
  { name: 'Brasil', flag: '🇧🇷' },
  { name: 'Marruecos', flag: '🇲🇦' },
  { name: 'Haití', flag: '🇭🇹' },
  { name: 'Escocia', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'Estados Unidos', flag: '🇺🇸' },
  { name: 'Paraguay', flag: '🇵🇾' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Turquía', flag: '🇹🇷' },
  { name: 'Alemania', flag: '🇩🇪' },
  { name: 'Curazao', flag: '🇨🇼' },
  { name: 'Costa de Marfil', flag: '🇨🇮' },
  { name: 'Ecuador', flag: '🇪🇨' },
  { name: 'Países Bajos', flag: '🇳🇱' },
  { name: 'Japón', flag: '🇯🇵' },
  { name: 'Suecia', flag: '🇸🇪' },
  { name: 'Túnez', flag: '🇹🇳' },
  { name: 'Bélgica', flag: '🇧🇪' },
  { name: 'Egipto', flag: '🇪🇬' },
  { name: 'Irán', flag: '🇮🇷' },
  { name: 'Nueva Zelanda', flag: '🇳🇿' },
  { name: 'España', flag: '🇪🇸' },
  { name: 'Cabo Verde', flag: '🇨🇻' },
  { name: 'Arabia Saudita', flag: '🇸🇦' },
  { name: 'Uruguay', flag: '🇺🇾' },
  { name: 'Francia', flag: '🇫🇷' },
  { name: 'Senegal', flag: '🇸🇳' },
  { name: 'Irak', flag: '🇮🇶' },
  { name: 'Noruega', flag: '🇳🇴' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Argelia', flag: '🇩🇿' },
  { name: 'Austria', flag: '🇦🇹' },
  { name: 'Jordania', flag: '🇯🇴' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'RD Congo', flag: '🇨🇩' },
  { name: 'Uzbekistán', flag: '🇺🇿' },
  { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Croacia', flag: '🇭🇷' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Panamá', flag: '🇵🇦' },
]

export function getTeamFlag(name: string): string {
  return TEAMS.find(t => t.name === name)?.flag ?? '🏳️'
}
