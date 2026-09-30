import { subjects } from '../../content/subjects'
export interface MoleculeNode { id: string; name: string; position: [number, number, number]; radius: number; color: string; placeholder?: boolean; hub?: boolean }
export const subjectColors = ['#f47a30', '#9674ca', '#47a786', '#528ddd', '#e4b947', '#678ba4', '#cb777f']
const rootPositions: [number, number, number][] = [[0,0,.3],[-1.55,.72,0],[1.42,.96,-.1],[1.57,-.76,.15],[.13,-1.69,-.12],[-1.48,-.97,.18],[-.08,1.69,-.18]]
const topicPositions: [number, number, number][] = [[-1.43,.55,.05],[.0,1.48,-.1],[1.42,.52,.08],[1.17,-1.04,-.08],[-.24,-1.48,.1],[-1.47,-.8,-.1],[-2.33,.05,.22],[2.30,-.03,.18],[.37,-2.42,.0]]
export function moleculeNodes(selected: string | null): MoleculeNode[] {
  const current = subjects.find(s => s.id === selected)
  if (!current) return subjects.map((subject, i) => ({ id: subject.id, name: subject.name, position: rootPositions[i], radius: i === 0 ? 1.02 : .78, color: subjectColors[i] }))
  const color = subjectColors[subjects.indexOf(current)]
  const topics = current.topics.length ? current.topics : Array.from({ length: 9 }, (_, i) => ({ id: `placeholder-${i + 1}`, name: `Topic ${String(i + 1).padStart(2, '0')}` }))
  return [{ id: 'hub', name: current.name, hub: true, position: [0,0,.2], radius: .93, color }, ...topics.map((topic, i) => ({ ...topic, position: topicPositions[i] ?? [Math.cos(i * 2.4) * 2.6, Math.sin(i * 2.4) * 2.6, -.1] as [number, number, number], radius: .66, color: subjectColors[(i + subjects.indexOf(current)) % subjectColors.length], placeholder: !current.topics.length }))]
}
export function moleculeLinks(nodes: MoleculeNode[]) {
  // Each outer atom attaches to its closest earlier atom, including outer-shell topics.
  return nodes.slice(1).map((node, offset) => {
    const i = offset + 1
    let nearest = 0, distance = Infinity
    for (let j = 0; j < i; j++) {
      const d = Math.hypot(...node.position.map((v, axis) => v - nodes[j].position[axis]))
      if (d < distance) { distance = d; nearest = j }
    }
    return [nearest, i] as const
  })
}
