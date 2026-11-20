'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Award, Crown, Medal, Trophy } from 'lucide-react'
import { gsap } from 'gsap'
import * as THREE from 'three'

export type RankEntry = {
  user_id: string
  display_name: string
  percentage: number | null
  score: number | null
  total_questions: number | null
  finished_at: string | null
  registered_at: string
}

const places = [
  { place: 2, label: 'PLATA', color: '#cbd5e1', glow: 'rgba(203,213,225,.32)', height: 'h-52 sm:h-60', icon: Medal },
  { place: 1, label: 'ORO', color: '#facc15', glow: 'rgba(250,204,21,.32)', height: 'h-64 sm:h-72', icon: Crown },
  { place: 3, label: 'BRONCE', color: '#fb923c', glow: 'rgba(251,146,60,.3)', height: 'h-44 sm:h-52', icon: Award },
]

export default function RankingPodium({ entries, loadError }: { entries: RankEntry[]; loadError?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const sortedScores = entries
    .filter((entry) => entry.percentage !== null)
    .sort((a, b) => Number(b.percentage) - Number(a.percentage) || new Date(a.finished_at ?? 0).getTime() - new Date(b.finished_at ?? 0).getTime())
  const ranked = places.map((medal) => ({ ...medal, entry: sortedScores[medal.place - 1] ?? null }))
  const participants = [...entries].sort((a, b) => a.display_name.localeCompare(b.display_name, 'es'))

  useEffect(() => {
    const element = root.current
    const canvasElement = canvas.current
    if (!element || !canvasElement) return

    const context = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        gsap.fromTo('.ranking-title', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .75, ease: 'power3.out' })
        gsap.fromTo('.podium-place', { y: 72, scale: .88, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .8, stagger: .16, delay: .18, ease: 'back.out(1.5)' })
        gsap.to('.podium-medal', { y: -8, scale: 1.06, duration: 1.35, repeat: -1, yoyo: true, stagger: .18, ease: 'sine.inOut' })
        gsap.to('.ranking-shine', { x: '130%', duration: 2.1, repeat: -1, repeatDelay: 1.3, ease: 'power1.inOut' })
      }
    }, element)

    let renderer: THREE.WebGLRenderer | undefined
    let frame = 0
    let scene: THREE.Scene | undefined
    let camera: THREE.PerspectiveCamera | undefined
    let points: THREE.Points | undefined
    let resizeHandler: (() => void) | undefined
    const meshes: THREE.Mesh[] = []
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvasElement, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
      renderer.setClearColor(0x000000, 0)
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(46, 1, .1, 100)
      camera.position.z = 8.5

      const starPositions = new Float32Array(280 * 3)
      for (let i = 0; i < starPositions.length; i += 3) {
        starPositions[i] = (Math.random() - .5) * 12
        starPositions[i + 1] = (Math.random() - .5) * 7
        starPositions[i + 2] = (Math.random() - .5) * 5
      }
      const starGeometry = new THREE.BufferGeometry()
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
      points = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xfde68a, size: .035, transparent: true, opacity: .72, sizeAttenuation: true }))
      scene.add(points)

      const colors = [0xcbd5e1, 0xfacc15, 0xfb923c]
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(.48 + i * .08, .025, 8, 64),
          new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: .72 }),
        )
        ring.position.set((i - 1) * 2.55, -.1 + (i === 1 ? .4 : 0), 0)
        ring.rotation.x = Math.PI / 2.8
        scene.add(ring)
        meshes.push(ring)
      }
      scene.add(new THREE.AmbientLight(0xffffff, 2))

      const resize = () => {
        if (!renderer || !camera || !element) return
        const width = element.clientWidth || 1
        const height = element.clientHeight || 1
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      resizeHandler = resize
      resize()
      window.addEventListener('resize', resize)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const draw = () => {
        if (!renderer || !scene || !camera) return
        if (!reduced) {
          if (points) points.rotation.y += .0007
          meshes.forEach((mesh, i) => { mesh.rotation.z += .0025 + i * .0007 })
        }
        renderer.render(scene, camera)
        if (!reduced) frame = window.requestAnimationFrame(draw)
      }
      draw()
    } catch {
      canvasElement.classList.add('hidden')
    }

    return () => {
      window.cancelAnimationFrame(frame)
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
      meshes.forEach((mesh) => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose() })
      if (points) { points.geometry.dispose(); (points.material as THREE.Material).dispose() }
      renderer?.dispose()
      context.revert()
    }
  }, [])

  return (
    <main ref={root} className="relative isolate min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_42%,rgba(124,58,237,.2),transparent_42%),linear-gradient(145deg,#11112a,#171324_58%,#24150f)] px-4 py-7 text-white shadow-2xl shadow-violet-950/30 sm:px-8 sm:py-9">
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"><ArrowLeft className="size-4" /> Inicio</Link>
        <header className="ranking-title mx-auto mt-8 max-w-2xl text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border border-amber-200/25 bg-amber-200/10 text-amber-200 shadow-lg shadow-amber-400/10"><Trophy className="size-7" /></div>
          <p className="text-xs font-bold uppercase tracking-[.3em] text-violet-200">Sección privada · A1.1</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Ranking del <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">final</span></h1>
          <p className="mt-2 text-sm text-white/60">Mejor resultado de cada participante</p>
        </header>

        <section aria-label="Usuarios registrados" className="mx-auto mt-8 max-w-4xl rounded-3xl border border-white/10 bg-white/[.055] p-4 backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Usuarios registrados</h2><p className="mt-1 text-sm text-white/55">Estado de participación en el final A1.1</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">{participants.length} usuario{participants.length === 1 ? '' : 's'}</span></div>
          {loadError ? <p role="alert" className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm text-amber-100">{loadError}</p> : participants.length ? <div className="mt-4 divide-y divide-white/10">{participants.map((entry) => {
            const hasScore = entry.percentage !== null
            return <div key={entry.user_id} className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"><div className="min-w-0"><p className="truncate text-sm font-semibold">{entry.display_name}</p><p className="mt-0.5 text-xs text-white/40">Registrado {new Date(entry.registered_at).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</p></div><div className="shrink-0 text-right">{hasScore ? <><span className="block text-sm font-black text-emerald-300">{Number(entry.percentage)}% · {entry.score}/{entry.total_questions}</span><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/60">Presentado</span></> : <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/55">Pendiente</span>}</div></div>
          })}</div> : <p className="mt-4 rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/50">Todavía no hay usuarios registrados.</p>}
        </section>

        <div className="mx-auto mt-8 max-w-4xl text-center"><p className="text-xs font-bold uppercase tracking-[.28em] text-violet-200">Mejores resultados</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">El podio del final</h2></div>
        {sortedScores.length === 0 && <div className="mx-auto mt-5 max-w-lg rounded-3xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/60">Aún no hay resultados. El podio se llenará cuando presenten el final.</div>}
        {sortedScores.length > 0 && (
          <section aria-label="Podio de los tres mejores resultados" className="mx-auto mt-8 grid max-w-4xl grid-cols-3 items-end gap-2 sm:gap-5">
            {ranked.map(({ place, label, color, glow, height, icon: Icon, entry }) => (
              <article key={place} className={`podium-place relative flex min-w-0 flex-col items-center justify-end overflow-hidden rounded-t-[1.7rem] rounded-b-2xl border border-white/15 bg-gradient-to-b from-white/[.12] to-white/[.035] px-2 pb-4 pt-4 text-center backdrop-blur-xl sm:px-5 sm:pb-6 ${height}`} style={{ boxShadow: `0 22px 65px -32px ${glow}` }}>
                <div className="ranking-shine pointer-events-none absolute -left-1/2 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="podium-medal relative flex size-12 items-center justify-center rounded-2xl border sm:size-16" style={{ color, borderColor: `${color}66`, background: `${color}18`, boxShadow: `0 0 30px ${glow}` }}><Icon className="size-7 sm:size-9" /><span className="absolute -right-1 -top-2 rounded-full bg-neutral-950 px-1.5 py-0.5 text-[10px] font-black sm:text-xs">{place}</span></div>
                <p className="mt-3 text-[10px] font-black tracking-[.18em] sm:text-xs" style={{ color }}>{label}</p>
                <p className="mt-2 w-full truncate text-xs font-bold sm:text-base">{entry?.display_name || 'Por definir'}</p>
                {entry ? <><p className="mt-1 text-2xl font-black tabular-nums sm:text-4xl" style={{ color }}>{Number(entry.percentage)}<span className="text-sm sm:text-lg">%</span></p><p className="text-[10px] text-white/55 sm:text-xs">{entry.score}/{entry.total_questions} correctas</p></> : <p className="mt-3 text-[10px] text-white/45 sm:text-xs">Aún sin resultado</p>}
                <div className="mt-4 flex w-full items-end justify-center gap-1" aria-hidden="true"><div className="h-3 w-1/3 rounded-t bg-white/10" /><div className="h-6 w-1/3 rounded-t" style={{ background: `${color}88` }} /><div className="h-4 w-1/3 rounded-t bg-white/15" /></div>
              </article>
            ))}
          </section>
        )}

        <div className="mx-auto mt-6 flex max-w-4xl items-center justify-center gap-2 text-center text-xs text-white/45"><Award className="size-4 shrink-0 text-amber-200/70" />Clasificación por porcentaje · desempate por quien obtuvo esa nota primero</div>
      </div>
    </main>
  )
}
