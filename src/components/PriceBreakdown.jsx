import { calculatePrice, formatARS, PRICES, DURATION_LABELS } from '../lib/pricing'

export default function PriceBreakdown({ durationType, days, additionalHours = 0 }) {
  if (!durationType || !days) return null

  const p = calculatePrice({ durationType, days, additionalHours })

  return (
    <div className="card card-gold" style={{ fontSize: '0.9rem' }}>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '1rem' }}>
        Resumen de precios
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Row
          label={`${DURATION_LABELS[durationType]} × ${days} día${days > 1 ? 's' : ''}`}
          value={formatARS(p.basePerDay * days)}
        />

        {additionalHours > 0 && (
          <Row
            label={`${additionalHours} hora${additionalHours > 1 ? 's' : ''} adicional${additionalHours > 1 ? 'es' : ''}`}
            value={formatARS(p.extraHoursTotal)}
          />
        )}

        {p.discount > 0 && (
          <Row
            label={`Descuento multi-día (${p.discountPercentage}%)`}
            value={`−${formatARS(p.discount)}`}
            highlight="discount"
          />
        )}

        <div style={{ borderTop: '1px solid #222', paddingTop: '0.5rem' }}>
          <Row label="Subtotal (sin IVA)" value={formatARS(p.subtotalAfterDiscount)} />
          <Row label="IVA (21%)" value={formatARS(p.iva)} />
        </div>

        <div
          style={{
            borderTop: '1px solid var(--gold-border)',
            paddingTop: '0.75rem',
            marginTop: '0.25rem',
          }}
        >
          <Row
            label="Total"
            value={formatARS(p.total)}
            bold
          />
        </div>
      </div>

      <div
        style={{
          marginTop: '1.25rem',
          background: 'var(--gold-dim)',
          border: '1px solid var(--gold-border)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Seña (30%) — hoy
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 700 }}>
            {formatARS(p.deposit)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Saldo — 5 días antes
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text)', fontWeight: 600 }}>
            {formatARS(p.balance)}
          </div>
        </div>
      </div>

      {p.discount > 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#81c784', textAlign: 'center' }}>
          ¡Ahorrás {formatARS(p.discount)} con el descuento multi-día!
        </p>
      )}
    </div>
  )
}

function Row({ label, value, bold, highlight }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.2rem 0',
        fontWeight: bold ? 700 : 400,
        fontSize: bold ? '1rem' : 'inherit',
        color: highlight === 'discount' ? '#81c784' : bold ? 'var(--text)' : 'var(--text-muted)',
      }}
    >
      <span>{label}</span>
      <span style={{ color: highlight === 'discount' ? '#81c784' : bold ? 'var(--gold)' : 'inherit' }}>
        {value}
      </span>
    </div>
  )
}
