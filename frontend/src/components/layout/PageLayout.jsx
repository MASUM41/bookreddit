/**
 * Reddit-style three-column page shell.
 * Left nav · center feed · optional right rail (xl+).
 */
export default function PageLayout({
  left,
  right,
  mobileLeft = null,
  children,
  mainClassName = '',
}) {
  return (
    <div className="min-h-screen bg-reddit-bg">
      <div className="max-w-[1280px] mx-auto px-2 sm:px-4 py-2.5 sm:py-4 flex gap-5">
        {left && (
          <aside className="hidden lg:block w-[272px] shrink-0 sticky top-[52px] self-start max-h-[calc(100vh-64px)] overflow-y-auto">
            {left}
          </aside>
        )}

        <main className={`flex-1 min-w-0 max-w-[740px] mx-auto lg:mx-0 ${mainClassName}`}>
          {mobileLeft && (
            <div className="lg:hidden mb-3">
              {mobileLeft}
            </div>
          )}
          {children}
        </main>

        {right && (
          <aside className="hidden xl:block w-[312px] shrink-0 sticky top-[52px] self-start max-h-[calc(100vh-64px)] overflow-y-auto">
            {right}
          </aside>
        )}
      </div>
    </div>
  )
}
