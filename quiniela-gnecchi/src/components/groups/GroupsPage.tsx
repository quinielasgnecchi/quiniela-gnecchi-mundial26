const handleSave = async () => {
    if (!user || hasSubmitted) return

    if (completedMatches < totalMatches) {
      alert(`⚠️ Debes completar todos los partidos antes de enviar. Te faltan ${totalMatches - completedMatches} pronósticos.`)
      return
    }

    const confirmSubmit = window.confirm("🚨 ¿Estás seguro de enviar tus respuestas? Una vez enviadas, NO podrás modificarlas bajo ninguna circunstancia.")
    if (!confirmSubmit) return

    setSaving(true)

    try {
      const payload = dbMatches.map((match) => ({
        user_id: user.id,
        match_id: match.id, 
        prediction: predictions[match.id] || '',
        phase: 'groups'
      }))

      // 1. Guardar predicciones en Supabase
      const { error: upsertError } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id,match_id' })

      if (upsertError) throw upsertError

      // 2. Registrar el envío oficial de la fase
      await supabase.from('submissions').upsert({
        user_id: user.id,
        phase: 'groups',
        predictions_count: payload.length,
        submitted_at: new Date().toISOString()
      }, { onConflict: 'user_id,phase' })

      // 3. LLAMADO AL ENVÍO DE CORREO AUTOMÁTICO
      // Preparamos un formato de texto limpio con los partidos y los pronósticos del usuario
      const formatPrediction = (pred: string) => {
        if (pred === 'home') return 'Gana Local'
        if (pred === 'away') return 'Gana Visitante'
        return 'Empate'
      }

      const resumenPronosticos = dbMatches.map(m => 
        `Partido #${m.id} (${m.group_name}): ${m.home_team} vs ${m.away_team} -> Tu Pronóstico: ${formatPrediction(predictions[m.id])}`
      ).join('\n')

      // Invocamos la Edge Function de Supabase pasándole los datos
      await supabase.functions.invoke('send-confirmation-email', {
        body: {
          to_email: user.email,
          user_name: user.user_metadata?.full_name || 'Competidor',
          summary: resumenPronosticos
        }
      })

      // Bloqueo local en el navegador
      localStorage.setItem('quiniela_groups_submitted', 'true')
      setHasSubmitted(true)
      
      alert("🚀 ¡Tus pronósticos se han enviado con éxito y se ha mandado una copia a tu correo!")
      navigate('/dashboard')
    } catch (error: any) {
      console.error(error)
      alert(`Error al enviar: ${error.message || 'Intenta de nuevo'}`)
    } finally {
      setSaving(false)
    }
  }
