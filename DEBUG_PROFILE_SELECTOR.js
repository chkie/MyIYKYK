// === COPY THIS TO BROWSER CONSOLE AFTER LOGIN ===
console.log('=== PROFILE SELECTOR DEBUG ===');
console.log('1. localStorage profile:', localStorage.getItem('myiykyk_profile'));
console.log('2. Has profile (should be null):', !!localStorage.getItem('myiykyk_profile'));
console.log('3. Cookie auth:', document.cookie);
console.log('4. ProfileSelector DOM:', document.querySelector('.fixed.inset-0.z-\\[9999\\]'));
console.log('5. Current path:', window.location.pathname);
console.log('6. Browser:', typeof window !== 'undefined');

// Check if profiles are loaded
setTimeout(() => {
  console.log('=== AFTER 1 SECOND ===');
  console.log('ProfileSelector visible?', !!document.querySelector('.fixed.inset-0.z-\\[9999\\]'));
}, 1000);
