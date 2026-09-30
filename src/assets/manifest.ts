import type { StoryId } from '../content/homepage'

export type AssetKind = 'image' | 'video' | 'model'
interface AssetBase {
  id: string
  kind: AssetKind
  scene: StoryId | 'brand'
  purpose: string
  priority: number
  source: 'supplied' | 'higgsfield' | 'imagegen' | 'code'
}
export interface ReadyAsset extends AssetBase {
  status: 'ready'
  src: string
  width?: number
  height?: number
  poster?: string
  provenance?: { model?: string; jobId?: string; elementId?: string; prompt?: string; referenceIds?: string[]; reviewed: boolean; bytes?: number }
}
export interface PendingAsset extends AssetBase { status: 'missing' | 'planned'; src?: never }
export interface ReferenceAsset extends AssetBase { status: 'reference'; localPath: string }
export interface ProceduralAsset extends AssetBase { status: 'procedural'; module: string }
export type Asset = ReadyAsset | PendingAsset | ReferenceAsset | ProceduralAsset

// No guessed URLs: absent files must never trigger network requests.
export const assets: readonly Asset[] = [
  { id: 'brand-logo', kind: 'image', scene: 'brand', purpose: 'Supplied STEMIFY wordmark; preserve intrinsic ratio', priority: 0, source: 'supplied', status: 'ready', src: '/thestemifyway/assets/brand/stemify-logo.png', width: 605, height: 156 },
  { id: 'student-master', kind: 'image', scene: 'choice', purpose: 'Original stylized identity restored for the current cinematic brief', priority: 1, source: 'higgsfield', status: 'reference', localPath: 'assets/character/provenance.json' },
  { id: 'student-transition', kind: 'video', scene: 'choice', purpose: 'Seedance 2.5 sitting shot with class baked into footage, locally interpolated to 60 fps; independent-frame encoding', priority: 1, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/orange-sitting-1080p-60fps.mp4', poster: '/thestemifyway/assets/cinema/orange-sitting-1080p-start.webp', width: 1920, height: 1080, provenance: { model: 'seedance_2_5', jobId: 'a8c7f612-96ae-4d3f-9369-147144d8ae4d', reviewed: true, bytes: 11102498 } },
  { id: 'student-seated', kind: 'image', scene: 'adaptive', purpose: 'Exact ending from the orange sitting clip for compact and reduced-motion layouts', priority: 2, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/orange-sitting-1080p-end.webp', provenance: { reviewed: true } },
  { id: 'laptop-portal', kind: 'video', scene: 'adaptive', purpose: 'User-approved laptop approach and whiteboard entry; native 1080p source, interpolated to 60 fps for scroll seeking', priority: 3, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/laptop-portal-1080p-60fps.mp4', poster: '/thestemifyway/assets/cinema/laptop-portal-start.webp', width: 1920, height: 1080, provenance: { model: 'seedance_2_5', jobId: '42650fee-a346-4875-a320-ae5e640ac94b', reviewed: true, bytes: 16027244 } },
  { id: 'laptop-portal-end', kind: 'image', scene: 'interactive', purpose: 'Exact portal ending holds through the next chapter entrance', priority: 4, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/laptop-portal-end.webp', width: 1920, height: 1080, provenance: { reviewed: true } },
  { id: 'hero-objects', kind: 'model', scene: 'choice', purpose: 'Thirteen generated cutouts in independent depth layers with pointer response and breathing', priority: 2, source: 'code', status: 'procedural', module: 'src/scenes/HeroChoiceScene/HeroElement.tsx' },
  { id: 'hero-bold-graph', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered graph cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/graph.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-flask', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered flask cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/flask.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-molecule', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered molecule cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/molecule.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-cradle', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered cradle cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/cradle.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-tube', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered tube cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/tube.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-prism', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered prism cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/prism.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-cube', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered cube cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/cube.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-dna', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered dna cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/dna.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-sphere', kind: 'image', scene: 'choice', purpose: 'Glossy 3D-rendered sphere cutout in the STEMIFY palette', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/sphere.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-atom', kind: 'image', scene: 'choice', purpose: 'Small 3D-rendered atom accent near the student; leaves before film motion', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/atom.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-plus', kind: 'image', scene: 'choice', purpose: 'Small 3D-rendered plus accent near the student; leaves before film motion', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/plus.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-gear', kind: 'image', scene: 'choice', purpose: 'Small 3D-rendered gear accent near the student; leaves before film motion', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/gear.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'hero-bold-magnet', kind: 'image', scene: 'choice', purpose: 'Small 3D-rendered magnet accent near the student; leaves before film motion', priority: 2, source: 'imagegen', status: 'ready', src: '/thestemifyway/assets/hero/elements-bold-v1/magnet.webp', width: 768, height: 768, provenance: { reviewed: true } },
  { id: 'whiteboard-poster', kind: 'image', scene: 'interactive', purpose: 'Shared laptop portal destination and infinite learning environment', priority: 4, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/whiteboard.webp', provenance: { model: 'gpt_image_2_5', jobId: '42c4334b-bd47-46ea-a0b6-21ca7f1a8f9e', reviewed: true } },
  { id: 'whiteboard-flight', kind: 'video', scene: 'interactive', purpose: 'Living whiteboard camera rise directly after the laptop portal; native 1080p/24fps, independent-frame browser encoding', priority: 5, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/living-whiteboard-1080p.mp4', poster: '/thestemifyway/assets/cinema/laptop-portal-end.webp', width: 1920, height: 1080, provenance: { model: 'seedance_2_5', jobId: 'da359c80-fb03-4603-8c0c-bfa30674a437', reviewed: true } },
  { id: 'molecule-loop', kind: 'video', scene: 'interactive', purpose: 'Illustrative molecular structure; not labeled as a particular compound', priority: 8, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/molecule.mp4', poster: '/thestemifyway/assets/cinema/molecule.webp', provenance: { model: 'cinematic_studio_3_0', jobId: 'e415569f-5ea0-48f5-8277-aa4661c79fc4', reviewed: true } },
  { id: 'pendulum-loop', kind: 'video', scene: 'interactive', purpose: 'Illustrative pendulum motion; no numerical physics claims', priority: 8, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/pendulum.mp4', poster: '/thestemifyway/assets/cinema/pendulum.webp', provenance: { model: 'cinematic_studio_3_0', jobId: '3ea1a67d-224a-4797-8bfd-740e594461fc', reviewed: true } },
  { id: 'rocket-world', kind: 'model', scene: 'journey', purpose: 'Scroll-controlled rocket and three learning-stage planets', priority: 6, source: 'code', status: 'procedural', module: 'src/scenes/LearningJourneyScene/JourneyCanvas.tsx' },
  { id: 'subject-spheres', kind: 'model', scene: 'subjects', purpose: 'Live subject selection, center transition and topic placeholder spheres', priority: 7, source: 'code', status: 'procedural', module: 'src/scenes/SubjectUniverseScene/SubjectCanvas.tsx' },
  { id: 'teacher-student', kind: 'image', scene: 'understand', purpose: 'Illustrative online teaching connection with the locked student', priority: 8, source: 'higgsfield', status: 'ready', src: '/thestemifyway/assets/cinema/connection.webp', provenance: { model: 'gpt_image_2_5', jobId: '90e4b862-7b1d-4927-9bcd-fbd6d55d3e08', referenceIds: ['9c6e0cf9-7240-4f42-a93d-9e5bdd0c5781'], reviewed: true } },
]

export function getReadyAsset(id: string): ReadyAsset | undefined {
  return assets.find((asset): asset is ReadyAsset => asset.id === id && asset.status === 'ready')
}
