const STORAGE_KEY = "mwalimu-digital-workspace-v1";
const LEVELS = ["EE", "ME", "AE", "BE"];
const ATTENDANCE_STATUSES = ["Present", "Absent", "Late"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ROUTES = {
    dashboard: "Overview",
    learners: "My learners",
    attendance: "Attendance",
    timetable: "Timetable",
    planning: "CBC planning",
    assessment: "Assessment",
    support: "Learner support",
    reports: "Reports",
    settings: "Class & backup",
};

const freshState = () => ({
    version: 1,
    settings: { teacher: "", school: "", className: "", year: new Date().getFullYear() },
    learners: [],
    attendance: [],
    timetable: [],
    planning: [],
    assessments: [],
    support: [],
});

const content = document.querySelector("#app-content");
const modal = document.querySelector("#app-modal");
const modalForm = document.querySelector("#modal-form");
const modalBody = document.querySelector("#modal-body");
const toastRegion = document.querySelector("#toast-region");
let state;

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return freshState();
        const parsed = JSON.parse(saved);
        const base = freshState();
        for (const key of ["learners", "attendance", "timetable", "planning", "assessments", "support"]) {
            if (Array.isArray(parsed[key])) base[key] = parsed[key];
        }
        if (parsed.settings && typeof parsed.settings === "object") {
            base.settings = { ...base.settings, ...parsed.settings };
        }
        return base;
    } catch (error) {
        console.error("Unable to load the saved workspace.", error);
        notify("Saved data could not be read. It has not been changed.", "error", 7000);
        return freshState();
    }
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        updateHeader();
        return true;
    } catch (error) {
        console.error("Unable to save the workspace.", error);
        notify("Could not save. Your browser storage may be full or unavailable. Export a backup before continuing.", "error", 8000);
        return false;
    }
}

function notify(message, type = "success", duration = 3200) {
    const toast = document.createElement("div");
    toast.className = `toast${type === "error" ? " error" : ""}`;
    toast.textContent = message;
    toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), duration);
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
}

function newId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isoToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function prettyDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? esc(value) : new Intl.DateTimeFormat("en-KE", options).format(date);
}

function updateHeader() {
    const today = new Date();
    document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en-KE", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(today).toUpperCase();
    const className = String(state.settings.className ?? "").trim();
    document.querySelector("#class-chip").textContent = className || "Set up your class";
    document.querySelector(".avatar").textContent = String(state.settings.teacher ?? "").trim()[0]?.toUpperCase() || "M";
}

function route() {
    const key = location.hash.slice(1);
    return Object.hasOwn(ROUTES, key) ? key : "dashboard";
}

function navigate(page) {
    if (!Object.hasOwn(ROUTES, page)) return;
    if (location.hash !== `#${page}`) history.pushState({}, "", `#${page}`);
    render();
    document.querySelector("#sidebar").classList.remove("open");
    content.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function pageHead(title, description, action = "") {
    return `<div class="page-head"><div><h2>${title}</h2><p>${description}</p></div><div class="head-actions">${action}</div></div>`;
}

function button(label, action, style = "button-primary", extra = "") {
    return `<button class="button ${style}" type="button" data-action="${action}" ${extra}>${label}</button>`;
}

function emptyState(icon, title, copy, actionLabel, action) {
    return `<div class="empty-state"><span class="empty-icon">${icon}</span><h3>${title}</h3><p>${copy}</p>${actionLabel ? button(actionLabel, action) : ""}</div>`;
}

function statCard(icon, value, label, tint = "") {
    return `<article class="stat-card"><span class="stat-icon ${tint}">${icon}</span><span><strong class="stat-value">${value}</strong><small class="stat-label">${label}</small></span></article>`;
}

function render() {
    const page = route();
    document.title = `${ROUTES[page]} · Mwalimu Digital`;
    document.querySelector("#page-title").textContent = ROUTES[page];
    document.querySelectorAll("[data-route]").forEach((link) => {
        const active = link.dataset.route === page;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
    updateHeader();
    const views = {
        dashboard: renderDashboard,
        learners: renderLearners,
        attendance: renderAttendance,
        timetable: renderTimetable,
        planning: renderPlanning,
        assessment: renderAssessments,
        support: renderSupport,
        reports: renderReports,
        settings: renderSettings,
    };
    content.innerHTML = views[page]();
}

function renderDashboard() {
    const today = isoToday();
    const records = state.attendance.filter((record) => record.date === today);
    const present = records.filter((record) => record.status === "Present" || record.status === "Late").length;
    const thisWeek = state.planning.filter((plan) => plan.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const levelCounts = Object.fromEntries(LEVELS.map((level) => [level, state.assessments.filter((record) => record.level === level).length]));
    const classLabel = state.settings.className ? esc(state.settings.className) : "your classroom";
    return `
        <section class="welcome"><div class="welcome-copy"><p class="welcome-kicker">PLAN · TEACH · ASSESS · SUPPORT</p>
        <h2>A little more organised.<br>A lot more time to teach.</h2>
        <p>Your classroom workspace for ${classLabel}. Keep your learners, plans and progress together in one private place.</p>
        ${button("Add your first learner <span aria-hidden='true'>→</span>", "add-learner")}</div>
        <div class="welcome-art" aria-hidden="true"><span class="art-disc"></span><span class="art-book art-book-back"></span><span class="art-book"></span><span class="art-pencil"></span></div></section>
        <div class="stat-grid">${statCard("♧", state.learners.length, "Learners in your class", "purple")}${statCard("✓", records.length ? `${present}/${records.length}` : "—", "Attendance marked today", "green")}${statCard("✎", state.planning.length, "Teaching plans", "orange")}${statCard("▤", state.assessments.length, "Assessment records", "blue")}</div>
        <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h3>Pick up where you left off</h3><p>Quick access to the things you use most.</p></div></div><div class="quick-links">
        <a class="quick-link" href="#learners"><span>♧</span><span>Manage learners →</span></a><a class="quick-link" href="#attendance"><span>✓</span><span>Take attendance →</span></a><a class="quick-link" href="#planning"><span>✎</span><span>Plan a lesson →</span></a><a class="quick-link" href="#assessment"><span>▤</span><span>Record assessment →</span></a><a class="quick-link" href="#support"><span>♡</span><span>Support a learner →</span></a><a class="quick-link" href="#reports"><span>↗</span><span>View class reports →</span></a></div></section>
        <section class="panel"><div class="panel-heading"><div><h3>Coming up</h3><p>Your next planned lessons.</p></div><a class="text-link" href="#planning">All plans →</a></div>
        ${thisWeek.length ? `<div class="activity-list">${thisWeek.map((plan) => `<div class="activity-item"><span class="activity-dot"></span><span><strong>${esc(plan.subject)}</strong>${plan.topic ? ` · ${esc(plan.topic)}` : ""}<small class="table-secondary">${prettyDate(plan.date)}${plan.className ? ` · ${esc(plan.className)}` : ""}</small></span></div>`).join("")}</div>` : `<p class="activity-empty">No upcoming lessons yet. Add a CBC lesson plan to see it here.</p>${button("Create a plan", "add-plan", "button-quiet button-small")}`}</section></div>
        <div class="section-heading"><div><p class="eyebrow">CBC ASSESSMENT SNAPSHOT</p><h2>Evidence of learning</h2></div><a class="text-link" href="#assessment">Open assessments →</a></div>
        <div class="level-key">${LEVELS.map((level) => `<span class="badge ${level}">${level} <strong>${levelCounts[level]}</strong></span>`).join("")}<span class="section-note">EE · Exceeding expectations &nbsp; ME · Meeting expectations &nbsp; AE · Approaching expectations &nbsp; BE · Below expectations</span></div>
        ${!state.settings.className ? `<div class="notice">Start with <a class="text-link" href="#settings">Class &amp; backup</a> to add your class name. Your records are saved only in this browser; export a backup regularly.</div>` : ""}`;
}

function renderLearners() {
    const action = `${button("Download class list", "export-learners", "button-quiet")}${button("+ Add learner", "add-learner")}`;
    const rows = [...state.learners].sort((a, b) => a.name.localeCompare(b.name));
    return `${pageHead("Nominal roll", "Keep your class list and learner details in one place.", action)}
        <div class="toolbar"><input class="search-input" id="learner-search" type="search" placeholder="Search learners by name or admission no." aria-label="Search learners"><span class="section-note">${rows.length} learner${rows.length === 1 ? "" : "s"}</span></div>
        ${rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>LEARNER</th><th>ADM. NO.</th><th>GENDER</th><th>STREAM</th><th>GUARDIAN / CONTACT</th><th>ACTIONS</th></tr></thead><tbody>${rows.map((learner) => `<tr data-searchable data-search="${esc(`${learner.name} ${learner.admissionNo} ${learner.stream} ${learner.guardian}`.toLowerCase())}"><td><span class="table-primary">${esc(learner.name)}</span></td><td>${esc(learner.admissionNo)}</td><td>${esc(learner.gender || "—")}</td><td>${esc(learner.stream || "—")}</td><td>${esc(learner.guardian || "—")}${learner.phone ? `<span class="table-secondary">${esc(learner.phone)}</span>` : ""}</td><td><div class="table-actions"><button class="icon-action" type="button" data-action="edit-learner" data-id="${esc(learner.id)}" aria-label="Edit ${esc(learner.name)}">Edit</button><button class="icon-action danger" type="button" data-action="delete-record" data-type="learners" data-id="${esc(learner.id)}" aria-label="Remove ${esc(learner.name)}">×</button></div></td></tr>`).join("")}</tbody></table></div>` : emptyState("♧", "Your class list starts here", "Add learners one at a time, then take attendance and record assessment for your class.", "Add your first learner", "add-learner")}`;
}

function renderAttendance() {
    const date = document.querySelector("#attendance-date")?.value || isoToday();
    const records = state.attendance.filter((item) => item.date === date);
    const byLearner = new Map(records.map((item) => [item.learnerId, item]));
    const count = (status) => records.filter((item) => item.status === status).length;
    const roster = [...state.learners].sort((a, b) => a.name.localeCompare(b.name));
    const toolbar = `<label class="field"><span class="eyebrow">SCHOOL DAY</span><input type="date" id="attendance-date" value="${esc(date)}" aria-label="Attendance date"></label>${roster.length ? button("Mark all present", "mark-all-present", "button-quiet button-small") : ""}${roster.length ? button("Download register", "export-attendance", "button-quiet button-small", `data-date="${esc(date)}"`) : ""}`;
    if (!roster.length) return `${pageHead("Attendance register", "A simple daily roll call for your learners.", toolbar)}${emptyState("✓", "Add your learners first", "Once your nominal roll is set up, mark each learner present, absent or late for any school day.", "Add learners", "add-learner")}`;
    return `${pageHead("Attendance register", "Choose a date and mark each learner. Changes save as you go.", toolbar)}
        <div class="attendance-summary"><span class="summary-pill">Present <strong>${count("Present")}</strong></span><span class="summary-pill">Absent <strong>${count("Absent")}</strong></span><span class="summary-pill">Late <strong>${count("Late")}</strong></span><span class="summary-pill">Not marked <strong>${roster.length - records.length}</strong></span></div>
        <div class="attendance-grid">${roster.map((learner) => { const record = byLearner.get(learner.id); return `<div class="attendance-row"><span class="attendance-name">${esc(learner.name)}</span><div class="attendance-actions">${ATTENDANCE_STATUSES.map((status) => `<button class="status-button ${record?.status === status ? `selected ${status}` : ""}" type="button" data-action="set-attendance" data-learner="${esc(learner.id)}" data-status="${status}" data-date="${esc(date)}" aria-pressed="${record?.status === status}">${status}</button>`).join("")}</div></div>`; }).join("")}</div>`;
}

function renderTimetable() {
    const action = button("+ Add lesson", "add-lesson");
    if (!state.timetable.length) return `${pageHead("Weekly timetable", "A clear view of your lessons, subjects and school week.", action)}${emptyState("▦", "Build your weekly timetable", "Add each lesson with its day and time. Your week will appear here, ready to print or export.", "Add your first lesson", "add-lesson")}`;
    const times = [...new Set(state.timetable.map((item) => `${item.start}|${item.end}`))].sort((a, b) => a.localeCompare(b));
    return `${pageHead("Weekly timetable", "Your lessons, organised across the school week.", button("Print timetable", "print", "button-quiet") + action)}
        <div class="table-wrap timetable"><table class="data-table"><thead><tr><th>TIME</th>${WEEKDAYS.map((day) => `<th>${day.toUpperCase()}</th>`).join("")}</tr></thead><tbody>${times.map((time) => { const [start, end] = time.split("|"); return `<tr><td><span class="table-primary">${esc(start)}</span><span class="table-secondary">${esc(end)}</span></td>${WEEKDAYS.map((day) => { const lesson = state.timetable.find((item) => item.day === day && item.start === start && item.end === end); return `<td class="lesson-cell">${lesson ? `<strong>${esc(lesson.subject)}</strong><small>${esc(lesson.room || lesson.className || "")}</small><div class="table-actions"><button class="icon-action" type="button" data-action="edit-lesson" data-id="${esc(lesson.id)}" aria-label="Edit ${esc(lesson.subject)}">Edit</button><button class="icon-action danger" type="button" data-action="delete-record" data-type="timetable" data-id="${esc(lesson.id)}" aria-label="Remove lesson">×</button></div>` : "—"}</td>`; }).join("")}</tr>`; }).join("")}</tbody></table></div>`;
}

function renderPlanning() {
    const plans = [...state.planning].sort((a, b) => a.date.localeCompare(b.date));
    const action = button("+ New lesson plan", "add-plan");
    return `${pageHead("CBC planning", "Plan learning experiences, outcomes and resources.", action)}
        ${plans.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>DATE</th><th>SUBJECT / GRADE</th><th>TOPIC</th><th>LEARNING OUTCOME</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${plans.map((plan) => `<tr><td>${prettyDate(plan.date)}</td><td><span class="table-primary">${esc(plan.subject)}</span><span class="table-secondary">${esc(plan.grade || "")}</span></td><td>${esc(plan.topic || "—")}</td><td>${esc(plan.outcome || "—")}</td><td><span class="badge">${esc(plan.status || "Planned")}</span></td><td><div class="table-actions"><button class="icon-action" type="button" data-action="edit-plan" data-id="${esc(plan.id)}">Edit</button><button class="icon-action danger" type="button" data-action="delete-record" data-type="planning" data-id="${esc(plan.id)}">×</button></div></td></tr>`).join("")}</tbody></table></div>` : emptyState("✎", "Make room for a good lesson", "Capture the learning outcome, activities and resources before you walk into class.", "Create a lesson plan", "add-plan")}`;
}

function renderAssessments() {
    const records = [...state.assessments].sort((a, b) => b.date.localeCompare(a.date));
    const action = button("+ Record assessment", "add-assessment");
    const filters = `<div class="toolbar"><input class="search-input" id="assessment-search" type="search" placeholder="Search learner, subject or strand" aria-label="Search assessments"><select class="select-filter" id="level-filter" aria-label="Filter by level"><option value="">All levels</option>${LEVELS.map((level) => `<option>${level}</option>`).join("")}</select></div>`;
    return `${pageHead("Assessment & exams", "Record evidence of learning using CBC achievement levels.", action)}
        <div class="level-key"><span class="badge EE">EE · Exceeding expectations</span><span class="badge ME">ME · Meeting expectations</span><span class="badge AE">AE · Approaching expectations</span><span class="badge BE">BE · Below expectations</span></div>
        ${records.length ? `${filters}<div class="table-wrap"><table class="data-table"><thead><tr><th>DATE</th><th>LEARNER</th><th>SUBJECT / STRAND</th><th>ASSESSMENT</th><th>LEVEL</th><th>NOTES</th><th>ACTIONS</th></tr></thead><tbody>${records.map((record) => { const learner = state.learners.find((item) => item.id === record.learnerId); const searchable = `${learner?.name || ""} ${record.subject} ${record.strand}`.toLowerCase(); return `<tr data-assessment-row data-level="${esc(record.level)}" data-search="${esc(searchable)}"><td>${prettyDate(record.date)}</td><td>${esc(learner?.name || "Learner removed")}</td><td><span class="table-primary">${esc(record.subject)}</span><span class="table-secondary">${esc(record.strand || "")}</span></td><td>${esc(record.task || "—")}</td><td><span class="badge ${esc(record.level)}">${esc(record.level)}</span></td><td>${esc(record.notes || "—")}</td><td><div class="table-actions"><button class="icon-action" type="button" data-action="edit-assessment" data-id="${esc(record.id)}">Edit</button><button class="icon-action danger" type="button" data-action="delete-record" data-type="assessments" data-id="${esc(record.id)}">×</button></div></td></tr>`; }).join("")}</tbody></table></div>` : emptyState("▤", "Keep track of learning", "Record observations and assessment evidence against the CBC achievement levels.", "Record an assessment", "add-assessment")}`;
}

function renderSupport() {
    const items = [...state.support].sort((a, b) => (a.reviewDate || "").localeCompare(b.reviewDate || ""));
    const action = button("+ Add support plan", "add-support");
    return `${pageHead("Learner support", "Keep learning goals and follow-up steps organised. Limit sensitive detail to what is necessary.", action)}
        <div class="notice warning">Learner support notes may be sensitive. They are saved only in this browser. Use brief, respectful language and do not include unnecessary medical or family details.</div>
        ${items.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>LEARNER</th><th>AREA TO SUPPORT</th><th>GOAL</th><th>NEXT STEP</th><th>REVIEW</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${items.map((item) => { const learner = state.learners.find((person) => person.id === item.learnerId); return `<tr><td>${esc(learner?.name || "Learner removed")}</td><td>${esc(item.area)}</td><td>${esc(item.goal)}</td><td>${esc(item.action)}</td><td>${prettyDate(item.reviewDate)}</td><td><span class="badge ${item.status === "Achieved" ? "achieved" : ""}">${esc(item.status)}</span></td><td><div class="table-actions"><button class="icon-action" type="button" data-action="edit-support" data-id="${esc(item.id)}">Edit</button><button class="icon-action danger" type="button" data-action="delete-record" data-type="support" data-id="${esc(item.id)}">×</button></div></td></tr>`; }).join("")}</tbody></table></div>` : emptyState("♡", "Plan thoughtful support", "Set a clear, achievable goal and a practical next step for a learner who needs extra support.", "Add a support plan", "add-support")}`;
}

function renderReports() {
    const totalAttendance = state.attendance.length;
    const present = state.attendance.filter((item) => item.status === "Present" || item.status === "Late").length;
    const attendanceRate = totalAttendance ? Math.round((present / totalAttendance) * 100) : 0;
    const assessmentCounts = Object.fromEntries(LEVELS.map((level) => [level, state.assessments.filter((item) => item.level === level).length]));
    const openSupport = state.support.filter((item) => item.status !== "Achieved").length;
    const monthRecords = state.attendance.filter((item) => item.date?.slice(0, 7) === isoToday().slice(0, 7));
    const presentThisMonth = monthRecords.filter((item) => item.status === "Present" || item.status === "Late").length;
    const monthlyRate = monthRecords.length ? Math.round((presentThisMonth / monthRecords.length) * 100) : 0;
    const action = button("Download CSV report", "export-report", "button-primary");
    return `${pageHead("Class reports", "A quick overview of attendance, assessment and learner support.", action)}
        <div class="report-cards"><article class="report-card"><span>Attendance this month</span><strong>${monthlyRate}%</strong><div class="progress-track"><span style="width:${monthlyRate}%"></span></div><small>${presentThisMonth} present or late marks out of ${monthRecords.length}</small></article><article class="report-card"><span>Assessment evidence</span><strong>${state.assessments.length}</strong><small>${LEVELS.map((level) => `${level} ${assessmentCounts[level]}`).join(" · ")}</small></article><article class="report-card"><span>Support plans in progress</span><strong>${openSupport}</strong><small>${state.support.length - openSupport} achieved</small></article></div>
        <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h3>CBC achievement levels</h3><p>Assessment records currently in your workspace.</p></div></div>${LEVELS.map((level) => { const count = assessmentCounts[level]; const width = state.assessments.length ? Math.round(count / state.assessments.length * 100) : 0; const names = { EE: "Exceeding expectations", ME: "Meeting expectations", AE: "Approaching expectations", BE: "Below expectations" }; return `<div class="report-level"><div><span class="badge ${level}">${level}</span><span>${names[level]}</span><strong>${count}</strong></div><div class="progress-track"><span style="width:${width}%"></span></div></div>`; }).join("")}</section>
        <section class="panel"><div class="panel-heading"><div><h3>Attendance overview</h3><p>Across all recorded school days.</p></div></div><div class="report-big">${attendanceRate}%</div><p class="activity-empty">${present} present or late marks from ${totalAttendance} total records.</p>${state.learners.length ? `<p class="activity-empty">Class size: ${state.learners.length} learners.</p>` : `<p class="activity-empty">Add learners and attendance records to build your report.</p>`}</section></div>`;
}

function renderSettings() {
    const settings = state.settings;
    const storageItems = Object.values(state).filter(Array.isArray).reduce((total, list) => total + list.length, 0);
    return `${pageHead("Class & backup", "Personalise your workspace and keep a safe copy of your data.")}
        <div class="setting-grid"><section class="panel setting-card"><h3>Class details</h3><p>These details help label the plans and reports you create.</p><form id="settings-form"><div class="field"><label for="teacher">Teacher name</label><input id="teacher" name="teacher" value="${esc(settings.teacher)}" placeholder="e.g. Amina Wanjiku"></div><div class="field"><label for="school">School name</label><input id="school" name="school" value="${esc(settings.school)}" placeholder="e.g. Green Valley Primary"></div><div class="field"><label for="className">Class / grade</label><input id="className" name="className" value="${esc(settings.className)}" placeholder="e.g. Grade 4 Blue"></div><div class="field"><label for="year">School year</label><input id="year" name="year" type="number" min="2000" max="2100" value="${esc(settings.year)}"></div><button class="button button-primary" type="submit">Save class details</button></form></section>
        <section class="panel setting-card"><h3>Back up your work</h3><p>Your information is stored in this browser only. A backup file lets you restore it if you change device or clear browser data.</p><div class="head-actions">${button("Download a backup", "export-backup")}${button("Restore from backup", "import-backup", "button-quiet")}</div><div class="storage-line"><span class="privacy-dot"></span>${storageItems} records stored in this browser</div><div class="notice">Your backup contains learner information. Keep it somewhere private and secure.</div><div class="danger-zone"><h3>Clear this workspace</h3><p>Permanently remove all learner, attendance, timetable, planning, assessment, support and class details saved in this browser. Download a backup first if you may need them.</p>${button("Clear all saved data", "clear-data", "button-danger")}</div></section></div>`;
}

const field = (name, label, options = {}) => {
    const id = `field-${name}`;
    const required = options.required ? "required" : "";
    const value = options.value ?? "";
    const attrs = `${options.min ? `min="${esc(options.min)}"` : ""} ${options.max ? `max="${esc(options.max)}"` : ""} ${options.step ? `step="${esc(options.step)}"` : ""}`;
    let control;
    if (options.options) {
        control = `<select id="${id}" name="${name}" ${required}>${options.placeholder ? `<option value="">${esc(options.placeholder)}</option>` : ""}${options.options.map((item) => { const v = typeof item === "string" ? item : item.value; const labelText = typeof item === "string" ? item : item.label; return `<option value="${esc(v)}" ${String(value) === String(v) ? "selected" : ""}>${esc(labelText)}</option>`; }).join("")}</select>`;
    } else if (options.textarea) {
        control = `<textarea id="${id}" name="${name}" placeholder="${esc(options.placeholder || "")}" ${required}>${esc(value)}</textarea>`;
    } else {
        control = `<input id="${id}" name="${name}" type="${esc(options.type || "text")}" value="${esc(value)}" placeholder="${esc(options.placeholder || "")}" ${attrs} ${required}>`;
    }
    return `<div class="field ${options.full ? "full" : ""}"><label for="${id}">${label}${options.required ? " *" : ""}</label>${control}</div>`;
};

function learnerOptions() {
    return state.learners.slice().sort((a, b) => a.name.localeCompare(b.name)).map((learner) => ({ value: learner.id, label: `${learner.name} · ${learner.admissionNo}` }));
}

function openForm(title, kind, record, fields, submitLabel = "Save") {
    modalForm.dataset.kind = kind;
    modalForm.dataset.id = record?.id || "";
    document.querySelector("#modal-title").textContent = title;
    document.querySelector("#modal-submit").textContent = submitLabel;
    modalBody.innerHTML = `<div class="form-grid">${fields.join("")}</div>`;
    modal.showModal();
    modalBody.querySelector("input, select, textarea")?.focus();
}

function editRecord(type, id) {
    return state[type].find((item) => item.id === id);
}

function openLearner(record = null) {
    const r = record || {};
    openForm(record ? "Edit learner" : "Add a learner", "learners", r, [
        field("name", "Full name", { value: r.name, required: true, placeholder: "Learner's name" }),
        field("admissionNo", "Admission number", { value: r.admissionNo, required: true, placeholder: "e.g. 0042/2025" }),
        field("gender", "Gender (optional)", { value: r.gender, options: ["", "Female", "Male", "Prefer not to say"] }),
        field("stream", "Stream / class (optional)", { value: r.stream, placeholder: state.settings.className || "e.g. Blue" }),
        field("guardian", "Parent / guardian (optional)", { value: r.guardian }),
        field("phone", "Guardian contact (optional)", { value: r.phone, type: "tel", placeholder: "Phone number" }),
    ]);
}

function openLesson(record = null) {
    const r = record || {};
    openForm(record ? "Edit timetable lesson" : "Add a timetable lesson", "timetable", r, [
        field("day", "Day", { value: r.day || "Monday", options: WEEKDAYS, required: true }),
        field("subject", "Learning area / subject", { value: r.subject, required: true, placeholder: "e.g. Mathematics" }),
        field("start", "Start time", { value: r.start || "08:00", type: "time", required: true }),
        field("end", "End time", { value: r.end || "08:40", type: "time", required: true }),
        field("room", "Classroom / location", { value: r.room, placeholder: state.settings.className || "Optional" }),
        field("teacher", "Teacher (optional)", { value: r.teacher || state.settings.teacher }),
    ]);
}

function openPlan(record = null) {
    const r = record || {};
    openForm(record ? "Edit lesson plan" : "Plan a CBC lesson", "planning", r, [
        field("date", "Lesson date", { value: r.date || isoToday(), type: "date", required: true }),
        field("subject", "Learning area / subject", { value: r.subject, required: true, placeholder: "e.g. Integrated Science" }),
        field("grade", "Grade / class", { value: r.grade || state.settings.className, placeholder: "e.g. Grade 4" }),
        field("term", "Term", { value: r.term || "Term 1", options: ["Term 1", "Term 2", "Term 3"] }),
        field("topic", "Strand / topic", { value: r.topic, required: true, placeholder: "What will learners explore?" }),
        field("outcome", "Specific learning outcome", { value: r.outcome, required: true, textarea: true, full: true, placeholder: "By the end of the lesson, the learner should be able to…" }),
        field("activities", "Learning experiences / activities", { value: r.activities, textarea: true, full: true, placeholder: "What will learners do?" }),
        field("resources", "Resources / materials", { value: r.resources, placeholder: "What will you need?" }),
        field("status", "Plan status", { value: r.status || "Planned", options: ["Planned", "Ready", "Taught"] }),
    ]);
}

function openAssessment(record = null) {
    if (!state.learners.length) {
        notify("Add learners to your nominal roll before recording assessment.", "error");
        return;
    }
    const r = record || {};
    openForm(record ? "Edit assessment record" : "Record learner assessment", "assessments", r, [
        field("learnerId", "Learner", { value: r.learnerId, options: learnerOptions(), placeholder: "Choose a learner", required: true }),
        field("date", "Assessment date", { value: r.date || isoToday(), type: "date", required: true }),
        field("subject", "Learning area / subject", { value: r.subject, required: true, placeholder: "e.g. English" }),
        field("strand", "Strand / competency", { value: r.strand, placeholder: "Optional" }),
        field("task", "Task / evidence", { value: r.task, required: true, placeholder: "What did the learner demonstrate?" }),
        field("level", "Achievement level", { value: r.level || "ME", options: LEVELS.map((level) => ({ value: level, label: { EE: "EE · Exceeding expectations", ME: "ME · Meeting expectations", AE: "AE · Approaching expectations", BE: "BE · Below expectations" }[level] })), required: true }),
        field("notes", "Teacher observation (optional)", { value: r.notes, textarea: true, full: true, placeholder: "Brief evidence or next step" }),
    ]);
}

function openSupport(record = null) {
    if (!state.learners.length) {
        notify("Add learners to your nominal roll before creating a support plan.", "error");
        return;
    }
    const r = record || {};
    openForm(record ? "Edit learner support plan" : "Create a learner support plan", "support", r, [
        field("learnerId", "Learner", { value: r.learnerId, options: learnerOptions(), placeholder: "Choose a learner", required: true }),
        field("area", "Learning area to support", { value: r.area, required: true, placeholder: "Keep this brief and respectful" }),
        field("goal", "Small, achievable goal", { value: r.goal, required: true, textarea: true, full: true, placeholder: "What will the learner work towards?" }),
        field("action", "Next teaching / support step", { value: r.action, required: true, textarea: true, full: true, placeholder: "What practical support will be provided?" }),
        field("reviewDate", "Review date", { value: r.reviewDate || isoToday(), type: "date", required: true }),
        field("status", "Progress", { value: r.status || "In progress", options: ["In progress", "Achieved", "Needs review"] }),
    ]);
}

function saveForm(event) {
    event.preventDefault();
    const formData = new FormData(modalForm);
    const record = Object.fromEntries(formData.entries());
    const type = modalForm.dataset.kind;
    const existingId = modalForm.dataset.id;
    if (type === "timetable" && record.end <= record.start) {
        notify("End time must be later than start time.", "error");
        return;
    }
    if (type === "learners") {
        const duplicate = state.learners.find((learner) => learner.admissionNo.trim().toLowerCase() === record.admissionNo.trim().toLowerCase() && learner.id !== existingId);
        if (duplicate) {
            notify("That admission number is already in your nominal roll.", "error");
            modalForm.elements.admissionNo.focus();
            return;
        }
    }
    if (type === "timetable") {
        const clash = state.timetable.find((lesson) => lesson.id !== existingId && lesson.day === record.day && record.start < lesson.end && record.end > lesson.start);
        if (clash) {
            notify(`This overlaps with ${clash.subject} (${clash.start}–${clash.end}). Adjust the lesson time before saving.`, "error", 5500);
            return;
        }
    }
    record.id = existingId || newId();
    const previousRecords = state[type];
    if (existingId) {
        if (!previousRecords.some((item) => item.id === existingId)) {
            notify("That record could not be found. Refresh and try again.", "error");
            return;
        }
        state[type] = previousRecords.map((item) => item.id === existingId ? { ...item, ...record } : item);
    } else {
        state[type] = [...previousRecords, record];
    }
    if (!persist()) {
        state[type] = previousRecords;
        return;
    }
    modal.close();
    render();
    notify(existingId ? "Changes saved." : "Added to your workspace.");
}

function setAttendance(learnerId, date, status) {
    const previous = state.attendance;
    const existing = previous.find((item) => item.learnerId === learnerId && item.date === date);
    state.attendance = existing
        ? previous.map((item) => item.id === existing.id ? { ...item, status } : item)
        : [...previous, { id: newId(), learnerId, date, status }];
    if (persist()) render();
    else state.attendance = previous;
}

function deleteRecord(type, id) {
    const labels = { learners: "learner and their attendance marks", timetable: "lesson", planning: "lesson plan", assessments: "assessment record", support: "support plan" };
    const record = state[type]?.find((item) => item.id === id);
    if (!record || !window.confirm(`Remove this ${labels[type] || "record"}? This cannot be undone.`)) return;
    const previous = {};
    previous[type] = state[type];
    state[type] = state[type].filter((item) => item.id !== id);
    if (type === "learners") {
        previous.attendance = state.attendance;
        previous.assessments = state.assessments;
        previous.support = state.support;
        state.attendance = state.attendance.filter((item) => item.learnerId !== id);
        state.assessments = state.assessments.filter((item) => item.learnerId !== id);
        state.support = state.support.filter((item) => item.learnerId !== id);
    }
    if (!persist()) {
        Object.assign(state, previous);
        return;
    }
    render();
    notify(type === "learners" ? "Learner and associated attendance marks removed." : "Record removed.");
}

function downloadFile(filename, contentText, mime) {
    const blob = new Blob([contentText], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function exportBackup() {
    const date = isoToday();
    downloadFile(`mwalimu-backup-${date}.json`, JSON.stringify({ app: "Mwalimu Digital", version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2), "application/json");
    notify("Backup downloaded. Keep the file somewhere private.");
}

function csvCell(value) {
    let text = String(value ?? "");
    if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headings, rows) {
    const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    downloadFile(filename, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    notify("CSV downloaded.");
}

function exportAttendance(date) {
    const records = state.attendance.filter((item) => item.date === date);
    const rows = state.learners.map((learner) => {
        const record = records.find((item) => item.learnerId === learner.id);
        return [date, learner.admissionNo, learner.name, record?.status || "Not marked"];
    });
    downloadCsv(`attendance-${date}.csv`, ["Date", "Admission number", "Learner", "Status"], rows);
}

function exportLearners() {
    const rows = [...state.learners]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((learner) => [learner.admissionNo, learner.name, learner.gender, learner.stream, learner.guardian, learner.phone]);
    downloadCsv("mwalimu-class-list.csv", ["Admission number", "Learner", "Gender", "Stream", "Parent or guardian", "Contact"], rows);
}

function exportReport() {
    const learnersById = new Map(state.learners.map((learner) => [learner.id, learner]));
    const rows = [
        ["Learner", "Admission number", "Record type", "Date", "Subject or area", "Result or status", "Details"],
        ...state.attendance.map((item) => [learnersById.get(item.learnerId)?.name || "Learner removed", learnersById.get(item.learnerId)?.admissionNo || "", "Attendance", item.date, "", item.status, ""]),
        ...state.assessments.map((item) => [learnersById.get(item.learnerId)?.name || "Learner removed", learnersById.get(item.learnerId)?.admissionNo || "", "Assessment", item.date, item.subject, item.level, item.task]),
        ...state.support.map((item) => [learnersById.get(item.learnerId)?.name || "Learner removed", learnersById.get(item.learnerId)?.admissionNo || "", "Support", item.reviewDate, item.area, item.status, item.goal]),
    ];
    downloadCsv(`mwalimu-class-report-${isoToday()}.csv`, rows[0], rows.slice(1));
}

function filterRows(query, level) {
    const normalized = query.trim().toLowerCase();
    document.querySelectorAll("[data-searchable], [data-assessment-row]").forEach((row) => {
        const textMatch = !normalized || row.dataset.search.includes(normalized);
        const levelMatch = !level || row.dataset.level === level;
        row.hidden = !(textMatch && levelMatch);
    });
}

function validImportedState(data) {
    const requiredLists = ["learners", "attendance", "timetable", "planning", "assessments", "support"];
    const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
    const hasStrings = (item, keys) => item && keys.every((key) => typeof item[key] === "string");
    return data && typeof data === "object" && requiredLists.every((key) => Array.isArray(data[key])) &&
        data.settings && typeof data.settings === "object" &&
        ["teacher", "school", "className"].every((key) => typeof data.settings[key] === "string") &&
        Number.isInteger(data.settings.year) && data.settings.year >= 2000 && data.settings.year <= 2100 &&
        data.learners.every((item) => hasStrings(item, ["id", "name", "admissionNo"])) &&
        data.attendance.every((item) => hasStrings(item, ["id", "learnerId", "date", "status"]) && isDate(item.date) && ATTENDANCE_STATUSES.includes(item.status)) &&
        data.timetable.every((item) => hasStrings(item, ["id", "day", "subject", "start", "end"]) && WEEKDAYS.includes(item.day) && /^\d{2}:\d{2}$/.test(item.start) && /^\d{2}:\d{2}$/.test(item.end) && item.start < item.end) &&
        data.planning.every((item) => hasStrings(item, ["id", "date", "subject", "topic", "outcome"]) && isDate(item.date)) &&
        data.assessments.every((item) => hasStrings(item, ["id", "learnerId", "date", "subject", "task", "level"]) && isDate(item.date) && LEVELS.includes(item.level)) &&
        data.support.every((item) => hasStrings(item, ["id", "learnerId", "area", "goal", "action", "reviewDate", "status"]) && isDate(item.reviewDate) && ["In progress", "Achieved", "Needs review"].includes(item.status));
}

content.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const { action, id, type } = actionElement.dataset;
    const record = id ? editRecord(type || ({ "edit-learner": "learners", "edit-lesson": "timetable", "edit-plan": "planning", "edit-assessment": "assessments", "edit-support": "support" })[action], id) : null;
    const actions = {
        "add-learner": () => openLearner(),
        "edit-learner": () => openLearner(record),
        "add-lesson": () => openLesson(),
        "edit-lesson": () => openLesson(record),
        "add-plan": () => openPlan(),
        "edit-plan": () => openPlan(record),
        "add-assessment": () => openAssessment(),
        "edit-assessment": () => openAssessment(record),
        "add-support": () => openSupport(),
        "edit-support": () => openSupport(record),
        "delete-record": () => deleteRecord(type, id),
        "set-attendance": () => setAttendance(actionElement.dataset.learner, actionElement.dataset.date, actionElement.dataset.status),
        "mark-all-present": () => {
            const date = document.querySelector("#attendance-date")?.value || isoToday();
            if (window.confirm(`Mark all ${state.learners.length} learners present on ${prettyDate(date)}?`)) {
                const previous = state.attendance;
                state.attendance = [...previous];
                state.learners.forEach((learner) => {
                    const index = state.attendance.findIndex((item) => item.learnerId === learner.id && item.date === date);
                    if (index >= 0) state.attendance[index] = { ...state.attendance[index], status: "Present" };
                    else state.attendance.push({ id: newId(), learnerId: learner.id, date, status: "Present" });
                });
                if (persist()) { render(); notify("Attendance saved for the whole class."); }
                else state.attendance = previous;
            }
        },
        "export-attendance": () => exportAttendance(actionElement.dataset.date),
        "export-learners": exportLearners,
        "export-backup": exportBackup,
        "import-backup": () => document.querySelector("#import-file").click(),
        "export-report": exportReport,
        "clear-data": () => {
            if (!window.confirm("Permanently clear all saved class data from this browser? This cannot be undone. Download a backup first if you may need it.")) return;
            const before = state;
            state = freshState();
            if (persist()) { render(); notify("Workspace cleared."); }
            else state = before;
        },
        print: () => window.print(),
    };
    actions[action]?.();
});

document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-route]");
    if (link) {
        event.preventDefault();
        navigate(link.dataset.route);
    }
    if (event.target.closest("[data-close-modal]")) modal.close();
});

content.addEventListener("change", (event) => {
    if (event.target.id === "attendance-date") {
        render();
    }
    if (event.target.id === "level-filter") {
        filterRows(document.querySelector("#assessment-search")?.value || "", event.target.value);
    }
});

content.addEventListener("input", (event) => {
    if (event.target.matches("#learner-search, #assessment-search")) {
        const query = event.target.value;
        filterRows(query, document.querySelector("#level-filter")?.value || "");
    }
});

modalForm.addEventListener("submit", saveForm);

document.addEventListener("submit", (event) => {
    if (event.target.id !== "settings-form") return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target).entries());
    const year = Number(values.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        notify("Enter a school year between 2000 and 2100.", "error");
        return;
    }
    const previous = state.settings;
    state.settings = { ...previous, ...values, year };
    if (persist()) { render(); notify("Class details saved."); }
    else state.settings = previous;
});

document.querySelector("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
        const parsed = JSON.parse(await file.text());
        const imported = parsed?.data || parsed;
        if (!validImportedState(imported)) {
            notify("This file is not a valid Mwalimu workspace backup.", "error", 6000);
            return;
        }
        if (!window.confirm("Restore this backup? It will replace all data currently saved in this browser.")) return;
        const previous = state;
        state = {
            ...freshState(),
            ...imported,
            settings: { ...freshState().settings, ...imported.settings },
        };
        if (persist()) { render(); notify("Backup restored successfully."); }
        else state = previous;
    } catch (error) {
        console.error("Unable to restore the workspace backup.", error);
        notify("The backup file could not be read. Nothing was changed.", "error", 6000);
    }
});

document.querySelector("#menu-button").addEventListener("click", () => {
    document.querySelector("#sidebar").classList.toggle("open");
});

window.addEventListener("hashchange", render);
window.addEventListener("popstate", render);
window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") document.querySelector("#sidebar").classList.remove("open");
});

state = loadState();
render();
