# Seed sources

Starting points for each daily sweep. These are a floor, not a ceiling: search
beyond them, and add anything that proves reliable.

**Read these as domains to steer searches toward, not pages to fetch.** The
cloud sandbox blocks most direct fetches (`EGRESS_BLOCKED`), so in practice you
reach them through search results that quote or cite them — which is still what
separates a `confirmed` date from an `expected` one.

## Primary — the organisation's own page

Anything found here outranks reporting about it. A date from a vendor's own
event page is `confirmed`; the same date from a news article is `expected`.

### AI / ML
Model launches, deprecations and retirement dates all live on these pages — the
retirement dates especially, since they are deadlines someone has to act on.

- https://www.anthropic.com/news
- https://openai.com/news/
- https://blog.google/technology/ai/
- https://ai.meta.com/blog/
- https://mistral.ai/news
- https://neurips.cc/ · https://icml.cc/ · https://iclr.cc/
- https://www.nvidia.com/gtc/

### Big tech / consumer
- https://www.apple.com/newsroom/
- https://blog.google/ · https://io.google/
- https://news.microsoft.com/ · https://build.microsoft.com/ · https://ignite.microsoft.com/
- https://www.metaconnect.com/
- https://news.samsung.com/global/
- https://www.ces.tech/ · https://www.mwcbarcelona.com/ · https://www.ifa-berlin.com/

### Dev tools / platforms
- https://endoflife.date/ (EOL and support-window dates for ~300 products)
- https://github.com/nodejs/release#release-schedule
- https://nextjs.org/blog · https://react.dev/blog · https://vercel.com/changelog
- https://www.postgresql.org/developer/roadmap/ · https://www.postgresql.org/about/newsarchive/
- https://docs.flutter.dev/release/release-notes · https://blog.rust-lang.org/
- https://reinvent.awsevents.com/ · https://cloud.withgoogle.com/next
- https://events.linuxfoundation.org/ (KubeCon and friends)

### Cloud / platform lifecycle
- https://aws.amazon.com/new/ · https://docs.aws.amazon.com/whitepapers/latest/aws-service-deprecations/
- https://azure.microsoft.com/en-us/updates/ (retirement announcements carry dates)
- https://cloud.google.com/terms/deprecation · https://cloud.google.com/release-notes
- https://kubernetes.io/releases/ (release and EOL schedule)

### Mobile
- https://developer.apple.com/news/releases/ · https://developer.apple.com/wwdc/
- https://developer.android.com/about/versions · https://android-developers.googleblog.com/
- https://developer.apple.com/news/ (App Store SDK and submission deadlines)
- https://support.google.com/googleplay/android-developer/ (Play policy deadlines)

### Hardware / silicon
- https://nvidianews.nvidia.com/ · https://www.qualcomm.com/news
- https://www.intel.com/content/www/us/en/newsroom/ · https://www.amd.com/en/newsroom
- https://pr.tsmc.com/english/news (process-node milestones)

### Security / infra
- https://msrc.microsoft.com/update-guide (Patch Tuesday: second Tuesday monthly)
- https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- https://www.blackhat.com/ · https://defcon.org/ · https://www.rsaconference.com/
- https://letsencrypt.org/docs/ (certificate lifetime and policy deadlines)

## Secondary — for discovering what to verify

Useful for spotting that something happened; always chase the primary source
before writing an entry.

- https://news.ycombinator.com/ (front page, past 24h)
- https://techcrunch.com/ · https://www.theverge.com/tech · https://arstechnica.com/
- https://www.theregister.com/ (infrastructure and enterprise)

## Recurring dates worth re-checking every run

These repeat, so they are easy to file forward but also easy to get subtly wrong:

- Microsoft Patch Tuesday — second Tuesday of each month
- Node.js LTS transitions and end-of-life dates
- Apple's September and (usually) October/spring events
- Quarterly earnings for the majors, where they carry product news
