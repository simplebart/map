import { useState, useCallback, useEffect, useRef } from 'react'
import NavBar    from './components/NavBar.jsx'
import Section   from './components/Section.jsx'
import AddFeed   from './components/AddFeed.jsx'
import { FeatureTile, PanelTile, SmallCard } from './components/Cards.jsx'
import { useStore }  from './useStore.js'
import { useFeed, groupBySection } from './useFeed.js'
import { greeting, dateLabel, diverseSection } from './utils.js'
import { USER_NAME, PAGE_SIZE, SECTION_SIZE, MAX_PER_SOURCE } from './config.js'
import './App.css'

const GROUPED_VIEWS = ['today', 'all', 'calm']

export default function App() {
  const { feeds, calm, starred, read, setCalm, toggleStar, markRead, addFeed, removeFeed } = useStore()
  const [view,        setView]        = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [addOpen,     setAddOpen]     = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [visibleSecs, setVisibleSecs] = useState(PAGE_SIZE)
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 768)
  const sentinelRef = useRef(null)

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const fn = e => setIsMobile(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // Reset visible sections on view change
  useEffect(() => { setVisibleSecs(PAGE_SIZE) }, [view])

  // Fetch articles
  const { articles, loading } = useFeed(feeds, view, calm)

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleSecs(s => s + PAGE_SIZE)
    }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [articles])

  // Filter by search
  const filtered = searchQuery
    ? articles.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : articles

  // Filter saved
  const displayed = view === 'saved' ? filtered.filter(a => starred.has(a.id)) : filtered

  // Group by section for grouped views
  const isGrouped = GROUPED_VIEWS.includes(view) && !searchQuery
  const sections  = isGrouped ? groupBySection(displayed) : null
  const sectionKeys = sections ? [...sections.keys()].slice(0, visibleSecs) : []
  const hasMore   = sections ? sectionKeys.length < [...sections.keys()].length : false

  const handleNav = useCallback(v => {
    // Only lowercase the built-in views, preserve section names
    const builtIn = ['today', 'all', 'calm', 'saved']
    const normalized = builtIn.includes(v.toLowerCase()) ? v.toLowerCase() : v
    setView(normalized)
    setSearchQuery('')
    setAddOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSectionNav = useCallback(section => {
    setView(section)
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const now = new Date()
  const h   = now.getHours()

  return (
    <>
      {/* Mobile nav bar */}
      <NavBar
        view={view}
        onNav={handleNav}
        onAdd={() => setAddOpen(o => !o)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <main className="app">
        {/* Desktop sidebar nav */}
        <div className="desktop-layout">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <span className="sidebar-mark">✦</span>
              <span className="sidebar-title">Aurora</span>
            </div>
            <nav className="sidebar-nav">
              {['today','calm','saved'].map(v => (
                <button key={v} className={`sidebar-item${view===v?' active':''}`} onClick={() => handleNav(v)}>
                  {v.charAt(0).toUpperCase()+v.slice(1)}
                </button>
              ))}
              <div className="sidebar-divider" />
              {Object.keys(feeds).map(s => (
                <button key={s} className={`sidebar-item${view===s?' active':''}`} onClick={() => handleNav(s)}>
                  {s}
                </button>
              ))}
            </nav>
            <button className="sidebar-add" onClick={() => setAddOpen(o => !o)}>+ Add feed</button>
            <button className="sidebar-add" style={{marginTop:'.3rem'}} onClick={() => setSettingsOpen(o => !o)}>⚙ Settings</button>
          </aside>

          <div className="main-content">
            {renderMain()}
          </div>
        </div>
      </main>
    </>
  )

  function renderMain() {
    return (
      <>
        {/* Masthead */}
        <header className="masthead">
          <div className="masthead-greet">
            <span className="masthead-pre">{greeting()}</span>{' '}
            <span className="masthead-name">{USER_NAME}</span>
          </div>
          <div className="masthead-meta">
            {view.charAt(0).toUpperCase()+view.slice(1)} · {dateLabel()} · {displayed.length} stories
          </div>
          <div className="masthead-rule" />
        </header>

        {/* Add feed panel */}
        {addOpen && (
          <AddFeed
            feeds={feeds}
            onAdd={(sec, name, url) => { addFeed(sec, name, url) }}
            onRemove={(sec, name) => { removeFeed(sec, name) }}
            onClose={() => setAddOpen(false)}
          />
        )}

        {/* Settings panel */}
        {settingsOpen && (
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        )}

        {/* Search bar (desktop only, mobile is in NavBar) */}
        {!isMobile && (
          <div className="desktop-search">
            <input
              className="desktop-search-input"
              placeholder="Search headlines…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" />)}
          </div>
        )}

        {/* Content */}
        {!loading && displayed.length === 0 && (
          <div className="empty">
            <div className="empty-title">Nothing here</div>
            <p>{view==='saved' ? 'Save articles by tapping ☆ — they appear here.' : 'Try a different view or refresh.'}</p>
          </div>
        )}

        {!loading && isGrouped && sectionKeys.map((sec, i) => (
          <Section
            key={sec}
            title={sec}
            articles={sections.get(sec)}
            starred={starred}
            read={read}
            onRead={markRead}
            onStar={toggleStar}
            onNav={handleSectionNav}
            isMobile={isMobile}
            isFirst={i === 0}
          />
        ))}

        {/* Single section or search results */}
        {!loading && !isGrouped && displayed.length > 0 && (
          <SingleView
            articles={displayed}
            starred={starred}
            read={read}
            onRead={markRead}
            onStar={toggleStar}
            isMobile={isMobile}
            view={view}
            onBack={() => handleNav('today')}
          />
        )}

        {/* Infinite scroll sentinel */}
        {(hasMore || (!isGrouped && displayed.length > 30)) && (
          <div ref={sentinelRef} style={{ height: 1 }} />
        )}
      </>
    )
  }
}

// ─── Single section / search view ────────────────────────────────────────
function SingleView({ articles, starred, read, onRead, onStar, isMobile, view, onBack }) {
  const [page, setPage] = useState(1)
  const sentinelRef = useRef(null)
  const perPage = 30

  useEffect(() => { setPage(1) }, [view])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(e => {
      if (e[0].isIntersecting) setPage(p => p + 1)
    }, { rootMargin: '400px' })
    io.observe(el); return () => io.disconnect()
  }, [])

  const visible = articles.slice(0, perPage * page)
  const hasMore = visible.length < articles.length

  if (isMobile) {
    // Mobile: Google News layout in single section
    const items = visible
    const hero  = items[0]
    const rest  = items.slice(1)
    return (
      <div>
        <button className="back-btn" onClick={onBack}>← Today</button>
        {hero && (
          <Section
            title=""
            articles={items}
            starred={starred} read={read} onRead={onRead} onStar={onStar}
            onNav={() => {}} isMobile={true} isFirst={true}
          />
        )}
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
      </div>
    )
  }

  // Desktop: magazine pattern
  const cover = visible.find(a => a.image) || visible[0]
  const rest  = visible.filter(a => a !== cover)
  const PATTERN = ['trio','trio','band','trio','pair','trio']

  const BigTile = ({ a, sz }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
      {a.image
        ? <FeatureTile article={a} size={sz} starred={starred.has(a.id)} read={read.has(a.id)} onRead={onRead} />
        : <PanelTile   article={a} size={sz} starred={starred.has(a.id)} read={read.has(a.id)} onRead={onRead} />
      }
      <button className="save-btn" onClick={() => onStar(a.id)}>{starred.has(a.id)?'★ Saved':'☆ Save'}</button>
    </div>
  )

  let i = 0, p = 0
  const rows = []
  if (cover) rows.push(<BigTile key={cover.id} a={cover} sz="cover" />)

  while (i < rest.length) {
    const block = PATTERN[p % PATTERN.length]; p++
    const left  = rest.length - i
    if (left <= 2) {
      if (left === 1) rows.push(<BigTile key={rest[i].id} a={rest[i]} sz="mid" />)
      else rows.push(
        <div key={i} className="desktop-pair">
          <SmallCard article={rest[i]}   starred={starred.has(rest[i].id)}   read={read.has(rest[i].id)}   onRead={onRead} onStar={onStar} />
          <SmallCard article={rest[i+1]} starred={starred.has(rest[i+1].id)} read={read.has(rest[i+1].id)} onRead={onRead} onStar={onStar} />
        </div>
      )
      i += left; break
    }
    if (block === 'band') { rows.push(<BigTile key={rest[i].id} a={rest[i]} sz="mid" />); i++ }
    else if (block === 'pair') {
      rows.push(
        <div key={i} className="desktop-pair">
          <BigTile a={rest[i]} sz="mid" /><BigTile a={rest[i+1]} sz="mid" />
        </div>
      ); i += 2
    } else {
      const chunk = rest.slice(i, i+3)
      rows.push(
        <div key={i} className="desktop-smalls" style={{ gridTemplateColumns:`repeat(${chunk.length},1fr)` }}>
          {chunk.map(a => <SmallCard key={a.id} article={a} starred={starred.has(a.id)} read={read.has(a.id)} onRead={onRead} onStar={onStar} />)}
        </div>
      ); i += 3
    }
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Today</button>
      <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
        {rows}
      </div>
      {hasMore && <div ref={sentinelRef} style={{ height:1 }} />}
    </div>
  )
}

// ─── Settings panel ───────────────────────────────────────────────────────
function SettingsPanel({ onClose }) {
  const [gistId,    setGistId]    = useState(localStorage.getItem('aurora_gist_id') || '')
  const [token,     setToken]     = useState(localStorage.getItem('aurora_gist_token') || '')
  const [saved,     setSaved]     = useState(false)

  function handleSave(e) {
    e.preventDefault()
    if (gistId.trim()) localStorage.setItem('aurora_gist_id', gistId.trim())
    if (token.trim())  localStorage.setItem('aurora_gist_token', token.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1000)
  }

  function handleClear() {
    localStorage.removeItem('aurora_gist_id')
    localStorage.removeItem('aurora_gist_token')
    setGistId(''); setToken('')
  }

  return (
    <div className="settings-panel fade-in">
      <div className="settings-header">
        <span className="settings-title">⚙ Settings</span>
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>
      <p className="settings-desc">Connect a GitHub Gist to sync feeds and saved articles across devices.</p>
      <form onSubmit={handleSave} className="settings-form">
        <label>Gist ID</label>
        <input value={gistId} onChange={e => setGistId(e.target.value)} placeholder="c76dfae126668ed461ef519d3df9c5d6" />
        <label>GitHub Token</label>
        <input value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_..." type="password" />
        <div className="settings-btns">
          <button type="submit" className="settings-save">{saved ? 'Saved ✓' : 'Save'}</button>
          <button type="button" className="settings-clear" onClick={handleClear}>Clear</button>
        </div>
      </form>
    </div>
  )
}
