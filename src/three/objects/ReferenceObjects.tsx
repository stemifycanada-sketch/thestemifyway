import { useMemo } from 'react'
import { CatmullRomCurve3, DoubleSide, Quaternion, Vector2, Vector3 } from 'three'
import { RoundedBox } from '@react-three/drei'
import { LearningWorld } from './LearningWorlds'
export type ReferenceObjectId='graph'|'flask'|'molecule'|'cradle'|'tube'|'prism'|'cube'|'dna'|'sphere'
type Point=[number,number,number]
function Rod({a,b,color='#e7edf1',r=.022}:{a:Point;b:Point;color?:string;r?:number}){
  const {length,mid,rotation}=useMemo(()=>{const start=new Vector3(...a),end=new Vector3(...b),direction=end.clone().sub(start);return {length:direction.length(),mid:start.add(end).multiplyScalar(.5),rotation:new Quaternion().setFromUnitVectors(new Vector3(0,1,0),direction.normalize())}},[a,b])
  return <mesh position={mid} quaternion={rotation}><cylinderGeometry args={[r,r,length,16]}/><meshStandardMaterial color={color} metalness={.55} roughness={.2}/></mesh>
}
function Ball({position=[0,0,0],radius=.18,color='#b5d7ec'}:{position?:Point;radius?:number;color?:string}){
  return <mesh position={position}><sphereGeometry args={[radius,32,20]}/><meshPhysicalMaterial color={color} metalness={.35} roughness={.13} clearcoat={1}/></mesh>
}
function Graph(){
  const curve=useMemo(()=>new CatmullRomCurve3(Array.from({length:48},(_,i)=>{const x=-.72+i/47*1.44;return new Vector3(x,1.8*x*x-.55,.035)})),[])
  return <group><RoundedBox args={[1.85,1.72,.035]} radius={.08} smoothness={3}><meshPhysicalMaterial color='#c9e6ee' transparent opacity={.16} roughness={.12} depthWrite={false}/></RoundedBox>
    {[-.6,-.3,0,.3,.6].map(n=><group key={n}><Rod a={[-.83,n,.027]} b={[.83,n,.027]} r={.0035} color='#b1ced2'/><Rod a={[n,-.73,.027]} b={[n,.73,.027]} r={.0035} color='#b1ced2'/></group>)}
    <Rod a={[-.8,-.55,.035]} b={[.8,-.55,.035]} r={.009} color='#78a7b3'/><Rod a={[0,-.7,.035]} b={[0,.72,.035]} r={.009} color='#78a7b3'/>
    <mesh><tubeGeometry args={[curve,48,.02,12,false]}/><meshStandardMaterial color='#fb762d' emissive='#f7a957' emissiveIntensity={.18} roughness={.2}/></mesh>
    {[[-.92,-.85,.92,-.85],[-.92,.85,.92,.85],[-.92,-.85,-.92,.85],[.92,-.85,.92,.85]].map((p,i)=><Rod key={i} a={[p[0],p[1],.02]} b={[p[2],p[3],.02]} r={.012} color='#e8f8ff'/>)}
  </group>
}
function Flask(){
  const points=useMemo(()=>[[0,-.8],[.45,-.8],[.5,-.72],[.42,-.45],[.18,.35],[.14,.42],[.14,.82],[.18,.86]].map(p=>new Vector2(...p as [number,number])),[])
  const liquid=useMemo(()=>[[0,-.76],[.43,-.76],[.46,-.68],[.34,-.22],[0,-.22]].map(p=>new Vector2(...p as [number,number])),[])
  return <group rotation={[0,0,.12]}><mesh><latheGeometry args={[points,48]}/><meshPhysicalMaterial color='#e4f2fb' transparent opacity={.25} roughness={.08} metalness={.12} side={DoubleSide} depthWrite={false}/></mesh><mesh><latheGeometry args={[liquid,48]}/><meshPhysicalMaterial color='#34b9dd' roughness={.12} metalness={.15} clearcoat={1}/></mesh><mesh position={[0,.84,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.165,.025,12,40]}/><meshStandardMaterial color='#e8f6ff' metalness={.4} roughness={.12}/></mesh></group>
}
function Molecule(){
  const points:Point[]=[[-.28,0,0],[.28,.08,0],[-.6,.4,.04],[-.65,-.33,0],[.56,.44,0],[.67,-.2,.08],[0,.5,-.1]]
  return <group>{[[0,1],[0,2],[0,3],[1,4],[1,5],[0,6]].map(([a,b],i)=><Rod key={i} a={points[a]} b={points[b]} color='#b7bfc2' r={.042}/>)}{points.map((position,i)=><Ball key={i} position={position} radius={i<2?.17:.13} color={i<2?'#303945':i===2||i===4?'#e34936':i===6?'#56a9cf':'#f8f7ed'}/>)}</group>
}
function Tube(){return <group rotation={[0,0,-.2]}><mesh><cylinderGeometry args={[.16,.16,1.5,32,1,true]}/><meshPhysicalMaterial color='#f4f5eb' transparent opacity={.23} roughness={.1} depthWrite={false} side={DoubleSide}/></mesh><mesh position={[0,-.31,0]}><cylinderGeometry args={[.125,.125,.79,32]}/><meshPhysicalMaterial color='#f4a83a' roughness={.12} clearcoat={1}/></mesh><Ball position={[0,-.70,0]} radius={.15} color='#f0a33b'/><mesh position={[0,.76,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.17,.021,12,32]}/><meshStandardMaterial color='#eff7f8' roughness={.12} metalness={.3}/></mesh></group>}
function WireSolid({prism=false}:{prism?:boolean}){
  const points:Point[]=prism?[[-.6,-.5,-.35],[.6,-.5,-.35],[0,.55,-.35],[-.6,-.5,.35],[.6,-.5,.35],[0,.55,.35]]:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]
  const edges=prism?[[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]]:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
  return <group rotation={[.18,.3,.08]}>{edges.map(([a,b],i)=><Rod key={i} a={points[a]} b={points[b]} color='#f5f4e8' r={.024}/>)}{!prism&&<mesh><boxGeometry args={[1,1,1]}/><meshPhysicalMaterial color='#c9e5e9' transparent opacity={.07} roughness={.1} depthWrite={false}/></mesh>}</group>
}
function DNA(){
  const curves=useMemo(()=>[-1,1].map(s=>new CatmullRomCurve3(Array.from({length:64},(_,i)=>{const t=i/63,a=t*Math.PI*2.5;return new Vector3(s*Math.cos(a)*.28,t*1.7-.85,s*Math.sin(a)*.28)}))),[])
  return <group rotation={[0,0,-.15]}>{curves.map((curve,i)=><mesh key={i}><tubeGeometry args={[curve,64,.039,12,false]}/><meshStandardMaterial color={i?'#cfaf69':'#5cadba'} metalness={.6} roughness={.2}/></mesh>)}{Array.from({length:13},(_,i)=>{const t=i/12,a=t*Math.PI*2.5,x=Math.cos(a)*.28,z=Math.sin(a)*.28,y=t*1.7-.85;return <Rod key={i} a={[x,y,z]} b={[-x,y,-z]} color={i%2?'#badce0':'#d2bc80'} r={.023}/>})}</group>
}
export function ReferenceObject({id}:{id:ReferenceObjectId}){
  switch(id){case 'graph':return <Graph/>;case 'flask':return <Flask/>;case 'molecule':return <Molecule/>;case 'cradle':return <LearningWorld id='physics' compact={false}/>;case 'tube':return <Tube/>;case 'prism':return <WireSolid prism/>;case 'cube':return <WireSolid/>;case 'dna':return <DNA/>;case 'sphere':return <group><Ball radius={.42}/><Ball position={[.56,-.25,0]} radius={.105} color='#d897bc'/><Ball position={[-.5,.32,0]} radius={.08} color='#78c2b7'/></group>}
}
