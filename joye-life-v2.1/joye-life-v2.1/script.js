const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.desktop-nav');

menuButton?.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  if (!expanded) {
    Object.assign(nav.style, {
      display: 'flex', position: 'absolute', top: '66px', left: '0', right: '0',
      flexDirection: 'column', padding: '22px', background: '#fff',
      border: '1px solid #e8e9ee', borderRadius: '14px',
      boxShadow: '0 20px 50px rgba(20,25,40,.12)'
    });
  } else nav.removeAttribute('style');
});

document.querySelectorAll('.task input').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    checkbox.closest('.task').style.opacity = checkbox.checked ? '.55' : '1';
  });
});

const form = document.getElementById('waitlist-form');
const message = document.getElementById('form-message');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const email = form.email.value.trim();
  const company = form.company.value.trim();
  message.textContent = '';
  button.disabled = true;
  button.textContent = 'Joining…';

  try {
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, company, source: 'homepage' })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to join right now.');
    message.textContent = data.message || "You're on the founding waitlist. Welcome to JOYE.";
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Join the waitlist';
  }
});

const revealItems = document.querySelectorAll('.problem-cards article,.feature-card,.steps article,.pricing-card,.founder-card');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.animate([
        { opacity: 0, transform: 'translateY(24px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .12 });
revealItems.forEach((item) => observer.observe(item));
