/**
 * control.js — 20주년 공용 스크롤·네비 컨트롤
 *
 * [pageScroll] sticky topbar 보정 스크롤 (--scroll-offset 연동)
 * [bodyScroll] 모달·드로어 오픈 시 body 잠금 (Utils.bodyScroll 과 별도 jQuery 래퍼)
 *
 * HTML 속성:
 *   data-scroll-to="#event01"      — 클릭 시 해당 앵커로 이동
 *   data-scroll-active="#event01"  — 클릭 + 스크롤 구간별 is-active 토글 (topbar nav)
 */
$(function () {
  window.body = {
    /** 스크롤 이벤트 바인딩 헬퍼 */
    scroll: function (fn) {
      $(window).on("scroll", fn);
    },
  };

  window.pageScroll = {
    /** GNB + sticky .topbar 실측 높이 + 12px 여백 */
    getOffset: function () {
      const topbar = document.querySelector(".topbar");
      const gnb =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--gnb-height")
        ) || 0;
      const topbarH = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 0;
      return Math.ceil(gnb) + topbarH + 12;
    },

    /** CSS 변수 --scroll-offset 동기화 (_functional.scss scroll-margin-top 과 연동) */
    syncOffset: function () {
      document.documentElement.style.setProperty(
        "--scroll-offset",
        this.getOffset() + "px"
      );
    },

    /** section[id^=event] 이면 .sec-head 기준으로 스크롤 (제목이 topbar 아래 오도록) */
    resolveTarget: function (el) {
      if (!el) return null;
      if (el.matches("section[id^='event']")) {
        return el.querySelector(".sec-head") || el;
      }
      return el;
    },

    /**
     * @param {string|Element} target — "#event01" 또는 DOM
     * @param {number} speed — 0: 즉시, 그 외: smooth
     */
    to: function (target, speed) {
      const selector =
        typeof target === "string"
          ? target.charAt(0) === "#"
            ? target
            : "#" + target
          : null;
      const section =
        typeof target === "string" ? document.querySelector(selector) : target;
      if (!section) return;

      this.syncOffset();
      const el = this.resolveTarget(section);
      el.scrollIntoView({
        behavior: speed === 0 ? "auto" : "smooth",
        block: "start",
      });
    },

    /** URL 해시(#event02 등) 직접 진입 시 해당 섹션으로 이동 */
    initHash: function () {
      if (!location.hash) return;
      this.syncOffset();
      setTimeout(function () {
        pageScroll.to(location.hash, 0);
      }, 150);
    },
  };

  window.bodyScroll = {
    show: function () {
      $("body").css({ overflow: "", paddingRight: "" });
    },
    hide: function () {
      $("body").css({
        overflow: "hidden",
        paddingRight: window.innerWidth - document.body.clientWidth + "px",
      });
    },
    /** pageScroll.to 위임 — event.js·히어로 CTA 등에서 호출 가능 */
    move: function (target, speed) {
      pageScroll.to(target, speed === undefined ? 500 : speed);
    },
  };

  /* data-scroll-to — 단일 타겟 스크롤 (히어로 CTA 등) */
  $("[data-scroll-to]").on("click", function (e) {
    e.preventDefault();
    pageScroll.to($(this).data("scrollTo"));
  });

  /* data-scroll-active — topbar nav: 클릭 이동 + 스크롤 위치별 is-active */
  const $scrollActive = $("[data-scroll-active]");
  if ($scrollActive.length) {
    $scrollActive.on("click", function (e) {
      e.preventDefault();
      pageScroll.to($(this).data("scrollActive"));
    });

    body.scroll(function () {
      const offset = pageScroll.getOffset();
      const scrollTop = $(window).scrollTop();

      $scrollActive.each(function (_, el) {
        const target = $(el).data("scrollActive");
        const $section = $(target);
        if (!$section.length) return;

        const $anchor = $section.is("section[id^='event']")
          ? $section.find(".sec-head").first()
          : $section;
        const offsetTop =
          ($anchor.length ? $anchor : $section).offset().top - offset;
        const targetHeight = $section.height();

        $(el).toggleClass(
          "is-active",
          scrollTop >= offsetTop && scrollTop < offsetTop + targetHeight
        );
      });
    });
  }

  pageScroll.syncOffset();
  pageScroll.initHash();
  $(window).on("resize", pageScroll.syncOffset.bind(pageScroll));
});
