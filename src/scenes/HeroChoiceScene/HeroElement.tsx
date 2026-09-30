import { useTexture } from '@react-three/drei'
import { SRGBColorSpace } from 'three'
import type { ReferenceObjectId } from '../../three/objects/ReferenceObjects'

export type HeroElementId = ReferenceObjectId | 'atom' | 'plus' | 'gear' | 'magnet'
const sizes: Record<HeroElementId, number> = {
  graph: 2.1, flask: 2.1, molecule: 1.8, cradle: 2.2, tube: 2,
  prism: 1.5, cube: 1.7, dna: 2.1, sphere: 1.65,
  atom: 1.6, plus: 1.4, gear: 1.5, magnet: 1.7,
}

/** Individual rendered cutouts occupy depth layers; their lighting is baked in. */
export function HeroElement({ id }: { id: HeroElementId }) {
  const texture = useTexture(`/thestemifyway/assets/hero/elements-bold-v1/${id}.webp`, map => {
    map.colorSpace = SRGBColorSpace
  })
  return <mesh>
    <planeGeometry args={[sizes[id], sizes[id]]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
  </mesh>
}
