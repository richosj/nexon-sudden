// document.addEventListener("DOMContentLoaded", () => {
//   gsap.registerPlugin(ScrollTrigger);
// });

// POPUP
const openPopup = (id) => {
  gsap.to(document.querySelector(`#${id}`), {
    opacity: 1,
    duration: 0.2,
    ease: "power2.out",
  });

  document.body.style.overflow = "hidden";
  document.querySelector(`#${id}`).style.display = "flex";
};

const closePopup = (id) => {
  gsap.to(document.querySelector(`#${id}`), {
    opacity: 0,
    duration: 0.2,
    ease: "power2.out",
  });

  setTimeout(() => {
    document.body.style.overflow = "auto";
    document.querySelector(`#${id}`).style.display = "none";
  }, 200);
};

document.querySelectorAll(".popup").forEach((popup) => {
  popup.addEventListener("click", (e) => {
    if (!e.target.closest(".popup__content")) {
      closePopup(popup.id);
    }
  });
});

// ASIDE
const toggleAside = () => {
  document.querySelector(".aside").classList.toggle("active");
};
