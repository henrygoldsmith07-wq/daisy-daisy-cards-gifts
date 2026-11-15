'use strict';
const nav=document.querySelector('#main-nav'),toggle=document.querySelector('.nav-toggle');
function closeMenu(){if(!toggle||!nav)return;toggle.setAttribute('aria-expanded','false');nav.classList.remove('nav-open');}
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('nav-open',open);});nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});matchMedia('(min-width:801px)').addEventListener('change',closeMenu);}
