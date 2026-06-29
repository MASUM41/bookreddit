import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function JoinSidebar() {
  return (
    <div className="bg-br-surface border border-reddit-border rounded-2xl overflow-hidden">
      <div className="p-4">
        <h2 className="text-lg font-bold text-br-text leading-snug mb-1">
          Join the bookish corner of the internet
        </h2>
        <p className="text-xs text-br-text-muted mb-4 leading-relaxed">
          Rate books, save picks, and discuss what you&apos;re reading with readers who share your taste.
        </p>

        <div className="flex flex-col gap-2">
          <Link
            to="/signup"
            className="w-full text-center bg-reddit-muted text-br-text rounded-full py-2.5
                       text-sm font-bold hover:bg-br-elevated transition-colors"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="w-full text-center bg-reddit-orange text-white rounded-full py-2.5
                       text-sm font-bold hover:bg-orange-600 transition-colors"
          >
            Log In
          </Link>
        </div>

        <p className="text-[10px] text-br-text-muted mt-3 leading-relaxed">
          By continuing, you agree to our community guidelines and discover books through real discussion.
        </p>
      </div>

      <div className="h-28 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-sky-500/15 flex items-end justify-center pb-3">
        <BookOpen size={40} className="text-orange-400 opacity-80" />
      </div>
    </div>
  )
}
