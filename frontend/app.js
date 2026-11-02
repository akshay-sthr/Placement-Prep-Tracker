document.getElementById("currentYear").textContent = new Date().getFullYear();

const TOPICS = [
  "Arrays", "Strings", "Hashing", "Linked List", "Stack and Queue", "Recursion and Backtracking",
  "Sorting and Searching", "Trees", "Graphs", "Heap", "Greedy", "Dynamic Programming",
  "Bit Manipulation", "Math", "Other",
];
const VIEWS = ["dashboard", "problems", "review", "mocks", "readiness", "assistant", "profile", "admin"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const $ = (sel, root = document) => root.querySelector(sel); const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

window.addEventListener("beforeunload", (e) => {
  const pd = document.getElementById("problemDialog");
  const md = document.getElementById("mockDialog");
  if ((pd && pd.open) || (md && md.open)) {
    e.preventDefault();
    e.returnValue = "";
  }
});

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));
const safeUrl = (u) =>
  (/^https?:\/\//i.test(u || "") ? u : "");

const state = { stats: null, problems: [], due: [], mocks: [], view: "dashboard", dbDown: false };
const charts = {};

let token = localStorage.getItem("token");
let currentUser = null;
let guest = false;
const GUEST_VIEWS = ["dashboard", "problems", "review", "mocks"];

function setToken(t) {
  token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

//  Dates (plain YYYY-MM-DD strings, in the user's own timezone) 
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const fmtDate = (s) => new Date(s + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

//  API 
async function api(path, opts = {}) {
  const url = `/api${path}${path.includes("?") ? "&" : "?"}today=${todayStr()}`;
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();

  } catch { /* empty body */

  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function setBanner(text) {
  const el = $("#banner");
  el.hidden = !text;
  el.textContent = text || "";
}

let toastTimer;
function toast(text, isError = false) {
  const el = $("#toast");
  el.textContent = text;
  el.className = "toast" + (isError ? " error" : "");
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3000);
}

function handleError(err) {
  if (err.status === 503 || err instanceof TypeError) {
    state.dbDown = true;
    setBanner(err.status === 503 ? err.message : "Can't reach the server. Check that npm start is still running in your terminal.");
  } else {
    toast(err.message, true);
  }
}

//  Loading 
function problemsPath() {
  const p = new URLSearchParams();
  const q = $("#fQ").value.trim();
  if (q) p.set("q", q);
  if ($("#fTopic").value) p.set("topic", $("#fTopic").value);
  if ($("#fDiff").value) p.set("difficulty", $("#fDiff").value);
  if ($("#fStatus").value) p.set("status", $("#fStatus").value);
  const qs = p.toString();
  return "/problems" + (qs ? "?" + qs : "");
}

async function loadAll() {
  if (guest) { Object.assign(state, guestData()); setBanner(null); renderAll(); return; }

  try {
    const [stats, problems, due, mocks] = await Promise.all([
      api("/stats"), api(problemsPath()), api("/reviews/due"), api("/mocks"),
    ]);
    Object.assign(state, { stats, problems, due, mocks, dbDown: false });
    setBanner(null);
    renderAll();
  } catch (err) {
    handleError(err);
  }
}

async function loadProblems() {
  if (guest) return;
  try {
    state.problems = await api(problemsPath());
    renderProblems();
  } catch (err) {
    handleError(err);
  }
}

setInterval(() => { if (state.dbDown) loadAll(); }, 5000);

//  Rendering 
function dueText(p) {
  if (p.nextReview == null) return '<span class="muted">Fully reviewed</span>';
  const diff = daysBetween(state.stats ? state.stats.today : todayStr(), p.nextReview);
  if (diff < 0) return `<span class="overdue">Overdue by ${-diff} day${-diff === 1 ? "" : "s"}</span>`;
  if (diff === 0) return '<span class="due-now">Due today</span>';
  return `In ${diff} day${diff === 1 ? "" : "s"}`;
}

function titleHtml(p) {
  const url = safeUrl(p.url);
  return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title);
}

const diffPill = (d) => `<span class="pill ${esc(String(d).toLowerCase())}">${esc(d)}</span>`;
const resultText = (s) => (s === "stuck" ? '<span class="pill help">Needed help</span>' : "Solved");

function problemRow(p, withActions) {
  return `<tr>
        <td><div class="ptitle">${titleHtml(p)}</div>${p.notes ? `<div class="pnotes">${esc(p.notes)}</div>` : ""}</td>
        <td>${esc(p.topic)}</td>
        <td>${diffPill(p.difficulty)}</td>
        <td>${resultText(p.status)}</td>
        <td class="nowrap">${fmtDate(p.solvedDate)}</td>
        ${withActions ? `<td>${dueText(p)}</td>
        <td class="actions"><button class="link" data-edit="${p._id}">Edit</button><button class="link danger" data-del="${p._id}">Delete</button></td>` : ""}
      </tr>`;
}

function renderAll() {
  renderDashboard();
  renderProblems();
  renderReview();
  renderMocks();
  if (state.view === "dashboard") renderCharts();
  if (state.view === "mocks") renderMockChart();
}

function renderHeatmap(days, today) {
  if (!days || !days.length) return;
  const level = (n) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
  const first = new Date(days[0].date + "T00:00:00Z").getUTCDay();
  let cells = "";
  for (let i = 0; i < first; i++) cells += '<span class="cell empty"></span>';
  for (const d of days) {
    const label = `${d.count} problem${d.count === 1 ? "" : "s"} on ${fmtDate(d.date)}`;
    cells += `<span class="cell l${level(d.count)}${d.date === today ? " today" : ""}" title="${label}"></span>`;
  }
  $("#heat").innerHTML = cells;

  const cols = Math.ceil((first + days.length) / 7);
  const monthAt = (c) => Number(days[Math.min(days.length - 1, Math.max(0, c * 7 - first))].date.slice(5, 7)) - 1;
  let labels = "";
  for (let c = 0; c < cols; c++) {
    const startsMonth = c === 0 || monthAt(c) !== monthAt(c - 1);
    const roomToRight = c + 1 >= cols || monthAt(c + 1) === monthAt(c);
    labels += `<span>${startsMonth && roomToRight ? MONTHS[monthAt(c)] : ""}</span>`;
  }
  $("#heatMonths").innerHTML = labels;

  const wrap = $("#heatWrap");
  wrap.scrollLeft = wrap.scrollWidth;
}

function renderDashboard() {
  const s = state.stats;
  if (!s) return;
  $("#streakNum").textContent = s.streak.current;
  $("#longest").textContent = s.streak.longest;

  $("#dueNote").innerHTML = s.dueCount > 0
    ? `<span><strong>${s.dueCount}</strong> problem${s.dueCount === 1 ? " is" : "s are"} due for review</span><button class="btn primary" data-goto="review">Start review</button>`
    : `<span class="muted">No reviews due today.</span>`;

  const badge = $("#dueBadge");
  badge.hidden = s.dueCount === 0;
  badge.textContent = s.dueCount;

  $("#firstRun").hidden = s.total > 0;
  $("#strip").hidden = s.total === 0 && s.mockCount === 0;
  $("#charts").hidden = s.total === 0;

  $("#sTotal").textContent = s.total;
  $("#sWeek").textContent = s.last7;
  $("#sMastered").textContent = s.mastered;
  $("#sMock").textContent = s.avgMock == null ? "-" : `${s.avgMock}/5`;

  renderHeatmap(s.days, s.today);

  const done = new Set((s.byTopic || []).map((t) => t.topic));
  const untouched = TOPICS.filter((t) => t !== "Other" && !done.has(t));
  $("#untouched").innerHTML = untouched.length
    ? `<p class="muted small" style="margin-top:14px">Topics you haven't practiced yet</p><div class="chips">${untouched.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`
    : `<p class="muted small" style="margin-top:14px">You've practiced every topic at least once.</p>`;

  $("#recentBody").innerHTML = (s.recent && s.recent.length)
    ? s.recent.map((p) => problemRow(p, false)).join("")
    : `<tr><td class="empty">Problems you log will show up here.</td></tr>`;
}

function renderCharts() {
  const s = state.stats;
  if (!s || typeof Chart === "undefined" || s.total === 0) return;
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();

  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = v("--muted");
  Object.values(charts).forEach((c) => c && c.destroy());

  const rows = s.byTopic.length;
  $("#topicBox").style.height = `${Math.max(140, rows * 32 + 30)}px`;
  charts.topic = new Chart($("#topicChart"), {
    type: "bar",
    data: {
      labels: s.byTopic.map((t) => t.topic),
      datasets: [{ data: s.byTopic.map((t) => t.count), backgroundColor: v("--accent"), borderRadius: 4, barThickness: 16 }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: v("--line") } },
        y: { grid: { display: false } },
      },
    },
  });

  charts.diff = new Chart($("#diffChart"), {
    type: "doughnut",   //a circular statistical graphic that looks like a pie chart with a hollow center

    data: {
      labels: ["Easy", "Medium", "Hard"],
      datasets: [{
        data: [s.byDifficulty.Easy || 0, s.byDifficulty.Medium || 0, s.byDifficulty.Hard || 0],
        backgroundColor: [v("--easy"), v("--med-fill"), v("--hard")],
        borderColor: v("--surface"),
        borderWidth: 3,
      }],
    },
    options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } },
  });
}

function renderProblems() {
  const list = state.problems || [];
  $("#problemBody").innerHTML = list.map((p) => problemRow(p, true)).join("");
  const empty = $("#problemEmpty");
  const filtered = $("#fQ").value || $("#fTopic").value || $("#fDiff").value || $("#fStatus").value;
  empty.hidden = list.length > 0;
  empty.textContent = filtered ? "No problems match these filters." : "No problems yet. Use Log a problem to add your first one.";
}

function renderReview() {
  const due = state.due || [];
  const steps = state.stats ? state.stats.reviewSteps : 6;
  $("#reviewSub").textContent = due.length
    ? "Try to recall the approach before opening the problem, then say how it went."
    : "";
  if (!due.length) {
    $("#reviewList").innerHTML = `<div class="panel"><p class="empty">Nothing is due today. Each problem you log is scheduled for review the next day, then after 3, 7, 14, 30, and 60 days.</p></div>`;
    return;
  }
  $("#reviewList").innerHTML = due.map((p) => `
        <article class="review-item">
          <div>
            <div class="ptitle">${titleHtml(p)}</div>
            <div class="review-meta"><span>${esc(p.topic)}</span>${diffPill(p.difficulty)}<span>Review ${p.reviewStage + 1} of ${steps}</span>${dueText(p)}</div>
            ${p.notes ? `<div class="pnotes" style="margin-top:6px">${esc(p.notes)}</div>` : ""}
          </div>
          <div class="review-btns">
            <button class="btn" data-review="${p._id}" data-remembered="0">Need to redo</button>
            <button class="btn primary" data-review="${p._id}" data-remembered="1">I remembered it</button>
          </div>
        </article>`).join("");
}

function renderMocks() {
  const list = $("#mockList");
  if (!state.mocks || !state.mocks.length) {
    list.innerHTML = `<div class="panel"><p class="empty">No mock interviews yet. Log one after your next practice round to track your ratings and what to improve.</p></div>`;
    return;
  }
  list.innerHTML = state.mocks.map((m) => `
        <article class="mock">
          <div class="mock-head">
            <strong>${esc(m.type)}</strong>${m.company ? `<span class="muted">with ${esc(m.company)}</span>` : ""}
            <span class="spacer"></span>
            <span class="rating" aria-label="Rating ${m.rating} out of 5">${m.rating}/5</span>
          </div>
          <div class="muted small">${fmtDate(m.date)}</div>
          ${m.notes ? `<p class="notes">${esc(m.notes)}</p>` : ""}
          <button class="link danger" data-delmock="${m._id}">Delete</button>
        </article>`).join("");
}

function renderMockChart() {
  const panel = $("#mockChartPanel");
  const mocks = [...(state.mocks || [])].sort((a, b) => a.date.localeCompare(b.date));
  panel.hidden = mocks.length < 2;
  if (mocks.length < 2 || typeof Chart === "undefined") return;
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  Chart.defaults.color = v("--muted");
  if (charts.mock) charts.mock.destroy();
  charts.mock = new Chart($("#mockChart"), { type: "line", data: { labels: mocks.map((m) => fmtDate(m.date)), datasets: [{ data: mocks.map((m) => m.rating), borderColor: v("--accent"), backgroundColor: v("--accent"), tension: 0.25, pointRadius: 4 }], }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 }, grid: { color: v("--line") } }, x: { grid: { display: false } } }, }, });
} function showView(name) {
  if (guest && !GUEST_VIEWS.includes(name)) return openLogin("login");
  state.view = name; $$(".view").forEach((el) => (el.hidden = el.id !== `view-${name}`));
  $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.view === name)));

  if (location.hash !== "#" + name) history.pushState(null, "", "#" + name);   //changes the URL to something like 
  //http://localhost:3000/#problems

  if (name === "dashboard") renderCharts();
  if (name === "mocks") renderMockChart();
  if (name === "readiness") loadReadiness();
  if (name === "profile") loadProfile();
  if (name === "admin" && currentUser?.role === "admin") loadAdmin();
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;

  if (t.dataset.view) return showView(t.dataset.view);
  if (t.dataset.goto) return showView(t.dataset.goto);
  if (t.hasAttribute("data-open-problem")) return openProblemDialog();
  if (t.hasAttribute("data-close")) return t.closest("dialog").close();

  if (t.dataset.edit) {
    const all = [...state.problems, ...(state.stats ? state.stats.recent : []), ...state.due];
    const p = all.find((x) => x._id === t.dataset.edit);
    return p && openProblemDialog(p);
  }
  if (t.dataset.del) {
    if (!confirm("Delete this problem? This can't be undone.")) return;
    try { await api(`/problems/${t.dataset.del}`, { method: "DELETE" }); toast("Problem deleted"); loadAll(); }
    catch (err) { handleError(err); }
    return;
  }
  if (t.dataset.review) {
    try {
      await api(`/problems/${t.dataset.review}/review`, { method: "POST", body: { remembered: t.dataset.remembered === "1" } });
      toast("Review saved");
      loadAll();
    } catch (err) { handleError(err); }
    return;
  }
  if (t.dataset.delmock) {
    if (!confirm("Delete this mock interview? This can't be undone.")) return;
    try { await api(`/mocks/${t.dataset.delmock}`, { method: "DELETE" }); toast("Mock interview deleted"); loadAll(); }
    catch (err) { handleError(err); }
  }
});

//  Problem dialog 
const problemDialog = $("#problemDialog");
const problemForm = $("#problemForm");

const PROBLEM_DRAFT_KEY = "problemDraft";

function saveProblemDraft() {
  if (problemForm.elements.pid.value) return;
  const data = Object.fromEntries(new FormData(problemForm));
  delete data.pid;
  localStorage.setItem(PROBLEM_DRAFT_KEY, JSON.stringify(data));
}

function clearProblemDraft() {
  localStorage.removeItem(PROBLEM_DRAFT_KEY);
}

function loadProblemDraft() {
  try {
    const raw = localStorage.getItem(PROBLEM_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

problemForm.addEventListener("input", saveProblemDraft);
problemForm.addEventListener("change", saveProblemDraft);

problemDialog.addEventListener("click", (e) => {
  const rect = problemDialog.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
    e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) problemDialog.close();
});

function openProblemDialog(p) {
  problemForm.reset();
  $("#problemError").textContent = "";
  $("#problemDialogTitle").textContent = p ? "Edit problem" : "Log a problem";
  const f = problemForm.elements;
  f.pid.value = p ? p._id : "";
  f.solvedDate.value = p ? p.solvedDate : todayStr();
  f.solvedDate.max = todayStr();
  if (p) {
    f.title.value = p.title;
    f.url.value = p.url || "";
    f.platform.value = p.platform || "";
    f.topic.value = p.topic;
    f.difficulty.value = p.difficulty;
    f.status.value = p.status;
    f.notes.value = p.notes || "";
  } else {
    const draft = loadProblemDraft();  // for a new problem :- checks whether a previously saved draft exists.
    if (draft) {
      f.title.value = draft.title || "";
      f.url.value = draft.url || "";
      if (draft.platform) f.platform.value = draft.platform;
      if (draft.topic) f.topic.value = draft.topic;
      if (draft.difficulty) f.difficulty.value = draft.difficulty;
      if (draft.status) f.status.value = draft.status;
      f.solvedDate.value = draft.solvedDate || todayStr();
      f.notes.value = draft.notes || "";
    }
  }
  problemDialog.showModal();
  history.pushState({ modal: "problem" }, "");
  f.title.focus();
}

problemDialog.addEventListener("close", () => {
  clearProblemDraft();
  if (history.state && history.state.modal === "problem") {
    history.back();
  }
});

window.addEventListener("popstate", () => {
  if (!token) return routePublic();
  const hash = location.hash.slice(1);
  showView(VIEWS.includes(hash) ? hash : "dashboard");
});


problemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(problemForm));
  const pid = data.pid;
  delete data.pid;
  try {
    if (pid) await api(`/problems/${pid}`, { method: "PUT", body: data });   // p.id exist then    PUT /problems/:id     Update existing problem
    else await api("/problems", { method: "POST", body: data });  // OtherWise   POST /problems     Create a new problem
    problemDialog.close();
    clearProblemDraft();
    toast("Problem saved");
    loadAll();
  } catch (err) {
    $("#problemError").textContent = err.message;
  }
});

//  Mock dialog 
const mockDialog = $("#mockDialog");
const mockForm = $("#mockForm");

mockDialog.addEventListener("click", (e) => {
  const rect = mockDialog.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
    e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) mockDialog.close();
});

$("#addMock").addEventListener("click", () => {
  mockForm.reset();
  $("#mockError").textContent = "";
  mockForm.elements.date.value = todayStr();
  mockDialog.showModal();
});

mockForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/mocks", { method: "POST", body: Object.fromEntries(new FormData(mockForm)) });  // creates a new mock interview.
    mockDialog.close();
    toast("Mock interview saved");
    loadAll();
  } catch (err) {
    $("#mockError").textContent = err.message;
  }
});

//  Misc wiring 
$("#addProblem").addEventListener("click", () => openProblemDialog());

$("#seedBtn").addEventListener("click", async () => {
  try { await api("/seed", { method: "POST" }); toast("Sample data added"); loadAll(); }
  catch (err) { handleError(err); }
});

$("#topicSelect").innerHTML = TOPICS.map((t) => `<option>${esc(t)}</option>`).join("");
$("#fTopic").innerHTML += TOPICS.map((t) => `<option>${esc(t)}</option>`).join("");

let searchTimer;
$("#fQ").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadProblems, 250); });   // This reduces unnecessary API requests.

["#fTopic", "#fDiff", "#fStatus"].forEach((id) => $(id).addEventListener("change", loadProblems));

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.stats && state.view === "dashboard") renderCharts();
  if (state.view === "mocks") renderMockChart();
});

//  Auth and Extras 
function showApp() {
  $("#landing").hidden = true;
  $("#authScreen").hidden = true;
  $(".top").hidden = false;
  document.querySelectorAll(".view").forEach(v => v.hidden = true);
}

function showAuth() {
  $("#landing").hidden = true;
  $("#authScreen").hidden = false;
  $(".top").hidden = true;
  document.querySelectorAll(".view").forEach(v => v.hidden = true);
}
// Auth mode state: "login" | "register" | "forgot"
let authModeState = "login";
let otpVerified = false;

function setAuthMode(mode) {
  authModeState = mode;
  if (mode !== "forgot") otpVerified = false;

  $("#authError").textContent = "";

  const nameWrap = $("#nameWrap");
  const passWrap = $("#passWrap");
  const newPassWrap = $("#newPassWrap");
  const otpWrap = $("#otpWrap");
  const sendOtpBtn = $("#sendOtpBtn");
  const authPass = $("#authPass");
  const authNewPass = $("#authNewPass");
  const authOtp = $("#authOtp");
  const authSubmit = $("#authSubmit");
  const authSubtitle = $("#authSubtitle");
  const authModeBtn = $("#authMode");
  const authForgotBtn = $("#authForgotBtn");

  if (mode === "register") {
    nameWrap.hidden = false;
    passWrap.hidden = false;
    newPassWrap.hidden = true;
    otpWrap.hidden = true;
    sendOtpBtn.hidden = true;
    authPass.required = true;
    authNewPass.required = false;
    authOtp.required = false;
    authSubmit.textContent = "Create account";
    authSubtitle.textContent = "Create your placement preparation account.";
    authModeBtn.textContent = "Already have an account? Login";
    authForgotBtn.hidden = true;
  } else if (mode === "forgot") {
    nameWrap.hidden = true;
    passWrap.hidden = true;
    newPassWrap.hidden = true;
    otpWrap.hidden = false;
    sendOtpBtn.hidden = false;
    authPass.required = false;
    newPassWrap.hidden = true;
    authNewPass.required = false;
    authOtp.required = true;
    authSubmit.textContent = "Verify OTP";
    authSubtitle.textContent = "Enter your email, get an OTP, and set your new password.";
    authModeBtn.textContent = "Back to login";
    authForgotBtn.hidden = true;
  } else {
    // Login
    nameWrap.hidden = true;
    passWrap.hidden = false;
    newPassWrap.hidden = true;
    otpWrap.hidden = true;
    sendOtpBtn.hidden = true;
    authPass.required = true;
    authNewPass.required = false;
    authOtp.required = false;
    authSubmit.textContent = "Login";
    authSubtitle.textContent = "Sign in to continue your placement journey.";
    authModeBtn.textContent = "New User? Create account";
    authForgotBtn.hidden = false;
  }
}

$("#authMode").addEventListener("click", () => {
  if (authModeState === "login") {
    setAuthMode("register");
  } else {
    setAuthMode("login");
  }
});

$("#authForgotBtn").addEventListener("click", () => {
  setAuthMode("forgot");
});

// Handler for the "Send OTP" button
$("#sendOtpBtn").addEventListener("click", async () => {
  const email = $("#authEmail").value.trim();
  if (!email) {
    $("#authError").textContent = "Please enter your email first";
    return;
  }
  $("#authError").textContent = "";
  $("#sendOtpBtn").disabled = true;
  $("#sendOtpBtn").textContent = "Sending...";

  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });// hello akshay 
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Failed to send OTP");
    toast("OTP sent to your email!");
  } catch (err) {
    $("#authError").textContent = err.message;
  } finally {
    $("#sendOtpBtn").disabled = false;
    $("#sendOtpBtn").textContent = "Send OTP";
  }
});

// Form submission handler
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const endpoint = authModeState === "register" ? "register" : "login";
  const data = Object.fromEntries(new FormData(e.target));
  $("#authError").textContent = "";

  try {
    if (authModeState === "forgot") {
      const email = $("#authEmail").value.trim();
      const otp = $("#authOtp").value.trim();

      // Step 1: Verify OTP
      if (!otpVerified) {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp })
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "OTP verification failed");
        }

        // OTP is valid: show the new-password field.
        otpVerified = true;

        $("#otpWrap").hidden = true;
        $("#sendOtpBtn").hidden = true;
        $("#newPassWrap").hidden = false;

        $("#authOtp").required = false;
        $("#authNewPass").required = true;

        $("#authSubmit").textContent = "Reset Password";
        $("#authSubtitle").textContent =
          "OTP verified. Enter your new password.";

        $("#authNewPass").focus();
        return;
      }

      // Step 2: Reset password after entering the new password.
      const newPassword = $("#authNewPass").value;

      if (!newPassword || newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const res = await fetch("/api/auth/reset-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });

      const responseText = await res.text();

      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("Backend returned HTML instead of JSON:", responseText);

        throw new Error(
          `Invalid server response. HTTP status: ${res.status}. Check your backend route.`
        );
      }

      if (!res.ok) {
        throw new Error(result.error || "Password reset failed");
      }

      toast("Password reset successful! Please log in.");
      setAuthMode("login");
      return;
    }

    const r = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Authentication failed");
    setToken(j.token);
    currentUser = j.user;
    startAuthenticated();
  } catch (err) {
    $("#authError").textContent = err.message;
  }
});

$("#logoutBtn").addEventListener("click", () => {
  setToken(null);
  location.reload();
});

function updateAuthUI() {
  $("#profileIcon").textContent = (currentUser?.name || "?").trim().charAt(0).toUpperCase();
  $("#authUser").textContent = currentUser ? `${currentUser.name} · ${currentUser.role}` : "";
  const adminTab = $("#adminTab");
  if (adminTab) {
    adminTab.hidden = currentUser?.role !== "admin";
  }
}

async function loadProfile() {
  try {
    const r = await api("/profile");
    currentUser = r.user;
    updateAuthUI();
    const f = $("#profileForm").elements;
    f.name.value = currentUser.name || "";
    f.college.value = currentUser.college || "";
    f.graduationYear.value = currentUser.graduationYear || "";
    f.targetRole.value = currentUser.targetRole || "";
    f.skills.value = (currentUser.skills || []).join(", ");
    f.bio.value = currentUser.bio || "";
    renderProfileCard();
    setProfileMode(profileIsFilled(currentUser) ? "card" : "edit");
  } catch (err) {
    handleError(err);
  }
}

$("#profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  d.skills = d.skills.split(",").map(x => x.trim()).filter(Boolean);
  try {
    const r = await api("/profile", { method: "PUT", body: d });
    currentUser = r.user;
    updateAuthUI();
    toast("Profile updated");
    renderProfileCard();
    setProfileMode("card");
  } catch (err) {
    handleError(err);
  }
});

async function loadReadiness() {
  try {
    const r = await api("/readiness");
    $("#readinessCards").innerHTML = Object.entries({ Overall: r.overall, ...r.components }).map(([k, v]) =>
      `<div class="metric-card"><div class="muted small">${esc(k)}</div><div class="metric-big">${v}%</div><div class="progress"><span style="width:${Math.min(100, v)}%"></span></div></div>`
    ).join("");
    $("#weakTopics").innerHTML = r.weakTopics.length
      ? r.weakTopics.map(x => `<span class="pill">${esc(x.topic)} · ${x.stuck} stuck</span>`).join("")
      : "No weak topics detected yet. Keep logging problems.";
  } catch (err) {
    handleError(err);
  }
}

$("#askAI").addEventListener("click", async () => {
  const message = $("#aiMessage").value.trim();
  if (!message) return;
  $("#askAI").disabled = true;
  try {
    const r = await api("/ai/assistant", { method: "POST", body: { message } });
    $("#aiAnswer").hidden = false;
    $("#aiAnswer").textContent = r.reply;
  } catch (err) {
    handleError(err);
  } finally {
    $("#askAI").disabled = false;
  }
});

$("#generatePlan").addEventListener("click", async () => {
  try {
    const r = await api("/ai/study-plan", { method: "POST", body: { days: 14 } });
    $("#studyPlan").innerHTML = r.plan.map(x =>
      `<div class="panel" style="margin-top:8px"><b>Day ${x.day}: ${esc(x.focus)}</b><div class="muted">${x.tasks.map(esc).join(" · ")}</div></div>`
    ).join("");
  } catch (err) {
    handleError(err);
  }
});

async function loadAdmin() {
  try {
    const r = await api("/admin/overview");
    $("#adminMetrics").innerHTML = [["Students", r.students], ["Problems", r.problems], ["Mock interviews", r.mocks]].map(x =>
      `<div class="metric-card"><div class="muted small">${x[0]}</div><div class="metric-big">${x[1]}</div></div>`
    ).join("");
    $("#adminStudents").innerHTML = r.recentUsers.map(u =>
      `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${esc(u.name)}</b><div class="muted small">${esc(u.email)} · ${esc(u.college || "College not set")} · ${esc(u.targetRole || "Role not set")}</div></div>`
    ).join("") || "No students yet.";
  } catch (err) {
    handleError(err);
  }
}

// Theme
const savedTheme = localStorage.getItem("placementTheme") || "light";
document.documentElement.dataset.theme = savedTheme;
$("#themeToggle").textContent = savedTheme === "dark" ? "☀️" : "🌙";
$("#themeToggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("placementTheme", next);
  $("#themeToggle").textContent = next === "dark" ? "☀️" : "🌙";
  if (state.stats) {
    renderCharts();
    renderMockChart();
  }
});

async function startAuthenticated() {
  leaveGuest();
  showApp();
  updateAuthUI();
  setAuthMode(false);
  const initial = location.hash.slice(1);
  showView(VIEWS.includes(initial) ? initial : "dashboard");
  await loadProfile();
  await loadAll();
  if (loadProblemDraft()) openProblemDialog();
}

async function bootstrapAuth() {
  if (!token) {
    routePublic();
    return;
  }
  try {
    const r = await api("/auth/me");
    currentUser = r.user;
    startAuthenticated();
  } catch (e) {
    setToken(null);
    routePublic();
  }
}
//  Landing page 
//  Landing page + public routes (#home, #login, #signup) 
function showLanding() {
  $("#landing").hidden = false;
  $("#authScreen").hidden = true;
  $(".top").hidden = true;
  document.querySelectorAll(".view").forEach(v => v.hidden = true);
}

// Shows the right public page for the current URL hash
function routePublic() {
  const h = location.hash.slice(1);
  if (VIEWS.includes(h)) return enterGuest(h);   // logged-out visitors browse as guests
  leaveGuest();
  const page = h === "login" || h === "signup" ? h : "home";
  if (page === "login") { showAuth(); setAuthMode("login"); }
  else if (page === "signup") { showAuth(); setAuthMode("register"); }
  else showLanding();
  if (h !== page) history.replaceState(null, "", "#" + page);
}

function goPublic(page) {
  history.pushState(null, "", "#" + page);
  routePublic();
}

$("#landingLogin").addEventListener("click", () => goPublic("login"));
$("#landingSignup").addEventListener("click", () => goPublic("signup"));
$("#landingStart").addEventListener("click", () => goPublic("signup"));
$("#authBack").addEventListener("click", () => goPublic("home"));

//  Initialize 
const initialHash = location.hash.slice(1);
if (token) showView(VIEWS.includes(initialHash) ? initialHash : "dashboard");
bootstrapAuth();

//  Guest mode 
// A guest sees an empty tracker. Anything that needs an account opens the login popup.
function guestData() {
  const days = [];
  for (let i = 237; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      count: 0,
    });
  }
  return {
    stats: {
      today: todayStr(), total: 0, stuck: 0, mastered: 0, dueCount: 0, last7: 0,
      byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byTopic: [],
      streak: { current: 0, longest: 0 }, days, mockCount: 0, avgMock: null,
      recent: [], reviewSteps: 6,
    },
    problems: [], due: [], mocks: [], dbDown: false,
  };
}

function enterGuest(view) {
  guest = true;
  document.body.classList.add("guest");
  $("#landing").hidden = true;
  $("#authScreen").hidden = true;
  $("#authScreen").classList.remove("overlay");
  $(".top").hidden = false;
  document.querySelectorAll(".view").forEach(v => v.hidden = true);
  showView(GUEST_VIEWS.includes(view) ? view : "dashboard");
  loadAll();
}

function leaveGuest() {
  guest = false;
  document.body.classList.remove("guest");
  $("#authScreen").classList.remove("overlay");
}

function openLogin(mode = "login") {
  $("#authScreen").classList.add("overlay");
  $("#authScreen").hidden = false;
  setAuthMode(mode);
}

function closeLogin() {
  $("#authScreen").hidden = true;
  $("#authScreen").classList.remove("overlay");
  history.replaceState(null, "", "#" + state.view);
}

document.addEventListener("click", (e) => {
  if (!guest) return;
  const blocked = e.target.closest("#addProblem, [data-open-problem], #addMock, #seedBtn, #askAI, #generatePlan");
  if (blocked) {
    e.preventDefault();
    e.stopPropagation();
    openLogin("login");
  }
}, true);

$("#landingGuest").addEventListener("click", () => enterGuest("dashboard"));
$("#guestLogin").addEventListener("click", () => openLogin("login"));
$("#guestSignup").addEventListener("click", () => openLogin("register"));
$("#authClose").addEventListener("click", closeLogin);
$("#authScreen").addEventListener("click", (e) => {
  if (guest && e.target === e.currentTarget) closeLogin();   
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && guest && !$("#authScreen").hidden) closeLogin();
});
//  Mobile menu 
const menuBtn = $("#menuBtn");
const menuDropdown = $("#menuDropdown");

function closeMenu() {
  menuDropdown.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.addEventListener("click", () => {
  const opening = menuDropdown.hidden;
  menuDropdown.hidden = !opening;
  menuBtn.setAttribute("aria-expanded", String(opening));
});

menuDropdown.addEventListener("click", (e) => {
  const item = e.target.closest("[data-menu]");
  if (!item) return;
  closeMenu();
  const action = item.dataset.menu;
  if (action === "log") $("#addProblem").click();        
  else if (action === "logout") $("#logoutBtn").click();
  else if (action === "login") openLogin("login");
  else if (action === "signup") openLogin("register");
});

$("#profileIcon").addEventListener("click", () => showView("profile"));

document.addEventListener("click", (e) => { if (!e.target.closest(".menu-wrap")) closeMenu(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
window.matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);


//  Profile card 
function profileIsFilled(u) {
  return !!(u.college || u.graduationYear || u.targetRole || (u.skills || []).length || u.bio);
}

function profileCompletion(u) {
  const checks = [u.name, u.college, u.graduationYear, u.targetRole, (u.skills || []).length, u.bio];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function setProfileMode(mode) {
  $("#profileCard").hidden = mode !== "card";
  $("#profileEditPanel").hidden = mode !== "edit";
  $("#profileCancel").hidden = !(currentUser && profileIsFilled(currentUser));
}

function renderProfileCard() {
  const u = currentUser;
  if (!u) return;

  $("#pcAvatar").textContent = (u.name || "?").trim().charAt(0).toUpperCase();
  $("#pcName").textContent = u.name || "";
  $("#pcEmail").textContent = u.email || "";
  $("#pcBio").textContent = u.bio || "";
  $("#pcBio").hidden = !u.bio;

  const icon = (paths) =>
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ROLE = '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>';
  const COLLEGE = '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>';
  const YEAR = '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>';

  const rows = [];
  if (u.targetRole) rows.push(icon(ROLE) + `<span>${esc(u.targetRole)}</span>`);
  if (u.college) rows.push(icon(COLLEGE) + `<span>${esc(u.college)}</span>`);
  if (u.graduationYear) rows.push(icon(YEAR) + `<span>Graduating in ${esc(String(u.graduationYear))}</span>`);
  $("#pcList").innerHTML = rows.map((r) => `<li>${r}</li>`).join("");

  $("#pcSkills").innerHTML = (u.skills || []).map((s) => `<span class="pc-skill">${esc(s)}</span>`).join("");

  const pct = profileCompletion(u);
  $("#pcRingFg").style.strokeDashoffset = String(326.73 * (1 - pct / 100));
  $("#pcRingText").textContent = pct + "%";
  $("#pcComplete").hidden = pct === 100;
}

$("#pcEdit").addEventListener("click", () => setProfileMode("edit"));
$("#pcComplete").addEventListener("click", () => setProfileMode("edit"));
$("#profileCancel").addEventListener("click", () => loadProfile());   // reset the form and go back to the card