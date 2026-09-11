export function mountAssignmentLink() {
  const evidence = document.querySelector('.hero-evidence')
  if (!evidence || evidence.querySelector('.hero-actions')) return false

  const existingLink = evidence.querySelector('.hero-link')
  if (!existingLink) return false

  const actions = document.createElement('div')
  actions.className = 'hero-actions'

  const assignment = document.createElement('a')
  assignment.className = 'text-link hero-assignment-link'
  assignment.href = '/play/'
  assignment.innerHTML = '<span class="assignment-mini">ASSIGNMENT 02</span><span>RECOVERY GAME →</span>'

  existingLink.replaceWith(actions)
  actions.append(existingLink, assignment)
  return true
}
