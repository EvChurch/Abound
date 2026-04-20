"use client";

import { useRef } from "react";

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

  return (
    <input
      className={className}
      defaultValue={defaultValue}
      name={name}
      onChange={(event) => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }

        const form = event.currentTarget.form;

        timeoutRef.current = window.setTimeout(() => {
          form?.requestSubmit();
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
  return (
    <select
      className={className}
      defaultValue={defaultValue}
      name={name}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function AutoSubmitChoice({
  className,
  defaultChecked,
  name,
  type,
  value,
}: ChoiceProps) {
  return (
    <input
      className={className}
      defaultChecked={defaultChecked}
      name={name}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      type={type}
      value={value}
    />
  );
}
