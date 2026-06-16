# Onboarding Story Review

This review narrows the onboarding backlog to product and design alignment only. It does not add QA test cases, validation rules, or implementation tasks.

## Review Outcome

The existing onboarding story structure is sound: it follows the user from company detection, profile confirmation, benchmark input, Fuel value explanation, York project context, and signal generation handoff. The main product/design work is terminology cleanup so the stories match the current experience and avoid mixed labels.

Recommended final terminology:

- Use `Scorecard` for the main workspace tab. The current UI uses `Scorecard`, while the earlier story plan also references `Pulse`, so this should not remain mixed.
- Use `Signals` for generated insights and market/account movement.
- Use `Context Feed` for private notes, meetings, posts, CRM/email context, and other source material that improves signal quality.
- Use `Start my journey` only as the final onboarding handoff CTA from chat.
- Use `Use these projects for signals` for the York project context confirmation.
- Use `York IE workspace is already connected` for York customers. Do not use account-linking language for this path.

## Reviewed Story Language

### Company Detection

Keep the story intent:

> As a logged-in user, I want Fuel to detect my company from my email domain so onboarding starts with minimal manual input.

Acceptance criteria should stay focused on the detected and fallback paths:

- Given the user signs in with a business email, Fuel infers the company name from the domain.
- The first AI message shows the signed-in email and detected company.
- The only primary action is `Yes, set up <company>`.
- The flow does not show `Use a different company name` when a company is detected from a business domain.
- If no company can be inferred, the chat asks the user to enter the company name manually.

Product/design note: keep the confirmation message direct and confident. Avoid wording such as "looks like" once the system has already identified the company.

### Profile Review

Keep the story intent:

> As a founder or operator, I want Fuel to show all inferred company details in one compact form so I can quickly verify or correct them.

Acceptance criteria should use the final form language:

- After company confirmation, Fuel shows one profile form card, not step-by-step profile questions.
- The heading is `Review your <company> profile`.
- The form includes company, what they do, business model, industry, founded, city, state/region, country, website, LinkedIn, funding rounds, and additional context.
- All fields are visible by default.
- `Additional context` is optional.
- All other fields are visually marked required with `*`.
- Source hints appear below the relevant input and do not affect two-column alignment.

Product/design note: source hints should sound like provenance, not uncertainty. Prefer `From homepage positioning` and `From website domain` over language like "found" or "missing."

### Benchmark Capture

Keep the story intent:

> As a founder or operator, I want to enter my operating metrics before Fuel shows benchmarks so the benchmark reflects private company numbers.

Acceptance criteria should remain:

- Benchmark flow starts with a form, not benchmark results.
- Intro copy explains that shared numbers help Fuel identify benchmark ranges, generate signals, recommend playbooks, and surface growth initiatives.
- Metrics are grouped into Revenue + Retention, Capital Efficiency, Team + Customers, and Anything worth flagging.
- Numeric metrics use number inputs.
- Notable customers and current challenges use textareas.
- Numeric placeholders are plain numbers without currency symbols, percent symbols, or units.
- Unknown fields can be left blank.
- Every benchmark field has an info icon with a custom tooltip.

Product/design note: the benchmark form should continue the same professional, advisory tone as the profile step. Avoid defensive copy about what public sources cannot provide.

### Fuel Value Explanation

Keep the story intent:

> As a founder or operator, I want Fuel to explain how it uses benchmark gaps so I understand why the product matters before moving into signal generation.

Acceptance criteria should stay concise:

- After benchmark results, the user can click `Show me how Fuel helps`.
- Fuel shows a value proposition card.
- The card covers real-time signals, playbooks and initiatives, competitive intelligence, and Fuel AI.
- Copy is professional, concise, and aligned with the prior onboarding tone.

Product/design note: this step should remain in the chat flow. Only York services setup and connector setup should be removed from onboarding.

### York Project Context

Keep the story intent:

> As an existing York customer, I want Fuel to automatically use my York IE project context so I do not need to manually link an account I already have.

Acceptance criteria should be updated to remove mixed tab naming:

- The flow does not ask York customers to link their York account.
- Fuel says the York IE workspace is already connected automatically.
- A York projects card lists active workstreams Fuel will use for signals.
- The card includes one Development project only.
- The card includes Marketing and RevOps project context.
- Copy says users can review detailed project updates in `Scorecard`.
- CTA says `Use these projects for signals`.

Product/design note: if product chooses a replacement for `Scorecard`, update this story, the tab label, and the chat copy together.

### Signal Generation Handoff

Keep the story intent:

> As a user, I want to click a final button before leaving chat so I control when the onboarding handoff happens.

Acceptance criteria should stay:

- After York project context, Fuel shows a signal generation message.
- The message includes the final CTA `Start my journey`.
- The app does not auto-redirect before the user clicks the CTA.
- Clicking the CTA redirects to the post-chat signal loading experience.
- The post-chat route shows a loading state before the actual Signals page.

Product/design note: `Start my journey` works as a user-friendly final CTA, but it should not be used as a tab name.

## Terminology Decisions To Confirm

- Confirm whether `Scorecard` is final. The stories and UI should not mix `Scorecard`, `Pulse`, and `Your Journey`.
- Confirm whether `Patriot Pay` should be the display name in onboarding stories, while `patriotpay` remains the lowercase workspace header style.
- Confirm whether non-York customers should skip York project context entirely or see a connector-led context setup after the Fuel value explanation.

## Gherkin Review Notes

- Existing Gherkin scenarios are clear enough for product/design review.
- Scenario names should use user-facing terms, for example `User confirms detected company` and `York customer reviews connected project context`.
- Assertions should avoid implementation details unless they are visible behavior, such as disabled chips, visible CTA labels, loading screens, and field requirements.
- QA test case expansion remains out of scope for this pass.
