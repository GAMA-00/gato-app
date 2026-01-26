
Objetivo
- Corregir definitivamente por qué no aparece la etiqueta “Recomendado” en los slots adyacentes a horarios ya agendados.
- Garantizar que, si existe una cita (incluyendo recurrentes “virtuales”) en un día, el slot inmediatamente anterior al inicio y el slot inmediatamente posterior al final queden marcados como recomendados (si están disponibles).

Diagnóstico (por qué sigue fallando)
1) La UI sí está lista para mostrar “Recomendado”
- WeeklySlotGrid pasa recommended={slot.isRecommended} a SlotCard.
- SlotCard renderiza “Recomendado” cuando recommended && isAvailable.
- Conclusión: el problema está en que isRecommended casi nunca se setea a true en los datos del hook.

2) El cálculo actual de recomendaciones depende de “citas en DB” o “proyecciones legacy”
- Para citas no recurrentes: ok (si existen filas dentro del rango).
- Para citas recurrentes: en este proyecto se generan muchas instancias como “virtual-*” (no existen como filas en appointments dentro del rango semanal).
- El hook intenta “proyectar” recurrencias con projectedLegacyOccurrences, pero hoy está limitado a maxWeeksToProject = 8.
  - Si la cita base es vieja (p. ej. de noviembre) y estamos en enero (más de 8 semanas), el hook no genera proyecciones para la semana actual.
  - Resultado: no hay “conflictos” ni “adyacencias” detectadas en esa semana → isRecommended nunca se activa.

3) La lógica de adyacencia actual se basa solo en el “inicio” de la cita
- Actualmente: apptStarts.has(slotMin + step) || apptStarts.has(slotMin - step)
- Esto no cubre el slot posterior cuando la cita dura más de 1 bloque (ej. citas de 60 min con slots de 30 min).
- Ya se calcula apptEndMinutesByDate pero no se usa: es una pista clara de que falta completar la adyacencia respecto al fin.

Estrategia de solución (qué cambiaremos)
A) Generación robusta de instancias recurrentes dentro del rango semanal (sin límite de 8 semanas)
- En vez de “proyectar 8 semanas desde el inicio”, vamos a generar ocurrencias entre baseDate y endDate (la semana mostrada), sin importar si la cita base empezó hace meses.
- Reutilizaremos la lógica existente del proyecto (ya usada en otras pantallas) en:
  - src/utils/simplifiedRecurrenceUtils.ts (calculateRecurringDates + applyRecurringExceptions)
- Esto asegura que las instancias “virtuales” de recurrencia existan para el cálculo de:
  - Conflictos (para bloquear slots ocupados aunque no haya filas materializadas)
  - Recomendaciones (para marcar slots adyacentes)

B) Respetar excepciones de recurrencia (cancelaciones / re-agendados)
- Agregaremos un fetch a la tabla recurring_exceptions para los IDs de las citas recurrentes base relevantes.
- Al generar instancias:
  - Si la excepción es cancelled: no se incluye la instancia (ni para bloqueo ni para recomendación)
  - Si es rescheduled: se usa new_start_time/new_end_time (y se incluye solo si cae en el rango)

C) Recomendación adyacente correcta: antes del inicio y después del final
- Mantendremos la idea de “solo adyacente” (no múltiples recomendaciones).
- Cambiaremos la lógica para que considere:
  - Slot anterior: el slot cuyo fin coincide con el inicio de la cita
  - Slot posterior: el slot cuyo inicio coincide con el fin de la cita
- Implementación práctica con minutos:
  - “Anterior” (antes del inicio): apptStarts.has(slotMin + step)
  - “Posterior” (después del final): apptEnds.has(slotMin)
- Esto elimina el uso de apptStarts.has(slotMin - step), que conceptualmente no representa “adyacente” al inicio (y no cubre bien citas de más de un bloque).

D) Adyacencia respecto a recurring_blocked (si aplica) también por fin
- Hoy solo se registra recurringBlockedByDate como “starts”.
- Si existen slots recurring_blocked con duraciones no estándar, la adyacencia posterior puede fallar.
- Agregaremos blockedEndMinutesByDate (usando end_time del provider_time_slots) y aplicaremos:
  - “Anterior” al bloque: blockedStarts.has(slotMin + step)
  - “Posterior” al bloque: blockedEnds.has(slotMin)

Cambios concretos por archivo

1) src/hooks/useWeeklySlotsFetcher.ts (principal)
1.1. Reemplazar la proyección limitada (maxWeeksToProject = 8)
- Eliminar/retirar la sección projectedLegacyOccurrences basada en weekOffset 0..7.
- En su lugar:
  - Tomar legacyRecurring (ya se obtiene del query actual).
  - Traer recurring_exceptions para esos appointment_id.
  - Generar instancias dentro del rango semanal usando calculateRecurringDates/applyRecurringExceptions.

1.2. Nuevo query de excepciones (recurring_exceptions)
- Dentro del Promise.all o inmediatamente después de tener legacyRecurring IDs:
  - Si legacyRecurringIds.length > 0:
    - supabase.from('recurring_exceptions').select('id, appointment_id, exception_date, action_type, new_start_time, new_end_time').in('appointment_id', legacyRecurringIds)
  - Si no, retornar data: [].

1.3. Construir “virtualRecurringOccurrencesInRange”
- Para cada appointment recurrente base:
  - dates = calculateRecurringDates(appt, baseDate, endOfDay(endDate))
  - instances = applyRecurringExceptions(appt, dates, exceptionsForThisAppt)
  - Mapear cada instancia a un objeto uniforme:
    - start_time ISO
    - end_time ISO
    - status (tratar scheduled/rescheduled como “confirmed” para el sistema de conflictos)
    - residencia_id (desde la cita base)
  - Filtrar:
    - excluir cancelled
    - incluir rescheduled usando new_start_time/new_end_time cuando existan
    - asegurar que la hora final elegida caiga en el rango baseDate..endOfDay(endDate)

1.4. Combinar conflictos (para bloqueo real)
- combinedConflicts actualmente = allAppointments + projectedLegacyOccurrences
- Cambiar a:
  - allAppointments (del rango semanal, como hoy)
  - + virtualRecurringOccurrencesInRange (convertidos a {start_time,end_time,status:'confirmed'})
- Añadir deduplicación simple por (start_time,end_time) para evitar doble conteo si existieran instancias materializadas.

1.5. Pool para recomendaciones (adyacencia)
- adjacentPoolForRecommendations actualmente incluye:
  - sameResidenciaAppointments
  - historicalAppointments
  - proyecciones legacy filtradas por residencia
- Cambiar la parte de “proyecciones” por:
  - virtualRecurringOccurrencesInRange filtradas por residencia_id === clientResidenciaId (manteniendo la intención: “el proveedor ya está en tu condominio”).
- Nota: si clientResidenciaId es undefined, el sistema de recomendaciones por condominio no puede operar; mantendremos el comportamiento actual de no recomendar en ese caso (evita recomendar basado en otras residencias y evita que el copy del callout sea engañoso).

1.6. Calcular apptStartMinutesByDate y apptEndMinutesByDate (ya existe)
- Mantenerlo, pero asegurarnos de alimentar también con las instancias recurrentes generadas.

1.7. Calcular blockedStartMinutesByDate y blockedEndMinutesByDate
- Extender la extracción de recurring_blocked:
  - startMin desde start_time
  - endMin desde end_time (si no existe, fallback a startMin + step)
- Guardar en dos sets por día.

1.8. Corregir la condición isRecommended
- Reemplazar el bloque:
  - isAdjacentToAppointment = apptStarts.has(slotMin + step) || apptStarts.has(slotMin - step)
- Por:
  - isAdjacentToAppointment =
      apptStarts.has(slotMin + step)  // slot termina justo cuando inicia la cita
      || apptEnds.has(slotMin)        // slot inicia justo cuando termina la cita
- Y para recurring_blocked:
  - isAdjacentToRecurringBlocked =
      blockedStarts.has(slotMin + step)
      || blockedEnds.has(slotMin)
- isRecommended = isAdjacentToAppointment || isAdjacentToRecurringBlocked

2) Validación / pruebas (smoke test específico)
- Caso 1: Cita recurrente base antigua (meses atrás) con ocurrencia en la semana actual
  - Abrir booking del servicio en esa semana
  - Verificar:
    - los slots que chocan con la ocurrencia se muestran como no disponibles (si aplica al flujo actual)
    - el slot inmediatamente anterior al inicio aparece con “Recomendado”
    - el slot inmediatamente posterior al final aparece con “Recomendado” (si está disponible)
- Caso 2: Cita recurrente con excepciones “cancelled” en esa semana
  - Verificar que NO bloquee ni recomiende adyacencias para esa instancia cancelada.
- Caso 3: Cita de 60 min con slots de 30 min
  - Verificar que el recomendado posterior se calcule por fin (apptEnds), no por inicio.

Riesgos / consideraciones
- Performance: Generar recurrencias con calculateRecurringDates puede iterar muchas veces si la cita base es muy antigua.
  - Mitigación: el rango semanal es pequeño, y el número de citas recurrentes por provider/listing suele ser limitado. Si fuera necesario, agregaremos un “guard” (máximo de iteraciones) o un cálculo de salto (optimización) en una iteración posterior.
- Coherencia de zona horaria: simplifiedRecurrenceUtils ya trabaja con DATE_CONFIG.DEFAULT_TIMEZONE y date-fns-tz, consistente con el resto del sistema.

Resultado esperado
- En cualquier semana donde existan reservas (incluyendo recurrencias virtuales) relacionadas con el condominio del cliente:
  - El slot inmediatamente anterior al inicio y el inmediatamente posterior al final se marcan como isRecommended=true y se visualiza “Recomendado” en la UI.
  - Esto ocurre de forma estable (sin depender de que la recurrencia esté materializada en la tabla appointments dentro del rango).
