// Updated About.tsx with more detailed content
export default function About() {
  return (
    <article
      className="doc"
      style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}
    >
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

      <h2>📈 Our Impact</h2>
      <div className="stats">
        <div className="stat">
          <span className="stat-number">50,000+</span>
          <span className="stat-label">Daily Conversations</span>
        </div>
        <div className="stat">
          <span className="stat-number">150+</span>
          <span className="stat-label">Countries</span>
        </div>
        <div className="stat">
          <span className="stat-number">98%</span>
          <span className="stat-label">Positive Feedback</span>
        </div>
      </div>

      <h2>🤝 Our Team</h2>
      <p>
        Chatrio is developed by a small, passionate team of developers,
        designers, and community moderators who believe in creating positive
        online spaces. We're distributed across three continents and united by
        our mission to make the internet feel human again.
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
        Email us at:{" "}
        <a href="mailto:chatrioapp@gmail.com">chatrioapp@gmail.com</a>
        <br />
        Response time: Within 24-48 hours
      </p>

      <div className="update-notice">
        <small>
          <em>
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </em>
        </small>
      </div>
    </article>
  );
}
