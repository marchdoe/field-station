const PROTECTED_PATH_SEGMENTS = ['/plugins/cache/']

export function isUserOwned(filePath: string): boolean {
  return !PROTECTED_PATH_SEGMENTS.some((segment) => filePath.includes(segment))
}
