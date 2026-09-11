import './style.css'
import './assignment-link.css'
import { mountAssignmentLink } from './assignment-link.js'

const accordionTriggers = document.querySelectorAll('.accordion-trigger')

accordionTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const panelId = trigger.getAttribute('aria-controls')
    const panel = document.getElementById(panelId)
    const isOpen = trigger.getAttribute('aria-expanded') === 'true'

    trigger.setAttribute('aria-expanded', String(!isOpen))
    panel.hidden = isOpen

    const label = trigger.querySelector('span:first-child')
    const icon = trigger.querySelector('.toggle-icon')

    label.textContent = isOpen ? '과정 보기' : '과정 닫기'
    icon.textContent = isOpen ? '+' : '−'
  })
})

mountAssignmentLink()
