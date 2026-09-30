import { useId, useState } from 'react'
import { getReadyAsset } from '../../assets/manifest'

export function Brand({ inverted = false }: { inverted?: boolean }) {
  const asset = getReadyAsset('brand-logo')
  const filterId = `brand-inverse-${useId().replace(/:/g, '')}`
  const [failed, setFailed] = useState(false)
  return <a className="brand" href="#choice" aria-label="STEMIFY — back to top">
    {inverted && <svg width="0" height="0" aria-hidden="true" className="brand-filter"><defs>
      {/* Retain the supplied letterforms: key out the white paper and map
          black to white while retaining the brand's orange ink. */}
      <filter id={filterId} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 1  -.737 0 0 0 1  -.984 0 0 0 1  0 0 -1 0 1" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
    </defs></svg>}
    {asset && !failed
      ? <img src={asset.src} width={asset.width} height={asset.height} alt="STEMIFY" style={inverted ? { filter: `url(#${filterId})` } : undefined} onError={() => setFailed(true)} />
      : <span data-asset-status="missing" title="Supplied logo asset pending">STEMIFY</span>}
  </a>
}
