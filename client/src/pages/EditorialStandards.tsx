import { Helmet } from "react-helmet-async";

export default function EditorialStandards() {
  return (
    <article
      className="doc"
      style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}
    >
      <Helmet>
        <title>Editorial Standards | Chatrio</title>
        <meta
          name="description"
          content="How Chatrio's articles are researched, written, reviewed, and kept accurate — our editorial standards, sourcing policy, and correction process."
        />
        <link rel="canonical" href="https://chatrio.app/editorial-standards" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Editorial Standards | Chatrio" />
        <meta
          property="og:description"
          content="How Chatrio's articles are researched, written, reviewed, and kept accurate."
        />
        <meta property="og:url" content="https://chatrio.app/editorial-standards" />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-512.png?v=2" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "url": "https://chatrio.app/editorial-standards",
          "name": "Editorial Standards",
          "description": "How Chatrio's articles are researched, written, reviewed, and kept accurate.",
          "publisher": {
            "@type": "Organization",
            "name": "Chatrio",
            "url": "https://chatrio.app",
            "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-512.png?v=2", "width": 512, "height": 512 }
          }
        })}</script>
      </Helmet>

      <h1>Editorial Standards</h1>

      <p className="lead">
        Chatrio publishes guidance about anonymous chat, online safety, and
        digital connection. People make real decisions based on what they read
        here — how to stay safe talking to strangers, how to spot a scam, how to
        cope with loneliness — so we hold our writing to a clear standard. This
        page explains how our articles are created, who is responsible for them,
        and how we keep them accurate.
      </p>

      <h2>Who writes and reviews our content</h2>
      <p>
        Articles on Chatrio are written and reviewed by{" "}
        <a href="/about#vijay">Vijay</a>, the founder of Chatrio. Chatrio has
        operated an anonymous, no-signup chat platform since 2024, and that
        first-hand experience running the product — including what keeps people
        safe and what goes wrong in real conversations — informs the guidance we
        publish.
      </p>

      <h2>How we research and source</h2>
      <ul>
        <li>
          <strong>Real sources only.</strong> When we cite a statistic or study,
          it links to a genuine, verifiable source — for example Pew Research,
          the APA, Statista, Ofcom, the FTC, or peer-reviewed journals. We do not
          invent studies, quotes, or citations to sound authoritative.
        </li>
        <li>
          <strong>We say when something is opinion.</strong> Practical advice
          drawn from experience is presented as such, and kept separate from
          claims that rest on research.
        </li>
        <li>
          <strong>Safety guidance is conservative.</strong> On topics like
          scams, catfishing, and meeting people offline, we err toward caution
          and never encourage risky behavior for the sake of engagement.
        </li>
      </ul>

      <h2>Accuracy and corrections</h2>
      <p>
        We review published articles periodically and update them when facts,
        tools, or best practices change — dated articles carry a publish date so
        you can judge how current they are. If you spot an error or something
        that reads as misleading, email{" "}
        <a href="mailto:chatrioapp@gmail.com">chatrioapp@gmail.com</a> and we will
        review it and correct it if warranted.
      </p>

      <h2>Independence and advertising</h2>
      <p>
        Chatrio may display advertising and, where relevant, mention its own
        product. Advertising never determines our editorial recommendations, and
        we clearly distinguish our own product from independent guidance. When we
        compare Chatrio to other services, we aim to describe the alternatives
        fairly rather than dismiss them.
      </p>

      <h2>AI use</h2>
      <p>
        We may use software tools to help draft or edit, but every published
        article is directed, fact-checked, and reviewed by a human before it goes
        live. We are responsible for everything we publish, regardless of the
        tools used to produce it.
      </p>

      <div className="update-notice">
        <small>
          <em>Last updated: July 2026</em>
        </small>
      </div>
    </article>
  );
}
