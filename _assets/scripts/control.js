$(function () {
  /*
   * 큰 배경이미지 x좌표 소수점 제거
   * attribute: data-image-snap
   */
  window.snap = {
    screen: $("body"),
    maxWidth: 1920,
    minWidth: $(".inner").width(),
    init: (function () {
      const $target = $("[data-image-snap]");
      if (!$target.length) return;
      $(window)
        .resize(function () {
          snap.image($target);
        })
        .load(function () {
          snap.image($target);
        });
    })(),
    image: function (target) {
      if (!target) return console.error("스냅 이미지 태그를 찾을 수 없습니다.");
      if (this.screen.width() > this.maxWidth)
        return target.css("background-position", "50% 0");
      let posX = Math.round((this.screen.width() - this.maxWidth) / 2);
      if (this.screen.width() < this.minWidth)
        posX = Math.round((this.minWidth - this.maxWidth) / 2);
      target.css("background-position", posX + "px 0");
    },
  };

  window.body = {
    scroll: function (fn) {
      $(window).scroll(function () {
        fn();
      });
    },
  };

  /* 페이지 스크롤 컨트롤
   * method: bodyScroll.show()
   * method: bodyScroll.hide()
   * method: bodyScroll.move(타켓, 스피드)
   */
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
    move: function (target, speed = 500) {
      let posY = !target ? 0 : $(target).offset().top;
      $("html, body").stop().animate({ scrollTop: posY }, speed); // html, body 둘다 넣어야 모든 브라우저에서 작동
    },
  };

  /*
   * 팝업 (이미지, 인라인, 유튜브)
   * attribute: data-popup-image="이미지 주소" (이미지 팝업)
   * attribute: data-popup-inline="Element" (인라인 팝업)
   * attribute: data-popup-youtube="유튜브코드값" (유튜브 팝업)
   * method: popup.hide()
   */
  window.popup = {
    type: null,
    init: (function () {
      const $target = $(
        "[data-popup-image], [data-popup-inline], [data-popup-youtube]"
      );
      if (!$target.length) return;
      $target.each(function (idx, el) {
        $(el).on("click", function (e) {
          popup.show($(this).data());
        });
        // .on("keydown", function(e){
        //   e.preventDefault();
        // });
      });
    })(),
    show: function (data) {
      if (!data) return console.error("해당 속성 data 값을 찾을 수 없습니다.");
      this.type = Object.keys(data)[0];
      switch (this.type) {
        case "popupImage":
          this.image(data[this.type]);
          break;
        case "popupInline":
          this.inline(data[this.type]);
          break;
        case "popupYoutube":
          this.youtube(data[this.type]);
          break;
      }
      bodyScroll.hide();
    },
    image: function (url) {
      if (!url.match(/(.*?)\.(jpg|jpeg|png|gif|bmp|pdf)$/))
        return console.error(
          "이미지 파일(jpg|jpeg|png|gif|bmp|pdf) 형식만 가능합니다."
        );
      const el = $(`
        <div class="popup popup-image" tabindex="-1" onClick="popup.hide()">
          <div class="popup-container"><img src="${url}" alt="" /></div>
        </div>
      `);
      $("body").append(el);
      el.focus();
    },
    inline: function (target) {
      const el = $(target);
      if (!el.length)
        return console.error("해당 팝업 이름을 찾을 수 없습니다.");
      el.show().focus();
    },
    youtube: function (videoId) {
      let option = "";
      const isMobile =
        /iPhone|iPad|iPod|Android|BlackBerry|Windows Phone/i.test(
          window.navigator.userAgent
        );
      // 데스크탑 브라우저일때 autoplay 옵션 추가
      if (!isMobile) {
        option = "?autoplay=1";
        // url에 pcbang=Y 있을 경우 PC방이므로 음소거 옵션 추가
        const urlParams = new URL(location.href).searchParams;
        const pcbang = urlParams.get("pcbang");
        if (pcbang) option = option + "&mute=1";
      }
      const $youtubePlayer = $(`
        <div class="popup popup-youtube">
          <div class="popup-container">
            <div class="popup-body">
              <button class="close" onClick="popup.hide();"></button>
              <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${
                videoId + option
              }" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          </div>
        </div>
      `);
      $("body").append($youtubePlayer);
      youtubePlayer.focus();
    },
    hide: function () {
      switch (this.type) {
        case "popupImage":
          $(".popup-image").remove();
          break;
        case "popupInline":
          $(".popup-inline").hide();
          break;
        case "popupYoutube":
          $(".popup-youtube").remove();
          break;
      }
      bodyScroll.show();
      this.type = null;
    },
  };

  /*
   * TOP 버튼 노출
   * attribute: data-scroll-show="사용자 정의 y값"
   */
  (function () {
    const $scrollShow = $("[data-scroll-show]");
    if ($scrollShow.length) {
      $scrollShow.hide();
      body.scroll(function () {
        const scrollTop = $(window).scrollTop();
        if ($scrollShow.length) {
          if (scrollTop > $scrollShow.data().scrollShow) {
            $scrollShow.fadeIn(300);
          } else {
            $scrollShow.fadeOut(100);
          }
        }
      });
    }
  })();

  /*
   * 네비 페이지 이동 버튼 및 활성화
   * attribute: data-scroll-active="사용자 정의 target"
   */
  (function () {
    const $scrollActive = $("[data-scroll-active]");
    if ($scrollActive.length) {
      $.each($scrollActive, function (idx, el) {
        $(el).on("click", function () {
          const target = $(el).data().scrollActive;
          bodyScroll.move(target);
        });
      });
      body.scroll(function () {
        $scrollActive.each(function (idx, el) {
          const scrollTop = $(window).scrollTop();
          const target = $(el).data().scrollActive;
          if (!$(target).length) return;
          const offsetTop = $(target).offset().top;
          const targetHeight = $(target).height();
          if (scrollTop >= offsetTop && scrollTop < offsetTop + targetHeight) {
            $(el).addClass("active");
          } else {
            $(el).removeClass("active");
          }
        });
      });
    }
  })();

  /*
   * 버튼 그룹 활성화 (active)
   * attribute: data-button-group="사용자정의"
   */
  (function () {
    const $buttonActive = $("[data-button-active]");
    if (!$buttonActive.length) return;
    const buttonMap = {};
    $.each($buttonActive, function (idx, el) {
      let key = $(el).data().buttonActive;
      buttonMap[key] = (buttonMap[key] || []).concat(el);
    });
    let buttonActiveArr = Object.values(buttonMap);

    $.each(buttonActiveArr, function (groupIdx, groupEl) {
      $.each($(groupEl), function (buttonIdx, buttonEl) {
        $(buttonEl).on("click", function (e) {
          $(groupEl).removeClass("active").eq(buttonIdx).addClass("active");
        });
      });
    });
  })();
});
