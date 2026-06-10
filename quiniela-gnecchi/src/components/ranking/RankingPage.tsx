async function fetchRanking() {
  // Al consultar directamente 'profiles', garantizas traer a todos los registrados
  // incluso si su puntuación es null o 0.
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, points') // Asumiendo que guardas la suma de puntos en profiles
    .order('points', { ascending: false, nullsFirst: false })

  if (error) return console.error(error)
  
  // Mapeas los datos garantizando fallback visual en ceros
  return data.map(profile => ({
    name: profile.full_name || 'Usuario',
    avatar: profile.avatar_url || null,
    score: profile.points ?? 0
  }))
}
