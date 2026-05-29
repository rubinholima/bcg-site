function appendFormValue(form: FormData, value: unknown, key: string): void {
  if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof File)) {
    for (const [childKey, childVal] of Object.entries(value as Record<string, unknown>)) {
      appendFormValue(form, childVal, `${key}[${childKey}]`);
    }
    return;
  }
  if (value instanceof Date) {
    const mm = `0${value.getMonth() + 1}`.slice(-2);
    const dd = `0${value.getDate()}`.slice(-2);
    form.append(key, `${value.getFullYear()}-${mm}-${dd}`);
    return;
  }
  if (value === undefined) return;
  form.append(key, value === null ? '' : String(value));
}

export function toBeatscodeFormData(payload: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    appendFormValue(form, value, key);
  }
  return form;
}
