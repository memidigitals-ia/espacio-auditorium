// Imagen hero (Sala Gaudi) con variantes responsive en AVIF/WebP/JPG.
// Sólo la Home la pinta con prioridad alta (LCP); el resto la carga lazy.
// IMPORTANTE: `sizes` debe coincidir con el `imagesizes` del preload que agrega scripts/inject-meta.js.

export const HERO_SIZES = '100vw'
export const HERO_WIDTHS = [640, 1024, 1600]

const srcSetFor = (ext) => HERO_WIDTHS.map(w => `/img/salagaudi-${w}.${ext} ${w}w`).join(', ')

export default function HeroImage({ alt, priority = false, style, className, sizes = HERO_SIZES }) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcSetFor('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSetFor('webp')} sizes={sizes} />
      <img
        src="/img/salagaudi-1600.jpg"
        srcSet={srcSetFor('jpg')}
        sizes={sizes}
        width={1600}
        height={900}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        // eslint-disable-next-line react/no-unknown-property -- React 18 pasa el atributo en minúsculas tal cual al DOM
        fetchpriority={priority ? 'high' : undefined}
        style={style}
      />
    </picture>
  )
}
