"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

import { CustomSelect } from "@/components/ui/custom-select";

type InputProps = {
  className: string;
  defaultValue?: string;
  name: string;
  placeholder?: string;
};

type SelectProps = {
  className: string;
  defaultValue?: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
};

type ChoiceProps = {
  className: string;
  defaultChecked?: boolean;
  name: string;
  type: "checkbox" | "radio";
  value: string;
};

export function AutoSubmitInput({
  className,
  defaultValue,
  name,
  placeholder,
}: InputProps) {
  const timeoutRef = useRef<number | null>(null);
  const submitForm = useRouteSubmit();

  return (
    <input
      className={className}
      defaultValue={defaultValue}
      key={`${name}:${defaultValue ?? ""}`}
      name={name}
      onChange={(event) => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }

        const form = event.currentTarget.form;

        timeoutRef.current = window.setTimeout(() => {
          submitForm(form);
        }, 350);
      }}
      placeholder={placeholder}
    />
  );
}

export function AutoSubmitSelect({
  className,
  defaultValue,
  name,
  options,
}: SelectProps) {
  const submitForm = useRouteSubmit();

  return (
    <CustomSelect
      ariaLabel={name}
      className={className}
      defaultValue={defaultValue}
      name={name}
      onValueChange={(_, form) => submitForm(form)}
      options={options}
    />
  );
}

export function AutoSubmitChoice({
  className,
  defaultChecked,
  name,
  type,
  value,
}: ChoiceProps) {
  const submitForm = useRouteSubmit();

  return (
    <input
      className={className}
      defaultChecked={defaultChecked}
      name={name}
      onChange={(event) => submitForm(event.currentTarget.form)}
      type={type}
      value={value}
    />
  );
}

function useRouteSubmit() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (form: HTMLFormElement | null) => {
    if (!form) return;

    const action = form.getAttribute("action") || window.location.pathname;
    const actionPath = action.startsWith("http")
      ? new URL(action).pathname
      : action;
    const params = new URLSearchParams(searchParams.toString());

    params.delete("after");

    for (const name of formControlNames(form)) {
      params.delete(name);
    }

    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value !== "string" || value.length === 0) {
        continue;
      }

      params.append(key, value);
    }

    const query = params.toString();

    router.replace(query ? `${actionPath}?${query}` : actionPath, {
      scroll: false,
    });
  };
}

function formControlNames(form: HTMLFormElement) {
  const names = new Set<string>();

  for (const element of Array.from(form.elements)) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      if (element.name) {
        names.add(element.name);
      }
    }
  }

  return names;
}
