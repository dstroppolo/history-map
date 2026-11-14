# Plan: personal family trees ("My Family")

Status: proposal, nothing built. Date: 2026-11-14.

## Goal

Let anyone build their own family in the same 3D experience the royal trees use:
add people, relationships, dates, birthplaces and photos, then explore the result
with the tree, time scrubber, relationship finder, globe, share links and posters.

It lives on a new page and needs accounts, a database and photo storage, none of
which the app has today (it is a static site that reads Wikidata from the browser).

## What we can reuse

Most of the front end already works on plain data and does not care where it came from.

| Existing piece | Reuse | Change needed |
| --- | --- | --- |
| `DynastyScene`, `Medallion`, `Bloodlines`, `CameraRig` | As is | None. They take a list of `FamilyTreeNodeData`. |
| `computeTreeLayout` | As is | Check it with wide real families (10+ siblings, remarriages). |
| Time scrubber | As is | None. It only reads birth and death years. |
| Globe (`GlobeView`) | As is | Birthplaces come from our database instead of Wikidata. |
| Relationship finder (`findRelation`) | Logic | Split the ancestor search from the Wikidata fetch so it can run on a family held in memory. `kinship.ts` is already pure. |
| Share links, poster export | As is | Share links need a public or invite token for private trees. |
| House colours and legend | Concept | "Houses" become family branches or surnames. |
| Follow the crown | No | Not relevant to private families. Hide it on this page. |
| `useFamilyTree` | No | It reveals Wikidata relatives step by step. Personal trees load whole. |

The main refactor is small: the page needs a "data source" seam so the same scene
can be fed by Wikidata (today) or by our API (new).

## Product shape

Two new routes:

- `/my-family`: the signed-in home. Lists your trees, "Create a tree".
- `/my-family/:treeId`: the tree itself, with an **Edit** mode on top of the viewer.

### Building a tree

The editor is the product. It has to be faster than a form.

1. **Start**: "Start with yourself". Name, birth year, optional photo.
2. **Grow from the tree**: the existing + buttons above and below a portrait become
   "Add parent" and "Add child". A third, at the side, adds a partner. Each opens a
   short card: name, born, died, birthplace, photo. Save and the person flies in.
3. **Edit in the side panel**: the biography panel gains an Edit state with the same
   fields plus a notes/biography box.
4. **Birthplace**: a place search box. Pick a result and we store its name and
   coordinates, which is what the globe needs.
5. **Photos**: drag a photo on to a portrait, or pick one in the card. Crop to a
   circle in the browser before upload.
6. **Import (later)**: GEDCOM file upload, the standard export from Ancestry,
   MyHeritage and FamilySearch. This is how people with an existing tree arrive.

### Sharing

- Trees are **private by default**.
- Owner can invite family by email as **viewer** or **editor**.
- Owner can create a **public link** (unguessable token), and revoke it.
- Living people can be shown as "Private" to anyone who is not a member.

## Architecture

Recommended: **Supabase** (Postgres, auth, file storage) plus the existing Vercel
hosting, with a few Vercel serverless functions for things that need secrets.

Why: the app is a static SPA on Vercel. Supabase adds accounts, a relational
database with per-row access rules, and photo storage without us running servers.
A family tree is relational data with strict "who can see this" rules, which is
what Postgres row-level security is for.

Alternatives considered:

- **Firebase**: equally quick to start, but a document store is a poor fit for
  parent/child/partner queries and access rules get awkward.
- **Own API (Node + Postgres on Fly/Render)**: most control, most work. Not worth it
  until we outgrow Supabase.

```
Browser (React SPA on Vercel)
  ├─ Supabase Auth      sign-in (email magic link, Google)
  ├─ Supabase Postgres  trees, people, relationships   (row-level security)
  ├─ Supabase Storage   photos                          (private bucket, signed URLs)
  └─ Vercel functions   Stripe checkout + webhook, place search proxy,
                        GEDCOM import, print orders
```

### Data model

```
profiles        id (= auth user), display_name, plan, stripe_customer_id
trees           id, owner_id, name, root_person_id, visibility (private|link),
                share_token, created_at
tree_members    tree_id, user_id | invited_email, role (viewer|editor)
people          id, tree_id, given_name, family_name, gender,
                birth_date, birth_date_precision (year|month|day), death_date, ...,
                is_living, birth_place_name, birth_lat, birth_lon,
                photo_path, branch, notes
parent_links    child_id, parent_id, kind (biological|adoptive|step)
partnerships    id, person_a, person_b, start_date, end_date, kind
```

Notes:

- Parents are links, not two fixed columns, so adoptive and step-parents and
  same-sex parents all work. The scene's `fatherId`/`motherId` are filled from the
  first two biological links.
- Dates store a precision, because most people know "1912" not "4 March 1912".
- A whole tree is loaded in one request and mapped to `FamilyTreeNodeData[]` in the
  browser. Trees of a few thousand people are fine this way.

### Access rules (row-level security)

- Read a tree and its people: owner, members, or a request carrying a valid
  `share_token`.
- Write: owner and editors only.
- Photos: private bucket. The app requests short-lived signed URLs. Portrait
  textures need CORS enabled on the bucket (the WebGL scene already requires this
  for Wikimedia images).

### Photos

- Resize and crop in the browser to 512px before upload (keeps storage and
  bandwidth small and the 3D textures fast).
- Keep an optional larger original only on paid plans (for posters and prints).

### Place search

Birthplace needs a name and coordinates. Options:

- **Wikidata place search** (free, already used by the app, good for towns and
  cities, weak for street addresses). Recommended to start.
- **A geocoding API** (Mapbox, Google) later if people want exact addresses.

## Privacy and legal

This is personal data about real, often living, people, including children. It
needs to be right from day one.

- Private by default; public links are opt-in and revocable.
- "Living" flag hides details from non-members.
- Account deletion deletes trees and photos. Tree export (GEDCOM + photos zip).
- Privacy policy and terms before launch. If EU users are expected: data processing
  terms with Supabase, EU region for the database, a way to handle removal requests
  from people who appear in someone else's tree.
- No public search engine indexing of tree pages.

## Monetization

Recommended model: **free to build, pay to go big or go physical.** The tree is
the hook; people pay once they have invested time in it.

| Idea | How it works | Notes |
| --- | --- | --- |
| **Freemium plan** (recommended core) | Free: one tree, about 50 people, standard photos. Paid (around $5–8/month or $50/year): unlimited people and trees, original-quality photos, GEDCOM import and export, collaborators, public share page. | Standard for the category. Limits should bite only after someone is hooked. |
| **Printed posters** (recommended second) | The poster export already exists. Sell framed or canvas prints through a print-on-demand partner (Gelato, Prodigi). We take the margin. | High margin, no stock, a natural gift. One-off purchase, so it also works for people who will never subscribe. |
| **High-resolution downloads** | Free poster is screen-size with a watermark; paid download is print-quality. | Cheap to offer, a small one-off price point. |
| **Gift a tree** | Buy a year of the paid plan for a parent or grandparent, delivered with a starter tree. | Seasonal spikes (holidays, Mother's/Father's Day). |
| **Family plan** | One payer, several editors. | Raises price and stickiness: the whole family's data lives here. |
| **AI extras** | Photo restoration/colourisation, a written biography from the notes, "tell me about my great-grandmother's era". | Per-use cost to us, so paid only or credit-based. |
| **Printed family book** | A generated book: tree, biographies, photos, maps. | Higher price than a poster; more work to build. |
| **Professional tier** | Genealogists building trees for clients: many trees, client hand-over, branding. | Small market, higher price. Later. |
| **Affiliate links** | DNA kits, archive subscriptions. | Low effort, low income. Avoid ads; they cheapen the experience. |

Payments: Stripe Checkout for subscriptions and one-off purchases, a webhook that
sets `profiles.plan`, and the Stripe customer portal for cancelling.

What to charge and where the free limit sits are guesses until real users arrive;
plan to change both.

## Phases

**Phase 0 – Seam (front end only).** Give the family tree page a data-source
interface; make `findRelation` work on an in-memory family. Ship a hard-coded demo
family at `/my-family/demo` to prove the scene works with non-Wikidata data. No
backend.

**Phase 1 – Accounts and a saved tree.** Supabase project, auth, schema, access
rules. Create a tree, add and edit people and relationships from the scene, load it
back. Private only.

**Phase 2 – Photos and places.** Upload with crop, signed URLs, place search with
coordinates. Globe and time scrubber work on personal trees.

**Phase 3 – Sharing.** Invites, roles, public link, living-person privacy.

**Phase 4 – Payments.** Stripe, plan limits, paid poster download.

**Phase 5 – Growth.** GEDCOM import and export, print-on-demand posters, gifting.

Phase 0 and 1 together are the smallest thing worth showing someone.

## Costs

- Supabase: free tier covers development; the paid tier (about $25/month) is needed
  before real users, mainly for backups and no project pausing.
- Vercel: current plan is likely enough; commercial use requires a paid plan.
- Stripe: per-transaction fees only.
- Storage and bandwidth grow with photos; 512px portraits keep this small.

## Risks

- **The editor is the hard part.** If adding a person takes more than a few seconds,
  people stop at five relatives. It deserves the most design time.
- **Layout with real families.** Royal trees are tidy. Real ones have remarriages,
  half-siblings and large sibling groups. The current layout handles one partner
  per person best; multiple partnerships need testing and probably work.
- **Privacy mistakes are expensive.** One leaked private tree damages trust badly.
  Access rules need tests, not just review.
- **Crowded market.** Ancestry, MyHeritage and FamilySearch own records and DNA.
  The edge here is the experience and the poster, not the data.

## Decisions

| # | Question | Answer (2026-11-14) | Blocks |
| --- | --- | --- | --- |
| 1 | Backend | **Open**: Supabase or an all-Vercel stack (see below) | Phase 1 |
| 2 | Product and domain | **Decided**: same product and domain as History Map | – |
| 3 | First users in the EU? | **Not necessarily.** Use a US region; keep export and deletion in from the start so EU users can be added later without rework | – |
| 4 | Free limit and price | **Open** | Phase 4 |
| 5 | GEDCOM import at launch? | **Open** | Phase 5 (earlier only if wanted at launch) |

Nothing open blocks Phase 0, which is front end only.

### Decision 1: Supabase or all-Vercel

Vercel hosts the site today but does not itself provide accounts or a database.
"All-Vercel" means assembling three services through Vercel: a Postgres database
(Neon), file storage (Vercel Blob) and an auth provider (Clerk or Auth.js).

| | Supabase | All-Vercel (Neon + Blob + Clerk/Auth.js) |
| --- | --- | --- |
| Accounts | Built in | Separate service to add and pay for |
| Database | Postgres | Postgres |
| Who-can-see-what rules | In the database (row-level security); the browser can query directly | Written by hand in every API function |
| Photo storage | Built in, private buckets with signed links | Vercel Blob; private access needs our own checks |
| API code to write | Little: only payments, import, print orders | An endpoint for every read and write |
| Billing and dashboards | Two (Vercel + Supabase) | One bill, but three services to configure |
| Lock-in | Low: standard Postgres, can be moved | Low for the database; auth is the sticky part |
| Cost before real users | Free tier | Free tiers |
| Cost with users | About $25/month | Similar; Clerk charges per active user past its free tier |

Recommendation: **Supabase.** The access rules are the riskiest part of this
feature, and keeping them in the database means one place to get right and test,
not one per endpoint. It is also the least code to reach Phase 1. All-Vercel is
reasonable if a single vendor relationship matters more than build speed.

The data model and phases above are the same either way; only where the access
rules live changes.
