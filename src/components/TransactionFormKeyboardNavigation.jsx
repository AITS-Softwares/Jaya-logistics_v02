"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NAVIGABLE_FIELD_SELECTOR = [
  "input:not([type='hidden']):not([type='file']):not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
].join(",");

function isVisible(element) {
  return element.getClientRects().length > 0 && !element.closest("[aria-hidden='true']");
}

function focusAdjacentField(scope, currentField, direction) {
  const fields = Array.from(scope.querySelectorAll(NAVIGABLE_FIELD_SELECTOR)).filter(isVisible);
  const currentIndex = fields.indexOf(currentField);
  const nextField = fields[currentIndex + direction];

  if (nextField) {
    nextField.focus({ preventScroll: true });
    nextField.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function handleTableKeyboardNavigation(event) {
  if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
  if (!target.matches(NAVIGABLE_FIELD_SELECTOR) || target instanceof HTMLTextAreaElement) return;

  if (event.key === "Enter") {
    event.preventDefault();
    focusAdjacentField(event.currentTarget, target, 1);
    return;
  }

  const canGoBack = target instanceof HTMLSelectElement || (
    target instanceof HTMLInputElement && target.selectionStart === 0 && target.selectionEnd === 0
  );
  if (event.key === "Backspace" && target.value === "" && canGoBack) {
    event.preventDefault();
    focusAdjacentField(event.currentTarget, target, -1);
  }
}

export function TransactionKeyboardTable({ children, onKeyDown, ...tableProps }) {
  return (
    <table
      {...tableProps}
      data-transaction-keyboard-table="true"
      onKeyDown={(event) => {
        handleTableKeyboardNavigation(event);
        onKeyDown?.(event);
      }}
    >
      {children}
    </table>
  );
}

export function useKeyboardDropdown({ isOpen, options, open, close, onSelect }) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    if (!isOpen) setHighlightedIndex(-1);
  }, [isOpen]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) open?.();
      if (!options.length) return;
      setHighlightedIndex((index) => event.key === "ArrowDown"
        ? (index + 1) % options.length
        : (index <= 0 ? options.length - 1 : index - 1));
      return;
    }

    if (event.key === "Enter" && isOpen && options.length) {
      event.preventDefault();
      onSelect?.(options[highlightedIndex >= 0 ? highlightedIndex : 0]);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close?.();
    }
  }, [close, highlightedIndex, isOpen, onSelect, open, options]);

  return { highlightedIndex, handleKeyDown };
}

/**
 * Provides the Order Panel's Enter/empty-Backspace navigation without
 * overriding browser text editing, textarea line breaks, or dropdown controls.
 * Searchable dropdowns opt in with data-keyboard-* attributes.
 */
export default function TransactionFormKeyboardNavigation({ children }) {
  const containerRef = useRef(null);

  const focusAdjacentInForm = useCallback((currentField, direction) => {
    if (containerRef.current) focusAdjacentField(containerRef.current, currentField, direction);
  }, []);

  const handleKeyDownCapture = useCallback((event) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (!target.matches(NAVIGABLE_FIELD_SELECTOR)) return;

    // Tables have their own field map, matching the Order Panel behavior.
    if (target.closest("[data-transaction-keyboard-table]")) return;

    const dropdown = target.closest("[data-keyboard-dropdown]");
    const isManagedDropdown = dropdown?.hasAttribute("data-managed-keyboard-dropdown");
    const managedOptions = isManagedDropdown
      ? dropdown.querySelectorAll("[data-keyboard-option]")
      : [];
    if (
      isManagedDropdown &&
      (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Escape" ||
        (event.key === "Enter" && managedOptions.length > 0))
    ) return;
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
      focusAdjacentInForm(target, 1);
      return;
    }

    if (
      event.key === "Backspace" &&
      (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) &&
      target.value === "" &&
      target.selectionStart === 0 &&
      target.selectionEnd === 0
    ) {
      event.preventDefault();
      focusAdjacentInForm(target, -1);
    }
  }, [focusAdjacentInForm]);

  return (
    <div ref={containerRef} onKeyDownCapture={handleKeyDownCapture}>
      {children}
    </div>
  );
}
