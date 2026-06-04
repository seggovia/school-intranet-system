import { useEffect, useState } from 'react'
import { useNavigation } from 'react-router-dom'

// Si useNavigation no está disponible, usa una alternativa simple
export function PageProgress() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  let navigation: any = null
  try {
    navigation = useNavigation()
  } catch (e) {
    navigation = null
  }

  useEffect(() => {
    let t1: any
    let t2: any
    let t3: any

    if (navigation && navigation.state) {
      if (navigation.state === 'loading') {
        setVisible(true)
        setProgress(30)
        t1 = setTimeout(() => setProgress(70), 100)
      } else {
        setProgress(100)
        t2 = setTimeout(() => setVisible(false), 300)
      }
    } else {
      // Fallback simple: animación al montar
      setVisible(true)
      setProgress(30)
      t1 = setTimeout(() => setProgress(70), 100)
      t2 = setTimeout(() => setProgress(100), 300)
      t3 = setTimeout(() => setVisible(false), 500)
    }

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation && navigation.state])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 3,
      zIndex: 9999, background: 'transparent'
    }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'var(--primary, #0d9488)',
        transition: 'width 0.3s ease',
        boxShadow: '0 0 8px var(--primary, #0d9488)'
      }} />
    </div>
  )
}

export default PageProgress
