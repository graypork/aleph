import { startAuthentication, startRegistration } from '@simplewebauthn/browser'

const ACCOUNT_OPTIONS = [
  { id: 'miles', label: 'Miles' },
  { id: 'sandbox', label: 'Sandbox' },
]

function endpoint(action, extra = '') {
  return `/api/passkey?action=${encodeURIComponent(action)}${extra}`
}

async function api(action, { method = 'GET', body, extra = '' } = {}) {
  const response = await fetch(endpoint(action, extra), {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP_${response.status}`)
    error.status = response.status
    error.code = payload.error || null
    throw error
  }
  return payload
}

function humanError(error) {
  switch (error?.code) {
    case 'NO_PASSKEY_REGISTERED':
      return '등록된 패스키가 없습니다. 먼저 첫 패스키를 등록해 주세요.'
    case 'OWNER_SESSION_REQUIRED':
      return '이미 패스키가 등록된 계정입니다. 먼저 패스키로 로그인한 뒤 추가해 주세요.'
    case 'CHALLENGE_EXPIRED_OR_USED':
      return '일회용 질문이 만료되었거나 이미 사용되었습니다. 다시 시도해 주세요.'
    case 'CREDENTIAL_NOT_ALLOWED':
    case 'AUTHENTICATION_VERIFICATION_FAILED':
      return '이 계정에 등록된 패스키로 확인되지 않았습니다.'
    case 'PASSKEY_SERVICE_UNAVAILABLE':
      return '패스키 서버에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.'
    default:
      return '요청을 처리하지 못했습니다. 다시 시도해 주세요.'
  }
}

function formatDate(value) {
  if (!value) return '날짜 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function createSection() {
  const section = document.createElement('section')
  section.id = 'private-area'
  section.className = 'private-area section-shell section-block'
  section.setAttribute('aria-labelledby', 'private-title')
  section.innerHTML = `
    <div class="private-frame">
      <header class="private-header">
        <div>
          <p class="micro-label private-label">PRIVATE / PASSKEY</p>
          <h2 id="private-title">나만 보는 자리</h2>
          <p class="private-intro">공개 소개와 분리된 패스키 전용 영역입니다. 실제 개인정보 대신 과제용 가상 메모만 사용합니다.</p>
        </div>
        <p class="private-state" data-passkey-state>잠금 상태 확인 중</p>
      </header>

      <div class="private-locked" data-locked-view hidden>
        <div class="private-boundary-copy">
          <strong>여기부터 비공개입니다.</strong>
          <span>패스키 확인 전에는 서버가 비공개 자료를 보내지 않습니다.</span>
        </div>

        <div class="private-control-grid">
          <label class="private-field">
            <span>테스트 계정</span>
            <select data-account-select>
              ${ACCOUNT_OPTIONS.map((account) => `<option value="${account.id}">${account.label}</option>`).join('')}
            </select>
          </label>
          <label class="private-field">
            <span>패스키 이름</span>
            <input data-passkey-name type="text" maxlength="40" autocomplete="off" placeholder="예: 노트북 Touch ID" />
          </label>
        </div>

        <div class="private-actions">
          <button class="private-primary" type="button" data-login>패스키로 들어가기</button>
          <button class="private-secondary" type="button" data-register>첫 패스키 등록</button>
        </div>
        <p class="private-help">비밀번호 입력란은 없습니다. 첫 등록 뒤에는 해당 계정의 패스키로 로그인해야 새 패스키를 추가할 수 있습니다.</p>
      </div>

      <div class="private-unlocked" data-unlocked-view hidden>
        <div class="private-session-row">
          <div>
            <p class="micro-label private-label">SESSION</p>
            <p class="private-account" data-session-user></p>
          </div>
          <button class="private-secondary" type="button" data-logout>로그아웃</button>
        </div>

        <div class="private-content-grid">
          <section class="private-card" aria-labelledby="private-notes-title">
            <div class="private-card-heading">
              <p class="micro-label private-label">PRIVATE NOTES</p>
              <h3 id="private-notes-title">서버가 로그인 뒤에만 보내는 자료</h3>
            </div>
            <div class="private-note-list" data-private-notes></div>
          </section>

          <section class="private-card" aria-labelledby="passkey-list-title">
            <div class="private-card-heading">
              <p class="micro-label private-label">PASSKEYS</p>
              <h3 id="passkey-list-title">등록된 패스키</h3>
            </div>
            <div class="private-passkey-list" data-passkey-list></div>

            <div class="private-add-row">
              <label class="private-field private-field-grow">
                <span>새 패스키 이름</span>
                <input data-add-name type="text" maxlength="40" autocomplete="off" placeholder="예: 휴대폰 패스키" />
              </label>
              <button class="private-primary" type="button" data-add-passkey>패스키 추가</button>
            </div>
            <p class="private-zero-warning" data-zero-warning hidden>패스키가 0개 남았습니다. 현재 로그인 세션이 살아 있을 때 새 패스키를 등록해야 합니다. 로그아웃하면 다시 초기 등록 상태가 됩니다.</p>
          </section>
        </div>
      </div>

      <p class="private-message" data-passkey-message role="status" aria-live="polite"></p>
    </div>
  `
  return section
}

export function mountPasskeyArea() {
  const root = document.querySelector('main')
  if (!root || document.querySelector('#private-area')) return

  const section = createSection()
  root.append(section)

  const lockedView = section.querySelector('[data-locked-view]')
  const unlockedView = section.querySelector('[data-unlocked-view]')
  const stateLabel = section.querySelector('[data-passkey-state]')
  const message = section.querySelector('[data-passkey-message]')
  const accountSelect = section.querySelector('[data-account-select]')
  const passkeyName = section.querySelector('[data-passkey-name]')
  const addName = section.querySelector('[data-add-name]')
  const sessionUser = section.querySelector('[data-session-user]')
  const notesRoot = section.querySelector('[data-private-notes]')
  const credentialRoot = section.querySelector('[data-passkey-list]')
  const zeroWarning = section.querySelector('[data-zero-warning]')
  const buttons = [...section.querySelectorAll('button')]

  let currentUser = null

  function setBusy(busy) {
    buttons.forEach((button) => { button.disabled = busy })
    stateLabel.textContent = busy ? '확인 중' : (currentUser ? '패스키 확인됨' : '잠김')
  }

  function setMessage(text, type = '') {
    message.textContent = text
    message.dataset.type = type
  }

  function showLocked() {
    currentUser = null
    lockedView.hidden = false
    unlockedView.hidden = true
    stateLabel.textContent = '잠김'
    notesRoot.replaceChildren()
    credentialRoot.replaceChildren()
    zeroWarning.hidden = true
  }

  function renderPrivate(data) {
    notesRoot.replaceChildren()
    for (const item of data?.items ?? []) {
      const article = document.createElement('article')
      article.className = 'private-note'
      const title = document.createElement('h4')
      const body = document.createElement('p')
      title.textContent = item.title
      body.textContent = item.body
      article.append(title, body)
      notesRoot.append(article)
    }
  }

  function renderCredentials(credentials) {
    credentialRoot.replaceChildren()
    zeroWarning.hidden = credentials.length !== 0

    if (credentials.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'private-empty'
      empty.textContent = '등록된 패스키가 없습니다.'
      credentialRoot.append(empty)
      return
    }

    for (const credential of credentials) {
      const row = document.createElement('div')
      row.className = 'private-passkey-row'
      const meta = document.createElement('div')
      const name = document.createElement('strong')
      const date = document.createElement('span')
      const remove = document.createElement('button')
      name.textContent = credential.name || '이름 없는 패스키'
      date.textContent = `등록 ${formatDate(credential.createdAt)}`
      meta.append(name, date)
      remove.type = 'button'
      remove.className = 'private-delete'
      remove.textContent = '삭제'
      remove.addEventListener('click', () => removeCredential(credential.id))
      row.append(meta, remove)
      credentialRoot.append(row)
    }
  }

  async function refreshAuthenticated() {
    const session = await api('session')
    currentUser = session.user
    const [privatePayload, credentialPayload] = await Promise.all([
      api('private'),
      api('credentials'),
    ])
    lockedView.hidden = true
    unlockedView.hidden = false
    stateLabel.textContent = '패스키 확인됨'
    sessionUser.textContent = `${session.user.displayName} 계정 · 패스키 ${session.credentialCount}개`
    renderPrivate(privatePayload.data)
    renderCredentials(credentialPayload.credentials)
  }

  async function register(userId, name, adding = false) {
    if (!window.PublicKeyCredential) {
      setMessage('이 브라우저는 패스키(WebAuthn)를 지원하지 않습니다.', 'error')
      return
    }
    if (!String(name).trim()) {
      setMessage('패스키 이름을 먼저 입력해 주세요.', 'error')
      return
    }

    setBusy(true)
    setMessage('기기에 패스키 등록 요청을 보냈습니다.')
    try {
      const start = await api('register-options', {
        method: 'POST',
        body: { userId, name: String(name).trim() },
      })
      const response = await startRegistration({ optionsJSON: start.options })
      await api('register-verify', {
        method: 'POST',
        body: { userId, challengeId: start.challengeId, response },
      })
      setMessage(adding ? '새 패스키를 등록했습니다.' : '첫 패스키를 등록하고 로그인했습니다.', 'success')
      passkeyName.value = ''
      addName.value = ''
      await refreshAuthenticated()
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        setMessage('등록을 취소했습니다. 서버에는 패스키가 저장되지 않았습니다.', 'error')
      } else {
        setMessage(humanError(error), 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  async function login() {
    if (!window.PublicKeyCredential) {
      setMessage('이 브라우저는 패스키(WebAuthn)를 지원하지 않습니다.', 'error')
      return
    }

    setBusy(true)
    setMessage('등록된 패스키를 확인합니다.')
    try {
      const userId = accountSelect.value
      const start = await api('login-options', { method: 'POST', body: { userId } })
      const response = await startAuthentication({ optionsJSON: start.options })
      await api('login-verify', {
        method: 'POST',
        body: { userId, challengeId: start.challengeId, response },
      })
      setMessage('패스키 확인에 성공했습니다.', 'success')
      await refreshAuthenticated()
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        setMessage('패스키 확인을 취소했습니다.', 'error')
      } else {
        setMessage(humanError(error), 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setBusy(true)
    try {
      await api('logout', { method: 'POST' })
      showLocked()
      setMessage('로그아웃했습니다. 비공개 자료를 다시 숨겼습니다.', 'success')
    } catch (error) {
      setMessage(humanError(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function removeCredential(credentialId) {
    setBusy(true)
    try {
      const result = await api('credentials', { method: 'DELETE', body: { credentialId } })
      const credentials = await api('credentials')
      renderCredentials(credentials.credentials)
      sessionUser.textContent = `${currentUser.displayName} 계정 · 패스키 ${result.remaining}개`
      setMessage(result.lockedOut ? '마지막 패스키를 삭제했습니다. 로그아웃 전에 새 패스키를 등록하세요.' : '패스키를 삭제했습니다.', result.lockedOut ? 'error' : 'success')
    } catch (error) {
      setMessage(humanError(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  section.querySelector('[data-register]').addEventListener('click', () => register(accountSelect.value, passkeyName.value, false))
  section.querySelector('[data-login]').addEventListener('click', login)
  section.querySelector('[data-logout]').addEventListener('click', logout)
  section.querySelector('[data-add-passkey]').addEventListener('click', () => register(currentUser?.userId, addName.value, true))

  setBusy(true)
  api('session')
    .then(() => refreshAuthenticated())
    .catch((error) => {
      if (error?.status === 401) {
        showLocked()
        setMessage('비공개 영역은 잠겨 있습니다.')
      } else {
        showLocked()
        setMessage(humanError(error), 'error')
      }
    })
    .finally(() => setBusy(false))
}
