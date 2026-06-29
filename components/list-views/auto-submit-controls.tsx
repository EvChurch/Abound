"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, type ReactNode } from "react";

import { CustomSelect } from "@/components/ui/custom-select";

type InputProps = {
  className: string;
  defaultValue?: string;
  name: string;
  placeholder?: string;
};

type SelectProps = {
  ariaLabel?: string;
  className: string;
  defaultValue?: string;
  hideChevron?: boolean;
  hideSelectedLabel?: boolean;
  menuClassName?: string;
  name: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  rootClassName?: string;
  submittedValue?: (value: string) => string;
  title?: string;
  triggerIcon?: ReactNode;
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
  ariaLabel,
  className,
  defaultValue,
  hideChevron,
  hideSelectedLabel,
  menuClassName,
  name,
  options,
  rootClassName,
  submittedValue,
  title,
  triggerIcon,
}: SelectProps) {
  const submitForm = useRouteSubmit();

  return (
    <CustomSelect
      ariaLabel={ariaLabel ?? name}
      className={className}
      defaultValue={defaultValue}
      hideChevron={hideChevron}
      hideSelectedLabel={hideSelectedLabel}
      menuClassName={menuClassName}
      name={name}
      onValueChange={(nextValue, form) =>
        submitForm(form, { [name]: submittedValue?.(nextValue) ?? nextValue })
      }
      options={options}
      rootClassName={rootClassName ?? "relative w-full"}
      title={title}
      triggerIcon={triggerIcon}
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

  return (
    form: HTMLFormElement | null,
    overrides: Record<string, string> = {},
  ) => {
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

    for (const name of Object.keys(overrides)) {
      params.delete(name);
    }

    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value !== "string" || value.length === 0) {
        continue;
      }

      params.append(key, value);
    }

    for (const [key, value] of Object.entries(overrides)) {
      if (value.length > 0) {
        params.delete(key);
        params.append(key, value);
      }
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
