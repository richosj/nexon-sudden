(function () {
  const { createApp, reactive, computed, onMounted } = Vue;

  const DATA_BASE = "./assets/data";
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

  /** JSON 목업/API 응답 공통 fetch — rtnCode 검증 후 result 반환 */
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
      /**
       * 유저 계정 정보
       * 로그인 여부, 인게임 캐릭터 존재 여부, 이벤트 제재 상태
       */
      const user = reactive({
        login: true,
        character: true,
        penalty: false,
      });

      /**
       * 이벤트1 · 메달 합체 진행 상태
       * 발급·코드·페이즈·신청·수신·매칭·보상 수령
       */
      const medal = reactive({
        issued: false,
        code: "",
        side: null,
        phase: 1,
        quota: 5,
        sentTo: null,
        received: [],
        sortMode: "new",
        matched: null,
        claimed: false,
        find: {
          input: "",
          preview: null,
          alert: null,
        },
      });

      /**
       * 이벤트2 · 21일 출석 챌린지 상태
       * 일별 출석·보충권·연속·동반·마일스톤 수령
       */
      const attend = reactive({
        state: Array(21).fill(0),
        todayIdx: 0,
        makeup: 0,
        streak: 0,
        hasDuo: false,
        claimed: [],
        msClaimed: [],
        duoMsClaimed: [],
        streakDays: [],
        refreshAt: 0,
      });

      /**
       * 보상함 드로어 상태
       * open 여부, 수령 내역 목록
       */
      const vault = reactive({
        open: false,
        rewards: [],
      });

      /**
       * 공통 UI 상태
       * notice: 열린 유의사항 키 (event01 | event02 | event03)
       */
      const ui = reactive({
        notice: null,
      });

      /** 이벤트1 · 메달 합체 4단계 스텝 정의 */
      const steps = [
        { id: "step-01", n: 1, title: "메달 발급", sub: "반쪽 메달·코드" },
        { id: "step-02", n: 2, title: "반쪽 찾기", sub: "코드 공유·신청" },
        { id: "step-03", n: 3, title: "메달 합체", sub: "신청 수락" },
        { id: "step-04", n: 4, title: "메달 완성", sub: "보상 수령" },
      ];

      /** 이벤트1 · 완성 단계 보상 요약 */
      const rewardItems = [
        { id: "rw-medal", label: "완성 메달", value: "21주년 한정 메달", tone: "info" },
        {
          id: "rw-base",
          label: "기본 보상 (확정)",
          value: "10만 경험치 · 리센느 멀티카운트 · 돌격 기간연장 영구제",
          tone: "accent",
        },
        { id: "rw-lottery", label: "추첨 보상 (종료 후)", value: "MD · 넥슨캐시 추첨", tone: "info" },
      ];

      /** 이벤트2 · 개인 누적 마일스톤 정의 */
      const milestoneDefs = [
        { id: "ms-07", d: 7, g: "10만 경험치", icon: "ac_reward_icon_01.png" },
        { id: "ms-14", d: 14, g: "보조 기간연장 영구제", icon: "ac_reward_icon_02.png" },
        { id: "ms-21", d: 21, g: "1,000 SP", icon: "ac_reward_icon_03.png" },
      ];

      /** 이벤트2 · 동반 출석 마일스톤 (UI 노출 — 5일) */
      const duoMilestoneHighlight = {
        id: "duo-ms-05",
        d: 5,
        g: "도안_영구제 밀봉",
        icon: "ac_reward_icon_04.png",
      };

      /** 이벤트1~3 · 유의사항 본문 */
      const notices = {
        event01: [
          "참여 제한: 본 이벤트는 계정당 1회만 참여 가능하며, 1:1 매칭으로만 진행됩니다.",
          "신청 제한: 메달 합체 신청은 1일 최대 5회까지만 가능하며, 매일 오전 8시에 초기화됩니다.",
          "신청 취소: 상대방에게 보낸 메달 합체 신청은 상대가 수락하기 전까지 언제든지 취소할 수 있습니다.",
          "듀오 결성 후 변경 불가: 듀오가 결성된 이후에는 어떠한 경우에도 듀오 변경·취소가 불가능합니다.",
          "보상 지급: '보상 받기' 클릭 시 보상 아이템이 인게임 선물함으로 즉시 지급됩니다.",
          "수령 기간: 보상은 9월 3일(목) 정기점검 전까지만 수령 가능합니다.",
        ],
        event02: [
          "출석 인정 기준: 이벤트 기간 동안 게임에 1회 이상 접속하면 당일 출석으로 인정됩니다.",
          "출석 현황 갱신: '출석 갱신하기'는 3분 간격으로만 가능합니다.",
          "듀오 동반 출석 보상: 듀오 결성 후 같은 날 함께 출석하면 보충 출석권 1장 지급 (최대 5장).",
          "연속 출석 보상: 3일 연속 접속할 때마다 보충 출석권 1장 지급 (최대 5장).",
          "보충 출석권 사용: 보충으로 메운 날은 연속·동반 출석 조건에 반영되지 않습니다.",
          "보상 수령 기간: 보상은 9월 3일(목) 정기점검 전까지만 수령 가능합니다.",
        ],
        event03: [
          "쇼케이스 일정·출연진·경품은 사전 고지 없이 변경될 수 있습니다.",
          "시청 이벤트 참여 방법 및 당첨자 발표 일정은 각 이벤트 안내를 따릅니다.",
          "승부 예측·퀴즈 등 참여형 이벤트는 SOOP·YouTube 채널 공지를 확인해 주세요.",
        ],
      };

      /** 이벤트3 · 쇼케이스 정적 데이터 (타임테이블·팀·시청 이벤트) */
      const showcase = {
        watchEvents: [
          {
            id: "watch-01",
            no: "01",
            icon: "watch_event1.png",
            title: "승부 예측",
            desc: "최강의 둘이서 한 팀 선발전! 과연 승자는 누구일까요?<br>8월 23일(일) 매치 시작 전까지 승부 예측에 참여하고 적중 보상을 획득하세요!",
            reward: "예측 성공 시 500 SP / 실패 시 제작 재료 2,000개",
            cta: "승부 예측 참여하기",
          },
          {
            id: "watch-02",
            no: "02",
            icon: "watch_event2.png",
            title: "성공이냐 실패냐",
            desc: "챔피언십 & 태디컵 선수들의 업투게더 미션 성공 여부에 따라 깜짝 쿠폰이 지급됩니다.",
            reward: "깜짝 쿠폰",
            cta: "",
          },
          {
            id: "watch-03",
            no: "03",
            icon: "watch_event3.png",
            title: "우리는 모두 하나!",
            desc: "동시 시청자 달성 수에 따라 쿠폰이 지급됩니다.<br>이번 최고 목표는 21,000명! 상세 보상은 방송에서 공개됩니다.",
            reward: "동시 시청자 달성 쿠폰 (목표 21,000명)",
            cta: "",
          },
          {
            id: "watch-04",
            no: "04",
            icon: "watch_event4.png",
            title: "N커넥트 연동 & 드롭스",
            desc: "선택 동의를 포함한 N커넥트 연동을 완료한 후 방송을 시청하면 드롭스 보상을 지급합니다.<br>(시청 미션 달성 시마다 지급 · 방송 시청 조건 충족 시)",
            reward: "21주년 방송 시청상자",
            cta: "",
          },
          {
            id: "watch-05",
            no: "05",
            icon: "watch_event5.png",
            title: "21주년 메달 완성 · 듀오 동반 시청",
            desc: "21주년 메달을 완성하고 N커넥트 연동을 완료한 듀오가 함께 방송을 시청하면<br>특별한 추가 보상을 획득할 수 있습니다!",
            reward: "마이건2 주무기 하프키트",
            cta: "",
          },
        ],
      };

      /** 참여 자격 — 로그인 + 캐릭터 + 제재 없음 */
      const isUserValid = computed(
        () => user.login && user.character && !user.penalty
      );

      /** 받은 합체 신청 — 정렬 후 최대 10건 */
      const sortedReceived = computed(() => {
        const list = [...medal.received];
        list.sort((a, b) =>
          medal.sortMode === "new" ? (b.t || 0) - (a.t || 0) : (a.t || 0) - (b.t || 0)
        );
        return list.slice(0, 10);
      });

      /** 개인 누적 출석 일수 */
      const totalDays = computed(
        () => attend.state.filter((s) => s > 0).length
      );

      /** 듀오 동반 출석 일수 (보충 제외: state === 2) */
      const duoDays = computed(
        () => attend.state.filter((s) => s === 2).length
      );

      /** 21일 출석판 — 날짜·상태·보상 매핑 */
      const days = computed(() => {
        return DAY_REWARDS.map((reward, i) => {
          const d = new Date(2026, 7, 6 + i);
          const s = attend.state[i];
          const makeable = s === 0 && i < attend.todayIdx;
          const claimed = attend.claimed.includes(i);
          return {
            i,
            id: "day-" + String(i + 1).padStart(2, "0"),
            label: `${d.getMonth() + 1}월 ${d.getDate()}일`,
            dow: `(${DOW[d.getDay()]})`,
            weekend: d.getDay() === 0 || d.getDay() === 6,
            s,
            reward,
            makeable,
            claimed,
            streak: attend.streakDays.includes(i),
            isToday: s === 0 && i === attend.todayIdx,
          };
        });
      });

      /** 출석판 7×3 그리드 행 분할 */
      const calRows = computed(() => {
        const list = days.value;
        return [list.slice(0, 7), list.slice(7, 14), list.slice(14, 21)];
      });

      /** 출석 진행률 (0~100) */
      const progress = computed(() =>
        Math.round((totalDays.value / 21) * 100)
      );

      /** 유의사항 팝업 부제 */
      const noticeTitle = computed(() => {
        if (ui.notice === "event01") return "· 메달 합체";
        if (ui.notice === "event02") return "· 21일 출석";
        if (ui.notice === "event03") return "· 쇼케이스";
        return "";
      });

      /** 출석 헤더 · 듀오 상태 라벨 */
      const duoLabel = computed(() =>
        attend.hasDuo && medal.matched
          ? "듀오와 함께 출석 중 · " + medal.matched.nick
          : attend.hasDuo
            ? "듀오와 함께 출석 중"
            : "나 혼자 출석 중 (이벤트1 미참여)"
      );

      /** API 응답 → medal 상태 반영 */
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
        if (medal.matched) {
          attend.hasDuo = true;
        }
      }

      /** API 응답 → attend 상태 반영 */
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

      /** TODO: API — GET 내 메달 초기상태 */
      async function getMedalState() {
        const result = await fetchApi(DATA_BASE + "/medal.json");
        applyMedalState(result);
      }

      /** TODO: API — POST 메달 발급 */
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

      /** TODO: API — GET 코드 조회 */
      async function getPartner(code) {
        const table = await fetchApi(DATA_BASE + "/partner.json");
        const key = code.toUpperCase();
        const hit = table.lookup[key];
        if (hit) return { ...hit };
        return {
          ...table.default,
          nick: table.default.nick + "_" + code.slice(-2),
        };
      }

      /** TODO: API — POST 합체 신청 */
      async function postSendRequest(payload) {
        void payload;
        return { ok: true };
      }

      /** TODO: API — POST 신청 수락/완성 */
      async function postAcceptMerge(payload) {
        void payload;
        return {
          matched: payload,
          reward: { basic: ["10만 경험치", "리센느 멀티카운트"] },
        };
      }

      /** TODO: API — POST 기본 보상 수령 */
      async function postClaimReward() {
        return { ok: true };
      }

      /** TODO: API — GET 출석 현황 */
      async function getAttendance() {
        const result = await fetchApi(DATA_BASE + "/attendance.json");
        applyAttendanceState(result);
      }

      /** TODO: API — GET 보상함 */
      async function getVaultRewards() {
        const result = await fetchApi(DATA_BASE + "/vault.json");
        vault.rewards = (result.rewards || []).map((item, idx) => ({
          ...item,
          id: item.id || "vault-" + idx,
        }));
        return result;
      }

      /** 스텝 리스트 · active / done 클래스 */
      function stepItemClass(stepNum) {
        if (medal.phase === stepNum) return "step-list__item--active";
        if (medal.phase > stepNum) return "step-list__item--done";
        return "";
      }

      /** 출석 카드 · 상태별 modifier */
      function calCardClass(day) {
        const cls = [];
        if (day.s > 0 && !day.claimed) cls.push("cal-card--active");
        if (day.claimed) cls.push("cal-card--done");
        if (day.s === 2) cls.push("cal-card--duo");
        if (day.s === 4) cls.push("cal-card--makeup");
        if (day.makeable && attend.makeup > 0) cls.push("cal-card--makeable");
        if (day.streak) cls.push("cal-card--streak");
        return cls;
      }

      /** 출석 카드 · 클릭 가능 여부 */
      function isCalCardClickable(day) {
        if (day.s > 0 && !day.claimed) return true;
        if (day.makeable && attend.makeup > 0) return true;
        return false;
      }

      /** 출석 카드 · 아이콘 경로 */
      function calIconPath(index) {
        return "./assets/images/cal_reward_icon" + String(index + 1).padStart(2, "0") + ".png";
      }

      /** 마일스톤 카드 · modifier */
      function milestoneCardClass(daysRequired, type) {
        const reached =
          type === "duo"
            ? duoDays.value >= daysRequired
            : totalDays.value >= daysRequired;
        const claimed =
          type === "duo"
            ? attend.duoMsClaimed.includes(daysRequired)
            : attend.msClaimed.includes(daysRequired);
        if (claimed) return "milestone__card--done";
        if (reached) return "milestone__card--ready";
        return "";
      }

      /** 마일스톤 버튼 · modifier */
      function milestoneBtnClass(daysRequired, type) {
        const reached =
          type === "duo"
            ? duoDays.value >= daysRequired
            : totalDays.value >= daysRequired;
        const claimed =
          type === "duo"
            ? attend.duoMsClaimed.includes(daysRequired)
            : attend.msClaimed.includes(daysRequired);
        if (claimed) return "milestone__btn milestone__btn--done";
        if (reached) return "milestone__btn milestone__btn--ready";
        return "milestone__btn";
      }

      /** 마일스톤 버튼 · 라벨 */
      function milestoneBtnLabel(daysRequired, type) {
        const reached =
          type === "duo"
            ? duoDays.value >= daysRequired
            : totalDays.value >= daysRequired;
        const claimed =
          type === "duo"
            ? attend.duoMsClaimed.includes(daysRequired)
            : attend.msClaimed.includes(daysRequired);
        if (claimed) return "수령완료";
        if (reached) return "보상 받기";
        return "미달성";
      }

      /** 마일스톤 버튼 · disabled */
      function isMilestoneDisabled(daysRequired, type) {
        const reached =
          type === "duo"
            ? duoDays.value >= daysRequired
            : totalDays.value >= daysRequired;
        const claimed =
          type === "duo"
            ? attend.duoMsClaimed.includes(daysRequired)
            : attend.msClaimed.includes(daysRequired);
        return !reached || claimed;
      }

      /** 받은 신청 · 정렬 모드 변경 */
      function setSort(mode) {
        medal.sortMode = mode;
      }

      /**
       * '메달 발급받기' 버튼 클릭 핸들러
       * 로그인·캐릭터 존재 여부 및 참여 자격을 검증한 후, 메달 발급 API를 호출하여 내 코드를 부여
       */
      async function clickIssueMedal() {
        if (!user.login) return Utils.alert("로그인이 필요합니다.");
        if (!user.character)
          return Utils.alert("서든어택 계정(캐릭터)이 필요합니다.");
        if (user.penalty)
          return Utils.alert("이벤트 참여가 제한된 계정입니다.");
        if (medal.issued || medal.phase > 1) return;
        await postIssueMedal();
      }

      /** 내 메달 코드 클립보드 복사 */
      function copyCode() {
        if (!medal.code) return;
        navigator.clipboard?.writeText(medal.code);
        Utils.alert("코드가 복사되었습니다.<br><b>" + medal.code + "</b>");
      }

      /** SNS 공유 — API 연동 예정 */
      function clickShare() {
        Utils.alert("SNS 공유 기능은 API 연동 후 제공됩니다.");
      }

      /** 상대 코드 실시간 조회 · 합체 가능 여부 판별 */
      async function lookupLive() {
        const code = medal.find.input.trim().toUpperCase();
        medal.find.preview = null;
        medal.find.alert = null;
        if (code.length < 4) return;
        if (code === medal.code) {
          medal.find.alert = {
            type: "warn",
            text: "본인 코드는 신청할 수 없습니다.",
            ok: false,
          };
          return;
        }
        const res = await getPartner(code);
        if (!res.found) {
          medal.find.alert = {
            type: "warn",
            text: res.reason || "존재하지 않는 코드입니다.",
            ok: false,
          };
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
      }

      /** 데모용 코드 힌트 입력 */
      function fillHint(code) {
        medal.find.input = code;
        lookupLive();
      }

      /** 메달 합체 신청 전송 */
      async function clickSendRequest() {
        if (!medal.find.alert?.ok || medal.quota <= 0 || medal.sentTo) return;
        const nick = medal.find.preview?.nick || "상대";
        const ok = await Utils.confirm(
          "<b>" + nick + "</b> 님에게 메달 합체 신청을 보낼까요?"
        );
        if (!ok) return;
        await postSendRequest({
          code: medal.find.input,
          nick,
        });
        medal.quota--;
        medal.sentTo = { nick, code: medal.find.input.toUpperCase() };
        medal.phase = 3;
        medal.find.alert = null;
      }

      /** 보낸 합체 신청 취소 */
      async function cancelRequest() {
        if (!medal.sentTo) return;
        const ok = await Utils.confirm("보낸 합체 신청을 취소할까요?");
        if (!ok) return;
        medal.sentTo = null;
        medal.phase = 2;
        medal.quota = Math.min(5, medal.quota + 1);
      }

      /** 데모 — 상대 수락 시뮬레이션 */
      async function partnerAccepts() {
        if (!medal.sentTo) return;
        await completeMatch({
          nick: medal.sentTo.nick,
          code: medal.sentTo.code,
        });
      }

      /** 매칭 완료 · phase 4 전환 */
      async function completeMatch(partner) {
        await postAcceptMerge(partner);
        medal.matched = { nick: partner.nick, code: partner.code };
        medal.sentTo = null;
        medal.phase = 4;
        attend.hasDuo = true;
      }

      /** 받은 합체 신청 수락 */
      async function clickAcceptReceived(code) {
        if (medal.claimed || medal.phase === 4) return;
        const item = medal.received.find((r) => r.code === code);
        if (!item) return;
        const ok = await Utils.confirm(
          "<b>" + item.nick + "</b> 님과 메달을 합칠까요?"
        );
        if (!ok) return;
        await completeMatch({ nick: item.nick, code: item.code });
        medal.received = medal.received.filter((r) => r.code !== code);
      }

      /** 받은 합체 신청 거절 */
      function rejectReceived(code) {
        medal.received = medal.received.filter((r) => r.code !== code);
      }

      /** 메달 완성 기본 보상 수령 */
      async function clickClaimReward() {
        if (medal.claimed || medal.phase !== 4) return;
        await postClaimReward();
        medal.claimed = true;
        attend.hasDuo = true;
        await Utils.alert("기본 보상이 지급되었습니다.");
      }

      /** 오늘 출석 처리 (solo | duo) */
      async function checkIn(type) {
        if (!isUserValid.value) return Utils.alert("참여 자격을 확인해 주세요.");
        if (attend.todayIdx >= 21) return;
        if (type === "duo" && !attend.hasDuo)
          return Utils.alert("먼저 이벤트1에서 듀오를 맺어주세요.");
        attend.state[attend.todayIdx] = type === "duo" ? 2 : 1;
        attend.todayIdx++;
        // TODO: API — POST 출석 처리
      }

      /** 출석 카드 클릭 — 일별 보상 수령 / 보충 출석 */
      async function clickDay(i) {
        const day = days.value.find((d) => d.i === i);
        if (!day) return;
        if (day.s > 0 && !day.claimed) {
          attend.claimed.push(i);
          // TODO: API — POST 일별 보상 수령
          return;
        }
        if (day.makeable && attend.makeup > 0) {
          const ok = await Utils.confirm(
            day.label + " 보충 출석권으로 출석 처리할까요?"
          );
          if (!ok) return;
          attend.makeup--;
          attend.state[i] = 4;
          // TODO: API — POST 보충 출석
        }
      }

      /** 개인 마일스톤 보상 수령 */
      async function clickClaimMilestone(d) {
        if (totalDays.value < d || attend.msClaimed.includes(d)) return;
        attend.msClaimed.push(d);
        // TODO: API — POST 개인 마일스톤 수령
      }

      /** 동반 마일스톤 보상 수령 */
      async function clickClaimDuoMilestone(d) {
        if (duoDays.value < d || attend.duoMsClaimed.includes(d)) return;
        attend.duoMsClaimed.push(d);
        // TODO: API — POST 동반 마일스톤 수령
      }

      /** 일별 보상 일괄 수령 */
      async function claimAllDaily() {
        // TODO: API — POST 일괄 수령
        days.value.forEach((d) => {
          if (d.s > 0 && !d.claimed) attend.claimed.push(d.i);
        });
        await Utils.alert("수령 가능한 일별 보상을 모두 받았습니다.");
      }

      /** 출석 현황 갱신 (3분 쿨다운) */
      async function clickRefreshAttendance() {
        const now = Date.now();
        if (now - attend.refreshAt < 180000) {
          const sec = Math.ceil((180000 - (now - attend.refreshAt)) / 1000);
          return Utils.alert(
            "출석 갱신은 3분 간격입니다.<br>(약 " + sec + "초 후 가능)"
          );
        }
        attend.refreshAt = now;
        await getAttendance();
        await Utils.alert("출석 현황이 갱신되었습니다.");
      }

      /** 보상함 드로어 열기 */
      async function openVault() {
        await getVaultRewards();
        vault.open = true;
        Utils.bodyScroll.hide();
      }

      /** 보상함 드로어 닫기 */
      function closeVault() {
        vault.open = false;
        Utils.bodyScroll.show();
      }

      /** 유의사항 팝업 열기 */
      function openNotice(key) {
        ui.notice = key;
        Utils.bodyScroll.hide();
      }

      /** 유의사항 팝업 닫기 */
      function closeNotice() {
        ui.notice = null;
        Utils.bodyScroll.show();
      }

      /** 마운트 — 메달·출석 초기 로드 (해시 스크롤은 control.js pageScroll) */
      onMounted(async () => {
        await getMedalState();
        await getAttendance();
      });

      return {
        user,
        medal,
        attend,
        vault,
        ui,
        steps,
        rewardItems,
        milestoneDefs,
        duoMilestoneHighlight,
        notices,
        showcase,
        isUserValid,
        sortedReceived,
        totalDays,
        duoDays,
        days,
        calRows,
        progress,
        noticeTitle,
        duoLabel,
        stepItemClass,
        calCardClass,
        isCalCardClickable,
        calIconPath,
        milestoneCardClass,
        milestoneBtnClass,
        milestoneBtnLabel,
        isMilestoneDisabled,
        setSort,
        clickIssueMedal,
        copyCode,
        clickShare,
        lookupLive,
        fillHint,
        clickSendRequest,
        cancelRequest,
        partnerAccepts,
        clickAcceptReceived,
        rejectReceived,
        clickClaimReward,
        checkIn,
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
