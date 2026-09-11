import './play.css'
import {
  DEFAULT_PHYSICS_CONFIG,
  createPhysicsState,
  evaluateLanding,
  stepPhysics,
} from './physics.js'
import { UPPER_WIND_END_Y, createRandomScenario, getTestScenario } from './scenario.js'
import { calculateRecovery } from './recovery.js'
import { loadPersistent, savePersistent } from './storage.js'
import { nudgeAngle } from './play-state.js'
import {
  appendDifficultyRecord,
  buildDifficultyCsv,
  clearDifficultySession,
  createDifficultySession,
  getDifficultyRunConfig,
  loadDifficultySession,
  saveDifficultySession,
} from './difficulty-test.js'

const PAD = { centerX: 600, width: 180 }
const GAME_DURATION = 30
const WIND_WARNING_SECONDS = 0.7
const params = new URLSearchParams(window.location.search)
const parsedSafeSpeed = Number(params.get('safe'))
const parsedTestIndex = Number(params.get('test'))
const TEST_INDEX = Number.isInteger(parsedTestIndex) && parsedTestIndex >= 0 && parsedTestIndex < 10
  ? parsedTestIndex
  : null
const hasValidTestSafeSpeed = Number.isFinite(parsedSafeSpeed) && parsedSafeSpeed >= 2.5 && parsedSafeSpeed <= 5
const LEGACY_SAFE_LANDING_SPEED = TEST_INDEX !== null && hasValidTestSafeSpeed
  ? parsedSafeSpeed
  : 3.5

const elements = {
  world: document.querySelector('#world'),
  rocket: document.querySelector('#rocket'),
  explosion: document.querySelector('#explosion'),
  marker: document.querySelector('#landing-marker'),
  stateOverlay: document.querySelector('#state-overlay'),
  stateKicker: document.querySelector('#state-kicker'),
  stateTitle: document.querySelector('#state-title'),
  stateCopy: document.querySelector('#state-copy'),
  resultDiagnostics: document.querySelector('#result-diagnostics'),
  primaryAction: document.querySelector('#primary-action'),
  pauseButton: document.querySelector('#pause-button'),
  reduceMotion: document.querySelector('#reduce-motion'),
  time: document.querySelector('#time-value'),
  mass: document.querySelector('#mass-value'),
  entry: document.querySelector('#entry-value'),
  wind: document.querySelector('#wind-value'),
  nextWind: document.querySelector('#next-wind'),
  windAnnounce: document.querySelector('#wind-announce'),
  recovery: document.querySelector('#recovery-value'),
  positionStatus: document.querySelector('#position-status'),
  descentStatus: document.querySelector('#descent-status'),
  angleStatus: document.querySelector('#angle-status'),
  fuelStatus: document.querySelector('#fuel-status'),
  fuelValue: document.querySelector('#fuel-value'),
  fuelBar: document.querySelector('#fuel-bar'),
  gameStatus: document.querySelector('#game-status'),
  bestQuality: document.querySelector('#best-quality'),
  successCount: document.querySelector('#success-count'),
  testModeLabel: document.querySelector('#test-mode-label'),
  ruleSafeSpeed: document.querySelector('#rule-safe-speed'),
  difficultyStart: document.querySelector('#difficulty-start'),
  difficultyReset: document.querySelector('#difficulty-reset'),
  difficultyDownload: document.querySelector('#difficulty-download'),
  difficultyProgress: document.querySelector('#difficulty-progress'),
  difficultyDetail: document.querySelector('#difficulty-detail'),
}

let persistent = loadPersistent(window.localStorage)
let difficultySession = loadDifficultySession(window.localStorage)
let scenario
let physics
let gameState = 'READY'
let elapsed = 0
let nextWindIndex = 0
let nextUpperWindIndex = 0
let lowerWindStartedAt = null
let displayedRecovery = 0
let lastFrame = performance.now()
let pauseReason = ''
let lastResult = null
let windShiftPulseUntil = 0
let runTestConfig = null
let runSafeLandingSpeed = LEGACY_SAFE_LANDING_SPEED
const keys = { left: false, right: false, burn: false }

function arrowFor(value) {
  if (Math.abs(value) < 0.05) return `CALM ${Math.abs(value).toFixed(1)}`
  return `${value < 0 ? '←' : '→'} ${Math.abs(value).toFixed(1)}`
}

function resolveRunConfig() {
  if (difficultySession.active && !difficultySession.completed) {
    return getDifficultyRunConfig(difficultySession)
  }
  if (TEST_INDEX !== null) {
    return {
      run: TEST_INDEX + 1,
      group: 'LEGACY',
      scenarioIndex: TEST_INDEX,
      safeSpeed: LEGACY_SAFE_LANDING_SPEED,
    }
  }
  return null
}

function makeScenario() {
  return runTestConfig ? getTestScenario(runTestConfig.scenarioIndex) : createRandomScenario()
}

function resetRun({ autoStart = false } = {}) {
  runTestConfig = resolveRunConfig()
  runSafeLandingSpeed = runTestConfig?.safeSpeed ?? 3.5
  scenario = makeScenario()
  physics = createPhysicsState({
    mass: scenario.mass,
    entrySpeed: scenario.entrySpeed,
    x: scenario.startX,
    y: 70,
    wind: scenario.initialWind,
    fuel: 100,
  })
  elapsed = 0
  nextWindIndex = 0
  nextUpperWindIndex = 0
  lowerWindStartedAt = null
  displayedRecovery = 0
  lastResult = null
  pauseReason = ''
  keys.left = false
  keys.right = false
  keys.burn = false
  gameState = autoStart ? 'PLAYING' : 'READY'
  elements.world.classList.remove('is-crashed')
  elements.explosion.style.left = '50%'
  elements.explosion.style.top = '50%'
  elements.resultDiagnostics.hidden = true
  elements.pauseButton.disabled = !autoStart
  elements.primaryAction.textContent = autoStart ? 'RETRY' : 'START RECOVERY'
  elements.ruleSafeSpeed.textContent = runSafeLandingSpeed.toFixed(1)
  updateTestModeLabel()
  renderDifficultyPanel()
  lastFrame = performance.now()
  render(true)
  if (autoStart) hideOverlay()
  else showReadyOverlay()
}

function startGame() {
  if (gameState === 'READY') {
    gameState = 'PLAYING'
    elements.pauseButton.disabled = false
    lastFrame = performance.now()
    hideOverlay()
    render(true)
    return
  }
  if (gameState === 'SUCCESS' || gameState === 'CRASHED') resetRun({ autoStart: true })
}

function setPause(nextState, reason = 'MANUAL') {
  if (nextState === 'PAUSED' && gameState === 'PLAYING') {
    gameState = 'PAUSED'
    pauseReason = reason
    keys.left = false
    keys.right = false
    keys.burn = false
    showPausedOverlay()
  } else if (nextState === 'PLAYING' && gameState === 'PAUSED') {
    gameState = 'PLAYING'
    pauseReason = ''
    lastFrame = performance.now()
    hideOverlay()
  }
  render(true)
}

function togglePause() {
  if (gameState === 'PLAYING') setPause('PAUSED', 'MANUAL')
  else if (gameState === 'PAUSED') setPause('PLAYING')
}

function pulseWindShift() {
  windShiftPulseUntil = elapsed + 0.45
}

function updateWind() {
  if (runTestConfig) {
    while (nextWindIndex < scenario.windSchedule.length && elapsed >= scenario.windSchedule[nextWindIndex].at) {
      physics.wind = scenario.windSchedule[nextWindIndex].wind
      nextWindIndex += 1
      pulseWindShift()
    }
    return
  }

  while (
    nextUpperWindIndex < scenario.upperWindSchedule.length &&
    physics.y >= scenario.upperWindSchedule[nextUpperWindIndex].y
  ) {
    physics.wind = scenario.upperWindSchedule[nextUpperWindIndex].wind
    nextUpperWindIndex += 1
    pulseWindShift()
  }

  if (physics.y < UPPER_WIND_END_Y) return

  if (lowerWindStartedAt === null) {
    lowerWindStartedAt = elapsed
    physics.wind = scenario.lowerInitialWind
    pulseWindShift()
  }

  const lowerElapsed = elapsed - lowerWindStartedAt
  while (nextWindIndex < scenario.windSchedule.length && lowerElapsed >= scenario.windSchedule[nextWindIndex].at) {
    physics.wind = scenario.windSchedule[nextWindIndex].wind
    nextWindIndex += 1
    pulseWindShift()
  }
}

function currentRecovery() {
  return calculateRecovery(physics, {
    pad: PAD,
    safeLandingSpeed: runSafeLandingSpeed,
    groundY: DEFAULT_PHYSICS_CONFIG.groundY,
    minDescentSpeed: DEFAULT_PHYSICS_CONFIG.minDescentSpeed,
  })
}

function finishRun() {
  physics.y = DEFAULT_PHYSICS_CONFIG.groundY
  const landing = evaluateLanding(physics, PAD, runSafeLandingSpeed)
  const recovery = currentRecovery()
  const distance = Math.abs(physics.x - PAD.centerX) / (PAD.width / 2)
  const speedRatio = physics.vy / runSafeLandingSpeed
  const angleRatio = Math.abs(physics.angle) / 5
  const quality = Math.round(Math.max(0, Math.min(100,
    100 - distance * 10 - speedRatio * 6 - angleRatio * 6,
  )))

  lastResult = { landing, quality, recovery }

  if (runTestConfig && difficultySession.active && !difficultySession.completed) {
    difficultySession = appendDifficultyRecord(difficultySession, {
      success: landing.success,
      landingSpeed: physics.vy,
      landingAngle: physics.angle,
      positionPass: landing.insidePad,
      fuelLeft: physics.fuel,
      failureReason: landing.failures.join(' · '),
      recoveryQuality: landing.success ? quality : 0,
      elapsedSeconds: elapsed,
    })
    saveDifficultySession(window.localStorage, difficultySession)
    renderDifficultyPanel()
  }

  keys.left = false
  keys.right = false
  keys.burn = false
  elements.pauseButton.disabled = true

  if (landing.success) {
    gameState = 'SUCCESS'
    persistent = {
      ...persistent,
      bestRecoveryQuality: Math.max(persistent.bestRecoveryQuality, quality),
      successfulRecoveries: persistent.successfulRecoveries + 1,
    }
    savePersistent(window.localStorage, persistent)
    showResultOverlay(true)
  } else {
    gameState = 'CRASHED'
    elements.explosion.style.left = `${(physics.x / DEFAULT_PHYSICS_CONFIG.worldWidth) * 100}%`
    elements.explosion.style.top = `${(physics.y / 380) * 100}%`
    elements.world.classList.add('is-crashed')
    showResultOverlay(false)
  }
  render(true)
}

function update(dt) {
  if (gameState !== 'PLAYING') return

  elapsed = Math.min(GAME_DURATION, elapsed + dt)
  updateWind()
  physics = stepPhysics(physics, keys, dt)

  const recovery = currentRecovery()
  const smoothing = Math.min(1, dt * 4.5)
  displayedRecovery += (recovery.chance - displayedRecovery) * smoothing

  if (physics.y >= DEFAULT_PHYSICS_CONFIG.groundY) {
    finishRun()
    return
  }

  if (elapsed >= GAME_DURATION) {
    // Defensive fallback: legal scenarios are tested to make contact before this point.
    physics.y = DEFAULT_PHYSICS_CONFIG.groundY
    finishRun()
  }
}

function setStatus(element, value, classValue = value) {
  element.textContent = value
  element.className = `status-${classValue.toLowerCase()}`
}

function resultClassForDescent(speed) {
  if (speed <= runSafeLandingSpeed) return 'result-safe'
  if (speed <= runSafeLandingSpeed * 1.65) return 'result-warning'
  return 'result-critical'
}

function resultClassForAngle(angle) {
  const absoluteAngle = Math.abs(angle)
  if (absoluteAngle <= 5) return 'result-safe'
  if (absoluteAngle <= 12) return 'result-warning'
  return 'result-critical'
}

function resultLabelForDescent(speed) {
  if (speed <= runSafeLandingSpeed) return 'SAFE'
  if (speed <= runSafeLandingSpeed * 1.65) return 'WARNING'
  return 'CRITICAL'
}

function resultLabelForAngle(angle) {
  const absoluteAngle = Math.abs(angle)
  if (absoluteAngle <= 5) return 'SAFE'
  if (absoluteAngle <= 12) return 'WARNING'
  return 'CRITICAL'
}

function render(force = false) {
  if (!physics) return
  const recovery = currentRecovery()
  if (force && gameState !== 'PLAYING') displayedRecovery = recovery.chance

  const rocketLeft = (physics.x / DEFAULT_PHYSICS_CONFIG.worldWidth) * 100
  const rocketTop = (physics.y / 380) * 100
  elements.rocket.style.left = `${rocketLeft}%`
  elements.rocket.style.top = `${rocketTop}%`
  elements.rocket.style.transform = `translate(-50%, -100%) rotate(${physics.angle.toFixed(2)}deg)`
  elements.rocket.classList.toggle('is-burning', gameState === 'PLAYING' && keys.burn && physics.fuel > 0)

  const markerX = Math.max(0, Math.min(100, (recovery.predictedX / DEFAULT_PHYSICS_CONFIG.worldWidth) * 100))
  elements.marker.style.left = `${markerX}%`

  elements.time.textContent = Math.max(0, GAME_DURATION - elapsed).toFixed(1)
  elements.mass.textContent = `${scenario.mass.toFixed(1)} t`
  elements.entry.textContent = scenario.entrySpeed.toFixed(2)
  elements.wind.textContent = arrowFor(physics.wind)
  elements.recovery.textContent = `${Math.round(displayedRecovery)}%`
  elements.fuelValue.textContent = `${Math.round(physics.fuel)}%`
  elements.fuelBar.style.width = `${physics.fuel}%`
  elements.bestQuality.textContent = `${persistent.bestRecoveryQuality}%`
  elements.successCount.textContent = String(persistent.successfulRecoveries)
  elements.gameStatus.textContent = gameState === 'PAUSED' ? `PAUSED · ${pauseReason}` : gameState
  elements.pauseButton.textContent = gameState === 'PAUSED' ? 'P · RESUME' : 'P · PAUSE'

  setStatus(elements.positionStatus, recovery.status.position)
  setStatus(elements.descentStatus, `${physics.vy.toFixed(1)} ${recovery.status.descent}`, recovery.status.descent)
  setStatus(elements.angleStatus, `${physics.angle >= 0 ? '+' : ''}${physics.angle.toFixed(1)}° ${recovery.status.angle}`, recovery.status.angle)
  setStatus(elements.fuelStatus, recovery.status.fuel)

  let next = null
  let untilNext = Infinity
  if (runTestConfig) {
    next = scenario.windSchedule[nextWindIndex]
    untilNext = next ? next.at - elapsed : Infinity
  } else if (physics.y < UPPER_WIND_END_Y) {
    next = scenario.upperWindSchedule[nextUpperWindIndex]
    if (next) untilNext = Math.max(0, (next.y - physics.y) / Math.max(physics.vy, 0.1))
  } else if (lowerWindStartedAt !== null) {
    next = scenario.windSchedule[nextWindIndex]
    const lowerElapsed = elapsed - lowerWindStartedAt
    untilNext = next ? next.at - lowerElapsed : Infinity
  }

  if (next && untilNext >= 0 && untilNext <= WIND_WARNING_SECONDS) {
    elements.nextWind.hidden = false
    elements.nextWind.textContent = `NEXT ${arrowFor(next.wind)} · ${untilNext.toFixed(1)}s`
  } else {
    elements.nextWind.hidden = true
  }

  elements.windAnnounce.hidden = !(windShiftPulseUntil > 0 && elapsed <= windShiftPulseUntil)
}

function hideOverlay() {
  elements.stateOverlay.hidden = true
}

function resetResultTitleColor() {
  elements.stateTitle.classList.remove('result-title-safe', 'result-title-critical')
}

function showReadyOverlay() {
  elements.stateOverlay.hidden = false
  resetResultTitleColor()
  elements.stateKicker.textContent = runTestConfig
    ? `${runTestConfig.group === 'LEGACY' ? 'TEST SCENARIO' : 'DIFFICULTY TEST'} ${runTestConfig.run}${runTestConfig.group === 'LEGACY' ? '' : '/20'} · SAFE ${runSafeLandingSpeed.toFixed(1)}`
    : 'RE-ENTRY READY'
  elements.stateTitle.textContent = '30초 안에 로켓을 살려내세요.'
  elements.stateCopy.textContent = `MASS ${scenario.mass.toFixed(1)}t · ENTRY ${scenario.entrySpeed.toFixed(2)} · WIND ${arrowFor(scenario.initialWind)}. 좌우로 기울이고 ↑로 제한된 연료를 사용합니다.`
  elements.resultDiagnostics.hidden = true
  elements.primaryAction.textContent = 'START RECOVERY'
}

function showPausedOverlay() {
  elements.stateOverlay.hidden = false
  resetResultTitleColor()
  elements.stateKicker.textContent = pauseReason === 'FOCUS' ? 'AUTO PAUSED' : 'PAUSED'
  elements.stateTitle.textContent = '게임 상태를 그대로 유지했습니다.'
  elements.stateCopy.textContent = 'P 키 또는 아래 버튼으로 같은 위치·속도·연료에서 계속하세요.'
  elements.resultDiagnostics.hidden = true
  elements.primaryAction.textContent = 'RESUME'
}

function showResultOverlay(success) {
  elements.stateOverlay.hidden = false
  elements.stateKicker.textContent = success ? 'TOUCHDOWN' : 'MISSION FAILED'
  elements.stateTitle.textContent = success ? 'BOOSTER RECOVERED' : 'BOOSTER LOST'
  elements.stateTitle.classList.toggle('result-title-safe', success)
  elements.stateTitle.classList.toggle('result-title-critical', !success)
  const isDifficultyRun = runTestConfig && runTestConfig.group !== 'LEGACY'
  elements.stateCopy.textContent = isDifficultyRun
    ? `${success ? `회수 품질 ${lastResult.quality}%.` : `${lastResult.landing.failures.join(' · ')}.`} 이번 결과는 ${runTestConfig.run}/20 기록으로 자동 저장되었습니다.`
    : success
      ? `회수 품질 ${lastResult.quality}%. 다시 시작하면 새로운 질량·진입속도·바람 조건이 생성됩니다.`
      : `${lastResult.landing.failures.join(' · ')}. 같은 조작 원리를 이용해 다시 시도하세요.`
  elements.resultDiagnostics.hidden = false
  elements.resultDiagnostics.innerHTML = `
    <p><span>POSITION</span><strong class="${lastResult.landing.insidePad ? 'result-safe' : 'result-critical'}">${lastResult.landing.insidePad ? 'PASS' : 'FAIL'}</strong></p>
    <p><span>DESCENT</span><strong class="${resultClassForDescent(physics.vy)}">${resultLabelForDescent(physics.vy)} · ${physics.vy.toFixed(2)} / 기준 ${runSafeLandingSpeed.toFixed(1)}</strong></p>
    <p><span>ANGLE</span><strong class="${resultClassForAngle(physics.angle)}">${resultLabelForAngle(physics.angle)} · ${physics.angle.toFixed(1)}° / 기준 ±5°</strong></p>
    <p><span>FUEL LEFT</span><strong>${Math.round(physics.fuel)}%</strong></p>
  `
  if (runTestConfig && runTestConfig.group !== 'LEGACY') {
    elements.primaryAction.textContent = difficultySession.completed
      ? 'CSV 다운로드'
      : `다음 테스트 · ${difficultySession.currentRun + 1}/20`
  } else {
    elements.primaryAction.textContent = 'RETRY'
  }
}

function downloadDifficultyCsv() {
  const csv = buildDifficultyCsv(difficultySession)
  if (!csv) return
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'recovery-difficulty-test-20-runs.csv'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function startDifficultyTest() {
  difficultySession = createDifficultySession()
  saveDifficultySession(window.localStorage, difficultySession)
  resetRun({ autoStart: false })
}

function resetDifficultyTest() {
  if (!window.confirm('20회 난이도 테스트 기록을 모두 초기화할까요?')) return
  difficultySession = clearDifficultySession(window.localStorage)
  resetRun({ autoStart: false })
}

function renderDifficultyPanel() {
  const recorded = difficultySession.records.length
  if (!difficultySession.active) {
    elements.difficultyProgress.textContent = '20회 난이도 테스트 · 미시작'
    elements.difficultyDetail.textContent = '동일한 10개 시나리오 · 안전속도 3.5 → 4.0'
    elements.difficultyStart.hidden = false
    elements.difficultyReset.hidden = true
    elements.difficultyDownload.disabled = true
    return
  }

  if (difficultySession.completed) {
    elements.difficultyProgress.textContent = '20 / 20 COMPLETE'
    elements.difficultyDetail.textContent = '20회 기록 완료 · CSV 파일을 받을 수 있습니다.'
    elements.difficultyStart.hidden = true
    elements.difficultyReset.hidden = false
    elements.difficultyDownload.disabled = false
    return
  }

  const config = getDifficultyRunConfig(difficultySession)
  elements.difficultyProgress.textContent = `${recorded} / 20 기록 · 다음 ${config.run}회`
  elements.difficultyDetail.textContent = `${config.group} · 시나리오 ${config.scenarioIndex + 1}/10 · 안전속도 ${config.safeSpeed.toFixed(1)}`
  elements.difficultyStart.hidden = true
  elements.difficultyReset.hidden = false
  elements.difficultyDownload.disabled = true
}

function updateTestModeLabel() {
  if (runTestConfig) {
    elements.testModeLabel.hidden = false
    elements.testModeLabel.textContent = runTestConfig.group === 'LEGACY'
      ? `TEST ${runTestConfig.run}/10 · SAFE ${runSafeLandingSpeed.toFixed(1)}`
      : `20-RUN TEST ${runTestConfig.run}/20 · ${runTestConfig.group} · SAFE ${runSafeLandingSpeed.toFixed(1)}`
  } else if (difficultySession.completed) {
    elements.testModeLabel.hidden = false
    elements.testModeLabel.textContent = '20-RUN TEST COMPLETE'
  } else {
    elements.testModeLabel.hidden = true
  }
}

function handlePrimaryAction() {
  if (gameState === 'PAUSED') {
    setPause('PLAYING')
    return
  }
  if ((gameState === 'SUCCESS' || gameState === 'CRASHED') && runTestConfig && runTestConfig.group !== 'LEGACY') {
    if (difficultySession.completed) downloadDifficultyCsv()
    else resetRun({ autoStart: true })
    return
  }
  startGame()
}

function setReducedMotion(value) {
  persistent = { ...persistent, reducedMotion: Boolean(value) }
  savePersistent(window.localStorage, persistent)
  document.body.dataset.reducedMotion = String(persistent.reducedMotion)
  elements.world.classList.toggle('reduce-motion', persistent.reducedMotion)
}

function handleKeyDown(event) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyP', 'Space'].includes(event.code)) event.preventDefault()
  if (event.code === 'KeyP' && !event.repeat) {
    togglePause()
    return
  }
  if (event.code === 'Space' && !event.repeat && (gameState === 'READY' || gameState === 'SUCCESS' || gameState === 'CRASHED')) {
    handlePrimaryAction()
    return
  }
  if (gameState !== 'PLAYING') return
  if (!event.repeat && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) {
    physics.angle = nudgeAngle(physics.angle, event.code)
  }
  if (event.code === 'ArrowLeft') keys.left = true
  if (event.code === 'ArrowRight') keys.right = true
  if (event.code === 'ArrowUp') keys.burn = true
}

function handleKeyUp(event) {
  if (event.code === 'ArrowLeft') keys.left = false
  if (event.code === 'ArrowRight') keys.right = false
  if (event.code === 'ArrowUp') keys.burn = false
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
  lastFrame = now
  update(dt)
  render()
  requestAnimationFrame(frame)
}

elements.primaryAction.addEventListener('click', handlePrimaryAction)
elements.pauseButton.addEventListener('click', togglePause)
elements.reduceMotion.addEventListener('change', (event) => setReducedMotion(event.target.checked))
elements.difficultyStart.addEventListener('click', startDifficultyTest)
elements.difficultyReset.addEventListener('click', resetDifficultyTest)
elements.difficultyDownload.addEventListener('click', downloadDifficultyCsv)
window.addEventListener('keydown', handleKeyDown, { passive: false })
window.addEventListener('keyup', handleKeyUp)
window.addEventListener('blur', () => {
  if (gameState === 'PLAYING') setPause('PAUSED', 'FOCUS')
})

elements.reduceMotion.checked = persistent.reducedMotion
document.body.dataset.reducedMotion = String(persistent.reducedMotion)
elements.world.classList.toggle('reduce-motion', persistent.reducedMotion)
renderDifficultyPanel()
resetRun()
requestAnimationFrame(frame)
