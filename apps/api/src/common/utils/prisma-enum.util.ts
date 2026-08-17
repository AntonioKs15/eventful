export function castPrismaEnum<T extends string>(value: string): T {
  return value as T;
}
