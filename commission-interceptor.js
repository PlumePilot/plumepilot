(() => {
  "use strict";

  const STUDYWING_DEBUG = false;
  const debugLog = (...values) => {
    if (STUDYWING_DEBUG) console.info(...values);
  };
  if (window !== window.top || window.__studyWingCommissionInterceptorInstalled) return;
  window.__studyWingCommissionInterceptorInstalled = true;

  const TARGET_PATH = "/student/exam-online/exams-list-done";
  const RESPONSE_MESSAGE = "STUDYWING_COMMISSION_EXAMS_RESPONSE";
  const REQUEST_MESSAGE = "STUDYWING_COMMISSION_EXAMS_REQUEST";
  const CANCEL_MESSAGE = "STUDYWING_COMMISSION_EXAMS_CANCEL";
  const CLEAR_MESSAGE = "STUDYWING_COMMISSION_EXAMS_CLEAR_MEMORY";
  const TURBO_API_REQUEST = "STUDYWING_TURBO_API_REQUEST";
  const TURBO_API_RESPONSE = "STUDYWING_TURBO_API_RESPONSE";
  const TURBO_API_CANCEL = "STUDYWING_TURBO_API_CANCEL";
  const PAGE_LESSON_SNAPSHOT = "STUDYWING_PAGE_LESSON_SNAPSHOT";
  const PAGE_LESSON_SNAPSHOT_REQUEST = "STUDYWING_PAGE_LESSON_SNAPSHOT_REQUEST";
  const API_ORIGIN = "https://lms-api.prod.pegaso.multiversity.click";
  const API_TIMEOUT_MS = 15000;
  const COMMISSION_CACHE_MS = 10 * 60 * 1000;
  let lastPayload = null;
  let bearerToken = null;
  let pendingCommissionRequest = null;
  let activeCommissionRequest = null;
  let commissionController = null;
  const turboControllers = new Map();
  const courseOutlines = new Map();
  const pageLessonSnapshots = new Map();

  function isTargetUrl(value) {
    try {
      return new URL(String(value), window.location.href).pathname === TARGET_PATH;
    } catch {
      return false;
    }
  }

  function isPegasoApiUrl(value) {
    try {
      return new URL(String(value), window.location.href).origin === API_ORIGIN;
    } catch {
      return false;
    }
  }

  function courseOutlineCode(value) {
    try {
      const url = new URL(String(value), window.location.href);
      if (url.origin !== API_ORIGIN) return null;
      const match = url.pathname.match(/^\/student\/course\/([^/]+)\/video-lessons\/0\/?$/i);
      if (!match) return null;
      const courseCode = decodeURIComponent(match[1]);
      return validCourseCode(courseCode) ? courseCode : null;
    } catch {
      return null;
    }
  }

  function rememberAuthorization(headers, requestUrl, flushCommission = true) {
    if (!headers || !isPegasoApiUrl(requestUrl)) return;
    try {
      const authorization = new Headers(headers).get("authorization")?.trim();
      if (/^Bearer\s+\S+$/i.test(authorization || "")) {
        bearerToken = authorization;
        if (flushCommission) flushPendingCommissionRequest();
      }
    } catch {
      // Ignore header shapes that the browser cannot normalize.
    }
  }

  function validCourseCode(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{3,80}$/.test(value);
  }

  function validPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
  }

  function normalizeCourseOutline(body) {
    if (!Array.isArray(body?.data)) return [];
    return body.data
      .slice(0, 1000)
      .map((entry) => {
        const displayOrder = Number(entry?.display_order);
        const percentage = Number(entry?.percentage);
        if (!Number.isInteger(displayOrder) || displayOrder < 1) return null;
        return {
          displayOrder,
          id: validPositiveInteger(entry?.id) ? Number(entry.id) : null,
          lpId: validPositiveInteger(entry?.lp_id) ? Number(entry.lp_id) : null,
          title: safeString(entry?.title || entry?.name, 300),
          percentage: Number.isFinite(percentage)
            ? Math.max(0, Math.min(100, percentage))
            : 0,
        };
      })
      .filter(Boolean)
      .sort((first, second) => first.displayOrder - second.displayOrder);
  }

  function detailedLessonRoute(value) {
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== API_ORIGIN) return null;
      const match = url.pathname.match(
        /^\/student\/course\/([^/]+)\/video-lesson\/(\d+)\/paragraphs\/(\d+)\/?$/i,
      );
      if (!match) return null;
      const courseCode = decodeURIComponent(match[1]);
      const lpId = Number(match[2]);
      const paragraphId = Number(match[3]);
      if (!validCourseCode(courseCode) || !validPositiveInteger(lpId) || !validPositiveInteger(paragraphId)) {
        return null;
      }
      return { courseCode, lpId, paragraphId };
    } catch {
      return null;
    }
  }

  function rememberCourseOutline(courseCode, body) {
    if (!validCourseCode(courseCode) || Number(body?.code) !== 200) return null;
    const entries = normalizeCourseOutline(body);
    if (!entries.length) return null;
    courseOutlines.set(courseCode, entries);
    for (const snapshot of pageLessonSnapshots.values()) {
      if (snapshot.courseCode !== courseCode || snapshot.displayOrder) continue;
      const outlineEntry = entries.find(
        (entry) => entry.lpId === snapshot.lpId && entry.id === snapshot.paragraphId,
      );
      if (!outlineEntry) continue;
      snapshot.displayOrder = outlineEntry.displayOrder;
      window.postMessage(snapshot, "*");
    }
    return entries;
  }

  function terminalTest(body) {
    if (!Array.isArray(body?.data)) return null;
    const tests = body.data.filter((item) => item?.contentType === "test");
    const item = tests.find((test) => Number(test.next_item_id) === 0) || tests.at(-1);
    if (!item || !validPositiveInteger(item.lp_item_id) || !validPositiveInteger(item.lp_id)) return null;
    return {
      id: validPositiveInteger(item.id) ? Number(item.id) : null,
      lp_item_id: Number(item.lp_item_id),
      lp_id: Number(item.lp_id),
      testImported: Number(item.testImported) === 1 ? 1 : 0,
      testEmpty: Number(item.testEmpty) === 1 ? 1 : 0,
      percentage: Number.isFinite(Number(item.percentage)) ? Number(item.percentage) : 0,
      next_item_id: Number.isFinite(Number(item.next_item_id)) ? Number(item.next_item_id) : null,
      title: safeString(item.title, 120),
    };
  }

  function normalizedTestSource(body) {
    const source = Array.isArray(body?.data?.testSource)
      ? body.data.testSource.slice(0, 200)
      : [];
    const questions = source.map((item, questionIndex) => {
      const answers = Array.isArray(item?.answers)
        ? item.answers.slice(0, 20).map((answer, answerIndex) => {
          const content = normalizedRichContent(answer?.answer, 6000);
          return {
            id_answer: Number.isFinite(Number(answer?.id_answer))
              ? Number(answer.id_answer)
              : answerIndex,
            answer: content.text,
            images: content.images,
          };
        })
        : [];
      const questionContent = normalizedRichContent(item?.question, 6000);
      const correctPosition = Number(item?.correct_answer);
      if ((!questionContent.text && !questionContent.images.length) || answers.length < 2) return null;
      return {
        id_question: safeString(item.id_question, 120) || String(questionIndex + 1),
        question: questionContent.text,
        images: questionContent.images,
        paragraph: normalizedRichContent(item.paragraph, 600).text,
        lessonTitle: normalizedRichContent(item.titolo_videolezione, 600).text,
        difficulty: safeString(item.difficulty, 40),
        correctPosition:
          Number.isInteger(correctPosition) &&
          correctPosition >= 1 &&
          correctPosition <= answers.length
            ? correctPosition
            : null,
        answers,
      };
    }).filter(Boolean);
    return {
      testId: validPositiveInteger(body?.data?.id) ? Number(body.data.id) : null,
      testEmpty: Number(body?.data?.testEmpty) === 1 ? 1 : 0,
      questions,
    };
  }

  function decodeHtmlEntities(value, maxLength) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = safeString(value, maxLength) || "";
    return textarea.value.replace(/\s+/g, " ").trim();
  }

  function safeTestImageUrl(value) {
    const decoded = decodeHtmlEntities(value, 2000);
    if (!decoded) return null;
    try {
      const url = new URL(decoded);
      const allowedHost =
        url.hostname === "ita01.s3.eu-west-1.amazonaws.com" ||
        /(?:^|\.)cloudfront\.net$/i.test(url.hostname);
      const supportedPath = /\.(?:jpe?g|png)(?:$|\?)/i.test(`${url.pathname}${url.search}`);
      return url.protocol === "https:" && allowedHost && supportedPath ? url.href : null;
    } catch {
      return null;
    }
  }

  function normalizedRichContent(value, maxLength = 6000) {
    const source = safeString(value, maxLength) || "";
    const images = [];
    const imagePattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;
    for (const match of source.matchAll(imagePattern)) {
      const tag = match[0];
      const url = safeTestImageUrl(match[1] || match[2] || match[3]);
      if (!url || images.some((image) => image.url === url) || images.length >= 4) continue;
      const titleMatch = tag.match(/\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      images.push({
        url,
        title: decodeHtmlEntities(
          titleMatch?.[1] || titleMatch?.[2] || altMatch?.[1] || altMatch?.[2],
          300,
        ),
      });
    }
    const withoutTags = source
      .replace(imagePattern, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " ");
    return { text: decodeHtmlEntities(withoutTags, maxLength), images };
  }

  function lessonObjective(body) {
    if (!Array.isArray(body?.data)) return null;
    const item = body.data.find((entry) => entry?.contentType === "intro");
    if (!item || !validPositiveInteger(item.lp_item_id) || !validPositiveInteger(item.lp_id)) return null;
    return {
      lp_item_id: Number(item.lp_item_id),
      lp_id: Number(item.lp_id),
      percentage: Number.isFinite(Number(item.percentage)) ? Number(item.percentage) : 0,
      title: safeString(item.title, 120),
    };
  }

  function safePdfUrl(value) {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value);
      const cloudFrontHost = /(?:^|\.)cloudfront\.net$/i.test(url.hostname);
      return url.protocol === "https:" && cloudFrontHost && /\.pdf$/i.test(url.pathname)
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  function lessonMaterial(body) {
    if (!Array.isArray(body?.data)) return null;
    const lesson = body.data.find((item) => item?.contentType === "lesson");
    if (!lesson) return null;
    return {
      title: safeString(lesson.title, 300),
      lessonNumber: Number.isFinite(Number(lesson.lessonNumber))
        ? Number(lesson.lessonNumber)
        : null,
      url: safePdfUrl(lesson.peg_BookUrl) || safePdfUrl(lesson.bookUrl),
    };
  }

  function lessonPlayback(body) {
    if (!Array.isArray(body?.data)) {
      return { items: [], complete: false };
    }

    const lesson = body.data.find((item) => item?.contentType === "lesson");
    const expectedVideoCount = Number(lesson?.paragTotNumber);
    const items = body.data
      .filter((item) => item?.contentType === "intro" || item?.contentType === "video")
      .map((item) => ({
        contentType: item.contentType,
        lp_item_id: validPositiveInteger(item.lp_item_id)
          ? Number(item.lp_item_id)
          : null,
        lp_id: validPositiveInteger(item.lp_id)
          ? Number(item.lp_id)
          : null,
        previous_item_id: Number.isFinite(Number(item.previous_item_id))
          ? Number(item.previous_item_id)
          : null,
        next_item_id: Number.isFinite(Number(item.next_item_id))
          ? Number(item.next_item_id)
          : null,
        percentage: Number.isFinite(Number(item.percentage))
          ? Number(item.percentage)
          : 0,
        paragNumber: Number.isFinite(Number(item.paragNumber))
          ? Number(item.paragNumber)
          : null,
        title: safeString(item.title, 300),
      }));
    const videoCount = items.filter((item) => item.contentType === "video").length;
    const hasIntro = items.some((item) => item.contentType === "intro");
    const expectedCountKnown = Number.isInteger(expectedVideoCount) && expectedVideoCount >= 0;

    return {
      items,
      complete:
        hasIntro &&
        (expectedCountKnown ? videoCount >= expectedVideoCount : videoCount > 0),
    };
  }

  function lessonProgress(body) {
    if (!Array.isArray(body?.data)) return { items: [], complete: false };
    const lesson = body.data.find((item) => item?.contentType === "lesson");
    const expectedVideoCount = Number(lesson?.paragTotNumber);
    const items = body.data
      .filter((item) => ["intro", "video", "test"].includes(item?.contentType))
      .map((item) => ({
        contentType: item.contentType,
        lp_item_id: validPositiveInteger(item.lp_item_id) ? Number(item.lp_item_id) : null,
        lp_id: validPositiveInteger(item.lp_id) ? Number(item.lp_id) : null,
        percentage: Number.isFinite(Number(item.percentage))
          ? Math.max(0, Math.min(100, Number(item.percentage)))
          : 0,
        paragNumber: Number.isFinite(Number(item.paragNumber))
          ? Number(item.paragNumber)
          : null,
        title: safeString(item.title, 300),
      }));
    const videoCount = items.filter((item) => item.contentType === "video").length;
    const expectedCountKnown = Number.isInteger(expectedVideoCount) && expectedVideoCount >= 0;
    return {
      items,
      complete: Boolean(lesson) && (expectedCountKnown ? videoCount >= expectedVideoCount : videoCount > 0),
    };
  }

  function normalizedLessonData(body) {
    const playback = lessonPlayback(body);
    const progress = lessonProgress(body);
    return {
      dataAvailable: Array.isArray(body?.data) && body.data.length > 0,
      objective: lessonObjective(body),
      test: terminalTest(body),
      material: lessonMaterial(body),
      playbackItems: playback.items,
      playbackDataComplete: playback.complete,
      progressItems: progress.items,
      progressDataComplete: progress.complete,
    };
  }

  function publishPageLessonSnapshot(body, route) {
    if (!route) return;
    const outlineEntry = courseOutlines.get(route.courseCode)?.find(
      (entry) => entry.lpId === route.lpId && entry.id === route.paragraphId,
    );
    const snapshot = {
      type: PAGE_LESSON_SNAPSHOT,
      courseCode: route.courseCode,
      displayOrder: outlineEntry?.displayOrder || null,
      lpId: route.lpId,
      paragraphId: route.paragraphId,
      data: normalizedLessonData(body),
    };
    const key = `${route.courseCode}:${route.lpId}:${route.paragraphId}`;
    pageLessonSnapshots.set(key, snapshot);
    if (pageLessonSnapshots.size > 50) {
      pageLessonSnapshots.delete(pageLessonSnapshots.keys().next().value);
    }
    window.postMessage(snapshot, "*");
  }

  async function parseApiResponse(response) {
    let body = null;
    try {
      body = await response.json();
    } catch {
      // The caller receives a sanitized invalid-response error below.
    }
    if (!response.ok || Number(body?.code) !== 200) {
      throw new Error(`API_${response.status || "INVALID_RESPONSE"}`);
    }
    return body;
  }

  async function executeTurboApiRequest(message) {
    const courseCode = message.courseCode;
    if (!validCourseCode(courseCode)) throw new Error("INVALID_COURSE_CODE");

    if (message.action === "outline") {
      const cached = courseOutlines.get(courseCode);
      if (cached?.length) {
        return { entries: cached, source: "page-cache" };
      }
    }

    if (message.action === "invalidate-outline") {
      courseOutlines.delete(courseCode);
      return { invalidated: true };
    }

    if (!bearerToken) throw new Error("AUTH_UNAVAILABLE");

    let url;
    let options;
    if (message.action === "outline") {
      url = `${API_ORIGIN}/student/course/${encodeURIComponent(courseCode)}/video-lessons/0`;
      options = { method: "GET" };
    } else if (message.action === "lesson") {
      if (!validPositiveInteger(message.lessonNumber)) throw new Error("INVALID_LESSON_NUMBER");
      const lessonNumber = Number(message.lessonNumber);
      const lpId = validPositiveInteger(message.lpId)
        ? Number(message.lpId)
        : lessonNumber;
      const paragraphId = validPositiveInteger(message.paragraphId)
        ? Number(message.paragraphId)
        : lpId;
      url = `${API_ORIGIN}/student/course/${encodeURIComponent(courseCode)}/video-lesson/${lpId}/paragraphs/${paragraphId}`;
      options = { method: "GET" };
    } else if (message.action === "complete") {
      if (!validPositiveInteger(message.lpItemId) || !validPositiveInteger(message.lpId)) {
        throw new Error("INVALID_TEST_IDENTIFIERS");
      }
      url = `${API_ORIGIN}/student/video-lessons/completeTestIntro`;
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_code: courseCode,
          lp_item_id: Number(message.lpItemId),
          lp_id: Number(message.lpId),
        }),
      };
    } else if (message.action === "test-source") {
      if (!validPositiveInteger(message.testId) || !validPositiveInteger(message.lpId)) {
        throw new Error("INVALID_TEST_SOURCE_IDENTIFIERS");
      }
      url = `${API_ORIGIN}/student/course/${encodeURIComponent(courseCode)}/video-lessons/test/source`;
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_code: courseCode,
          testId: Number(message.testId),
          lp_id: Number(message.lpId),
          testImported: Number(message.testImported) === 1 ? 1 : 0,
        }),
      };
    } else {
      throw new Error("INVALID_ACTION");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    turboControllers.set(message.requestId, controller);
    try {
      const response = await originalFetch.call(window, url, {
        ...options,
        credentials: "include",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          Authorization: bearerToken,
          ...(options.headers || {}),
        },
      });
      const body = await parseApiResponse(response);
      if (message.action === "outline") {
        const entries = rememberCourseOutline(courseCode, body);
        if (!entries?.length) throw new Error("COURSE_OUTLINE_INCOMPLETE");
        return { entries, source: "explicit-request" };
      }
      if (message.action === "lesson") {
        return normalizedLessonData(body);
      }
      if (message.action === "test-source") {
        return normalizedTestSource(body);
      }
      return { completed: true };
    } finally {
      clearTimeout(timeout);
      turboControllers.delete(message.requestId);
    }
  }

  function publishTurboApiResult(requestId, result) {
    window.postMessage({ type: TURBO_API_RESPONSE, requestId, ...result }, "*");
  }

  function safeString(value, maxLength = 300) {
    return typeof value === "string" ? value.slice(0, maxLength) : null;
  }

  function safeNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function safeRejectMotivation(value) {
    const motivation = value && typeof value === "object"
      ? value.motivation
      : value;
    return safeString(motivation, 800);
  }

  function normalizeExam(exam) {
    if (!exam || typeof exam !== "object") return null;
    const examId = safeNumber(exam.exam_id);
    if (examId === null) return null;
    return {
      exam_id: examId,
      course_code: safeString(exam.course_code, 80),
      title_exam: safeString(exam.title_exam),
      title_module: safeString(exam.title_module),
      date_exam: safeString(exam.date_exam, 80),
      vote: safeNumber(exam.vote),
      status: safeNumber(exam.status),
      commission: safeString(exam.commission),
      reject_motivation: safeRejectMotivation(exam.reject_motivation),
      result: safeString(exam.result, 120),
    };
  }

  function publishBody(body, requestId = null) {
    if (!Array.isArray(body?.data)) return;
    const exams = body.data.slice(0, 200).map(normalizeExam).filter(Boolean);
    lastPayload = { exams, capturedAt: Date.now() };
    const resolvedRequestId = requestId || activeCommissionRequest?.id || pendingCommissionRequest?.id || null;
    if (!requestId && commissionController) commissionController.abort();
    pendingCommissionRequest = null;
    window.postMessage({
      type: RESPONSE_MESSAGE,
      payload: { ...lastPayload, requestId: resolvedRequestId },
    }, "*");
  }

  function publishCommissionError(error, requestId = null) {
    window.postMessage({
      type: RESPONSE_MESSAGE,
      payload: {
        error: typeof error === "string" ? error.slice(0, 120) : "REQUEST_FAILED",
        requestId: requestId || activeCommissionRequest?.id || pendingCommissionRequest?.id || null,
      },
    }, "*");
  }

  function commissionPayloadIsFresh() {
    return Boolean(lastPayload && Date.now() - Number(lastPayload.capturedAt) < COMMISSION_CACHE_MS);
  }

  function requestCommissionExams(requestId, expiresAt) {
    if (commissionPayloadIsFresh()) {
      debugLog("[PlumePilot Commissione] Risposta recente riutilizzata dalla memoria della pagina.");
      window.postMessage({
        type: RESPONSE_MESSAGE,
        payload: { ...lastPayload, requestId },
      }, "*");
      return;
    }
    pendingCommissionRequest = {
      id: typeof requestId === "string" ? requestId : null,
      expiresAt: Number.isFinite(Number(expiresAt)) ? Number(expiresAt) : Date.now() + 45000,
    };
    if (!bearerToken) {
      debugLog("[PlumePilot Commissione] Controllo in attesa dell’autenticazione già usata dalla pagina.");
    }
    flushPendingCommissionRequest();
  }

  function flushPendingCommissionRequest() {
    if (!pendingCommissionRequest || activeCommissionRequest) return;
    if (commissionPayloadIsFresh()) {
      const request = pendingCommissionRequest;
      pendingCommissionRequest = null;
      window.postMessage({
        type: RESPONSE_MESSAGE,
        payload: { ...lastPayload, requestId: request.id },
      }, "*");
      return;
    }
    if (!bearerToken) return;
    if (pendingCommissionRequest.expiresAt <= Date.now()) {
      pendingCommissionRequest = null;
      return;
    }
    if (typeof originalFetch !== "function") {
      publishCommissionError("FETCH_UNAVAILABLE", pendingCommissionRequest.id);
      pendingCommissionRequest = null;
      return;
    }

    activeCommissionRequest = pendingCommissionRequest;
    pendingCommissionRequest = null;
    commissionController = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      commissionController?.abort();
    }, API_TIMEOUT_MS);
    const request = activeCommissionRequest;
    debugLog("[PlumePilot Commissione] Avvio del controllo automatico degli esami online.");

    originalFetch.call(window, `${API_ORIGIN}${TARGET_PATH}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: bearerToken,
      },
      credentials: "include",
      signal: commissionController.signal,
    })
      .then(parseApiResponse)
      .then((body) => publishBody(body, request.id))
      .catch((error) => {
        if (error?.name === "AbortError" && !timedOut) return;
        if (error?.message === "API_401" || error?.message === "API_403") bearerToken = null;
        publishCommissionError(timedOut ? "REQUEST_TIMEOUT" : error?.message || "REQUEST_FAILED", request.id);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (activeCommissionRequest === request) activeCommissionRequest = null;
        commissionController = null;
        flushPendingCommissionRequest();
      });
  }

  function cancelCommissionRequest() {
    pendingCommissionRequest = null;
    activeCommissionRequest = null;
    commissionController?.abort();
    commissionController = null;
  }

  function clearCommissionMemory() {
    cancelCommissionRequest();
    lastPayload = null;
    debugLog("[PlumePilot Commissione] Cache temporanea degli esami eliminata.");
  }

  async function captureFetchResponse(response, requestUrl) {
    if (!response?.ok) return;
    const responseUrl = response.url || requestUrl;
    const outlineCourseCode = courseOutlineCode(responseUrl);
    const lessonRoute = detailedLessonRoute(responseUrl);
    if (!isTargetUrl(responseUrl) && !outlineCourseCode && !lessonRoute) return;
    try {
      const body = await response.clone().json();
      if (outlineCourseCode) {
        rememberCourseOutline(outlineCourseCode, body);
      } else if (lessonRoute) {
        publishPageLessonSnapshot(body, lessonRoute);
      } else {
        publishBody(body);
      }
    } catch (error) {
      console.warn("[PlumePilot] Impossibile leggere una risposta API della pagina.", error);
    }
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function studyWingFetch(input, init) {
      const requestUrl = typeof input === "string" || input instanceof URL ? input : input?.url;
      const commissionRequest = isTargetUrl(requestUrl);
      const lessonRequest = detailedLessonRoute(requestUrl);
      rememberAuthorization(init?.headers || input?.headers, requestUrl, !commissionRequest);
      const promise = originalFetch.call(this, input, init);
      if (commissionRequest || courseOutlineCode(requestUrl) || lessonRequest) {
        promise.then((response) => captureFetchResponse(response, requestUrl)).catch(() => {});
      }
      return promise;
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function studyWingOpen(method, url, ...rest) {
    this.__studyWingRequestUrl = url;
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.setRequestHeader = function studyWingSetRequestHeader(name, value) {
    if (String(name).toLowerCase() === "authorization") {
      rememberAuthorization(
        { authorization: value },
        this.__studyWingRequestUrl,
        !isTargetUrl(this.__studyWingRequestUrl),
      );
    }
    return originalSetRequestHeader.call(this, name, value);
  };
  XMLHttpRequest.prototype.send = function studyWingSend(...args) {
    const outlineCourseCode = courseOutlineCode(this.__studyWingRequestUrl);
    const lessonRoute = detailedLessonRoute(this.__studyWingRequestUrl);
    if (isTargetUrl(this.__studyWingRequestUrl) || outlineCourseCode || lessonRoute) {
      this.addEventListener("loadend", () => {
        if (this.status < 200 || this.status >= 300) return;
        try {
          const body = this.responseType === "json"
            ? this.response
            : JSON.parse(this.responseText);
          if (outlineCourseCode) rememberCourseOutline(outlineCourseCode, body);
          else if (lessonRoute) publishPageLessonSnapshot(body, lessonRoute);
          else publishBody(body);
        } catch (error) {
          console.warn("[PlumePilot] Impossibile leggere una risposta API XHR della pagina.", error);
        }
      }, { once: true });
    }
    return originalSend.apply(this, args);
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === PAGE_LESSON_SNAPSHOT_REQUEST) {
      const requestedCourseCode = validCourseCode(event.data.courseCode)
        ? event.data.courseCode
        : null;
      for (const snapshot of pageLessonSnapshots.values()) {
        if (!requestedCourseCode || snapshot.courseCode === requestedCourseCode) {
          const outlineEntry = courseOutlines.get(snapshot.courseCode)?.find(
            (entry) => entry.lpId === snapshot.lpId && entry.id === snapshot.paragraphId,
          );
          window.postMessage({
            ...snapshot,
            displayOrder: outlineEntry?.displayOrder || snapshot.displayOrder || null,
          }, "*");
        }
      }
      return;
    }
    if (event.data.type === REQUEST_MESSAGE) {
      requestCommissionExams(event.data.requestId, event.data.expiresAt);
      return;
    }
    if (event.data.type === CANCEL_MESSAGE) {
      cancelCommissionRequest();
      return;
    }
    if (event.data.type === CLEAR_MESSAGE) {
      clearCommissionMemory();
      return;
    }
    if (event.data.type === TURBO_API_CANCEL) {
      for (const controller of turboControllers.values()) controller.abort();
      turboControllers.clear();
      return;
    }
    if (event.data.type !== TURBO_API_REQUEST || typeof event.data.requestId !== "string") return;
    executeTurboApiRequest(event.data)
      .then((data) => publishTurboApiResult(event.data.requestId, { ok: true, data }))
      .catch((error) => publishTurboApiResult(event.data.requestId, {
        ok: false,
        error: error?.name === "AbortError" ? "REQUEST_ABORTED" : error?.message || "REQUEST_FAILED",
      }));
  });
})();
