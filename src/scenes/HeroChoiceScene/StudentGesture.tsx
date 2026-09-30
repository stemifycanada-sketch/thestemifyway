import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { NoColorSpace, ShaderMaterial } from 'three'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { beat } from './choreography'

/** Matched reference poses preserve anatomy; chroma is removed in the browser compositor. */
export function StudentGesture() {
  const sources = useTexture(['/thestemifyway/assets/cinema/gesture-start.webp', '/thestemifyway/assets/cinema/gesture-end.webp'])
  const maps = useMemo(() => sources.map(source => { const map = source.clone(); map.colorSpace = NoColorSpace; map.needsUpdate = true; return map }), [sources])
  const uniforms = useMemo(() => ({ startMap: { value: maps[0] }, endMap: { value: maps[1] }, blend: { value: 0 } }), [maps])
  const material = useRef<ShaderMaterial>(null)
  const getProgress = useScrollProgress('choice')
  useEffect(() => () => maps.forEach(map => map.dispose()), [maps])
  useFrame(() => { if (material.current) material.current.uniforms.blend.value = beat(getProgress().progress, .59, .67) })
  return <mesh position={[0, 0, .012]}><planeGeometry args={[3.825, 5.1]} /><shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite toneMapped={false}
    vertexShader="varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}" 
    fragmentShader={`uniform sampler2D startMap; uniform sampler2D endMap; uniform float blend; varying vec2 vUv;
      vec4 keyed(vec4 c) { float a=1.0-smoothstep(.08,.30,c.g-max(c.r,c.b)); c.g=min(c.g,max(c.r,c.b)+.025); return vec4(c.rgb*a,a); }
      void main(){vec4 c=mix(keyed(texture2D(startMap,vUv)),keyed(texture2D(endMap,vUv)),blend); if(c.a<.025) discard; gl_FragColor=vec4(c.rgb/max(c.a,.025),c.a);}`} />
  </mesh>
}
