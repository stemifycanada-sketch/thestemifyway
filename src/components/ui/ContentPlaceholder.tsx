export function ContentPlaceholder({ children }: { children: string }) {
  return <p className="content-placeholder"><span className="placeholder-marker" aria-hidden="true" />{children}</p>
}
