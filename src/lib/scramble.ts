import gsap from "gsap";

const CHARS = "▮▯/■□0123456789·";

export function scrambleIn(el: HTMLElement, opts?: { duration?: number; delay?: number }) {
  const original = el.textContent || "";
  const duration = opts?.duration ?? 0.9;
  const delay = opts?.delay ?? 0;

  const obj = { p: 0 };
  return gsap.to(obj, {
    p: 1,
    duration,
    delay,
    ease: "power2.out",
    onUpdate: () => {
      const len = original.length;
      const reveal = Math.floor(obj.p * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        if (i < reveal || original[i] === " ") out += original[i];
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      el.textContent = out;
    },
    onComplete: () => {
      el.textContent = original;
    },
  });
}
