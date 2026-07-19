/**
 * event.js — 서든어택 21주년 Vue 앱 (mount: #app)
 *
 * 데이터 흐름: 사용자 액션 → get/post API → reactive 상태 갱신 → 템플릿 반영
 * mock: assets/data/*.json (rtnCode "0000" 형식) · 실서버 연동 시 TODO 구간 교체
 *
 * setup() 블록 구성:
 *   [상태] [정적 데이터] [계산값] [API 연동] [EVENT1] [EVENT2] [공통] [UI 헬퍼] [초기화]
 */
(function () {
  const { createApp, reactive, computed, onMounted } = Vue;

  /** mock JSON 경로 (배포 시 API base URL 로 교체) */
  const DATA_BASE = "./assets/data";
  /** 21일 일별 보상 라벨 — days computed 에서 날짜와 매핑 */
  const DAY_REWARDS = [
    "위장 닉네임 3일",
    "플러스 콤보팩 EX 3일",
    "수박 무기 멀티카운트",
    "도안_특수밀봉",
    "고수 컬러 닉네임 3일",
    "3만 경험치",
    "패스티켓 5개",
    "대박 포인트 상자",
    "아트탄-영혼 탈출 3일",
    "5만 경험치",
    "제작 재료 3,000개",
    "리센느 멀티카운트",
    "분해용 부속",
    "두꺼운 컬러 닉네임 3일",
    "유니크 카운트",
    "퍼니 캐릭터 상자",
    "저격 기간연장 영구제",
    "영구제 밀봉",
    "컬러 닉네임 3일",
    "경험치 부스터 2.0 3일",
    "5만 경험치",
  ];
  const DOW = "일월화수목금토";

  /** 공통 fetch — rtnCode !== "0000" 이면 Utils.alert 후 throw */
  async function fetchApi(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("NETWORK");
    const data = await res.json();
    if (data.rtnCode !== "0000") {
      await Utils.alert(data.message || "오류가 발생했습니다.");
      throw new Error(data.message);
    }
    return data.result;
  }

  createApp({
    setup() {
      /* [상태] — API 응답·클릭 핸들러가 갱신, 템플릿은 v-bind/@click 으로 연결 */

      /** login · character · penalty — 참여 자격 (TODO: GNB/세션 연동) */
      const user = reactive({
        login: true,
        character: true,
        penalty: false,
      });

      /** EVENT1 메달 합체 — phase 1발급 2매칭 3대기 4완성 */
      const medal = reactive({
        issued: true,
        code: "SA-K7X9",
        side: "L",
        phase: 2,
        quota: 5, // 일일 합체 신청 잔여 (매일 8시 초기화)
        sentTo: null, // 내가 보낸 신청 { nick, code }
        received: [], // 받은 신청 목록
        sortMode: "new",
        matched: null, // 듀오 { nick, code }
        claimed: false,
        find: { input: "", preview: null, alert: null }, // 코드 입력·실시간 조회 UI
      });

      /** EVENT2 출석 — state[i]: 0미출석 1출석 2동반 4보충 */
      const attend = reactive({
        state: Array(21).fill(0),
        todayIdx: 0,
        makeup: 0,
        streak: 0,
        hasDuo: false,
        claimed: [], // 일별 보상 수령 idx
        msClaimed: [],
        duoMsClaimed: [],
        streakDays: [], // 연속 3일 달성 표시용 idx
        refreshAt: 0, // 출석 갱신 3분 쿨다운 (클라이언트)
      });

      /** 내 보상함 드로어 (Teleport) */
      const vault = reactive({ open: false });
      /**
       * 공통 UI
       * notice: 유의사항 키 / share: SNS 모달 / toast: 하단 알람
       */
      const ui = reactive({
        notice: null,
        share: false,
        toast: { show: false, text: "", timer: null },
      });

      /** SNS 공유 채널 목록 */
      const shareChannels = [
        { id: "kakao", label: "카카오톡", icon: "share_kakao.svg" },
        { id: "facebook", label: "페이스북", icon: "share_facebook.svg" },
        { id: "x", label: "X", icon: "share_x.svg" },
        { id: "instagram", label: "인스타그램", icon: "share_instagram.svg" },
        { id: "link", label: "링크복사", icon: "share_link.svg" },
      ];

      /* [정적 데이터] — 마크업·카피 고정값 (API 불필요) */

      /** 스텝 인디케이터 4단계 */
      const steps = [
        { id: "step-01", n: 1, title: "메달 발급", sub: "반쪽 메달·코드" },
        { id: "step-02", n: 2, title: "반쪽 찾기", sub: "코드 공유·신청" },
        { id: "step-03", n: 3, title: "메달 합체", sub: "신청 수락" },
        { id: "step-04", n: 4, title: "메달 완성", sub: "보상 수령" },
      ];

      const rewardItems = [
        { id: "rw-medal", label: "완성 메달", value: "21주년 한정 메달" },
        {
          id: "rw-base",
          label: "기본 보상 (확정)",
          value: "10만 경험치 · 리센느 멀티카운트 · 돌격 기간연장 영구제",
        },
        { id: "rw-lottery", label: "추첨 보상 (종료 후)", value: "서든어택 트윈 블루투스 스피커 · 1만 넥슨캐시" },
      ];

      const milestoneDefs = [
        { id: "ms-07", d: 7, g: "10만 경험치", icon: "ac_reward_icon_01.png" },
        { id: "ms-14", d: 14, g: "보조 기간연장 영구제", icon: "ac_reward_icon_02.png" },
        { id: "ms-21", d: 21, g: "1,000 SP", icon: "ac_reward_icon_03.png" },
      ];

      const duoMilestoneHighlight = {
        id: "duo-ms-05",
        d: 5,
        g: "도안_영구제 밀봉",
        icon: "ac_reward_icon_04.png",
      };

      const notices = {
        event01: [
          "참여 제한: 본 이벤트는 계정당 1회만 참여 가능하며, 1:1 매칭으로만 진행됩니다. 동일 명의 계정 간에는 듀오 결성이 불가합니다.",
          "신청 제한: 메달 합체 신청은 1일 최대 5회까지만 가능하며, 매일 오전 8시에 초기화됩니다.",
          "신청 취소: 상대방에게 보낸 메달 합체 신청은 상대가 수락하기 전까지 언제든지 취소할 수 있습니다.",
          "듀오 결성 후 변경 불가: 상대방이 수락하여 듀오가 결성된 이후에는 어떠한 경우에도 듀오 변경·취소가 불가능합니다.",
          "듀오 닉네임 안내: 듀오 닉네임은 결성 완료 시점 기준으로 고정되며, 이후 인게임에서 닉네임을 변경해도 이벤트 페이지에는 반영되지 않습니다.",
          "보상 지급: '보상 받기' 클릭 시 보상 아이템이 인게임 선물함으로 즉시 지급됩니다.",
          "수령 기간: 보상은 9월 3일(목) 정기점검 전까지만 수령 가능합니다.",
        ],
        event02: [
          "출석 인정 기준: 이벤트 기간 동안 게임에 접속하면 당일 출석으로 인정됩니다. (하루 기준: 오전 08:00 ~ 다음 날 오전 07:59)",
          "출석 현황 갱신: 출석이 웹페이지에 즉시 반영되지 않을 경우 '출석 갱신하기' 버튼을 클릭해 주세요. (출석 재갱신은 3분 간격으로만 가능합니다.)",
          "듀오 동반 출석 보상: 듀오 결성 후 같은 날 함께 출석하면 '보충 출석권'이 1장 지급됩니다. (기간 내 최대 5장)",
          "동반 출석 달성 보상: 듀오와 동반 출석을 누적 5일 달성하면 듀오 양측 모두에게 보상이 지급됩니다. (보충 출석권으로 출석 처리한 날은 동반 출석 횟수에서 제외)",
          "연속 출석 보상: 3일 연속 접속할 때마다 '보충 출석권'이 1장 지급됩니다. (기간 내 최대 5장)",
          "연속 출석 초기화: 하루라도 결석하면 기존 연속 출석 기록은 즉시 초기화됩니다.",
          "보충 출석권 사용·제한: 결석한 날을 출석으로 메울 수 있으나, 처리 완료한 날은 취소·변경이 불가하며 '3일 연속 출석'·'듀오 동반 출석' 조건에 모두 반영되지 않습니다.",
          "누적 출석 보상: 누적 출석 7/14/21일, 듀오 동반 출석 5일 달성 시 각 단계별 추가 보상을 획득할 수 있습니다.",
          "듀오 변경 불가: 듀오 결성 후에는 변경·취소가 불가하므로 신중하게 맺어주세요.",
          "보상 지급: 모든 출석 보상은 '보상 받기'를 클릭해야 인게임 선물함으로 지급됩니다.",
          "보상 수령 기간: 보상은 9월 3일(목) 정기점검 전까지만 수령 가능합니다.",
          "보상 수령 안내: SP·제작 재료는 지급일로부터 30일 이내 미수령 시 삭제되며, SP는 본인 인증을 완료한 계정만 수령 가능합니다.",
          "보상 거래 속성: 모든 출석 보상은 '거래불가'로 지급됩니다.",
          "기타 안내: 자세한 이벤트 유의사항은 [이벤트 정책]을 확인해 주시기 바랍니다.",
        ],
        event03: [
          "쇼케이스 일정·출연진·경품은 사전 고지 없이 변경될 수 있습니다.",
          "시청 이벤트 참여 방법 및 당첨자 발표 일정은 각 이벤트 안내를 따릅니다.",
          "승부 예측·퀴즈 등 참여형 이벤트는 SOOP·YouTube 채널 공지를 확인해 주세요.",
          "듀오 동반 시청: 21주년 메달을 완성하고 N커넥트 연동을 완료한 듀오가 함께 시청해야 추가 보상 대상이 됩니다. 보상은 계정당 1회만 지급됩니다.",
        ],
      };

      /**
       * EVENT3 시청 이벤트 목록
       * · icon — 좌측 대표 이미지 (watch_eventN.png)
       * · rewardIcons — 보상 아이콘 (있으면 아이콘 행 아래 단락에 칩+문구)
       * · cta — 있으면 우측 골드 버튼 노출
       */
      const showcase = {
        watchEvents: [
          {
            id: "watch-01", // 승부 예측
            no: "01",
            icon: "watch_event1.png",
            title: "승부 예측",
            desc: "최강의 둘이서 한 팀 선발전! 과연 승자는 누구일까요?<br>8월 23일(일) 매치 시작 전까지 승부 예측에 참여하고 적중 보상을 획득하세요!",
            rewardIcons: ["watch_reward_01_1.png", "watch_reward_01_2.png"],
            reward: "예측 성공 시 500 SP / 실패 시 제작 재료 2,000개",
            cta: "승부 예측 참여하기",
          },
          {
            id: "watch-02", // 성공이냐 실패냐 — 보상 아이콘 없음
            no: "02",
            icon: "watch_event2.png",
            title: "성공이냐 실패냐",
            desc: "챔피언십 & 태디컵 선수들의 업투게더 미션 성공 여부에 따라 깜짝 쿠폰이 지급됩니다.",
            rewardIcons: [],
            reward: "방송에서 공개됩니다",
            cta: "",
          },
          {
            id: "watch-03", // 동시 시청자 — 보상 아이콘 없음
            no: "03",
            icon: "watch_event3.png",
            title: "우리는 모두 하나!",
            desc: "동시 시청자 달성 수에 따라 쿠폰이 지급됩니다.<br>이번 최고 목표는 21,000명! 상세 보상은 방송에서 공개됩니다.",
            rewardIcons: [],
            reward: "동시 시청자 달성 쿠폰 (목표 21,000명)",
            cta: "",
          },
          {
            id: "watch-04", // N커넥트 · 드롭스
            no: "04",
            icon: "watch_event4.png",
            title: "N커넥트 연동 & 드롭스",
            desc: "선택 동의를 포함한 N커넥트 연동을 완료한 후 방송을 시청하면 드롭스 보상을 지급합니다.<br>(시청 미션 달성 시마다 지급 · 방송 시청 조건 충족 시)",
            rewardIcons: ["watch_reward_04.png"],
            reward: "21주년 방송 시청상자",
            cta: "",
          },
          {
            id: "watch-05", // 듀오 동반 시청
            no: "05",
            icon: "watch_event5.png",
            title: "21주년 메달 완성 · 듀오 동반 시청",
            desc: "21주년 메달을 완성하고 N커넥트 연동을 완료한 듀오가 함께 방송을 시청하면<br>특별한 추가 보상을 획득할 수 있습니다!",
            rewardIcons: ["watch_reward_05.png"],
            reward: "마이건2 주무기 하프키트",
            cta: "",
          },
        ],
      };

      /* [계산값] — reactive 상태 기반 파생값 (computed) */

      /** 받은 합체 신청 — sortMode 기준 정렬, 최대 10건 */
      const sortedReceived = computed(() => {
        const list = [...medal.received];
        list.sort((a, b) =>
          medal.sortMode === "new" ? (b.t || 0) - (a.t || 0) : (a.t || 0) - (b.t || 0)
        );
        return list.slice(0, 10);
      });

      /** 누적 출석일 (0 초과) · 동반 출석일 (state === 2) */
      const totalDays = computed(() => attend.state.filter((s) => s > 0).length);
      const duoDays = computed(() => attend.state.filter((s) => s === 2).length);

      /** 21일 캘린더 카드 데이터 — makeable: 보충 가능한 과거 미출석일 */
      const days = computed(() =>
        DAY_REWARDS.map((reward, i) => {
          const d = new Date(2026, 7, 6 + i);
          const s = attend.state[i];
          return {
            i,
            id: "day-" + String(i + 1).padStart(2, "0"),
            label: `${d.getMonth() + 1}월 ${d.getDate()}일`,
            dow: `(${DOW[d.getDay()]})`,
            s,
            reward,
            makeable: s === 0 && i < attend.todayIdx,
            claimed: attend.claimed.includes(i),
            streak: attend.streakDays.includes(i),
          };
        })
      );

      const calRows = computed(() => {
        const list = days.value;
        return [list.slice(0, 7), list.slice(7, 14), list.slice(14, 21)];
      });

      const progress = computed(() => Math.round((totalDays.value / 21) * 100));

      const noticeTitle = computed(() => {
        if (ui.notice === "event01") return "· 21주년 메달 합체";
        if (ui.notice === "event02") return "· 21일 듀오 출석 챌린지";
        if (ui.notice === "event03") return "· 21주년 쇼케이스";
        return "";
      });

      /**
       * EVENT2 출석 헤더 듀오 라벨 — 2가지 형태만 사용
       * 1) 솔로: "나 혼자 출석 중"
       * 2) 듀오: "나 & {상대닉네임}"  (medal.matched.nick)
       * attend.hasDuo + medal.matched 있을 때만 듀오 문구
       */
      const duoLabel = computed(() => {
        if (attend.hasDuo && medal.matched?.nick) {
          return "나 & " + medal.matched.nick;
        }
        return "나 혼자 출석 중";
      });

      /** 보상함 · 마일스톤 행 (받기 가능 / 미달성 / 수령완료) */
      const vaultMilestones = computed(() =>
        milestoneDefs.map((m) => {
          const claimed = attend.msClaimed.includes(m.d);
          const reached = totalDays.value >= m.d;
          let chipLabel = "미달성";
          let chipClass = "vault__chip--locked";
          if (claimed) {
            chipLabel = "수령완료";
            chipClass = "vault__chip--done";
          } else if (reached) {
            chipLabel = "받기 가능";
            chipClass = "vault__chip--ready";
          }
          return { ...m, chipLabel, chipClass };
        })
      );

      /* [API 연동] — apply* 는 응답 → reactive 매핑, get/post 는 TODO 교체 */

      /** GET 메달 상태 응답 → medal (+ matched 시 attend.hasDuo) */
      function applyMedalState(result) {
        medal.issued = !!result.issued;
        medal.code = result.code || "";
        medal.side = result.side || null;
        medal.quota = result.quota ?? 5;
        medal.phase = result.phase || (medal.issued ? 2 : 1);
        medal.sentTo = result.sentTo || null;
        medal.matched = result.matched || null;
        medal.claimed = !!result.claimed;
        medal.received = (result.received || []).map((r, idx) => ({
          ...r,
          id: r.id || "recv-" + r.code,
          t: r.t ?? 1000 - idx,
        }));
        if (medal.matched) attend.hasDuo = true;
      }

      /** GET 출석 상태 응답 → attend */
      function applyAttendanceState(result) {
        attend.state = [...(result.state || Array(21).fill(0))];
        attend.todayIdx = result.todayIdx ?? 0;
        attend.makeup = result.makeup ?? 0;
        attend.streak = result.streak ?? 0;
        attend.hasDuo = result.hasDuo ?? attend.hasDuo;
        attend.claimed = [...(result.claimed || [])];
        attend.msClaimed = [...(result.msClaimed || [])];
        attend.duoMsClaimed = [...(result.duoMsClaimed || [])];
        attend.streakDays = [...(result.streakDays || [])];
      }

      /** TODO: GET /api/medal/state — 초기·새로고침 시 메달·듀오·phase */
      async function getMedalState() {
        // TODO(작업용): phase2 미리보기 — 배포 전 medal.json 으로 복구
        applyMedalState(await fetchApi(DATA_BASE + "/medal_issued.json"));
      }

      /** TODO: POST /api/medal/issue — 반쪽 메달·코드 발급 (phase 1→2) */
      async function postIssueMedal() {
        const result = await fetchApi(DATA_BASE + "/medal_issued.json");
        medal.issued = true;
        medal.code = result.code;
        medal.side = result.side;
        medal.received = (result.received || []).map((r, idx) => ({
          ...r,
          id: r.id || "recv-" + r.code,
          t: r.t ?? 1000 - idx,
        }));
        medal.phase = 2;
        return result;
      }

      /** TODO: GET /api/medal/partner?code= — 코드 실시간 조회 (닉네임·합체 가능 여부) */
      async function getPartner(code) {
        const table = await fetchApi(DATA_BASE + "/partner.json");
        const key = code.toUpperCase();
        if (table.lookup[key]) return { ...table.lookup[key] };
        return {
          ...table.default,
          nick: table.default.nick + "_" + code.slice(-2),
        };
      }

      /** TODO: POST /api/medal/request — 합체 신청 전송 (quota 차감) */
      async function postSendRequest(payload) {
        void payload;
        return { ok: true };
      }

      /** TODO: POST /api/medal/accept — 합체 수락 (phase→4, matched 설정) */
      async function postAcceptMerge(payload) {
        return { matched: payload, reward: { basic: [] } };
      }

      /** TODO: POST /api/medal/claim — EVENT1 기본 보상 수령 */
      async function postClaimReward() {
        return { ok: true };
      }

      /** TODO: GET /api/attendance/state — 21일 출석판·보충권·마일스톤 */
      async function getAttendance() {
        applyAttendanceState(await fetchApi(DATA_BASE + "/attendance.json"));
      }

      /** 하단 토스트 표시 (자동 숨김) */
      function showToast(text, duration = 2800) {
        if (ui.toast.timer) clearTimeout(ui.toast.timer);
        ui.toast.text = text;
        ui.toast.show = true;
        ui.toast.timer = setTimeout(() => {
          ui.toast.show = false;
          ui.toast.timer = null;
        }, duration);
      }

      /* [UI 헬퍼] — 클래스·disabled·라벨 (템플릿 :class / :disabled 용) */

      /** step-list__item--active | --done */
      function stepItemClass(stepNum) {
        if (medal.phase === stepNum) return "step-list__item--active";
        if (medal.phase > stepNum) return "step-list__item--done";
        return "";
      }

      function getMilestoneMeta(daysRequired, type) {
        const reached =
          type === "duo"
            ? duoDays.value >= daysRequired
            : totalDays.value >= daysRequired;
        const claimed =
          type === "duo"
            ? attend.duoMsClaimed.includes(daysRequired)
            : attend.msClaimed.includes(daysRequired);
        return { reached, claimed };
      }

      /**
       * cal-card modifier
       * state: 0미출석 1출석 2듀오동반 4보충출석
       * · --claim / --done : 보상받기 / 수령완료
       * · --duo             : 듀오와 동반
       * · --streak          : 3일연속 (+1 뱃지)
       * · --makeup          : 보충 출석 완료 카드
       * · --makeable        : 미출석 + 보충권 있음 → "+ 보충하기"
       * · --need-ticket     : 미출석 + 보충권 없음 → "보충권 필요"
       */
      function calCardClass(day) {
        const cls = [];
        if (day.s > 0 && !day.claimed) cls.push("cal-card--claim");
        if (day.claimed) cls.push("cal-card--done");
        if (day.s === 2) cls.push("cal-card--duo");
        if (day.s === 4) cls.push("cal-card--makeup");
        if (day.streak) cls.push("cal-card--streak");
        if (day.makeable && attend.makeup > 0) cls.push("cal-card--makeable");
        if (day.makeable && attend.makeup <= 0) cls.push("cal-card--need-ticket");
        return cls;
      }

      /** 우상단 체크/듀오 마크 — 출석·보충 완료 카드에만 */
      function calShowMark(day) {
        return day.s > 0;
      }

      /** 중앙 버튼 문구 */
      function calBtnLabel(day) {
        if (day.s > 0 && !day.claimed) return "보상 받기";
        if (day.claimed) return "수령 완료";
        if (day.makeable && attend.makeup > 0) return "+ 보충하기";
        if (day.makeable && attend.makeup <= 0) return "보충권 필요";
        return "";
      }

      function isCalCardClickable(day) {
        return (day.s > 0 && !day.claimed) || (day.makeable && attend.makeup > 0);
      }

      function calIconPath(index) {
        return "./assets/images/cal_reward_icon" + String(index + 1).padStart(2, "0") + ".png";
      }

      function milestoneCardClass(daysRequired, type) {
        const { reached, claimed } = getMilestoneMeta(daysRequired, type);
        if (claimed) return "milestone__card--done";
        if (reached) return "milestone__card--ready";
        return "";
      }

      function milestoneBtnClass(daysRequired, type) {
        const { reached, claimed } = getMilestoneMeta(daysRequired, type);
        if (claimed) return "milestone__btn milestone__btn--done";
        if (reached) return "milestone__btn milestone__btn--ready";
        return "milestone__btn";
      }

      function milestoneBtnLabel(daysRequired, type) {
        const { reached, claimed } = getMilestoneMeta(daysRequired, type);
        if (claimed) return "수령완료";
        if (reached) return "보상 받기";
        return "미달성";
      }

      function isMilestoneDisabled(daysRequired, type) {
        const { reached, claimed } = getMilestoneMeta(daysRequired, type);
        return !reached || claimed;
      }

      function setSort(mode) {
        medal.sortMode = mode;
      }

      /* [EVENT1] 메달 합체 — phase 1~4 클릭 핸들러 */

      /** phase1 · 유저 자격 검사 후 postIssueMedal */
      async function clickIssueMedal() {
        if (!user.login) {
          return Utils.confirm("출석 현황은 로그인 후 확인할 수 있어요", {
            title: "로그인이 필요한 서비스예요",
            confirmText: "로그인 하기",
            confirmOnly: true,
          });
        }
        if (!user.character) return Utils.alert("서든어택 계정(캐릭터)이 필요합니다.");
        if (user.penalty) return Utils.alert("이벤트 참여가 제한된 계정입니다.");
        if (medal.issued || medal.phase > 1) return;
        try {
          await postIssueMedal();
          showToast("메달 발급 완료! 반쪽 메달과 코드가 발급됐어요");
        } catch (err) {
          console.error(err);
          await Utils.alert("메달 발급에 실패했습니다.<br>로컬 서버로 열어 mock 데이터를 불러올 수 있는지 확인해 주세요.");
        }
      }

      /**
       * 데모용 · 스텝 클릭으로 phase 미리보기
       * 1: 미발급 / 2~3: 발급 mock / 4: 합체 완료 mock
       */
      async function demoGoStep(stepNum) {
        try {
          if (stepNum === 1) {
            applyMedalState(await fetchApi(DATA_BASE + "/medal.json"));
            medal.find = { input: "", preview: null, alert: null };
            return;
          }
          if (stepNum === 2 || stepNum === 3) {
            applyMedalState(await fetchApi(DATA_BASE + "/medal_issued.json"));
            medal.phase = stepNum;
            medal.matched = null;
            medal.claimed = false;
            medal.sentTo = stepNum === 3 ? { nick: "매칭가능유저", code: "SA-MATCH" } : null;
            medal.find = { input: "", preview: null, alert: null };
            return;
          }
          if (stepNum === 4) {
            applyMedalState(await fetchApi(DATA_BASE + "/medal_issued.json"));
            medal.phase = 4;
            medal.sentTo = null;
            medal.matched = { nick: "연사왕", code: "SA-DEMO" };
            medal.claimed = false;
            attend.hasDuo = true;
          }
        } catch (err) {
          console.error(err);
          await Utils.alert("단계 데이터를 불러오지 못했습니다.");
        }
      }

      function copyCode() {
        if (!medal.code) return;
        navigator.clipboard?.writeText(medal.code);
        showToast("코드가 복사되었습니다. " + medal.code);
      }

      /** SNS 공유 모달 오픈 */
      function clickShare() {
        if (!medal.code) {
          return Utils.alert("먼저 메달을 발급받아 주세요.");
        }
        ui.share = true;
        Utils.bodyScroll.hide();
      }

      function closeShare() {
        ui.share = false;
        Utils.bodyScroll.show();
      }

      /** SNS 채널 클릭 — 링크복사는 copyCode, 나머지는 연동 예정 */
      function clickShareChannel(id) {
        if (id === "link") {
          copyCode();
          return;
        }
        // TODO: 카카오/페북/X/인스타 SDK 연동
        showToast(id + " 공유는 API 연동 후 제공됩니다.");
      }

      async function lookupLive() {
        /** @input medal.find.input — 4자 이상 시 getPartner 실시간 조회 */
        const code = medal.find.input.trim().toUpperCase();
        medal.find.preview = null;
        medal.find.alert = null;
        if (code.length < 4) return;

        if (code === medal.code) {
          medal.find.alert = { type: "warn", text: "본인 코드는 신청할 수 없습니다.", ok: false };
          return;
        }

        try {
          const res = await getPartner(code);
          if (!res.found) {
            medal.find.alert = { type: "warn", text: res.reason || "존재하지 않는 코드입니다.", ok: false };
            return;
          }
          if (!res.matchable) {
            medal.find.alert = {
              type: "warn",
              text: res.reason || "합체 신청할 수 없는 유저입니다.",
              ok: false,
            };
            return;
          }

          medal.find.preview = { nick: res.nick, side: res.side };
          medal.find.alert = {
            type: "ok",
            text: res.nick + " 님에게 합체 신청을 보낼 수 있습니다.",
            ok: medal.quota > 0 && !medal.sentTo,
          };
        } catch (err) {
          console.error(err);
          medal.find.alert = { type: "warn", text: "코드 조회에 실패했습니다.", ok: false };
        }
      }

      async function clickSendRequest() {
        if (!medal.find.alert?.ok || medal.quota <= 0 || medal.sentTo) return;
        const nick = medal.find.preview?.nick || "상대";
        const ok = await Utils.confirm(
          "상대방이 메달 합체를 수락하면 메달 합체와 함께 듀오가 결성되며, 결성 후에는 취소·변경이 불가합니다. Event2에서 듀오 동반 출석 혜택이 있으니 신중하게 선택해 주세요.",
          {
            title: "메달 합체 신청",
            confirmText: "신청 보내기",
            cancelText: "취소",
          }
        );
        if (!ok) return;

        await postSendRequest({ code: medal.find.input, nick });
        medal.quota--;
        medal.sentTo = { nick, code: medal.find.input.toUpperCase() };
        medal.phase = 3;
        medal.find.alert = null;
        showToast(nick + " 님에게 합체 신청을 보냈어요");
      }

      async function cancelRequest() {
        if (!medal.sentTo) return;
        if (
          !(await Utils.confirm("보낸 합체 신청을 취소할까요?", {
            confirmText: "신청 취소",
            cancelText: "닫기",
          }))
        )
          return;
        medal.sentTo = null;
        medal.phase = 2;
        medal.quota = Math.min(5, medal.quota + 1);
      }

      /** 데모용 — 상대 수락 시뮬레이션 (실서버는 폴링/푸시) */
      async function partnerAccepts() {
        if (!medal.sentTo) return;
        await completeMatch({ nick: medal.sentTo.nick, code: medal.sentTo.code });
      }

      /** postAcceptMerge → matched·phase4·hasDuo 공통 처리 */
      async function completeMatch(partner) {
        await postAcceptMerge(partner);
        medal.matched = { nick: partner.nick, code: partner.code };
        medal.sentTo = null;
        medal.phase = 4;
        attend.hasDuo = true;
      }

      async function clickAcceptReceived(code) {
        if (medal.claimed || medal.phase === 4) return;
        const item = medal.received.find((r) => r.code === code);
        if (!item) return;
        const ok = await Utils.confirm(
          item.nick + " 님과 듀오를 결성하고 함께 메달을 합체하시겠습니까?",
          {
            title: "듀오 결성 및 메달 합체",
            note: "메달 합체를 수락한 뒤에는 듀오가 결성되며 취소 및 변경이 불가합니다. Event2에서 듀오 동반 출석 혜택이 있으니 신중하게 선택해 주세요.",
            confirmText: "결성하기",
            cancelText: "취소",
          }
        );
        if (!ok) return;

        await completeMatch({ nick: item.nick, code: item.code });
        medal.received = medal.received.filter((r) => r.code !== code);
        showToast("듀오 결성 완료! " + item.nick + " 님과 메달을 합쳤어요");
      }

      function rejectReceived(code) {
        medal.received = medal.received.filter((r) => r.code !== code);
      }

      /** phase4 · EVENT1 기본 보상 수령 */
      async function clickClaimReward() {
        if (medal.claimed || medal.phase !== 4) return;
        await postClaimReward();
        medal.claimed = true;
        attend.hasDuo = true;
        await Utils.alert("기본 보상이 지급되었습니다.");
      }

      /* [EVENT2] 21일 출석 · 마일스톤 */

      /** cal-card 클릭 — 일별 보상 수령 또는 보충 출석권 사용 */
      async function clickDay(i) {
        const day = days.value.find((d) => d.i === i);
        if (!day) return;

        if (day.s > 0 && !day.claimed) {
          attend.claimed.push(i);
          // TODO: API POST 일별 보상
          return;
        }

        if (day.makeable && attend.makeup > 0) {
          if (!(await Utils.confirm(day.label + " 보충 출석권으로 출석 처리할까요?"))) return;
          attend.makeup--;
          attend.state[i] = 4;
          // TODO: API POST 보충 출석
        }
      }

      async function clickClaimMilestone(d) {
        if (totalDays.value < d || attend.msClaimed.includes(d)) return;
        attend.msClaimed.push(d);
        // TODO: API POST
      }

      async function clickClaimDuoMilestone(d) {
        if (duoDays.value < d || attend.duoMsClaimed.includes(d)) return;
        attend.duoMsClaimed.push(d);
        // TODO: API POST
      }

      async function claimAllDaily() {
        days.value.forEach((d) => {
          if (d.s > 0 && !d.claimed) attend.claimed.push(d.i);
        });
        // TODO: API POST
        await Utils.alert("수령 가능한 일별 보상을 모두 받았습니다.");
      }

      /** 3분 쿨다운 후 getAttendance 재호출 */
      async function clickRefreshAttendance() {
        const now = Date.now();
        if (now - attend.refreshAt < 180000) {
          const sec = Math.ceil((180000 - (now - attend.refreshAt)) / 1000);
          return Utils.alert("출석 갱신은 3분 간격입니다.<br>(약 " + sec + "초 후 가능)");
        }
        attend.refreshAt = now;
        await getAttendance();
        await Utils.alert("출석 현황이 갱신되었습니다.");
      }

      /* [공통] 보상함 · 유의사항 (Teleport 모달) */

      /** topbar 「내 보상함」 — medal/attend 상태로 섹션 렌더 */
      async function openVault() {
        vault.open = true;
        Utils.bodyScroll.hide();
      }

      function closeVault() {
        vault.open = false;
        Utils.bodyScroll.show();
      }

      /** @param {"event01"|"event02"|"event03"} key */
      function openNotice(key) {
        ui.notice = key;
        Utils.bodyScroll.hide();
      }

      function closeNotice() {
        ui.notice = null;
        Utils.bodyScroll.show();
      }

      /* [초기화] — 해시 스크롤은 control.js pageScroll.initHash */

      onMounted(async () => {
        try {
          await getMedalState();
          await getAttendance();
        } catch (err) {
          console.error(err);
        }
        // Vue mount 후 DOM이 확정되므로 스크롤 앵커 핸들러 재바인딩
        if (window.jQuery && window.pageScroll) {
          const $ = window.jQuery;
          $(document)
            .off("click.pageScrollTo", "[data-scroll-to]")
            .on("click.pageScrollTo", "[data-scroll-to]", function (e) {
              e.preventDefault();
              pageScroll.to($(this).data("scrollTo"));
            });
        }
      });

      return {
        medal,
        attend,
        vault,
        ui,
        shareChannels,
        steps,
        rewardItems,
        milestoneDefs,
        duoMilestoneHighlight,
        notices,
        showcase,
        sortedReceived,
        totalDays,
        duoDays,
        calRows,
        progress,
        noticeTitle,
        duoLabel,
        vaultMilestones,
        stepItemClass,
        calCardClass,
        calShowMark,
        calBtnLabel,
        isCalCardClickable,
        calIconPath,
        milestoneCardClass,
        milestoneBtnClass,
        milestoneBtnLabel,
        isMilestoneDisabled,
        setSort,
        clickIssueMedal,
        demoGoStep,
        copyCode,
        clickShare,
        closeShare,
        clickShareChannel,
        showToast,
        lookupLive,
        clickSendRequest,
        cancelRequest,
        partnerAccepts,
        clickAcceptReceived,
        rejectReceived,
        clickClaimReward,
        clickDay,
        clickClaimMilestone,
        clickClaimDuoMilestone,
        claimAllDaily,
        clickRefreshAttendance,
        openVault,
        closeVault,
        openNotice,
        closeNotice,
      };
    },
  }).mount("#app");
})();
