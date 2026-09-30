import { InfiniteWhiteboardScene, ResourceCanvas } from '../../scenes/InfiniteWhiteboardScene'
export function InteractiveLearningSection() {
  return <section id="interactive" className="cinematic-section interactive-section" data-story-section aria-label="Interactive learning" tabIndex={-1}><div className="cinema-stage board-stage">
    <div className="board-world" data-phase="eye-height"><InfiniteWhiteboardScene /></div>
    <div className="blank-board" data-phase="overhead"><span className="board-origin" aria-hidden="true">＋</span><div><p className="eyebrow">SPACE TO THINK</p><h3>Sometimes, it starts<br />with a <em>blank board.</em></h3><p>A question. A pen. An explanation that clicks.<br />There’s still room for working things out.</p><svg className="drawn-line" viewBox="0 0 380 70" aria-hidden="true"><path d="M10 45C90 15 145 62 200 35S310 10 365 35m-20-13 24 13-21 17" fill="none" stroke="#fd4304" strokeWidth="3" /></svg></div></div>
    <div className="resource-scene" id="learning-resources" tabIndex={-1}><div className="resource-heading"><p className="eyebrow">ONE CANVAS. MANY WAYS IN.</p><h3>Less watching.<br /><em>More discovering.</em></h3></div><ResourceCanvas /></div>
    <div className="scene-bottom"><span>LEARNING BECOMES INTERACTIVE</span><span>Scroll to discover</span></div>
  </div></section>
}
