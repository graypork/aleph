export function mountAssignmentLink() {
  const evidence = document.querySelector('.hero-evidence')
  if (!evidence || evidence.querySelector('.hero-actions')) return false

  const existingLink = evidence.querySelector('.hero-link')
  if (!existingLink) return false

  const actions = document.createElement('div')
  actions.className = 'hero-actions'

  const assignment02 = document.createElement('a')
  assignment02.className = 'text-link hero-assignment-link'
  assignment02.href = '/play/'
  assignment02.innerHTML = '<span class="assignment-mini">ASSIGNMENT 02</span><span>RECOVERY GAME →</span>'

  const assignment03 = document.createElement('a')
  assignment03.className = 'text-link hero-assignment-link'
  assignment03.href = '/studio/'
  assignment03.innerHTML = '<span class="assignment-mini">ASSIGNMENT 03</span><span>CARD STUDIO →</span>'

  const assignment04 = document.createElement('a')
  assignment04.className = 'text-link hero-assignment-link'
  assignment04.href = '/board/'
  assignment04.innerHTML = '<span class="assignment-mini">ASSIGNMENT 04</span><span>REAL INFO BOARD →</span>'

  existingLink.replaceWith(actions)
  actions.append(existingLink, assignment02, assignment03, assignment04)
  return true
}
