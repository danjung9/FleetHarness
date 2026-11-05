---
type: reference
status: active
owner: mukul
updated: 2026-11-04
summary: "Defense Unicorns Ark: what it is and how to get access."
---

# Codename: Ark

Sources: event documents 5 and 8, in our own words [P].

## What it is

An early, pre-release, multi-agent platform that turns a mission need into a working Go and React web app without writing code. You describe the need, answer questions, revise and approve a plan, and Ark builds it while you test and request changes. It keeps source changes as Git commits, with build, test and security checks tied to each commit, and you can download a source snapshot.

For an existing app with an approved Helm chart version or saved Docker Compose source, it prepares package source for UDS deployment, including the UDS custom resource and Zarf configuration. At deployment, Zarf loads images into the cluster registry with no internet download.

## Related Defense Unicorns tools

From event messages, in our own words [P]:

- UDS (Unified Defense Stack): platform for packaging, deploying and operating apps across cloud, on-premises and tactical environments, designed for airgaps.
- Zarf: open-source tool for packaging and deploying software into disconnected and restricted environments.

## Access

1. Go to https://ark.defenseunicorns.com and create an account. Existing UDS Registry users sign in instead.
2. Email events@defenseunicorns.com to say the account exists. Creating an account does not grant access, so the team has to enable it.
3. After approval, return and choose Web app for something new or App packaging for something existing.
4. Describe who needs it, what they must do, and relevant sample material. Then revise and approve the scope.
5. Try it, request changes, review the build checks, and use Code, then Download, to keep the source snapshot and revision.

If denied, or for password or lockout problems, ask Events.

## Why it may matter

- [R] Ark's UDS packaging is a possible answer to the rule 9 and Speed to Fleet questions if we need a deployment story.
- [R] Download source snapshots as you go, since pre-release access may not outlast the event.

## Not captured

- [E] The last lines of page 2 of the one-pager, which ran past the screen.
- [E] The 9-page Ark hackathon user guide, document 6. Read it if we choose Ark.
