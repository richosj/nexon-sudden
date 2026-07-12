(function (window) {
  /**
   * tagName과 className을 받아서 요소를 생성하는 함수입니다.
   * @param {string} tagName - 생성할 요소의 태그 이름입니다.
   * @param {string|string[]} className - 생성할 요소의 클래스 이름입니다. 배열 형태로 여러 개의 클래스를 전달할 수 있습니다.
   * @returns {HTMLElement} - 생성된 요소입니다.
   */
  const createElement = (tagName, className) => {
    const element = document.createElement(tagName);
    if (!className) return element;
    if (Array.isArray(className)) {
      element.classList.add(...className);
    } else if (typeof className === "string") {
      element.classList.add(className);
    } else {
      console.error("Invalid class name type.");
    }
    return element;
  };

  /**
   * 메시지와 옵션을 받아서 경고창을 생성하는 함수입니다.
   * @param {string} msg - 경고창에 표시할 메시지입니다.
   * @param {object} options - 경고창의 옵션입니다.
   * @returns {object} - 경고창의 요소들을 포함하는 객체입니다.
   */
  const createAlert = (msg, options) => {
    const { shade, modal, buttons } = createModal(msg, options);
    const confirm = createElement("button", "modal-button__confirm");
    confirm.type = "button";
    confirm.textContent = "확인";
    buttons.appendChild(confirm);
    return { shade, modal };
  };

  /**
   * 메시지와 옵션을 받아서 확인창을 생성하는 함수입니다.
   * @param {string} msg - 확인창에 표시할 메시지입니다.
   * @param {object} options - 확인창의 옵션입니다.
   * @returns {object} - 확인창의 요소들을 포함하는 객체입니다.
   */
  const createConfirm = (msg, options) => {
    const { shade, modal, buttons } = createModal(msg, options);
    const yes = createElement("button", "modal-button__yes");
    yes.type = "button";
    yes.textContent = "예";
    buttons.appendChild(yes);
    const no = createElement("button", "modal-button__no");
    no.type = "button";
    no.textContent = "아니오";
    buttons.appendChild(no);
    return { shade, modal };
  };

  /**
   * 메시지와 옵션을 받아서 모달창을 생성하는 함수입니다.
   * @param {string} msg - 모달창에 표시할 메시지입니다.
   * @param {object} options - 모달창의 옵션입니다.
   * @returns {object} - 모달창의 요소들을 포함하는 객체입니다.
   */
  const createModal = (msg, options) => {
    const shade = createElement("div", "modal-shade");
    const modal = createElement("div", ["modal", "modal-confirm"]);
    const message = createElement("p", "modal-message");
    const buttons = createElement("div", "modal-buttons");
    if (options.buttonClose) {
      const close = createElement("button", "modal-button__close");
      close.type = "button";
      modal.appendChild(close);
    }
    if (options.image) {
      const imageDiv = createElement("div", "modal-image");
      const image = createElement("img", "");
      image.src = options.image;
      imageDiv.appendChild(image);
      modal.appendChild(imageDiv);
    }
    message.innerHTML = msg;
    modal.appendChild(message);
    modal.appendChild(buttons);
    return { shade, modal, message, buttons };
  };

  /**
   * 모달창을 화면에 표시하는 함수입니다.
   * @param {object} el - 모달창의 요소들을 포함하는 객체입니다.
   */
  const showModal = (el) => {
    const body = document.body;
    body.appendChild(el.shade);
    body.appendChild(el.modal);
    Utils.bodyScroll.hide();
    el.shade.addEventListener("click", function onShadeClick() {
      el.shade.removeEventListener("click", onShadeClick);
      const confirmBtn = el.modal.querySelector(".modal-button__confirm");
      const noBtn = el.modal.querySelector(".modal-button__no");
      if (confirmBtn) confirmBtn.click();
      else if (noBtn) noBtn.click();
    });
  };

  /**
   * 모달창을 닫는 함수입니다.
   * @param {object} el - 모달창의 요소들을 포함하는 객체입니다.
   * @param {function} callback - 모달창이 닫힌 후 실행할 콜백 함수입니다.
   */
  const closeModal = (el, callback) => {
    const body = document.body;
    body.removeChild(el.shade);
    body.removeChild(el.modal);
    Utils.bodyScroll.show();
    if (callback) {
      callback();
    }
  };

  window.Utils = {
    /**
     * Utils 객체에 alert 메소드를 추가합니다.
     * @param {string} message - 경고창에 표시할 메시지입니다.
     * @param {object} options - 경고창의 옵션입니다.
     * @param {boolean} options.buttonClose - 닫기 버튼을 표시할지 여부입니다.
     * @returns {Promise<boolean>} - 경고창이 닫힐 때까지 대기하는 Promise 객체입니다.
     */
    alert: async (message, { buttonClose = false } = {}) => {
      return new Promise((resolve) => {
        const el = createAlert(message, { buttonClose });
        showModal(el);

        if (buttonClose) {
          el.modal
            .querySelector(".modal-button__close")
            .addEventListener("click", () => {
              closeModal(el, () => resolve(true));
            });
        }
        el.modal
          .querySelector(".modal-button__confirm")
          .addEventListener("click", () => {
            closeModal(el, () => resolve(true));
          });
      });
    },
    /**
     * Utils 객체에 confirm 메소드를 추가합니다.
     * @param {string} message - 확인창에 표시할 메시지입니다.
     * @param {object} options - 확인창의 옵션입니다.
     * @param {boolean} options.buttonClose - 닫기 버튼을 표시할지 여부입니다.
     * @param {string} options.image - 확인창에 표시할 이미지의 URL입니다.
     * @returns {Promise<boolean>} - 확인창이 닫힐 때까지 대기하는 Promise 객체입니다.
     */
    confirm: async (message, { buttonClose = false, image = "" } = {}) => {
      return new Promise((resolve) => {
        const el = createConfirm(message, { buttonClose, image });
        showModal(el);

        if (buttonClose) {
          el.modal
            .querySelector(".modal-button__close")
            .addEventListener("click", () => {
              closeModal(el, () => resolve(false));
            });
        }
        el.modal
          .querySelector(".modal-button__yes")
          .addEventListener("click", () => {
            closeModal(el, () => resolve(true));
          });
        el.modal
          .querySelector(".modal-button__no")
          .addEventListener("click", () => {
            closeModal(el, () => resolve(false));
          });
      });
    },
    // Utils 객체에 bodyScroll 객체를 추가합니다.
    bodyScroll: {
      // body 스크롤을 표시하는 함수입니다.
      show: () => {
        const body = document.body;
        body.style.paddingRight = "";
        body.style.overflow = "";
      },
      // body 스크롤을 숨기는 함수입니다.
      hide: () => {
        const body = document.body;
        if (body.style.overflow === "") {
          const browserWidth = window.innerWidth;
          const bodyWidth = body.clientWidth;
          body.style.paddingRight = browserWidth - bodyWidth + "px";
          body.style.overflow = "hidden";
        }
      },
    },
  };
})(window);
