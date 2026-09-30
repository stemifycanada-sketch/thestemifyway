import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Box3, Group, Vector2, Vector3 } from 'three'
import { Environment, Lightformer } from '@react-three/drei'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { ReferenceObject, type ReferenceObjectId } from './ReferenceObjects'
import '../styles/fonts.css'
import './hero-frames.css'
const items: {id:ReferenceObjectId;u:number;v:number;scale:number;depth:number}[]=[
  {id:'graph',u:.778,v:.272,scale:.72,depth:.9},
  {id:'flask',u:.674,v:.12,scale:.53,depth:.3},
  {id:'molecule',u:.796,v:.086,scale:.65,depth:.6},
  {id:'cradle',u:.928,v:.19,scale:.50,depth:.2},
  {id:'tube',u:.947,v:.448,scale:.53,depth:.45},
  {id:'prism',u:.694,v:.357,scale:.53,depth:.5},
  {id:'cube',u:.86,v:.645,scale:.65,depth:.7},
  {id:'dna',u:.935,v:.768,scale:.66,depth:.55},
  {id:'sphere',u:.77,v:.866,scale:.61,depth:.8},
]
// Conservative zones around the opening plate, not a segmentation mask for an unseen video.
const guards=[{id:'head',x:.45,y:.21,w:.185,h:.315},{id:'body',x:.391,y:.51,w:.26,h:.49},{id:'arm',x:.60,y:.563,w:.149,h:.194},{id:'hand',x:.723,y:.399,w:.084,h:.171}]
const subscribeVisibility=(notify:()=>void)=>{document.addEventListener('visibilitychange',notify);return()=>document.removeEventListener('visibilitychange',notify)}
function Objects({progress,reduced,pointerEnabled,host}:{progress:number;reduced:boolean;pointerEnabled:boolean;host:RefObject<HTMLDivElement|null>}){
  const groups=useRef<(Group|null)[]>([]),smoothed=useMemo(()=>new Vector2(),[])
  const {viewport,camera,invalidate}=useThree()
  const box=useMemo(()=>new Box3(),[]),point=useMemo(()=>new Vector3(),[])
  const lastReport=useRef(0)
  useEffect(()=>{invalidate()},[progress,reduced,invalidate])
  useFrame(({clock,pointer},delta)=>{
    const px=pointerEnabled?pointer.x:0,py=pointerEnabled?pointer.y:0
    smoothed.lerp(new Vector2(px,py),1-Math.exp(-Math.min(delta,.05)*7))
    const exit=Math.min(1,progress/.375),clockTime=reduced?0:clock.elapsedTime
    let maxEmphasis=1
    const report=clock.elapsedTime-lastReport.current>.1
    const bounds: {id:string;x:number;y:number;w:number;h:number}[]=[]
    groups.current.forEach((group,i)=>{
      if(!group)return
      const item=items[i],breath=reduced?0:Math.sin(clockTime*.8+i*.7)
      const distance=Math.hypot((smoothed.x+1)/2-item.u,(1-smoothed.y)/2-item.v)
      const proximity=pointerEnabled?Math.max(0,1-distance/.16)**2*(1-exit):0
      const emphasis=1+proximity*.055;maxEmphasis=Math.max(maxEmphasis,emphasis)
      // At most ~0.4% width / 0.6% height displacement; same scene camera stays fixed.
      const dx=smoothed.x*(.025+item.depth*.038)*(1-exit),dy=smoothed.y*(.018+item.depth*.02)*(1-exit)
      const x=(item.u-.5+exit*.11)*viewport.width+dx,y=(.5-item.v+exit*.045)*viewport.height+dy+breath*.018
      group.position.set(x,y,0)
      group.rotation.set(.02*breath+smoothed.y*.035,.12+smoothed.x*.07,.009*breath)
      group.scale.setScalar(item.scale*emphasis*(1+breath*.012)*(1-exit*.12))
      const halo=host.current?.querySelector<HTMLElement>(`[data-halo='${item.id}']`)
      if(halo){halo.style.left=`${(x/viewport.width+.5)*100}%`;halo.style.top=`${(.5-y/viewport.height)*100}%`;halo.style.opacity=String(proximity*.45);halo.style.transform=`translate(-50%,-50%) scale(${1+proximity*.18})`}
      if(report){
        group.updateMatrixWorld(true);box.setFromObject(group)
        let minX=1,minY=1,maxX=0,maxY=0
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){point.set(x,y,z).project(camera);const u=(point.x+1)/2,v=(1-point.y)/2;minX=Math.min(minX,u);minY=Math.min(minY,v);maxX=Math.max(maxX,u);maxY=Math.max(maxY,v)}
        bounds.push({id:item.id,x:minX,y:minY,w:maxX-minX,h:maxY-minY})
      }
    })
    if(host.current){host.current.setAttribute('data-emphasis',maxEmphasis.toFixed(4));host.current.setAttribute('data-pointer-x',smoothed.x.toFixed(4));host.current.setAttribute('data-breath',clockTime.toFixed(3));if(report){host.current.setAttribute('data-object-bounds',JSON.stringify(bounds));lastReport.current=clock.elapsedTime}}
  })
  return <><ambientLight intensity={.7}/><hemisphereLight args={['#fff7e8','#93928c',1.15]}/><directionalLight position={[-3,6,6]} intensity={2.8}/><Environment resolution={128} frames={1}><Lightformer intensity={3} position={[-4,5,5]} scale={[6,8,1]}/><Lightformer intensity={2} position={[5,1,3]} scale={[3,7,1]}/></Environment>{items.map((item,i)=><group key={item.id} ref={node=>{groups.current[i]=node}} position={[(item.u-.5)*viewport.width,(.5-item.v)*viewport.height,0]} scale={item.scale}><ReferenceObject id={item.id}/></group>)}</>
}
function Review(){
  const reduced=useMediaQuery('(prefers-reduced-motion: reduce)'),coarse=useMediaQuery('(pointer: coarse)')
  const visible=useSyncExternalStore(subscribeVisibility,()=>!document.hidden,()=>true)
  const host=useRef<HTMLDivElement>(null)
  const [progress,setProgress]=useState(0),[elements,setElements]=useState(true),[safeZones,setSafeZones]=useState(false)
  const end=Math.min(1,Math.max(0,(progress-.45)/.5)),opacity=elements?Math.max(0,1-progress/.375):0
  return <><header><a className="brand" href="/">STEM<span>IFY</span></a><div><b>Hero → seated · final reference pack</b><small>Warm orange scene · independent 3D objects · cursor effects. The frame dissolve below is a layout preview.</small></div><a href="/scroll-proof.html?mode=intra">Scroll playback proof ↗</a></header><main>
    <div className="frame" ref={host} data-guards={JSON.stringify(guards)}>
      <img src="/thestemifyway/assets/hero-transition-v3/01-start-warm.png" alt="Opening frame: student shifted right against a pale peach studio background"/>
      <img className="ending" style={{opacity:end}} src="/thestemifyway/assets/hero-transition-v3/02-seated-warm.png" alt="Ending frame: the same student seated at his desk"/>
      <div className="copy" style={{opacity:Math.max(0,1-progress*3)}}><p>ONE MIND. ENDLESS POSSIBILITIES.</p><h1>Every mind<br/>finds its<br/>own way.</h1></div>
      <div className="object-effects" style={{opacity}} aria-hidden="true">{items.map(item=><i key={item.id} data-halo={item.id} className="object-halo"/>)}</div>
      <div className="objects" style={{opacity}} aria-hidden="true">{opacity>0&&<Canvas frameloop={!visible?'never':reduced?'demand':'always'} dpr={[1,1.5]} camera={{position:[0,0,13],fov:34}} gl={{alpha:true,antialias:true}}><Objects progress={progress} reduced={reduced} pointerEnabled={!coarse&&!reduced&&visible} host={host}/></Canvas>}</div>
      {safeZones&&progress<.375&&<div className="safe-zones" aria-hidden="true">{guards.map(g=><i key={g.id} style={{left:`${g.x*100}%`,top:`${g.y*100}%`,width:`${g.w*100}%`,height:`${g.h*100}%`}}/>)}</div>}
      <span className="frame-label">{progress===0?'01 / OPENING':progress===1?'03 / SEATED HOLD':'LAYOUT / TRANSITION PREVIEW'}</span>
    </div>
    <section className="controls"><label className="scrub">Transition preview<input type="range" min="0" max="100" value={Math.round(progress*100)} onChange={e=>setProgress(Number(e.target.value)/100)}/></label><label className="toggle"><input type="checkbox" checked={elements} onChange={e=>setElements(e.target.checked)}/>Show separate 3D elements</label><label className="toggle"><input type="checkbox" checked={safeZones} onChange={e=>setSafeZones(e.target.checked)}/>Show clearance zones</label><button onClick={()=>setProgress(0)}>Opening</button><button onClick={()=>setProgress(1)}>Seated</button></section>
    <p className="note">Move the cursor near an object: it gently tilts, moves in depth and grows by at most 5.5%, with a soft local highlight. A slow breathing loop adds movement. All objects exit by 3 seconds of the planned 8-second transition. Touch and reduced-motion modes do not depend on hover.</p>
    <section className="reference-pack" aria-labelledby="pack-title"><div className="pack-heading"><h2 id="pack-title">One scene. Three useful frames.</h2><a href="/thestemifyway/assets/hero-transition-v3/reference-pack.zip" download>Download prompt + references ↓</a></div><p>Only the clean opening and ending are generation endpoints. The middle frame is visual inspiration; it does not guarantee the generated motion.</p><div className="frame-strip"><figure><img src="/thestemifyway/assets/hero-transition-v3/01-start-warm.png" alt="Clean orange opening"/><figcaption>01 · Opening / clean endpoint</figcaption></figure><figure><img src="/thestemifyway/assets/hero-transition-v3/03-mid-sit-inspiration.png" alt="Warm-toned study of the boy settling onto the stool"/><figcaption>02 · Mid-sit / inspiration only</figcaption></figure><figure><img src="/thestemifyway/assets/hero-transition-v3/02-seated-warm.png" alt="Clean orange seated ending"/><figcaption>03 · Seated / clean endpoint</figcaption></figure></div><details><summary>Read the final 8-second video prompt</summary><p className="prompt">Create one uninterrupted 8-second cinematic shot from the supplied clean opening frame to the supplied clean seated ending frame. The same boy in a navy sweatshirt and dark jeans gently lowers his raised right hand, turns toward an already-existing white desk and round white stool, sits naturally, then takes the black stylus at the graphics tablet. A restrained camera pullback with a gentle rightward arc reveals the furniture and eases into the ending composition. Spread the movement smoothly across the shot at a relaxed, natural pace. Preserve the boy’s identity, hairstyle, proportions and clothing, the furniture geometry, and the soft ivory-peach/orange studio background and lighting. Keep the laptop display plain off-white. No clicking, cuts, transitions, magical furniture appearance, floating educational objects, light trails, particles, text or extra people. Keep hands, feet and stool contact believable. Use minimal motion blur and finish stable, ready for a website-held frame. Silent output.</p></details><p className="note">The class interface, headline, cards and floating objects remain separate browser layers. Laptop approach references are included for the next clip; this shot stops at the seated hold.</p></section>
  </main></>
}
createRoot(document.getElementById('root')!).render(<Review/> )
