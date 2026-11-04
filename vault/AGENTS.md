
# Fleethacker vault: working rules

Shared memory for the Fleethacker sprint (Norfolk, VA, November 4 to 6, 2026). Read [[Team/Now]] and [[Reference/Open-Questions]] before acting. After finishing work, add a note in Sessions/ and update Team/Now.md.

Project code goes in `~/Documents/CDAO/Fleethacker-Work`. Hooks and the content guard are described in [[Setup/Hooks]]; follow these rules even where hooks do not reach. `python3 tools/fh.py check` checks the vault.

## Evidence labels

| Label | Meaning |
| --- | --- |
| `[P]` | Stated by the event: portal, event documents or terms. |
| `[V]` | Public source outside the event. Cite the URL. |
| `[E]` | Observed by us. Say how. |
| `[A]` | Assumption that needs confirming. |
| `[R]` | Recommendation. |

## Rules

- Event rule 4: no classified information, CUI, operationally sensitive information, PII, export-controlled data or nonpublic government data in anything we build, prompt or demo, unless specifically vetted or approved.
- This vault is separate from other work. Do not copy internal content from other work into it or into event tools.
- Never store passwords, API keys, redemption links, team credential links or Wi-Fi passwords here. Name the secret and point to where its owner can find it.
- Never enter credentials on anyone's behalf. Each person signs in and handles their own keys.
- Do not reproduce vendor or event documents here. Summarize in our own words and point to the source.
- The portal is authoritative and can change. Date what you capture.
- Log tools in [[Sprint/Tool-Disclosure-Log]] with `python3 tools/fh.py tool NAME TYPE USE PROVIDER`, barriers in [[Sprint/Friction-Log]] and earlier work in [[Sprint/Prior-Work-Log]] as you go, because the rules require all three.
- House style: direct, plain, sentence case. No emojis, no em dashes, no en dashes.
- Nothing here may name the assistant or vendor doing the writing. Products the team evaluates or uses are subject matter and may be named.
- Frontmatter on every note except this one: `type, status, owner, updated, summary`.
