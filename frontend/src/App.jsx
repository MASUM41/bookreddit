import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import BookPage from './pages/BookPage'
import CreatePostPage from './pages/CreatePostPage'
import SearchPage from './pages/SearchPage'
import GenrePage from './pages/GenrePage'
import PopularPage from './pages/PopularPage'
import PostPage from './pages/PostPage'
import ProfilePage from './pages/ProfilePage'
import BookmarksPage from './pages/BookmarksPage'
import ReadNextPage from './pages/ReadNextPage'
import OnboardingPage from './pages/OnboardingPage'
import CoverDemoPage from './pages/CoverDemoPage'
import OnboardingGate from './components/OnboardingGate'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <OnboardingGate>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/books/:bookId" element={<BookPage />} />
          <Route path="/create-post" element={<CreatePostPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/genre/:slug" element={<GenrePage />} />
          <Route path="/popular" element={<PopularPage />} />
          <Route path="/posts/:postId" element={<PostPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/read-next" element={<ReadNextPage />} />
            <Route path="/cover-demo" element={<CoverDemoPage />} />
          </Routes>
        </OnboardingGate>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
