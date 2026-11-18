// Open the robot's chat from anywhere on the site (the Contact page's Robot line, for one). Guide.tsx listens.
export const OPEN_CHAT = 'inta:guide-chat';

/** Open his chat; with a question, he answers it straight away */
export function openGuideChat(question?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT, { detail: { question } }));
}
