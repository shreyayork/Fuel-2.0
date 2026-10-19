import {
  PATRIOT_PUBLIC_CLOSE,
  PATRIOT_PUBLIC_HEADLINE,
  PATRIOT_PUBLIC_OPENING,
  PATRIOT_PUBLIC_POSTS,
  PATRIOT_PUBLIC_QUOTE,
  PATRIOT_PUBLIC_SECTIONS,
  PATRIOT_PUBLIC_SOURCES,
  PATRIOT_PUBLIC_STATS,
} from "./patriotPublicStory";

export function PatriotPublicProfile() {
  return (
    <article className="public-profile-page">
      <header className="public-profile-mast">
        <p className="public-profile-kicker">Public profile</p>
        <h1>{PATRIOT_PUBLIC_HEADLINE}</h1>
        <p className="public-profile-meta">Oct 16, 2026 · Accounting and payroll · United States · Private</p>
      </header>

      {PATRIOT_PUBLIC_OPENING.map(paragraph => <p key={paragraph}>{paragraph}</p>)}

      <div className="public-profile-stats">
        {PATRIOT_PUBLIC_STATS.map(stat => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      {PATRIOT_PUBLIC_SECTIONS.map(section => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}

      <blockquote className="public-profile-quote">
        <p>{PATRIOT_PUBLIC_QUOTE.text}</p>
        <cite>{PATRIOT_PUBLIC_QUOTE.source}</cite>
      </blockquote>

      <section>
        <h2>The wager</h2>
        <p>{PATRIOT_PUBLIC_CLOSE}</p>
        <p className="public-profile-label">From the feed</p>
        <div className="public-profile-posts">
          {PATRIOT_PUBLIC_POSTS.map(post => (
            <a className="public-profile-post" href={post.href} key={post.href} target="_blank" rel="noreferrer">
              <time>{post.date}</time>
              <strong>{post.title}</strong>
            </a>
          ))}
        </div>
      </section>

      <footer className="public-profile-sources">
        <p>Written from the public website and the latest feed on Oct 16, 2026. Private benchmark numbers stay off this page.</p>
        <div>
          {PATRIOT_PUBLIC_SOURCES.map(source => (
            <a href={source.href} key={source.href} target="_blank" rel="noreferrer">
              {source.label}
              <span>{source.detail}</span>
            </a>
          ))}
        </div>
      </footer>
    </article>
  );
}
