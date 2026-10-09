const pageTitles = {
    dashboard: "Dashboard",
    learners: "Nominal Roll",
    attendance: "Attendance Register",
    timetable: "Timetable Generator",
    planning: "CBC Planning",
    assessment: "Assessment & Exams",
    support: "Learner Support",
    reports: "Reports",
};

const pageTitle = document.querySelector("#page-title");
const workspaceDate = document.querySelector("#workspace-date");
const pages = document.querySelectorAll(".page");
const navigationButtons = document.querySelectorAll(".nav-link");

function showPage(pageId, updateHistory = false) {
    if (!Object.hasOwn(pageTitles, pageId)) {
        return;
    }

    pages.forEach((page) => {
        const isActive = page.id === pageId;
        page.hidden = !isActive;
        page.classList.toggle("active", isActive);
    });

    navigationButtons.forEach((button) => {
        const isActive = button.dataset.page === pageId;
        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    pageTitle.textContent = pageTitles[pageId];
    document.title = `${pageTitles[pageId]} | Mwalimu Digital Hub`;

    if (updateHistory && window.location.hash !== `#${pageId}`) {
        window.history.pushState({ pageId }, "", `#${pageId}`);
    }
}

document.querySelectorAll("[data-page]").forEach((control) => {
    control.addEventListener("click", (event) => {
        if (control instanceof HTMLAnchorElement) {
            event.preventDefault();
        }
        showPage(control.dataset.page, true);
    });
});

function showPageFromLocation() {
    const pageId = window.location.hash.slice(1);
    showPage(Object.hasOwn(pageTitles, pageId) ? pageId : "dashboard");
}

window.addEventListener("popstate", showPageFromLocation);
window.addEventListener("hashchange", showPageFromLocation);

const currentDate = new Date();
const today = new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
}).format(currentDate);
workspaceDate.textContent = today;
workspaceDate.dateTime = [
    currentDate.getFullYear(),
    String(currentDate.getMonth() + 1).padStart(2, "0"),
    String(currentDate.getDate()).padStart(2, "0"),
].join("-");

showPageFromLocation();
