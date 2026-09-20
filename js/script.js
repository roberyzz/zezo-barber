// ZezoBarber — script base
// Por enquanto só controla o menu mobile; vamos adicionar mais coisas
// conforme construímos as próximas seções/páginas.

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("nav-links--open");
    });
  }
});