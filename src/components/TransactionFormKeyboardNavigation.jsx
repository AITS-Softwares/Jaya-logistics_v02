"use client";

import { useCallback, useRef } from "react";

const EDITABLE_FIELD_SELECTOR = [
  "input:not([type='hidden']):not([type='file']):not([disabled]):not([readonly])",
  "select:not([disabled])",
  "textarea:not([disabled]):not([readonly])",
].join(",");

function isVisible(element) {
  return element.getClientRects().length > 0 && !element.closest("[aria-hidden='true']");
}

/**
 * Provides the Order Panel's Enter/empty-Backspace navigation without
 * overriding browser text editing, textarea line breaks, or dropdown controls.
 * Searchable dropdowns opt in with data-keyboard-* attributes.
 */
export default function TransactionFormKeyboardNavigation({ children }) {
  const containerRef = useRef(null);

  const focusAdjacentField = useCallback((currentField, direction) => {
    const fields = Array.from(
      containerRef.current?.querySelectorAll(EDITABLE_FIELD_SELECTOR) || []
    ).filter(isVisible);
    const currentIndex = fields.indexOf(currentField);
    const nextField = fields[currentIndex + direction];

    if (nextField) {
      nextField.focus({ preventScroll: true });
      nextField.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, []);

  const handleKeyDownCapture = useCallback((event) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (!target.matches(EDITABLE_FIELD_SELECTOR)) return;

    const dropdown = target.closest("[data-keyboard-dropdown]");
    const dropdownOptions = dropdown
      ? Array.from(dropdown.querySelectorAll("[data-keyboard-option]"))
      : [];

    if (dropdownOptions.length > 0) {
      const storedActiveIndex = dropdown.dataset.keyboardActiveIndex;
      const activeIndex = storedActiveIndex === undefined ? -1 : Number(storedActiveIndex);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = activeIndex < 0
          ? (direction > 0 ? 0 : dropdownOptions.length - 1)
          : (activeIndex + direction + dropdownOptions.length) % dropdownOptions.length;
        dropdown.dataset.keyboardActiveIndex = String(nextIndex);
        dropdownOptions.forEach((option, index) => {
          option.dataset.keyboardActive = String(index === nextIndex);
          option.setAttribute("aria-selected", String(index === nextIndex));
        });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const option = dropdownOptions[Math.min(activeIndex, dropdownOptions.length - 1)];
        option?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
        return;
      }
    }

    if (event.key === "Escape" && dropdown) {
      target.blur();
      return;
    }

    // Textareas retain their normal Enter behavior for multi-line remarks.
    if (target instanceof HTMLTextAreaElement) return;

    if (event.key === "Enter") {
      event.preventDefault();
      focusAdjacentField(target, 1);
      return;
    }

    if (
      event.key === "Backspace" &&
      target instanceof HTMLInputElement &&
      target.value === "" &&
      target.selectionStart === 0 &&
      target.selectionEnd === 0
    ) {
      event.preventDefault();
      focusAdjacentField(target, -1);
    }
  }, [focusAdjacentField]);

  return (
    <div ref={containerRef} onKeyDownCapture={handleKeyDownCapture}>
      {children}
    </div>
  );
}
