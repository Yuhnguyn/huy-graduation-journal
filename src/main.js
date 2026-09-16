import "./styles.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BookScene } from "./scene/BookScene.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.querySelector("#bookCanvas");
const story = document.querySelector("#bookStory");
const invitation = document.querySelector("#invitation");
const coverCopy = document.querySelector("#coverCopy");
const openCue = document.querySelector("#openCue");
const motionToggle = document.querySelector("#motionToggle");
const campusMap = document.querySelector("#campusMap");
const greetingDialog = document.querySelector("#greetingDialog");
const greetingOpen = document.querySelector("#greetingOpen");
const greetingForm = document.querySelector("#greetingForm");
const formStatus = document.querySelector("#formStatus");

const guestNameEl = document.querySelector(".guest-name");
const senderNameInput = document.querySelector("#senderName");
const searchParams = new URLSearchParams(window.location.search);
const rawName = searchParams.get("name") || searchParams.get("guest") || searchParams.get("to");

if (rawName && rawName.trim()) {
  let cleanName = rawName.trim();
  try {
    cleanName = decodeURIComponent(cleanName);
  } catch {}
  if (guestNameEl) guestNameEl.textContent = cleanName;
  if (senderNameInput) senderNameInput.value = cleanName;
}

const scene = new BookScene(canvas);
const systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
let manualReduced = false;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const currentReduced = () => systemReduced.matches || manualReduced;

function renderStory(rawProgress) {
  const progress = currentReduced() ? (rawProgress > 0.08 ? 1 : 0) : rawProgress;
  scene.setReducedMotion(currentReduced());
  scene.setProgress(progress);

  const copyFade = clamp01((progress - 0.16) / 0.22);
  const reveal = clamp01((progress - 0.56) / 0.22);
  coverCopy.style.opacity = String(1 - copyFade);
  coverCopy.style.transform = `translate(-50%, calc(-50% - ${copyFade * 10}px)) scale(${1 - copyFade * 0.025})`;
  openCue.style.opacity = String(1 - clamp01(progress / 0.15));
  openCue.style.pointerEvents = progress < 0.14 ? "auto" : "none";

  invitation.style.visibility = reveal > 0.01 ? "visible" : "hidden";
  invitation.style.opacity = String(reveal);
  invitation.style.transform = `translate(-50%, ${-48 + (1 - reveal) * 2}%) scale(${0.975 + reveal * 0.025})`;
  invitation.classList.toggle("is-interactive", reveal > 0.94);
}

const scrollController = ScrollTrigger.create({
  trigger: story,
  start: "top top",
  end: "bottom bottom",
  scrub: 0.65,
  invalidateOnRefresh: true,
  onUpdate: (self) => renderStory(self.progress),
});

renderStory(scrollController.progress);

openCue.addEventListener("click", () => {
  const target = story.offsetTop + story.offsetHeight - window.innerHeight;
  window.scrollTo({ top: target, behavior: currentReduced() ? "auto" : "smooth" });
});

motionToggle.addEventListener("click", () => {
  manualReduced = !manualReduced;
  motionToggle.setAttribute("aria-pressed", String(manualReduced));
  motionToggle.textContent = manualReduced ? "Bật chuyển động" : "Giảm chuyển động";
  document.body.classList.toggle("force-reduced-motion", manualReduced);
  renderStory(scrollController.progress);
});

systemReduced.addEventListener("change", () => renderStory(scrollController.progress));

window.addEventListener("pointermove", (event) => {
  scene.setPointer((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * -2);
}, { passive: true });

window.addEventListener("resize", () => {
  scene.resize();
  ScrollTrigger.refresh();
}, { passive: true });

const mapOverlay = document.querySelector("#mapOverlay");
const mapSheet = document.querySelector("#mapSheet");
const mapClose = document.querySelector("#mapClose");
let mapReturnRect = null;
function openMap() {
  campusMap.classList.remove("is-route-active");
  requestAnimationFrame(() => campusMap.classList.add("is-route-active"));
  if (!mapOverlay || currentReduced()) {
    if (mapOverlay) { mapOverlay.classList.add("is-open"); mapOverlay.setAttribute("aria-hidden", "false"); }
    return;
  }
  mapReturnRect = campusMap.getBoundingClientRect();
  const r = mapReturnRect;
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
  const sx = Math.max(r.width / Math.min(window.innerWidth * 0.9, 760), 0.05);
  const sy = Math.max(r.height / 480, 0.05);
  mapOverlay.classList.add("is-open");
  mapOverlay.setAttribute("aria-hidden", "false");
  gsap.fromTo(mapSheet, { x: dx, y: dy, scale: Math.max(sx, sy), rotate: -6 }, { x: 0, y: 0, scale: 1, rotate: 0, duration: 0.65, ease: "expo.out" });
  gsap.fromTo(".map-sheet-body svg", { scale: 0.92 }, { scale: 1, duration: 0.65, ease: "expo.out" });
}
function closeMap() {
  if (!mapOverlay) return;
  if (currentReduced() || !mapReturnRect) { mapOverlay.classList.remove("is-open"); mapOverlay.setAttribute("aria-hidden", "true"); return; }
  const r = mapReturnRect;
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
  gsap.to(mapSheet, { x: dx, y: dy, scale: 0.1, rotate: 3, duration: 0.45, ease: "expo.in", onComplete: () => { mapOverlay.classList.remove("is-open"); mapOverlay.setAttribute("aria-hidden", "true"); gsap.set(mapSheet, { clearProps: "all" }); } });
}
campusMap.addEventListener("click", openMap);
mapClose?.addEventListener("click", closeMap);
mapOverlay?.addEventListener("click", (e) => { if (e.target.closest("[data-map-close]")) closeMap(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && mapOverlay?.classList.contains("is-open")) closeMap(); });
mapSheet?.addEventListener("pointermove", (e) => {
  if (currentReduced()) return;
  const b = mapSheet.getBoundingClientRect();
  const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
  gsap.to(".map-sheet-body svg", { rotateY: px * 10, rotateX: -py * 8, transformPerspective: 900, duration: 0.4, ease: "power2.out" });
});
mapSheet?.addEventListener("pointerleave", () => gsap.to(".map-sheet-body svg", { rotateX: 0, rotateY: 0, duration: 0.6, ease: "elastic.out(1,.6)" }));

greetingOpen.addEventListener("click", () => greetingDialog.showModal());
document.querySelector("#greetingClose")?.addEventListener("click", () => greetingDialog.close());

const bookStage = document.querySelector("#bookStage");
const scrapSheet = document.querySelector(".scrapbook-sheet");
const gradPanel = document.querySelector(".graduate-panel");
const notePage = document.querySelector(".notebook-page");
const confettiLayer = document.querySelector("#confettiLayer");
let cardTilt = { x: 0, y: 0 }, cardTarget = { x: 0, y: 0 }, entranceDone = false, confettiDone = false;
const isMobile = () => window.innerWidth < 768;
bookStage?.addEventListener("pointermove", (e) => {
  if (currentReduced()) return;
  const f = isMobile() ? 0.4 : 1;
  cardTarget.x = (e.clientX / window.innerWidth - 0.5) * 10 * f;
  cardTarget.y = (e.clientY / window.innerHeight - 0.5) * -8 * f;
});
bookStage?.addEventListener("pointerleave", () => { cardTarget.x = 0; cardTarget.y = 0; });
gsap.ticker.add(() => {
  if (currentReduced()) return;
  cardTilt.x += (cardTarget.x - cardTilt.x) * 0.08;
  cardTilt.y += (cardTarget.y - cardTilt.y) * 0.08;
  if (scrapSheet) gsap.set(scrapSheet, { rotateY: cardTilt.x, rotateX: cardTilt.y, transformPerspective: 1400 });
  if (gradPanel) gsap.set(gradPanel, { x: cardTilt.x * 1.6, y: cardTilt.y * 1.6 });
  if (notePage) gsap.set(notePage, { x: cardTilt.x * -1, y: cardTilt.y * -1 });
});
function playEntrance() {
  if (entranceDone || currentReduced()) return;
  entranceDone = true;
  gsap.from(".collage-title span", { y: 40, opacity: 0, rotate: 12, stagger: 0.05, duration: 0.7, ease: "back.out(1.8)" });
  gsap.from(".portrait-sticker", { scale: 0.6, opacity: 0, duration: 0.8, ease: "back.out(1.6)", delay: 0.2 });
  gsap.from(".name-sticker, .class-sticker", { y: 20, opacity: 0, stagger: 0.1, duration: 0.6, ease: "power3.out", delay: 0.4 });
  gsap.from(".note-heading, .event-facts, .map-and-note, .invitation-actions", { y: 26, opacity: 0, stagger: 0.09, duration: 0.65, ease: "power3.out", delay: 0.5 });
}
function fireConfetti(n = 90) {
  if (!confettiLayer || currentReduced()) return;
  const colors = ["#c94932", "#d8a548", "#4e6245", "#fff178", "#fffdf0"];
  for (let i = 0; i < n; i++) {
    const b = document.createElement("i");
    b.className = "confetti-bit";
    const s = 5 + Math.random() * 7;
    b.style.left = Math.random() * 100 + "%";
    b.style.width = s + "px"; b.style.height = (s * (0.5 + Math.random())) + "px";
    b.style.background = colors[i % colors.length];
    b.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiLayer.appendChild(b);
    gsap.to(b, { y: window.innerHeight * (0.6 + Math.random() * 0.6), x: "+=" + (Math.random() * 160 - 80), rotation: "+=" + (360 + Math.random() * 540), duration: 1.8 + Math.random() * 1.6, ease: "power1.in", delay: Math.random() * 0.4, onComplete: () => b.remove() });
  }
}
const origToggle = invitation.classList.toggle.bind(invitation.classList);
let lastInteractive = false;
setInterval(() => {
  const v = invitation.classList.contains("is-interactive");
  if (v && !lastInteractive) { playEntrance(); if (!confettiDone) { confettiDone = true; setTimeout(() => fireConfetti(110), 350); } }
  lastInteractive = v;
}, 300);

greetingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!greetingForm.reportValidity()) return;

  const submitBtn = greetingForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Đang gửi...";

  try {
    const data = new FormData(greetingForm);
    data.append("from_name", document.querySelector("#senderName").value.trim());

    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: data,
    });

    const result = await res.json();
    if (result.success) {
      formStatus.textContent = "Đã gửi lời chúc thành công! Cảm ơn bạn nhiều!";
      fireConfetti(60);
      greetingForm.reset();
      window.setTimeout(() => greetingDialog.close(), 900);
    } else {
      formStatus.textContent = "Có lỗi xảy ra, thử lại sau.";
    }
  } catch {
    formStatus.textContent = "Có lỗi xảy ra, thử lại sau.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Gửi lời chúc";
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scene.resize();
});

window.addEventListener("beforeunload", () => scene.dispose(), { once: true });
