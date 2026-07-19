/**
 * utils.js — 공용 모달·스크롤 락
 *
 * Utils.alert(msg, options)    — 확인 1버튼, Promise<boolean>
 * Utils.confirm(msg, options)  — 예/아니오(또는 커스텀 라벨), Promise<boolean>
 *   options.confirmText / cancelText / confirmOnly / title / note / variant
 * Utils.bodyScroll.hide/show
 *
 * DOM: .modal-shade, .modal.modal-confirm
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
    if (options.variant === "warn") modal.classList.add("is-warn");

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
    if (options.title) {
      const title = createElement("h4", "modal-title");
      title.textContent = options.title;
      modal.appendChild(title);
    }

    const message = createElement("p", "modal-message");
    message.innerHTML = msg;
    modal.appendChild(message);

    if (options.note) {
      const note = createElement("div", "modal-note");
      note.innerHTML = options.note;
      modal.appendChild(note);
    }

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
    alert: (
      message,
      {
        buttonClose = false,
        confirmText = "확인",
        title = "",
        note = "",
        variant = "",
      } = {}
    ) =>
      new Promise((resolve) => {
        const el = createModal(message, { buttonClose, title, note, variant });
        el.buttons.classList.add("is-single");
        el.buttons.appendChild(
          Object.assign(createElement("button", "modal-button__confirm"), {
            type: "button",
            textContent: confirmText,
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
        el.shade.addEventListener("click", () =>
          closeModal(el, () => resolve(true))
        );
      }),

    confirm: (
      message,
      {
        buttonClose = false,
        image = "",
        confirmText = "예",
        cancelText = "아니오",
        confirmOnly = false,
        title = "",
        note = "",
        variant = "",
      } = {}
    ) =>
      new Promise((resolve) => {
        const el = createModal(message, {
          buttonClose,
          image,
          title,
          note,
          variant,
        });

        if (confirmOnly) {
          el.buttons.classList.add("is-single");
          el.buttons.appendChild(
            Object.assign(createElement("button", "modal-button__yes"), {
              type: "button",
              textContent: confirmText,
            })
          );
        } else {
          el.buttons.appendChild(
            Object.assign(createElement("button", "modal-button__no"), {
              type: "button",
              textContent: cancelText,
            })
          );
          el.buttons.appendChild(
            Object.assign(createElement("button", "modal-button__yes"), {
              type: "button",
              textContent: confirmText,
            })
          );
        }

        showModal(el);

        if (buttonClose) {
          el.modal
            .querySelector(".modal-button__close")
            .addEventListener("click", () => closeModal(el, () => resolve(false)));
        }
        el.modal
          .querySelector(".modal-button__yes")
          .addEventListener("click", () => closeModal(el, () => resolve(true)));
        const noBtn = el.modal.querySelector(".modal-button__no");
        if (noBtn) {
          noBtn.addEventListener("click", () =>
            closeModal(el, () => resolve(false))
          );
        }
        el.shade.addEventListener("click", () =>
          closeModal(el, () => resolve(false))
        );
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
