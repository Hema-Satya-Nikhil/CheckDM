import type { Metadata } from "next";
import "./landing.css";
import Link from "next/link";
import Image from "next/image";
import { DemoNotice } from "@/components/demo-notice";
import { LogoMark } from "@/components/brand/logo";
import { zernioLink } from "@/lib/zernio-links";
import { CREATOR_NAME, CREATOR_URL } from "@/lib/brand";

const SOURCE_URL = "https://github.com/diwenne/openreply";
const SETUP_DOCS_URL = `${SOURCE_URL}/blob/main/docs/setup.md`;
const ZERNIO_DOCS_URL = `${SOURCE_URL}/blob/main/docs/zernio.md`;

function Wordmark({ className = "or-wordmark" }: { className?: string }) {
  return (
    <span className={className}>
      <LogoMark className="or-wordmark-mark" />
      <span>
        Check<span aria-hidden="true">DM</span>
      </span>
    </span>
  );
}

export const metadata: Metadata = {
  title: "CheckDM — Instagram comment-to-DM automation",
  description:
    "CheckDM turns Instagram comments into private replies. Match a keyword on a post or reel and send a DM automatically, with a delivery log for every send.",
};

function SponsorCredit({ placement }: { placement: string }) {
  return (
    <a
      className="or-sponsor-credit"
      href={zernioLink({ placement })}
      target="_blank"
      rel="sponsored noopener noreferrer"
    >
      <span>Supported by</span>
      <Image
        src="/brand/zernio-primary.svg"
        alt="Zernio"
        width={76}
        height={24}
      />
      <span className="or-sponsor-disclosure">Optional paid provider</span>
    </a>
  );
}

function ReplyPreview() {
  return (
    <figure
      className="or-preview"
      aria-label="Example campaign: a GUIDE comment triggers a private reply with a guide link"
    >
      <div className="or-preview-top">
        <Wordmark />
        <span className="or-mono">Campaign preview</span>
      </div>
      <div className="or-preview-body">
        <div className="or-preview-heading">
          <span className="or-avatar">S</span>
          <div>
            <strong>Sunday studio</strong>
            <span>@sunday.studio · Instagram</span>
          </div>
          <span className="or-active">Active</span>
        </div>
        <div className="or-post">
          <span className="or-mono">Campaign: New drop</span>
          <p>
            Comment GUIDE below
            <br />and I’ll send you the link.
          </p>
          <span>Keyword: GUIDE</span>
        </div>
        <div className="or-comment">
          <span className="or-avatar or-avatar-small">M</span>
          <div>
            <strong>maya.creates</strong>
            <p>GUIDE! need this 😍</p>
          </div>
        </div>
        <div className="or-match">
          <span aria-hidden="true">↓</span>
          <span>
            Keyword <code>GUIDE</code> matched
          </span>
          <span className="or-match-line" />
          <span>Private reply</span>
        </div>
        <div className="or-message">
          <span className="or-mono">Sunday studio → Maya</span>
          <p>Hey Maya! Here’s the link 👇</p>
          <span className="or-message-link">
            Shop the new drop <span aria-hidden="true">↗</span>
          </span>
        </div>
        <div className="or-delivered">
          <span aria-hidden="true">✓</span> Sent through the official Instagram
          API
        </div>
      </div>
      <figcaption>
        Example content. Your keywords, your message, your links.
      </figcaption>
    </figure>
  );
}

const steps = [
  [
    "Connect your Instagram",
    "Choose Zernio or bring your own Meta app, then connect an Instagram Business or Creator account.",
  ],
  [
    "Set up a campaign",
    "Pick a post or reel, add your keywords, and write the private reply. Add a public reply or tracked link buttons when you need them.",
  ],
  [
    "CheckDM handles the rest",
    "Incoming comments trigger your campaigns. A background worker queues, rate-limits and logs every send, with retries when something needs attention.",
  ],
];
const features = [
  [
    "Custom reply messages",
    "Write your own messages, personalise with a username, and use up to two tracked link buttons.",
  ],
  [
    "Multiple triggers",
    "Trigger campaigns from post comments, incoming DMs, and text replies to Stories.",
  ],
  [
    "Inbox",
    "Read conversations and reply from one place, within Instagram’s messaging window.",
  ],
  [
    "Delivery logs",
    "See sent, skipped and failed messages with the reason for each, and follow link clicks back to the campaign.",
  ],
];

export default function Home() {
  return (
    <div id="top" className="or-landing">
      <a className="or-skip" href="#main">
        Skip to content
      </a>
      <DemoNotice variant="banner" />
      <header className="or-header">
        <div className="or-container or-nav">
          <Link href="/" aria-label="CheckDM home">
            <Wordmark />
          </Link>
          <nav aria-label="Main navigation">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <Link href="/templates">Templates</Link>
            <a href="#setup">Get started</a>
          </nav>
          <div className="or-nav-cta">
            <a className="or-nav-signin" href="/login">
              Sign in
            </a>
            <a className="or-button or-button-small" href="/login">
              Start free <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </header>
      <main id="main">
        <section className="or-container or-hero">
          <div className="or-hero-copy">
            <h1>
              Turn Instagram comments
              <br />
              into private replies.
            </h1>
            <p className="or-lead">
              Someone comments a keyword on your post or reel. CheckDM matches
              it, sends the private reply, and keeps a record of every send — so
              nothing gets missed and nothing gets sent twice.
            </p>
            <div className="or-actions">
              <a className="or-button or-button-primary" href="/login">
                Start free <span aria-hidden="true">↗</span>
              </a>
              <a className="or-text-link" href="#how">
                See how it works <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="or-hero-note">
              Free software. Self-hosted. Your infrastructure.
            </p>
            <SponsorCredit placement="landing-hero" />
          </div>
          <ReplyPreview />
        </section>
        <div className="or-container or-principles">
          <span>MIT licensed</span>
          <span>Official Instagram API</span>
          <span>No password sharing</span>
          <span>Your campaigns, in your database</span>
        </div>
        <div className="or-container">
          <div className="or-sheet">
            <section id="how" className="or-section or-how">
              <div>
                <h2>How it works</h2>
                <p>
                  Send a product link, share a resource, or deliver your latest
                  guide. You decide what starts the conversation and what
                  happens next.
                </p>
              </div>
              <ol className="or-steps">
                {steps.map(([title, description], index) => (
                  <li key={title}>
                    <span className="or-step-number">0{index + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section id="features" className="or-section">
              <div className="or-section-intro">
                <h2>Features</h2>
              </div>
              <div className="or-feature-grid">
                {features.map(([title, description]) => (
                  <article key={title}>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="or-technical">
              <div>
                <h2>
                  Open code.
                  <br />A system you can inspect.
                </h2>
                <p>
                  CheckDM owns the campaigns, keyword matching, queues, retries,
                  logs and inbox. Your connection provider handles the Instagram
                  API.
                </p>
                <a href={SOURCE_URL} className="or-text-link">
                  Explore the source <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="or-runtime">
                <div>
                  <span className="or-mono">Web app</span>
                  <strong>Next.js + React</strong>
                  <span>Dashboard and incoming events</span>
                </div>
                <div>
                  <span className="or-mono">Background worker</span>
                  <strong>Node.js + BullMQ</strong>
                  <span>Queued delivery and reconciliation</span>
                </div>
                <div>
                  <span className="or-mono">Your data</span>
                  <strong>PostgreSQL + Redis</strong>
                  <span>Campaigns, accounts, logs and queue</span>
                </div>
              </div>
            </section>
            <section id="setup" className="or-section">
              <div className="or-section-intro">
                <h2>Choose how you connect.</h2>
                <p>
                  Both options need your own web app, background worker,
                  PostgreSQL and Redis. CheckDM is free software; hosting and
                  provider costs are separate.
                </p>
              </div>
              <div className="or-provider-grid">
                <article className="or-provider-zernio">
                  <div className="or-provider-title">
                    <h3>Connect with Zernio</h3>
                    <span>Recommended for simpler setup</span>
                  </div>
                  <p>
                    Use Zernio’s managed Instagram connection instead of creating
                    and reviewing your own Meta app. Save an API key in Settings,
                    choose a profile, and connect your account.
                  </p>
                  <ul>
                    <li>No Meta app secrets to configure in CheckDM</li>
                    <li>CheckDM registers the webhook for you</li>
                    <li>Optional paid service and project sponsor</li>
                  </ul>
                  <a
                    className="or-text-link"
                    href={zernioLink({ placement: "landing-setup" })}
                    rel="sponsored noopener noreferrer"
                    target="_blank"
                  >
                    Explore Zernio <span aria-hidden="true">↗</span>
                  </a>
                  <a className="or-provider-guide" href={ZERNIO_DOCS_URL}>
                    Read setup and feature limits
                  </a>
                </article>
                <article>
                  <div className="or-provider-title">
                    <h3>Use your own Meta app</h3>
                    <span>Direct connection</span>
                  </div>
                  <p>
                    Keep the existing direct Meta integration. Create your app,
                    configure Instagram Login and webhooks, and manage platform
                    credentials yourself.
                  </p>
                  <ul>
                    <li>Bring your own Meta app and secrets</li>
                    <li>Handle App Review where required</li>
                    <li>No Zernio account or subscription needed</li>
                  </ul>
                  <a
                    className="or-text-link"
                    href={`${SETUP_DOCS_URL}#the-meta-app`}
                  >
                    Follow the direct Meta guide{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                </article>
              </div>
              <p className="or-setup-note">
                Instagram’s account requirements, permissions, messaging windows
                and rate limits apply with either provider. Existing accounts are
                never automatically migrated.
              </p>
            </section>
            <section className="or-section or-faq">
              <div>
                <h2>FAQ</h2>
              </div>
              <div>
                <details>
                  <summary>Is CheckDM free?</summary>
                  <p>
                    Yes. CheckDM is MIT-licensed software with no software
                    subscription or seat limits. You pay for your own
                    infrastructure and any optional services you choose,
                    including Zernio.
                  </p>
                </details>
                <details>
                  <summary>Can I use the public demo to send DMs?</summary>
                  <p>
                    No. Deploy your own instance first. The public demo shows
                    the interface; it is not a hosted automation service. The{" "}
                    <a href={SETUP_DOCS_URL}>setup guide</a> walks through both
                    processes, the databases, and your provider choice.
                  </p>
                </details>
                <details>
                  <summary>Do I need Zernio?</summary>
                  <p>
                    No. Zernio is an optional paid connection provider and
                    sponsor. It can spare you setting up your own Meta app, while
                    CheckDM still runs on your infrastructure. The direct Meta
                    path stays available.{" "}
                    <a
                      href={zernioLink({ placement: "landing-faq" })}
                      rel="sponsored noopener noreferrer"
                      target="_blank"
                    >
                      Learn about Zernio
                    </a>
                    .
                  </p>
                </details>
                <details>
                  <summary>What happens if a comment is delivered twice?</summary>
                  <p>
                    Nothing happens twice. Each reply and DM is claimed in the
                    database before it is sent, so a repeated webhook, a
                    duplicated job or a retry can never produce a second message.
                  </p>
                </details>
                <details>
                  <summary>Which Instagram accounts can I connect?</summary>
                  <p>
                    Instagram Business and Creator accounts. Personal accounts
                    are not supported. Connections use the official API, and
                    Instagram’s platform policies still apply.
                  </p>
                </details>
                <details>
                  <summary>Are there differences between providers?</summary>
                  <p>
                    Yes. With Zernio, the post picker shows the latest 25 posts.
                    Reporting needs its analytics add-on and synced data, and
                    follower snapshots can be up to 24 hours old. Inbox previews
                    are omitted when message direction is unavailable; opening
                    threads and replying are supported. Read the{" "}
                    <a href={ZERNIO_DOCS_URL}>provider guide</a> before
                    choosing.
                  </p>
                </details>
              </div>
            </section>
          </div>
        </div>
        <section className="or-container or-closing">
          <h2>Set up your first campaign</h2>
          <p>Connect Instagram, write your first reply, and you are done.</p>
          <div className="or-actions">
            <a className="or-button or-button-primary" href="/login">
              Start free <span aria-hidden="true">↗</span>
            </a>
            <a className="or-text-link" href={SETUP_DOCS_URL}>
              Read the setup guide <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>
      <footer className="or-footer">
        <div className="or-container">
          <div className="or-footer-top">
            <div>
              <Link href="/">
                <Wordmark />
              </Link>
              <p>Instagram comment-to-DM automation you can inspect.</p>
            </div>
            <nav aria-label="Footer navigation">
              <Link href="/templates">Templates</Link>
              <Link href="/about">About</Link>
              <a href={SETUP_DOCS_URL}>Setup guide</a>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/data-deletion">Data deletion</Link>
            </nav>
          </div>
          <div className="or-footer-bottom">
            <span>
              Created by{" "}
              <a href={CREATOR_URL} target="_blank" rel="noreferrer">
                {CREATOR_NAME}
              </a>
            </span>
            <SponsorCredit placement="landing-footer" />
          </div>
        </div>
      </footer>
    </div>
  );
}