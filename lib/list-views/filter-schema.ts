export const LIST_VIEW_RESOURCES = ["PEOPLE", "HOUSEHOLDS"] as const;

export type ListViewResource = (typeof LIST_VIEW_RESOURCES)[number];

export const FILTER_FIELD_TYPES = [
  "BOOLEAN",
  "DATE",
  "ENUM",
  "ID",
  "MONEY",
  "NUMBER",
  "STRING",
] as const;

export type FilterFieldType = (typeof FILTER_FIELD_TYPES)[number];

export const FILTER_OPERATORS = [
  "AFTER",
  "BEFORE",
  "BETWEEN",
  "CONTAINS",
  "EQUALS",
  "EXISTS",
  "GREATER_THAN",
  "IN",
  "LESS_THAN",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export type RelativeDateValue = {
  amount: number;
  unit: "DAYS" | "MONTHS";
};

export type FilterValue =
  | boolean
  | number
  | string
  | null
  | RelativeDateValue
  | FilterValue[];

export type FilterCondition = {
  field: string;
  operator: FilterOperator;
  type: "condition";
  value?: FilterValue;
};

export type FilterGroup = {
  conditions: FilterNode[];
  mode: "all" | "any";
  type: "group";
};

export type FilterNode = FilterCondition | FilterGroup;

export type FilterDefinition = FilterGroup;

export type FilterFieldDefinition = {
  fieldType: FilterFieldType;
  id: string;
  label: string;
  operators: FilterOperator[];
  permission?: string;
  resource: ListViewResource;
};

export type FilterValidationError = {
  code:
    | "EMPTY_GROUP"
    | "FORBIDDEN_FIELD"
    | "INVALID_FIELD"
    | "INVALID_GROUP"
    | "INVALID_OPERATOR"
    | "INVALID_VALUE"
    | "TOO_DEEP";
  message: string;
  path: string;
};

export type FilterValidationResult =
  | {
      definition: FilterDefinition;
      ok: true;
    }
  | {
      errors: FilterValidationError[];
      ok: false;
    };

const OPERATORS_BY_FIELD_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  BOOLEAN: ["EQUALS", "EXISTS"],
  DATE: ["AFTER", "BEFORE", "BETWEEN", "EXISTS"],
  ENUM: ["EQUALS", "IN", "EXISTS"],
  ID: ["EQUALS", "IN", "EXISTS"],
  MONEY: ["BETWEEN", "EQUALS", "GREATER_THAN", "LESS_THAN", "EXISTS"],
  NUMBER: ["BETWEEN", "EQUALS", "GREATER_THAN", "LESS_THAN", "EXISTS"],
  STRING: ["CONTAINS", "EQUALS", "EXISTS"],
};

const FINANCE_FIELD_HINTS = [
  "amount",
  "change",
  "gift",
  "given",
  "total",
] as const;

export function createEmptyFilter(): FilterDefinition {
  return {
    conditions: [],
    mode: "all",
    type: "group",
  };
}

export function validateFilterDefinition(
  input: unknown,
  catalog: FilterFieldDefinition[],
  options: {
    maxDepth?: number;
  } = {},
): FilterValidationResult {
  const errors: FilterValidationError[] = [];
  const fieldCatalog = new Map(catalog.map((field) => [field.id, field]));
  const maxDepth = options.maxDepth ?? 3;

  if (!isRecord(input) || input.type !== "group") {
    return {
      errors: [
        {
          code: "INVALID_GROUP",
          message: "Filter definition must be a group.",
          path: "$",
        },
      ],
      ok: false,
    };
  }

  validateGroup(input, {
    depth: 0,
    errors,
    fieldCatalog,
    maxDepth,
    path: "$",
  });

  if (errors.length > 0) {
    return {
      errors,
      ok: false,
    };
  }

  return {
    definition: input as FilterDefinition,
    ok: true,
  };
}

export function operatorsForFieldType(fieldType: FilterFieldType) {
  return OPERATORS_BY_FIELD_TYPE[fieldType];
}

function validateGroup(
  input: Record<string, unknown>,
  context: {
    depth: number;
    errors: FilterValidationError[];
    fieldCatalog: Map<string, FilterFieldDefinition>;
    maxDepth: number;
    path: string;
  },
) {
  const { depth, errors, maxDepth, path } = context;

  if (depth > maxDepth) {
    errors.push({
      code: "TOO_DEEP",
      message: `Filter groups can be nested up to ${maxDepth} levels deep.`,
      path,
    });
    return;
  }

  if (input.mode !== "all" && input.mode !== "any") {
    errors.push({
      code: "INVALID_GROUP",
      message: "Filter group mode must be all or any.",
      path: `${path}.mode`,
    });
  }

  if (!Array.isArray(input.conditions)) {
    errors.push({
      code: "INVALID_GROUP",
      message: "Filter group conditions must be an array.",
      path: `${path}.conditions`,
    });
    return;
  }

  if (depth > 0 && input.conditions.length === 0) {
    errors.push({
      code: "EMPTY_GROUP",
      message: "Nested filter groups must include at least one condition.",
      path: `${path}.conditions`,
    });
  }

  input.conditions.forEach((condition, index) => {
    const conditionPath = `${path}.conditions[${index}]`;

    if (!isRecord(condition)) {
      errors.push({
        code: "INVALID_GROUP",
        message: "Filter entries must be groups or conditions.",
        path: conditionPath,
      });
      return;
    }

    if (condition.type === "group") {
      validateGroup(condition, {
        ...context,
        depth: depth + 1,
        path: conditionPath,
      });
      return;
    }

    validateCondition(condition, {
      ...context,
      path: conditionPath,
    });
  });
}

function validateCondition(
  input: Record<string, unknown>,
  context: {
    errors: FilterValidationError[];
    fieldCatalog: Map<string, FilterFieldDefinition>;
    path: string;
  },
) {
  const { errors, fieldCatalog, path } = context;

  if (input.type !== "condition") {
    errors.push({
      code: "INVALID_GROUP",
      message: "Filter entry type must be group or condition.",
      path: `${path}.type`,
    });
    return;
  }

  if (typeof input.field !== "string") {
    errors.push({
      code: "INVALID_FIELD",
      message: "Filter condition field must be a string.",
      path: `${path}.field`,
    });
    return;
  }

  const field = fieldCatalog.get(input.field);

  if (!field) {
    errors.push({
      code: looksLikeFinanceField(input.field)
        ? "FORBIDDEN_FIELD"
        : "INVALID_FIELD",
      message: `Filter field ${input.field} is not available.`,
      path: `${path}.field`,
    });
    return;
  }

  if (!isFilterOperator(input.operator)) {
    errors.push({
      code: "INVALID_OPERATOR",
      message: "Filter condition operator is not supported.",
      path: `${path}.operator`,
    });
    return;
  }

  if (!field.operators.includes(input.operator)) {
    errors.push({
      code: "INVALID_OPERATOR",
      message: `Operator ${input.operator} is not supported for ${field.id}.`,
      path: `${path}.operator`,
    });
    return;
  }

  if (!valueMatchesOperator(input.value, input.operator, field.fieldType)) {
    errors.push({
      code: "INVALID_VALUE",
      message: `Value does not match ${field.fieldType} ${input.operator} filter.`,
      path: `${path}.value`,
    });
  }
}

function valueMatchesOperator(
  value: unknown,
  operator: FilterOperator,
  fieldType: FilterFieldType,
) {
  if (operator === "EXISTS") {
    return typeof value === "boolean";
  }

  if (operator === "IN") {
    return (
      Array.isArray(value) &&
      value.every((item) => valueMatchesType(item, fieldType))
    );
  }

  if (operator === "BETWEEN") {
    return (
      Array.isArray(value) &&
      value.length === 2 &&
      value.every((item) => valueMatchesType(item, fieldType))
    );
  }

  return valueMatchesType(value, fieldType);
}

function valueMatchesType(value: unknown, fieldType: FilterFieldType): boolean {
  if (isRelativeDateValue(value)) {
    return fieldType === "DATE";
  }

  switch (fieldType) {
    case "BOOLEAN":
      return typeof value === "boolean";
    case "DATE":
    case "ENUM":
    case "ID":
    case "MONEY":
    case "STRING":
      return typeof value === "string" && value.trim().length > 0;
    case "NUMBER":
      return typeof value === "number" && Number.isFinite(value);
  }
}

function isFilterOperator(value: unknown): value is FilterOperator {
  return (
    typeof value === "string" &&
    FILTER_OPERATORS.includes(value as FilterOperator)
  );
}

function looksLikeFinanceField(field: string) {
  const normalizedField = field.toLowerCase();

  return FINANCE_FIELD_HINTS.some((hint) => normalizedField.includes(hint));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRelativeDateValue(value: unknown): value is RelativeDateValue {
  return (
    isRecord(value) &&
    typeof value.amount === "number" &&
    Number.isInteger(value.amount) &&
    value.amount > 0 &&
    (value.unit === "DAYS" || value.unit === "MONTHS")
  );
}
