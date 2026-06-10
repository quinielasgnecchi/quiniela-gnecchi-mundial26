const API_TOKEN = '831469173f0a456d86905f61175a8204';
const BASE_URL = 'https://api.football-data.org/v4';

export async function fetchLiveMatches() {
  try {
    const response = await fetch(`${BASE_URL}/competitions/WC/matches`, {
      headers: { 'X-Auth-Token': API_TOKEN },
    });
    
    if (!response.ok) {
      throw new Error(`Error de API: ${response.status}`);
    }
    
    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error('Error obteniendo partidos de football-data.org:', error);
    return [];
  }
}
