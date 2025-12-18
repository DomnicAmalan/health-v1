import type { FieldType } from "@lazarus-life/ui-components";
import type { FieldCategoryItem } from "./types";

export const FIELD_CATEGORIES: Record<string, FieldCategoryItem[]> = {
  "Field Elements": [
    { type: "text" as FieldType, label: "Input", icon: "📝" },
    { type: "textarea" as FieldType, label: "Textarea", icon: "📄" },
    { type: "email" as FieldType, label: "Email", icon: "✉️" },
    { type: "number" as FieldType, label: "Number", icon: "🔢" },
    { type: "date" as FieldType, label: "Date", icon: "📅" },
    { type: "select" as FieldType, label: "Select", icon: "📋" },
    { type: "checkbox" as FieldType, label: "Checkbox", icon: "☐" },
    { type: "radio" as FieldType, label: "Radio", icon: "🔘" },
    { type: "file" as FieldType, label: "File", icon: "📎" },
  ],
  "Display Elements": [
    { type: "display-text" as FieldType, label: "Text", icon: "📝" },
    { type: "separator" as FieldType, label: "Separator", icon: "➖" },
    { type: "image" as FieldCategoryItem["type"], label: "Image/Logo", icon: "🖼️" },
  ],
  "Shapes & Lines": [
    { type: "line-horizontal" as FieldCategoryItem["type"], label: "Horizontal Line", icon: "➖" },
    { type: "line-vertical" as FieldCategoryItem["type"], label: "Vertical Line", icon: "|" },
    { type: "box" as FieldCategoryItem["type"], label: "Box", icon: "▦" },
  ],
  Containers: [
    { type: "group" as FieldCategoryItem["type"], label: "Group", icon: "📦" },
    { type: "section" as FieldCategoryItem["type"], label: "Section", icon: "📑" },
  ],
};
