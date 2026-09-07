import { useState } from 'react'

export const MATTERPORT_URL = 'https://my.matterport.com/show/?m=9JaMUZrVdZC'

// Fachada click-to-load: el iframe de Matterport (~1.6 MB / 80 requests) sólo se
// carga cuando el visitante lo pide. Hasta entonces mostramos un póster liviano.
export default function MatterportFacade({ title = 'Tour virtual Espacio Auditorium', style }) {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <iframe
        src={`${MATTERPORT_URL}&play=1`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block', ...style }}
        allowFullScreen
        allow="vr; xr-spatial-tracking; fullscreen"
        title={title}
      />
    )
  }

  return (
    <div className="mp-facade" style={style}>
      <picture>
        <source type="image/webp" srcSet="/img/salagaudi-640.webp 640w, /img/salagaudi-1024.webp 1024w" sizes="(max-width: 1024px) 100vw, 50vw" />
        <img
          src="/img/salagaudi-1024.jpg"
          srcSet="/img/salagaudi-640.jpg 640w, /img/salagaudi-1024.jpg 1024w"
          sizes="(max-width: 1024px) 100vw, 50vw"
          width={1024}
          height={576}
          alt="Vista previa del recorrido virtual 360° de Espacio Auditorium"
          loading="lazy"
          decoding="async"
        />
      </picture>
      <button
        type="button"
        className="mp-facade-btn"
        onClick={() => setOpen(true)}
        aria-label="Abrir recorrido 360° virtual de Espacio Auditorium"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        Abrir recorrido 360°
      </button>
    </div>
  )
}
