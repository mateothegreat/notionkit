# Validation

> [!NOTE]
> <https://developers.notion.com/reference/request-limits#size-limits>

## Validation rules

- `string<=100` means a string with a maximum length of 100 characters.
- `string>=100` means a string with a minimum length of 100 characters.
- `string<=100>=10` means a string with a maximum length of 100 characters and a minimum length of 10 characters.
- `string<=100>=10` means a string with a maximum length of 100 characters and a minimum length of 10 characters.
| Property value type | Inner property | Size limit |
| ------------------- | -------------- | ---------- |
| Rich text object | text.content | 2000 characters |
| Rich text object | text.link.url | 2000 characters |
| Rich text object | equation.expression | 1000 characters |
| Any array of all block types, including rich text objects | | 100 elements |
| Any URL | | 2000 characters |
| Any email | | 200 characters |
| Any phone number | | 200 characters |
| Any multi-select | | 100 options |
| Any relation | | 100 related pages |
| Any people | | 100 users |
