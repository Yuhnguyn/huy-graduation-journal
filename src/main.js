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
const urlName = new URLSearchParams(window.location.search).get("name");
if (guestNameEl && urlName) guestNameEl.textContent = decodeURIComponent(urlName);

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

campusMap.addEventListener("click", () => {
  campusMap.classList.remove("is-route-active");
  requestAnimationFrame(() => campusMap.classList.add("is-route-active"));
});

greetingOpen.addEventListener("click", () => greetingDialog.showModal());

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
      formStatus.textContent = "Đã gửi lời chúc thành công!";
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
