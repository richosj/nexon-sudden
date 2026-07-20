/**
 * event.js — 서든어택 21주년 Vue 앱 (mount: #app)
 *
 * 데이터 흐름 (미리 세팅 후 show/hide 금지):
 *   ① 액션(클릭) → ② get/post 수신 → ③ reactive 상태 세팅 → ④ 자동 렌더
 *
 * setup() 블록:
 *   [상태] [정적 데이터] [계산값] [API 연동] [UI 헬퍼] [동작 함수] [초기화]
 *
 * 공용: utils.js(Utils.alert/confirm/bodyScroll) · control.js(data-scroll-active, pageScroll)
 * mock: assets/data/*.json — 응답 계약 { rtnCode, message, result }
 * 실서버 연동: 아래 get/post 함수 내부 // TODO: API 위치에 fetch 연결
 */
(function () {
  const { createApp, reactive, computed, onMounted } = Vue;

  /** mock 경로 — 배포 시 API base URL 로 교체 */
  const DATA_BASE = "./assets/data";

  // 21일 일별 보상 라벨 (days computed 와 인덱스 매핑)
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
      /* ------------------------------------------------------------------
       * [상태] API/클릭이 갱신 → 템플릿은 바인딩만 (값 미리 박아두고 숨기지 않음)
       * ------------------------------------------------------------------ */

      /**
       * 유저 계정 정보
       * 로그인 여부, 인게임 캐릭터 존재 여부, 이벤트 제재 상태
       * 참여 자격 = login && character && !penalty
       */
      const user = reactive({
        login: true,
        character: true,
        penalty: false,
      });

      /**
       * EVENT1 메달 합체 상태
       * phase: 1발급 → 2찾기 → 3신청대기(sentTo) → 4완성
       * side: 합체 연출용 L/R만 사용 (매칭 좌우 제한 없음)
       * quota: 일 5회 · 오전 8시 초기화 · 취소 시 횟수 미복구
       */
      const medal = reactive({
        issued: true,
        code: "SA-K7X9",
        side: "L",
        phase: 2,
        quota: 5,
        sentTo: null,
        received: [],
        sortMode: "new",
        matched: null,
        claimed: false,
        find: { input: "", preview: null, alert: null },
      });

      /**
       * EVENT2 21일 출석 상태
       * state[i]: 0미출석 · 1출석 · 2동반 · 4보충 (보충일은 연속·동반 집계 제외)
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
       * 내 보상함 드로어 열림 여부
       * TODO: getVaultRewards 연동 시 rewards 배열 추가
       */
      const vault = reactive({ open: false });

      /**
       * 공통 UI 상태
       * notice: 유의사항 대상(event01~03) · share: SNS 모달 · menu: MO 햄버거 · toast
       */
      const ui = reactive({
        notice: null,
        share: false,
        menu: false,
        toast: { show: false, text: "", timer: null },
      });

      /* ------------------------------------------------------------------
       * [정적 데이터] API 불필요 — 스텝·보상카피·마일스톤·유의사항·쇼케이스
       * ------------------------------------------------------------------ */
      const shareChannels = [
        { id: "kakao", label: "카카오톡", icon: "share_kakao.svg" },
        { id: "facebook", label: "페이스북", icon: "share_facebook.svg" },
        { id: "x", label: "X", icon: "share_x.svg" },
        { id: "instagram", label: "인스타그램", icon: "share_instagram.svg" },
        { id: "link", label: "링크복사", icon: "share_link.svg" },
      ];

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

      /* 유의사항 — 기획안 v3.3 슬라이드 문구 정합 (표시용 정적 카피) */
      const notices = {
        event01: [
          "참여 제한: 본 이벤트는 계정당 1회만 참여 가능하며, 1:1 매칭으로만 진행됩니다. 동일 명의 계정 간에는 듀오 결성이 불가합니다.",
          "신청 제한: 메달 합체 신청은 1일 최대 5회까지만 가능하며, 매일 오전 8시에 초기화됩니다.",
          "신청 취소: 상대방에게 보낸 메달 합체 신청은 상대방이 수락하기 전까지 언제든지 취소할 수 있습니다. 단, 신청 취소 시 일일 신청 횟수는 복구되지 않습니다.",
          "신청 자동 취소: 이미 신청을 보낸 상태에서 새로운 상대에게 다시 신청하는 경우, 이전 상대에게 보낸 신청은 자동으로 취소됩니다.",
          "듀오 결성 후 변경 불가: 상대방이 신청을 수락하여 듀오가 결성된 이후에는 어떠한 경우에도 듀오 변경 및 취소가 불가능하니 신중하게 결정해 주세요.",
          "듀오 닉네임 안내: 듀오의 닉네임은 듀오 결성 완료 시점을 기준으로 고정됩니다. 이후 인게임에서 닉네임을 변경하더라도 이벤트 페이지 내 듀오 닉네임은 변경되지 않습니다.",
          "보상 지급: '보상 받기' 버튼 클릭 시 보상 아이템(10만 경험치 + 리센느 멀티카운트 + 돌격 기간연장 영구제)이 인게임 선물함으로 즉시 지급됩니다.",
          "수령 기간: 보상 아이템은 9월 3일(목) 정기점검 전까지만 수령이 가능하오니 반드시 기간 내에 보상을 수령해 주세요.",
          "추첨 보상 발표: 트윈 블루투스 스피커 및 넥슨캐시 당첨 여부는 9월 3일(목) 당첨자 발표 게시판을 통해 확인하실 수 있습니다.",
        ],
        event02: [
          "출석 인정 기준: 이벤트 기간 동안 게임에 접속하면 당일 출석으로 인정됩니다. (하루 기준: 오전 08:00 ~ 다음 날 오전 07:59)",
          "출석 현황 갱신: 출석이 웹페이지에 즉시 반영되지 않을 경우 '출석 갱신하기' 버튼을 클릭해 주세요. (출석 재갱신은 3분 간격으로만 가능합니다.)",
          "동반 출석 인정: 동반 출석은 이벤트1에서 듀오를 맺은 서든러 2명이 같은 날 각각 게임에 접속하면 반영됩니다. (기간 내 최대 5장)",
          "동반 출석 보충권: 듀오와 같은 날 함께 출석하면 '보충 출석권'이 1장 지급됩니다.",
          "동반 출석 누적 보상: 동반 출석이 누적 5일에 도달하면 듀오 양측 모두에게 보상이 지급됩니다. 단, 보충 출석권으로 출석 처리한 날은 누적 집계에 포함되지 않습니다.",
          "연속 출석 보충권: 3일 연속으로 게임에 접속할 때마다 '보충 출석권'이 1장 지급됩니다. (이벤트 기간 내 최대 5장)",
          "연속 출석 초기화: 단 하루라도 결석할 경우, 기존의 연속 출석 기록은 즉시 초기화(리셋)됩니다.",
          "보충 출석권 사용 및 제한: 빈 날짜를 클릭하면 보충 출석권 1장으로 결석한 날을 출석 상태로 메울 수 있습니다. (보충 출석권 한도: 동반 5장 + 연속 5장) 단, 보충 출석권으로 채운 날은 취소·변경이 불가능하며, '연속 출석'과 '동반 출석' 조건에는 포함되지 않습니다.",
          "누적 출석 보상: 누적 출석일 7일 / 14일 / 21일 달성 시, 각 단계별 추가 보상을 획득할 수 있습니다.",
          "듀오 변경 불가: 듀오 결성 완료 후에는 듀오 변경 및 취소가 불가능하므로 신중하게 듀오를 맺어 주세요.",
          "보상 지급: 모든 출석 보상은 이벤트 페이지 내 '보상 받기' 버튼을 클릭해야 인게임 선물함으로 지급됩니다.",
          "보상 수령 기간: 보상은 9월 3일(목) 정기점검 전까지만 수령이 가능하오니 기간 내에 반드시 수령해 주세요.",
          "SP 보상 수령 안내: SP 및 제작 재료는 지급일로부터 30일 이내 수령하지 않을 경우 삭제되며, SP는 본인 인증을 완료한 계정만 수령 가능합니다.",
          "기타 안내: 자세한 이벤트 유의사항은 [이벤트 정책]을 확인해 주시기 바랍니다.",
        ],
        event03: [
          "21주년 쇼케이스 방송 시청 이벤트: 21주년 쇼케이스 방송을 시청하고 조건을 충족하면 보상이 지급됩니다.",
          "승부 예측: 8월 23일(일) 오후 5시 전까지 참여한 예측만 인정됩니다. 승부 예측은 계정당 최대 5회까지만 참여 가능하며, 이후엔 수정이 불가능합니다. 보상은 예측 참여 횟수와 상관 없이 계정당 1회만 지급됩니다.",
          "N커넥트 연동: 선택 동의를 포함한 N커넥트 연동을 완료한 후 방송을 시청해야 드롭스 보상이 지급됩니다.",
          "듀오 동반 시청: 21주년 메달을 완성하고 N커넥트 연동을 완료한 듀오가 함께 시청해야 추가 보상 대상이 됩니다. 보상은 계정당 1회만 지급됩니다.",
          "상세 보상 내용 및 세부 유의사항은 추후 업데이트될 예정입니다.",
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

      /* [계산값]
       * sortedReceived · days/calRows · totalDays/duoDays · progress · duoLabel · vaultMilestones
       * duoDays 는 state===2 만 (보충 4 제외)
       */
      const sortedReceived = computed(() => {
        const list = [...medal.received];
        list.sort((a, b) =>
          medal.sortMode === "new" ? (b.t || 0) - (a.t || 0) : (a.t || 0) - (b.t || 0)
        );
        return list.slice(0, 10);
      });
      const totalDays = computed(() => attend.state.filter((s) => s > 0).length);
      const duoDays = computed(() => attend.state.filter((s) => s === 2).length);
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

      /* [API 연동]
       * 흐름: 클릭 → get/post → apply*로 상태 세팅 → 렌더
       * 응답 권장: { rtnCode, message, result } — fetchApi 가 rtnCode 검사
       * 실서버: 각 함수 TODO API 위치에 fetch 연결 (mock JSON 제거)
       */
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

      /**
       * GET 메달 초기 상태
       * 로드 시 issued · code · phase · quota · matched · received 등을 상태에 반영
       * TODO: 실 API 연결 · 배포 전 medal.json(미발급) 복구 여부 확인
       */
      async function getMedalState() {
        // TODO(작업용): phase2 미리보기 — 배포 전 medal.json 으로 복구
        applyMedalState(await fetchApi(DATA_BASE + "/medal_issued.json"));
      }

      /**
       * POST 메달 발급
       * 반쪽 메달·코드 부여 후 phase 2 로 전환
       */
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

      /**
       * GET 상대 메달 코드 조회
       * found · nick · matchable · reason 반환 (닉네임만 미리보기)
       */
      async function getPartner(code) {
        const table = await fetchApi(DATA_BASE + "/partner.json");
        const key = code.toUpperCase();
        if (table.lookup[key]) return { ...table.lookup[key] };
        return {
          ...table.default,
          nick: table.default.nick + "_" + code.slice(-2),
        };
      }

      /**
       * POST 합체 신청 전송
       * quota 차감·이전 신청 자동 취소는 서버 정책과 맞춰야 함
       */
      async function postSendRequest(payload) {
        void payload;
        return { ok: true };
      }

      /**
       * POST 합체 수락 / 매칭 완료
       * matched · 기본 보상 정보 반환
       */
      async function postAcceptMerge(payload) {
        return { matched: payload, reward: { basic: [] } };
      }

      /**
       * POST EVENT1 기본 보상 수령
       */
      async function postClaimReward() {
        return { ok: true };
      }

      /**
       * GET 21일 출석 현황
       * state · makeup · streak · hasDuo · 마일스톤 수령 여부
       */
      async function getAttendance() {
        applyAttendanceState(await fetchApi(DATA_BASE + "/attendance.json"));
      }
      /* [UI 헬퍼] 템플릿 :class / :disabled / 라벨 */
      function showToast(text, duration = 2800) {
        if (ui.toast.timer) clearTimeout(ui.toast.timer);
        ui.toast.text = text;
        ui.toast.show = true;
        ui.toast.timer = setTimeout(() => {
          ui.toast.show = false;
          ui.toast.timer = null;
        }, duration);
      }

      function stepItemClass(stepNum) {
        /* --active 만 스타일 존재. 지난 단계는 기본 스타일 유지 */
        if (medal.phase === stepNum) return "step-list__item--active";
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
      function calShowMark(day) {
        return day.s > 0;
      }
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

      /**
       * 받은 신청 목록 정렬 모드 변경 (new | old)
       */
      function setSort(mode) {
        medal.sortMode = mode;
      }

      /* [동작 함수]
       * EVENT1: clickIssueMedal → … → clickClaimReward
       * EVENT2: clickDay · claimAllDaily · clickClaimMilestone · clickRefreshAttendance
       * 공통: openVault / openNotice / toggleMenu — 초입에서 중복·자격 검사 후 return
       */

      /**
       * '메달 발급받기' 버튼 클릭 핸들러
       * 로그인·캐릭터 존재 여부 및 참여 자격을 검증한 후, 메달 발급 API를 호출하여 내 코드를 부여
       */
      async function clickIssueMedal() {
        if (!user.login) {
          return Utils.confirm("메달 발급은 로그인 후 참여할 수 있어요", {
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
       * 퍼블 데모용 · 스텝 클릭으로 phase 미리보기
       * 1: 미발급 / 2~3: 발급 mock / 4: 합체 완료 mock — 배포 전 제거 또는 비활성
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

      /**
       * 내 메달 코드 클립보드 복사
       */
      function copyCode() {
        if (!medal.code) return;
        navigator.clipboard?.writeText(medal.code);
        showToast("코드가 복사되었습니다. " + medal.code);
      }

      /**
       * SNS 공유 모달 열기
       * 메달 미발급 시 안내 후 중단
       */
      function clickShare() {
        if (!medal.code) {
          return Utils.alert("먼저 메달을 발급받아 주세요.");
        }
        ui.share = true;
        Utils.bodyScroll.hide();
      }

      /**
       * SNS 공유 모달 닫기
       */
      function closeShare() {
        ui.share = false;
        Utils.bodyScroll.show();
      }

      /**
       * 공유 채널 선택 핸들러
       * link: 코드 복사 / 그 외: SNS SDK TODO
       */
      function clickShareChannel(id) {
        if (id === "link") {
          copyCode();
          return;
        }
        // TODO: 카카오/페북/X/인스타 SDK 연동
        showToast(id + " 공유는 API 연동 후 제공됩니다.");
      }

      /**
       * 상대 메달 코드 실시간 조회
       * 4자 이상 입력 시 getPartner 호출 → find.alert / preview 세팅
       */
      async function lookupLive() {
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
            /* 재신청 허용: 이전 sentTo 는 새 신청 시 자동 취소(횟수 미복구) */
            ok: medal.quota > 0,
          };
        } catch (err) {
          console.error(err);
          medal.find.alert = { type: "warn", text: "코드 조회에 실패했습니다.", ok: false };
        }
      }

      /**
       * '메달 합체 신청하기' 클릭 핸들러
       * 확인 모달 후 postSendRequest · quota 차감 · phase 3
       * 이미 sentTo 가 있으면 이전 신청 자동 취소(횟수 미복구)
       */
      async function clickSendRequest() {
        if (!medal.find.alert?.ok || medal.quota <= 0) return;
        const nick = medal.find.preview?.nick || "상대";
        const replacing = !!medal.sentTo;
        const ok = await Utils.confirm(
          replacing
            ? "이미 보낸 신청이 있습니다. 새 상대에게 신청하면 이전 신청은 자동 취소되며, 일일 신청 횟수는 복구되지 않습니다. 계속할까요?"
            : "상대방이 메달 합체를 수락하면 메달 합체와 함께 듀오가 결성되며, 결성 후에는 취소·변경이 불가합니다. Event2에서 듀오 동반 출석 혜택이 있으니 신중하게 선택해 주세요.",
          {
            title: replacing ? "신청 변경" : "메달 합체 신청",
            confirmText: "신청 보내기",
            cancelText: "취소",
          }
        );
        if (!ok) return;

        await postSendRequest({ code: medal.find.input, nick, replace: replacing });
        medal.quota--; // 취소·재신청 모두 횟수 미복구(기획 v3.3)
        medal.sentTo = { nick, code: medal.find.input.toUpperCase() };
        medal.phase = 3;
        medal.find.alert = null;
        showToast(
          replacing
            ? "이전 신청을 취소하고 " + nick + " 님에게 합체 신청을 보냈어요"
            : nick + " 님에게 합체 신청을 보냈어요"
        );
      }

      /**
       * 보낸 합체 신청 취소
       * 취소해도 일일 신청 횟수는 복구되지 않음
       */
      async function cancelRequest() {
        if (!medal.sentTo) return;
        if (
          !(await Utils.confirm(
            "보낸 합체 신청을 취소할까요?<br>취소해도 오늘 사용한 신청 횟수는 복구되지 않습니다.",
            {
              confirmText: "신청 취소",
              cancelText: "닫기",
            }
          ))
        )
          return;
        // TODO: API POST 신청 취소 — 횟수 미복구는 서버 정책과 동일해야 함
        medal.sentTo = null;
        medal.phase = 2;
        showToast("합체 신청을 취소했어요 (신청 횟수는 복구되지 않습니다)");
      }

      /**
       * 퍼블 데모용 · 상대가 내 신청을 수락한 것처럼 시뮬레이션
       * 실서버는 폴링/푸시로 completeMatch 호출
       */
      async function partnerAccepts() {
        if (!medal.sentTo) return;
        await completeMatch({ nick: medal.sentTo.nick, code: medal.sentTo.code });
      }

      /**
       * 매칭 완료 공통 처리
       * postAcceptMerge → matched · phase4 · attend.hasDuo
       */
      async function completeMatch(partner) {
        await postAcceptMerge(partner);
        medal.matched = { nick: partner.nick, code: partner.code };
        medal.sentTo = null;
        medal.phase = 4;
        attend.hasDuo = true;
      }

      /**
       * 받은 합체 신청 '수락' 클릭 핸들러
       * 확인 모달 후 completeMatch · 목록에서 해당 건 제거
       */
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

      /**
       * 받은 합체 신청 '거절' 클릭 핸들러
       */
      function rejectReceived(code) {
        // TODO: API POST 신청 거절
        medal.received = medal.received.filter((r) => r.code !== code);
        showToast("합체 신청을 거절했어요");
      }

      /**
       * EVENT1 '보상 받기' 클릭 핸들러
       * 기본 보상 수령 API 호출 후 claimed · hasDuo 세팅 · 듀오 결성 안내
       */
      async function clickClaimReward() {
        if (medal.claimed || medal.phase !== 4) return;
        await postClaimReward();
        medal.claimed = true;
        attend.hasDuo = true;
        await Utils.alert(
          "듀오가 결성되었습니다!<br>기본 보상이 인게임 선물함으로 지급됐어요.<br>이제 21일 듀오 출석 챌린지에 동반 출석으로 참여할 수 있어요."
        );
      }

      /**
       * 출석 달력 셀 클릭 핸들러
       * 출석일+미수령 → 일별 보상 수령 / 과거 미출석+보충권 → 보충 출석(state=4)
       */
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

      /**
       * 개인 누적 마일스톤(7/14/21일) '보상 받기' 클릭 핸들러
       */
      async function clickClaimMilestone(d) {
        if (totalDays.value < d || attend.msClaimed.includes(d)) return;
        attend.msClaimed.push(d);
        // TODO: API POST
      }

      /**
       * 동반 출석 마일스톤(5일) '보상 받기' 클릭 핸들러
       */
      async function clickClaimDuoMilestone(d) {
        if (duoDays.value < d || attend.duoMsClaimed.includes(d)) return;
        attend.duoMsClaimed.push(d);
        // TODO: API POST
      }

      /**
       * 일별 출석 보상 일괄 수령
       */
      async function claimAllDaily() {
        days.value.forEach((d) => {
          if (d.s > 0 && !d.claimed) attend.claimed.push(d.i);
        });
        // TODO: API POST
        await Utils.alert("수령 가능한 일별 보상을 모두 받았습니다.");
      }

      /**
       * '출석 갱신하기' 클릭 핸들러
       * 3분 쿨다운 후 getAttendance 재호출
       */
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

      /**
       * 상단바·사이드 '내 보상함' 열기
       * TODO: getVaultRewards → vault.rewards 세팅 후 오픈 (현재는 medal/attend 기반 표시)
       */
      async function openVault() {
        vault.open = true;
        Utils.bodyScroll.hide();
      }

      /**
       * 내 보상함 닫기
       */
      function closeVault() {
        vault.open = false;
        Utils.bodyScroll.show();
      }

      /**
       * 이벤트별 유의사항 모달 열기
       * @param {"event01"|"event02"|"event03"} key
       */
      function openNotice(key) {
        ui.notice = key;
        Utils.bodyScroll.hide();
      }

      /**
       * 유의사항 모달 닫기
       */
      function closeNotice() {
        ui.notice = null;
        Utils.bodyScroll.show();
      }

      /**
       * MO 햄버거 메뉴 토글
       */
      function toggleMenu() {
        ui.menu = !ui.menu;
      }

      /**
       * MO 햄버거 메뉴 닫기
       */
      function closeMenu() {
        ui.menu = false;
      }

      /* [초기화]
       * onMounted: getMedalState + getAttendance (①로드 → ②get → ③상태 → ④렌더)
       */
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
        toggleMenu,
        closeMenu,
      };
    },
  }).mount("#app");
})();
