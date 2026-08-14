export type WithoutUndefined<T extends object> = {
  [Key in keyof T]?: Exclude<T[Key], undefined>;
};

export function omitUndefined<T extends object>(value: T): WithoutUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as WithoutUndefined<T>;
}
