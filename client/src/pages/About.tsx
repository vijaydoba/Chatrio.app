// Updated About.tsx with more detailed content
import { Helmet } from "react-helmet-async";

export default function About() {
  return (
    <article
      className="doc"
      style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}
    >
      <Helmet>
        <title>About Chatrio – Anonymous Chat App | Privacy-First Platform</title>
        <meta name="description" content="Learn about Chatrio — a free, anonymous chat platform that connects strangers instantly. No accounts, no tracking, no data stored. Built for real conversations." />
        <link rel="canonical" href="https://chatrio.app/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About Chatrio – Anonymous Chat App" />
        <meta property="og:description" content="Chatrio connects strangers instantly without accounts or data storage. Anonymous, free, and privacy-first." />
        <meta property="og:url" content="https://chatrio.app/about" />
        <meta property="og:image" content="https://chatrio.app/branding/chatrio-icon-512-2026.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="About Chatrio – Anonymous Chat App" />
        <meta name="twitter:description" content="Chatrio connects strangers instantly without accounts or data storage." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "url": "https://chatrio.app/about",
          "name": "About Chatrio",
          "description": "Chatrio is a free anonymous chat platform connecting strangers instantly.",
          "publisher": {
            "@type": "Organization",
            "name": "Chatrio",
            "url": "https://chatrio.app",
            "logo": { "@type": "ImageObject", "url": "https://chatrio.app/branding/chatrio-icon-512-2026.png", "width": 512, "height": 512 },
            "founder": { "@type": "Person", "name": "Vijay", "jobTitle": "Founder", "url": "https://chatrio.app/about" }
          },
          "mainEntity": {
            "@type": "Person",
            "name": "Vijay",
            "jobTitle": "Founder of Chatrio",
            "url": "https://chatrio.app/about",
            "description": "Vijay is the founder of Chatrio and writes about anonymous chat, online safety, and digital loneliness.",
            "worksFor": { "@type": "Organization", "name": "Chatrio", "url": "https://chatrio.app" }
          }
        })}</script>
      </Helmet>
      <h1>About Chatrio: Connecting People Anonymously Since 2024</h1>

      <p className="lead">
        Chatrio is a modern, privacy-focused platform that enables spontaneous
        conversations between strangers worldwide. Founded with the belief that
        genuine human connection shouldn't require personal data, we've built a
        space where authentic conversations happen without the pressure of
        profiles, followers, or permanence.
      </p>

      <h2>🌟 Our Core Philosophy</h2>
      <p>
        In today's digital landscape where algorithms control our interactions,
        Chatrio brings back the magic of spontaneous human connection. We
        believe that some of the most meaningful conversations happen between
        complete strangers—free from preconceptions, social pressure, and the
        curated personas of traditional social media.
      </p>

      <h2>🔒 Privacy by Design</h2>
      <div className="features-grid">
        <div className="feature">
          <h3>No Registration Required</h3>
          <p>
            Start chatting immediately without creating an account or providing
            any personal information.
          </p>
        </div>
        <div className="feature">
          <h3>Ephemeral Conversations</h3>
          <p>
            Messages are delivered in real-time but not stored on our servers
            after the chat ends.
          </p>
        </div>
        <div className="feature">
          <h3>No Tracking</h3>
          <p>
            We don't track your conversations, build profiles, or sell your data
            to third parties.
          </p>
        </div>
      </div>

      <h2>🛡️ Safety & Moderation</h2>
      <p>
        While we value anonymity, we're committed to creating a safe
        environment. Our platform includes:
      </p>
      <ul>
        <li>
          <strong>Instant Report System:</strong> Users can report inappropriate
          behavior with one click
        </li>
        <li>
          <strong>Automated Content Filtering:</strong> Advanced algorithms
          detect and prevent harmful content
        </li>
        <li>
          <strong>Community Guidelines:</strong> Clear rules that all users must
          follow
        </li>
        <li>
          <strong>Optional Topics Filter:</strong> Chat only about subjects that
          interest you
        </li>
      </ul>

      <h2>💬 How It Works</h2>
      <p>
        Chatrio uses WebSocket technology to create real-time connections
        between users interested in similar topics. Our matching algorithm
        considers:
      </p>
      <ul>
        <li>Selected interests and topics</li>
        <li>Language preferences</li>
        <li>Time zone considerations</li>
        <li>Chat history and user ratings</li>
      </ul>

      <h2>🌐 Our Technology Stack</h2>
      <p>
        Built with modern web technologies for maximum performance and security:
      </p>
      <ul>
        <li>
          <strong>Frontend:</strong> React with TypeScript for a responsive,
          smooth experience
        </li>
        <li>
          <strong>Real-time:</strong> Socket.io for instant messaging without
          delays
        </li>
        <li>
          <strong>Security:</strong> End-to-end encryption for all direct
          messages
        </li>
        <li>
          <strong>Hosting:</strong> Global CDN for low latency worldwide
        </li>
      </ul>

      <h2>🌱 Our Growth</h2>
      <p>
        Chatrio launched in 2024 and has grown steadily through word of mouth.
        Users in dozens of countries visit daily to connect with strangers over
        shared interests — from gaming and music to travel and relationships.
        We don't publish vanity metrics, but every conversation that starts on
        Chatrio is a real person choosing to connect with another real person,
        and that's what we optimize for.
      </p>

      <h2 id="vijay">🤝 Who Builds Chatrio</h2>
      <p>
        {"Chatrio is an independent project founded and maintained by "}
        <strong>Vijay</strong>, who built the platform on a simple belief: the
        internet works best when it brings people together without demanding
        their data in return. Vijay writes and reviews the articles on this blog —
        covering anonymous chat, online safety, and digital loneliness — and ships
        product improvements regularly based on user feedback.
      </p>
      <p>
        {"Every article is written and reviewed against our "}
        <a href="/editorial-standards">editorial standards</a>, so you know how
        the guidance here is researched and kept accurate.
      </p>

      <h2>📚 Additional Resources</h2>
      <ul>
        <li>
          <a href="/blog">Read our blog</a> for tips on safe chatting and
          connection stories
        </li>
        <li>
          <a href="/privacy">Review our complete Privacy Policy</a>
        </li>
        <li>
          <a href="/terms">Read our Terms of Service</a>
        </li>
        <li>
          <a href="/contact">Contact our support team</a>
        </li>
      </ul>

      <h2>📬 Get in Touch</h2>
      <p>
        We're always looking to improve Chatrio based on user feedback. Have
        suggestions or questions?
        <br />
        {"Email us at: "}
        <a href="mailto:chatrioapp@gmail.com">chatrioapp@gmail.com</a>
        <br />
        Response time: Within 24-48 hours
      </p>

      <div className="update-notice">
        <small>
          <em>Last updated: July 2026</em>
        </small>
      </div>
    </article>
  );
}
