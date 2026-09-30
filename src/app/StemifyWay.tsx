import { useEffect, useState } from 'react'
import { MotionProvider } from '../components/motion/MotionProvider'
import { StoryMotion } from '../components/motion/StoryMotion'
import { Navigation } from '../components/navigation/Navigation'
import { AssessmentDialog } from '../components/ui/AssessmentDialog'
import { HeroSection } from '../sections/HeroSection'
import { InteractiveLearningSection } from '../sections/InteractiveLearningSection'
import { JourneySection } from '../sections/JourneySection'
import { SubjectsPlansSection } from '../sections/SubjectsPlansSection'
import { ClosingCTASection } from '../sections/ClosingCTASection'
import { ReviewsSection } from '../sections/ReviewsSection'
import { Footer } from '../sections/Footer'

export function StemifyWay() {
  useEffect(() => { document.title = 'The Stemify Way — Every mind finds its own way.' }, [])
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const openAssessment = () => setAssessmentOpen(true)
  return <MotionProvider>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <Navigation onAssessment={openAssessment} assessmentOpen={assessmentOpen} />
    <StoryMotion><main id="main-content" tabIndex={-1}>
      <HeroSection />
      <InteractiveLearningSection />
      <JourneySection />
      <SubjectsPlansSection />
      <ClosingCTASection onAssessment={openAssessment} />
      <ReviewsSection />
    </main></StoryMotion>
    <Footer onAssessment={openAssessment} />
    <AssessmentDialog open={assessmentOpen} onClose={() => setAssessmentOpen(false)} />
  </MotionProvider>
}
