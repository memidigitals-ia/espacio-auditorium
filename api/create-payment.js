import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'
import { handleOptions, json, error } from './_utils.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405)

  try {
    const {
      startDate, endDate, durationType, slotType, additionalHours, days,
      pricing, firstName, lastName, email, whatsapp, eventType, notes,
      policyAccepted, policyAcceptedAt,
    } = req.body

    // Validate required fields
    if (!startDate || !durationType || !email || !firstName || !lastName || !policyAccepted) {
      return error(res, 'Faltan campos requeridos', 400)
    }

    // Double-check availability before creating payment
    const { data: conflicts, error: availError } = await supabase
      .from('reservations')
      .select('id')
      .in('status', ['pending_payment', 'deposit_paid', 'confirmed'])
      .or(`start_date.lte.${endDate || startDate},end_date.gte.${startDate}`)
      .eq('slot_type', slotType)

    if (availError) throw availError
    if (conflicts && conflicts.length > 0) {
      return error(res, 'La fecha ya no está disponible. Por favor elegí otra.', 409)
    }

    // Create reservation in DB (status: pending_payment)
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        whatsapp,
        event_type: eventType,
        notes: notes || '',
        start_date: startDate,
        end_date: endDate || startDate,
        duration_type: durationType,
        slot_type: slotType,
        additional_hours: additionalHours || 0,
        days_count: days,
        base_price: pricing.basePerDay,
        discount_percentage: pricing.discountPercentage || 0,
        subtotal_price: pricing.subtotalAfterDiscount,
        iva_amount: pricing.iva,
        total_price: pricing.total,
        deposit_amount: pricing.deposit,
        balance_amount: pricing.balance,
        status: 'pending_payment',
        policy_accepted: true,
        policy_accepted_at: policyAcceptedAt,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Create Mercado Pago preference
    const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
    const preference = new Preference(mp)

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:5173'

    const preferenceData = await preference.create({
      body: {
        items: [
          {
            id: reservation.id,
            title: `Seña - Espacio Auditorium`,
            description: `${durationType === 'half_day' ? 'Media jornada' : 'Jornada completa'} · ${startDate}${endDate && endDate !== startDate ? ` → ${endDate}` : ''} · ${eventType}`,
            quantity: 1,
            unit_price: Math.round(pricing.deposit),
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: firstName,
          surname: lastName,
          email: email,
        },
        back_urls: {
          success: `${appUrl}/pago?status=approved&reservation_id=${reservation.id}`,
          pending: `${appUrl}/pago?status=pending&reservation_id=${reservation.id}`,
          failure: `${appUrl}/pago?status=failure&reservation_id=${reservation.id}`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/payment-webhook`,
        external_reference: reservation.id,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2hs
      },
    })

    // Save preference ID to reservation
    await supabase
      .from('reservations')
      .update({ mp_preference_id: preferenceData.id })
      .eq('id', reservation.id)

    return json(res, {
      reservationId: reservation.id,
      preferenceId: preferenceData.id,
      initPoint: preferenceData.init_point,
    })
  } catch (err) {
    console.error('create-payment error:', err)
    return error(res, err.message || 'Error interno del servidor', 500)
  }
}
