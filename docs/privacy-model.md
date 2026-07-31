# Privacy model

Every participant makes two independent choices when they submit a pitch: hide
my name, and hide my idea text. Those four combinations behave differently, and
the difference is enforced on the server — not by hiding things in the UI.

## The four modes

| Hide name | Hide idea | In the live room | In the results |
|:---:|:---:|---|---|
| — | — | `Maya — food-waste map…` | **Maya · real-time maps** |
| ✅ | — | `Anonymous — food-waste map…` | **Anonymous · real-time maps** |
| — | ✅ | `Maya — 🔒 pitch kept private` | **Maya · secret ingredient 🤫** |
| ✅ | ✅ | `Anonymous — 🔒 pitch kept private` | *no credit at all* |

The last row matters most: a fully private pitch still goes to the AI and still
shapes all four generated ideas. It simply never appears in the credits. The
results page reports the count — *"plus 1 fully private contribution fused in
without a trace"* — so the group knows the work was included without learning
whose it was.

## Where each rule is enforced

**1 — The browser cannot read pitches.** The `ideas` table has no `select`
policy for the anon role, so the Supabase client in the browser gets nothing
from it, ever. Opening devtools and issuing your own query returns an empty set.

**2 — Every read is masked server-side.** The room page fetches
[`/api/progress`](../app/api/progress/route.ts), which reads with the
service-role key and rebuilds each row according to its own flags before it is
serialised:

```ts
{
  label: row.hide_name ? "Anonymous" : row.author_name,
  idea:  row.hide_idea ? null       : row.idea_text,
}
```

A hidden name never leaves the server; a hidden pitch is `null` on the wire, not
merely hidden by CSS.

**3 — The AI never sees hidden names.** Before the fusion prompt is built,
participants are relabelled. Name-hidden participants become `Anonymous #1`,
`Anonymous #2`, and so on. The model is instructed to reuse those labels
verbatim, so the text sent to Google or Groq contains no hidden participant's
real name.

**4 — Results are masked before storage.** `rooms.results` is readable by the
browser, so the AI's output is rewritten before it is written back:

- name hidden → credited as `Anonymous`
- idea hidden → element text replaced with `secret ingredient`
- both hidden → the credit is dropped entirely
- a label nobody was issued → dropped, never stored

Because masking happens before the write, the raw association never exists in a
browser-readable place — not even briefly.

**5 — Votes and reactions are not identities.** Both are keyed to a random UUID
generated in the browser and kept in `localStorage`. It is never sent with a
name and never joined to a pitch. It exists only so a device can change its own
vote and un-react.

**6 — Private pitches cannot be reacted to.** Reactions target a pitch id, so
the reaction route rejects any attempt to react to a pitch whose text is hidden,
rather than relying on the button being absent from the UI.

## What this model does *not* protect against

Stated plainly, because a privacy claim is only useful with its limits attached:

- **The host is not privileged, but the operator is.** Anyone with the Supabase
  service-role key — the person deploying the app — can read raw pitches. This
  protects participants from each other, not from the operator.
- **The AI provider sees pitch text.** Hidden *names* never reach Gemini or
  Groq, but hidden *idea text* does, because the idea is what gets fused. It is
  covered by that provider's API terms.
- **Small rooms leak by arithmetic.** In a three-person room where two pitches
  are public, the third is identifiable by elimination. Anonymity is meaningful
  in proportion to room size.
- **Writing style is identifying.** Teammates who know each other can often
  recognise a pitch by how it reads.
- **Room codes are unguessable, not secret.** Anyone holding the link can join
  and pitch until the room is full. Rooms are working sessions, not vaults.

Do not put confidential or personal information into a pitch.
