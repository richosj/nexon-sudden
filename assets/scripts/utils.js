/**
 * utils.js — 20주년 공용 모달·스크롤 락
 *
 * Utils.alert(msg)           — 확인 1버튼, Promise<boolean>
 * Utils.confirm(msg)         — 예/아니오, Promise<boolean>
 * Utils.bodyScroll.hide/show — 모달·드로어 오픈 시 body 스크롤 잠금
 *
 * DOM: .modal-shade, .modal.modal-confirm, .modal-message, .modal-buttons
 * 스타일: assets/styles/partials/_modals.scss
 */
(function (window) {
  const createElement = (tagName, className) => {
    const element = document.createElement(tagName);
    if (!className) return element;
    if (Array.isArray(className)) {
      element.classList.add(...className);
    } else {
      element.classList.add(className);
    }
    return element;
  };

  const createModal = (msg, options) => {
    const shade = createElement("div", "modal-shade");
    const modal = createElement("div", ["modal", "modal-confirm"]);
    const message = createElement("p", "modal-message");
    const buttons = createElement("div", "modal-buttons");

    if (options.buttonClose) {
      modal.appendChild(createElement("button", "modal-button__close"));
    }
    if (options.image) {
      const imageDiv = createElement("div", "modal-image");
      const image = createElement("img");
      image.src = options.image;
      imageDiv.appendChild(image);
      modal.appendChild(imageDiv);
    }

    message.innerHTML = msg;
    modal.appendChild(message);
    modal.appendChild(buttons);
    return { shade, modal, buttons };
  };

  const showModal = (el) => {
    document.body.appendChild(el.shade);
    document.body.appendChild(el.modal);
    Utils.bodyScroll.hide();
  };

  const closeModal = (el, callback) => {
    document.body.removeChild(el.shade);
    document.body.removeChild(el.modal);
    Utils.bodyScroll.show();
    if (callback) callback();
  };

  window.Utils = {
    alert: (message, { buttonClose = false } = {}) =>
      new Promise((resolve) => {
        const el = createModal(message, { buttonClose });
        el.buttons.appendChild(
          Object.assign(createElement("button", "modal-button__confirm"), {
            type: "button",
            textContent: "확인",
          })
        );
        showModal(el);

        if (buttonClose) {
          el.modal
            .querySelector(".modal-button__close")
            .addEventListener("click", () => closeModal(el, () => resolve(true)));
        }
        el.modal
          .querySelector(".modal-button__confirm")
          .addEventListener("click", () => closeModal(el, () => resolve(true)));
      }),

    confirm: (message, { buttonClose = false, image = "" } = {}) =>
      new Promise((resolve) => {
        const el = createModal(message, { buttonClose, image });
        el.buttons.appendChild(
          Object.assign(createElement("button", "modal-button__yes"), {
            type: "button",
            textContent: "예",
          })
        );
        el.buttons.appendChild(
          Object.assign(createElement("button", "modal-button__no"), {
            type: "button",
            textContent: "아니오",
          })
        );
        showModal(el);

        if (buttonClose) {
          el.modal
            .querySelector(".modal-button__close")
            .addEventListener("click", () => closeModal(el, () => resolve(false)));
        }
        el.modal
          .querySelector(".modal-button__yes")
          .addEventListener("click", () => closeModal(el, () => resolve(true)));
        el.modal
          .querySelector(".modal-button__no")
          .addEventListener("click", () => closeModal(el, () => resolve(false)));
      }),

    bodyScroll: {
      show: () => {
        document.body.style.paddingRight = "";
        document.body.style.overflow = "";
      },
      hide: () => {
        const body = document.body;
        if (body.style.overflow === "") {
          body.style.paddingRight = window.innerWidth - body.clientWidth + "px";
          body.style.overflow = "hidden";
        }
      },
    },
  };
})(window);
