// football-data.org API integration
// Registrate gratis en https://www.football-data.org/client/register
// Pon tu API key en Cloudflare como: VITE_FOOTBALL_API_KEY

const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY ?? '831469173f0a456d86905f61175a8204'
const BASE_URL = 'https://api.football-data.org/v4'

// Código oficial para la Copa Mundial de la FIFA en la v4 de la API
const WC_ID = 'WC'

export interface LiveMatch {
  id: number
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: 'SCHEDULED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'TIMED'
  minute?: number
}

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  if (!API_KEY) return []
  try {
    const res = await fetch(`${BASE_URL}/competitions/${WC_ID}/matches?status=IN_PLAY,FINISHED,PAUSED`, {
      headers: { 'X-Auth-Token': API_KEY }
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.matches ?? []).map((m: any) => ({
      id: m.id,
      homeTeam: m.homeTeam?.name || m.homeTeam?.shortName || 'Desconocido',
      awayTeam: m.awayTeam?.name || m.awayTeam?.shortName || 'Desconocido',
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      status: m.status,
      minute: m.minute,
    }))
  } catch (error) {
    console.error('Error fetching live matches:', error)
    return []
  }
}

export async function fetchTodayMatches(): Promise<LiveMatch[]> {
  if (!API_KEY) return []
  const today = new Date().toISOString().split('T')[0]
  try {
    const res = await fetch(`${BASE_URL}/competitions/${WC_ID}/matches?dateFrom=${today}&dateTo=${today}`, {
      headers: { 'X-Auth-Token': API_KEY }
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.matches ?? []).map((m: any) => ({
      id: m.id,
      homeTeam: m.homeTeam?.name || m.homeTeam?.shortName || 'Desconocido',
      awayTeam: m.awayTeam?.name || m.awayTeam?.shortName || 'Desconocido',
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      status: m.status,
    }))
  } catch (error) {
    console.error('Error fetching today matches:', error)
    return []
  }
}
