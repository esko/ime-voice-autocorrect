import type { UserLearningData } from "@input-assist/autocorrect-core";
import { USER_LEARNING_KEY } from "./storage/userModelStore.js";
import {
  normalizeLearningData,
  removeEntry,
  toView,
  type LearnedCategory,
} from "./options/learnedData.js";

/**
 * Options page: lets the user inspect and selectively remove what the engine has
 * learned — chiefly rejected corrections (an undone correction is never
 * auto-applied again, so an accidental undo permanently demotes a typo until it
 * is removed here). Edits write chrome.storage.local; the service worker watches
 * that key and updates the live engine immediately.
 */

async function load(): Promise<UserLearningData> {
  const result = await chrome.storage.local.get(USER_LEARNING_KEY);
  return normalizeLearningData(result[USER_LEARNING_KEY]);
}

async function save(data: UserLearningData): Promise<void> {
  await chrome.storage.local.set({ [USER_LEARNING_KEY]: data });
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.className = "remove";
  el.textContent = label;
  el.addEventListener("click", onClick);
  return el;
}

function row(text: string, removeLabel: string, onRemove: () => void): HTMLLIElement {
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.className = "entry";
  span.textContent = text;
  li.append(span, button(removeLabel, onRemove));
  return li;
}

function section(
  title: string,
  hint: string,
  items: HTMLLIElement[],
  emptyText: string,
): HTMLElement {
  const wrap = document.createElement("section");
  const h = document.createElement("h2");
  h.textContent = title;
  const p = document.createElement("p");
  p.className = "hint";
  p.textContent = hint;
  wrap.append(h, p);
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = emptyText;
    wrap.append(empty);
  } else {
    const ul = document.createElement("ul");
    ul.append(...items);
    wrap.append(ul);
  }
  return wrap;
}

async function init(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }

  const render = async (): Promise<void> => {
    const data = await load();
    const view = toView(data);
    root.replaceChildren();

    const remove = (category: LearnedCategory, key: string) => async () => {
      await save(removeEntry(data, category, key));
      await render();
    };

    root.append(
      section(
        "Won’t auto-correct (undone)",
        "These corrections were undone, so they are only suggested, never applied automatically. Remove one to let it auto-correct again.",
        view.rejected.map((pair) =>
          row(`${pair.original} → ${pair.replacement}`, "Re-enable", remove("rejected", pair.key)),
        ),
        "Nothing here — no corrections have been undone.",
      ),
      section(
        "Learned corrections (accepted)",
        "Corrections you have accepted. Removing one just forgets that you accepted it.",
        view.accepted.map((pair) =>
          row(`${pair.original} → ${pair.replacement}`, "Forget", remove("accepted", pair.key)),
        ),
        "Nothing here yet.",
      ),
      section(
        "Kept words (never corrected)",
        "Words you have added/accepted, treated as correctly spelled.",
        view.words.map((entry) => row(entry.word, "Forget", remove("words", entry.word))),
        "Nothing here yet.",
      ),
    );
  };

  await render();
}

void init();
