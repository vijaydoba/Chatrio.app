# Blog Prune Plan (data-backed)

Generated 2026-09-26 from Google Search Console — posts
with **0 impressions over the last 90 days**. Cross-referenced against current
slugs (old `/blog/post/` and `-2025` URL forms mapped to current slugs so the
recent migration doesn't skew the data).

## Summary
- Total posts: **203**
- Zero-impression (90d): **109**  → 1–4 impressions: 58  → ≥5: 36
- Flagged **KEEP** (strategic Circles/Blind Date/nearby cluster — young, not dead): **5**
- Prune candidates after keeps: **104**

## ⚠️ How to use this
This plan is **NOT auto-executed** — pruning 301s/removes live URLs and needs your
review (some 0-impression posts are recent strategic content, and each removal
needs a consolidation target). For each candidate: **consolidate** unique value
into the strongest same-topic keeper, then **301** the URL to that keeper (add to
`POST_REDIRECTS` in posts.ts AND the nginx server block), and remove from
`posts.ts`. For pure filler with no unique value, **410** instead (nginx).

Note: many of these are already `noindex`'d by the 2026-08-31 nginx prune block —
this plan converts that holding pattern into permanent consolidation.

## KEEP (do NOT prune — strategic cluster, just young)
- `best-community-apps-to-meet-people-nearby-2026`
- `best-group-chat-apps-for-local-communities-2026`
- `community-app-privacy-safety-checklist`
- `first-message-to-someone-nearby-conversation-starters`
- `nearby-chat-apps-how-they-work-safely`

## Prune candidates by category

### Chat & Connection (57)
- [ ] `why-you-are-more-authentic-with-strangers-than-friends` — Why You Can Be Yourself With Strangers (But Not With Friends)
- [ ] `why-effort-in-conversation-matters-more-than-you-think` — Why Effort in Conversation Matters More Than You Think
- [ ] `questions-to-ask-to-get-to-know-someone` — 115 Questions to Ask to Get to Know Someone (2026)
- [ ] `questions-to-ask-friends` — 90 Fun & Deep Questions to Ask Friends (2026)
- [ ] `how-to-end-an-online-conversation-without-being-awkward` — How to End an Online Conversation Gracefully
- [ ] `digital-communication-skills-beyond-texting` — Digital Communication Skills: Beyond Texting and Chatting
- [ ] `why-people-feel-lonely-and-how-talking-to-strangers-can-help` — Why People Feel Lonely Today and How Talking to Strangers Can Help
- [ ] `why-talking-to-strangers-online-can-improve-your-life` — Why Talking to Strangers Online Can Improve Your Life
- [ ] `how-to-make-a-good-impression-when-chatting-with-a-stranger-online` — How to Make a Better Impression When Talking to a Stranger via Chat
- [ ] `chatting-with-strangers-and-unexpected-feelings` — Chatting With Strangers and Unexpected Feelings: Why Online Chats Create Connection
- [ ] `how-to-talk-to-a-girl-online-for-the-first-time` — How to Talk to a Girl Online for the First Time (Without Being Weird)
- [ ] `what-to-talk-about-with-a-stranger-online` — What to Talk About With a Stranger Online (25 Topics That Actually Work)
- [ ] `how-to-keep-a-conversation-going-with-someone-online` — How to Keep a Conversation Going with Someone You Just Met Online
- [ ] `how-to-tell-if-someone-is-genuine-in-online-chat` — How to Tell If Someone Is Being Genuine in an Online Chat
- [ ] `best-topics-to-talk-about-with-strangers-online` — The Best Topics to Talk About with a Stranger Online (That Actually Work)
- [ ] `why-late-night-online-chats-feel-so-different` — The 2 AM Stranger: Why Late Night Chats Hit Differently
- [ ] `can-you-still-use-omegle` — Can You Still Use Omegle in 2026? Truth + Alternatives
- [ ] `best-free-random-chat-apps-talk-to-strangers` — Best Free Random Chat Apps to Talk to Strangers (2026)
- [ ] `signs-you-made-real-connection-with-stranger-online` — 7 Signs You Made a Real Connection With a Stranger Online
- [ ] `online-chat-etiquette-rules-everyone-should-follow` — Online Chat Etiquette — 12 Rules Everyone Should Follow
- [ ] `why-anonymous-chat-is-different-from-everything-else-online` — Why Anonymous Chat Is Completely Different From Everything Else Online
- [ ] `beginners-guide-anonymous-chat-how-it-works-2026` — Beginner's Guide to Anonymous Chat: Stay Safe (2026)
- [ ] `how-to-spot-fake-profiles-and-scammers-in-online-chat` — How to Spot Fake Profiles and Scammers in Online Chat (2026 Safety Guide)
- [ ] `best-chat-topics-for-deep-conversations` — Best Chat Topics for Deep, Meaningful Conversations (2026 List)
- [ ] `how-to-stay-safe-chatting-with-strangers-online-2026` — How to Stay Safe Chatting with Strangers Online (2026 Guide)
- [ ] `what-your-texting-habits-reveal-about-your-personality` — What Your Texting Habits Reveal About Your Personality
- [ ] `why-some-people-are-naturally-great-at-online-chat` — Why Some People Are Naturally Great at Online Chat (And How to Become One)
- [ ] `why-deep-conversations-are-rare-and-how-to-have-more` — Why Deep Conversations Are So Rare (And How to Have More of Them)
- [ ] `how-to-recognize-a-genuine-friendship-forming-online` — How to Recognize a Genuine Friendship Forming Online
- [ ] `how-to-write-the-perfect-first-message-online` — How to Write the Perfect First Message Online (With Examples)
- [ ] `how-to-meet-people-online-when-you-are-new-to-a-city` — How to Meet People Online When You're New to a City
- [ ] `what-makes-a-great-conversationalist-according-to-psychology` — What Makes a Great Conversationalist, According to Psychology
- [ ] `the-psychology-of-first-impressions-in-online-chat` — The Psychology of First Impressions in Online Chat
- [ ] `is-anonymous-chat-safe-guide-2026` — Is Anonymous Chat Safe? An Honest Guide + Safety Tips (2026)
- [ ] `how-to-chat-with-strangers-safely-as-a-girl` — How to Chat With Strangers Safely as a Girl Online (2026)
- [ ] `chat-with-strangers-uk-free-2026` — Chat With Strangers in the UK — Free & Anonymous (2026)
- [ ] `is-video-chat-with-strangers-safe-2026` — Is Video Chat With Strangers Safe? (2026 Guide + Safer Options)
- [ ] `how-to-never-be-boring-in-online-chat` — How to Never Be Boring in Online Chat (15 Tips That Work)
- [ ] `chat-with-strangers-in-mexico-free-2026` — Chat With Strangers in Mexico — Free & Anonymous (2026)
- [ ] `chat-with-strangers-in-dubai-uae-free-2026` — Chat With Strangers in Dubai & the UAE — Free (2026)
- [ ] `chat-with-strangers-in-canada-free-2026` — Chat With Strangers in Canada — Free & Anonymous (2026)
- [ ] `chat-with-strangers-in-the-philippines-free-2026` — Chat With Strangers in the Philippines — Free & Anonymous (2026)
- [ ] `first-message-formula-how-to-start-conversations-that-connect` — First Message Formula: Start Conversations That Connect
- [ ] `dos-and-donts-of-chatting-with-strangers-online` — The Do's and Don'ts of Chatting With Strangers Online
- [ ] `how-to-talk-to-a-stranger-online-tips-2026` — How to Talk to a Stranger Online: 12 Tips (2026)
- [ ] `chat-with-random-people-online-guide` — Chat With Random People Online: A 2026 Guide to Doing It Right
- [ ] `how-to-meet-people-near-me-without-giving-up-privacy` — How to Meet People Near Me Without Giving Up Your Privacy
- [ ] `how-to-ask-for-contact-info-after-online-chat` — How to Ask for Contact Info After a Great Online Chat (Without Being Awkward)
- [ ] `how-to-apologize-in-online-chat-after-saying-something-wrong` — How to Apologize Effectively in Online Chat After Saying Something Wrong
- [ ] `video-calling-in-chat-how-it-works` — Video Calling in Chat: How to Start a Video Call With Your Match
- [ ] `random-video-chat-guide` — Random Video Chat: Meet Strangers Face-to-Face Instantly
- [ ] `best-anonymous-chat-app-nigeria-2026` — Best Anonymous Chat App in Nigeria 2026 (Free, No Sign-Up)
- [ ] `best-anonymous-chat-app-bangladesh-2026` — Best Anonymous Chat App in Bangladesh 2026 (Free, Low-Data)
- [ ] `best-anonymous-chat-app-brazil-2026` — Best Anonymous Chat App in Brazil 2026 (Free, No Sign-Up)
- [ ] `how-interest-based-chat-works-2026` — How Interest-Based Chat Works: Match With Strangers Who Actually Get You
- [ ] `global-chat-rooms-talk-to-people-worldwide-2026` — Global Chat Rooms: How to Talk to People Around the World (2026)
- [ ] `how-ai-moderation-keeps-anonymous-chat-safe-2026` — How AI Moderation Keeps Anonymous Chat Safe (2026)

### Mental Health (19)
- [ ] `why-you-overthink-after-an-amazing-chat` — Why You Overthink After an Amazing Chat (And How to Stop)
- [ ] `fear-of-meeting-in-person-after-online-chat` — Why You Never Feel 'Ready' to Meet Someone in Person (After Online Chat)
- [ ] `the-expectation-trap-why-chats-disappoint` — The Expectation Trap: Why Your Imagined Chat Never Matches Reality
- [ ] `dopamine-cycle-anonymous-chat-why-you-keep-coming-back` — The Dopamine Cycle of Anonymous Chat: Why You Keep Coming Back
- [ ] `accidental-therapist-when-chat-becomes-venting-session` — The Accidental Therapist: When Your Chat Becomes Someone's Venting Session
- [ ] `vulnerability-hangover-regret-after-sharing-online` — The Vulnerability Hangover: When You've Shared Too Much and Feel Regret
- [ ] `why-vulnerability-creates-deeper-online-connections` — Why Vulnerability Creates Deeper Connections in Online Chat
- [ ] `the-power-of-true-listening-in-online-chat` — The Power of True Listening in Online Chat
- [ ] `quitting-social-media-2026-what-to-do-instead` — Thinking About Quitting Social Media in 2026? Here's What Actually Helps
- [ ] `talking-to-strangers-online-as-an-introvert-2026` — Talking to Strangers Online as an Introvert: The Complete 2026 Guide
- [ ] `why-online-chat-is-good-for-your-mental-health-2026` — Why Online Chat Is Good for Your Mental Health (And When to Be Careful)
- [ ] `psychology-of-anonymity-why-we-act-differently-online` — The Psychology of Anonymity: Why We Act Differently
- [ ] `why-we-crave-validation-online-and-how-to-handle-it` — Why We Crave Validation Online (And How to Handle It Healthily)
- [ ] `the-science-of-loneliness-what-research-says-about-human-connection` — The Science of Loneliness: What Research Actually Says About Human Connection
- [ ] `how-to-set-healthy-boundaries-in-online-relationships` — How to Set Healthy Boundaries in Online Relationships
- [ ] `online-chat-loneliness-statistics-2026` — Online Chat & Loneliness Statistics 2026 (The Numbers That Matter)
- [ ] `the-psychology-of-opening-up-to-strangers-why-its-easier` — The Psychology of Opening Up to Strangers
- [ ] `why-people-chat-with-strangers-psychology-of-anonymous-connection` — Why People Chat With Strangers: The Psychology of Anonymous Connection
- [ ] `anxious-attachment-in-online-dating-why-you-overanalyze-messages-2026` — Anxious Attachment in Online Dating: Why You Overanalyze Every Message (2026)

### Relationships (12)
- [ ] `deep-questions-to-ask-your-partner` — 50 Deep Questions to Ask Your Partner (2026)
- [ ] `green-flags-in-online-chat-signs-of-a-good-person` — Green Flags in Online Chat: 12 Signs of a Good Person
- [ ] `why-we-connect-more-with-strangers-than-people-we-know` — Why We Sometimes Connect More With Strangers Than People We Know
- [ ] `is-online-chat-good-for-loneliness` — Is Talking to Strangers Online Actually Good for Loneliness?
- [ ] `why-you-feel-an-instant-connection-with-some-strangers` — Why You Feel an Instant Connection With Some Strangers Online
- [ ] `how-to-know-when-an-online-connection-is-worth-pursuing` — How to Know When an Online Connection Is Worth Pursuing
- [ ] `how-to-handle-long-distance-friendships-that-started-online` — How to Handle Long-Distance Friendships That Started Online
- [ ] `how-to-build-genuine-friendships-through-stranger-chat` — How to Build Genuine Friendships Through Stranger Chat (Without It Feeling Transactional)
- [ ] `when-stranger-chat-leads-to-real-friendships-irl` — When Stranger Chat Leads to Real Friendships: A Guide to Moving From Anonymous to IRL
- [ ] `avoidant-attachment-style-signs-online-chat-2026` — Avoidant Attachment Style: Signs, Causes & How It Shows Up in Chat (2026)
- [ ] `secure-attachment-style-signs-online-relationships-2026` — Secure Attachment Style: 12 Signs in Online Relationships (2026)
- [ ] `what-is-fearful-avoidant-attachment-style-2026` — What Is Fearful-Avoidant Attachment? Signs & How It Shows Up in Chat (2026)

### Dating (9)
- [ ] `dating-chat-slang-glossary-2026` — Modern Dating & Chat Slang Glossary (2026)
- [ ] `building-meaningful-connections-digital-world` — How to Build Meaningful Connections in a Digital World
- [ ] `psychology-of-loneliness-why-we-seek-online-friends` — The Psychology of Loneliness: Why We Seek Connection With Online Friends
- [ ] `signs-you-are-getting-attached-to-someone-you-chat-with-online` — Signs You’re Getting Attached to Someone You Chat With Online
- [ ] `what-to-do-when-you-like-someone-you-met-online` — What to Do When You Start Liking Someone You Met Online
- [ ] `how-to-flirt-online-without-being-creepy` — How to Flirt Online Without Being Creepy (Tips That Actually Work)
- [ ] `gen-z-quitting-dating-apps-2026` — Why Gen Z Is Quitting Dating Apps in 2026
- [ ] `virtual-dating-tips-video-dates-2026` — Virtual Dating: How to Have a Great Video Date in 2026
- [ ] `what-is-zombieing-dating-trend-after-ghosting-2026` — What Is Zombieing? The Dating Trend That Follows Ghosting (2026)

### Love (4)
- [ ] `love-is-built-not-found-real-love-in-modern-relationships` — Love Is Built, Not Found: How Real Love Grows
- [ ] `why-people-fall-in-love-online` — Why People Fall in Love Online: Psychology & Romance
- [ ] `science-of-attraction-in-online-chat` — The Science of Attraction in Online Chat
- [ ] `five-love-languages-explained-2026` — The 5 Love Languages, Explained — And Does the Theory Actually Hold Up? (2026)

### Romance (3)
- [ ] `conversation-starters-for-couples` — 70 Conversation Starters for Couples (2026)
- [ ] `psychology-of-falling-in-love-online` — The Psychology of Falling in Love Online
- [ ] `text-chemistry-how-to-create-attraction-in-online-chat` — Text Chemistry: How to Create Real Attraction in Online Chat
